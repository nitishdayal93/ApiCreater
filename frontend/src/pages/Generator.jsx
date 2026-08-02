import React, { useState, useEffect } from 'react';
import {
  Send, RefreshCw, FileCode, CheckCircle2, Play, Download, Code2, ArrowUp, Database
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
    "create student management rest api",
    "ecommerce backend api with auth and products",
    "blogging service api with posts and comments"
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
    <div className="flex-1 flex flex-col md:flex-row h-screen bg-[#06090e] overflow-hidden font-sans">
      {/* Left / Main Chat Area */}
      <div className={`flex flex-col bg-[#06090e] h-full transition-all duration-300 ${hasFiles ? 'w-full md:w-5/12 border-r border-slate-800/80' : 'w-full max-w-4xl mx-auto'
        }`}>
        {/* Top Header Bar */}
        <div className="h-[53px] px-6 border-b border-slate-800/80 bg-[#090d13] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#091510] border border-emerald-500/80 flex items-center justify-center text-emerald-400 font-extrabold shadow-md shadow-emerald-500/25">
              <Code2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            </div>
            <h2 className="font-extrabold text-sm text-white tracking-tight">OpenAPI Studio</h2>
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
                  <span>Download ZIP</span>
                </button>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  ({generatedFiles.length} FILES)
                </span>
              </>
            )}
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
              GROQ LLAMA 3
            </span>
          </div>
        </div>

        {/* CONDITION 1: ChatGPT-Style Centered Landing Page (Before Prompt Sent) */}
        {isInitialState ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto w-full space-y-8 animate-in fade-in zoom-in-95 duration-300">
            {/* Hero Heading */}
            <div className="space-y-4 flex flex-col items-center">
              {/* 3D Glass Logo Badge */}
              <div className="w-16 h-16 rounded-2xl bg-[#091510] border-2 border-emerald-500/90 flex items-center justify-center shadow-2xl shadow-emerald-500/40 text-emerald-400 font-black hover:scale-110 hover:border-emerald-400 transition-all duration-300 group cursor-pointer relative overflow-hidden my-1">
                <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl blur-md"></div>
                <Code2 className="w-8 h-8 text-emerald-400 stroke-[2.5] relative z-10 group-hover:rotate-6 transition-transform" />
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">
                WHERE SHOULD WE BEGIN?
              </h1>

              <p className="text-xs text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
                Describe your requirements in plain English. OpenAPI AI will plan architecture, organize file trees, write full REST CRUD controllers, and package ZIP downloads.
              </p>
            </div>

            {/* ChatGPT Centered Input Box */}
            <div className="w-full bg-[#0d141e]/90 border border-slate-700/60 focus-within:border-emerald-500/70 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-3xl p-4 shadow-2xl transition-all space-y-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Describe your backend API requirements... (e.g. create student management rest api)"
                rows={3}
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none resize-none font-normal leading-relaxed px-1"
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 px-2.5 py-1 rounded-xl text-[11px] text-slate-300 font-medium">
                    <Database className="w-3 h-3 text-emerald-400" />
                    <select
                      value={database}
                      onChange={(e) => setDatabase(e.target.value)}
                      className="bg-transparent focus:outline-none text-slate-200 cursor-pointer text-[11px] font-semibold"
                    >
                      <option value="MongoDB" className="bg-[#0b1017] text-slate-200">MongoDB</option>
                      <option value="PostgreSQL" className="bg-[#0b1017] text-slate-200">PostgreSQL</option>
                      <option value="MySQL" className="bg-[#0b1017] text-slate-200">MySQL</option>
                      <option value="SQLite" className="bg-[#0b1017] text-slate-200">SQLite</option>
                    </select>
                  </div>

                  <span className="hidden sm:inline text-[11px] text-slate-500 font-medium">
                    <kbd className="px-1.5 py-0.5 bg-slate-800/70 text-slate-400 rounded text-[10px]">Enter ↵</kbd> to generate
                  </span>
                </div>

                <button
                  onClick={() => handleSend()}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-9 h-9 rounded-full bg-[#00E676] hover:bg-[#00C853] disabled:bg-slate-800 text-black disabled:text-slate-600 flex items-center justify-center transition-all shadow-md shadow-emerald-500/20 disabled:shadow-none active:scale-95"
                  title="Generate API"
                >
                  <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Sample Prompts Suggestion Cards */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {samplePrompts.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(preset)}
                  className="p-4 bg-[#080d14] border border-slate-800/90 hover:border-emerald-500/50 hover:bg-[#0d131c] rounded-2xl text-left transition-all group shadow-md"
                >
                  <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>SUGGESTED PROMPT</span>
                    <span className="text-emerald-500/40 group-hover:text-emerald-400 transition-colors">→</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-300 group-hover:text-white line-clamp-2 leading-relaxed">
                    {preset}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* CONDITION 2: Active Chat Stream View (After Prompt Sent) */
          <>
            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            <div className="p-4 bg-[#090d13] border-t border-slate-800/80 shrink-0">
              <div className="bg-[#0d141e]/90 border border-slate-700/60 focus-within:border-emerald-500/70 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-3xl p-3 shadow-xl transition-all flex items-end gap-2">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask a follow-up or specify changes... (e.g. add JWT authentication)"
                  rows={2}
                  className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-400 focus:outline-none resize-none font-normal leading-relaxed px-1 py-1"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-8 h-8 rounded-full bg-[#00E676] hover:bg-[#00C853] disabled:bg-slate-800 text-black disabled:text-slate-600 flex items-center justify-center transition-all shadow-md shadow-emerald-500/20 disabled:shadow-none active:scale-95 shrink-0"
                  title="Send"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Workspace Column - Opens Dynamically ONLY After Backend Generates Files */}
      {hasFiles && (
        <div className="w-full md:w-7/12 flex flex-col p-4 bg-[#06090e] h-full overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-right-8">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 h-full overflow-hidden">
            <div className="md:col-span-5 h-full overflow-hidden">
              <ProjectTree
                files={generatedFiles}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
                onDownloadZip={handleDownloadCurrentZip}
              />
            </div>

            <div className="md:col-span-7 h-full overflow-hidden">
              <CodeViewer selectedFile={selectedFile} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



