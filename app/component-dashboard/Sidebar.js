'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LayoutDashboard, ListTodo, PlusSquare, Users, Settings, LogOut, Camera, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { useData } from './DataContext';

export default function Sidebar({ currentView, onNavigate, isCollapsed = false, onToggleCollapse }) {
  const { user, logout, isAdminMode, updateAvatar } = useData();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef(null);

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
    { label: 'Manage Tasks', icon: ListTodo, view: 'tasks' },
    ...(!isAdminMode ? [{ label: '+ Add Todos', icon: PlusSquare, view: 'todos' }] : []),
    { label: 'Create Task', icon: PlusSquare, view: 'create-task' },
    { label: 'Team Members', icon: Users, view: 'team' },
    ...(isAdminMode ? [{ label: 'Settings', icon: Settings, view: 'settings' }] : []),
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
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white h-screen fixed left-0 top-0 border-r border-gray-200 flex flex-col z-20 transition-all duration-200`}>
      <div className={`${isCollapsed ? 'p-3' : 'p-8 pb-4'} flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-2`}>
        {!isCollapsed && <h1 className="text-2xl font-bold text-black">Task Manager</h1>}
      </div>

      <div className={`${isCollapsed ? 'px-2 py-4' : 'px-8 py-6'} flex flex-col items-center border-b border-gray-100`}>
        <div className={`${isCollapsed ? 'w-12 h-12 mb-2' : 'w-20 h-20 mb-3'} rounded-full border-4 border-[#7F40EE]/20 overflow-hidden relative group`}>
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
            <span className="bg-[#7F40EE] text-white text-xs px-3 py-1 rounded-full mb-2">{user.role}</span>
            <h3 className="font-bold text-lg text-slate-800">{user.name}</h3>
            <p className="text-slate-500 text-sm">{user.email}</p>
          </>
        )}
      </div>

      <nav className={`flex-1 ${isCollapsed ? 'px-2 py-4' : 'px-4 py-6'} space-y-1`}>
        {menuItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              title={item.label}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#7F40EE]/10 text-[#7F40EE] border-r-4 border-[#7F40EE]'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <item.icon size={20} />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-gray-100`}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full inline-flex items-center justify-center rounded-lg px-4 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 mb-2"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <Link
          href="/"
          title="Home"
          className={`w-full mb-2 flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 text-slate-600 hover:text-[#7F40EE] hover:bg-[#7F40EE]/10 rounded-lg transition-colors`}
        >
          <Home size={20} />
          {!isCollapsed && <span className="font-medium">Home</span>}
        </Link>
        <button
          title="Logout"
          onClick={async () => {
            await logout();
          }}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors`}
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
