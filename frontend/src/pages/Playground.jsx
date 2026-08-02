import React, { useState } from 'react';
import { Terminal, Send, Code2, RefreshCw } from 'lucide-react';
import { getAuthToken } from '../services/api';

export default function Playground() {
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState('/api/health');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('200 OK');
  const [response, setResponse] = useState(`{\n  "success": true,\n  "status": "online",\n  "system": "OpenAPI Gateway",\n  "port": 5001\n}`);

  const handleSendRequest = async () => {
    setIsLoading(true);
    const startTime = Date.now();
    try {
      const token = getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(endpoint, { method, headers });
      const duration = Date.now() - startTime;
      const data = await res.json();
      
      setStatusText(`${res.status} ${res.statusText || 'OK'} - ${duration}ms`);
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      const duration = Date.now() - startTime;
      setStatusText(`Notice - ${duration}ms`);
      setResponse(JSON.stringify({
        success: false,
        error: err.message,
        hint: 'Make sure endpoint exists on server.js or local backend router.'
      }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06090e] p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-emerald-400/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <Terminal className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span>Playground Sandbox API Tester</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Test your generated REST API endpoints live in sandbox mode</p>
        </div>
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          Sandbox Ready
        </span>
      </div>

      {/* Request Bar */}
      <div className="bg-[#0f141c] border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="bg-[#06090e] border border-slate-700 text-emerald-400 font-extrabold text-xs rounded-xl px-4 py-2.5 focus:outline-none"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>

        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          className="flex-1 bg-[#06090e] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
        />

        <button
          onClick={handleSendRequest}
          disabled={isLoading}
          className="flex items-center gap-2 bg-[#00E676] hover:bg-[#00C853] text-black font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
        >
          {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send Request
        </button>
      </div>

      {/* Response Box */}
      <div className="bg-[#0f141c] border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-96">
        <div className="h-10 bg-[#06090e] border-b border-slate-800 px-4 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            Response ({statusText})
          </span>
        </div>
        <pre className="flex-1 p-4 text-xs font-mono text-emerald-400 bg-[#06090e] overflow-auto">
          {response}
        </pre>
      </div>
    </div>
  );
}
