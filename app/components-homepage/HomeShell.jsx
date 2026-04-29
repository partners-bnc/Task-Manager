'use client';

import { Navbar } from '@/app/components-homepage/Navbar';
import { Hero } from '@/app/components-homepage/Hero';
import { LogoTicker } from '@/app/components-homepage/LogoTicker';
import { FeatureSteps } from '@/app/components-homepage/FeatureSteps';
import { Footer } from '@/app/components-homepage/Footer';
import { useWorkspaceRouting } from '@/app/components-homepage/useWorkspaceRouting';

export default function HomeShell() {
  const { loading, isAuthenticated, workspaceHref, user } = useWorkspaceRouting();

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
      <LogoTicker />
      <FeatureSteps />
      <Footer taskManagerHref={workspaceHref} />
    </>
  );
}
