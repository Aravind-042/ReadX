import React, { useState, useEffect, useCallback } from 'react';
import { Book, User } from '../types';
import { BookOpenIcon, UploadIcon, DownloadIcon } from './icons';
import { api } from '../services/apiService';

interface LibraryViewProps {
  currentUser: User;
  onBookSelect: (book: Book) => void;
  onLogout: () => void;
}

const BookCover: React.FC<{ book: Book; onBookSelect: (book: Book) => void }> = ({ book, onBookSelect }) => (
  <div onClick={() => book.status === 'READY' && onBookSelect(book)} className={`cursor-pointer group ${book.status !== 'READY' && 'opacity-50 cursor-not-allowed'}`}>
    <div className="aspect-[2/3] w-full bg-readx-dark-secondary rounded-lg overflow-hidden transform group-hover:scale-105 transition-transform duration-300 relative shadow-lg">
      <img src={book.coverImage || 'https://via.placeholder.com/400x600.png?text=Processing'} alt={book.title} className="w-full h-full object-cover" />
      {book.status !== 'READY' && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-readx-accent mx-auto"></div>
            <p className="text-xs mt-2 font-medium text-white">{book.status}...</p>
          </div>
        </div>
      )}
    </div>
    <h3 className="mt-3 text-sm font-semibold truncate text-readx-text-dark group-hover:text-readx-accent transition-colors">{book.title}</h3>
    <p className="text-xs text-gray-400">{book.author}</p>
  </div>
);

export const LibraryView: React.FC<LibraryViewProps> = ({ currentUser, onBookSelect, onLogout }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ books: 0, highlights: 0 });

  const fetchBooks = useCallback(async () => {
    if (!currentUser) return;
    const userBooks = await api.getBooks(currentUser.id);
    // Get stats via a direct db check (mocked here via a simple count for now)
    // Ideally we'd have api.getStats() but we can infer from books + a separate call if needed.
    // For simplicity, we update books.
    setBooks(userBooks);
    setStats({ books: userBooks.length, highlights: 0 }); // We would need to fetch highlights to know count
    setIsLoading(false);
  }, [currentUser]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);
  
  // Poll for status updates on processing books
  useEffect(() => {
      const isProcessing = books.some(b => b.status !== 'READY' && b.status !== 'FAILED');
      if (isProcessing) {
          const interval = setInterval(fetchBooks, 2000);
          return () => clearInterval(interval);
      }
  }, [books, fetchBooks]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0] && currentUser) {
      const file = event.target.files[0];
      try {
        await api.uploadBook(currentUser.id, file);
        fetchBooks(); 
      } catch (error) {
        console.error("Upload failed:", error);
        alert("Failed to upload book.");
      }
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files[0]) {
          try {
              await api.importLibrary(event.target.files[0]);
              alert("Library restored successfully!");
              fetchBooks();
          } catch (error) {
              alert("Failed to import library.");
          }
      }
  };

  const handleExport = async () => {
      await api.exportLibrary();
  };

  return (
    <div className="min-h-screen bg-readx-dark p-4 sm:p-6 lg:p-8 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-800 pb-6">
        <div>
            <h1 className="text-3xl font-bold flex items-center">
            <BookOpenIcon className="w-8 h-8 mr-3 text-readx-accent" />
            ReadX Library
            </h1>
            <p className="text-sm text-gray-500 mt-1 ml-11">Local-First AI Reading Platform</p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
                <button onClick={handleExport} className="flex items-center text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition-colors" title="Download Database">
                    <DownloadIcon className="w-3 h-3 mr-1.5" /> Backup
                </button>
                <label className="flex items-center text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded cursor-pointer transition-colors" title="Restore Database">
                    <UploadIcon className="w-3 h-3 mr-1.5" /> Restore
                    <input type="file" className="hidden" onChange={handleImport} accept=".json" />
                </label>
                <button onClick={onLogout} className="text-xs font-medium text-red-400 hover:text-red-300 ml-2">Logout</button>
            </div>
            <div className="flex items-center gap-3">
                <label htmlFor="book-upload" className="bg-readx-accent hover:bg-blue-600 text-white font-bold py-2 px-5 rounded-lg cursor-pointer flex items-center transition-all shadow-lg hover:shadow-readx-accent/20">
                <UploadIcon className="w-5 h-5 mr-2" />
                Add New Book
                </label>
                <input id="book-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pdf" />
            </div>
        </div>
      </header>

      {isLoading ? (
         <div className="text-center py-20"><p className="text-gray-400 animate-pulse">Loading your local library...</p></div>
      ) : books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {books.map(book => (
            <BookCover key={book.id} book={book} onBookSelect={onBookSelect} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-xl">
          <BookOpenIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Your library is empty.</p>
          <p className="text-gray-500 mt-2 mb-6">Upload a PDF to start reading with AI powers.</p>
          <label htmlFor="book-upload-empty" className="inline-flex items-center bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer transition-colors">
              <UploadIcon className="w-4 h-4 mr-2" />
              Upload PDF
            </label>
            <input id="book-upload-empty" type="file" className="hidden" onChange={handleFileChange} accept=".pdf" />
        </div>
      )}
    </div>
  );
};