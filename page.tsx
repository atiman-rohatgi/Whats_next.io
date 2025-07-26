'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Chatbot from '../components/Chatbot'; // Import the new component

interface Game {
  name: string;
  rating: number;
}

export default function Home() {
  // State for the recommender
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [selectedGames, setSelectedGames] = useState<Game[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // --- API LOGIC for Recommender ---
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    const fetchGames = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/search?q=${searchQuery}`);
        setSearchResults(response.data.results);
      } catch (error) {
        console.error("Error fetching search results:", error);
      }
    };
    const timeoutId = setTimeout(fetchGames, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelectGame = (gameName: string) => {
    if (selectedGames.length < 5 && !selectedGames.find(g => g.name === gameName)) {
      setSelectedGames([...selectedGames, { name: gameName, rating: 5 }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveGame = (gameNameToRemove: string) => {
    setSelectedGames(selectedGames.filter(game => game.name !== gameNameToRemove));
  };

  const handleRatingChange = (gameName: string, newRating: number) => {
    setSelectedGames(
      selectedGames.map(game => 
        game.name === gameName ? { ...game, rating: newRating } : game
      )
    );
  };

  const handleGetRecommendations = async () => {
    if (selectedGames.length === 0) return;
    try {
      const payload = {
        game_titles: selectedGames.map(g => g.name),
        ratings: selectedGames.map(g => g.rating)
      };
      const response = await axios.post('http://127.0.0.1:8000/recommend', payload);
      setRecommendations(response.data.recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    }
  };

  // --- UI (JSX) ---
  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-24 bg-[#0d1117] text-gray-200">
      <div className="z-10 w-full max-w-2xl font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-12 text-white">My Game Recommendation Engine</h1>

        {/* --- Search and Selection --- */}
        <div className="relative mb-8">
          <h2 className="text-2xl mb-3 font-semibold text-gray-100">Search for Games You've Played</h2>
          <input
            type="text"
            placeholder="Type a game name..."
            className="bg-gray-200 text-black p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <ul className="absolute z-10 bg-white text-black mt-1 rounded-md w-full shadow-lg">
              {searchResults.map((gameName) => (
                <li 
                  key={gameName} 
                  className="p-2 hover:bg-gray-200 cursor-pointer"
                  onClick={() => handleSelectGame(gameName)}
                >
                  {gameName}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* --- Display for Selected Games --- */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 text-gray-100">Your Selected Games:</h3>
          {selectedGames.length > 0 ? (
            <ul className="space-y-2">
              {selectedGames.map((game) => (
                <li 
                  key={game.name} 
                  className="flex justify-between items-center bg-slate-800 text-white p-3 rounded-md"
                >
                  <span className="font-medium">{game.name}</span>
                  <div className="flex items-center space-x-4">
                    <span className="font-bold w-4 text-center">{game.rating}</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={game.rating}
                      onChange={(e) => handleRatingChange(game.name, parseInt(e.target.value))}
                      className="cursor-pointer"
                    />
                    <button 
                      onClick={() => handleRemoveGame(game.name)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center"
                    >
                      &times;
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No games selected yet.</p>
          )}
        </div>

        {/* --- Get Recommendations Button --- */}
        <div className="mb-8">
          <button
            onClick={handleGetRecommendations}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed"
            disabled={selectedGames.length === 0}
          >
            Get Recommendations
          </button>
        </div>

        {/* --- Display Recommendations --- */}
        <div className="w-full">
          <h2 className="text-2xl mb-3 font-semibold text-gray-100">Your Recommendations:</h2>
          <pre className="bg-slate-800 p-4 rounded-md overflow-x-auto">
            {recommendations.length > 0 ? JSON.stringify(recommendations, null, 2) : "Select games and click the button to get recommendations."}
          </pre>
        </div>
      </div>
      
      {/* Render the Chatbot Component */}
      <Chatbot />
    </main>
  );
}