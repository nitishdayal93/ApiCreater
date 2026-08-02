import React, { useState, useEffect } from 'react';
import {
  Sparkles, Plus, Clock, Download, Play, RefreshCw,
  Terminal, Database, Code2, ArrowRight, CheckCircle2, Wand2,
  Trash2, CheckSquare, Square, FolderArchive, Zap, FileCode, Cpu
} from 'lucide-react';
import api from '../services/api';

function TiltCard({ children, className = "", style = {} }) {
  const cardRef = React.useRef(null);
  const rafId = React.useRef(null);

  const handleMouseMove = (e) => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    rafId.current = requestAnimationFrame(() => {
      if (cardRef.current) {
        const tiltX = ((-y / rect.height) * 10).toFixed(2);
        const tiltY = ((x / rect.width) * 10).toFixed(2);
        cardRef.current.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      }
    });
  };

  const handleMouseLeave = () => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-150 ease-out will-change-transform ${className}`}
      style={{
        transformStyle: 'preserve-3d',
        ...style
      }}
    >
      {children}
    </div>
  );
}

export default function Dashboard({ projects, onNewGenerator, onOpenPlayground, onDownloadZip }) {
  const [loading, setLoading] = useState(false);
  const [repoList, setRepoList] = useState(projects || []);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedRepos, setSelectedRepos] = useState([]);

  useEffect(() => {
    // Sync with prop projects and fetch from backend API
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const data = await api.getProjects();
        let apiList = [];
        if (data.success && Array.isArray(data.data)) {
          apiList = data.data;
        }

        // Combine backend items + newly created in-memory items avoiding duplicates
        const combined = [...apiList];
        if (Array.isArray(projects)) {
          projects.forEach(p => {
            const pId = p._id || p.id;
            const pName = (p.name || '').toLowerCase();
            const exists = combined.some(item =>
              (item._id || item.id) === pId || (item.name || '').toLowerCase() === pName
            );
            if (!exists) {
              combined.unshift(p);
            }
          });
        }

        setRepoList(combined);
      } catch (err) {
        if (projects && projects.length > 0) setRepoList(projects);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [projects]);

  const toggleSelectRepo = (id) => {
    setSelectedRepos((prev) =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRepos.length === repoList.length) {
      setSelectedRepos([]);
    } else {
      setSelectedRepos(repoList.map(r => r._id || r.id));
    }
  };

  const handleDeleteSingle = async (repoId) => {
    try {
      setRepoList((prev) => prev.filter(r => (r._id || r.id) !== repoId));
      setSelectedRepos((prev) => prev.filter(id => id !== repoId));
      await api.deleteProject(repoId).catch(() => { });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRepos.length === 0) return;
    try {
      setRepoList((prev) => prev.filter(r => !selectedRepos.includes(r._id || r.id)));
      const idsToDelete = [...selectedRepos];
      setSelectedRepos([]);
      await api.bulkDeleteProjects(idsToDelete).catch(() => { });
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-cycle workflow steps every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const totalRepos = repoList.length;
  const totalDownloads = repoList.reduce((acc, r) => acc + (r.downloadsCount || 0), 0);

  const workflowSteps = [
    {
      id: 0,
      iconComponent: <FileCode className="w-5 h-5 stroke-[2.5]" />,
      badge: 'STEP 1 • INPUT REQUIREMENTS',
      title: 'Describe Your Backend Requirements',
      desc: 'Type your requirements in plain English (e.g. "create e-commerce API with MongoDB auth and products").',
      codeSnippet: `Prompt: "create student management rest api"\nDatabase: MongoDB / PostgreSQL\nFramework: Express.js`
    },
    {
      id: 1,
      iconComponent: <Cpu className="w-5 h-5 stroke-[2.5]" />,
      badge: 'STEP 2 • GROQ AI ARCHITECTURE',
      title: 'Groq AI Engine Constructs Code',
      desc: 'Llama 3 plans architecture, writes REST controllers, designs Mongoose schemas, and configures routes.',
      codeSnippet: `// Auto Generated Routes\nrouter.get('/api/students', getStudents);\nrouter.post('/api/students', createStudent);\nexports.getStudents = async (req, res) => {...};`
    },
    {
      id: 2,
      iconComponent: <Terminal className="w-5 h-5 stroke-[2.5]" />,
      badge: 'STEP 3 • SANDBOX TESTING',
      title: 'Test Live Endpoints in Sandbox',
      desc: 'Execute real HTTP GET, POST, PUT, DELETE requests directly inside the integrated Playground API sandbox.',
      codeSnippet: `POST /api/students HTTP/1.1\nStatus: 201 Created (42ms)\nResponse: { "success": true, "id": "std_9823" }`
    },
    {
      id: 3,
      iconComponent: <FolderArchive className="w-5 h-5 stroke-[2.5]" />,
      badge: 'STEP 4 • ZIP EXPORT',
      title: 'Download Ready-to-Run Repository',
      desc: 'Export full backend repository into a clean ZIP package with package.json ready for npm start.',
      codeSnippet: `📁 student-api.zip\n ├── 📄 server.js\n ├── 📁 routes/\n ├── 📁 controllers/\n └── 📄 package.json`
    }
  ];

  return (
    <div className="min-h-screen bg-[#06090e] p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 1: TOTAL GENERATED APIS */}
        <TiltCard className="bg-[#0f141c] border border-slate-800/90 rounded-3xl p-6 space-y-4 shadow-xl hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 group cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between relative z-10">
            <span>TOTAL GENERATED APIS</span>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-emerald-400/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 group-hover:scale-110 group-hover:border-emerald-400 transition-all duration-300">
              <Code2 className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <span className="text-4xl font-black text-white tracking-tight">{totalRepos}</span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-wider uppercase">
              REPOS
            </span>
          </div>
        </TiltCard>

        {/* Card 2: TOTAL ZIP DOWNLOADS */}
        <TiltCard className="bg-[#0f141c] border border-slate-800/90 rounded-3xl p-6 space-y-4 shadow-xl hover:border-teal-500/50 hover:shadow-2xl hover:shadow-teal-500/10 group cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-teal-500/20 transition-all"></div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between relative z-10">
            <span>TOTAL ZIP DOWNLOADS</span>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500/20 via-cyan-500/15 to-emerald-400/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shadow-lg shadow-teal-500/20 group-hover:scale-110 group-hover:border-teal-400 transition-all duration-300">
              <FolderArchive className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <span className="text-4xl font-black text-white tracking-tight">{totalDownloads}</span>
            <span className="bg-teal-500/10 text-teal-300 border border-teal-500/30 text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-wider uppercase">
              TIMES
            </span>
          </div>
        </TiltCard>

        {/* Card 3: PLAYGROUND SANDBOX */}
        <TiltCard className="bg-[#0f141c] border border-slate-800/90 rounded-3xl p-6 space-y-4 shadow-xl hover:border-emerald-400/50 hover:shadow-2xl hover:shadow-emerald-400/10 group cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-400/20 transition-all"></div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between relative z-10">
            <span>PLAYGROUND SANDBOX</span>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-400/20 via-emerald-500/20 to-teal-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-400/20 group-hover:scale-110 group-hover:border-emerald-300 transition-all duration-300">
              <Zap className="w-5 h-5 fill-emerald-400/20 stroke-[2.5]" />
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <span className="text-4xl font-black text-white tracking-tight">Online</span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-wider uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              • READY
            </span>
          </div>
        </TiltCard>
      </div>

      {/* Interactive 3D Animated Motion API Workflow Guide */}
      <TiltCard className="bg-[#0f141c] border border-emerald-500/30 rounded-3xl p-8 md:p-10 relative overflow-hidden shadow-2xl space-y-8">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            HOW TO GENERATE YOUR REST API
          </h3>

          <button
            onClick={onNewGenerator}
            className="bg-[#00E676] hover:bg-[#00C853] text-black font-extrabold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Start Creating API
          </button>
        </div>

        {/* Interactive 3D Stage & 4-Step Interactive Workflow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-center">
          {/* Left Steps Switcher (col-span-5) */}
          <div className="lg:col-span-5 space-y-3">
            {workflowSteps.map((step) => {
              const isActive = activeStep === step.id;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border ${isActive
                      ? 'bg-[#06090e] border-emerald-500/60 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                      : 'bg-[#06090e]/50 border-slate-800/80 hover:border-slate-700 hover:bg-[#06090e]/80'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${isActive ? 'bg-gradient-to-tr from-emerald-500/25 via-teal-500/20 to-emerald-400/25 border border-emerald-500/50 text-emerald-400 shadow-md shadow-emerald-500/20' : 'bg-[#121620] border border-slate-800 text-slate-400'}`}>
                      {step.iconComponent}
                    </div>
                    <div className="space-y-1">
                      <span className={`text-[10px] font-black tracking-widest uppercase ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {step.badge}
                      </span>
                      <h4 className={`text-xs font-black ${isActive ? 'text-white' : 'text-slate-300'}`}>
                        {step.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Interactive 3D Code Screen (col-span-7) */}
          <div className="lg:col-span-7 h-full">
            <div className="bg-[#06090e] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 relative overflow-hidden group">
              <div className="h-10 border-b border-slate-800/80 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  <span className="text-xs font-mono font-bold text-slate-400 ml-2">
                    {workflowSteps[activeStep].badge}
                  </span>
                </div>

                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  ACTIVE DEMO
                </span>
              </div>

              {/* Active Code / Flow Visualization Box */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    {workflowSteps[activeStep].iconComponent}
                  </div>
                  <span>{workflowSteps[activeStep].title}</span>
                </div>

                <pre className="p-4 bg-[#090d13] border border-slate-800 rounded-2xl font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
                  {workflowSteps[activeStep].codeSnippet}
                </pre>
              </div>

              {/* Step Indicators */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  {workflowSteps.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => setActiveStep(step.id)}
                      className={`h-2 rounded-full transition-all ${activeStep === step.id ? 'w-8 bg-emerald-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
                        }`}
                    />
                  ))}
                </div>

                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Interactive 3D Stage • Move Mouse to Tilt
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10 pt-4 border-t border-slate-800/80">
          <TiltCard className="bg-[#06090e]/90 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl space-y-3 transition-all hover:shadow-lg hover:shadow-emerald-500/10 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-emerald-400/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-all">
              <Code2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">OpenAPI AI Architecture</h4>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              OpenAPI AI Engine designs clean modular routes, database models, and controllers in seconds.
            </p>
          </TiltCard>

          <TiltCard className="bg-[#06090e]/90 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl space-y-3 transition-all hover:shadow-lg hover:shadow-emerald-500/10 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500/20 via-cyan-500/15 to-emerald-400/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shadow-xl shadow-teal-500/20 group-hover:scale-110 transition-all">
              <FolderArchive className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Instant ZIP Downloads</h4>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Export complete ready-to-run Node.js + Express backend repositories directly as ZIP archives.
            </p>
          </TiltCard>

          <TiltCard className="bg-[#06090e]/90 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl space-y-3 transition-all hover:shadow-lg hover:shadow-emerald-500/10 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400/20 via-emerald-500/20 to-teal-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-400/20 group-hover:scale-110 transition-all">
              <Zap className="w-6 h-6 fill-emerald-400/20 stroke-[2.5]" />
            </div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Playground Live Sandbox</h4>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Test and execute generated REST API endpoints live in real time using the built-in sandbox tool.
            </p>
          </TiltCard>
        </div>
      </TiltCard>

      {/* YOUR GENERATED REPOSITORIES Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm font-black text-slate-200 tracking-wider uppercase flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/20">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span>YOUR GENERATED REPOSITORIES</span>
            {repoList.length > 0 && (
              <span className="bg-slate-800 text-slate-400 text-xs px-2.5 py-0.5 rounded-full font-bold ml-1">
                {repoList.length}
              </span>
            )}
          </h2>

          {repoList.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              >
                {selectedRepos.length === repoList.length ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>{selectedRepos.length === repoList.length ? 'Deselect All' : 'Select All'}</span>
              </button>

              {selectedRepos.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-bold px-3 py-1.5 rounded-lg transition-all animate-pulse"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Selected ({selectedRepos.length})</span>
                </button>
              )}

              {loading && <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />}
            </div>
          )}
        </div>

        {repoList.length === 0 ? (
          <div className="bg-[#0f141c] border border-slate-800/80 rounded-3xl p-8 text-center space-y-3">
            <p className="text-xs text-slate-400 font-medium">No generated repositories saved yet. Click "Start Creating API" above to generate your first REST API!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {repoList.map((repo, idx) => {
              const repoId = repo._id || repo.id || idx;
              const isSelected = selectedRepos.includes(repoId);
              return (
                <div
                  key={repoId}
                  className={`bg-[#0f141c] border rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl transition-all ${isSelected ? 'border-emerald-500/80 bg-emerald-950/10' : 'border-slate-800/90 hover:border-emerald-500/40'
                    }`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <button
                      onClick={() => toggleSelectRepo(repoId)}
                      className="mt-1 text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                      )}
                    </button>

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-extrabold text-lg text-white tracking-tight">
                          {repo.name || 'generated-api'}
                        </h3>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-3 py-1 rounded-md tracking-wider uppercase">
                          {repo.framework || 'NODE.JS + EXPRESS'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        {repo.description || 'REST API backend generated via OpenAPI Engine'}
                      </p>

                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 tracking-wider uppercase pt-1">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          {repo.generationTime || 'FAST GENERATION'}
                        </span>
                        <span>• DB: {repo.database || 'MONGODB'}</span>
                        <span>• DOWNLOADS: {repo.downloadsCount || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => onOpenPlayground(repoId)}
                      className="flex items-center gap-2 border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-white font-bold px-4 py-2 rounded-full text-xs tracking-wider uppercase transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      PLAYGROUND
                    </button>

                    <button
                      onClick={() => onDownloadZip(repoId)}
                      className="flex items-center gap-2 bg-[#00E676] hover:bg-[#00C853] text-black font-extrabold px-5 py-2 rounded-full text-xs tracking-wider uppercase transition-all shadow-md shadow-emerald-500/20"
                    >
                      <Download className="w-3.5 h-3.5 stroke-[3]" />
                      ZIP
                    </button>

                    <button
                      onClick={() => handleDeleteSingle(repoId)}
                      title="Delete Repository"
                      className="flex items-center justify-center border border-slate-800 hover:border-rose-500/50 text-slate-500 hover:text-rose-400 p-2.5 rounded-full transition-all hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

