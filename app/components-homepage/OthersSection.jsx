import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ModuleCardsSkeleton } from './ExperienceLoaders';

const otherModules = [
  {
    id: 'auditing',
    title: 'Auditing',
    image: '/assets/Audit.jpeg',
    video: '/assets/gif 4th.mp4',
    accessKey: 'auditing',
  },
  {
    id: 'task-management',
    title: 'Task Management',
    image: '/assets/task.jpeg',
    video: '/assets/gif 3rd.mp4',
    accessKey: 'taskManager',
  },
  {
    id: 'hrm',
    title: 'HRM',
    image: '/assets/hrm.jpeg',
    video: '/assets/WhatsApp Video 2026-07-15 at 1.21.57 PM.mp4',
    accessKey: 'hrm',
  },
  {
    id: 'crm',
    title: 'CRM',
    image: '/assets/crm.jpeg',
    video: '/assets/gif 2nd.mp4',
    accessKey: 'crm',
  },
  {
    id: 'vendor',
    title: 'Vendor',
    image: '/assets/other.gif',
    video: null,
    accessKey: 'vendor',
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
    <section id="others-section" className={`w-full flex flex-col gap-6 md:gap-4 items-center justify-center bg-transparent ${className}`.trim()}>

      {/* Header Block - Dynamic height on mobile (h-auto py-4) and fixed on desktop (md:h-[100px]) */}
      <div className="w-full relative h-auto py-4 md:py-0 md:h-[100px] flex flex-col justify-center items-center text-center overflow-visible shrink-0 bg-transparent">

        {/* Stylish Typography - Adjusted margins for mobile clearance */}
        <div className="relative z-20 flex flex-col items-center px-6 mt-2 md:mt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-[11px] font-extrabold uppercase tracking-[0.28em] text-black mb-3 bg-white/95 border border-slate-200 shadow-xs">
            Other Modules
          </span>
          
          <h2 className="text-4xl md:text-5xl font-serif font-medium italic tracking-tight text-black mt-0">
            Access all your operations in one platform
          </h2>
        </div>
      </div>

      {/* Cards Container - Constrained to max-w-[1440px] and centered */}
      <div className="w-full max-w-[1440px] px-6 md:px-8">
        {loading ? (
          <ModuleCardsSkeleton />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 w-full">
            {modules.map((module) => {
              const isEnabled = module.enabled;
              const statusClassName = isEnabled
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/50'
                : 'bg-red-50 text-red-600 ring-red-200/50';

              // Cards preserved at h-[300px]
              const cardClassName = `relative block w-full h-[300px] overflow-hidden rounded-[28px] border text-left shadow-[0_12px_45px_rgba(15,23,42,0.05),0_3px_0_rgba(226,232,240,0.9)] backdrop-blur transition-all duration-500 [transform-style:preserve-3d] ${isEnabled
                ? 'border-blue-200/60 bg-white hover:-translate-y-2 hover:[transform:rotateX(6deg)_rotateY(-4deg)_translateZ(10px)] hover:shadow-[0_28px_70px_rgba(3,114,204,0.15),0_4px_0_rgba(147,197,253,0.9)]'
                : 'border-blue-200/60 bg-white hover:-translate-y-1 hover:[transform:rotateX(4deg)_rotateY(-2deg)_translateZ(5px)]'
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
                    {/* Full cover image or video inside card */}
                    <div className="absolute inset-0 z-0 h-full w-full">
                      {module.video ? (
                        <video
                          src={module.video}
                          poster={module.image}
                          preload="auto"
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                        />
                      ) : (
                        <img
                          src={module.image}
                          alt={module.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                        />
                      )}
                      <div className="absolute inset-0 bg-slate-950/10 transition-opacity duration-300 group-hover:opacity-0" />
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-4 right-4 z-20">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ring-1 flex items-center gap-1.5 ${statusClassName}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        Access {isEnabled ? 'On' : 'Off'}
                      </span>
                    </div>

                    {/* Taller transparent overlay light white gradient (bottom 35% overlay) containing large title & interactive action button */}
                    <div className="absolute bottom-0 inset-x-0 h-[35%] bg-gradient-to-t from-white via-white/85 to-transparent flex items-end justify-between pb-6 px-6 z-20">
                      <h3 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 transition-colors duration-300 group-hover:text-[#0372CC]">
                        {module.title}
                      </h3>
                      
                      {/* Interactive Action Button indicating clickability */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs transition-all duration-300 group-hover:border-[#0372CC] group-hover:bg-[#0372CC] group-hover:text-white group-hover:scale-110 group-hover:shadow-md">
                        <span className="material-symbols-outlined text-[20px] font-bold">arrow_forward</span>
                      </div>
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
