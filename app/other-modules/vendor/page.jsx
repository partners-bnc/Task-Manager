'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VendorIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/other-modules/vendor/dashboard');
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 transition-colors">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Loading Vendor Portal...</p>
      </div>
    </div>
  );
}
