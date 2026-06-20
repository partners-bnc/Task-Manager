"use client";

import React, { useState } from 'react';
import { useCrm, MOCK_USERS } from '../context/CrmContext';
import MOCK_DATA from '../data/mockData.json';
import AddTaskModal from '../components/AddTaskModal';
import { exportToCsv } from '../utils/export';
import ExcelImportButton from '../components/ExcelImportButton';
import GenericEditModal from '../components/GenericEditModal';
import { Filter, Download, FileText, Printer, Edit, Trash2, Plus, ListChecks, Search } from 'lucide-react';

export default function TasksPage() {
  const { currentUser, permissions, tasks, setTasks, addTask, updateTask } = useCrm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (updatedTask) => {
    updateTask(updatedTask.id, updatedTask);
  };

  const handleImport = (importedData) => {
    const mappedTasks = importedData.map((row, index) => ({
      id: row.TaskID || row.id || `T-${Date.now()}-${index}`,
      title: row.Title || row.title || 'Imported Task',
      type: row.Type || row.type || 'Other',
      status: row.Status || row.status || 'Pending',
      priority: row.Priority || row.priority || 'Medium',
      dueDate: row.DueDate || row.dueDate || new Date().toISOString().split('T')[0],
      dueTime: row.DueTime || row.dueTime || '',
      assigneeId: row.AssignedTo || row.assigneeId || currentUser.id,
      leadId: row.RelatedLeadID || row.leadId || '',
      created: row.created || new Date().toLocaleDateString()
    }));
    setTasks(prev => [...mappedTasks, ...prev]);
  };

  // Filters
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterAssignee, setFilterAssignee] = useState("All");
  const [filterLead, setFilterLead] = useState("All");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const clearFilters = () => {
    setFilterStatus("All"); setFilterPriority("All"); setFilterType("All");
    setFilterAssignee("All"); setFilterLead("All");
    setFilterDateFrom(""); setFilterDateTo(""); setSearchTerm("");
    setCurrentPage(1);
  };

  // RBAC
  const rbacTasks = ["admin", "manager"].includes(currentUser.role)
    ? tasks : tasks.filter(t => t.assigneeId === currentUser.id);

  const filteredTasks = rbacTasks.filter(t => {
    const matchStatus = filterStatus === "All" || t.status === filterStatus;
    const matchPriority = filterPriority === "All" || t.priority === filterPriority;
    const matchType = filterType === "All" || t.type === filterType;
    const matchAssignee = filterAssignee === "All" || t.assigneeId === filterAssignee;
    const matchLead = filterLead === "All" || String(t.leadId) === filterLead;
    const matchDateFrom = !filterDateFrom || t.dueDate >= filterDateFrom;
    const matchDateTo = !filterDateTo || t.dueDate <= filterDateTo;
    const matchSearch = !searchTerm || t.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchPriority && matchType && matchAssignee && matchLead && matchDateFrom && matchDateTo && matchSearch;
  });

  const totalPages = Math.ceil(filteredTasks.length / entriesLimit);
  const displayedTasks = filteredTasks.slice((currentPage - 1) * entriesLimit, currentPage * entriesLimit);

  const getLeadName = (leadId) => {
    const lead = MOCK_DATA.leads.find(l => l.id === leadId);
    return lead ? lead.contact : "-";
  };

  const getAssigneeName = (id) => {
    const key = Object.keys(MOCK_USERS).find(k => MOCK_USERS[k].id === id);
    return key ? MOCK_USERS[key].name.split(' ')[0] + " " + (Object.keys(MOCK_USERS).indexOf(key) + 1) : "Unknown";
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'Follow Up Call': return 'bg-green-500 text-white';
      case 'Send Email': return 'bg-red-500 text-white';
      case 'Prepare Quote': return 'bg-yellow-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'High': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400';
      default: return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'Completed': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
      case 'In Progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
      case 'Overdue': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      case 'Cancelled': return 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
      default: return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400';
    }
  };

  const handleDelete = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handlePrint = () => window.print();

  return (
    <div className="p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300 h-full overflow-y-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold dark:text-white">Task Management</h1>
        <div className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 px-4 py-2 rounded-lg font-medium shadow-sm transition border border-transparent dark:border-blue-900">
          Welcome, {currentUser.name} ({currentUser.role})
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Tasks</h3>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{tasks.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Pending/In Progress</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Completed</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{tasks.filter(t => t.status === 'Completed').length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold dark:text-white">Tasks List</h2>
          <div className="flex items-center gap-3">
             <button onClick={() => exportToCsv(filteredTasks, 'tasks_export.csv')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 px-4 py-2 rounded-md font-medium transition shadow-sm text-sm">
               Export CSV
             </button>
             <ExcelImportButton onImport={handleImport} />
             {!permissions.isReadOnly && (
               <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition shadow-sm text-sm">
                 + Add Task
               </button>
             )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 mb-6 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
           <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tasks..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
              />
           </div>
           <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none">
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
           </select>
           <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none">
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
           </select>
           <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none">
              <option value="All">All Types</option>
              <option value="Follow Up Call">Follow Up Call</option>
              <option value="Send Email">Send Email</option>
              <option value="Prepare Quote">Prepare Quote</option>
              <option value="Other">Other</option>
           </select>
           <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none">
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
           {(searchTerm || filterStatus !== "All" || filterPriority !== "All" || filterType !== "All" || filterAssignee !== "All" || filterDateFrom) && (
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
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-sm">
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">ID</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Lead</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Title</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Type</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Priority</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Due Date</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Due Time</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Assigned To</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">Created</th>
                <th className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedTasks.map((task, idx) => (
                <tr key={task.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/80'} border-b border-slate-100 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700 transition`}>
                  <td className="py-3 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{task.id}</td>
                  <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300">{getLeadName(task.leadId)}</td>
                  <td className="py-3 px-3 text-xs text-slate-800 dark:text-slate-200 font-medium">{task.title}</td>
                  <td className="py-3 px-3 text-xs">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${getTypeBadge(task.type)}`}>{task.type}</span>
                  </td>
                  <td className="py-3 px-3 text-xs">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${getPriorityBadge(task.priority)}`}>{task.priority}</span>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
                    {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-3 text-xs text-blue-600 dark:text-blue-400 font-semibold">{task.dueTime || "-"}</td>
                  <td className="py-3 px-3 text-xs">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${getStatusBadge(task.status)}`}>{task.status}</span>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">{getAssigneeName(task.assigneeId)}</td>
                  <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400">{task.created || "-"}</td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-end space-x-2 whitespace-nowrap">
                      <button onClick={() => handleEdit(task)} className="text-sm px-3 py-1 rounded font-medium transition bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(task.id)} className="text-sm px-3 py-1 bg-white border border-red-200 hover:bg-red-50 text-red-600 dark:bg-slate-800 dark:border-red-900/50 dark:hover:bg-red-900/30 dark:text-red-400 rounded font-medium transition">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayedTasks.length === 0 && (
                <tr><td colSpan="11" className="py-6 text-center text-sm text-slate-500">No tasks match current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-600 dark:text-slate-400">
          <div className="mb-4 sm:mb-0">
            Showing {((currentPage - 1) * entriesLimit) + 1} to {Math.min(currentPage * entriesLimit, filteredTasks.length)} of {filteredTasks.length} entries
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

      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={(newTask) => { addTask(newTask); setIsModalOpen(false); }}
      />

      <GenericEditModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        itemData={editingTask}
        onSave={handleSaveEdit}
        title="Edit Task"
        fields={[
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'type', label: 'Type', type: 'select', options: ['Follow Up Call', 'Send Email', 'Prepare Quote', 'Other'] },
          { key: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
          { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed', 'Overdue', 'Cancelled'] },
          { key: 'dueDate', label: 'Due Date', type: 'date' }
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
