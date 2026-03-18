import React, { useState } from 'react';
import AuthCard from '../components/AuthCard';

const AuthPage = () => {
  const [isSignIn, setIsSignIn] = useState(true);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#e8eef3] relative overflow-hidden font-sans">
      
      {/* Background Liquid Elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-[80px] opacity-50 animate-blob"></div>
      <div className="absolute top-40 right-20 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-[80px] opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-20 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-[80px] opacity-50 animate-blob animation-delay-4000"></div>

      <AuthCard 
        title={isSignIn ? "Welcome Back" : "Create Account"} 
        subtitle={isSignIn ? "Login to Zeemo Dashboard" : "Start your freelancing journey"}
      >
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          {!isSignIn && (
            <input 
              type="text" 
              placeholder="Full Name" 
              className="w-full px-6 py-4 bg-white/30 border border-white/40 rounded-2xl outline-none focus:ring-2 focus:ring-purple-400 transition-all placeholder-gray-500 text-gray-800"
            />
          )}

          <input 
            type="email" 
            placeholder="Email Address" 
            className="w-full px-6 py-4 bg-white/30 border border-white/40 rounded-2xl outline-none focus:ring-2 focus:ring-purple-400 transition-all placeholder-gray-500 text-gray-800"
          />

          <input 
            type="password" 
            placeholder="Password" 
            className="w-full px-6 py-4 bg-white/30 border border-white/40 rounded-2xl outline-none focus:ring-2 focus:ring-purple-400 transition-all placeholder-gray-500 text-gray-800"
          />

          <button className="w-full py-4 mt-4 bg-gradient-to-br from-[#7c3aed] to-[#0891b2] text-white font-bold rounded-2xl shadow-lg hover:shadow-cyan-500/30 transition-all active:scale-95">
            {isSignIn ? "Sign In" : "Get Started"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsSignIn(!isSignIn)}
            className="text-sm text-gray-600 hover:text-purple-700 font-semibold underline underline-offset-4"
          >
            {isSignIn ? "New here? Create an account" : "Already have an account? Log in"}
          </button>
        </div>
      </AuthCard>
    </div>
  );
};

export default AuthPage;