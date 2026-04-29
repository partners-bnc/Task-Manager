import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BriefcaseBusiness, ClipboardList, Files, ShieldCheck } from 'lucide-react';
import { ModuleCardsSkeleton } from './ExperienceLoaders';

const otherModules = [
  {
    id: 'auditing',
    title: 'Auditing',
    description: 'Plan audits, track procedures, assign reviewers, and follow execution from kickoff to closure.',
    icon: ClipboardList,
    accessKey: 'auditing',
  },
  {
    id: 'task-management',
    title: 'Task Management',
    description: 'Coordinate ownership, due dates, and progress across operational workstreams in one place.',
    icon: BriefcaseBusiness,
    accessKey: 'taskManager',
  },
  {
    id: 'hrm',
    title: 'HRM',
    description: 'Human Resource Management workspace for the internal BNC team to manage people operations and workflows.',
    icon: Files,
    accessKey: 'hrm',
  },
  {
    id: 'crm',
    title: 'CRM',
    description: 'Manage customer relationship workflows from one place as soon as the module is enabled for your account.',
    icon: ShieldCheck,
    accessKey: 'crm',
  },
];

export function OthersSection({ modules: moduleAccessMap = {}, loading = false, className = '' }) {
  const [activeDialog, setActiveDialog] = useState(null);
  const modules = useMemo(
    () =>
      otherModules.map((module) => ({
        ...module,
        enabled: Boolean(moduleAccessMap?.[module.accessKey]?.enabled),
        href: moduleAccessMap?.[module.accessKey]?.href || null,
      })),
    [moduleAccessMap]
  );

  return (
    <section id="others-section" className={`relative px-4 py-16 md:py-20 ${className}`.trim()}>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(196,181,253,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(221,214,254,0.22),_transparent_30%)]" />

      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-4">
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
        </div>

        {loading ? (
          <ModuleCardsSkeleton />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => {
            const Icon = module.icon;

            const isEnabled = module.enabled;
            const statusClassName = isEnabled
              ? 'bg-emerald-100 text-emerald-700 ring-emerald-200/80'
              : 'bg-red-100 text-red-700 ring-red-200/80';

            const cardClassName = `relative block h-full overflow-hidden rounded-[28px] border p-6 text-left shadow-[0_18px_60px_rgba(15,23,42,0.08),0_3px_0_rgba(226,232,240,0.9)] backdrop-blur transition-all duration-400 [transform-style:preserve-3d] ${
              isEnabled
                ? 'border-violet-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,243,255,0.96))] hover:-translate-y-1.5 hover:shadow-[0_28px_70px_rgba(15,23,42,0.14),0_4px_0_rgba(221,214,254,0.9)]'
                : 'border-violet-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,243,255,0.96))] hover:-translate-y-1'
            }`;

            const handleModuleClick = (event) => {
              if (module.href) {
                return;
              }

              event.preventDefault();
              setActiveDialog({
                title: isEnabled ? `${module.title} Not Ready Yet` : `No Access To ${module.title}`,
                message: isEnabled
                  ? `${module.title} access is enabled for your account, but this module page is not available yet.`
                  : `You do not have access to the ${module.title} module. Please contact HR Admin if you need access.`,
              });
            };

              return (
                <div key={module.id} className="group relative [perspective:1400px]">
                  <Link
                    href={module.href || '#'}
                    onClick={handleModuleClick}
                    className={cardClassName}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.98),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(237,233,254,0.65),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.72),transparent_56%)] opacity-95" />
                    <div className="absolute inset-x-[10px] inset-y-[10px] rounded-[22px] border border-white/60 opacity-90" />
                    <div className="relative mb-10 flex items-start justify-between gap-4 [transform:translateZ(18px)]">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#a78bfa_0%,#7c3aed_100%)] text-white shadow-[0_14px_28px_rgba(124,58,237,0.24)] ring-1 ring-white/50 transition-transform duration-400 group-hover:scale-[1.03]"
                      >
                        <Icon size={24} />
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-sm ring-1 ${statusClassName}`}>
                        {isEnabled ? 'Access On' : 'Access Off'}
                      </span>
                    </div>

                    <div className="relative [transform:translateZ(14px)]">
                      <h3 className="text-2xl font-bold tracking-tight">{module.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{module.description}</p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeDialog ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/80 bg-white p-6 shadow-[0_30px_70px_rgba(15,23,42,0.20)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <span className="material-symbols-outlined text-[24px]">lock</span>
              </div>
              <div>
                <p className="text-lg font-extrabold text-slate-900">{activeDialog.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{activeDialog.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
