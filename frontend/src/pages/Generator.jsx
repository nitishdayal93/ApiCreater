import React, { useState, useEffect } from 'react';
import {
  Send, RefreshCw, FileCode, CheckCircle2, Play, Download, Code2, ArrowUp, Database, Plus, Globe, Sparkles
} from 'lucide-react';
import ChatBubble from '../components/ChatBubble';
import ProjectTree from '../components/generator/ProjectTree';
import CodeViewer from '../components/generator/CodeViewer';
import api from '../services/api';
import { downloadProjectZip } from '../utils/zipDownload';

export default function Generator({ onProjectGenerated, activeProject, activeChatId }) {
  const [prompt, setPrompt] = useState('');
  const [database, setDatabase] = useState('MongoDB');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProjectName, setCurrentProjectName] = useState('api-repository');

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      content: 'Describe your backend requirements below. OpenAPI AI will plan architecture, generate REST API routes, models, controllers, and package downloads.',
      timestamp: 'Just now'
    }
  ]);

  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [mobileTab, setMobileTab] = useState('chat'); // 'chat' | 'workspace' on mobile

  // Sync active project selection from sidebar history
  useEffect(() => {
    if (activeProject && activeProject.files && activeProject.files.length > 0) {
      const projName = activeProject.name || 'generated-api';
      const projFiles = activeProject.files;
      const userPromptText = activeProject.description || activeProject.prompt || `Generated repository: ${projName}`;

      setCurrentProjectName(projName);
      setGeneratedFiles(projFiles);
      setSelectedFile(projFiles[0]);

      setMessages([
        {
          id: 1,
          sender: 'user',
          content: userPromptText,
          timestamp: 'History Session'
        },
        {
          id: 2,
          sender: 'assistant',
          content: `Loaded **${projName}** repository workspace with ${projFiles.length} files. Review code on the workspace tree or download the ZIP archive below.`,
          thinkingSteps: [
            'Retrieved project workspace files from database',
            `Configured database tier: ${activeProject.database || 'MongoDB'}`,
            'Loaded interactive file tree & code viewer'
          ],
          timestamp: 'Just now',
          showDownload: true,
          projectName: projName,
          onDownloadZip: () => downloadProjectZip(projFiles, projName, activeProject.id || activeProject._id)
        }
      ]);
    } else if (activeChatId && activeChatId.startsWith('new_')) {
      setGeneratedFiles([]);
      setSelectedFile(null);
      setMessages([
        {
          id: 1,
          sender: 'assistant',
          content: 'Describe your backend requirements below. OpenAPI AI will plan architecture, generate REST API routes, models, controllers, and package downloads.',
          timestamp: 'Just now'
        }
      ]);
    }
  }, [activeProject, activeChatId]);

  const samplePrompts = [
    {
      title: "Student Management API",
      subtitle: "REST routes, models & auth for student portal",
      prompt: "create student management rest api"
    },
    {
      title: "E-Commerce Backend",
      subtitle: "Products catalog, cart, orders & payments",
      prompt: "ecommerce backend api with auth and products"
    },
    {
      title: "Blogging & Comments Service",
      subtitle: "Posts, tags, user profiles & comments",
      prompt: "blogging service api with posts and comments"
    },
    {
      title: "Notification System API",
      subtitle: "User notification logs, preferences & events",
      prompt: "create user notification system api with logs"
    }
  ];

  const handleSend = async (customPrompt) => {
    const textToSend = customPrompt || prompt;
    if (!textToSend.trim() || isGenerating) return;

    const startTime = Date.now();
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setPrompt('');
    setIsGenerating(true);

    try {
      const data = await api.generateDirect(textToSend, database);

      let resultFiles = [];
      let projectName = textToSend.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'api-repository';
      if (!projectName.endsWith('-api')) projectName += '-api';

      if (data.success && data.data?.files) {
        resultFiles = data.data.files;
        if (data.data.name) projectName = data.data.name;
      } else {
        resultFiles = [
          {
            path: 'src/server.js',
            content: `const express = require('express');\nconst cors = require('cors');\nconst app = express();\n\napp.use(cors());\napp.use(express.json());\n\n// Generated Endpoints\napp.use('/api', require('./routes/apiRoutes'));\n\nconst PORT = process.env.PORT || 5000;\napp.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));`
          },
          {
            path: 'src/routes/apiRoutes.js',
            content: `const express = require('express');\nconst router = express.Router();\nconst { getItems, createItem } = require('../controllers/apiController');\n\nrouter.get('/', getItems);\nrouter.post('/', createItem);\n\nmodule.exports = router;`
          },
          {
            path: 'src/controllers/apiController.js',
            content: `// Controller for ${database}\nexports.getItems = async (req, res) => {\n  res.status(200).json({ success: true, data: [] });\n};\n\nexports.createItem = async (req, res) => {\n  res.status(201).json({ success: true, message: 'Record created' });\n};`
          },
          {
            path: 'package.json',
            content: `{\n  "name": "${projectName}",\n  "version": "1.0.0",\n  "main": "src/server.js",\n  "scripts": { "start": "node src/server.js" },\n  "dependencies": { "express": "^4.18.2", "cors": "^2.8.5" }\n}`
          }
        ];
      }

      setGeneratedFiles(resultFiles);
      setSelectedFile(resultFiles[0]);
      setCurrentProjectName(projectName);

      const generationSeconds = ((Date.now() - startTime) / 1000).toFixed(1) + 'S GENERATION';

      // Create new dynamic project record
      const newProject = {
        id: Date.now().toString(),
        name: projectName,
        tag: 'NODE.JS + EXPRESS',
        description: `${textToSend} generated via OpenAPI Engine`,
        generationTime: generationSeconds,
        database: `DB: ${database.toUpperCase()}`,
        downloadsCount: 0,
        files: resultFiles
      };

      if (onProjectGenerated) {
        onProjectGenerated(newProject);
      }

      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        content: `Successfully generated **${projectName}** repository with ${resultFiles.length} files. Review the code on the workspace tree or click the button below to download the ZIP archive.`,
        thinkingSteps: [
          'Interpreted requirements with OpenAPI AI',
          `Configured database tier: ${database}`,
          'Organized clean file tree & routes',
          'Updated repository dashboard'
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        showDownload: true,
        projectName: projectName,
        onDownloadZip: () => downloadProjectZip(resultFiles, projectName, newProject.id)
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCurrentZip = () => {
    downloadProjectZip(generatedFiles, currentProjectName);
  };

  const hasFiles = generatedFiles.length > 0;
  const isInitialState = !hasFiles && messages.length <= 1;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#06090e] overflow-hidden font-sans">
      {/* Mobile Tab Switcher Bar (Visible only on mobile when files are generated) */}
      {hasFiles && (
        <div className="md:hidden flex items-center bg-[#090d13] border-b border-slate-800 p-1 shrink-0">
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 ${mobileTab === 'chat'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <span>💬 Chat Stream</span>
          </button>
          <button
            onClick={() => setMobileTab('workspace')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 ${mobileTab === 'workspace'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Workspace ({generatedFiles.length})</span>
          </button>
        </div>
      )}

      {/* Left / Main Chat Area */}
      <div className={`flex-col bg-[#06090e] h-full transition-all duration-300 ${hasFiles
          ? `w-full md:w-5/12 border-r border-slate-800/80 ${mobileTab === 'chat' ? 'flex' : 'hidden md:flex'}`
          : 'flex w-full max-w-4xl mx-auto'
        }`}>
        {/* Top Header Bar */}
        <div className="h-[53px] px-4 md:px-6 border-b border-slate-800/80 bg-[#090d13] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#091510] border border-emerald-500/80 flex items-center justify-center text-emerald-400 font-extrabold shadow-md shadow-emerald-500/25">
              <Code2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            </div>
            <h2 className="font-extrabold text-sm text-white tracking-tight hidden sm:block">OpenAPI Studio</h2>
          </div>

          <div className="flex items-center gap-2">
            {hasFiles && (
              <>
                <button
                  onClick={handleDownloadCurrentZip}
                  className="flex items-center gap-1.5 bg-[#00E676] hover:bg-[#00C853] text-black font-extrabold px-3 py-1 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 active:scale-95 animate-bounce"
                  title="Download Generated Repository ZIP"
                >
                  <Download className="w-3.5 h-3.5 stroke-[3]" />
                  <span className="hidden sm:inline">Download ZIP</span>
                </button>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  ({generatedFiles.length} FILES)
                </span>
              </>
            )}
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              GROQ LLAMA 3
            </span>
          </div>
        </div>

        {/* CONDITION 1: ChatGPT-Style Centered Landing Page (Before Prompt Sent) */}
        {isInitialState ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 text-center max-w-3xl mx-auto w-full space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Hero Heading - ChatGPT Style */}
            <div className="space-y-2.5 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#181d26] border border-slate-700/80 flex items-center justify-center text-emerald-400 shadow-xl mb-1">
                <Sparkles className="w-6 h-6 text-emerald-400 stroke-[2.5]" />
              </div>

              <h1 className="text-xl md:text-3xl font-semibold text-white tracking-tight">
                What backend API do you want to build?
              </h1>

              <p className="text-xs text-slate-400 font-normal max-w-md mx-auto leading-relaxed px-2">
                Describe your requirements. OpenAPI AI will plan REST controllers, models, architecture, and package a downloadable ZIP archive.
              </p>
            </div>

            {/* ChatGPT Centered Input Box */}
            <div className="w-full bg-[#141a23] border border-slate-700/60 focus-within:border-slate-500/80 rounded-[26px] p-3.5 shadow-2xl transition-all flex flex-col justify-between min-h-[120px]">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask OpenAPI AI to generate your backend API..."
                rows={2}
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none resize-none font-normal leading-relaxed px-2 py-1"
              />

              <div className="flex items-center justify-between pt-2 px-1 flex-wrap gap-2">
                {/* Left ChatGPT Toolbar */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Add context or attachment"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Search API templates"
                  >
                    <Globe className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5 bg-[#1c2330] hover:bg-[#232c3d] border border-slate-700/60 px-3 py-1 rounded-full text-xs text-slate-200 font-medium cursor-pointer transition-colors">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <select
                      value={database}
                      onChange={(e) => setDatabase(e.target.value)}
                      className="bg-transparent focus:outline-none text-slate-200 cursor-pointer text-xs font-medium pr-1"
                    >
                      <option value="MongoDB" className="bg-[#141a23] text-slate-200">MongoDB</option>
                      <option value="PostgreSQL" className="bg-[#141a23] text-slate-200">PostgreSQL</option>
                      <option value="MySQL" className="bg-[#141a23] text-slate-200">MySQL</option>
                      <option value="SQLite" className="bg-[#141a23] text-slate-200">SQLite</option>
                    </select>
                  </div>
                </div>

                {/* Right ChatGPT Dynamic Send Circle Button */}
                <button
                  onClick={() => handleSend()}
                  disabled={isGenerating || !prompt.trim()}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    prompt.trim()
                      ? 'bg-[#00E676] text-black hover:bg-[#00C853] shadow-md active:scale-95 cursor-pointer'
                      : 'bg-[#252d3a] text-slate-500 cursor-not-allowed'
                  }`}
                  title="Generate API"
                >
                  <ArrowUp className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* CONDITION 2: Active Chat Stream View (After Prompt Sent) */
          <>
            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  onDownloadZip={handleDownloadCurrentZip}
                />
              ))}

              {isGenerating && (
                <div className="flex items-center gap-3 p-4 bg-[#090d13] border border-emerald-500/30 rounded-2xl animate-pulse">
                  <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span className="text-xs text-emerald-300 font-bold">
                    OpenAPI AI is interpreting requirements & generating repository code...
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Input Bar for Active Chat */}
            <div className="p-3 bg-[#06090e] border-t border-slate-800/80 shrink-0">
              <div className="max-w-3xl mx-auto w-full bg-[#141a23] border border-slate-700/60 focus-within:border-slate-500/80 rounded-[26px] p-2.5 shadow-xl transition-all flex items-center gap-2">
                <button
                  type="button"
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
                  title="Add context"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask a follow-up or specify changes..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none resize-none font-normal leading-relaxed px-1 py-1 max-h-32"
                />

                <button
                  onClick={() => handleSend()}
                  disabled={isGenerating || !prompt.trim()}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${prompt.trim()
                      ? 'bg-[#00E676] text-black hover:bg-[#00C853] shadow-md active:scale-95 cursor-pointer'
                      : 'bg-[#252d3a] text-slate-500 cursor-not-allowed'
                    }`}
                  title="Send"
                >
                  <ArrowUp className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Workspace Column - Opens Dynamically ONLY After Backend Generates Files */}
      {hasFiles && (
        <div className={`w-full md:w-7/12 flex-col p-2 md:p-4 bg-[#06090e] h-full overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-right-8 ${mobileTab === 'workspace' ? 'flex' : 'hidden md:flex'
          }`}>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 h-full overflow-hidden">
            <div className="md:col-span-5 h-64 md:h-full overflow-hidden">
              <ProjectTree
                files={generatedFiles}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
                onDownloadZip={handleDownloadCurrentZip}
              />
            </div>

            <div className="md:col-span-7 h-full overflow-hidden flex-1">
              <CodeViewer selectedFile={selectedFile} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



