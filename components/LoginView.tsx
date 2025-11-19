import React, { useState } from 'react';
import { BookOpenIcon } from './icons';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // NOTE: In a real app, this would call your backend API.
      // We are simulating this with our apiService.
      const { api } = await import('../services/apiService');
      let user;
      if (isLogin) {
        user = await api.login(email, password);
      } else {
        user = await api.signup(name, email, password);
      }
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-readx-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-readx-dark-secondary p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <BookOpenIcon className="w-12 h-12 mx-auto text-readx-accent" />
          <h1 className="text-3xl font-bold mt-4">Welcome to ReadX</h1>
          <p className="text-gray-400">{isLogin ? 'Sign in to your library' : 'Create an account to start'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="mb-4">
              <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-readx-dark px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-readx-accent"
                required={!isLogin}
              />
            </div>
          )}
          <div className="mb-4">
            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-readx-dark px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-readx-accent"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-readx-dark px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-readx-accent"
              required
            />
          </div>

          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-readx-accent hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button onClick={() => setIsLogin(!isLogin)} className="text-readx-accent hover:underline ml-1">
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};
