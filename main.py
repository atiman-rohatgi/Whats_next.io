from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
import numpy as np
import pandas as pd
import faiss
import os
from dotenv import load_dotenv
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
import chromadb
import re

# --- 1. Pydantic Models for All API Endpoints ---
class UserInput(BaseModel):
    game_titles: list[str] = Field(..., example=["Red Dead Redemption 2", "The Witcher 3: Wild Hunt"])
    ratings: list[int] = Field(..., example=[10, 10])

class RecommendationResponse(BaseModel):
    recommendations: list[str]

class ChatInput(BaseModel):
    query: str = Field(..., example="What is the game [Ready or Not] about?")

class ChatResponse(BaseModel):
    answer: str

# --- 2. Global Object to Hold All Loaded Models ---
ml_models = {}

# --- 3. Lifespan Event Handler (Loads ALL Models on Startup) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("INFO:     Loading all machine learning artifacts...")
    try:
        # --- Load Recommender Artifacts ---
        ml_models["faiss_index"] = faiss.read_index("saved_artifacts/games_index.index")
        ml_models["vectors"] = np.load("saved_artifacts/final_production_vectors.npy")
        df_games = pd.read_csv("saved_artifacts/df_games.csv")
        df_games['name_cleaned'] = df_games['name'].str.lower().str.strip().str.replace(r'\s+', ' ', regex=True)
        ml_models["df_games"] = df_games
        ml_models["title_to_index"] = pd.Series(df_games.index, index=df_games['name_cleaned'])

        # --- Load RAG Chatbot Artifacts ---
        load_dotenv()
        # --- SECURITY FIX: Load the key from the environment variable NAME, not the key itself ---
        GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") 
        if GOOGLE_API_KEY:
            genai.configure(api_key=GOOGLE_API_KEY)
        else:
            print("CRITICAL ERROR: GOOGLE_API_KEY not found in .env file.")
        
        ml_models["embedding_model"] = SentenceTransformer('all-MiniLM-L6-v2')
        ml_models["llm"] = genai.GenerativeModel('gemini-1.5-flash')
        db_client = chromadb.PersistentClient(path="db/chroma_db")
        ml_models["game_collection"] = db_client.get_collection(name="games")
        
        print("INFO:     All artifacts loaded successfully.")
    except Exception as e:
        print(f"CRITICAL ERROR: Could not load model files. {e}")
    
    yield
    
    ml_models.clear()
    print("INFO:     Cleaned up ML models.")

# --- 4. Create the FastAPI App Instance ---
app = FastAPI(lifespan=lifespan, title="Game Discovery API")

# --- 5. Recommendation Logic Function (Corrected) ---
def get_recommendations(game_titles: list[str], ratings: list[int], k: int = 5):
    """Generates a list of personalized game recommendations."""
    
    index = ml_models["faiss_index"]
    vectors = ml_models["vectors"]
    title_to_index = ml_models["title_to_index"]
    df = ml_models["df_games"]

    input_vectors = []
    # NEW: Create a list for only the ratings of games that are found
    valid_ratings = [] 
    for title, rating in zip(game_titles, ratings):
        cleaned_title = title.lower().strip()
        if cleaned_title in title_to_index:
            input_vectors.append(vectors[title_to_index[cleaned_title]])
            # Only add the rating if the game was found
            valid_ratings.append(rating) 

    if not input_vectors:
        return []

    # Use the new 'valid_ratings' list for the weights
    query_vector = np.average(input_vectors, axis=0, weights=valid_ratings).reshape(1, -1).astype('float32')

    # ... (the rest of the function remains the same) ...
    if hasattr(index, 'nprobe'):
        index.nprobe = 10
    
    distances, indices = index.search(query_vector, k + len(input_vectors))
    
    recommendations = []
    input_titles_cleaned = {title.lower().strip() for title in game_titles}
    for i in range(len(indices[0])):
        rec_index = indices[0][i]
        if df.iloc[rec_index]['name_cleaned'] not in input_titles_cleaned:
            recommendations.append(df.iloc[rec_index]['name'])
        if len(recommendations) >= k:
            break
            
    return recommendations


# --- 6. RAG Chatbot Logic ---
def retrieve_context(query, n_results=5):
    # (Your retrieve_context function here)
    df = ml_models["df_games"]
    embedding_model = ml_models["embedding_model"]
    game_collection = ml_models["game_collection"]
    match = re.search(r'\[(.*?)\]', query)
    if match:
        game_title_to_find = match.group(1)
        game_match = df[df['name'] == game_title_to_find]
        if not game_match.empty:
            return game_match['rag_document'].tolist()
        else:
            return []
    else:
        query_embedding = embedding_model.encode([query])
        results = game_collection.query(query_embeddings=query_embedding, n_results=n_results)
        return results['documents'][0]

def generate_answer(query, context):
    if not context:
        return "I'm sorry, I couldn't find any information about that in my database."

    llm = ml_models["llm"]
    context_str = "\n---\n".join(context)
    prompt = f"""You are a helpful and concise game expert. Answer the user's question based ONLY on the provided context. If the information is not in the context, say "I'm sorry, I don't have that information in my database." Keep your response to a maximum of three sentences.
    
    CONTEXT:
    {context_str}

    QUESTION:
    {query}

    ANSWER:
    """
    try:
        response = llm.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"An error occurred while calling the Gemini API: {e}")
        return "I'm sorry, an error occurred while generating the response."


# --- 7. API Endpoints ---
@app.post("/recommend", response_model=RecommendationResponse)
def recommend_games_endpoint(user_input: UserInput):
    if len(user_input.game_titles) != len(user_input.ratings):
        raise HTTPException(status_code=400, detail="Number of games and ratings must match.")
    recs = get_recommendations(user_input.game_titles, user_input.ratings)
    return {"recommendations": recs}

@app.post("/chat", response_model=ChatResponse)
def handle_chat(chat_input: ChatInput):
    context = retrieve_context(chat_input.query)
    answer = generate_answer(chat_input.query, context)
    return {"answer": answer}