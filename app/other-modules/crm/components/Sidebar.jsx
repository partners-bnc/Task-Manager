"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  KanbanSquare, 
  Activity, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Package, 
  UserCircle, 
  Link as LinkIcon, 
  Mail, 
  Zap, 
  Settings, 
  Settings2, 
  Bot, 
  Info,
  ChevronLeft,
  Moon,
  Sun,
  MessageSquareCode,
  Database
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';

const SidebarItem = ({ icon: Icon, label, href, isCollapsed, badge }) => {
  const pathname = usePathname();
  const isActive = href ? pathname === href : false;

  return (
    <Link 
      href={href || "#"} 
      className={`flex items-center py-3 cursor-pointer transition-colors duration-200 ${
        isActive 
          ? 'bg-slate-800 border-l-4 border-blue-400 text-white dark:bg-slate-800 dark:border-blue-500' 
          : 'border-l-4 border-transparent text-slate-300 hover:bg-slate-800 hover:text-white dark:text-slate-400 dark:hover:bg-slate-800'
      } ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
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

const Divider = () => (
  <div className="my-2 border-t border-slate-700 mx-4" />
);

const Sidebar = () => {
  const { currentUser, isDarkMode, toggleDarkMode, permissions, isSidebarCollapsed, toggleSidebar, followups, tasks } = useCrm();
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);

  const pendingFollowups = followups.filter(f => f.status !== 'Completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length;

  // "Admin" and "Manager" are the only roles that see the dashboard link
  const canViewDashboard = ["admin", "manager"].includes(currentUser.role);
  const canImportData = currentUser.role === 'admin';

  return (
    <div className={`flex flex-col h-screen bg-slate-900 dark:bg-slate-950 text-slate-300 flex-shrink-0 shadow-xl overflow-y-auto scrollbar-hide border-r border-transparent dark:border-slate-800 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Top Header Section */}
      <div className={`flex flex-col pt-4 pb-6 ${isSidebarCollapsed ? 'px-2 items-center' : 'px-4'}`}>
        <div className={`flex items-center mb-6 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isSidebarCollapsed && <h1 className="text-lg font-semibold text-white tracking-wide">TasksFlow</h1>}
          <button onClick={toggleSidebar} className="p-1.5 rounded-md hover:bg-slate-800 transition-colors text-slate-400 hover:text-white shrink-0">
            <ChevronLeft className={`w-5 h-5 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className={`${isSidebarCollapsed ? 'w-12 h-12 mb-2' : 'w-20 h-20 mb-3'} rounded-full bg-slate-700 dark:bg-slate-800 flex items-center justify-center border-2 border-slate-600 shadow-inner transition-all duration-300`}>
             <span className={`${isSidebarCollapsed ? 'text-lg' : 'text-2xl'} font-bold text-slate-400`}>
               {currentUser.name.substring(0, 2).toUpperCase()}
             </span>
          </div>
          
          {!isSidebarCollapsed && (
            <>
              <h2 className="text-white font-bold text-base mb-1 text-center truncate w-full">{currentUser.name}</h2>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-900 text-blue-200 tracking-wide uppercase">
                {currentUser.role}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 flex flex-col py-2">
        <div className={`mb-2 ${isSidebarCollapsed ? 'text-center' : 'px-4'}`}>
          {isSidebarCollapsed ? (
             <div className="w-8 mx-auto border-t border-slate-700" />
          ) : (
             <span className="text-xs font-semibold text-slate-500 tracking-wider">MAIN</span>
          )}
        </div>
        
        <div className="flex flex-col space-y-1 mb-2">
          {canViewDashboard && <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/other-modules/crm/dashboard" isCollapsed={isSidebarCollapsed} />}
          {canImportData && <SidebarItem icon={Database} label="Import Data" href="/other-modules/crm/import-data" isCollapsed={isSidebarCollapsed} />}
          <SidebarItem icon={Users} label="Lead Tracking" href="/other-modules/crm/leads" isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={Activity} label="Activities" href="/other-modules/crm/activities" isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={CheckSquare} label="Tasks" href="/other-modules/crm/tasks" isCollapsed={isSidebarCollapsed} badge={pendingTasks} />
          <SidebarItem icon={MessageSquareCode} label="Follow-ups" href="/other-modules/crm/followups" isCollapsed={isSidebarCollapsed} badge={pendingFollowups} />
          <SidebarItem icon={CalendarIcon} label="Calendar" href="/other-modules/crm/calendar" isCollapsed={isSidebarCollapsed} />
        </div>

        <Divider />

        <div className="flex flex-col space-y-1 my-2">
          <SidebarItem icon={Package} label="Products & Services" href="/other-modules/crm/products" isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={UserCircle} label="Customers" href="/other-modules/crm/customers" isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={LinkIcon} label="Lead Sources" href="/other-modules/crm/sources" isCollapsed={isSidebarCollapsed} />
          {permissions.canManageEmailTemplates && <SidebarItem icon={Mail} label="Email Templates" href="/other-modules/crm/templates" isCollapsed={isSidebarCollapsed} />}
          {permissions.canManageEmailTemplates && <SidebarItem icon={Mail} label="Campaigns" href="/other-modules/crm/campaigns" isCollapsed={isSidebarCollapsed} />}
          {permissions.canManageEmailTemplates && <SidebarItem icon={Zap} label="Email Triggers" href="/other-modules/crm/triggers" isCollapsed={isSidebarCollapsed} />}
        </div>

        {permissions.canManageSystemSettings && (
          <>
            <Divider />
            <div className="flex flex-col space-y-1 my-2">
              <SidebarItem icon={Settings} label="Settings" href="/other-modules/crm/settings" isCollapsed={isSidebarCollapsed} />
              <SidebarItem icon={Settings2} label="System Settings" href="#" isCollapsed={isSidebarCollapsed} />
            </div>
          </>
        )}

        <Divider />

        <div className="flex flex-col space-y-1 mt-2 mb-4">
          <SidebarItem icon={Bot} label="AI Assistant" href="/other-modules/crm/ai-assistant" isCollapsed={isSidebarCollapsed} />
          <SidebarItem icon={Info} label="About App" href="#" isCollapsed={isSidebarCollapsed} />
        </div>
        
      </div>

      {/* RBAC MOCK controls / Dark Mode */}
      <div className={`p-4 bg-slate-800 dark:bg-slate-900 border-t border-slate-700 mt-auto ${isSidebarCollapsed ? 'flex flex-col items-center justify-center p-2 pt-4 pb-4' : ''}`}>
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-full' : 'justify-between'}`}>
          {!isSidebarCollapsed && <span className="text-xs font-bold text-slate-400">DARK MODE</span>}
          <button 
            onClick={toggleDarkMode}
            className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition shadow-sm"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}} />
    </div>
  );
};

export default Sidebar;
