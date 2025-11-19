import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiService';
import { Theme } from '../types';
import { CloseIcon, SearchIcon } from './icons';

interface SearchPanelProps {
  bookId: string;
  onResultClick: (paragraphIndex: number) => void;
  onClose: () => void;
  theme: Theme;
}

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ bookId, onResultClick, onClose, theme }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ paragraphIndex: number; textSnippet: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.length < 3) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      const searchResults = await api.searchBook(bookId, debouncedQuery);
      setResults(searchResults);
      setIsSearching(false);
    };
    performSearch();
  }, [debouncedQuery, bookId]);

  const themeClasses = {
    [Theme.Dark]: 'bg-readx-dark-secondary border-gray-700 text-readx-text-dark',
    [Theme.Light]: 'bg-readx-light-secondary border-gray-200 text-readx-text-light',
    [Theme.Sepia]: 'bg-amber-50 border-amber-200 text-sepia-text',
  };

  const inputThemeClasses = {
    [Theme.Dark]: 'bg-readx-dark border-gray-600 focus:ring-readx-accent',
    [Theme.Light]: 'bg-white border-gray-300 focus:ring-blue-500',
    [Theme.Sepia]: 'bg-amber-100 border-amber-300 focus:ring-orange-500',
  };

  return (
    <aside className={`absolute top-0 left-0 h-full w-full md:w-1/3 max-w-md flex flex-col border-r z-10 ${themeClasses[theme]} transition-colors duration-300`}>
      <header className="flex items-center justify-between p-4 border-b border-inherit">
        <h3 className="text-lg font-bold flex items-center gap-2"><SearchIcon className="w-5 h-5 text-readx-accent" /> Search Book</h3>
        <button onClick={onClose} className="hover:text-readx-accent">
          <CloseIcon className="w-6 h-6" />
        </button>
      </header>

      <div className="p-4 border-b border-inherit">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for text..."
            className={`w-full text-sm rounded-lg border p-2.5 pl-10 focus:outline-none focus:ring-2 ${inputThemeClasses[theme]}`}
            autoFocus
          />
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
      </div>

      <div className="flex-grow p-4 overflow-y-auto">
        {isSearching && <p className="text-center text-sm text-gray-400">Searching...</p>}
        {!isSearching && query && results.length === 0 && (
          <p className="text-center text-sm text-gray-400">No results found for "{query}".</p>
        )}
        {!isSearching && !query && (
          <p className="text-center text-sm text-gray-400">Enter a term to search the book.</p>
        )}
        <div className="space-y-3">
          {results.map((result) => (
            <div
              key={result.paragraphIndex}
              onClick={() => onResultClick(result.paragraphIndex)}
              className="p-3 rounded-lg hover:bg-readx-accent/10 cursor-pointer"
            >
              <p className="text-xs font-bold text-readx-accent">PARAGRAPH {result.paragraphIndex + 1}</p>
              <p className="text-sm text-gray-400 mt-1 italic">"{result.textSnippet}"</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
