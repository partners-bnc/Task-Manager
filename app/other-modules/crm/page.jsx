"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCrm } from './context/CrmContext';

export default function CRMIndex() {
  const router = useRouter();
  const { currentUser } = useCrm();

  useEffect(() => {
    // Role-based redirection logic
    if (currentUser.role === "admin" || currentUser.role === "manager") {
      router.replace('/other-modules/crm/dashboard');
    } else {
      router.replace('/other-modules/crm/leads');
    }
  }, [currentUser.role, router]);

  return (
    <div className="flex h-full items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 transition-colors">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Authenticating & Routing...</p>
      </div>
    </div>
  );
}