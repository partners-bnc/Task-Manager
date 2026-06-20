"use client";

import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import { useToast } from '../context/ToastContext';
import MOCK_DATA from '../data/mockData.json';
import KanbanBoard from '../components/KanbanBoard';
import AddLeadModal from '../components/AddLeadModal';
import LeadProfilePanel from '../components/LeadProfilePanel';
import { exportToExcel } from '../utils/excel-helpers';
import ExcelImportButton from '../components/ExcelImportButton';
import { Search, Filter, Phone, Mail, MessageSquarePlus, CalendarPlus } from 'lucide-react';

export default function LeadsPage() {
  const { currentUser, permissions, leads, setLeads, followups, campaigns, enrollLead } = useCrm();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [filterDate, setFilterDate] = useState("");

  const handleDelete = (id) => {
    if (!permissions.canDeleteLeads) {
      toast.error("Permission Denied: You cannot delete leads.");
      return;
    }
    setLeads(leads.filter(l => l.id !== id));
  };

  const handleAddLeadSubmit = async (newLeadData) => {
    const freshLead = {
      ...newLeadData,
      assigneeId: currentUser.id
    };
    setLeads([freshLead, ...leads]);
    setIsModalOpen(false);

    try {
      await fetch('/other-modules/crm/api/email/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'Lead Created', lead: freshLead, action: 'CREATE' })
      });
    } catch (e) {
      console.error("Trigger error:", e);
    }
  };

  const handleOpenProfile = (lead) => {
    setSelectedLead(lead);
    setIsProfileOpen(true);
  };

  const handleSaveFromProfile = (updatedLead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  const handleImport = (importedData) => {
    const mappedLeads = importedData.map((row, index) => ({
      id: row.LeadID || row.id || `IMP-${Date.now()}-${index}`,
      company: row.company || row.Company || 'Unknown Company',
      contact: row.contact || row.Contact || 'Unknown Contact',
      status: row.status || row.Status || 'New',
      value: row.value || row.Value || '$0',
      assigneeId: row.AssignedTo || row.assigneeId || currentUser.id,
      date: row.date || row.Date || new Date().toISOString().split('T')[0],
      source: row.SourceID || row.source || row.Source || 'Import',
      priority: row.priority || row.Priority || 'Medium'
    }));
    setLeads(prev => [...mappedLeads, ...prev]);
  };

  const totalLeads = leads.length;
  const activeCustomers = leads.filter(l => l.status === "Won").length;
  const computedRevenue = leads.filter(l => l.status === "Won").reduce((acc, l) => {
    const numericStr = String(l.value ?? "").replace(/[^0-9.-]+/g,"");
    return acc + (parseFloat(numericStr) || 0);
  }, 0);

  // Filtering Logic
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.company.toLowerCase().includes(searchTerm.toLowerCase()) || lead.contact.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" || lead.status === filterStatus;
    const matchesPriority = filterPriority === "All" || lead.priority === filterPriority;
    const matchesSource = filterSource === "All" || lead.source === filterSource;
    const matchesDate = !filterDate || (lead.date && lead.date === filterDate);

    return matchesSearch && matchesStatus && matchesPriority && matchesSource && matchesDate;
  });

  return (
    <div className="p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold dark:text-white">Lead Tracking & Pipeline</h1>
        <div className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 px-4 py-2 rounded-lg font-medium shadow-sm transition border border-transparent dark:border-blue-900">
          Welcome, {currentUser.name} ({currentUser.role})
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Leads (Pipeline)</h3>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{totalLeads}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Active Customers (Won)</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{activeCustomers}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Generated Revenue</h3>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">${computedRevenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold dark:text-white">Lead Tracking</h2>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => exportToExcel(filteredLeads, 'pipeline_leads_export.xlsx')}
               className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 px-4 py-2 rounded-md font-medium transition shadow-sm text-sm"
             >
               Export Excel
             </button>
             {!permissions.isReadOnly && (
               <>
                 <ExcelImportButton onImport={handleImport} />
                 <button 
                   onClick={() => setIsModalOpen(true)}
                   className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition shadow-sm text-sm"
                 >
                   + Add Lead
                 </button>
               </>
             )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 mb-6 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
           <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search company or contact..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
              />
           </div>
           <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none">
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Won">Won</option>
           </select>
           <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none">
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
           </select>
           <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none">
              <option value="All">All Sources</option>
              <option value="Service Enquiry">Service Enquiry</option>
              <option value="Expert Request">Expert Request</option>
              <option value="Voice Requirement">Voice Requirement</option>
              <option value="Partner Registration">Partner Registration</option>
              <option value="Contact Form">Contact Form</option>
           </select>
           <input
             type="date" 
             value={filterDate} 
             onChange={(e) => setFilterDate(e.target.value)} 
             className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none" 
           />
           {/* Clear Filters */}
           {(searchTerm || filterStatus !== "All" || filterPriority !== "All" || filterSource !== "All" || filterDate) && (
             <button 
               onClick={() => {
                 setSearchTerm("");
                 setFilterStatus("All");
                 setFilterPriority("All");
                 setFilterSource("All");
                 setFilterDate("");
               }}
               className="px-3 py-2 text-sm text-slate-500 hover:text-red-500 transition font-medium flex items-center"
             >
               <Filter className="w-3 h-3 mr-1" /> Clear
             </button>
           )}
        </div>
        
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400">Company</th>
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400">Contact</th>
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400">Status</th>
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400">Value</th>
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400">Follow-ups</th>
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(lead => {
              const isOwner = lead.assigneeId === currentUser.id;
              const canEdit = !permissions.isReadOnly && (["admin", "manager"].includes(currentUser.role) || (currentUser.role === "sales" && isOwner));

              let statusColor = "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
              if (lead.status === "Won") statusColor = "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400";
              if (lead.status === "Contacted") statusColor = "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400";

              return (
                <tr key={lead.id} onClick={() => handleOpenProfile(lead)} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-blue-50/60 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group">
                  <td className="py-3 px-4 font-medium dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{lead.company}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{lead.contact}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`px-2 py-1 rounded font-medium text-xs ${statusColor}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold dark:text-slate-300">{lead.value}</td>
                  <td className="py-3 px-4 text-sm">
                    {(() => {
                      const leadFollowups = followups.filter(f => f.leadId === lead.id && f.status !== 'Completed');
                      return leadFollowups.length > 0 ? (
                        <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 px-2 py-1 rounded font-medium text-xs">
                          {leadFollowups.length} Active
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                     <div className="flex items-center justify-end gap-1">
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                         <button
                           onClick={(e) => { e.stopPropagation(); handleOpenProfile(lead); }}
                           className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-all"
                           title="Log Call"
                         >
                           <Phone className="w-4 h-4" />
                         </button>
                         <button
                           onClick={(e) => { e.stopPropagation(); handleOpenProfile(lead); }}
                           className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-all"
                           title="Send Email"
                         >
                           <Mail className="w-4 h-4" />
                         </button>
                         <button
                           onClick={(e) => { e.stopPropagation(); handleOpenProfile(lead); }}
                           className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-all"
                           title="Add Note"
                         >
                           <MessageSquarePlus className="w-4 h-4" />
                         </button>
                         <button
                           onClick={(e) => { e.stopPropagation(); handleOpenProfile(lead); }}
                           className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-all"
                           title="Schedule Follow-up"
                         >
                           <CalendarPlus className="w-4 h-4" />
                         </button>
                       </div>
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleOpenProfile(lead); }}
                         className="text-sm px-3 py-1 rounded font-medium transition bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                         title="View Lead Profile"
                       >
                         View
                       </button>
                       {permissions.canDeleteLeads && (
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }}
                           className="text-sm px-3 py-1 bg-white border border-red-200 hover:bg-red-50 text-red-600 dark:bg-slate-800 dark:border-red-900/50 dark:hover:bg-red-900/30 dark:text-red-400 rounded font-medium transition opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                         >
                           Delete
                         </button>
                       )}
                     </div>
                  </td>
                </tr>
              );
            })}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-500 dark:text-slate-400">
                  {leads.length === 0 ? "No leads found." : "No leads match your active filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <KanbanBoard leads={leads} setLeads={setLeads} onLeadClick={handleOpenProfile} />

      <AddLeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={handleAddLeadSubmit} 
      />

      <LeadProfilePanel 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        leadData={selectedLead}
        onSave={handleSaveFromProfile}
      />
    </div>
  );
}
