import React, { useState } from 'react';
import { 
  LayoutGrid, Wand2, Terminal, Shield, Search, 
  MessageSquare, LogOut, Sparkles, Plus, Code2, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ 
  currentView, 
  setCurrentView, 
  historyChats, 
  activeChatId, 
  onSelectChat, 
  onNewChat,
  onLogout,
  isMobileOpen,
  onCloseMobile
}) {
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChats = (historyChats || []).filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNavClick = (view) => {
    setCurrentView(view);
    if (onCloseMobile) onCloseMobile();
  };

  const handleChatClick = (id) => {
    onSelectChat(id);
    setCurrentView('generator');
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#090d13] border-r border-slate-800/80 flex flex-col h-screen shrink-0 font-sans transition-transform duration-300 ease-in-out ${
        isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Mobile Sidebar Header */}
        <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#091510] border border-emerald-500/80 flex items-center justify-center text-emerald-400 font-extrabold shadow-md shadow-emerald-500/25">
              <Code2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            </div>
            <h2 className="font-extrabold text-sm text-white tracking-tight">OpenAPI Studio</h2>
          </div>

          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Navigation Links */}
        <div className="p-4 space-y-2 border-b border-slate-800/60">
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all uppercase ${
              currentView === 'dashboard'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-emerald-400" />
            DASHBOARD
          </button>

          <button
            onClick={() => handleNavClick('generator')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all uppercase ${
              currentView === 'generator'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Code2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            API GENERATOR
          </button>

          <button
            onClick={() => handleNavClick('playground')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all uppercase ${
              currentView === 'playground'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            PLAYGROUND
          </button>

          <button
            onClick={() => handleNavClick('admin')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all uppercase ${
              currentView === 'admin'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            ADMIN PORTAL
          </button>
        </div>

        {/* HISTORY Section */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 tracking-widest uppercase">
              HISTORY
            </span>
            <button 
              onClick={() => { onNewChat(); if (onCloseMobile) onCloseMobile(); }} 
              title="New Chat" 
              className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Chats Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-[#12161f] border border-slate-800 rounded-full pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          {/* Chat History List */}
          <div className="space-y-1 pt-1">
            {filteredChats.length === 0 ? (
              <div className="text-[11px] text-slate-600 py-3 px-1 text-center">
                No recent chats
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleChatClick(chat.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-all ${
                    activeChatId === chat.id
                      ? 'text-emerald-400 font-bold bg-emerald-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{chat.title}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#090d13] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 text-black font-extrabold flex items-center justify-center text-xs shrink-0 shadow-md shadow-emerald-500/20 uppercase">
              {(user?.name || user?.email || 'User').slice(0, 2)}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-extrabold text-xs text-slate-100 truncate">{user?.name || 'Developer'}</h4>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || 'user@example.com'}</p>
            </div>
          </div>

          <button
            onClick={() => { if (logout || onLogout) (logout || onLogout)(); if (onCloseMobile) onCloseMobile(); }}
            className="w-full flex items-center justify-center gap-2 border border-slate-700 hover:border-emerald-500/60 text-slate-300 hover:text-emerald-400 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            SIGN OUT
          </button>
        </div>
      </aside>
    </>
  );
}
