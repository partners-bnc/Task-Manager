'use client';

import Image from 'next/image';
import React from 'react';
import Link from 'next/link';

interface AdminSidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  admin?: {
    name?: string;
    designation?: string;
    avatar?: string;
  } | null;
}

export default function AdminSidebar({ currentTab, setCurrentTab, admin }: AdminSidebarProps) {
  const fallbackInitial = admin?.name?.trim()?.charAt(0)?.toUpperCase() || 'H';

  const navItems = [
    { id: 'admin-dashboard', label: 'Admin Dashboard', icon: 'admin_panel_settings' },
    { id: 'admin-employee-list', label: 'Employee Directory', icon: 'groups' },
    { id: 'admin-holidays', label: 'Holiday', icon: 'calendar_month' },
    { id: 'admin-leaves', label: 'Leave', icon: 'event_busy' },
    { id: 'admin-regularization', label: 'Regularization', icon: 'fact_check' },
    { id: 'admin-payouts', label: 'Payouts & Payroll', icon: 'account_balance_wallet' },
    { id: 'admin-analytics', label: 'Analytics', icon: 'insights' },
  ];

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-surface-container-low flex flex-col py-6 pr-4 border-r border-outline-variant/20 z-50">
      <div className="mb-8 px-6 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-on-background font-headline">HR Admin</h1>
      </div>
      
      <div className="px-6 mb-8 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center text-sm font-bold text-on-surface">
          {admin?.avatar ? (
            <Image
              alt={admin?.name || 'HR Admin'}
              className="w-10 h-10 rounded-full object-cover"
              src={admin.avatar}
              width={40}
              height={40}
              unoptimized
            />
          ) : (
            <span>{fallbackInitial}</span>
          )}
        </div>
        <div>
          <p className="font-headline text-sm font-bold text-on-surface">{admin?.name || 'HR Admin'}</p>
          <p className="text-[10px] tracking-widest uppercase text-error font-bold">
            {admin?.designation || 'Administrator'}
          </p>
        </div>
      </div>

      <nav className="flex-grow space-y-2">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-5 py-3 transition-colors group ${
                isActive 
                  ? 'text-primary bg-surface-container-lowest rounded-r-full font-bold shadow-sm border-y border-r border-outline-variant/10' 
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest/50 rounded-r-full'
              }`}
            >
              <span 
                className="material-symbols-outlined" 
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span
                className={`font-body text-sm min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-outline-variant/10 pt-6 space-y-2">
        <Link href="/HRM/hrm" className="w-full flex items-center gap-3 px-5 py-2.5 text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">exit_to_app</span>
          <span className="font-body text-sm font-medium">Exit Admin Mode</span>
        </Link>
        <button className="w-full flex items-center gap-3 px-5 py-2.5 text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">settings</span>
          <span className="font-body text-sm font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
}
