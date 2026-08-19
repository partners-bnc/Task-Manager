'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { Layers, Box, Cpu, MapPin, TrendingUp, DollarSign } from 'lucide-react';

const CHART_COLORS = ['#3170c6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function FarDashboard() {
  const params = useParams();
  const companyId = params?.companyId;

  const [assets, setAssets] = useState([]);
  const [increases, setIncreases] = useState([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (companyId && typeof window !== 'undefined') {
      const storedAssets = localStorage.getItem(`far-assets-${companyId}`);
      if (storedAssets) {
        setAssets(JSON.parse(storedAssets));
      }
      const storedIncreases = localStorage.getItem(`far-increases-${companyId}`);
      if (storedIncreases) {
        setIncreases(JSON.parse(storedIncreases));
      }
    }
  }, [companyId]);

  // Calculations for KPIs
  const totalAssets = useMemo(() => assets.length, [assets]);
  const totalQuantity = useMemo(() => {
    return assets.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [assets]);
  
  const uniqueAssetClasses = useMemo(() => {
    return new Set(assets.map((item) => item.assetClass).filter(Boolean)).size;
  }, [assets]);

  const uniquePlants = useMemo(() => {
    return new Set(assets.map((item) => item.plant).filter(Boolean)).size;
  }, [assets]);

  const totalValueAdded = useMemo(() => {
    return increases.reduce((sum, item) => sum + (Number(item.valueIncrease) || 0), 0);
  }, [increases]);

  // Chart Data: Assets count and quantity per Plant
  const plantData = useMemo(() => {
    const counts = {};
    assets.forEach((item) => {
      const plant = item.plant || 'Unknown';
      if (!counts[plant]) {
        counts[plant] = { name: plant, count: 0, quantity: 0 };
      }
      counts[plant].count += 1;
      counts[plant].quantity += Number(item.quantity) || 0;
    });
    return Object.values(counts);
  }, [assets]);

  // Chart Data: Assets by Asset Class (Pie Chart)
  const assetClassData = useMemo(() => {
    const counts = {};
    assets.forEach((item) => {
      const cls = item.assetClass || 'General';
      if (!counts[cls]) {
        counts[cls] = { name: cls, value: 0 };
      }
      counts[cls].value += Number(item.quantity) || 0;
    });
    return Object.values(counts);
  }, [assets]);

  // Chart Data: Value additions trend by date
  const additionsTrendData = useMemo(() => {
    const sortedIncreases = [...increases].sort((a, b) => new Date(a.date) - new Date(b.date));
    let cumulativeValue = 0;
    return sortedIncreases.map((inc) => {
      cumulativeValue += Number(inc.valueIncrease) || 0;
      return {
        date: new Date(inc.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        addition: Number(inc.valueIncrease) || 0,
        cumulative: cumulativeValue,
      };
    });
  }, [increases]);

  // KPI card styling helpers with unique gradient backgrounds and meter accents
  const kpiCards = [
    {
      title: 'Total Asset Types',
      value: totalAssets,
      icon: Layers,
      description: 'Number of unique asset codes',
      bg: 'bg-gradient-to-br from-white to-[#edf4fc]/50',
      meter: 'from-[#3170c6] to-[#4f8be4]'
    },
    {
      title: 'Total Quantity',
      value: totalQuantity,
      icon: Box,
      description: 'Sum of all physical items',
      bg: 'bg-gradient-to-br from-white to-[#eefbf3]/50',
      meter: 'from-[#10b981] to-[#34d399]'
    },
    {
      title: 'Asset Classes',
      value: uniqueAssetClasses,
      icon: Cpu,
      description: 'Different asset classifications',
      bg: 'bg-gradient-to-br from-white to-[#fffbeb]/50',
      meter: 'from-[#f59e0b] to-[#fbbf24]'
    },
    {
      title: 'Active Plants',
      value: uniquePlants,
      icon: MapPin,
      description: 'Registered locations/plants',
      bg: 'bg-gradient-to-br from-white to-[#faf5ff]/50',
      meter: 'from-[#8b5cf6] to-[#a78bfa]'
    },
    {
      title: 'Capital Additions',
      value: `₹${totalValueAdded.toLocaleString()}`,
      icon: TrendingUp,
      description: 'Total value logged via additions',
      bg: 'bg-gradient-to-br from-white to-[#f0f9ff]/50',
      meter: 'from-[#0284c7] to-[#38bdf8]'
    }
  ];

  return (
    <div className="space-y-8 animate-none">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>Register Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
          Real-time analytics and Key Performance Indicators of your Fixed Assets.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <section className="grid gap-5 grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className={`${card.bg} border border-slate-200/70 p-5 rounded-2xl shadow-[0_4px_25px_rgba(15,23,42,0.02)] flex flex-col justify-between h-40`} style={{ fontFamily: "'Inter', sans-serif" }}>
              <div>
                <div className={`w-10 h-1 bg-gradient-to-r ${card.meter} rounded-full mb-3`} />
                <div className="flex items-center gap-2">
                  <Icon className="w-4.5 h-4.5 text-slate-900 shrink-0" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {card.title}
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-2.5">
                  {card.value}
                </h3>
              </div>
              <div className="mt-auto pt-2">
                <p className="text-[10px] text-slate-400 leading-normal">{card.description}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Charts Grid */}
      {isMounted && (
        <section className="grid gap-6 md:grid-cols-2">
          {/* Chart 1: Asset Quantities by Plant */}
          <div className="bg-white border border-slate-200/70 p-6 rounded-2xl shadow-[0_4px_20px_rgba(15,23,42,0.01)] flex flex-col">
            <div className="flex items-center gap-2.5 mb-6">
              <MapPin className="w-5 h-5 text-slate-700 shrink-0" />
              <h3 className="text-base font-bold text-slate-800">Asset Quantities by Plant Location</h3>
            </div>
            <div className="flex-1 min-h-[300px]">
              {plantData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={plantData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                    <Legend iconType="circle" fontSize={11} />
                    <Bar dataKey="quantity" name="Asset Qty" fill="#3170c6" radius={[4, 4, 0, 0]} barSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Asset Class Allocation */}
          <div className="bg-white border border-slate-200/70 p-6 rounded-2xl shadow-[0_4px_20px_rgba(15,23,42,0.01)] flex flex-col">
            <div className="flex items-center gap-2.5 mb-6">
              <Layers className="w-5 h-5 text-slate-700 shrink-0" />
              <h3 className="text-base font-bold text-slate-800">Asset Class Distribution</h3>
            </div>
            <div className="flex-1 min-h-[300px] flex items-center justify-center">
              {assetClassData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available</div>
              ) : (
                <div className="w-full h-full flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-1 h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assetClassData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {assetClassData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend list */}
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto w-full md:w-48 text-xs shrink-0">
                    {assetClassData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                        <span className="text-slate-600 truncate flex-1" title={entry.name}>{entry.name}</span>
                        <span className="font-bold text-slate-800 shrink-0">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chart 3: Capital Addition Increases Timeline */}
          {increases.length > 0 && (
            <div className="bg-white border border-slate-200/70 p-6 rounded-2xl shadow-[0_4px_20px_rgba(15,23,42,0.01)] md:col-span-2 flex flex-col">
              <div className="flex items-center gap-2.5 mb-6">
                <TrendingUp className="w-5 h-5 text-slate-700 shrink-0" />
                <h3 className="text-base font-bold text-slate-800">Capital Expenditure Additions Trend</h3>
              </div>
              <div className="flex-1 min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={additionsTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3170c6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3170c6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                    <Legend iconType="circle" fontSize={11} />
                    <Area type="monotone" dataKey="cumulative" name="Cumulative Value Additions" stroke="#3170c6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCumulative)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
