'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminSidebar from './layout/AdminSidebar';
import { createClient } from '@/utils/supabase/client';

// We will import the actual views here once they are created
import AdminDashboard from './views/admin/AdminDashboard';
import EmployeeAnalytics from './views/admin/EmployeeAnalytics';
import PayoutsPayroll from './views/admin/PayoutsPayroll';
import RegularizationInbox from './views/admin/RegularizationInbox';
import HolidayManager from './views/admin/HolidayManager';
import LeaveManagement from './views/admin/LeaveManagement';
import CertificateGenerator from './views/admin/CertificateGenerator';
import EmployeeDirectoryWorkspace from './views/admin/EmployeeDirectoryWorkspace';
import EmployeeOnboarding from './views/admin/EmployeeOnboarding';
import OrganizationChart from './views/admin/OrganizationChart';
import ModuleAccessManager from './views/admin/ModuleAccessManager';
import AdminAttendance from './views/admin/AdminAttendance';
import Tickets from './views/Tickets';
import Expenses from './views/Expenses';
import PolicyManualManager from './views/admin/PolicyManualManager';
import NoticeManager from './views/admin/NoticeManager';
import { ShellSkeleton } from './ui/Skeleton';
import { HrmFeedbackProvider } from './ui/HrmFeedback';
import CalendarView from '@/app/Taskmanager/components/CalendarView';
import DailyWorkLogs from '@/app/Taskmanager/components/DailyWorkLogs';

export default function AdminApp() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const normalizedRequestedTab = requestedTab || 'admin-dashboard';
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
        const normalized = reqTab || 'admin-dashboard';
        setCurrentTabState(normalized);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [pendingOnboardingRequestId, setPendingOnboardingRequestId] = useState<string | null>(null);
  const [admin, setAdmin] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sidebarRequestCounts, setSidebarRequestCounts] = useState<Record<string, number>>({});
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({
    [normalizedRequestedTab]: true,
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

  useEffect(() => {
    let active = true;

    async function loadSidebarRequestCounts() {
      try {
        const [
          leavesResponse,
          regularizationResponse,
          ticketsResponse,
          expensesResponse,
          onboardingResponse,
        ] = await Promise.all([
          fetch('/HRM/api/admin/leaves', { method: 'GET' }),
          fetch('/HRM/api/admin/regularization', { method: 'GET' }),
          fetch('/HRM/api/tickets', { method: 'GET' }),
          fetch('/HRM/api/expenses/review', { method: 'GET' }),
          fetch('/HRM/api/admin/onboarding', { method: 'GET' }),
        ]);

        const [
          leavesResult,
          regularizationResult,
          ticketsResult,
          expensesResult,
          onboardingResult,
        ] = await Promise.all([
          leavesResponse.json().catch(() => ({})),
          regularizationResponse.json().catch(() => ({})),
          ticketsResponse.json().catch(() => ({})),
          expensesResponse.json().catch(() => ({})),
          onboardingResponse.json().catch(() => ({})),
        ]);

        if (!active) return;

        setSidebarRequestCounts({
          'admin-leaves': leavesResponse.ok ? (leavesResult.pending || []).length : 0,
          'admin-regularization': regularizationResponse.ok ? (regularizationResult.pendingForMe || []).length : 0,
          'admin-tickets': ticketsResponse.ok ? (ticketsResult.assignedTickets || []).length : 0,
          'admin-expenses': expensesResponse.ok ? (expensesResult.pendingReview || []).length : 0,
          'admin-onboarding': onboardingResponse.ok
            ? (onboardingResult.requests || []).filter((item: { status?: string | null }) => item?.status === 'submitted').length
            : 0,
        });
      } catch {
        if (active) {
          setSidebarRequestCounts({});
        }
      }
    }

    function handleRefreshEvent() {
      loadSidebarRequestCounts();
    }

    loadSidebarRequestCounts();
    const intervalId = window.setInterval(loadSidebarRequestCounts, 30000);
    window.addEventListener('focus', handleRefreshEvent);
    window.addEventListener('hrm-admin-sidebar-counts-refresh', handleRefreshEvent);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleRefreshEvent);
      window.removeEventListener('hrm-admin-sidebar-counts-refresh', handleRefreshEvent);
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
    'admin-analytics': <EmployeeAnalytics />,
    'admin-employee-list': (
      <EmployeeDirectoryWorkspace
        setCurrentTab={setCurrentTab}
        selectedEmployeeId={selectedEmployeeId}
        setSelectedEmployeeId={setSelectedEmployeeId}
        setOnboardingRequestId={setPendingOnboardingRequestId}
      />
    ),
    'admin-certificates': <CertificateGenerator />,
    'admin-onboarding': (
      <EmployeeOnboarding
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onboardingRequestId={pendingOnboardingRequestId}
        setOnboardingRequestId={setPendingOnboardingRequestId}
        onConvertOnboarding={(requestId) => {
          setPendingOnboardingRequestId(requestId);
          setCurrentTab('admin-add-employee');
        }}
      />
    ),
    'admin-payouts': <PayoutsPayroll />,
    'admin-calendar': <CalendarView />,
    'admin-organization-chart': <OrganizationChart />,
    'admin-module-access': <ModuleAccessManager />,
    'admin-attendance': <AdminAttendance />,
    'admin-work-logs': <DailyWorkLogs />,
    'admin-policy-manual': <PolicyManualManager />,
    'admin-notices': <NoticeManager />,
    'admin-regularization': <RegularizationInbox />,
    'admin-tickets': <Tickets variant="admin" />,
    'admin-expenses': <Expenses variant="admin" />,
    'admin-leaves': <LeaveManagement />,
    'admin-holidays': <HolidayManager />,
    'admin-employee-profile': (
      <EmployeeDirectoryWorkspace
        setCurrentTab={setCurrentTab}
        selectedEmployeeId={selectedEmployeeId}
        setSelectedEmployeeId={setSelectedEmployeeId}
        setOnboardingRequestId={setPendingOnboardingRequestId}
      />
    ),
    'admin-add-employee': (
      <EmployeeOnboarding
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onboardingRequestId={pendingOnboardingRequestId}
        setOnboardingRequestId={setPendingOnboardingRequestId}
        onConvertOnboarding={(requestId) => {
          setPendingOnboardingRequestId(requestId);
          setCurrentTab('admin-add-employee');
        }}
      />
    ),
  };

  if (isBootstrapping) {
    return <ShellSkeleton />;
  }

  const currentTabLabel =
    currentTab === 'admin-dashboard'
      ? 'Admin Dashboard'
      : currentTab === 'admin-calendar'
      ? 'Calendar'
      : currentTab === 'admin-analytics'
      ? 'Analytics'
      : currentTab === 'admin-employee-list'
      ? 'Employee Directory'
      : currentTab === 'admin-onboarding'
      ? 'Employee Onboarding'
      : currentTab === 'admin-add-employee'
      ? 'Employee Onboarding'
      : currentTab === 'admin-payouts'
      ? 'Payouts & Payroll'
      : currentTab === 'admin-organization-chart'
      ? 'Organization Chart'
      : currentTab === 'admin-module-access'
      ? 'Module Access'
      : currentTab === 'admin-attendance'
      ? 'Attendance'
      : currentTab === 'admin-work-logs'
      ? 'Daily Work Log'
      : currentTab === 'admin-policy-manual'
      ? 'Policy Manual'
      : currentTab === 'admin-notices'
      ? 'Notice Board'
      : currentTab === 'admin-regularization'
      ? 'Regularization'
      : currentTab === 'admin-tickets'
      ? 'Tickets'
      : currentTab === 'admin-expenses'
      ? 'Expense Review'
      : currentTab === 'admin-leaves'
      ? 'Leave'
      : currentTab === 'admin-holidays'
      ? 'Holiday'
      : 'HR Admin';

  return (
    <HrmFeedbackProvider>
      <div className="flex min-h-screen bg-surface">
      <AdminSidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        admin={admin}
        requestCounts={sidebarRequestCounts}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      
      <div className={`flex-1 flex min-w-0 flex-col transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-24' : 'md:ml-64'}`}>
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-outline-variant/10 bg-surface-container-lowest/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-outline-variant/15 bg-white text-on-surface shadow-sm"
            aria-label="Open admin navigation"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
          <div className="min-w-0 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">HR Admin</p>
            <p className="truncate text-sm font-bold text-on-surface">{currentTabLabel}</p>
          </div>
          <div className="w-11" />
        </div>
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
