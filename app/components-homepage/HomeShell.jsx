'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/app/components-homepage/Navbar';
import { Hero } from '@/app/components-homepage/Hero';
import { FeatureSteps } from '@/app/components-homepage/FeatureSteps';
import { Footer } from '@/app/components-homepage/Footer';
import { useWorkspaceRouting } from '@/app/components-homepage/useWorkspaceRouting';
import Loader from '@/components/ui/loader';

export default function HomeShell() {
  const { loading, isAuthenticated, workspaceHref, user } = useWorkspaceRouting();
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('preview-loading') === 'true') {
        setIsPreviewLoading(true);
      }
    }
  }, []);

  if (isPreviewLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f8fafc] gap-6">
        <div className="p-10 bg-white rounded-2xl shadow-md border border-slate-200/60 flex flex-col items-center justify-center">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Loader Animation Preview</h2>
          <Loader />
        </div>
        <p className="text-sm text-slate-500">
          Standalone preview. You can edit <code>components/ui/loader.tsx</code> or <code>app/globals.css</code> to adjust the animation.
        </p>
      </div>
    );
  }

  const workspaceLabel = loading ? 'Loading' : isAuthenticated ? 'Workspace' : 'Login';

  return (
    <>
      <Navbar
        workspaceHref={workspaceHref}
        workspaceLabel={workspaceLabel}
        othersHref="/other-modules"
        isAuthenticated={isAuthenticated}
        user={user}
      />
      <Hero taskManagerHref={workspaceHref} />
      <FeatureSteps />
      <Footer taskManagerHref={workspaceHref} />
    </>
  );
}
