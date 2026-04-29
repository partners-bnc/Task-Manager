'use client';

import { Navbar } from '@/app/components-homepage/Navbar';
import { Footer } from '@/app/components-homepage/Footer';
import { OthersSection } from '@/app/components-homepage/OthersSection';
import { useWorkspaceRouting } from '@/app/components-homepage/useWorkspaceRouting';

export default function OtherModulesPage() {
  const { loading, isAuthenticated, workspaceHref, modules, user } = useWorkspaceRouting();
  const workspaceLabel = loading ? 'Loading' : isAuthenticated ? 'Workspace' : 'Login';

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
