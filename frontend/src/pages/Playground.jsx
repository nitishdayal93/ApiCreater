import React, { useState, useEffect } from 'react';
import {
  Terminal, Send, Code2, RefreshCw, Sliders, Key, FileText,
  Check, Copy, Plus, Trash2, Zap, Menu, Layers, Globe, Sparkles, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';
import { getAuthToken } from '../services/api';

export default function Playground({ projects = [], onOpenMobileMenu }) {
  const [method, setMethod] = useState('POST');
  const [endpoint, setEndpoint] = useState('/api/generator/generate');
  const [activeReqTab, setActiveReqTab] = useState('body'); // 'body' | 'headers' | 'auth'
  const [activeResTab, setActiveResTab] = useState('pretty'); // 'pretty' | 'raw' | 'headers'
  const [mobileViewTab, setMobileViewTab] = useState('request'); // 'request' | 'response'

  const [requestBody, setRequestBody] = useState('{\n  "prompt": "create student management rest api",\n  "database": "MongoDB"\n}');
  const [headers, setHeaders] = useState([
    { key: 'Content-Type', value: 'application/json', enabled: true },
    { key: 'Accept', value: 'application/json', enabled: true }
  ]);
  const [authToken, setAuthTokenState] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('200 OK');
  const [statusCode, setStatusCode] = useState(200);
  const [responseTime, setResponseTime] = useState('12ms');
  const [responseHeaders, setResponseHeaders] = useState({
    'content-type': 'application/json; charset=utf-8',
    'x-powered-by': 'OpenAPI Gateway Engine'
  });
  const [responseContent, setResponseContent] = useState(
    JSON.stringify({
      success: true,
      status: "online",
      gateway: "OpenAPI Studio Enterprise Sandbox",
      serverPort: 5001,
      databaseTier: "MongoDB Atlas Connected",
      activeEngine: "Groq LLAMA 3.3 70B Versatile"
    }, null, 2)
  );

  const [copied, setCopied] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [generatedPresets, setGeneratedPresets] = useState([]);

  useEffect(() => {
    const token = getAuthToken();
    if (token) setAuthTokenState(token);
  }, []);

  // Automatically extract real custom endpoints from generated user projects
  useEffect(() => {
    if (Array.isArray(projects) && projects.length > 0) {
      const customEnd = [];
      projects.forEach(proj => {
        if (proj.files && Array.isArray(proj.files)) {
          proj.files.forEach(f => {
            if (f.path && (f.path.includes('routes') || f.path.includes('server.js'))) {
              const matches = f.content.match(/router\.(get|post|put|delete)\(['"]([^'"]+)['"]/gi);
              if (matches) {
                matches.forEach(m => {
                  const parts = m.match(/router\.(get|post|put|delete)\(['"]([^'"]+)['"]/i);
                  if (parts && parts[1] && parts[2]) {
                    const mthd = parts[1].toUpperCase();
                    const path = parts[2];
                    const fullPath = path.startsWith('/api') ? path : `/api${path}`;
                    if (!customEnd.some(e => e.endpoint === fullPath && e.method === mthd)) {
                      customEnd.push({
                        label: `${proj.name || 'Custom API'} (${mthd} ${path})`,
                        method: mthd,
                        endpoint: fullPath,
                        body: mthd !== 'GET' ? '{\n  "name": "Sample Record",\n  "status": "Active"\n}' : ''
                      });
                    }
                  }
                });
              }
            }
          });
        }
      });
      if (customEnd.length > 0) {
        setGeneratedPresets(customEnd);
      }
    }
  }, [projects]);

  const samplePresets = [
    { label: 'Health Status', method: 'GET', endpoint: '/api/health', body: '' },
    { label: 'Generate API Direct', method: 'POST', endpoint: '/api/generator/generate', body: '{\n  "prompt": "create e-commerce backend api",\n  "database": "MongoDB"\n}' },
    { label: 'Get Projects List', method: 'GET', endpoint: '/api/generator/projects', body: '' },
    { label: 'Get System Metrics', method: 'GET', endpoint: '/api/admin/dashboard', body: '' },
    { label: 'Register User', method: 'POST', endpoint: '/api/auth/register', body: '{\n  "name": "Developer User",\n  "email": "dev@example.com",\n  "password": "Password123!"\n}' },
    { label: 'Login User', method: 'POST', endpoint: '/api/auth/login', body: '{\n  "email": "dev@example.com",\n  "password": "Password123!"\n}' }
  ];

  const allAvailablePresets = [...generatedPresets, ...samplePresets];

  const handleSelectPreset = (preset) => {
    setMethod(preset.method);
    setEndpoint(preset.endpoint);
    if (preset.body) {
      setRequestBody(preset.body);
      setActiveReqTab('body');
    }
  };

  const formatJsonBody = () => {
    try {
      const parsed = JSON.parse(requestBody);
      setRequestBody(JSON.stringify(parsed, null, 2));
    } catch (e) {
      // Ignore if invalid JSON
    }
  };

  const addHeaderRow = () => {
    setHeaders([...headers, { key: '', value: '', enabled: true }]);
  };

  const removeHeaderRow = (idx) => {
    setHeaders(headers.filter((_, i) => i !== idx));
  };

  const updateHeaderRow = (idx, field, val) => {
    const updated = [...headers];
    updated[idx][field] = val;
    setHeaders(updated);
  };

  const generateCurlCommand = () => {
    let curl = `curl -X ${method} "http://localhost:5001${endpoint}"`;
    headers.forEach(h => {
      if (h.enabled && h.key && h.value) {
        curl += ` -H "${h.key}: ${h.value}"`;
      }
    });
    if (authToken.trim()) {
      curl += ` -H "Authorization: Bearer ${authToken.trim()}"`;
    }
    if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody.trim()) {
      curl += ` -d '${requestBody.replace(/\n/g, '')}'`;
    }
    return curl;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(generateCurlCommand());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(responseContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendRequest = async () => {
    setIsLoading(true);
    const startTime = Date.now();
    try {
      const reqHeaders = {};
      headers.forEach(h => {
        if (h.enabled && h.key.trim()) reqHeaders[h.key] = h.value;
      });

      if (authToken.trim()) {
        reqHeaders['Authorization'] = `Bearer ${authToken.trim()}`;
      }

      const options = {
        method,
        headers: reqHeaders
      };

      if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody.trim()) {
        options.body = requestBody;
      }

      const res = await fetch(endpoint, options);
      const duration = Date.now() - startTime;
      setStatusCode(res.status);
      setStatusText(`${res.status} ${res.statusText || (res.ok ? 'OK' : 'Notice')}`);
      setResponseTime(`${duration}ms`);

      const resHeadersObj = {};
      res.headers.forEach((val, key) => {
        resHeadersObj[key] = val;
      });
      setResponseHeaders(resHeadersObj);

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setResponseContent(JSON.stringify(data, null, 2));
      } else {
        const text = await res.text();
        setResponseContent(text);
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      setStatusCode(500);
      setStatusText('Network Exception');
      setResponseTime(`${duration}ms`);
      setResponseContent(JSON.stringify({
        success: false,
        error: err.message,
        hint: 'Ensure backend server is running on http://localhost:5001'
      }, null, 2));
    } finally {
      setIsLoading(false);
      setMobileViewTab('response');
    }
  };

  const getMethodBadgeColor = (m) => {
    switch (m) {
      case 'GET': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'POST': return 'text-sky-400 border-sky-500/30 bg-sky-500/10';
      case 'PUT': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'DELETE': return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
      default: return 'text-slate-400 border-slate-700 bg-slate-800';
    }
  };

  const getStatusBadgeColor = (code) => {
    if (code >= 200 && code < 300) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (code >= 400 && code < 500) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#06090e] font-sans overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-[56px] px-4 md:px-6 border-b border-slate-800/80 bg-[#090d13] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="md:hidden p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 active:scale-95 transition-all"
              title="Open Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#091510] border border-emerald-500/80 flex items-center justify-center text-emerald-400 font-extrabold shadow-md shadow-emerald-500/25">
              <Terminal className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            </div>
            <h2 className="font-extrabold text-sm text-white tracking-tight">Interactive API Playground</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCurl}
            className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 px-3 py-1 rounded-xl text-xs font-bold transition-all active:scale-95"
            title="Copy cURL Command"
          >
            {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code2 className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">{copiedCurl ? 'Copied cURL!' : 'cURL'}</span>
          </button>

          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            SANDBOX ACTIVE
          </span>
        </div>
      </div>

      {/* Main Sandbox Container */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 max-w-7xl mx-auto w-full">
        {/* Preset Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-400" /> PRESETS:
          </span>
          {allAvailablePresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPreset(preset)}
              className="px-3 py-1 rounded-xl bg-[#101622] hover:bg-[#182132] border border-slate-800 hover:border-slate-700 text-[11px] font-semibold text-slate-300 shrink-0 transition-all flex items-center gap-1.5"
            >
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getMethodBadgeColor(preset.method)}`}>
                {preset.method}
              </span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        {/* Request Address Bar */}
        <div className="bg-[#0e141d] border border-slate-700/60 rounded-2xl p-2 md:p-2.5 shadow-xl flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={`font-black text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none cursor-pointer tracking-wider ${getMethodBadgeColor(method)}`}
          >
            <option value="GET" className="bg-[#0e141d] text-emerald-400">GET</option>
            <option value="POST" className="bg-[#0e141d] text-sky-400">POST</option>
            <option value="PUT" className="bg-[#0e141d] text-amber-400">PUT</option>
            <option value="DELETE" className="bg-[#0e141d] text-rose-400">DELETE</option>
          </select>

          <div className="flex-1 flex items-center bg-[#06090e] border border-slate-700/80 rounded-xl px-3.5 py-2">
            <span className="text-xs font-mono text-slate-500 mr-1 select-none">http://localhost:5001</span>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="/api/health"
              className="flex-1 bg-transparent text-xs text-white font-mono focus:outline-none"
            />
          </div>

          <button
            onClick={handleSendRequest}
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#00E676] hover:bg-[#00C853] text-black font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-md shadow-emerald-500/20 active:scale-95 shrink-0"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 stroke-[2.5]" />}
            <span>Send Request</span>
          </button>
        </div>

        {/* Mobile View Switcher (Request | Response) */}
        <div className="md:hidden flex items-center bg-[#0e141d] border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setMobileViewTab('request')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mobileViewTab === 'request' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
            }`}
          >
            Request Config
          </button>
          <button
            onClick={() => setMobileViewTab('response')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mobileViewTab === 'response' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
            }`}
          >
            Response Preview
          </button>
        </div>

        {/* Main Grid Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left / Request Configuration Panel (col-span-6) */}
          <div className={`md:col-span-6 bg-[#0e141d] border border-slate-800 rounded-2xl flex flex-col h-[480px] overflow-hidden ${
            mobileViewTab === 'request' ? 'flex' : 'hidden md:flex'
          }`}>
            {/* Request Config Tabs */}
            <div className="h-11 bg-[#090d13] border-b border-slate-800 px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveReqTab('body')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                    activeReqTab === 'body'
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Body</span>
                </button>

                <button
                  onClick={() => setActiveReqTab('headers')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                    activeReqTab === 'headers'
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Headers ({headers.length})</span>
                </button>

                <button
                  onClick={() => setActiveReqTab('auth')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                    activeReqTab === 'auth'
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Auth</span>
                </button>
              </div>

              {activeReqTab === 'body' && (
                <button
                  onClick={formatJsonBody}
                  className="text-[11px] font-bold text-slate-400 hover:text-emerald-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60"
                  title="Format JSON Body"
                >
                  Prettify JSON
                </button>
              )}
            </div>

            {/* Request Content Body */}
            <div className="flex-1 p-3 bg-[#06090e] overflow-auto">
              {activeReqTab === 'body' && (
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder="Raw JSON Request Body..."
                  className="w-full h-full bg-transparent text-xs font-mono text-slate-100 focus:outline-none resize-none leading-relaxed"
                />
              )}

              {activeReqTab === 'headers' && (
                <div className="space-y-2">
                  {headers.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={(e) => updateHeaderRow(idx, 'enabled', e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-emerald-400"
                      />
                      <input
                        type="text"
                        value={h.key}
                        onChange={(e) => updateHeaderRow(idx, 'key', e.target.value)}
                        placeholder="Header key (e.g. Content-Type)"
                        className="flex-1 bg-[#090d13] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        value={h.value}
                        onChange={(e) => updateHeaderRow(idx, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1 bg-[#090d13] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => removeHeaderRow(idx)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addHeaderRow}
                    className="flex items-center gap-1 text-xs text-emerald-400 font-bold hover:text-emerald-300 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Header
                  </button>
                </div>
              )}

              {activeReqTab === 'auth' && (
                <div className="space-y-3 p-1">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-400" /> Bearer JWT Token
                    </label>
                    <textarea
                      value={authToken}
                      onChange={(e) => setAuthTokenState(e.target.value)}
                      placeholder="Paste your JWT token here or login to auto-populate..."
                      rows={3}
                      className="w-full bg-[#090d13] border border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tokens are automatically attached as <code className="text-emerald-400">Authorization: Bearer &lt;token&gt;</code> on requests.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right / Response Inspection Panel (col-span-6) */}
          <div className={`md:col-span-6 bg-[#0e141d] border border-slate-800 rounded-2xl flex flex-col h-[480px] overflow-hidden ${
            mobileViewTab === 'response' ? 'flex' : 'hidden md:flex'
          }`}>
            {/* Response Top Header */}
            <div className="h-11 bg-[#090d13] border-b border-slate-800 px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveResTab('pretty')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                    activeResTab === 'pretty'
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>JSON Preview</span>
                </button>

                <button
                  onClick={() => setActiveResTab('headers')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                    activeResTab === 'headers'
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Response Headers</span>
                </button>
              </div>

              {/* Status Code & Time Badge */}
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border flex items-center gap-1 ${getStatusBadgeColor(statusCode)}`}>
                  {statusCode >= 200 && statusCode < 300 ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertCircle className="w-3 h-3 text-amber-400" />}
                  {statusText}
                </span>

                <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  {responseTime}
                </span>

                <button
                  onClick={handleCopyResponse}
                  className="p-1 rounded text-slate-400 hover:text-emerald-400 transition-colors"
                  title="Copy Response"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Response Content Display */}
            <div className="flex-1 p-3 bg-[#06090e] overflow-auto">
              {activeResTab === 'pretty' && (
                <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap">
                  {responseContent}
                </pre>
              )}

              {activeResTab === 'headers' && (
                <div className="space-y-1.5 font-mono text-xs">
                  {Object.entries(responseHeaders).map(([k, v], i) => (
                    <div key={i} className="flex border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400 w-44 truncate">{k}:</span>
                      <span className="text-emerald-400 flex-1 break-all">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
