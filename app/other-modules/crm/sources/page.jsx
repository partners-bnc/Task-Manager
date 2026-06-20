"use client";

import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import MOCK_DATA from '../data/mockData.json';
import { Filter, Search, Eye, Edit, Trash2, Download, FileText, Printer, Plus } from 'lucide-react';
import { exportToCsv } from '../utils/export';

export default function LeadSourcesPage() {
  const { permissions } = useCrm();
  const [sources, setSources] = useState(MOCK_DATA.lead_sources);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [entriesLimit, setEntriesLimit] = useState(10);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("All");
    setFilterType("All");
    setFilterCategory("All");
  };

  const filteredSources = sources.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "All" || s.status === filterStatus;
    const matchType = filterType === "All" || s.type === filterType;
    const matchCategory = filterCategory === "All" || s.category === filterCategory;
    return matchSearch && matchStatus && matchType && matchCategory;
  }).slice(0, entriesLimit);

  const handlePrint = () => {
    window.print();
  };

  const handleAddSource = () => {
    const newSource = {
      id: "SRC" + (Math.floor(Math.random() * 900) + 100),
      name: "New Initiative",
      description: "Auto-generated quick add source.",
      type: "Online",
      category: "Other",
      cost: "0",
      status: "Active",
      created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    setSources([newSource, ...sources]);
  };

  return (
    <div className="p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300 h-full overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
         <h1 className="text-2xl font-bold dark:text-white flex items-center">
           <span className="w-1 h-6 bg-blue-500 mr-3 rounded-full"></span>
           Lead Sources
         </h1>
         {!permissions.isReadOnly && (
           <button onClick={handleAddSource} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium shadow transition flex items-center text-sm">
             <Plus className="w-4 h-4 mr-1" /> Add Source
           </button>
         )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700 transition-colors overflow-hidden">
        
        {/* Filters Top Bar */}
        <div className="bg-[#f8f9fc] dark:bg-slate-900/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
           <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center">
             <Filter className="w-4 h-4 mr-2" /> Filters
           </h3>
           <button 
             onClick={clearFilters}
             className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-xs font-medium transition flex items-center shadow-sm"
           >
             <XIcon /> Clear All
           </button>
        </div>

        {/* Filter Drops */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 pb-6">
           <div>
             <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">★ Status</label>
             <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-sm dark:text-white">
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
             </select>
           </div>
           <div>
             <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase"># Source Type</label>
             <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-sm dark:text-white">
                <option value="All">All Types</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Direct">Direct</option>
                <option value="Paid">Paid</option>
             </select>
           </div>
           <div>
             <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">★ Category</label>
             <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-sm dark:text-white">
                <option value="All">All Categories</option>
                <option value="Social Media">Social Media</option>
                <option value="Search Engine">Search Engine</option>
                <option value="Event">Event</option>
                <option value="Email Campaign">Email Campaign</option>
                <option value="Other">Other</option>
             </select>
           </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-700 gap-4">
           <div className="flex space-x-2 items-center">
             <button onClick={() => exportToCsv(filteredSources, 'lead_sources.csv')} className="bg-[#0b1f3d] dark:bg-blue-900 border border-[#0b1f3d] dark:border-blue-800 text-white px-3 py-1.5 rounded text-xs font-semibold shadow flex items-center hover:bg-[#16345e] dark:hover:bg-blue-800 transition">
                <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
             </button>
             <button onClick={handlePrint} className="bg-[#0b1f3d] dark:bg-blue-900 border border-[#0b1f3d] dark:border-blue-800 text-white px-3 py-1.5 rounded text-xs font-semibold shadow flex items-center hover:bg-[#16345e] dark:hover:bg-blue-800 transition">
                <FileText className="w-3.5 h-3.5 mr-1.5" /> PDF
             </button>
             <button onClick={handlePrint} className="bg-[#0b1f3d] dark:bg-blue-900 border border-[#0b1f3d] dark:border-blue-800 text-white px-3 py-1.5 rounded text-xs font-semibold shadow flex items-center hover:bg-[#16345e] dark:hover:bg-blue-800 transition">
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
             </button>
             
             <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 ml-4">
               Show 
               <select value={entriesLimit} onChange={(e) => setEntriesLimit(Number(e.target.value))} className="mx-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-xs px-1 py-1 focus:outline-none">
                 <option value="5">5</option>
                 <option value="10">10</option>
                 <option value="25">25</option>
               </select>
               entries
             </div>
           </div>
           
           <div className="flex items-center">
             <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mr-2">Search:</label>
             <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-48" />
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
            <thead>
              <tr className="bg-[#0b1f3d] text-white dark:bg-slate-900 text-xs tracking-wide">
                <th className="py-3 px-4 font-semibold">ID</th>
                <th className="py-3 px-4 font-semibold">Source Name</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Cost/Lead</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Created</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSources.map((source, idx) => (
                <tr key={source.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/80'} border-b border-slate-100 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700 transition`}>
                  <td className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{source.id}</td>
                  <td className="py-3 px-4 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded">{source.name}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">{source.description}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">{source.type}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">{source.category}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 text-center">{source.cost}</td>
                  <td className="py-3 px-4 text-xs">
                     <span className="text-green-600 dark:text-green-400 font-bold tracking-wide">{source.status}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">{source.created}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-3">
                      <button className="text-blue-500 hover:text-blue-700 transition" title="View"><Eye className="w-4 h-4" /></button>
                      <button className="text-amber-500 hover:text-amber-600 transition" title="Edit" disabled={permissions.isReadOnly}><Edit className="w-4 h-4" /></button>
                      <button className="text-red-500 hover:text-red-600 transition" title="Delete" disabled={permissions.isReadOnly}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSources.length === 0 && (
                <tr className="bg-white dark:bg-slate-800">
                  <td colSpan="9" className="py-6 text-center text-sm text-slate-500">No sources found matching current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-[#f8f9fc] dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
          <div>
             Showing 1 to {filteredSources.length} of {sources.length} entries
          </div>
          <div className="flex space-x-1">
             <button className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-500 hover:bg-slate-50 transition shadow-sm">Previous</button>
             <button className="px-3 py-1 bg-blue-600 text-white border border-blue-600 rounded shadow-sm">1</button>
             <button className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-500 hover:bg-slate-50 transition shadow-sm">Next</button>
          </div>
        </div>

      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
