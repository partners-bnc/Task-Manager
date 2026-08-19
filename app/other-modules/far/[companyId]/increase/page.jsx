'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  TrendingUp,
  Plus,
  Calendar,
  Layers,
  IndianRupee,
  PlusCircle,
  X,
  FileText,
  Trash2
} from 'lucide-react';

export default function FarIncrease() {
  const params = useParams();
  const companyId = params?.companyId;

  const [assets, setAssets] = useState([]);
  const [increases, setIncreases] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    assetId: '',
    qtyIncrease: 1,
    valueIncrease: 0,
    date: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  // Load from localStorage
  useEffect(() => {
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

  // Sync Register Count helper
  const syncRegisterCount = (updatedAssets) => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('far-registers');
    if (stored) {
      const list = JSON.parse(stored);
      const updated = list.map((item) => {
        if (item.id === companyId) {
          return { ...item, assetsCount: updatedAssets.length };
        }
        return item;
      });
      localStorage.setItem('far-registers', JSON.stringify(updated));
    }
  };

  // Save changes
  const saveAll = (newAssets, newIncreases) => {
    setAssets(newAssets);
    setIncreases(newIncreases);
    localStorage.setItem(`far-assets-${companyId}`, JSON.stringify(newAssets));
    localStorage.setItem(`far-increases-${companyId}`, JSON.stringify(newIncreases));
    syncRegisterCount(newAssets);
  };

  // KPIs
  const totalTransactions = useMemo(() => increases.length, [increases]);
  const totalQtyAdded = useMemo(() => {
    return increases.reduce((sum, item) => sum + (Number(item.qtyIncrease) || 0), 0);
  }, [increases]);
  const totalValueAdded = useMemo(() => {
    return increases.reduce((sum, item) => sum + (Number(item.valueIncrease) || 0), 0);
  }, [increases]);

  // Asset Lookup Map
  const assetMap = useMemo(() => {
    return new Map(assets.map((a) => [a.id, a]));
  }, [assets]);

  // Handle Form Input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'qtyIncrease'
          ? Math.max(1, parseInt(value, 10) || 1)
          : name === 'valueIncrease'
          ? Math.max(0, parseInt(value, 10) || 0)
          : value,
    }));
  };

  // Submit log
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.assetId) return;

    const newIncrease = {
      ...formData,
      id: `far-inc-${Date.now()}`,
    };

    // Update corresponding asset's quantity
    const updatedAssets = assets.map((asset) => {
      if (asset.id === formData.assetId) {
        return {
          ...asset,
          quantity: (Number(asset.quantity) || 0) + Number(formData.qtyIncrease),
        };
      }
      return asset;
    });

    const updatedIncreases = [newIncrease, ...increases];

    saveAll(updatedAssets, updatedIncreases);
    setShowAddModal(false);

    // Reset Form
    setFormData({
      assetId: '',
      qtyIncrease: 1,
      valueIncrease: 0,
      date: new Date().toISOString().split('T')[0],
      remarks: '',
    });
  };

  // Delete transaction log (and revert quantity)
  const handleDeleteLog = (id) => {
    if (confirm('Reverting this addition transaction will decrease the corresponding asset quantity. Proceed?')) {
      const logItem = increases.find((item) => item.id === id);
      if (!logItem) return;

      const updatedAssets = assets.map((asset) => {
        if (asset.id === logItem.assetId) {
          return {
            ...asset,
            quantity: Math.max(0, (Number(asset.quantity) || 0) - Number(logItem.qtyIncrease)),
          };
        }
        return asset;
      });

      const updatedIncreases = increases.filter((item) => item.id !== id);
      saveAll(updatedAssets, updatedIncreases);
    }
  };

  return (
    <div className="space-y-6 animate-none">
      {/* Header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-headline">Asset Additions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track acquisitions, capitalization increases, and item revaluations.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/10 hover:bg-blue-700 transition-all flex items-center gap-2 cursor-pointer ml-auto"
        >
          <Plus className="w-4 h-4" />
          Log Value Increase
        </button>
      </section>

      {/* KPI summaries */}
      <section className="grid gap-5 grid-cols-1 md:grid-cols-3">
        <div className="bg-white border border-slate-200/70 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Log Transactions</span>
            <span className="text-xl font-extrabold text-slate-800 tracking-tight block mt-0.5">{totalTransactions}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/70 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Quantity Added</span>
            <span className="text-xl font-extrabold text-slate-800 tracking-tight block mt-0.5">{totalQtyAdded} items</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/70 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Capitalization Increase</span>
            <span className="text-xl font-extrabold text-slate-800 tracking-tight block mt-0.5">₹{totalValueAdded.toLocaleString()}</span>
          </div>
        </div>
      </section>

      {/* Log Table */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_4px_25px_rgba(15,23,42,0.015)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 text-left">
                <th className="py-4 px-5 w-16">S.No</th>
                <th className="py-4 px-4 w-32">Date</th>
                <th className="py-4 px-4 w-28">Asset Code</th>
                <th className="py-4 px-4 w-52">Description</th>
                <th className="py-4 px-4 w-28 text-center">Qty Added</th>
                <th className="py-4 px-4 w-36 text-right">Value Increase</th>
                <th className="py-4 px-4">Remarks</th>
                <th className="py-4 px-5 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {increases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                    <span>No addition transactions logged yet.</span>
                  </td>
                </tr>
              ) : (
                increases.map((item, idx) => {
                  const targetAsset = assetMap.get(item.assetId);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-5 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-4 px-4 font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-slate-800">
                        {targetAsset?.assetCode || 'Unknown Code'}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900 truncate max-w-[200px]" title={targetAsset?.description}>
                        {targetAsset?.description || 'Deleted Asset'}
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-slate-800 font-mono">
                        +{item.qtyIncrease}
                      </td>
                      <td className="py-4 px-4 text-right font-extrabold text-blue-600 font-mono">
                        ₹{(Number(item.valueIncrease) || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-slate-500 max-w-[300px] truncate" title={item.remarks}>
                        {item.remarks || '--'}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <button
                          onClick={() => handleDeleteLog(item.id)}
                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Revert Transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - LOG VALUE/QTY INCREASE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs px-4">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-[0_30px_75px_rgba(15,23,42,0.18)] p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600" />
                Log Asset Increase
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Select Target Asset</label>
                <select
                  required
                  name="assetId"
                  value={formData.assetId}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 cursor-pointer font-medium"
                >
                  <option value="">-- Choose Asset --</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      [{asset.assetCode}] {asset.description} ({asset.plant})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Qty Increase</label>
                  <input
                    type="number"
                    required
                    min="1"
                    name="qtyIncrease"
                    value={formData.qtyIncrease}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Value Increase (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    name="valueIncrease"
                    value={formData.valueIncrease}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Date of Addition</label>
                <input
                  type="date"
                  required
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Remarks / Details</label>
                <textarea
                  name="remarks"
                  placeholder="Reason for purchase, capitalization notes, vendor details, etc."
                  value={formData.remarks}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/10 transition-colors cursor-pointer"
                >
                  Log Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
