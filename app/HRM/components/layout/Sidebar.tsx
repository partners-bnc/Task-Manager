'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => Promise<void> | void;
  isLoggingOut?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  employee?: {
    name?: string;
    employee_id?: string;
    email?: string;
    role?: string;
    profile_picture_url?: string;
    module_access?: { task_manager?: boolean }[] | { task_manager?: boolean } | null;
    designation?: { title?: string } | { name?: string } | null;
  } | null;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  employee,
  onLogout,
  isLoggingOut = false,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [isWorkLogExpanded, setIsWorkLogExpanded] = useState(() =>
    currentTab === 'my-daily-log' || currentTab === 'team-daily-log'
  );
  const [isRegularizationExpanded, setIsRegularizationExpanded] = useState(() =>
    currentTab === 'regularize-attendance' || currentTab === 'team-regularization'
  );

  const displayName = employee?.name || employee?.employee_id || 'Employee';
  const loginId = employee?.employee_id || employee?.email || 'LOGIN ID';
  const workEmail = employee?.email || 'Work email not set';
  const avatarSrc =
    employee?.profile_picture_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=DBEAFE&color=1E3A8A&size=160`;

  const navItems = [
    { id: 'home', label: 'Home', icon: 'dashboard' },
    { id: 'calendar', label: 'Calendar', icon: 'date_range' },
    { id: 'attendance', label: 'Attendance', icon: 'calendar_today' },
    { id: 'policy-manual', label: 'Policy Manual', icon: 'menu_book' },
    { id: 'tickets', label: 'Tickets & Requests', icon: 'support_agent' },
    { id: 'expenses', label: 'Expense Claims', icon: 'receipt_long' },
    { id: 'organization-chart', label: 'Organization Chart', icon: 'account_tree' },
    { id: 'leave', label: 'Leave Management', icon: 'event_busy' },
    { id: 'salary', label: 'Payroll', icon: 'payments' },
    { id: 'profile', label: 'My Profile', icon: 'person' },
  ];

  const handleModulesRedirect = () => {
    if (typeof window === 'undefined') return;
    window.location.href = '/other-modules';
  };

  const isRegActive = currentTab === 'regularize-attendance' || currentTab === 'team-regularization';
  const isWorkLogActive = currentTab === 'my-daily-log' || currentTab === 'team-daily-log';

  // Pill style: starts from left edge, ends with mr-3 gap before sidebar right border, rounded-r-full circular curve
  const pillBase = 'flex items-center gap-3 py-2.5 pl-5 rounded-r-full transition-colors duration-150';
  const pillWidth = 'mr-3'; // gap from right border
  const activePill = `${pillBase} ${pillWidth} bg-surface-container-lowest text-primary font-bold shadow-sm`;
  const inactivePill = `${pillBase} ${pillWidth} text-on-surface-variant hover:bg-surface-container-lowest/60 hover:text-primary`;
  const subActivePill = `${pillBase} ${pillWidth} pl-10 bg-surface-container-lowest text-primary font-bold shadow-sm`;
  const subInactivePill = `${pillBase} ${pillWidth} pl-10 text-on-surface-variant hover:bg-surface-container-lowest/60 hover:text-primary`;

  return (
    <>
      {isMobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm md:hidden"
        />
      ) : null}

      <aside
        className={`subtle-scrollbar fixed left-0 top-0 z-50 flex h-screen w-72 max-w-[88vw] flex-col overflow-y-auto bg-surface-container-low py-5 shadow-[0_20px_60px_rgba(15,23,42,0.18)] transition-transform duration-300 md:w-64 md:max-w-none md:translate-x-0 md:shadow-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Profile */}
        <div className="mb-5 px-5">
          <div className="mb-4 flex items-center justify-between md:hidden">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">HRM Employee</p>
              <p className="text-lg font-bold text-on-surface">Navigation</p>
            </div>
            <button
              type="button"
              onClick={onMobileClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-outline-variant/15 bg-white text-on-surface shadow-sm"
              aria-label="Close navigation"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            <Image
              alt="User Profile Avatar"
              className="h-20 w-20 rounded-full object-cover shadow-md"
              src={avatarSrc}
              width={80}
              height={80}
              unoptimized={!employee?.profile_picture_url}
            />
            <div className="mt-3 w-full">
              <p className="font-headline text-sm font-bold text-on-surface">{displayName}</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-on-surface-variant mt-0.5">{loginId}</p>
              <p className="mt-1 text-[11px] text-on-surface-variant break-all">{workEmail}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5">
          {/* Home, Calendar & Attendance */}
          {navItems.slice(0, 3).map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setCurrentTab(item.id); onMobileClose?.(); }}
                className={`w-full ${isActive ? activePill : inactivePill}`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {item.icon}
                </span>
                <span className={`text-sm flex-1 text-left whitespace-nowrap ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Daily Work Log expandable */}
          <div
            onMouseEnter={() => setIsWorkLogExpanded(true)}
            onMouseLeave={() => setIsWorkLogExpanded(currentTab === 'my-daily-log' || currentTab === 'team-daily-log')}
          >
            <button
              type="button"
              onClick={() => setIsWorkLogExpanded(!isWorkLogExpanded)}
              className={`w-full ${isWorkLogActive ? activePill : inactivePill}`}
            >
              <span className="material-symbols-outlined text-[20px] shrink-0" style={isWorkLogActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                assignment
              </span>
              <span className={`text-sm flex-1 text-left whitespace-nowrap ${isWorkLogActive ? 'font-bold' : 'font-medium'}`}>
                Daily Work Log
              </span>
              <span className={`material-symbols-outlined text-[18px] shrink-0 mr-1 transition-transform duration-300 ${isWorkLogExpanded ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isWorkLogExpanded ? 'max-h-28 opacity-100' : 'max-h-0 opacity-0'}`}>
              <button
                type="button"
                onClick={() => { setCurrentTab('my-daily-log'); onMobileClose?.(); }}
                className={`w-full ${currentTab === 'my-daily-log' ? subActivePill : subInactivePill}`}
              >
                <span className="material-symbols-outlined text-[18px] shrink-0">person</span>
                <span className={`text-sm flex-1 text-left whitespace-nowrap ${currentTab === 'my-daily-log' ? 'font-bold' : 'font-medium'}`}>
                  My Daily Log
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setCurrentTab('team-daily-log'); onMobileClose?.(); }}
                className={`w-full ${currentTab === 'team-daily-log' ? subActivePill : subInactivePill}`}
              >
                <span className="material-symbols-outlined text-[18px] shrink-0">groups</span>
                <span className={`text-sm flex-1 text-left whitespace-nowrap ${currentTab === 'team-daily-log' ? 'font-bold' : 'font-medium'}`}>
                  Team Daily Log
                </span>
              </button>
            </div>
          </div>

          {/* Regularization expandable */}
          <div
            onMouseEnter={() => setIsRegularizationExpanded(true)}
            onMouseLeave={() => setIsRegularizationExpanded(currentTab === 'regularize-attendance' || currentTab === 'team-regularization')}
          >
            <button
              type="button"
              onClick={() => setIsRegularizationExpanded(!isRegularizationExpanded)}
              className={`w-full ${isRegActive ? activePill : inactivePill}`}
            >
              <span className="material-symbols-outlined text-[20px] shrink-0" style={isRegActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                edit_calendar
              </span>
              <span className={`text-sm flex-1 text-left whitespace-nowrap ${isRegActive ? 'font-bold' : 'font-medium'}`}>
                Regularization
              </span>
              <span className={`material-symbols-outlined text-[18px] shrink-0 mr-1 transition-transform duration-300 ${isRegularizationExpanded ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isRegularizationExpanded ? 'max-h-28 opacity-100' : 'max-h-0 opacity-0'}`}>
              <button
                type="button"
                onClick={() => { setCurrentTab('regularize-attendance'); onMobileClose?.(); }}
                className={`w-full ${currentTab === 'regularize-attendance' ? subActivePill : subInactivePill}`}
              >
                <span className="material-symbols-outlined text-[18px] shrink-0">edit_note</span>
                <span className={`text-sm flex-1 text-left whitespace-nowrap ${currentTab === 'regularize-attendance' ? 'font-bold' : 'font-medium'}`}>
                  My Regularization
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setCurrentTab('team-regularization'); onMobileClose?.(); }}
                className={`w-full ${currentTab === 'team-regularization' ? subActivePill : subInactivePill}`}
              >
                <span className="material-symbols-outlined text-[18px] shrink-0">supervised_user_circle</span>
                <span className={`text-sm flex-1 text-left whitespace-nowrap ${currentTab === 'team-regularization' ? 'font-bold' : 'font-medium'}`}>
                  Team Regularization
                </span>
              </button>
            </div>
          </div>

          {/* Rest of nav */}
          {navItems.slice(3).map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setCurrentTab(item.id); onMobileClose?.(); }}
                className={`w-full ${isActive ? activePill : inactivePill}`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {item.icon}
                </span>
                <span className={`text-sm flex-1 text-left whitespace-nowrap ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-outline-variant/10 pt-3">
          <button
            onClick={onLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-5 py-2.5 text-error/80 hover:text-error transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">logout</span>
            <span className="text-sm font-medium whitespace-nowrap">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
          <button
            onClick={handleModulesRedirect}
            className="w-full flex items-center gap-3 px-5 py-2.5 text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">widgets</span>
            <span className="text-sm font-medium whitespace-nowrap">Other Modules</span>
          </button>
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-5 py-2.5 text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">home</span>
            <span className="text-sm font-medium whitespace-nowrap">Home Page</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
