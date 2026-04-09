import React from 'react';

export default function EmployeeAnalytics() {
  return (
    <div className="p-10 bg-surface w-full">
      {/* Header Section: Editorial Sanctuary Style */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12">
        <div className="max-w-2xl">
          <h2 className="font-headline text-5xl font-extrabold text-on-surface tracking-tight mb-4">Workforce Intelligence</h2>
          <p className="text-on-surface-variant text-lg leading-relaxed">
            A sanctuary for decision-making. Monitor the health, pulse, and movement of your organization through high-fidelity behavioral data.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-lowest text-on-surface font-semibold rounded-xl hover:bg-surface-container transition-colors shadow-sm border border-outline-variant/10">
            <span className="material-symbols-outlined text-xl">calendar_today</span>
            Last 12 Months
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-xl">download</span>
            Export PDF
          </button>
        </div>
      </div>

      {/* AI Insights Banner (Bento Style) */}
      <div className="grid grid-cols-12 gap-8 mb-12">
        <div className="col-span-12 lg:col-span-8 bg-tertiary-container rounded-[2rem] p-8 flex items-center gap-10 overflow-hidden relative shadow-sm">
          <div className="relative z-10 space-y-4 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/40 rounded-full text-xs font-bold text-on-tertiary-container backdrop-blur-sm">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              AI ANALYTICS INSIGHT
            </div>
            <h3 className="font-headline text-3xl font-bold text-on-tertiary-container leading-tight">
              Turnover is 12% higher in Engineering compared to Sales.
            </h3>
            <p className="text-on-tertiary-fixed-variant text-base">
              Current data suggests high workload and lack of growth opportunities as primary drivers. Recommending career path review for Senior II roles.
            </p>
            <button className="text-sm font-bold text-primary flex items-center gap-2 pt-2 group bg-white/50 w-fit px-4 py-2 rounded-lg hover:bg-white/70 transition-colors">
              Explore Strategy
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
          <div className="absolute right-[-5%] top-[-10%] opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[300px]" style={{ fontVariationSettings: "'wght' 100" }}>insights</span>
          </div>
        </div>

        {/* Quick Stats Chips */}
        <div className="col-span-12 lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] flex flex-col justify-between hover:shadow-xl transition-shadow group border border-outline-variant/10">
            <span className="material-symbols-outlined text-primary mb-4 p-2 bg-primary/10 w-fit rounded-lg group-hover:scale-110 transition-transform">person_add</span>
            <div>
              <p className="text-[11px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">Retention</p>
              <h4 className="text-2xl font-bold font-headline">94.2%</h4>
              <p className="text-xs text-green-600 font-bold flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                +2.4%
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] flex flex-col justify-between hover:shadow-xl transition-shadow group border border-outline-variant/10">
            <span className="material-symbols-outlined text-error mb-4 p-2 bg-error/10 w-fit rounded-lg group-hover:scale-110 transition-transform">group_off</span>
            <div>
              <p className="text-[11px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">Turnover</p>
              <h4 className="text-2xl font-bold font-headline">5.8%</h4>
              <p className="text-xs text-red-600 font-bold flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-xs">trending_down</span>
                -0.8%
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] flex flex-col justify-between hover:shadow-xl transition-shadow group border border-outline-variant/10">
            <span className="material-symbols-outlined text-secondary mb-4 p-2 bg-secondary/10 w-fit rounded-lg group-hover:scale-110 transition-transform">diversity_3</span>
            <div>
              <p className="text-[11px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">Diversity</p>
              <h4 className="text-2xl font-bold font-headline">68%</h4>
              <p className="text-xs text-on-surface-variant font-bold mt-1">Target: 75%</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] flex flex-col justify-between hover:shadow-xl transition-shadow group border border-outline-variant/10">
            <span className="material-symbols-outlined text-primary mb-4 p-2 bg-primary/10 w-fit rounded-lg group-hover:scale-110 transition-transform">groups</span>
            <div>
              <p className="text-[11px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">Headcount</p>
              <h4 className="text-2xl font-bold font-headline">1,284</h4>
              <p className="text-xs text-green-600 font-bold flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                +42
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid (Asymmetric) */}
      <div className="grid grid-cols-12 gap-8 mb-12">
        {/* Headcount Growth Trend */}
        <div className="col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-[2rem] p-8 border border-outline-variant/10 shadow-sm">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h4 className="font-headline text-xl font-bold">Headcount Growth</h4>
              <p className="text-sm text-on-surface-variant">Net change in workforce size over time</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-low border border-outline-variant/10 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span className="text-xs font-bold">Total</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-low border border-outline-variant/10 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                <span className="text-xs font-bold">Net New</span>
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-4 group">
            <div className="w-full flex flex-col items-center gap-3">
              <div className="w-full bg-primary-container/20 border border-primary-container/30 rounded-t-xl relative group-hover:bg-primary-container/30 transition-all h-[40%] cursor-pointer hover:!bg-primary-container/50">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-surface shadow-sm px-2 py-1 rounded">840</div>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant">JAN</span>
            </div>
            <div className="w-full flex flex-col items-center gap-3">
              <div className="w-full bg-primary-container/20 border border-primary-container/30 rounded-t-xl relative group-hover:bg-primary-container/30 transition-all h-[45%] cursor-pointer hover:!bg-primary-container/50"></div>
              <span className="text-[10px] font-bold text-on-surface-variant">FEB</span>
            </div>
            <div className="w-full flex flex-col items-center gap-3">
              <div className="w-full bg-primary-container/20 border border-primary-container/30 rounded-t-xl relative group-hover:bg-primary-container/30 transition-all h-[52%] cursor-pointer hover:!bg-primary-container/50"></div>
              <span className="text-[10px] font-bold text-on-surface-variant">MAR</span>
            </div>
            <div className="w-full flex flex-col items-center gap-3">
              <div className="w-full bg-primary-container/20 border border-primary-container/30 rounded-t-xl relative group-hover:bg-primary-container/30 transition-all h-[60%] cursor-pointer hover:!bg-primary-container/50"></div>
              <span className="text-[10px] font-bold text-on-surface-variant">APR</span>
            </div>
            <div className="w-full flex flex-col items-center gap-3">
              <div className="w-full bg-primary-container/20 border border-primary-container/30 rounded-t-xl relative group-hover:bg-primary-container/30 transition-all h-[68%] cursor-pointer hover:!bg-primary-container/50"></div>
              <span className="text-[10px] font-bold text-on-surface-variant">MAY</span>
            </div>
            <div className="w-full flex flex-col items-center gap-3">
              <div className="w-full bg-primary-container/20 border border-primary-container/30 rounded-t-xl relative group-hover:bg-primary-container/30 transition-all h-[75%] cursor-pointer hover:!bg-primary-container/50"></div>
              <span className="text-[10px] font-bold text-on-surface-variant">JUN</span>
            </div>
            <div className="w-full flex flex-col items-center gap-3">
              <div className="w-full bg-primary border-t border-white/20 rounded-t-xl relative h-[88%] shadow-lg shadow-primary/20 cursor-pointer">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-surface text-primary shadow-md px-2 py-1 rounded">1,284</div>
              </div>
              <span className="text-[10px] font-bold text-primary">JUL</span>
            </div>
          </div>
        </div>

        {/* Performance Heatmap */}
        <div className="col-span-12 lg:col-span-5 bg-surface-container-lowest rounded-[2rem] p-8 flex flex-col border border-outline-variant/10 shadow-sm">
          <div className="mb-8">
            <h4 className="font-headline text-xl font-bold">Performance Matrix</h4>
            <p className="text-sm text-on-surface-variant">Cross-departmental output scores</p>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4 group">
              <span className="w-24 text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter group-hover:text-on-surface transition-colors">Engineering</span>
              <div className="flex-1 flex gap-1">
                <div className="flex-1 h-8 bg-primary/20 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/40 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/60 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/80 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary rounded-sm shadow-sm group-hover:scale-[1.02] transition-transform"></div>
              </div>
              <span className="text-xs font-bold text-primary group-hover:scale-110 transition-transform">4.8</span>
            </div>
            <div className="flex items-center gap-4 group">
              <span className="w-24 text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter group-hover:text-on-surface transition-colors">Design</span>
              <div className="flex-1 flex gap-1">
                <div className="flex-1 h-8 bg-primary/20 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/40 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/60 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/80 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/90 rounded-sm shadow-sm group-hover:scale-[1.02] transition-transform"></div>
              </div>
              <span className="text-xs font-bold group-hover:scale-110 transition-transform">4.6</span>
            </div>
            <div className="flex items-center gap-4 group">
              <span className="w-24 text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter group-hover:text-on-surface transition-colors">Marketing</span>
              <div className="flex-1 flex gap-1">
                <div className="flex-1 h-8 bg-primary/10 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/20 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/30 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/40 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/50 rounded-sm group-hover:scale-[1.02] transition-transform"></div>
              </div>
              <span className="text-xs font-bold group-hover:scale-110 transition-transform">3.2</span>
            </div>
            <div className="flex items-center gap-4 group">
              <span className="w-24 text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter group-hover:text-on-surface transition-colors">Operations</span>
              <div className="flex-1 flex gap-1">
                <div className="flex-1 h-8 bg-primary/10 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/20 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/30 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/40 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/50 rounded-sm group-hover:scale-[1.02] transition-transform"></div>
              </div>
              <span className="text-xs font-bold group-hover:scale-110 transition-transform">3.5</span>
            </div>
            <div className="flex items-center gap-4 group">
              <span className="w-24 text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter group-hover:text-on-surface transition-colors">Sales</span>
              <div className="flex-1 flex gap-1">
                <div className="flex-1 h-8 bg-primary/20 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/40 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/60 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary/80 rounded-sm"></div>
                <div className="flex-1 h-8 bg-primary rounded-sm shadow-sm group-hover:scale-[1.02] transition-transform"></div>
              </div>
              <span className="text-xs font-bold text-primary group-hover:scale-110 transition-transform">4.9</span>
            </div>
          </div>
          <div className="mt-8 flex justify-between items-center px-2">
            <span className="text-[10px] font-bold text-on-surface-variant">Low Output</span>
            <div className="flex-1 h-1.5 mx-4 rounded-full bg-gradient-to-r from-primary/10 to-primary"></div>
            <span className="text-[10px] font-bold text-on-surface-variant">High Output</span>
          </div>
        </div>
      </div>

      {/* Diversity & Inclusion (Editorial Layout) */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-[2rem] p-8 border border-outline-variant/10 shadow-sm">
          <h4 className="font-headline text-xl font-bold mb-8">Gender Balance</h4>
          <div className="relative flex items-center justify-center py-10 group">
            <svg className="w-48 h-48 -rotate-90 group-hover:scale-105 transition-transform duration-500">
              <circle className="text-secondary-container" cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" strokeWidth="20"></circle>
              <circle className="text-primary hover:stroke-primary-dim transition-colors" cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" strokeDasharray="502" strokeDashoffset="230" strokeWidth="20"></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-extrabold font-headline">54%</span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Female</span>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center px-3 py-2 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(139,92,246,0.35)]"></span>
                <span className="text-sm font-semibold text-primary">Female</span>
              </div>
              <span className="text-sm font-extrabold text-primary">54%</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2 hover:bg-surface-container-low transition-colors rounded-lg cursor-default border border-transparent">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-secondary-container"></span>
                <span className="text-sm font-medium">Male</span>
              </div>
              <span className="text-sm font-bold">42%</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2 hover:bg-surface-container-low transition-colors rounded-lg cursor-default border border-transparent">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-surface-variant"></span>
                <span className="text-sm font-medium">Non-binary</span>
              </div>
              <span className="text-sm font-bold">4%</span>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-[2rem] p-8 overflow-hidden relative border border-outline-variant/10 shadow-sm">
          <div className="relative z-10">
            <h4 className="font-headline text-xl font-bold mb-2">Age Distribution</h4>
            <p className="text-sm text-on-surface-variant mb-10">Generational demographic breakdown</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="space-y-4">
                <div className="h-48 bg-surface-container-low/50 border border-outline-variant/10 rounded-2xl relative flex items-end overflow-hidden group cursor-pointer">
                  <div className="w-full bg-secondary-dim/20 h-[25%] group-hover:h-[30%] group-hover:bg-secondary-dim/30 transition-all duration-500 flex justify-center items-start pt-2">
                     <span className="text-[10px] font-bold text-secondary-dim opacity-0 group-hover:opacity-100 transition-opacity">18%</span>
                  </div>
                </div>
                <div>
                  <h5 className="font-bold text-lg font-headline">18%</h5>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-tight mt-1">Gen Z<br/>(18-24)</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-48 bg-surface-container-low/50 border border-outline-variant/10 rounded-2xl relative flex items-end overflow-hidden group cursor-pointer">
                  <div className="w-full bg-primary/80 h-[48%] group-hover:h-[55%] group-hover:bg-primary transition-all duration-500 shadow-[0_-4px_12px_rgba(139,92,246,0.18)] flex justify-center items-start pt-2">
                     <span className="text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">48%</span>
                  </div>
                </div>
                <div className="bg-primary/5 p-2 rounded-lg border border-primary/10 inline-block w-full">
                  <h5 className="font-bold text-lg text-primary font-headline">48%</h5>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-tight mt-1">Millennial<br/>(25-40)</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-48 bg-surface-container-low/50 border border-outline-variant/10 rounded-2xl relative flex items-end overflow-hidden group cursor-pointer">
                  <div className="w-full bg-secondary-dim/20 h-[24%] group-hover:h-[28%] group-hover:bg-secondary-dim/30 transition-all duration-500 flex justify-center items-start pt-2">
                    <span className="text-[10px] font-bold text-secondary-dim opacity-0 group-hover:opacity-100 transition-opacity">24%</span>
                  </div>
                </div>
                <div>
                  <h5 className="font-bold text-lg font-headline">24%</h5>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-tight mt-1">Gen X<br/>(41-56)</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-48 bg-surface-container-low/50 border border-outline-variant/10 rounded-2xl relative flex items-end overflow-hidden group cursor-pointer">
                  <div className="w-full bg-secondary-dim/15 h-[10%] group-hover:h-[15%] group-hover:bg-secondary-dim/25 transition-all duration-500 flex justify-center items-start pt-1">
                    <span className="text-[10px] font-bold text-secondary-dim opacity-0 group-hover:opacity-100 transition-opacity">10%</span>
                  </div>
                </div>
                <div>
                  <h5 className="font-bold text-lg font-headline">10%</h5>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-tight mt-1">Boomer<br/>(57+)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
