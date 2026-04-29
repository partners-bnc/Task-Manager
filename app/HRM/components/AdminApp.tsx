'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminSidebar from './layout/AdminSidebar';
import { createClient } from '@/utils/supabase/client';

// We will import the actual views here once they are created
import AdminDashboard from './views/admin/AdminDashboard';
import PayoutsPayroll from './views/admin/PayoutsPayroll';
import EmployeeAnalytics from './views/admin/EmployeeAnalytics';
import RegularizationInbox from './views/admin/RegularizationInbox';
import HolidayManager from './views/admin/HolidayManager';
import LeaveManagement from './views/admin/LeaveManagement';
import EmployeeDirectoryWorkspace from './views/admin/EmployeeDirectoryWorkspace';
import OrganizationChart from './views/admin/OrganizationChart';
import ModuleAccessManager from './views/admin/ModuleAccessManager';
import AdminAttendance from './views/admin/AdminAttendance';
import Tickets from './views/Tickets';
import Expenses from './views/Expenses';
import { ShellSkeleton } from './ui/Skeleton';
import { HrmFeedbackProvider } from './ui/HrmFeedback';

export default function AdminApp() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [currentTab, setCurrentTab] = useState(requestedTab || 'admin-dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [admin, setAdmin] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({
    [requestedTab || 'admin-dashboard']: true,
  });

  useEffect(() => {
    let active = true;

    async function loadAdmin() {
      try {
        const response = await fetch('/HRM/api/admin/me', { method: 'GET' });
        const result = await response.json();

        if (!response.ok || !active) {
          return;
        }

        setAdmin(result.admin || null);
      } catch {
        if (active) {
          setAdmin(null);
        }
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    }

    loadAdmin();
    return () => {
      active = false;
    };
  }, []);

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
      console.error('Failed to sign out HR admin:', error);
    } finally {
      setAdmin(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const tabViews: Record<string, React.ReactNode> = {
    'admin-dashboard': <AdminDashboard admin={admin} setCurrentTab={setCurrentTab} setSelectedEmployeeId={setSelectedEmployeeId} />,
    'admin-employee-list': (
      <EmployeeDirectoryWorkspace
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        selectedEmployeeId={selectedEmployeeId}
        setSelectedEmployeeId={setSelectedEmployeeId}
      />
    ),
    'admin-payouts': <PayoutsPayroll />,
    'admin-analytics': <EmployeeAnalytics />,
    'admin-organization-chart': <OrganizationChart />,
    'admin-module-access': <ModuleAccessManager />,
    'admin-attendance': <AdminAttendance />,
    'admin-regularization': <RegularizationInbox />,
    'admin-tickets': <Tickets variant="admin" />,
    'admin-expenses': <Expenses variant="admin" />,
    'admin-leaves': <LeaveManagement />,
    'admin-holidays': <HolidayManager />,
    'admin-employee-profile': (
      <EmployeeDirectoryWorkspace
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        selectedEmployeeId={selectedEmployeeId}
        setSelectedEmployeeId={setSelectedEmployeeId}
      />
    ),
    'admin-add-employee': (
      <EmployeeDirectoryWorkspace
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        selectedEmployeeId={selectedEmployeeId}
        setSelectedEmployeeId={setSelectedEmployeeId}
      />
    ),
  };

  if (isBootstrapping) {
    return <ShellSkeleton />;
  }

  return (
    <HrmFeedbackProvider>
      <div className="flex min-h-screen bg-surface">
      <AdminSidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        admin={admin}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
      />
      
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'ml-24' : 'ml-64'}`}>
        <main className="flex-1 relative">
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
            <div className="flex items-center justify-center p-12">
              <p className="text-on-surface-variant text-lg">This view is under construction.</p>
            </div>
          ) : null}
        </main>
      </div>
      </div>
    </HrmFeedbackProvider>
  );
}
