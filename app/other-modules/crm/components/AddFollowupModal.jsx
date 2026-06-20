import React, { useState } from 'react';
import { X, MessageSquareCode, CalendarIcon, Users, FileText, CheckCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { MOCK_USERS } from '../context/CrmContext';
import MOCK_DATA from '../data/mockData.json';

export default function AddFollowupModal({ isOpen, onClose, onAdd }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    type: 'Service Enquiry',
    leadId: '',
    dueDate: '',
    dueTime: '',
    priority: 'Medium',
    assigneeId: '',
    notes: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.dueDate) {
      toast.warning("Follow-up Title and Due Date are required.");
      return;
    }
    
    onAdd({
      id: "FWP" + (Math.floor(Math.random() * 900) + 100),
      title: formData.title,
      type: formData.type,
      leadId: formData.leadId ? parseInt(formData.leadId) : null,
      dueDate: formData.dueDate,
      dueTime: formData.dueTime || "-",
      priority: formData.priority,
      status: "New",
      assigneeId: formData.assigneeId || "u1",
      created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      notes: formData.notes
    });
    
    setFormData({ title: '', type: 'Service Enquiry', leadId: '', dueDate: '', dueTime: '', priority: 'Medium', assigneeId: '', notes: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-md shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="bg-[#0b1f3d] px-6 py-4 flex items-center justify-between text-white shrink-0">
          <h2 className="text-lg font-semibold flex items-center">
            <MessageSquareCode className="w-5 h-5 mr-2" /> Add Follow-up
          </h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="add-followup-form" onSubmit={handleSubmit} className="space-y-6">

            {/* Core Details */}
            <section>
              <div className="flex items-center text-[#0b1f3d] dark:text-blue-400 font-bold mb-4 border-b border-slate-300 dark:border-slate-700 pb-2">
                <CheckCircle className="w-4 h-4 mr-2" />
                <h3 className="text-sm tracking-wide">Follow-up Details</h3>
              </div>
              <div className="mb-4">
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-semibold">Title *</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Review Partner App" required className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-semibold">Source / Type</label>
                  <select name="type" value={formData.type} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none">
                    <option value="Service Enquiry">Service Enquiry</option>
                    <option value="Expert Request">Expert Request</option>
                    <option value="Voice Requirement">Voice Requirement</option>
                    <option value="Partner Registration">Partner Registration</option>
                    <option value="Contact Form">Contact Form</option>
                    <option disabled>──────────</option>
                    <option value="Call">Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                    <option value="Meeting">Meeting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-semibold">Related Lead / Partner *</label>
                  <select name="leadId" value={formData.leadId} onChange={handleChange} required className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none">
                    <option value="">Select Target</option>
                    {MOCK_DATA.leads.map(l => (
                      <option key={l.id} value={l.id}>{l.contact} ({l.company})</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Scheduling */}
            <section>
              <div className="flex items-center text-[#0b1f3d] dark:text-blue-400 font-bold mb-4 border-b border-slate-300 dark:border-slate-700 pb-2">
                <CalendarIcon className="w-4 h-4 mr-2" />
                <h3 className="text-sm tracking-wide">Scheduling</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-semibold">Due Date *</label>
                  <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} required className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-semibold">Due Time</label>
                  <input type="time" name="dueTime" value={formData.dueTime} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-semibold">Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Assignment & Notes */}
            <section>
              <div className="flex items-center text-[#0b1f3d] dark:text-blue-400 font-bold mb-4 border-b border-slate-300 dark:border-slate-700 pb-2">
                <Users className="w-4 h-4 mr-2" />
                <h3 className="text-sm tracking-wide">Assignment & Context</h3>
              </div>
              <div className="mb-4 w-1/2 pr-2">
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-semibold">Assigned To *</label>
                <select name="assigneeId" value={formData.assigneeId} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none">
                  <option value="">Select Agent</option>
                  {Object.values(MOCK_USERS).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-semibold">Notes / Form Payload</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} placeholder="Add any details or paste form payload here..." className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </section>

          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-start space-x-3 shrink-0">
          <button type="submit" form="add-followup-form" className="px-5 py-2 text-sm font-medium bg-[#0b1f3d] hover:bg-[#16345e] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded transition shadow flex items-center">
            <span className="mr-1">💾</span> Save Follow-up
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded transition flex items-center">
            <X className="w-3 h-3 mr-1" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
