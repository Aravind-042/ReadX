import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, SparklesIcon, SendIcon } from './icons';
import { Theme, Book } from '../types';
import { api } from '../services/apiService';

interface AiAssistantPanelProps {
  book: Book;
  onClose: () => void;
  theme: Theme;
  initialPrompt: string | null;
  setInitialPrompt: (prompt: string | null) => void;
}

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({ book, onClose, theme, initialPrompt, setInitialPrompt }) => {
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isSendingRef = useRef(false);

    const handleSendMessage = async (e?: React.FormEvent, prompt?: string) => {
        if (e) e.preventDefault();
        const message = prompt || userInput;
        if (!message.trim() || isSendingRef.current) return;
        
        isSendingRef.current = true;
        
        const newUserMessage: ChatMessage = { role: 'user', content: message };
        setChatHistory(prev => [...prev, newUserMessage]);
        if(!prompt) setUserInput('');
        setIsLoading(true);
        setError('');

        try {
            const response = await api.queryBook(book.id, message);
            
            if (!response) {
                throw new Error("Received empty response from AI service.");
            }

            setChatHistory(prev => [...prev, { role: 'model', content: '' }]);

            // Safely check if response is async iterable using optional chaining to prevent crash
            if (typeof response?.[Symbol.asyncIterator] === 'function') {
                for await (const chunk of response) {
                    const chunkText = chunk.text || ''; 
                    setChatHistory(prev => {
                        const newHistory = [...prev];
                        newHistory[newHistory.length - 1].content += chunkText;
                        return newHistory;
                    });
                }
            } else {
                 // Fallback if response is not iterable
                 const text = (response as any)?.text || "I'm sorry, I couldn't generate a response at this time.";
                 setChatHistory(prev => {
                     const newHistory = [...prev];
                     newHistory[newHistory.length - 1].content = text;
                     return newHistory;
                 });
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || "An error occurred. Please try again.");
            // Remove the empty model message if error occurred immediately
            setChatHistory(prev => prev.filter(msg => msg.content !== ''));
        } finally {
            setIsLoading(false);
            isSendingRef.current = false;
        }
    };
    
    useEffect(() => {
        if (initialPrompt) {
            handleSendMessage(undefined, initialPrompt);
            setInitialPrompt(null);
        }
    }, [initialPrompt, setInitialPrompt]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);
    
    const themeClasses = {
        [Theme.Dark]: 'bg-readx-dark-secondary border-gray-700 text-readx-text-dark',
        [Theme.Light]: 'bg-readx-light-secondary border-gray-200 text-readx-text-light',
        [Theme.Sepia]: 'bg-amber-50 border-amber-200 text-sepia-text',
    };

    const inputThemeClasses = {
        [Theme.Dark]: 'bg-readx-dark border-gray-600 focus:ring-readx-accent',
        [Theme.Light]: 'bg-white border-gray-300 focus:ring-blue-500',
        [Theme.Sepia]: 'bg-amber-100 border-amber-300 focus:ring-orange-500',
    }
    
    return (
        <aside className={`w-full md:w-1/3 max-w-md h-full flex flex-col border-l ${themeClasses[theme]} transition-colors duration-300`}>
            <header className="flex items-center justify-between p-4 border-b border-inherit">
                <h3 className="text-lg font-bold flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-readx-accent" /> Ask the Book</h3>
                <button onClick={onClose} className="hover:text-readx-accent">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </header>
            
            <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-sm rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-readx-accent text-white' : 'bg-gray-500/30'}`}>
                            <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />') }}></p>
                        </div>
                    </div>
                ))}
                 {isLoading && chatHistory[chatHistory.length - 1]?.role === 'user' && (
                     <div className="flex justify-start">
                         <div className="max-w-xs md:max-w-sm rounded-lg px-3 py-2 bg-gray-500/30 flex items-center">
                             <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                             <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150 mx-1"></div>
                             <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></div>
                         </div>
                     </div>
                 )}
            </div>

            <div className="p-4 border-t border-inherit">
                {book.status === 'EMBEDDING' && (
                    <div className="text-center text-xs text-gray-400 mb-2 p-2 bg-gray-500/20 rounded-md">
                        <div className="flex items-center justify-center">
                            <div className="w-3 h-3 border-2 border-dashed rounded-full animate-spin border-readx-accent mr-2"></div>
                            Indexing book for AI (Local)...
                        </div>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={book.isEmbedded ? "Ask a question..." : "Please wait for indexing..."}
                        disabled={!book.isEmbedded || isLoading}
                        className={`flex-grow w-full text-sm rounded-lg border p-2.5 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${inputThemeClasses[theme]}`}
                    />
                    <button type="submit" disabled={!book.isEmbedded || isLoading} className="p-2.5 bg-readx-accent text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        <SendIcon className="w-5 h-5"/>
                    </button>
                </form>
                {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            </div>
        </aside>
    );
};