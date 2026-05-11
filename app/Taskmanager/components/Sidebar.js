'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LayoutDashboard, ListTodo, PlusSquare, Users, Settings, LogOut, Camera, ChevronLeft, ChevronRight, Home, MessageSquare, ClipboardList } from 'lucide-react';
import { useData } from './DataContext';

export default function Sidebar({
  currentView,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
}) {
  const { user, logout, isAdminMode, updateAvatar } = useData();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef(null);

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
    { label: 'Manage Tasks', icon: ListTodo, view: 'tasks' },
    ...(!isAdminMode ? [{ label: '+ Add Todos', icon: ClipboardList, view: 'todos' }] : []),
    { label: 'Create Task', icon: PlusSquare, view: 'create-task' },
    { label: 'Team Members', icon: Users, view: 'team' },
    { label: 'Chat', icon: MessageSquare, view: 'chat' },
    { label: 'Settings', icon: Settings, view: 'settings' },
  ];

  if (!user) return null;

  const avatarSrc = user?.avatar || null;
  const avatarInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setAvatarError('');
    setAvatarUploading(true);

    const result = await updateAvatar(file);

    if (!result.success) {
      setAvatarError(result.error || 'Failed to update avatar');
    }

    setAvatarUploading(false);
  };

  return (
    <>
      {isMobileOpen ? (
        <button
          type="button"
          aria-label="Close Task Manager navigation"
          onClick={onMobileClose}
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm md:hidden"
        />
      ) : null}
    <aside className={`fixed left-0 top-0 z-40 flex h-screen w-72 max-w-[86vw] -translate-x-full flex-col overflow-hidden border-r border-gray-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] transition-all duration-200 md:max-w-none md:translate-x-0 md:shadow-none ${isMobileOpen ? 'translate-x-0' : ''} ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}>
      <div className={`${isCollapsed ? 'px-2 py-4' : 'px-5 py-4'} flex flex-col items-center border-b border-gray-100 shrink-0`}>
        <div className="mb-3 flex w-full items-center justify-between px-2 md:hidden">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Task Manager</p>
            <p className="text-lg font-bold text-slate-900">Navigation</p>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm"
            aria-label="Close Task Manager navigation"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        {!isCollapsed && <h1 className="text-[1.35rem] font-bold leading-none text-black m-5">Task Manager</h1>}
        <div className={`${isCollapsed ? 'w-12 h-12 mb-2' : 'w-16 h-16 mb-2'} rounded-full border-4 border-[#7F40EE]/20 overflow-hidden relative group`}>
          {avatarSrc ? (
            <Image src={avatarSrc} alt={user.name} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full bg-slate-200 text-slate-700 text-xl font-semibold flex items-center justify-center">
              {avatarInitial}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            aria-label="Change avatar"
            className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity disabled:opacity-0 disabled:cursor-not-allowed"
          >
            <span className="rounded-full bg-white/20 p-2">
              <Camera size={16} />
            </span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
          disabled={avatarUploading}
        />
        {avatarError && <p className="text-[11px] text-red-600 mb-2 text-center">{avatarError}</p>}

        {!isCollapsed && (
          <>
            <span className="bg-[#7F40EE] text-white text-[10px] px-3 py-1 rounded-full mb-2">{user.role}</span>
            <h3 className="font-bold text-base leading-tight text-slate-800 text-center">{user.name}</h3>
            <p className="text-slate-500 text-[13px] text-center break-all leading-tight mt-1">{user.email}</p>
          </>
        )}
      </div>

      <nav className={`flex-1 min-h-0 overflow-hidden ${isCollapsed ? 'px-2 py-4' : 'px-4 py-3'} space-y-1`}>
        {menuItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => {
                onNavigate(item.view);
                onMobileClose?.();
              }}
              title={item.label}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#7F40EE]/10 text-[#7F40EE] border-r-4 border-[#7F40EE]'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <item.icon size={20} />
              {!isCollapsed && <span className="font-medium text-[14px]">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className={`${isCollapsed ? 'p-2' : 'p-3 pt-2'} border-t border-gray-100 bg-white shrink-0`}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full inline-flex items-center justify-center rounded-lg px-4 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 mb-1.5"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <Link
          href="/"
          title="Home"
          className={`w-full mb-1 flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-2 text-slate-600 hover:text-[#7F40EE] hover:bg-[#7F40EE]/10 rounded-lg transition-colors`}
        >
          <Home size={20} />
          {!isCollapsed && <span className="font-medium text-[14px]">Home</span>}
        </Link>
        <button
          title="Logout"
          onClick={async () => {
            await logout();
          }}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors`}
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="font-medium text-[14px]">Logout</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
