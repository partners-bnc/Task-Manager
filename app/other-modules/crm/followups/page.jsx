"use client";

import React, { useState } from 'react';
import { useCrm, MOCK_USERS } from '../context/CrmContext';
import MOCK_DATA from '../data/mockData.json';
import AddFollowupModal from '../components/AddFollowupModal';
import GenericEditModal from '../components/GenericEditModal';
import { exportToCsv } from '../utils/export';
import { Filter, Search, Plus, MonitorPlay, MessageSquareCode, CheckCircle, RefreshCw, Trash2, Edit } from 'lucide-react';

export default function FollowupsPage() {
  const { currentUser, permissions, followups, setFollowups, updateFollowup, deleteFollowup, addFollowup, addActivity } = useCrm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFollowup, setEditingFollowup] = useState(null);

  // Filters
  const [filterSource, setFilterSource] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterAssignee, setFilterAssignee] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const clearFilters = () => {
    setFilterSource("All"); setFilterStatus("All"); setFilterPriority("All");
    setFilterAssignee("All"); setSearchTerm(""); setCurrentPage(1);
  };

  // Simulator
  const [isSimulating, setIsSimulating] = useState(false);
  const simulateForm = (formType) => {
    setIsSimulating(true);
    setTimeout(() => {
      const randomLead = MOCK_DATA.leads[Math.floor(Math.random() * MOCK_DATA.leads.length)];
      const newFwp = {
        id: "FWP" + (Math.floor(Math.random() * 9000) + 1000),
        leadId: randomLead.id,
        type: formType,
        title: `New ${formType} from ${randomLead.contact}`,
        priority: "High",
        dueDate: new Date().toISOString().split('T')[0],
        dueTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: "New",
        assigneeId: currentUser.id,
        notes: "Auto-generated simulated website submission payload.",
        created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
      
      addFollowup(newFwp);
      addActivity({
        id: "ACT" + Date.now(),
        type: "System",
        date: new Date().toISOString().split('T')[0],
        subject: `${formType} Received`,
        description: `User submitted a ${formType} via the portal. Follow-up created.`,
        outcome: "Neutral",
        duration: "-",
        assigneeId: "system",
        leadId: randomLead.id
      });
      setIsSimulating(false);
    }, 600);
  };

  // Handlers
  const handleEdit = (fwp) => {
    setEditingFollowup(fwp);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (updatedFwp) => {
    updateFollowup(updatedFwp.id, updatedFwp);
    if (updatedFwp.status === "Completed") {
      addActivity({
        id: "ACT" + Date.now(),
        type: "System",
        date: new Date().toISOString().split('T')[0],
        subject: `Follow-up Completed`,
        description: `Follow-up '${updatedFwp.title}' was marked as completed.`,
        outcome: "Positive",
        duration: "-",
        assigneeId: currentUser.id,
        leadId: updatedFwp.leadId
      });
    }
  };

  const handleDelete = (id) => {
    deleteFollowup(id);
  };

  const markCompleted = (fwp) => {
    handleSaveEdit({ ...fwp, status: "Completed" });
  };

  // RBAC
  const rbacFollowups = ["admin", "manager"].includes(currentUser.role)
    ? followups : followups.filter(f => f.assigneeId === currentUser.id);

  const filteredFollowups = rbacFollowups.filter(f => {
    const matchSource = filterSource === "All" || f.type === filterSource;
    const matchStatus = filterStatus === "All" || f.status === filterStatus;
    const matchPriority = filterPriority === "All" || f.priority === filterPriority;
    const matchAssignee = filterAssignee === "All" || f.assigneeId === filterAssignee;
    const matchSearch = !searchTerm || f.title?.toLowerCase().includes(searchTerm.toLowerCase()) || MOCK_DATA.leads.find(l => l.id === f.leadId)?.contact.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSource && matchStatus && matchPriority && matchAssignee && matchSearch;
  });

  const totalPages = Math.ceil(filteredFollowups.length / entriesLimit);
  const displayedFollowups = filteredFollowups.slice((currentPage - 1) * entriesLimit, currentPage * entriesLimit);

  const getLeadName = (leadId) => {
    const lead = MOCK_DATA.leads.find(l => l.id === leadId);
    return lead ? lead.contact : "-";
  };

  const getAssigneeName = (id) => {
    const key = Object.keys(MOCK_USERS).find(k => MOCK_USERS[k].id === id);
    return key ? MOCK_USERS[key].name.split(' ')[0] : "Unknown";
  };

  const getTypeBadge = (type) => {
    if (['Service Enquiry', 'Expert Request', 'Voice Requirement', 'Partner Registration', 'Contact Form'].includes(type)) {
      return 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800/50';
    }
    switch (type) {
      case 'Call': return 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300';
      case 'WhatsApp': return 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300';
      case 'Email': return 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-300';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'Completed': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
      case 'In Progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
      case 'Overdue': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      case 'New': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400 font-bold';
      default: return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400';
    }
  };

  return (
    <div className="p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300 h-full overflow-y-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold dark:text-white flex items-center">
          <MessageSquareCode className="w-8 h-8 mr-3 text-blue-600 dark:text-blue-400" />
          Follow-up Inquiries
        </h1>
        <div className="flex space-x-3">
          {/* Simulator Dropdown */}
          {!permissions.isReadOnly && (
            <div className="relative group inline-block z-10">
              <button disabled={isSimulating} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm text-sm flex items-center disabled:opacity-70">
                {isSimulating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <MonitorPlay className="w-4 h-4 mr-2" />}
                Simulate Inbound Form
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                <button onClick={() => simulateForm('Service Enquiry')} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Service Enquiry</button>
                <button onClick={() => simulateForm('Expert Request')} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Expert Request</button>
                <button onClick={() => simulateForm('Partner Registration')} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Partner Registration</button>
                <button onClick={() => simulateForm('Voice Requirement')} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Voice Requirement</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Queue</h3>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{followups.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-purple-200 dark:border-purple-900/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">New Website Inquiries</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {followups.filter(f => f.status === 'New' && ['Service Enquiry', 'Expert Request', 'Voice Requirement', 'Contact Form'].includes(f.type)).length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Pending Partner Profiles</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {followups.filter(f => f.type === 'Partner Registration' && f.status !== 'Completed').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Overdue Action</h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{followups.filter(f => f.status === 'Overdue').length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold dark:text-white">Active Pipeline</h2>
          <div className="flex items-center gap-3">
             <button onClick={() => exportToCsv(filteredFollowups, 'followups.csv')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 px-4 py-2 rounded-md font-medium transition shadow-sm text-sm">
               Export CSV
             </button>
             {!permissions.isReadOnly && (
               <button onClick={() => setIsModalOpen(true)} className="bg-[#0b1f3d] hover:bg-[#16345e] dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition shadow-sm text-sm flex items-center">
                 <Plus className="w-4 h-4 mr-1" /> Manual Follow-up
               </button>
             )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
           <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input 
                type="text" placeholder="Search title or contact..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
              />
           </div>
           <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none">
              <option value="All">All Types</option>
              <option value="Service Enquiry">Service Enquiry</option>
              <option value="Expert Request">Expert Request</option>
              <option value="Voice Requirement">Voice Requirement</option>
              <option value="Partner Registration">Partner Registration</option>
              <option value="Contact Form">Contact Form</option>
              <option disabled>──────</option>
              <option value="Call">Call</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
              <option value="Meeting">Meeting</option>
           </select>
           <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none">
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Overdue">Overdue</option>
           </select>
           <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none">
              <option value="All">All Assignees</option>
              {Object.values(MOCK_USERS).map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
           </select>
           {(searchTerm || filterSource !== "All" || filterStatus !== "All" || filterAssignee !== "All") && (
             <button onClick={clearFilters} className="px-3 py-2 text-sm text-slate-500 hover:text-red-500 transition font-medium flex items-center">
               <Filter className="w-3 h-3 mr-1" /> Clear
             </button>
           )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-sm">
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">ID</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Target</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Type / Source</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Subject</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Priority</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Due Date</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Owner</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedFollowups.map((fwp, idx) => (
                <tr key={fwp.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/80'} border-b border-slate-100 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700 transition`}>
                  <td className="py-3 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{fwp.id}</td>
                  <td className="py-3 px-3 text-xs text-slate-800 dark:text-slate-200 font-bold">{getLeadName(fwp.leadId)}</td>
                  <td className="py-3 px-3 text-xs">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getTypeBadge(fwp.type)}`}>{fwp.type}</span>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300 font-medium max-w-[200px] truncate">{fwp.title}</td>
                  <td className="py-3 px-3 text-xs">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${fwp.priority === 'High' ? 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' : fwp.priority === 'Medium' ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' : 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'}`}>{fwp.priority}</span>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
                    {new Date(fwp.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} <span className="text-slate-400 ml-1">{fwp.dueTime}</span>
                  </td>
                  <td className="py-3 px-3 text-xs">
                    <span className={`px-2 py-1 rounded text-[10px] font-semibold ${getStatusBadge(fwp.status)}`}>{fwp.status}</span>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">{getAssigneeName(fwp.assigneeId)}</td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-end space-x-2 whitespace-nowrap">
                      {fwp.status !== 'Completed' && !permissions.isReadOnly && (
                        <button onClick={() => markCompleted(fwp)} className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 rounded transition font-medium flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" /> Done
                        </button>
                      )}
                      {!permissions.isReadOnly && (
                        <>
                          <button onClick={() => handleEdit(fwp)} className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 p-1 transition" title="Process / Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(fwp.id)} className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 p-1 transition" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {displayedFollowups.length === 0 && (
                <tr><td colSpan="9" className="py-6 text-center text-sm text-slate-500">No follow-ups match current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-600 dark:text-slate-400">
          <div className="mb-4 sm:mb-0">
            Showing {((currentPage - 1) * entriesLimit) + 1} to {Math.min(currentPage * entriesLimit, filteredFollowups.length)} of {filteredFollowups.length} entries
          </div>
          <div className="flex space-x-1">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className={`px-3 py-1.5 rounded-md transition shadow-sm border ${currentPage === 1 ? 'bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-50'}`}>Prev</button>
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages || totalPages === 0} className={`px-3 py-1.5 rounded-md transition shadow-sm border ${currentPage === totalPages || totalPages === 0 ? 'bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-50'}`}>Next</button>
          </div>
        </div>
      </div>

      <AddFollowupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={(newFwp) => { addFollowup(newFwp); setIsModalOpen(false); }} />
      <GenericEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} itemData={editingFollowup} onSave={handleSaveEdit} title="Process Inquiry / Follow-up" fields={[
        { key: 'title', label: 'Subject', type: 'text' },
        { key: 'type', label: 'Type / Source', type: 'select', options: ['Service Enquiry', 'Expert Request', 'Voice Requirement', 'Partner Registration', 'Contact Form', 'Call', 'WhatsApp', 'Email', 'Meeting'] },
        { key: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
        { key: 'status', label: 'Status', type: 'select', options: ['New', 'In Progress', 'Completed', 'Overdue', 'Cancelled'] },
        { key: 'dueDate', label: 'Due Date', type: 'date' },
        { key: 'notes', label: 'Processing Notes', type: 'textarea' }
      ]} />
    </div>
  );
}
