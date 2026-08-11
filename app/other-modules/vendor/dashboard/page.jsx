'use client';

import React from 'react';
import { useVendor } from '../layout';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Receipt,
  CheckCircle2,
  IndianRupee,
  ArrowUpRight,
  HandCoins
} from 'lucide-react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
};

export default function VendorDashboard() {
  const { stats, payments, loading, user } = useVendor();

  const COLORS = ['#3b82f6', '#10b981'];

  const pieData = [
    { name: 'Vendor Payments', value: stats.typeDistribution?.vendor?.amount || 0 },
    { name: 'Full & Final', value: stats.typeDistribution?.ff?.amount || 0 }
  ];

  const recentPayments = (payments || []).slice(0, 5);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-250/20">
            Paid
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-250/20">
            Approved
          </span>
        );
      default:
        return (
          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-250/20">
            Invoice Uploaded
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-semibold text-sm">Loading dashboard analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome, {user?.name || 'Partner'}
          </h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
            From Invoice to Payment, Simplified. Here is a summary of vendor payments and settlement workflows.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:shadow-md transition-all duration-300 hover:border-blue-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Total Payments</span>
            <div className="p-2.5 rounded-2xl bg-[linear-gradient(135deg,#e0f2fe_0%,#bae6fd_100%)] text-sky-700 shadow-xs">
              <Receipt className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{stats.totalPayments}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Submissions recorded</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:shadow-md transition-all duration-300 hover:border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Total Outflow</span>
            <div className="p-2.5 rounded-2xl bg-[linear-gradient(135deg,#d1fae5_0%,#a7f3d0_100%)] text-emerald-700 shadow-xs">
              <IndianRupee className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(stats.totalAmount)}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Combined payout value</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:shadow-md transition-all duration-300 hover:border-violet-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Approved Entries</span>
            <div className="p-2.5 rounded-2xl bg-[linear-gradient(135deg,#ede9fe_0%,#ddd6fe_100%)] text-violet-700 shadow-xs">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{stats.approvedCount}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Approved & processing</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:shadow-md transition-all duration-300 hover:border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Settled/Paid</span>
            <div className="p-2.5 rounded-2xl bg-[linear-gradient(135deg,#fef3c7_0%,#fde68a_100%)] text-amber-700 shadow-xs">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{stats.paidCount}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Disbursed transactions</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <h2 className="text-base md:text-lg font-bold text-slate-900">Monthly Expense Trend</h2>
          <p className="text-xs text-slate-400 mt-1 mb-5">Payment outflow trend for the past few months</p>
          
          <div className="h-60 w-full">
            {stats.monthlyTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    formatter={(v) => [formatCurrency(v), 'Outflow']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs md:text-sm text-slate-400">
                No monthly transactions recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Share Distribution Chart */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col">
          <h2 className="text-base md:text-lg font-bold text-slate-900">Category Distribution</h2>
          <p className="text-xs text-slate-400 mt-1 mb-5">Split between Vendor and F&F payouts</p>
          
          <div className="h-52 flex-1 relative flex items-center justify-center">
            {stats.totalAmount > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    formatter={(v) => [formatCurrency(v), 'Share']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" fontSize={10} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs md:text-sm text-slate-400 text-center">
                No distribution data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Payments Section */}
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-900">Recent Transactions</h2>
            <p className="text-xs text-slate-400 mt-1">Latest updates across payments and settlements</p>
          </div>
        </div>

        <div className="overflow-x-auto w-full [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <table className="w-full text-left text-sm border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pt-2">Vendor Name</th>
                <th className="pb-3 pt-2">Nature of Payment</th>
                <th className="pb-3 pt-2">Type</th>
                <th className="pb-3 pt-2">Invoice Date</th>
                <th className="pb-3 pt-2">Amount</th>
                <th className="pb-3 pt-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {recentPayments.length > 0 ? (
                recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-semibold text-slate-900 text-xs md:text-sm">{p.vendor_name}</td>
                    <td className="py-3 text-xs text-slate-500">{p.nature_of_payment}</td>
                    <td className="py-3 text-xs">
                      {p.payment_type === 'vendor_payment' ? (
                        <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                          <Receipt className="w-3.5 h-3.5" /> Vendor
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                          <HandCoins className="w-3.5 h-3.5" /> Full & Final
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-xs text-slate-500">
                      {new Date(p.invoice_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 font-bold text-slate-900 text-xs md:text-sm">{formatCurrency(p.amount)}</td>
                    <td className="py-3">{getStatusBadge(p.payment_status)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium text-xs">
                    No transactions found. Go to Vendor Payment or Full & Final pages to add entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
