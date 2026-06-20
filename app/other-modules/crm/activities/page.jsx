"use client";

import React, { useState } from 'react';
import { useCrm, MOCK_USERS } from '../context/CrmContext';
import MOCK_DATA from '../data/mockData.json';
import AddActivityModal from '../components/AddActivityModal';
import { exportToCsv } from '../utils/export';
import ExcelImportButton from '../components/ExcelImportButton';
import GenericEditModal from '../components/GenericEditModal';
import { Filter, Download, FileText, Printer, Edit, Trash2, Plus, RefreshCw, Search } from 'lucide-react';

export default function ActivitiesPage() {
  const { currentUser, activities, setActivities } = useCrm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  const handleEdit = (activity) => {
    setEditingActivity(activity);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (updatedActivity) => {
    setActivities(prev => prev.map(a => a.id === updatedActivity.id ? updatedActivity : a));
  };

  const handleImport = (importedData) => {
    const mappedActivities = importedData.map((row, index) => ({
      id: row.ActivityID || row.id || `A-${Date.now()}-${index}`,
      type: row.Type || row.type || 'Call',
      subject: row.Description || row.subject || 'Imported Activity',
      description: row.Description || row.description || '',
      outcome: row.Outcome || row.outcome || 'Neutral',
      duration: row.Duration || row.duration || '-',
      assigneeId: row.PerformedBy || row.assigneeId || currentUser.id,
      leadId: row.LeadID || row.leadId || '',
      date: row.Date || row.date || new Date().toISOString().split('T')[0]
    }));
    setActivities(prev => [...mappedActivities, ...prev]);
  };

  // Filters
  const [filterType, setFilterType] = useState("All");
  const [filterOutcome, setFilterOutcome] = useState("All");
  const [filterPerformer, setFilterPerformer] = useState("All");
  const [filterLead, setFilterLead] = useState("All");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const clearFilters = () => {
    setFilterType("All");
    setFilterOutcome("All");
    setFilterPerformer("All");
    setFilterLead("All");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // RBAC: Admins/Managers see all. Sales/Viewers only see their assigned.
  const rbacFiltered = ["admin", "manager"].includes(currentUser.role)
    ? activities
    : activities.filter(a => a.assigneeId === currentUser.id);

  const filteredActivities = rbacFiltered.filter(a => {
    const matchType = filterType === "All" || a.type === filterType;
    const matchOutcome = filterOutcome === "All" || a.outcome === filterOutcome;
    const matchPerformer = filterPerformer === "All" || a.assigneeId === filterPerformer;
    const matchLead = filterLead === "All" || String(a.leadId) === filterLead;
    const matchDateFrom = !filterDateFrom || a.date >= filterDateFrom;
    const matchDateTo = !filterDateTo || a.date <= filterDateTo;
    const matchSearch = !searchTerm || a.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || a.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchOutcome && matchPerformer && matchLead && matchDateFrom && matchDateTo && matchSearch;
  });

  const totalPages = Math.ceil(filteredActivities.length / entriesLimit);
  const displayedActivities = filteredActivities.slice((currentPage - 1) * entriesLimit, currentPage * entriesLimit);

  const getLeadName = (leadId) => {
    const lead = MOCK_DATA.leads.find(l => l.id === leadId);
    return lead ? lead.contact : "Unknown";
  };

  const getAssigneeName = (id) => {
    const key = Object.keys(MOCK_USERS).find(k => MOCK_USERS[k].id === id);
    return key ? MOCK_USERS[key].name.split(' ')[0] + " " + (Object.keys(MOCK_USERS).indexOf(key) + 1) : "Unknown";
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'registered':
      case 'logged in':
      case 'profile updated': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
      case 'AI profile submitted':
      case 'requirement submitted': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300';
      case 'agreement signed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'WhatsApp sent': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
      case 'email sent': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
      case 'call completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
      case 'admin note added':
      case 'status changed': return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'Positive': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
      case 'Interested': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
      case 'Neutral': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400';
      case 'Not Interested': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const handleAddActivity = (newActivity) => {
    setActivities([newActivity, ...activities]);
  };

  const handleDelete = (id) => {
    setActivities(activities.filter(a => a.id !== id));
  };

  const handlePrint = () => window.print();

  return (
    <div className="p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300 h-full overflow-y-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold dark:text-white">Activity Log</h1>
        <div className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 px-4 py-2 rounded-lg font-medium shadow-sm transition border border-transparent dark:border-blue-900">
          Welcome, {currentUser.name} ({currentUser.role})
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Activities</h3>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{activities.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Comms (Call/WhatsApp/Email)</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{activities.filter(a => ['call completed', 'WhatsApp sent', 'email sent'].includes(a.type)).length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Positive Outcomes</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{activities.filter(a => a.outcome === 'Positive').length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold dark:text-white">Activity List</h2>
          <div className="flex items-center gap-3">
             <button onClick={() => exportToCsv(filteredActivities, 'activities_export.csv')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 px-4 py-2 rounded-md font-medium transition shadow-sm text-sm">
               Export CSV
             </button>
             <ExcelImportButton onImport={handleImport} />
             <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition shadow-sm text-sm">
               + Add Activity
             </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 mb-6 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
           <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search activities..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
              />
           </div>
           <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none">
              <option value="All">All Types</option>
              <option value="registered">registered</option>
              <option value="logged in">logged in</option>
              <option value="profile updated">profile updated</option>
              <option value="AI profile submitted">AI profile submitted</option>
              <option value="agreement signed">agreement signed</option>
              <option value="requirement submitted">requirement submitted</option>
              <option value="WhatsApp sent">WhatsApp sent</option>
              <option value="email sent">email sent</option>
              <option value="call completed">call completed</option>
              <option value="admin note added">admin note added</option>
              <option value="status changed">status changed</option>
           </select>
           <select value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none">
              <option value="All">All Outcomes</option>
              <option value="Positive">Positive</option>
              <option value="Neutral">Neutral</option>
              <option value="Interested">Interested</option>
              <option value="Not Interested">Not Interested</option>
           </select>
           <select value={filterPerformer} onChange={(e) => setFilterPerformer(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none">
              <option value="All">All Assignees</option>
              {Object.values(MOCK_USERS).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
           </select>
           <input 
             type="date" 
             value={filterDateFrom} 
             onChange={(e) => setFilterDateFrom(e.target.value)} 
             className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none" 
           />
           {/* Clear Filters */}
           {(searchTerm || filterType !== "All" || filterOutcome !== "All" || filterPerformer !== "All" || filterDateFrom) && (
             <button 
               onClick={clearFilters}
               className="px-3 py-2 text-sm text-slate-500 hover:text-red-500 transition font-medium flex items-center"
             >
               <Filter className="w-3 h-3 mr-1" /> Clear
             </button>
           )}
        </div>



        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-sm">
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">ID</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Lead</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Type</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Subject</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Outcome</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Duration</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Performed By</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Date</th>
                <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedActivities.map((act, idx) => (
                <tr key={act.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/80'} border-b border-slate-100 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700 transition`}>
                  <td className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{act.id}</td>
                  <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">{getLeadName(act.leadId)}</td>
                  <td className="py-3 px-4 text-xs">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getTypeBadge(act.type)}`}>{act.type}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">{act.subject || act.description}</td>
                  <td className="py-3 px-4 text-xs">
                    <span className={`px-2 py-1 rounded font-semibold text-[10px] ${getOutcomeBadge(act.outcome)}`}>{act.outcome}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">{act.duration || "-"}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">{getAssigneeName(act.assigneeId)}</td>
                  <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                    {new Date(act.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => handleEdit(act)} className="text-sm px-3 py-1 rounded font-medium transition bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(act.id)} className="text-sm px-3 py-1 bg-white border border-red-200 hover:bg-red-50 text-red-600 dark:bg-slate-800 dark:border-red-900/50 dark:hover:bg-red-900/30 dark:text-red-400 rounded font-medium transition">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {displayedActivities.length === 0 && (
                <tr className="bg-white dark:bg-slate-800">
                  <td colSpan="9" className="py-6 text-center text-sm text-slate-500">No activities found matching current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-600 dark:text-slate-400">
          <div className="mb-4 sm:mb-0">
            Showing {((currentPage - 1) * entriesLimit) + 1} to {Math.min(currentPage * entriesLimit, filteredActivities.length)} of {filteredActivities.length} entries
            <span className="ml-4">
              Rows per page: 
              <select value={entriesLimit} onChange={e => { setEntriesLimit(Number(e.target.value)); setCurrentPage(1); }} className="ml-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-xs px-2 py-1 focus:outline-none">
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </span>
          </div>
          <div className="flex space-x-1">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-md transition shadow-sm border ${currentPage === 1 ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-50'}`}
            >
              Previous
            </button>
            
            {[...Array(totalPages)].map((_, i) => (
              <button 
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1.5 rounded-md shadow-sm border transition ${currentPage === i + 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-50'}`}
              >
                {i + 1}
              </button>
            ))}

            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`px-3 py-1.5 rounded-md transition shadow-sm border ${currentPage === totalPages || totalPages === 0 ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-50'}`}
            >
              Next
            </button>
          </div>
        </div>


      </div>

      <AddActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddActivity}
      />

      <GenericEditModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        itemData={editingActivity}
        onSave={handleSaveEdit}
        title="Edit Activity"
        fields={[
          { key: 'type', label: 'Type', type: 'select', options: ['registered', 'logged in', 'profile updated', 'AI profile submitted', 'agreement signed', 'requirement submitted', 'WhatsApp sent', 'email sent', 'call completed', 'admin note added', 'status changed'] },
          { key: 'subject', label: 'Subject', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'outcome', label: 'Outcome', type: 'select', options: ['Positive', 'Neutral', 'Interested', 'Not Interested'] },
          { key: 'duration', label: 'Duration', type: 'text' }
        ]}
      />
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
