import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { loginUser, signupUser } from '../src/api';

const AuthCard = ({ isSignIn, setIsSignIn, onClose, onAuthSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const payload = isSignIn
        ? await loginUser(email.trim(), password)
        : await signupUser(fullName.trim(), email.trim(), password);

      onAuthSuccess?.(payload);
    } catch (err) {
      const message = err?.response?.data?.error || 'Authentication failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="relative z-[100] w-full max-w-md p-10 mx-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[40px] shadow-2xl"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
      >
        <X size={20} />
      </button>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isSignIn ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-gray-400 font-medium">
          {isSignIn ? 'Login to SlideCast AI' : 'Start your AI journey with us'}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {!isSignIn && (
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-gray-500"
          />
        )}

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-gray-500"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-gray-500"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 mt-2 bg-gradient-to-r from-[#7F00FF] to-[#00C6FF] text-white font-bold rounded-2xl shadow-lg hover:shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-70"
        >
          {isLoading ? 'Please wait...' : isSignIn ? 'Sign In' : 'Get Started'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => {
            setError('');
            setIsSignIn(!isSignIn);
          }}
          className="text-sm text-gray-400 hover:text-white underline underline-offset-4 transition-colors"
        >
          {isSignIn ? 'New here? Create an account' : 'Already have an account? Log in'}
        </button>
      </div>
    </motion.div>
  );
};

export default AuthCard;
