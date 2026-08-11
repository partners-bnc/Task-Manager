"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Activity,
  CheckSquare,
  Calendar as CalendarIcon,
  Link as LinkIcon,
  Mail,
  ChevronLeft,
  Moon,
  Sun,
  MessageSquareCode,
  Database,
  Megaphone,
  Rocket,
  LayoutGrid,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';

const SidebarItem = ({ icon: Icon, label, href, isCollapsed, badge }) => {
  const pathname = usePathname();
  const isActive = href ? pathname === href : false;

  return (
    <Link
      href={href || '#'}
      className={`flex items-center py-2.5 cursor-pointer transition-colors duration-200 rounded-lg mx-2 ${isActive
          ? 'bg-blue-50 dark:bg-slate-800 border-l-4 border-blue-500 text-blue-700 dark:text-white'
          : 'border-l-4 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
        } ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
      title={isCollapsed ? label : undefined}
    >
      <div className={`${badge ? 'relative' : ''} flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
        {isCollapsed && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
        )}
      </div>
      {!isCollapsed && (
        <>
          <span className="text-sm font-medium truncate flex-1">{label}</span>
          {badge > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full ml-auto">
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
};

const SectionLabel = ({ label, isCollapsed }) => {
  if (isCollapsed) return <div className="w-8 mx-auto my-2 border-t border-slate-200 dark:border-slate-700" />;
  return (
    <div className="px-4 pt-4 pb-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</span>
    </div>
  );
};

const Divider = () => (
  <div className="my-2 border-t border-slate-100 dark:border-slate-800 mx-4" />
);

const Sidebar = () => {
  const { isDarkMode, toggleDarkMode, permissions, isSidebarCollapsed, toggleSidebar, followups, tasks, currentUser } = useCrm();

  const pendingFollowups = followups.filter(f => f.status !== 'Completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length;

  const canViewDashboard = ['admin', 'manager'].includes(currentUser.role);
  const canImportData = currentUser.role === 'admin';

  return (
    <div
      className={`flex flex-col h-screen bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 flex-shrink-0 shadow-md dark:shadow-xl overflow-y-auto scrollbar-hide border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-52'
        }`}
    >
      {/* Header / Title */}
      <div className={`flex items-center pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {!isSidebarCollapsed && (
          <span className="text-lg font-extrabold text-slate-800 dark:text-white tracking-tight leading-none">
            BnC CRM
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white shrink-0"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={`w-5 h-5 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col pb-4 space-y-0.5 mt-2">
        {canViewDashboard && (
          <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/other-modules/crm/dashboard" isCollapsed={isSidebarCollapsed} />
        )}
        <SidebarItem icon={Users} label="Lead Tracking" href="/other-modules/crm/leads" isCollapsed={isSidebarCollapsed} />
        <SidebarItem icon={MessageSquareCode} label="Follow-ups" href="/other-modules/crm/followups" isCollapsed={isSidebarCollapsed} />
        {permissions.canManageEmailTemplates && (
          <SidebarItem icon={Rocket} label="Campaigns" href="/other-modules/crm/campaigns" isCollapsed={isSidebarCollapsed} />
        )}
        {permissions.canManageEmailTemplates && (
          <SidebarItem icon={Mail} label="Email Templates" href="/other-modules/crm/templates" isCollapsed={isSidebarCollapsed} />
        )}
        
        <Divider />
        
        <SidebarItem icon={CalendarIcon} label="Calendar" href="/other-modules/crm/calendar" isCollapsed={isSidebarCollapsed} />
        <SidebarItem icon={LinkIcon} label="Lead Sources" href="/other-modules/crm/sources" isCollapsed={isSidebarCollapsed} />
        <SidebarItem icon={CheckSquare} label="Task Manager" href="/Taskmanager/dashboard" isCollapsed={isSidebarCollapsed} />
        <SidebarItem icon={LayoutGrid} label="All Modules" href="/other-modules" isCollapsed={isSidebarCollapsed} />
      </div>

      {/* Dark Mode Toggle */}
      <div
        className={`p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 ${isSidebarCollapsed ? 'flex justify-center' : 'flex items-center justify-between px-5'
          }`}
      >
        {!isSidebarCollapsed && (
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Dark Mode
          </span>
        )}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
          title="Toggle Dark Mode"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-yellow-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          .bg-blue-50 {
            background-color: rgba(37, 89, 165, 0.08) !important;
          }
          .border-blue-500 {
            border-color: rgb(37, 89, 165) !important;
          }
          .text-blue-700 {
            color: rgb(37, 89, 165) !important;
          }
        `
      }} />
    </div>
  );
};

export default Sidebar;
