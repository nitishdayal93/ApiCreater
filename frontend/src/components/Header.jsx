import React from 'react';
import { Wand2, LayoutDashboard, User, LogOut, Download, Sparkles, Code2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ currentView, setCurrentView, hasGeneratedProject, onDownloadZip }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="h-16 bg-[#090d13]/95 border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl">
      {/* Brand Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentView('generator')}
          className="flex items-center gap-3 text-left focus:outline-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform text-black font-bold">
            <Sparkles className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white">
                OpenAPI Studio
              </h1>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                PRO AI
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">OpenAPI Code Studio</p>
          </div>
        </button>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrentView('generator')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all uppercase ${currentView === 'generator'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
        >
          <Code2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
          AI Generator
        </button>

        <button
          onClick={() => setCurrentView('dashboard')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all uppercase ${currentView === 'dashboard'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
        >
          <LayoutDashboard className="w-4 h-4 text-emerald-400" />
          Dashboard
        </button>

        {hasGeneratedProject && (
          <button
            onClick={onDownloadZip}
            className="flex items-center gap-2 bg-[#00E676] hover:bg-[#00C853] text-black font-extrabold px-4 py-1.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
          >
            <Download className="w-4 h-4 stroke-[3]" />
            Download ZIP
          </button>
        )}

        {/* User Account / Auth Status */}
        {isAuthenticated ? (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-black font-extrabold flex items-center justify-center text-xs uppercase shadow-md shadow-emerald-500/20">
                {(user?.name || user?.email || 'User').slice(0, 2)}
              </div>
              <span className="text-xs font-bold text-slate-200 hidden md:inline">{user?.name}</span>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCurrentView('login')}
            className="flex items-center gap-2 bg-[#00E676] hover:bg-[#00C853] text-black font-extrabold px-4 py-1.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
          >
            <User className="w-4 h-4 stroke-[3]" />
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}

