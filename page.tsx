'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import apiClient from '../services/apiClient';
import Chatbot from '../components/Chatbot';

// --- UPDATED: New interfaces for more detailed game data ---
interface PlatformInfo {
  windows: boolean;
  mac: boolean;
  linux: boolean;
  ps4: boolean;
  ps5: boolean;
  xbox: boolean;
}

interface Game {
  name: string;
  rating: number;
  platforms?: PlatformInfo; // Platforms are now part of the Game state
}

export default function Home() {
  // --- Authentication and Protection ---
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  useEffect(() => {
    if (token === null) {
      router.push('/login');
    }
  }, [token, router]);

  // State for the recommender
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [selectedGames, setSelectedGames] = useState<Game[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // --- API LOGIC for Recommender ---
  useEffect(() => {
    if (searchQuery.length < 3 || !token) {
      setSearchResults([]);
      return;
    }
    const fetchGames = async () => {
      try {
        const response = await apiClient.get(`/search?q=${searchQuery}`);
        setSearchResults(response.data.results);
      } catch (error) {
        console.error("Error fetching search results:", error);
      }
    };

    const timeoutId = setTimeout(fetchGames, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, token]);

  // --- UPDATED: handleSelectGame now fetches platform details ---
  const handleSelectGame = async (gameName: string) => {
    // UPDATED: Increased game limit to 10
    if (selectedGames.length < 10 && !selectedGames.find(g => g.name === gameName)) {
      // Add the game immediately for a responsive UI
      const newGame: Game = { name: gameName, rating: 5 };
      setSelectedGames(prev => [...prev, newGame]);
      
      // Now, fetch the platform details in the background
      try {
        const response = await apiClient.get(`/game-details/${gameName}`);
        const platforms = response.data.platforms;
        
        // Update the game in the list with its platform info
        setSelectedGames(prev => prev.map(g => 
          g.name === gameName ? { ...g, platforms } : g
        ));
      } catch (error) {
        console.error("Error fetching game details:", error);
      }
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
      const response = await apiClient.post('/recommend', payload);
      setRecommendations(response.data.recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    }
  };
  
  if (token === null) {
    return <div>Loading...</div>;
  }

  // --- UI (JSX) ---
  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-24 bg-[#0d1117] text-gray-200">
      <div className="z-10 w-full max-w-2xl font-mono text-sm">
        
        <div className="flex justify-between items-center w-full mb-12">
            <h1 className="text-4xl font-bold text-white">My Game Recommendation Engine</h1>
            <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md"
            >
                Logout
            </button>
        </div>

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

        {/* --- UPDATED: Display for Selected Games with Platform Bubbles --- */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 text-gray-100">Your Selected Games:</h3>
          {selectedGames.length > 0 ? (
            <ul className="space-y-3">
              {selectedGames.map((game) => (
                <li key={game.name} className="bg-slate-800 text-white p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-lg">{game.name}</span>
                    <button 
                      onClick={() => handleRemoveGame(game.name)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="flex items-center space-x-4 mt-3">
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={game.rating}
                      onChange={(e) => handleRatingChange(game.name, parseInt(e.target.value))}
                      className="cursor-pointer w-full"
                    />
                    <span className="font-bold w-4 text-center">{game.rating}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-3 flex-wrap">
                    {game.platforms?.windows && <span className="bg-blue-500 text-white text-xs font-semibold mt-1 px-2 py-1 rounded-full">Windows</span>}
                    {game.platforms?.mac && <span className="bg-gray-500 text-white text-xs font-semibold mt-1 px-2 py-1 rounded-full">Mac</span>}
                    {game.platforms?.linux && <span className="bg-yellow-500 text-black text-xs font-semibold mt-1 px-2 py-1 rounded-full">Linux</span>}
                    {game.platforms?.ps5 && <span className="bg-indigo-500 text-white text-xs font-semibold mt-1 px-2 py-1 rounded-full">PS5</span>}
                    {game.platforms?.ps4 && <span className="bg-indigo-400 text-white text-xs font-semibold mt-1 px-2 py-1 rounded-full">PS4</span>}
                    {game.platforms?.xbox && <span className="bg-green-500 text-white text-xs font-semibold mt-1 px-2 py-1 rounded-full">Xbox</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No games selected yet.</p>
          )}
        </div>

        <div className="mb-8">
          <button
            onClick={handleGetRecommendations}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed"
            disabled={selectedGames.length === 0}
          >
            Get Recommendations
          </button>
        </div>

        <div className="w-full">
          <h2 className="text-2xl mb-3 font-semibold text-gray-100">Your Recommendations:</h2>
          <pre className="bg-slate-800 p-4 rounded-md overflow-x-auto">
            {recommendations.length > 0 ? JSON.stringify(recommendations, null, 2) : "Select games and click the button to get recommendations."}
          </pre>
        </div>
      </div>
      
      <Chatbot />
    </main>
  );
}
