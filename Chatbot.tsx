'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Effect to scroll to the bottom of the chat history when a new message is added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);


  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery || isLoading) return;

    const userMessage: ChatMessage = { sender: 'user', text: chatQuery };
    
    // Create the new history array with the user's message
    const newChatHistory = [...chatHistory, userMessage];
    setChatHistory(newChatHistory);
    
    setIsLoading(true);
    const currentQuery = chatQuery;
    setChatQuery('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/chat', { query: currentQuery });
      const botMessage: ChatMessage = { sender: 'bot', text: response.data.answer };
      
      setChatHistory([...newChatHistory, botMessage]);

    } catch (error) {
      console.error("Error fetching chat response:", error);
      const errorMessage: ChatMessage = { sender: 'bot', text: "Sorry, I couldn't get a response. Please try again." };
      
      setChatHistory([...newChatHistory, errorMessage]);

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* The Chat Window */}
      {isOpen && (
        // CORRECTED: Reverted to a fixed width and height
        <div className="fixed bottom-24 right-5 w-96 h-[600px] bg-slate-800 rounded-lg shadow-xl flex flex-col z-20">
          <div className="p-4 bg-slate-900 rounded-t-lg">
            <h3 className="text-lg font-semibold text-white">AI Game Assistant</h3>
            <p className="text-xs text-gray-400">Put a specific game name in [brackets] for a direct lookup.</p>
          </div>
          <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto">
            {chatHistory.map((msg, index) => (
              <div key={index} className="flex flex-col mb-3">
                <div className={`p-3 rounded-lg max-w-xs text-white ${msg.sender === 'user' ? 'bg-blue-600 self-end' : 'bg-slate-700 self-start'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
             {isLoading && <div className="text-gray-400">Thinking...</div>}
          </div>
          <form onSubmit={handleChatSubmit} className="p-4 border-t border-slate-700">
            <input
              type="text"
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              placeholder="Ask a question..."
              className="w-full p-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </form>
        </div>
      )}

      {/* The Button to Open/Close the Chat */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-full shadow-lg z-20"
      >
        {isOpen ? 'Close' : 'Ask AI'}
      </button>
    </div>
  );
}