'use client';

'use client';

import { Navbar } from '@/app/components-homepage/Navbar';
import { Footer } from '@/app/components-homepage/Footer';
import { OthersSection } from '@/app/components-homepage/OthersSection';
import { useWorkspaceRouting } from '@/app/components-homepage/useWorkspaceRouting';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OtherModulesPage() {
  const router = useRouter();
  const { loading, isAuthenticated, workspaceHref, modules, user } = useWorkspaceRouting();
  const workspaceLabel = loading ? 'Loading' : isAuthenticated ? 'Workspace' : 'Login';
  const isSupportUser = String(user?.role || '').toLowerCase() === 'support';

  useEffect(() => {
    if (loading || !isAuthenticated || !isSupportUser || !modules?.taskManager?.href) return;
    router.replace(modules.taskManager.href);
  }, [isAuthenticated, isSupportUser, loading, modules?.taskManager?.href, router]);

  if (!loading && isAuthenticated && isSupportUser) {
    return null;
  }

  return (
    <>
      <Navbar
        workspaceHref={workspaceHref}
        workspaceLabel={workspaceLabel}
        othersHref="/other-modules"
        isOthersActive
        isAuthenticated={isAuthenticated}
        user={user}
      />
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] pt-20 md:pt-[5.5rem]">
        <OthersSection modules={modules} loading={loading} className="pt-10 pb-24 md:pt-12 md:pb-24" />
      </main>
      <Footer taskManagerHref={workspaceHref} />
    </>
  );
}
