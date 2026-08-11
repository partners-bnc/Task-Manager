'use client';

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import { createClient } from '@/utils/supabase/client';
import { useWorkspaceRouting } from '@/app/components-homepage/useWorkspaceRouting';

const VendorContext = createContext(null);

export function useVendor() {
  const context = useContext(VendorContext);
  if (!context) {
    throw new Error('useVendor must be used within a VendorLayout');
  }
  return context;
}

export default function VendorLayout({ children }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { user, loading: authLoading } = useWorkspaceRouting();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    approvedCount: 0,
    paidCount: 0,
    typeDistribution: { vendor: 0, ff: 0 },
    monthlyTrend: []
  });
  const [loading, setLoading] = useState(true);

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);
  
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('vendor-theme', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const fetchPaymentsData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/other-modules/vendor/api/payments');
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
      
      const statsRes = await fetch('/other-modules/vendor/api/dashboard');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error fetching vendor payments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentsData();
    
    // Force light mode
    setIsDarkMode(false);
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('vendor-theme');
  }, [fetchPaymentsData]);

  return (
    <VendorContext.Provider
      value={{
        user,
        isSidebarCollapsed,
        toggleSidebar,
        isDarkMode: false,
        toggleDarkMode: () => {},
        payments,
        stats,
        loading: loading || authLoading,
        refreshData: fetchPaymentsData
      }}
    >
      <div className="flex h-screen flex-col overflow-hidden bg-slate-50 transition-colors duration-300 md:flex-row">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        
        {/* Mobile Navbar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 text-slate-800 md:hidden">
          <span className="text-base font-extrabold tracking-wider bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent uppercase leading-none">
            VENDORA
          </span>
          <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-650 shrink-0">
            Active
          </span>
        </div>

        {/* Main Content Area */}
        <main className="min-h-0 w-full flex-1 overflow-y-auto scroll-smooth">
          {children}
        </main>
      </div>
    </VendorContext.Provider>
  );
}
