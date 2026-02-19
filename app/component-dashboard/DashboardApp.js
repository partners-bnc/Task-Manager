'use client';

import { useState } from 'react';
import { DataProvider, useData } from './DataContext';
import Login from './Login';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import ManageTasks from './ManageTasks';
import CreateTask from './CreateTask';
import TeamMembers from './TeamMembers';
import Todos from './Todos';
import AdminSettings from './AdminSettings';
import { USERS } from './data';

function AppContent({ initialView = 'dashboard', mode = 'employee' }) {
  const { user, loading, isAdminMode } = useData();
  const safeInitialView = initialView;
  const [currentView, setCurrentView] = useState(safeInitialView);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center text-slate-500'>
        Loading workspace...
      </div>
    );
  }

  if (!user) {
    return <Login onSuccess={() => setCurrentView('dashboard')} />;
  }

  const renderView = () => {
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
        return isAdminMode ? <AdminSettings /> : <Dashboard onNavigate={setCurrentView} />;
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
      />
      <main className={`ml-0 min-h-screen ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
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
    <DataProvider initialUser={initialUser} mode={mode}>
      <AppContent initialView={initialView} mode={mode} />
    </DataProvider>
  );
}
