'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function FarCompanyIndex() {
  const router = useRouter();
  const params = useParams();
  const companyId = params?.companyId;

  useEffect(() => {
    if (companyId) {
      router.replace(`/other-modules/far/${companyId}/dashboard`);
    }
  }, [companyId, router]);

  return (
    <div className="flex h-full items-center justify-center p-8 bg-slate-50">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium text-sm">Redirecting to Dashboard...</p>
      </div>
    </div>
  );
}
