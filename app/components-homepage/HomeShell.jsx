'use client';

import { useState } from 'react';
import { BriefcaseBusiness, ClipboardList, Files, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/app/components-homepage/Navbar';
import { Hero } from '@/app/components-homepage/Hero';
import { LogoTicker } from '@/app/components-homepage/LogoTicker';
import { FeatureSteps } from '@/app/components-homepage/FeatureSteps';
import { Footer } from '@/app/components-homepage/Footer';
import { useWorkspaceRouting } from '@/app/components-homepage/useWorkspaceRouting';

const otherModules = [
  {
    id: 'auditing',
    title: 'Auditing',
    description: 'Plan audits, track procedures, assign reviewers, and follow execution from kickoff to closure.',
    icon: ClipboardList,
    accent: 'from-fuchsia-500 via-violet-500 to-indigo-600',
  },
  {
    id: 'task-management',
    title: 'Task Management',
    description: 'Coordinate ownership, due dates, and progress across operational workstreams in one place.',
    icon: BriefcaseBusiness,
    accent: 'from-cyan-500 via-sky-500 to-blue-600',
  },
  {
    id: 'hrm',
    title: 'HRM',
    description: 'Human Resource Management workspace for the internal BNC team to manage people operations and workflows.',
    icon: Files,
    accent: 'from-amber-400 via-orange-500 to-rose-500',
  },
  {
    id: 'grc',
    title: 'GRC',
    description: 'Centralize governance, risk, and compliance tracking with clear ownership and status visibility.',
    icon: ShieldCheck,
    accent: 'from-emerald-500 via-teal-500 to-cyan-600',
  },
];

function OthersSection({ selectedModule, onSelect }) {
  return (
    <section id="others-section" className="relative px-4 py-16 md:py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_30%)]" />

      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-white/60 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 backdrop-blur">
              Other Modules
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
              Open the workspace your team needs next
            </h2>
            <p className="mt-3 text-base text-slate-600 md:text-lg">
              Keep the homepage aligned with the existing visual language while exposing adjacent workflows from one entry point.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white/70 px-5 py-4 text-sm text-slate-600 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            Auditing is live now. The remaining modules are staged in the same entry surface.
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {otherModules.map((module) => {
            const Icon = module.icon;
            const isSelected = selectedModule === module.id;

            return (
              <button
                key={module.id}
                type="button"
                onClick={() => onSelect(module.id)}
                className={`group relative overflow-hidden rounded-[28px] border p-6 text-left transition-all duration-300 ${
                  isSelected
                    ? 'border-slate-900 bg-slate-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.32)]'
                    : 'border-slate-200/80 bg-white/80 text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur hover:-translate-y-1 hover:border-slate-300'
                }`}
              >
                <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${module.accent}`} />
                <div className="mb-10 flex items-start justify-between gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${module.accent} text-white shadow-lg`}
                  >
                    <Icon size={24} />
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                      isSelected ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isSelected ? 'Open' : 'Module'}
                  </span>
                </div>

                <h3 className="text-2xl font-bold tracking-tight">{module.title}</h3>
                <p className={`mt-3 text-sm leading-6 ${isSelected ? 'text-white/72' : 'text-slate-600'}`}>
                  {module.description}
                </p>
              </button>
            );
          })}
        </div>

        {selectedModule && selectedModule !== 'auditing' ? (
          <div className="mt-8 rounded-[32px] border border-slate-200 bg-white/85 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Selected Module</p>
            <h3 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {otherModules.find((module) => module.id === selectedModule)?.title}
            </h3>
            <p className="mt-3 max-w-2xl text-base text-slate-600">
              This card is now wired into the homepage selection flow. Auditing currently renders the full interactive workspace, and the remaining modules can be implemented in the same container when their screens are ready.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function HomeShell() {
  const router = useRouter();
  const [selectedModule, setSelectedModule] = useState(null);
  const [isOthersOpen, setIsOthersOpen] = useState(false);
  const { isAuthenticated, taskManagerHref } = useWorkspaceRouting();

  const workspaceLabel = isAuthenticated ? 'Workspace' : 'Login';

  const handleToggleOthers = () => {
    setIsOthersOpen((prev) => !prev);

    window.requestAnimationFrame(() => {
      document.getElementById('others-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleSelectModule = (moduleId) => {
    if (moduleId === 'auditing') {
      router.push('/Auditing/auditing');
      return;
    }

    if (moduleId === 'hrm') {
      router.push('/HRM/hrm');
      return;
    }

    if (moduleId === 'task-management') {
      router.push(taskManagerHref);
      return;
    }

    setIsOthersOpen(true);
    setSelectedModule(moduleId);
  };

  return (
    <>
      <Navbar
        isOthersOpen={isOthersOpen}
        onToggleOthers={handleToggleOthers}
        workspaceHref={taskManagerHref}
        workspaceLabel={workspaceLabel}
      />
      <Hero taskManagerHref={taskManagerHref} />
      <LogoTicker />
      <FeatureSteps />
      {isOthersOpen ? <OthersSection selectedModule={selectedModule} onSelect={handleSelectModule} /> : null}
      <Footer taskManagerHref={taskManagerHref} />
    </>
  );
}
