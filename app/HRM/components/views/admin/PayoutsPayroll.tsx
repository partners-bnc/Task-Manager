import React from 'react';

export default function PayoutsPayroll() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Payouts & Payroll</h2>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
              <span>Payroll Scheduled for Oct 28, 2023</span>
            </div>
            <span className="text-on-surface-variant text-sm font-medium italic">Next cycle starts in 12 days</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-surface-container-lowest text-on-surface border border-outline-variant/15 hover:bg-surface-container-low transition-colors active:scale-95">
            <span className="material-symbols-outlined text-lg">download</span>
            <span>Download Report</span>
          </button>
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-primary text-on-primary shadow-lg shadow-primary/25 hover:brightness-110 active:scale-95 transition-all">
            <span className="material-symbols-outlined text-lg">account_balance</span>
            <span>Process Payroll</span>
          </button>
        </div>
      </section>

      {/* Monthly Summary Bento */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Payout */}
        <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[160px] border border-outline-variant/10 hover:-translate-y-1 transition-transform">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Total Payout</span>
              <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">payments</span>
            </div>
            <p className="text-3xl font-extrabold font-headline">$428,500.00</p>
          </div>
          <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>4.2% vs last month</span>
          </div>
        </div>

        {/* Taxes */}
        <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[160px] border border-outline-variant/10 hover:-translate-y-1 transition-transform">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Taxes</span>
              <span className="material-symbols-outlined text-secondary bg-secondary-container p-2 rounded-lg">account_balance_wallet</span>
            </div>
            <p className="text-3xl font-extrabold font-headline">$84,120.50</p>
          </div>
          <p className="text-xs text-on-surface-variant font-medium">Estimated federal & state</p>
        </div>

        {/* Bonuses */}
        <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[160px] border border-outline-variant/10 hover:-translate-y-1 transition-transform">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Bonuses</span>
              <span className="material-symbols-outlined text-tertiary bg-tertiary-container p-2 rounded-lg">redeem</span>
            </div>
            <p className="text-3xl font-extrabold font-headline">$12,400.00</p>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant text-xs font-bold">
            <span className="material-symbols-outlined text-sm">info</span>
            <span>Performance-linked only</span>
          </div>
        </div>

        {/* Net Amount */}
        <div className="bg-primary text-white p-6 rounded-[1.5rem] shadow-xl shadow-primary/20 flex flex-col justify-between min-h-[160px] hover:-translate-y-1 transition-transform">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold opacity-80 uppercase tracking-widest text-white">Net Amount</span>
              <span className="material-symbols-outlined opacity-80" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
            </div>
            <p className="text-3xl font-extrabold font-headline">$331,979.50</p>
          </div>
          <div className="py-1 px-3 bg-white/20 rounded-full w-fit">
            <p className="text-[10px] font-bold uppercase tracking-tighter">Ready for Disbursal</p>
          </div>
        </div>
      </section>

      {/* Payouts Table Section */}
      <section className="bg-surface-container-lowest rounded-[1.5rem] overflow-hidden shadow-sm border border-outline-variant/10">
        <div className="px-8 py-6 border-b border-outline-variant/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="text-xl font-extrabold font-headline">Individual Employee Payouts</h3>
          <div className="flex gap-4 w-full sm:w-auto">
            <select className="bg-surface-container-low border-none rounded-lg text-xs font-bold px-4 py-2 focus:ring-1 focus:ring-primary w-full sm:w-auto outline-none">
              <option>All Departments</option>
              <option>Engineering</option>
              <option>Marketing</option>
              <option>Design</option>
            </select>
            <button className="p-2 hover:bg-surface-container-low rounded-lg transition-colors flex bg-surface-container border border-outline-variant/10">
              <span className="material-symbols-outlined text-on-surface-variant">filter_list</span>
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Employee</th>
                <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Base Salary</th>
                <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Deductions</th>
                <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Net Pay</th>
                <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant text-center">Status</th>
                <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {/* Row 1 */}
              <tr className="hover:bg-surface-container-low/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <img 
                      alt="Sarah Chen" 
                      className="w-10 h-10 rounded-full object-cover shadow-sm bg-surface-container" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPudOFY7JRp6Ucq6xCemYp6Z0JNujJp5mC42IyQGhaBMHo6uHyZOlZIFInDAz-IDrnGpdTceY5f4BmaRsX2S8xtopkbjnYpFlxVvFy8w4_5OQXUzcoiNoaMmp-BzgnqHmVsHEOrgBY7DWATHB6Eg0dK6KdWI18P_NS8Eu93EtpyF4Y0ZwogeVq0ClP7VU9rSGQ48Av_S61m7mv5V8nPNyVVP8PPXz3NwDpBaiUcPUzUk6tSH8WeNj4vHB73f6_GAGlTcI5lrTgp-Q"
                    />
                    <div>
                      <p className="font-bold text-on-surface">Sarah Chen</p>
                      <p className="text-xs text-on-surface-variant font-medium">Lead Product Designer</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5 font-medium">$8,500.00</td>
                <td className="px-8 py-5 text-error font-semibold">-$1,240.00</td>
                <td className="px-8 py-5 font-bold text-on-surface">$7,260.00</td>
                <td className="px-8 py-5">
                  <div className="mx-auto w-fit flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/50 text-emerald-700 text-[10px] font-bold uppercase tracking-tight border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Paid
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-primary/10 rounded-lg text-primary transition-all active:scale-95">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                  </button>
                </td>
              </tr>
              
              {/* Row 2 */}
              <tr className="hover:bg-surface-container-low/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <img 
                      alt="Marcus Thompson" 
                      className="w-10 h-10 rounded-full object-cover shadow-sm bg-surface-container" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJVerYg19Y9QqASXIo514AM9uP7mrXQt9JvvosNQ8R6X7W5pprkixs3aIosYc-FcXhr1C_o-4ivKt2kuxxowRejgI1QiyiARs0In1lyayp5CBoAfZcTpnh61TQQ_1iaoIFFFdnnuwsw1jgh7eYUyUv5nbJKkuz-f_KtvUnuw9TjYewASO4YgJtymk7arWzMLYg915zLCbnH-jvExx73qMt_is6LQ0h4UrmSZ44l7EkYcCHObjSimxbENsAsz8mjVEekIaLXmks28A"
                    />
                    <div>
                      <p className="font-bold text-on-surface">Marcus Thompson</p>
                      <p className="text-xs text-on-surface-variant font-medium">Senior DevOps Engineer</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5 font-medium">$9,200.00</td>
                <td className="px-8 py-5 text-error font-semibold">-$1,450.00</td>
                <td className="px-8 py-5 font-bold text-on-surface">$7,750.00</td>
                <td className="px-8 py-5">
                  <div className="mx-auto w-fit flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/50 text-amber-700 text-[10px] font-bold uppercase tracking-tight border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Pending
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-primary/10 rounded-lg text-primary transition-all active:scale-95">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                  </button>
                </td>
              </tr>
              
              {/* Row 3 */}
              <tr className="hover:bg-surface-container-low/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <img 
                      alt="Elena Rodriguez" 
                      className="w-10 h-10 rounded-full object-cover shadow-sm bg-surface-container" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZYur-siZo-S8ZG80l1BZQPiJxdVFM5m-l30VrvGQhLn6qdJ32w5QDRUe4YIZ0YnoHbXIqTC4nF3CqAlKeyUzbhZiw5B7xD6NvoPKiPp8Xb7NEQbrmQChzC0zX9qr2LBNotYvr-LqHzOXG44-jPhiF6yuMJrsO9MiPhS-9s3jIid0exMpH6umiZayUEu3B75Z_FwquI1Z2IrmGA-jwXMjrUYmOh_ju68TXi55cFRkQ1vSTXK8exxTSr0pqqACgjMCSxeFz1DR-HXQ"
                    />
                    <div>
                      <p className="font-bold text-on-surface">Elena Rodriguez</p>
                      <p className="text-xs text-on-surface-variant font-medium">HR Specialist</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5 font-medium">$6,800.00</td>
                <td className="px-8 py-5 text-error font-semibold">-$890.00</td>
                <td className="px-8 py-5 font-bold text-on-surface">$5,910.00</td>
                <td className="px-8 py-5">
                  <div className="mx-auto w-fit flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/50 text-emerald-700 text-[10px] font-bold uppercase tracking-tight border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Paid
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-primary/10 rounded-lg text-primary transition-all active:scale-95">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                  </button>
                </td>
              </tr>
              
              {/* Row 4 */}
              <tr className="hover:bg-surface-container-low/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <img 
                      alt="James Wilson" 
                      className="w-10 h-10 rounded-full object-cover shadow-sm bg-surface-container" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7u0tj2FNEipO3gVlL5AtvgfxgrtVE35X1PyF-onCzPKxCgb0Cw1tz9IqeDbzIu9ZA1R0DAdAIl78TGp67ZUCkCn1lyA_v-NtBliKc1Bm97P6junfoOk4q43NwGB6oblSxJAXO1hd-JXbJDmIRTRmortGxKhN0SJwBAjJOj7HZJU_XeU-CyD2LBAVoX4EFs5merz568ey1g7FDI8LyljObdKWSyGO3FaC5iTowysESO7hb7NwD2FBXpPn6e3W8JV2VBGcLGxLNM9o"
                    />
                    <div>
                      <p className="font-bold text-on-surface">James Wilson</p>
                      <p className="text-xs text-on-surface-variant font-medium">Marketing Manager</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5 font-medium">$7,500.00</td>
                <td className="px-8 py-5 text-error font-semibold">-$1,100.00</td>
                <td className="px-8 py-5 font-bold text-on-surface">$6,400.00</td>
                <td className="px-8 py-5">
                  <div className="mx-auto w-fit flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/50 text-amber-700 text-[10px] font-bold uppercase tracking-tight border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Pending
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-primary/10 rounded-lg text-primary transition-all active:scale-95">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline-variant/10 bg-surface/50">
          <p className="text-xs text-on-surface-variant font-medium">Showing 4 of 124 employees</p>
          <div className="flex gap-2">
            <button className="h-8 w-8 flex items-center justify-center border border-outline-variant/20 rounded-lg hover:bg-surface-container-lowest transition-colors bg-white">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-lg font-bold text-xs shadow-sm">1</button>
            <button className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-lowest transition-colors rounded-lg font-bold text-xs bg-white border border-transparent hover:border-outline-variant/10 text-on-surface-variant hover:text-on-surface">2</button>
            <button className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-lowest transition-colors rounded-lg font-bold text-xs bg-white border border-transparent hover:border-outline-variant/10 text-on-surface-variant hover:text-on-surface">3</button>
            <button className="h-8 w-8 flex items-center justify-center border border-outline-variant/20 rounded-lg hover:bg-surface-container-lowest transition-colors bg-white">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </section>

      {/* Contextual Action Banner */}
      <section className="bg-tertiary-container/30 rounded-[2rem] p-10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-tertiary/10">
        <div className="relative z-10 max-w-lg text-center md:text-left">
          <h4 className="text-2xl font-extrabold font-headline mb-3 text-on-surface">Optimize your tax filings</h4>
          <p className="text-on-surface-variant font-medium leading-relaxed">Lumina&apos;s new AI-driven tax engine can help you automate quarterly reporting and ensure compliance across all 50 states.</p>
          <button className="mt-6 px-6 py-3 bg-tertiary text-white rounded-xl font-bold border-b-2 border-tertiary-dim hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg transition-all">
            Enable Automation
          </button>
        </div>
        
        <div className="relative z-10 w-full md:w-auto">
          <div className="bg-surface/80 backdrop-blur-md p-6 rounded-2xl border border-white shadow-xl max-w-xs rotate-3 mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-tertiary flex items-center justify-center text-white shadow-inner">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              </div>
              <div>
                <p className="font-bold text-on-surface">AI Savings</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-tertiary">Oct 2023 Update</p>
              </div>
            </div>
            <div className="h-2 w-full bg-surface-variant rounded-full mb-3 overflow-hidden">
              <div className="h-full w-[85%] bg-tertiary rounded-full"></div>
            </div>
            <p className="text-xs font-bold text-on-surface-variant text-right">85% reduction in errors</p>
          </div>
        </div>
        
        {/* Decorative blob */}
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-tertiary-container rounded-full blur-3xl opacity-50"></div>
      </section>
    </div>
  );
}
