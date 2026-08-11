'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from './layout/Sidebar';
import Dashboard from './views/Dashboard';
import Profile from './views/Profile';
import Leave from './views/Leave';
import Attendance from './views/Attendance';
import RegularizeAttendance from './views/RegularizeAttendance';
import TeamRegularization from './views/TeamRegularization';
import Salary from './views/Salary';
import Tickets from './views/Tickets';
import Expenses from './views/Expenses';
import OrganizationChart from './views/admin/OrganizationChart';
import PolicyManual from './views/PolicyManual';
import { ShellSkeleton } from './ui/Skeleton';
import { HrmFeedbackProvider } from './ui/HrmFeedback';
import { createClient } from '@/utils/supabase/client';
import CalendarView from '@/app/Taskmanager/components/CalendarView';
import MyDailyLog from './views/MyDailyLog';
import TeamDailyLog from './views/TeamDailyLog';

export default function App() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const normalizedRequestedTab = requestedTab || 'home';
  const [currentTab, setCurrentTabState] = useState(normalizedRequestedTab);

  const setCurrentTab = (tab: string) => {
    setCurrentTabState(tab);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `?tab=${tab}`);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const reqTab = params.get('tab');
        const normalized = reqTab || 'home';
        setCurrentTabState(normalized);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const [employee, setEmployee] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ [normalizedRequestedTab]: true });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    }

    loadEmployee();

    return () => {
      active = false;
    };
  }, []);

  const refreshEmployee = async () => {
    const response = await fetch('/HRM/api/employee/me', { method: 'GET' });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to refresh employee profile');
    }

    setEmployee(result.employee || null);
    return result.employee || null;
  };

  useEffect(() => {
    setVisitedTabs((current) => (current[currentTab] ? current : { ...current, [currentTab]: true }));
  }, [currentTab]);

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

  const tabViews: Record<string, React.ReactNode> = {
    home: <Dashboard employee={employee} setCurrentTab={setCurrentTab} onLogout={handleLogout} isLoggingOut={isLoggingOut} />,
    attendance: <Attendance onOpenRegularizeAttendance={() => setCurrentTab('regularize-attendance')} />,
    'regularize-attendance': <RegularizeAttendance />,
    'team-regularization': <TeamRegularization />,
    'policy-manual': <PolicyManual />,
    tickets: <Tickets variant="employee" />,
    expenses: <Expenses variant="employee" />,
    'organization-chart': <OrganizationChart apiPath="/HRM/api/employee/organization-chart" />,
    leave: <Leave />,
    calendar: <CalendarView />,
    'my-daily-log': <MyDailyLog />,
    'team-daily-log': <TeamDailyLog />,
    salary: <Salary employee={employee} />,
    profile: <Profile employee={employee} onEmployeeChange={setEmployee} onRefreshEmployee={refreshEmployee} />,
  };

  if (isBootstrapping) {
    return <ShellSkeleton />;
  }

  const currentTabLabel =
    currentTab === 'home'
      ? 'Home'
      : currentTab === 'calendar'
      ? 'Calendar'
      : currentTab === 'attendance'
      ? 'Attendance'
      : currentTab === 'regularize-attendance'
      ? 'Regularization'
      : currentTab === 'team-regularization'
      ? 'Team Regularization'
      : currentTab === 'policy-manual'
      ? 'Policy Manual'
      : currentTab === 'tickets'
      ? 'Tickets & Requests'
      : currentTab === 'expenses'
      ? 'Expense Claims'
      : currentTab === 'organization-chart'
      ? 'Organization Chart'
      : currentTab === 'leave'
      ? 'Leave Management'
      : currentTab === 'salary'
      ? 'Payroll'
      : currentTab === 'my-daily-log'
      ? 'My Daily Log'
      : currentTab === 'team-daily-log'
      ? 'Team Daily Log'
      : currentTab === 'profile'
      ? 'My Profile'
      : 'Workspace';

  return (
    <HrmFeedbackProvider>
      <div className="flex min-h-screen bg-surface">
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        employee={employee}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      
      <div className="flex-1 flex min-w-0 flex-col md:ml-64">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-outline-variant/10 bg-surface-container-lowest/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-outline-variant/15 bg-white text-on-surface shadow-sm"
            aria-label="Open navigation"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
          <div className="min-w-0 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">HRM Employee</p>
            <p className="truncate text-sm font-bold text-on-surface">{currentTabLabel}</p>
          </div>
          <div className="w-11" />
        </div>

        <main
          className={`flex-1 relative ${
            currentTab === 'organization-chart'
              ? 'px-0 py-0 sm:py-4'
              : 'px-3 py-4 pb-8 sm:px-4 sm:pt-5 lg:px-6 lg:pb-8'
          }`}
        >
          {Object.entries(tabViews).map(([tabId, view]) => {
            if (!visitedTabs[tabId]) {
              return null;
            }

            return (
              <div key={tabId} className={currentTab === tabId ? 'block' : 'hidden'}>
                {view}
              </div>
            );
          })}
          {!tabViews[currentTab] ? (
            <div className="flex items-center justify-center h-[60vh]">
              <p className="text-on-surface-variant">This view is under construction.</p>
            </div>
          ) : null}
        </main>
      </div>
      </div>
    </HrmFeedbackProvider>
  );
}
