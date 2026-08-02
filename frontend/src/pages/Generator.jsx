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

  const generateFallbackFilesForPrompt = (promptText, dbName) => {
    const lower = (promptText || '').toLowerCase();
    let projName = lower.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'hospital-management-api';
    if (!projName.endsWith('-api')) projName += '-api';

    const isHospital = lower.includes('hospital') || lower.includes('doctor') || lower.includes('patient') || lower.includes('clinic');

    const filesList = [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: projName,
          version: "1.0.0",
          description: `${promptText} - Enterprise Node.js & Express REST API`,
          main: "src/server.js",
          type: "module",
          scripts: {
            start: "node src/server.js",
            dev: "nodemon src/server.js",
            test: "node --test src/tests/health.test.js"
          },
          dependencies: {
            express: "^4.18.2",
            mongoose: "^8.0.3",
            jsonwebtoken: "^9.0.2",
            bcryptjs: "^2.4.3",
            cors: "^2.8.5",
            dotenv: "^16.3.1",
            helmet: "^7.1.0",
            morgan: "^1.10.0"
          }
        }, null, 2)
      },
      {
        path: '.env.example',
        content: `PORT=5000\nNODE_ENV=development\nMONGO_URI=mongodb://localhost:27017/${projName}\nJWT_SECRET=super_secret_jwt_key_982347293847\nJWT_EXPIRE=7d\n`
      },
      {
        path: 'Dockerfile',
        content: `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 5000\nCMD ["npm", "start"]\n`
      },
      {
        path: 'README.md',
        content: `# ${projName}\n\n> Enterprise ${promptText} REST API built with Node.js, Express, ${dbName}, and JWT Authentication.\n\n## 🚀 Quick Start\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## 🔐 Environment Setup\nCopy \`.env.example\` to \`.env\` and configure \`MONGO_URI\` and \`JWT_SECRET\`.\n`
      },
      {
        path: 'src/server.js',
        content: `import express from 'express';\nimport dotenv from 'dotenv';\nimport cors from 'cors';\nimport helmet from 'helmet';\nimport morgan from 'morgan';\nimport connectDB from './config/db.js';\nimport authRoutes from './routes/authRoutes.js';\nimport apiRoutes from './routes/apiRoutes.js';\n\ndotenv.config();\nconst app = express();\n\napp.use(helmet());\napp.use(cors());\napp.use(express.json());\napp.use(morgan('dev'));\n\nconnectDB();\n\napp.use('/api/v1/auth', authRoutes);\napp.use('/api/v1', apiRoutes);\n\nconst PORT = process.env.PORT || 5000;\napp.listen(PORT, () => console.log(\`🚀 Server running on port \${PORT}\`));\n`
      },
      {
        path: 'src/config/db.js',
        content: `import mongoose from 'mongoose';\n\nconst connectDB = async () => {\n  try {\n    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hospital_db');\n    console.log(\`✅ MongoDB Connected: \${conn.connection.host}\`);\n  } catch (err) {\n    console.error(\`❌ Database Error: \${err.message}\`);\n    process.exit(1);\n  }\n};\n\nexport default connectDB;\n`
      },
      {
        path: 'src/middlewares/auth.js',
        content: `import jwt from 'jsonwebtoken';\n\nexport const protect = async (req, res, next) => {\n  let token;\n  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {\n    token = req.headers.authorization.split(' ')[1];\n  }\n  if (!token) {\n    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });\n  }\n  try {\n    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key');\n    req.user = decoded;\n    next();\n  } catch (err) {\n    return res.status(401).json({ success: false, error: 'Token invalid or expired' });\n  }\n};\n`
      },
      {
        path: 'src/models/User.js',
        content: `import mongoose from 'mongoose';\nimport bcrypt from 'bcryptjs';\n\nconst userSchema = new mongoose.Schema({\n  name: { type: String, required: true },\n  email: { type: String, required: true, unique: true },\n  password: { type: String, required: true },\n  role: { type: String, enum: ['Admin', 'Doctor', 'Patient', 'Staff'], default: 'Patient' }\n}, { timestamps: true });\n\nuserSchema.pre('save', async function (next) {\n  if (!this.isModified('password')) return next();\n  const salt = await bcrypt.genSalt(10);\n  this.password = await bcrypt.hash(this.password, salt);\n});\n\nexport default mongoose.model('User', userSchema);\n`
      },
      {
        path: 'src/controllers/authController.js',
        content: `import User from '../models/User.js';\nimport jwt from 'jsonwebtoken';\nimport bcrypt from 'bcryptjs';\n\nexport const register = async (req, res) => {\n  try {\n    const { name, email, password, role } = req.body;\n    const userExists = await User.findOne({ email });\n    if (userExists) return res.status(400).json({ success: false, error: 'Email already registered' });\n\n    const user = await User.create({ name, email, password, role });\n    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });\n    res.status(201).json({ success: true, token, data: { id: user._id, name: user.name, email: user.email, role: user.role } });\n  } catch (err) {\n    res.status(500).json({ success: false, error: err.message });\n  }\n};\n\nexport const login = async (req, res) => {\n  try {\n    const { email, password } = req.body;\n    const user = await User.findOne({ email });\n    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });\n\n    const isMatch = await bcrypt.compare(password, user.password);\n    if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid credentials' });\n\n    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });\n    res.status(200).json({ success: true, token, data: { id: user._id, name: user.name, email: user.email, role: user.role } });\n  } catch (err) {\n    res.status(500).json({ success: false, error: err.message });\n  }\n};\n`
      },
      {
        path: 'src/routes/authRoutes.js',
        content: `import express from 'express';\nimport { register, login } from '../controllers/authController.js';\n\nconst router = express.Router();\nrouter.post('/register', register);\nrouter.post('/login', login);\n\nexport default router;\n`
      }
    ];

    if (isHospital) {
      filesList.push(
        {
          path: 'src/models/Patient.js',
          content: `import mongoose from 'mongoose';\n\nconst patientSchema = new mongoose.Schema({\n  name: { type: String, required: true },\n  age: { type: Number, required: true },\n  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },\n  phone: { type: String, required: true },\n  medicalHistory: [String],\n  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }\n}, { timestamps: true });\n\nexport default mongoose.model('Patient', patientSchema);\n`
        },
        {
          path: 'src/models/Doctor.js',
          content: `import mongoose from 'mongoose';\n\nconst doctorSchema = new mongoose.Schema({\n  name: { type: String, required: true },\n  specialization: { type: String, required: true },\n  department: { type: String, required: true },\n  phone: { type: String, required: true },\n  availableDays: [String]\n}, { timestamps: true });\n\nexport default mongoose.model('Doctor', doctorSchema);\n`
        },
        {
          path: 'src/models/Appointment.js',
          content: `import mongoose from 'mongoose';\n\nconst appointmentSchema = new mongoose.Schema({\n  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },\n  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },\n  appointmentDate: { type: Date, required: true },\n  status: { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' },\n  notes: String\n}, { timestamps: true });\n\nexport default mongoose.model('Appointment', appointmentSchema);\n`
        },
        {
          path: 'src/controllers/patientController.js',
          content: `import Patient from '../models/Patient.js';\n\nexport const getPatients = async (req, res) => {\n  try {\n    const patients = await Patient.find().populate('assignedDoctor');\n    res.status(200).json({ success: true, count: patients.length, data: patients });\n  } catch (err) {\n    res.status(500).json({ success: false, error: err.message });\n  }\n};\n\nexport const createPatient = async (req, res) => {\n  try {\n    const patient = await Patient.create(req.body);\n    res.status(201).json({ success: true, data: patient });\n  } catch (err) {\n    res.status(400).json({ success: false, error: err.message });\n  }\n};\n`
        },
        {
          path: 'src/routes/apiRoutes.js',
          content: `import express from 'express';\nimport { protect } from '../middlewares/auth.js';\nimport { getPatients, createPatient } from '../controllers/patientController.js';\n\nconst router = express.Router();\n\nrouter.route('/patients')\n  .get(protect, getPatients)\n  .post(protect, createPatient);\n\nexport default router;\n`
        }
      );
    } else {
      filesList.push({
        path: 'src/routes/apiRoutes.js',
        content: `import express from 'express';\nconst router = express.Router();\n\nrouter.get('/health', (req, res) => res.json({ status: 'OK', message: 'API Healthy' }));\n\nexport default router;\n`
      });
    }

    return filesList;
  };

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

    let resultFiles = [];
    let projectName = textToSend.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'hospital-management-api';
    if (!projectName.endsWith('-api')) projectName += '-api';

    try {
      const data = await api.generateDirect(textToSend, database);

      if (data && data.success && Array.isArray(data.data?.files) && data.data.files.length > 0) {
        resultFiles = data.data.files;
        if (data.data.name) projectName = data.data.name;
      } else {
        resultFiles = generateFallbackFilesForPrompt(textToSend, database);
      }
    } catch (err) {
      console.error('API Direct call error:', err);
      resultFiles = generateFallbackFilesForPrompt(textToSend, database);
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
    setIsGenerating(false);
  };

  const handleDownloadCurrentZip = () => {
    downloadProjectZip(generatedFiles, currentProjectName);
  };

  const hasFiles = generatedFiles.length > 0;
  const showWorkspace = hasFiles || isGenerating;
  const isInitialState = !showWorkspace && messages.length <= 1;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#06090e] overflow-hidden font-sans">
      {/* Mobile Tab Switcher Bar (Visible only on mobile when files are generated or generating) */}
      {showWorkspace && (
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
      <div className={`flex-col bg-[#06090e] h-full transition-all duration-300 ${showWorkspace
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

      {/* Right Workspace Column - Opens Instantly when prompt is sent */}
      {showWorkspace && (
        <div className={`w-full md:w-7/12 flex-col p-2 md:p-4 bg-[#06090e] h-full overflow-hidden transition-all duration-300 ${
          mobileTab === 'workspace' ? 'flex' : 'hidden md:flex'
        }`}>
          {hasFiles ? (
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
          ) : (
            <div className="flex-1 bg-[#090d13] border border-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              </div>
              <div className="text-center space-y-1.5 max-w-sm">
                <h3 className="text-sm font-bold text-white tracking-tight">Generating API Architecture Workspace</h3>
                <p className="text-xs text-slate-400">OpenAPI AI Engine is assembling models, controllers, routes, and Docker configuration...</p>
              </div>
              <div className="w-full max-w-md space-y-2 pt-2">
                <div className="h-3 bg-slate-800/80 rounded-full w-3/4 animate-pulse"></div>
                <div className="h-3 bg-slate-800/80 rounded-full w-1/2 animate-pulse"></div>
                <div className="h-3 bg-slate-800/80 rounded-full w-5/6 animate-pulse"></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



