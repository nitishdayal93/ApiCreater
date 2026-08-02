import React, { useState } from 'react';
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onNavigate }) {
  const [email, setEmail] = useState('developer@example.com');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState('');
  const { login, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await login(email, password);
      onNavigate('generator');
    } catch (err) {
      setErrorMsg(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#06090e] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-[#0f141c] border border-slate-800/90 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center space-y-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 text-black font-extrabold">
            <Sparkles className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-black text-white">Welcome Back</h2>
          <p className="text-xs text-slate-400 font-medium">Sign in to your OpenAPI account</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 text-center font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#06090e] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#06090e] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#00E676] hover:bg-[#00C853] text-black font-extrabold py-3 rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg shadow-emerald-500/20 mt-2"
          >
            Sign In to OpenAPI
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400 font-medium">
          Don't have an account?{' '}
          <button onClick={() => onNavigate('register')} className="text-emerald-400 font-bold hover:underline">
            Register
          </button>
        </div>
      </div>
    </div>
  );
}

