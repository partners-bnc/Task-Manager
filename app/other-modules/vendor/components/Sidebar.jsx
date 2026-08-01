'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  UserX,
  LayoutGrid,
  ChevronLeft,
  Moon,
  Sun,
  HandCoins
} from 'lucide-react';
import { useVendor } from '../layout';

const SidebarItem = ({ icon: Icon, label, href, isCollapsed }) => {
  const pathname = usePathname();
  const isActive = href ? pathname === href : false;

  return (
    <Link
      href={href || '#'}
      className={`flex items-center py-3 cursor-pointer transition-all duration-200 rounded-xl mx-3 mb-1.5 ${
        isActive
          ? 'bg-[linear-gradient(180deg,#d7e7f9_0%,#7eb0ec_100%)] text-violet-950 font-extrabold shadow-sm shadow-blue-400/10'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
      } ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
      title={isCollapsed ? label : undefined}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3.5'}`} />
      {!isCollapsed && <span className="text-sm font-semibold truncate">{label}</span>}
    </Link>
  );
};

const Divider = () => (
  <div className="my-3 border-t border-slate-150 dark:border-slate-800/80 mx-4" />
);

export default function Sidebar() {
  const { isDarkMode, toggleDarkMode, isSidebarCollapsed, toggleSidebar } = useVendor();

  return (
    <aside
      className={`flex flex-col h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'w-20' : 'w-56'
      }`}
    >
      {/* Sidebar Header */}
      <div className={`flex items-center pt-7 pb-5 ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
        {!isSidebarCollapsed && (
          <span className="text-base font-extrabold tracking-wider bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400 bg-clip-text text-transparent uppercase leading-none">
            Vendor Portal
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 flex flex-col pt-3">
        <SidebarItem
          icon={LayoutDashboard}
          label="Dashboard"
          href="/other-modules/vendor/dashboard"
          isCollapsed={isSidebarCollapsed}
        />
        <SidebarItem
          icon={Receipt}
          label="Vendor Payment"
          href="/other-modules/vendor/payments"
          isCollapsed={isSidebarCollapsed}
        />
        <SidebarItem
          icon={HandCoins}
          label="Full & Final"
          href="/other-modules/vendor/full-and-final"
          isCollapsed={isSidebarCollapsed}
        />
        
        <Divider />
        
        <SidebarItem
          icon={LayoutGrid}
          label="All Modules"
          href="/other-modules"
          isCollapsed={isSidebarCollapsed}
        />
      </div>

      {/* Footer */}
      {!isSidebarCollapsed && (
        <div className="p-4 border-t border-slate-150 bg-slate-50/50 flex justify-center">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            © BNC GLOBAL
          </span>
        </div>
      )}
    </aside>
  );
}
