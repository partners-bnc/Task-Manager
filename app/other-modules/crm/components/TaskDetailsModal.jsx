import React, { useState } from 'react';
import { X, ListChecks, Edit3 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { MOCK_USERS } from '../context/CrmContext';
import MOCK_DATA from '../data/mockData.json';

export default function TaskDetailsModal({ isOpen, task, onClose, onEditTask }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  if (!isOpen || !task) return null;

  const getAssigneeName = (id) => {
    const key = Object.keys(MOCK_USERS).find(k => MOCK_USERS[k].id === id);
    return key ? MOCK_USERS[key].name : "Unassigned";
  };

  const getLeadName = (leadId) => {
    // Tasks may reference a lead via assigneeId context
    const lead = MOCK_DATA.leads.find(l => l.assigneeId === task.assigneeId);
    return lead ? lead.contact : "—";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
      case 'In Progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
      default: return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      case 'Medium': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const formattedDate = new Date(task.dueDate).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const formattedTime = new Date(task.dueDate).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  });

  const startEditing = () => {
    setEditData({
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate.split('T')[0],
      notes: task.notes || ''
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onEditTask(task.id, {
      title: editData.title,
      status: editData.status,
      priority: editData.priority,
      dueDate: editData.dueDate + "T" + (task.dueDate.split('T')[1] || "10:00:00"),
      notes: editData.notes
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-md shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-[#0b1f3d] px-6 py-4 flex items-center justify-between text-white shrink-0">
          <h2 className="text-base font-semibold flex items-center">
            <ListChecks className="w-4 h-4 mr-2" /> Task Details
          </h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {!isEditing ? (
            <>
              <DetailRow label="TITLE" value={task.title} />
              <DetailRow label="TYPE" value={
                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded text-xs font-bold flex items-center w-fit">
                  <ListChecks className="w-3 h-3 mr-1" /> {task.status === 'Completed' ? 'Completed Task' : 'Pending Task'}
                </span>
              } />
              <DetailRow label="DATE" value={
                <span>{formattedDate} <span className="inline-flex items-center ml-2 text-blue-600 dark:text-blue-400 font-semibold text-xs">🕐 {formattedTime}</span></span>
              } />
              <DetailRow label="LEAD" value={getLeadName()} />
              <DetailRow label="STATUS" value={
                <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusBadge(task.status)}`}>{task.status}</span>
              } />
              <DetailRow label="PRIORITY" value={
                <span className={`px-2 py-1 rounded text-xs font-bold ${getPriorityBadge(task.priority)}`}>{task.priority}</span>
              } />
              <DetailRow label="ASSIGNED TO" value={getAssigneeName(task.assigneeId)} />
              <DetailRow label="NOTES" value={task.notes || "No notes attached."} />
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase">Title</label>
                <input type="text" value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase">Status</label>
                  <select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none">
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase">Priority</label>
                  <select value={editData.priority} onChange={e => setEditData({...editData, priority: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase">Due Date</label>
                <input type="date" value={editData.dueDate} onChange={e => setEditData({...editData, dueDate: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase">Notes</label>
                <textarea value={editData.notes} onChange={e => setEditData({...editData, notes: e.target.value})} rows={3} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 dark:text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-between shrink-0">
          {!isEditing ? (
            <>
              <button onClick={() => toast.info('Navigating to lead...')} className="px-4 py-2 text-sm font-medium bg-[#0b1f3d] hover:bg-[#16345e] text-white rounded transition shadow flex items-center">
                <Edit3 className="w-3 h-3 mr-1" /> Edit Lead
              </button>
              <button onClick={startEditing} className="px-4 py-2 text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded transition shadow flex items-center">
                <Edit3 className="w-3 h-3 mr-1" /> Edit Task
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(false)} className="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded transition">
                Cancel
              </button>
              <button onClick={handleSaveEdit} className="px-5 py-2 text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded transition shadow">
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start border-b border-slate-100 dark:border-slate-700/50 pb-3">
      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}
