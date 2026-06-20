"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCrm } from '../context/CrmContext';
import { Bot, Send, User, Sparkles } from 'lucide-react';

export default function AiAssistantPage() {
  const { currentUser } = useCrm();
  const router = useRouter();
  
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: 'Hello! I am your embedded Pipeline Copilot. How can I assist you with analyzing your leads today?' }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const endOfMessagesRef = useRef(null);

  // RBAC: Restricted to Admin/Manager
  if (!["admin", "manager"].includes(currentUser.role)) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-8 text-center transition-colors">
        <div className="max-w-md bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-red-200 dark:border-red-900/50">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">!</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            The AI Copilot is currently restricted to Management tier accounts due to sensitive data crawling capabilities.
          </p>
          <button 
            onClick={() => router.push('/other-modules/crm/leads')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition"
          >
            Acknowledge
          </button>
        </div>
      </div>
    );
  }

  // Scroll to bottom on arbitrary delay when typing flag changes or a new message pushes
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    const userMessage = { id: Date.now(), sender: 'user', text: userText };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch('/other-modules/crm/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });

      const data = await response.json();
      
      let replyText = data.reply;
      if (data.missingKey) {
        replyText = "⚠️ " + data.error;
      } else if (data.error) {
        replyText = "Error communicating with AI Copilot: " + data.error;
      }

      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        sender: 'ai', 
        text: replyText 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        sender: 'ai', 
        text: "System error: Failed to connect to AI backend." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300 h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold dark:text-white mb-2 flex items-center">
            <Sparkles className="w-8 h-8 text-blue-500 mr-2" />
            AI Copilot
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Generative insights over your pipeline data in real-time.</p>
        </div>
        <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full uppercase tracking-wider flex items-center">
           <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
           System Online
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-colors">
        
        {/* Chat Feed */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mr-3 shrink-0">
                    <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                
                <div className={`px-5 py-3 rounded-2xl max-w-[80%] ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-sm' 
                    : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm rounded-bl-sm dark:text-slate-200'
                }`}>
                  <p className="text-sm shadow-sm leading-relaxed">{msg.text}</p>
                </div>
                
                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-600 flex items-center justify-center ml-3 shrink-0">
                    <User className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mr-3 shrink-0">
                  <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="px-5 py-4 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm rounded-bl-sm flex space-x-1.5 items-center">
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>
        </div>

        {/* Input Region */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot to analyze your deals..."
              disabled={isTyping}
              className="w-full pl-5 pr-12 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50 transition"
            />
            <button 
              type="submit" 
              disabled={isTyping || !input.trim()}
              className="absolute right-2 p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-full transition"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
          <div className="text-center mt-2">
            <p className="text-[10px] text-slate-400 font-medium">Responses are auto-generated. May produce inaccurate mock data.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
