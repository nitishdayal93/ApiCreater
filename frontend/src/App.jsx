import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Generator from './pages/Generator';
import Playground from './pages/Playground';
import AdminPortal from './pages/AdminPortal';
import Login from './pages/Login';
import Register from './pages/Register';
import { downloadProjectZip } from './utils/zipDownload';
import api from './services/api';

export default function App() {
  const [currentView, setCurrentView] = useState('generator');
  const [projects, setProjects] = useState([]);
  const [historyChats, setHistoryChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auto-fetch generated projects on load for Sidebar History
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await api.getProjects();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setProjects(data.data);
          const chats = data.data.map((p) => ({
            id: p._id || p.id,
            title: p.name || 'Generated API',
            project: p
          }));
          setHistoryChats(chats);
        }
      } catch (err) {
        console.error('Failed to load project history in sidebar', err);
      }
    };
    fetchHistory();
  }, []);

  // Called when user generates a new API project
  const handleProjectGenerated = (newProject) => {
    setProjects((prev) => [newProject, ...prev]);
    setActiveProject(newProject);
    setActiveChatId(newProject.id || newProject._id);

    // Add to sidebar history if not present
    const chatTitle = newProject.name || 'Generated API';
    setHistoryChats((prev) => {
      if (!prev.some(c => c.id === (newProject.id || newProject._id))) {
        return [{ id: newProject.id || newProject._id, title: chatTitle, project: newProject }, ...prev];
      }
      return prev;
    });
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    const found = projects.find((p) => (p._id || p.id) === id);
    if (found) {
      setActiveProject(found);
      setCurrentView('generator');
    } else {
      api.getProjectDetails(id)
        .then((res) => {
          if (res.success && res.data) {
            setActiveProject(res.data);
          }
        })
        .catch(() => { })
        .finally(() => {
          setCurrentView('generator');
        });
    }
  };

  const handleNewChat = () => {
    const newId = `new_${Date.now()}`;
    const newChat = { id: newId, title: 'New API Generator Session' };
    setHistoryChats((prev) => [newChat, ...prev]);
    setActiveChatId(newId);
    setActiveProject(null);
    setCurrentView('generator');
  };

  const handleDownloadZip = (repoId) => {
    const proj = projects.find((p) => (p._id || p.id) === repoId);
    if (proj && proj.files && proj.files.length > 0) {
      downloadProjectZip(proj.files, proj.name || 'generated-api', repoId);
    } else {
      downloadProjectZip([], 'generated-api', repoId);
    }
  };

  const handleOpenPlayground = (repoId) => {
    setCurrentView('playground');
  };

  const handleLogout = () => {
    setCurrentView('login');
  };

  return (
    <div className="min-h-screen bg-[#06090e] flex overflow-hidden font-sans antialiased text-slate-100 selection:bg-emerald-500 selection:text-black">
      {/* Left Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        historyChats={historyChats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 overflow-y-auto h-screen bg-[#06090e]">
        {currentView === 'dashboard' && (
          <Dashboard
            projects={projects}
            onNewGenerator={handleNewChat}
            onOpenPlayground={handleOpenPlayground}
            onDownloadZip={handleDownloadZip}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          />
        )}

        {currentView === 'generator' && (
          <Generator
            onProjectGenerated={handleProjectGenerated}
            activeProject={activeProject}
            activeChatId={activeChatId}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          />
        )}

        {currentView === 'playground' && (
          <Playground projects={projects} onOpenMobileMenu={() => setIsMobileSidebarOpen(true)} />
        )}

        {currentView === 'admin' && (
          <AdminPortal onOpenMobileMenu={() => setIsMobileSidebarOpen(true)} />
        )}

        {currentView === 'login' && (
          <Login onNavigate={(view) => setCurrentView(view)} />
        )}

        {currentView === 'register' && (
          <Register onNavigate={(view) => setCurrentView(view)} />
        )}
      </main>
    </div>
  );
}
