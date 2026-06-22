"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/other-modules/crm/leads");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
      <div className="text-sm font-medium text-slate-500 animate-pulse">
        Loading...
      </div>
    </div>
  );
}
