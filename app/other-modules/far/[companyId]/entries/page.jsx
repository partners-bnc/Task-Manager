'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  X,
  SlidersHorizontal,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function FarEntries() {
  const params = useParams();
  const companyId = params?.companyId;
  const fileInputRef = useRef(null);

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [plantFilter, setPlantFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Modals / Forms state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    plant: '',
    assetClass: '',
    assetCode: '',
    subNumber: '0',
    vlookup: '',
    description: '',
    location: '',
    quantity: 1,
  });

  // Bulk import feedback
  const [importLogs, setImportLogs] = useState(null);

  // Load Assets
  useEffect(() => {
    if (companyId && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`far-assets-${companyId}`);
      if (stored) {
        setAssets(JSON.parse(stored));
      }
      setLoading(false);
    }
  }, [companyId]);

  // Sync Register Count to main index
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

  // Save changes helper
  const saveAssets = (updatedList) => {
    setAssets(updatedList);
    localStorage.setItem(`far-assets-${companyId}`, JSON.stringify(updatedList));
    syncRegisterCount(updatedList);
  };

  // Dropdown list filters
  const uniquePlants = useMemo(() => {
    return [...new Set(assets.map((a) => a.plant).filter(Boolean))].sort();
  }, [assets]);

  const uniqueClasses = useMemo(() => {
    return [...new Set(assets.map((a) => a.assetClass).filter(Boolean))].sort();
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const text = search.trim().toLowerCase();
      const matchSearch =
        !text ||
        [
          asset.assetCode,
          asset.description,
          asset.location,
          asset.plant,
          asset.assetClass,
          asset.vlookup,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(text));

      const matchPlant = !plantFilter || asset.plant === plantFilter;
      const matchClass = !classFilter || asset.assetClass === classFilter;

      return matchSearch && matchPlant && matchClass;
    });
  }, [assets, search, plantFilter, classFilter]);

  // Form Auto-vlookup generator
  useEffect(() => {
    if (!formData.vlookup) {
      const code = formData.assetCode || '';
      const sub = formData.subNumber || '0';
      setFormData((prev) => ({
        ...prev,
        vlookup: code ? `${code}${sub}0` : '',
      }));
    }
  }, [formData.assetCode, formData.subNumber]);

  // Handle Form changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? Math.max(1, parseInt(value, 10) || 1) : value,
    }));
  };

  // Add Asset Submit
  const handleAddSubmit = (e) => {
    e.preventDefault();
    const newAsset = {
      ...formData,
      id: `far-asset-${Date.now()}`,
    };
    const updated = [newAsset, ...assets];
    saveAssets(updated);
    setShowAddModal(false);
    resetForm();
  };

  // Edit Asset Trigger
  const handleEditClick = (asset) => {
    setSelectedAsset(asset);
    setFormData({
      plant: asset.plant || '',
      assetClass: asset.assetClass || '',
      assetCode: asset.assetCode || '',
      subNumber: asset.subNumber || '0',
      vlookup: asset.vlookup || '',
      description: asset.description || '',
      location: asset.location || '',
      quantity: asset.quantity || 1,
    });
    setShowEditModal(true);
  };

  // Edit Asset Submit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    const updated = assets.map((item) => {
      if (item.id === selectedAsset.id) {
        return { ...item, ...formData };
      }
      return item;
    });
    saveAssets(updated);
    setShowEditModal(false);
    resetForm();
  };

  // Delete Asset
  const handleDeleteClick = (id) => {
    if (confirm('Are you sure you want to delete this asset entry?')) {
      const updated = assets.filter((item) => item.id !== id);
      saveAssets(updated);
    }
  };

  const resetForm = () => {
    setFormData({
      plant: '',
      assetClass: '',
      assetCode: '',
      subNumber: '0',
      vlookup: '',
      description: '',
      location: '',
      quantity: 1,
    });
    setSelectedAsset(null);
  };

  // Export spreadsheet using XLSX
  const handleExportExcel = () => {
    if (assets.length === 0) return;
    
    // Format data matching user columns
    const sheetData = assets.map((a, idx) => ({
      'S.No': idx + 1,
      'Plant': a.plant || '',
      'Asset Class Description': a.assetClass || '',
      'Asset': a.assetCode || '',
      'Sub-number': a.subNumber || '',
      'Asset Description': a.description || '',
      'Cost Centre Description/Location': a.location || '',
      'Quantity': a.quantity || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fixed Assets');
    XLSX.writeFile(wb, `${companyId}-fixed-assets.xlsx`);
  };

  // Import Excel/CSV parser
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (rawData.length < 2) {
          setImportLogs({ status: 'error', message: 'The uploaded file is empty or missing headers.' });
          return;
        }

        // Find headers
        const fileHeaders = rawData[0].map(h => String(h || '').trim().toLowerCase());
        
        // Find indices of columns
        const plantIdx = fileHeaders.findIndex(h => h === 'plant' || h.includes('plant'));
        const classIdx = fileHeaders.findIndex(h => h === 'asset class description' || h.includes('class') || h.includes('group'));
        const assetIdx = fileHeaders.findIndex(h => h === 'asset' || (h.includes('asset') && !h.includes('class') && !h.includes('lookup') && !h.includes('desc')));
        const subIdx = fileHeaders.findIndex(h => h === 'sub-number' || h.includes('sub-number') || h.includes('sub number') || h === 'sub');
        const lookupIdx = fileHeaders.findIndex(h => h === 'asset for v lookup' || h.includes('lookup') || h.includes('v_lookup') || h.includes('v lookup'));
        const descIdx = fileHeaders.findIndex(h => h === 'asset description' || (h.includes('desc') && !h.includes('class')));
        const locationIdx = fileHeaders.findIndex(h => h === 'cost centre description/location' || h.includes('cost centre') || h.includes('location'));
        const qtyIdx = fileHeaders.findIndex(h => h === 'quantity' || h.includes('qty') || h.includes('quantity'));

        const parsedAssets = [];
        let errors = 0;

        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;
          
          // Verify row is not fully empty
          if (row.every(cell => cell === null || cell === undefined || cell === '')) continue;

          const plant = plantIdx !== -1 ? String(row[plantIdx] || '').trim() : 'Imported';
          const assetClass = classIdx !== -1 ? String(row[classIdx] || '').trim() : 'General';
          const assetCode = assetIdx !== -1 ? String(row[assetIdx] || '').trim() : '';
          const subNumber = subIdx !== -1 ? String(row[subIdx] || '').trim() : '0';
          const vlookup = lookupIdx !== -1 ? String(row[lookupIdx] || '').trim() : `${assetCode}${subNumber}0`;
          const description = descIdx !== -1 ? String(row[descIdx] || '').trim() : '';
          const location = locationIdx !== -1 ? String(row[locationIdx] || '').trim() : '';
          const quantity = qtyIdx !== -1 ? parseInt(row[qtyIdx] || 1, 10) || 1 : 1;

          if (!assetCode || !description) {
            errors++;
            continue;
          }

          parsedAssets.push({
            id: `far-asset-${Date.now()}-${i}`,
            plant,
            assetClass,
            assetCode,
            subNumber,
            vlookup,
            description,
            location,
            quantity,
          });
        }

        if (parsedAssets.length === 0) {
          setImportLogs({ status: 'error', message: 'No valid rows found. Ensure Asset ID and Description columns are populated.' });
          return;
        }

        const merged = [...parsedAssets, ...assets];
        saveAssets(merged);
        
        setImportLogs({
          status: 'success',
          message: `Successfully imported ${parsedAssets.length} asset entries! ${errors > 0 ? `(${errors} rows skipped due to missing required columns)` : ''}`
        });

      } catch (err) {
        setImportLogs({ status: 'error', message: `Failed to parse file: ${err.message}` });
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 animate-none" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Top action block */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>Asset Entries</h1>
          <p className="text-sm text-slate-500 mt-1">
            Displaying {filteredAssets.length} of {assets.length} total register entries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Import CSV/Excel
          </button>
          
          <button
            onClick={handleExportExcel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>

          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="rounded-xl bg-[#3170c6] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#3170c6]/10 hover:bg-[#2558a2] transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, description, location..."
            className="w-full pl-10 pr-4 py-3 text-xs bg-white border border-slate-200/80 rounded-xl outline-none focus:border-[#3170c6] transition-all text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </div>

        <select
          value={plantFilter}
          onChange={(e) => setPlantFilter(e.target.value)}
          className="px-4 py-3 text-xs bg-white border border-slate-200/80 rounded-xl outline-none focus:border-[#3170c6] text-slate-700 cursor-pointer"
        >
          <option value="">All Plants</option>
          {uniquePlants.map((plant) => (
            <option key={plant} value={plant}>{plant}</option>
          ))}
        </select>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-4 py-3 text-xs bg-white border border-slate-200/80 rounded-xl outline-none focus:border-[#3170c6] text-slate-700 cursor-pointer"
        >
          <option value="">All Asset Classes</option>
          {uniqueClasses.map((cls) => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
      </section>

      {/* Assets Table */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_4px_25px_rgba(15,23,42,0.015)] overflow-hidden">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-track]:bg-slate-50">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 text-left">
                <th className="py-4 px-5 w-16">S.No</th>
                <th className="py-4 px-4 w-32">Plant</th>
                <th className="py-4 px-4 w-52">Asset Class Description</th>
                <th className="py-4 px-4 w-28">Asset</th>
                <th className="py-4 px-4 w-24">Sub-number</th>
                <th className="py-4 px-4">Asset Description</th>
                <th className="py-4 px-4 w-56">Cost Centre Description/Location</th>
                <th className="py-4 px-4 w-24 text-center">Quantity</th>
                <th className="py-4 px-5 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                    <span>No assets found matching the query.</span>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((a, idx) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-5 font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-4 px-4 font-semibold text-slate-900 whitespace-nowrap" title={a.plant}>{a.plant}</td>
                    <td className="py-4 px-4 whitespace-normal break-words leading-relaxed" title={a.assetClass}>{a.assetClass}</td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-800">{a.assetCode}</td>
                    <td className="py-4 px-4 text-slate-500 font-mono">{a.subNumber}</td>
                    <td className="py-4 px-4 font-bold text-slate-900 whitespace-normal break-words leading-relaxed" title={a.description}>{a.description}</td>
                    <td className="py-4 px-4 font-medium text-slate-600 whitespace-normal break-words leading-relaxed" title={a.location}>{a.location}</td>
                    <td className="py-4 px-4 text-center font-bold text-[#3170c6] font-mono">{a.quantity}</td>
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(a)}
                          className="p-1 rounded hover:bg-[#edf4fc] text-slate-400 hover:text-[#3170c6] transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(a.id)}
                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - ADD ASSET */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs px-4">
          <div className="w-full max-w-lg bg-white border border-slate-200/80 rounded-3xl shadow-[0_30px_75px_rgba(15,23,42,0.18)] p-6 overflow-y-auto max-h-[90vh] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-extrabold text-slate-900">Add Asset Entry</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Plant</label>
                  <input
                    type="text"
                    required
                    name="plant"
                    placeholder="e.g. RHIMIRL_DPMMFG"
                    value={formData.plant}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Asset Class</label>
                  <input
                    type="text"
                    required
                    name="assetClass"
                    placeholder="e.g. Electrical Fittings"
                    value={formData.assetClass}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Asset Code</label>
                  <input
                    type="text"
                    required
                    name="assetCode"
                    placeholder="e.g. 15000186"
                    value={formData.assetCode}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Sub-number</label>
                  <input
                    type="text"
                    name="subNumber"
                    value={formData.subNumber}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Asset Description</label>
                <input
                  type="text"
                  required
                  name="description"
                  placeholder="e.g. AUTOMATIC CHARGER"
                  value={formData.description}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Cost Centre / Location</label>
                  <input
                    type="text"
                    required
                    name="location"
                    placeholder="e.g. DPM_MFG_ELECT"
                    value={formData.location}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-mono"
                  />
                </div>
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
                  className="flex-1 py-3 font-bold text-white bg-[#3170c6] hover:bg-[#2558a2] rounded-xl shadow-md shadow-[#3170c6]/10 transition-colors cursor-pointer"
                >
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - EDIT ASSET */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs px-4">
          <div className="w-full max-w-lg bg-white border border-slate-200/80 rounded-3xl shadow-[0_30px_75px_rgba(15,23,42,0.18)] p-6 overflow-y-auto max-h-[90vh] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-extrabold text-slate-900">Edit Asset Entry</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Plant</label>
                  <input
                    type="text"
                    required
                    name="plant"
                    value={formData.plant}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Asset Class</label>
                  <input
                    type="text"
                    required
                    name="assetClass"
                    value={formData.assetClass}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Asset Code</label>
                  <input
                    type="text"
                    required
                    name="assetCode"
                    value={formData.assetCode}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Sub-number</label>
                  <input
                    type="text"
                    name="subNumber"
                    value={formData.subNumber}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Asset Description</label>
                <input
                  type="text"
                  required
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Cost Centre / Location</label>
                  <input
                    type="text"
                    required
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-2">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 font-bold text-white bg-[#3170c6] hover:bg-[#2558a2] rounded-xl shadow-md shadow-[#3170c6]/10 transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - IMPORT EXCEL/CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs px-4">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-[0_30px_75px_rgba(15,23,42,0.18)] p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-extrabold text-slate-900">Import Asset Data</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportLogs(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload a spreadsheet (<code>.xlsx</code>, <code>.xls</code>, or <code>.csv</code>) matching columns:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[10px] font-mono text-slate-600">
                Plant, Asset Class Description, Asset, Sub-number, Asset Description, Cost Centre Description/Location, Quantity
              </div>

              <div className="mt-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-[#3170c6] rounded-2xl p-8 cursor-pointer transition-colors bg-slate-50/50"
                   onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-700">Click to upload spreadsheet</span>
                <span className="text-[10px] text-slate-400 mt-1">Excel or CSV files accepted</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  accept=".csv, .xlsx, .xls"
                  className="hidden"
                />
              </div>

              {/* Logs Alert */}
              {importLogs && (
                <div className={`mt-4 p-4 rounded-2xl text-xs flex gap-3 ${
                  importLogs.status === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{importLogs.status === 'success' ? 'Import Complete' : 'Import Failed'}</p>
                    <p className="mt-1 leading-normal opacity-90">{importLogs.message}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-6 border-t border-slate-100 mt-6">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportLogs(null);
                  }}
                  className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
