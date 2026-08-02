import React from 'react';
import { Shield, Key, Cpu, Database, Activity } from 'lucide-react';

export default function AdminPortal() {
  return (
    <div className="min-h-screen bg-[#06090e] p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-emerald-400/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span>Admin Portal & OpenAPI Engine Control</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">System status, Groq Llama 3 API keys, and model rate limiters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0f141c] border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-3 uppercase tracking-wider">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Key className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span>Groq Model Configuration</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Active Architecture Model</label>
              <input type="text" readOnly value="llama-3.3-70b-versatile" className="w-full bg-[#06090e] border border-slate-700 text-slate-200 p-2.5 rounded-xl font-mono" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Max Token Context Window</label>
              <input type="text" readOnly value="128,000 Tokens" className="w-full bg-[#06090e] border border-slate-700 text-slate-200 p-2.5 rounded-xl font-mono" />
            </div>
          </div>
        </div>

        <div className="bg-[#0f141c] border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-3 uppercase tracking-wider">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span>System Health Status</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center bg-[#06090e] p-3 rounded-xl border border-slate-800">
              <span className="text-slate-300">Express API Gateway</span>
              <span className="text-emerald-400 font-bold">● Active (Port 5001)</span>
            </div>
            <div className="flex justify-between items-center bg-[#06090e] p-3 rounded-xl border border-slate-800">
              <span className="text-slate-300">Database Engine</span>
              <span className="text-emerald-400 font-bold">● MongoDB Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
