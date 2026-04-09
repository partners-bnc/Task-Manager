'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from './layout/Sidebar';
import TopBar from './layout/TopBar';
import Dashboard from './views/Dashboard';
import Profile from './views/Profile';
import Leave from './views/Leave';
import Attendance from './views/Attendance';
import RegularizeAttendance from './views/RegularizeAttendance';
import { createClient } from '@/utils/supabase/client';

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [employee, setEmployee] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadEmployee() {
      try {
        const response = await fetch('/HRM/api/employee/me', { method: 'GET' });
        const result = await response.json();

        if (!response.ok || !active) {
          return;
        }

        setEmployee(result.employee || null);
      } catch {
        if (active) {
          setEmployee(null);
        }
      }
    }

    loadEmployee();

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to sign out employee:', error);
    } finally {
      setEmployee(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'home':
        return <Dashboard employee={employee} setCurrentTab={setCurrentTab} onLogout={handleLogout} isLoggingOut={isLoggingOut} />;
      case 'attendance':
        return <Attendance onOpenRegularizeAttendance={() => setCurrentTab('regularize-attendance')} />;
      case 'regularize-attendance':
        return <RegularizeAttendance />;
      case 'leave':
        return <Leave />;
      case 'profile':
        return <Profile employee={employee} />;
      default:
        return (
          <div className="flex items-center justify-center h-[60vh]">
            <p className="text-on-surface-variant">This view is under construction.</p>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (currentTab) {
      case 'home': return '';
      case 'attendance': return 'Attendance';
      case 'regularize-attendance': return 'Regularization';
      case 'leave': return 'Leave Management';
      case 'profile': return 'Profile';
      default: return 'Sanctuary HR';
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        employee={employee}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />
      
      <div className="flex-1 flex flex-col ml-64">
        <TopBar title={getTitle()} />
        
        <main className="flex-1 relative px-5 pt-4 pb-8 pr-8 lg:px-6 lg:pr-10 lg:pt-5">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

