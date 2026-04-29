'use client';

import React from 'react';
import Link from 'next/link';

interface AdminSidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => Promise<void> | void;
  isLoggingOut?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  admin?: {
    name?: string;
    designation?: string;
    avatar?: string;
  } | null;
}

export default function AdminSidebar({
  currentTab,
  setCurrentTab,
  admin,
  onLogout,
  isLoggingOut = false,
  isCollapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) {
  const navItems = [
    { id: 'admin-dashboard', label: 'Admin Dashboard', icon: 'admin_panel_settings' },
    { id: 'admin-employee-list', label: 'Employee Directory', icon: 'groups' },
    { id: 'admin-module-access', label: 'Module Access', icon: 'verified_user' },
    { id: 'admin-organization-chart', label: 'Organization Chart', icon: 'account_tree' },
    { id: 'admin-attendance', label: 'Attendance', icon: 'calendar_clock' },
    { id: 'admin-holidays', label: 'Holiday', icon: 'calendar_month' },
    { id: 'admin-leaves', label: 'Leave', icon: 'event_busy' },
    { id: 'admin-regularization', label: 'Regularization', icon: 'fact_check' },
    { id: 'admin-tickets', label: 'Tickets', icon: 'support_agent' },
    { id: 'admin-expenses', label: 'Expense Review', icon: 'receipt_long' },
    { id: 'admin-payouts', label: 'Payouts & Payroll', icon: 'account_balance_wallet' },
    { id: 'admin-analytics', label: 'Analytics', icon: 'insights' },
  ];

  return (
    <aside
      className={`subtle-scrollbar fixed left-0 top-0 z-50 flex h-screen flex-col overflow-y-auto border-r border-outline-variant/15 bg-[#EEF2F5] py-5 transition-all duration-300 ${
        isCollapsed ? 'w-24' : 'w-64'
      }`}
    >
      <div className={`mb-8 ${isCollapsed ? 'px-3' : 'px-5'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
          {!isCollapsed ? (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pl-9">
              <p className="truncate font-headline text-xl font-extrabold tracking-tight text-on-surface">
                HR Admin
              </p>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C9D5E1] bg-white text-[#5B6776] shadow-sm transition hover:border-[#B8C6D6] hover:text-primary"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
            </div>
          ) : null}
          {isCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C9D5E1] bg-white text-[#5B6776] shadow-sm transition hover:border-[#B8C6D6] hover:text-primary"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          ) : null}
        </div>
      </div>

      <nav className="flex-grow space-y-2 pr-3">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center transition-colors ${
                isActive
                  ? 'rounded-r-2xl border-y border-r border-outline-variant/10 bg-surface-container-lowest font-bold text-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-lowest/50 hover:text-primary'
              } ${isCollapsed ? 'justify-center px-3 py-3.5' : 'gap-3 px-5 py-3'} ${isActive ? '' : 'rounded-r-2xl'}`}
              title={isCollapsed ? item.label : undefined}
            >
              <span
                className="material-symbols-outlined shrink-0"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              {!isCollapsed ? (
                <span
                  className={`min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left font-body text-sm ${
                    isActive ? 'font-bold' : 'font-medium'
                  }`}
                >
                  {item.label}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t border-outline-variant/10 pt-5 pr-3">
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className={`w-full flex items-center text-on-surface-variant transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 ${
            isCollapsed ? 'justify-center rounded-r-2xl px-3 py-3' : 'gap-3 rounded-r-2xl px-5 py-3 hover:bg-surface-container-lowest/50'
          }`}
          title={isCollapsed ? (isLoggingOut ? 'Logging Out...' : 'Log Out') : undefined}
        >
          <span className="material-symbols-outlined">logout</span>
          {!isCollapsed ? (
            <span className="font-body text-sm font-medium">{isLoggingOut ? 'Logging Out...' : 'Log Out'}</span>
          ) : null}
        </button>
        <Link
          href="/"
          className={`w-full flex items-center text-on-surface-variant transition-colors hover:text-primary ${
            isCollapsed ? 'justify-center rounded-r-2xl px-3 py-3' : 'gap-3 rounded-r-2xl px-5 py-3 hover:bg-surface-container-lowest/50'
          }`}
          title={isCollapsed ? 'Home Page' : undefined}
        >
          <span className="material-symbols-outlined">home</span>
          {!isCollapsed ? (
            <span className="font-body text-sm font-medium">Home Page</span>
          ) : null}
        </Link>
      </div>
    </aside>
  );
}
