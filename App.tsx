import React, { useState, useEffect } from 'react';
import { Book, User } from './types';
import { LibraryView } from './components/LibraryView';
import { ReaderView } from './components/ReaderView';
import { LoginView } from './components/LoginView';

type View = 'login' | 'library' | 'reader';

function App() {
  const [view, setView] = useState<View>('library');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for saved user session on initial load
  useEffect(() => {
    const savedUser = localStorage.getItem('readx_currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);
  
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('readx_currentUser', JSON.stringify(user));
  };
  
  const handleLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem('readx_currentUser');
      setBooks([]);
  }

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    setView('reader');
  };

  const closeReader = () => {
    setSelectedBook(null);
    setView('library');
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-readx-dark flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-readx-accent"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="App">
      {view === 'library' ? (
        <LibraryView 
            currentUser={currentUser}
            onBookSelect={handleBookSelect} 
            onLogout={handleLogout}
        />
      ) : selectedBook ? (
        <ReaderView 
            book={selectedBook} 
            user={currentUser} 
            onClose={closeReader} 
        />
      ) : (
        // Fallback to library if reader is open but no book is selected
        <LibraryView 
            currentUser={currentUser}
            onBookSelect={handleBookSelect} 
            onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
