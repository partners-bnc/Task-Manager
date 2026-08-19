'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/app/components-homepage/Navbar';
import { useWorkspaceRouting } from '@/app/components-homepage/useWorkspaceRouting';
import { Plus, Building2, Calendar, FileText, ArrowRight, Trash2 } from 'lucide-react';

const DEFAULT_MOCK_ASSETS = [
  {
    id: 'far-asset-1',
    plant: 'RHIMIRL_DPMMFG',
    assetClass: 'Electrical Installations & Fittings',
    assetCode: '15000186',
    subNumber: '0',
    vlookup: '150001860',
    description: 'AUTOMATIC CHARGER',
    location: 'DPM_MFG_ELECT',
    quantity: 1,
  },
  {
    id: 'far-asset-2',
    plant: 'RHIMIRL_DPMMFG',
    assetClass: 'Electrical Installations & Fittings',
    assetCode: '15000187',
    subNumber: '0',
    vlookup: '150001870',
    description: '5 HP MOTOR FOR DRIER FAN',
    location: 'DPM_MFG_ELECT',
    quantity: 1,
  },
  {
    id: 'far-asset-3',
    plant: 'RHIMIRL_DPMMFG',
    assetClass: 'Electrical Installations & Fittings',
    assetCode: '15000188',
    subNumber: '0',
    vlookup: '150001880',
    description: '15 HP MOTOR FOR HOT AIR FAN',
    location: 'DPM_MFG_ELECT',
    quantity: 1,
  },
  {
    id: 'far-asset-4',
    plant: 'RHIMIRL_DPMMFG',
    assetClass: 'Electrical Installations & Fittings',
    assetCode: '15000189',
    subNumber: '0',
    vlookup: '150001890',
    description: 'TUNNEL DRIER NO 3',
    location: 'DPM_MFG_ELECT',
    quantity: 1,
  },
  {
    id: 'far-asset-5',
    plant: 'RHIMIRL_DPMMFG',
    assetClass: 'Electrical Installations & Fittings',
    assetCode: '15000190',
    subNumber: '0',
    vlookup: '150001900',
    description: '15 HP INDUCTION MOTOR DRIER',
    location: 'DPM_MFG_ELECT',
    quantity: 1,
  },
  {
    id: 'far-asset-6',
    plant: 'RHIMIRL_DPMMFG',
    assetClass: 'Electrical Installations & Fittings',
    assetCode: '15000191',
    subNumber: '0',
    vlookup: '150001910',
    description: 'SUB STATION 500 KVA',
    location: 'DPM_MFG_ELECT',
    quantity: 1,
  },
  {
    id: 'far-asset-7',
    plant: 'RHIMIRL_DPMMFG',
    assetClass: 'Electrical Installations & Fittings',
    assetCode: '15000192',
    subNumber: '0',
    vlookup: '150001920',
    description: '20 HP INDUCTION MOTOR',
    location: 'DPM_MFG_ELECT',
    quantity: 1,
  },
  {
    id: 'far-asset-8',
    plant: 'RHIMIRL_DPMMFG',
    assetClass: 'Electrical Installations & Fittings',
    assetCode: '15000193',
    subNumber: '0',
    vlookup: '150001930',
    description: '20 HP INDUCTION MOTOR',
    location: 'DPM_MFG_ELECT',
    quantity: 1,
  },
  {
    id: 'far-asset-9',
    plant: 'RHIMIRL_DPMMFG',
    assetClass: 'Electrical Installations & Fittings',
    assetCode: '15000194',
    subNumber: '0',
    vlookup: '150001940',
    description: '7.5 HP MOTOR FOR PUG MILL',
    location: 'DPM_MFG_ELECT',
    quantity: 1,
  },
  {
    id: 'far-asset-10',
    plant: 'RHIMIRL_DPMMFG',
    assetClass: 'Electrical Installations & Fittings',
    assetCode: '15000195',
    subNumber: '0',
    vlookup: '150001950',
    description: 'INDUCTION MOTOR FOR VACCUM PUMP',
    location: 'DPM_MFG_ELECT',
    quantity: 1,
  },
  {
    id: 'far-asset-11',
    plant: 'RHIMIRL_DPMMFG',
    assetClass: 'Electrical Installations & Fittings',
    assetCode: '15000196',
    subNumber: '0',
    vlookup: '150001960',
    description: '25 HP MOTOR FOR THE ABOVE',
    location: 'DPM_MFG_ELECT',
    quantity: 1,
  },
  {
    id: 'far-asset-12',
    plant: 'RHIMIRL_BLRDIST',
    assetClass: 'Office Equipments',
    assetCode: '15000197',
    subNumber: '0',
    vlookup: '150001970',
    description: 'AIR CONDITIONER 2 TON',
    location: 'BLR_OFFICE',
    quantity: 2,
  },
  {
    id: 'far-asset-13',
    plant: 'RHIMIRL_BLRDIST',
    assetClass: 'Computers & IT',
    assetCode: '15000198',
    subNumber: '0',
    vlookup: '150001980',
    description: 'LENOVO THINKPAD L14',
    location: 'BLR_IT',
    quantity: 5,
  },
  {
    id: 'far-asset-14',
    plant: 'RHIMIRL_DELOFF',
    assetClass: 'Furniture & Fixtures',
    assetCode: '15000199',
    subNumber: '0',
    vlookup: '150001990',
    description: 'EXECUTIVE OFFICE TABLE',
    location: 'DEL_ADMIN',
    quantity: 10,
  },
  {
    id: 'far-asset-15',
    plant: 'RHIMIRL_DELOFF',
    assetClass: 'Plant & Machinery',
    assetCode: '15000200',
    subNumber: '0',
    vlookup: '150002000',
    description: 'DIESEL GENERATOR 125 KVA',
    location: 'DEL_MAINT',
    quantity: 1,
  },
];

const DEFAULT_MOCK_INCREASES = [
  {
    id: 'far-inc-1',
    assetId: 'far-asset-13',
    qtyIncrease: 2,
    valueIncrease: 120000,
    date: '2026-04-10',
    remarks: 'Procured 2 more laptops for newly joined developer interns.',
  },
  {
    id: 'far-inc-2',
    assetId: 'far-asset-12',
    qtyIncrease: 1,
    valueIncrease: 45000,
    date: '2026-05-18',
    remarks: 'Additional unit installed in Server Room.',
  }
];

export default function FarLandingPage() {
  const router = useRouter();
  const { loading, isAuthenticated, workspaceHref, user } = useWorkspaceRouting();
  const [registers, setRegisters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newRegisterName, setNewRegisterName] = useState('');
  const [newRegisterHeading, setNewRegisterHeading] = useState('FAR as on 31.03.2026');

  const workspaceLabel = loading ? 'Loading' : isAuthenticated ? 'Workspace' : 'Login';

  // Load registers from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('far-registers');
      if (stored) {
        setRegisters(JSON.parse(stored));
      } else {
        // Prepopulate with a default register
        const defaultRegister = {
          id: 'le-0435-dalmiapuram',
          name: 'LE 0435 - Dalmiapuram',
          heading: 'FAR as on 31.03.2026',
          createdAt: new Date().toISOString(),
          assetsCount: DEFAULT_MOCK_ASSETS.length,
        };
        const defaultList = [defaultRegister];
        localStorage.setItem('far-registers', JSON.stringify(defaultList));
        localStorage.setItem('far-assets-le-0435-dalmiapuram', JSON.stringify(DEFAULT_MOCK_ASSETS));
        localStorage.setItem('far-increases-le-0435-dalmiapuram', JSON.stringify(DEFAULT_MOCK_INCREASES));
        setRegisters(defaultList);
      }
    }
  }, []);

  const handleCreateRegister = (e) => {
    e.preventDefault();
    if (!newRegisterName.trim()) return;

    const id = newRegisterName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newRegister = {
      id,
      name: newRegisterName.trim(),
      heading: newRegisterHeading.trim() || 'FAR as on 31.03.2026',
      createdAt: new Date().toISOString(),
      assetsCount: 0,
    };

    const updated = [...registers, newRegister];
    localStorage.setItem('far-registers', JSON.stringify(updated));
    localStorage.setItem(`far-assets-${id}`, JSON.stringify([]));
    localStorage.setItem(`far-increases-${id}`, JSON.stringify([]));

    setRegisters(updated);
    setNewRegisterName('');
    setNewRegisterHeading('FAR as on 31.03.2026');
    setShowModal(false);
    
    // Redirect directly to the new register dashboard
    router.push(`/other-modules/far/${id}/dashboard`);
  };

  const handleDeleteRegister = (id, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this Fixed Asset Register? All stored assets inside it will be permanently deleted.')) {
      const updated = registers.filter(r => r.id !== id);
      localStorage.setItem('far-registers', JSON.stringify(updated));
      localStorage.removeItem(`far-assets-${id}`);
      localStorage.removeItem(`far-increases-${id}`);
      setRegisters(updated);
    }
  };

  return (
    <>
      <Navbar
        workspaceHref={workspaceHref}
        workspaceLabel={workspaceLabel}
        othersHref="/other-modules"
        isOthersActive
        isAuthenticated={isAuthenticated}
        user={user}
      />
      <main className="relative min-h-screen w-screen pt-28 md:pt-32 pb-16 bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] overflow-y-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Header section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#3170c6] bg-[#edf4fc] border border-[#afd0f4] shadow-xs mb-3">
                Asset Management
              </span>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
                Fixed Asset Registers (FAR)
              </h1>
              <p className="text-sm text-slate-500 mt-2">
                Manage, query, and log increases for company plant assets in dedicated register workspaces.
              </p>
            </div>
            
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#3170c6] hover:bg-[#2558a2] text-white font-bold text-sm transition-all duration-300 shadow-md shadow-[#3170c6]/20 hover:-translate-y-0.5 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              New Register
            </button>
          </div>

          {registers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/70 border border-slate-200/60 rounded-3xl backdrop-blur-md shadow-sm text-center">
              <div className="w-16 h-16 bg-[#edf4fc] text-[#3170c6] rounded-2xl flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">No Asset Registers Found</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm">
                Create your first register workspace to begin logging assets, quantity increases, and tracking configurations.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-6 px-5 py-2.5 rounded-xl bg-[#3170c6] hover:bg-[#2558a2] text-white font-bold text-sm transition-all shadow-md shadow-[#3170c6]/10 cursor-pointer"
              >
                Create New Register
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {registers.map((reg) => (
                <div
                  key={reg.id}
                  onClick={() => router.push(`/other-modules/far/${reg.id}/dashboard`)}
                  className="group relative cursor-pointer block w-full p-6 bg-white border border-slate-200/80 rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.02)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(49,112,198,0.08)] hover:border-[#afd0f4]"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="w-10 h-10 bg-[#edf4fc] group-hover:bg-[#3170c6] text-[#3170c6] group-hover:text-white rounded-xl flex items-center justify-center transition-colors duration-300">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <button
                      onClick={(e) => handleDeleteRegister(reg.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors"
                      title="Delete Register"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#3170c6] transition-colors truncate">
                    {reg.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase mt-1">
                    {reg.heading}
                  </p>

                  <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100 text-slate-500 text-xs">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>{reg.assetsCount || 0} Assets</span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto group-hover:opacity-0 transition-opacity duration-300">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{new Date(reg.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="absolute bottom-5.5 right-6 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 text-[#3170c6]">
                    <ArrowRight className="w-4.5 h-4.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs px-4">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-[0_30px_75px_rgba(15,23,42,0.18)] p-6">
            <h2 className="text-xl font-extrabold text-slate-900">Create Asset Register</h2>
            <p className="text-xs text-slate-500 mt-1">
              Add a new Fixed Asset Register (FAR) configuration workspace.
            </p>

            <form onSubmit={handleCreateRegister} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Register Name / Company
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LE 0435 - Dalmiapuram"
                  value={newRegisterName}
                  onChange={(e) => setNewRegisterName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-[#3170c6] focus:bg-white transition-all animate-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Header Date (Sub-heading)
                </label>
                <input
                  type="text"
                  placeholder="e.g. FAR as on 31.03.2026"
                  value={newRegisterHeading}
                  onChange={(e) => setNewRegisterHeading(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-[#3170c6] focus:bg-white transition-all animate-none"
                />
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-sm font-bold text-white bg-[#3170c6] hover:bg-[#2558a2] rounded-xl shadow-md shadow-[#3170c6]/10 transition-colors cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
