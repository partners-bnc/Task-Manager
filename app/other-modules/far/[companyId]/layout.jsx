'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  TrendingUp,
  LogOut,
  Menu,
  X,
  Building2,
  ChevronLeft,
} from 'lucide-react';

export default function FarCompanyLayout({ children }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const companyId = params?.companyId;

  const [companyName, setCompanyName] = useState('Loading Company...');
  const [companyHeading, setCompanyHeading] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Load company details from localStorage
  useEffect(() => {
    if (companyId && typeof window !== 'undefined') {
      const storedRegisters = localStorage.getItem('far-registers');
      if (storedRegisters) {
        const registers = JSON.parse(storedRegisters);
        const current = registers.find((r) => r.id === companyId);
        if (current) {
          setCompanyName(current.name);
          setCompanyHeading(current.heading);
        } else {
          setCompanyName('Unknown Register');
        }
      }
    }
  }, [companyId]);

  const navItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: `/other-modules/far/${companyId}/dashboard`,
    },
    {
      label: 'Asset Entries',
      icon: Layers,
      href: `/other-modules/far/${companyId}/entries`,
    },
  ];

  const handleLogout = () => {
    router.push('/other-modules/far');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar for Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-slate-200/80 shadow-[10px_0_30px_rgba(15,23,42,0.01)] transition-all duration-300 md:relative md:translate-x-0 ${
          isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 shrink-0">
          <Link
            href="/other-modules/far"
            className="flex items-center gap-2.5 font-extrabold text-slate-900 group"
          >
            <div className="w-8 h-8 bg-[#3170c6] rounded-lg flex items-center justify-center text-white shadow-md shadow-[#3170c6]/10">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            {isSidebarOpen && (
              <span className="text-base tracking-tight truncate max-w-[150px] group-hover:text-[#3170c6] transition-colors">
                {companyName}
              </span>
            )}
          </Link>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${!isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-[#edf4fc] text-[#3170c6] shadow-xs shadow-[#3170c6]/5'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#3170c6]' : 'text-slate-400'}`} />
                {isSidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 py-3 px-4 rounded-xl font-bold text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <LogOut className="w-5 h-5 shrink-0 text-red-500" />
            {isSidebarOpen && <span>Exit FAR</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-slate-200/80 bg-white shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex flex-col">
              <h2 className="text-md font-extrabold text-slate-800 tracking-tight leading-none">
                {companyName}
              </h2>
              {companyHeading && (
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1.5">
                  {companyHeading}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#edf4fc] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#3170c6] border border-[#afd0f4]">
              FAR Module
            </span>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-slate-50 md:p-8 p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
