'use client';

import { useEffect, useState } from 'react';
import { DataProvider, useData } from './DataContext';
import { ModuleAccessGate } from '@/app/components-homepage/ModuleAccessGate';
import Login from './Login';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import ManageTasks from './ManageTasks';
import CreateTask from './CreateTask';
import TeamMembers from './TeamMembers';
import Todos from './Todos';
import AdminSettings from './AdminSettings';
import EmployeeSettings from './EmployeeSettings';
import ChatPanel from './ChatPanel';
import TaskTickets from './TaskTickets';
import { USERS } from './data';
import { WorkspaceShellLoader } from '@/app/components-homepage/ExperienceLoaders';

function AppContent({ initialView = 'dashboard', mode = 'employee' }) {
  const { user, loading, isAdminMode } = useData();
  const safeInitialView = initialView;
  const [currentView, setCurrentView] = useState(safeInitialView);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isSupportUser = !!user?.role && String(user.role).toLowerCase() === 'support';

  useEffect(() => {
    if (isSupportUser && currentView !== 'task-tickets') {
      setCurrentView('task-tickets');
    }
  }, [isSupportUser, currentView]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view');
      if (urlView) {
        setCurrentView(urlView);
      }
    }
  }, []);

  if (loading) {
    return (
      <WorkspaceShellLoader
        title="Loading Task Manager"
        message="Bringing in your workspace, team access, tasks, and latest updates."
      />
    );
  }

  if (!user) {
    return <Login onSuccess={() => setCurrentView('dashboard')} />;
  }

  const renderView = () => {
    if (isSupportUser) {
      return <TaskTickets />;
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} />;
      case 'tasks':
        return <ManageTasks />;
      case 'todos':
        return isAdminMode ? <Dashboard onNavigate={setCurrentView} /> : <Todos />;
      case 'create-task':
        return <CreateTask onCancel={() => setCurrentView('tasks')} />;
      case 'team':
        return <TeamMembers />;
      case 'settings':
        return isAdminMode ? <AdminSettings /> : <EmployeeSettings />;
      case 'chat':
        return <ChatPanel />;
      case 'task-tickets':
        return <TaskTickets />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
          aria-label="Open Task Manager navigation"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>
        <div className="min-w-0 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Task Manager</p>
          <p className="truncate text-sm font-bold text-slate-900">
            {currentView === 'dashboard'
              ? 'Dashboard'
              : currentView === 'tasks'
              ? 'Manage Tasks'
              : currentView === 'todos'
              ? 'Todos'
              : currentView === 'create-task'
              ? 'Create Task'
              : currentView === 'team'
              ? 'Team Members'
              : currentView === 'chat'
              ? 'Chat'
              : currentView === 'task-tickets'
              ? 'Task Tickets'
              : 'Settings'}
          </p>
        </div>
        <div className="w-11" />
      </div>
      <main className={`ml-0 min-h-screen ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-56'} transition-all duration-200`}>
        {renderView()}
      </main>
    </div>
  );
}

export default function DashboardApp({ startLoggedIn = false, initialView = 'dashboard', mode = 'employee' }) {
  const initialUser = startLoggedIn
    ? {
        id: 'admin-local',
        name: 'Admin User',
        email: 'admin@taskflow.io',
        role: 'Admin',
        avatar: USERS[0]?.avatar || '',
      }
    : null;

  return (
    <ModuleAccessGate moduleKey="taskManager" moduleLabel="Task Manager">
      <DataProvider initialUser={initialUser} mode={mode}>
        <AppContent initialView={initialView} mode={mode} />
      </DataProvider>
    </ModuleAccessGate>
  );
}
