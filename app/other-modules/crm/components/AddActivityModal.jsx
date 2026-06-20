import React, { useState } from 'react';
import { X, Phone, FileText, Paperclip } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import MOCK_DATA from '../data/mockData.json';

export default function AddActivityModal({ isOpen, onClose, onAdd }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    leadId: '',
    type: 'admin note added',
    subject: '',
    description: '',
    outcome: '',
    nextAction: '',
    duration: '',
    callStatus: 'N/A',
    participants: '',
    attachmentUrl: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.leadId || !formData.subject) {
      toast.warning("Lead and Subject are required.");
      return;
    }
    onAdd({
      id: "ACT" + (Math.floor(Math.random() * 900) + 100),
      type: formData.type,
      date: new Date().toISOString().split('T')[0],
      subject: formData.subject,
      description: formData.description,
      outcome: formData.outcome || "Neutral",
      duration: formData.duration ? formData.duration + " min" : "-",
      assigneeId: "u1",
      leadId: parseInt(formData.leadId)
    });
    setFormData({ leadId: '', type: 'admin note added', subject: '', description: '', outcome: '', nextAction: '', duration: '', callStatus: 'N/A', participants: '', attachmentUrl: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-md shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#0b1f3d] px-6 py-4 flex items-center justify-between text-white shrink-0">
          <h2 className="text-lg font-semibold flex items-center">
             <span className="mr-2 text-xl leading-none">+</span> Add Activity
          </h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="add-activity-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Activity Details */}
            <section>
              <div className="flex items-center text-[#0b1f3d] dark:text-blue-400 font-bold mb-4 border-b border-slate-300 dark:border-slate-700 pb-2">
                <Phone className="w-4 h-4 mr-2" />
                <h3 className="text-sm tracking-wide">Activity Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Lead *</label>
                  <select name="leadId" value={formData.leadId} onChange={handleChange} required className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm">
                    <option value="">Select Lead</option>
                    {MOCK_DATA.leads.map(lead => (
                      <option key={lead.id} value={lead.id}>{lead.contact} (LEAD{String(lead.id).padStart(3, '0')})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Activity Type *</label>
                  <select name="type" value={formData.type} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm">
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
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Subject *</label>
                <input type="text" name="subject" value={formData.subject} onChange={handleChange} required className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm" />
              </div>
            </section>

            {/* Description & Outcome */}
            <section>
              <div className="flex items-center text-[#0b1f3d] dark:text-blue-400 font-bold mb-4 border-b border-slate-300 dark:border-slate-700 pb-2">
                <FileText className="w-4 h-4 mr-2" />
                <h3 className="text-sm tracking-wide">Description & Outcome</h3>
              </div>
              <div className="mb-4">
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Outcome</label>
                  <select name="outcome" value={formData.outcome} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm">
                    <option value="">Select Outcome</option>
                    <option value="Positive">Positive</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Interested">Interested</option>
                    <option value="Not Interested">Not Interested</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Next Action</label>
                  <input type="text" name="nextAction" value={formData.nextAction} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm" />
                </div>
              </div>
              <div className="mt-4 w-1/2 pr-2">
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Duration (Minutes)</label>
                <input type="number" name="duration" value={formData.duration} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm" />
              </div>
            </section>

            {/* Call Details — only if type is call completed */}
            {(formData.type === 'call completed') && (
              <section>
                <div className="flex items-center text-[#0b1f3d] dark:text-blue-400 font-bold mb-4 border-b border-slate-300 dark:border-slate-700 pb-2">
                  <Phone className="w-4 h-4 mr-2" />
                  <h3 className="text-sm tracking-wide">Call Details</h3>
                </div>
                <div className="w-1/2 pr-2">
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Call Status</label>
                  <select name="callStatus" value={formData.callStatus} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm">
                    <option value="N/A">N/A</option>
                    <option value="Completed">Completed</option>
                    <option value="No Answer">No Answer</option>
                    <option value="Voicemail">Voicemail</option>
                  </select>
                </div>
              </section>
            )}

            {/* Additional */}
            <section>
              <div className="flex items-center text-[#0b1f3d] dark:text-blue-400 font-bold mb-4 border-b border-slate-300 dark:border-slate-700 pb-2">
                <Paperclip className="w-4 h-4 mr-2" />
                <h3 className="text-sm tracking-wide">Additional</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Participants</label>
                  <input type="text" name="participants" value={formData.participants} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Attachment URL</label>
                  <input type="text" name="attachmentUrl" value={formData.attachmentUrl} onChange={handleChange} placeholder="https://" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm placeholder:text-slate-400" />
                </div>
              </div>
            </section>

          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-start space-x-3 shrink-0">
          <button type="submit" form="add-activity-form" className="px-5 py-2 text-sm font-medium bg-[#0b1f3d] hover:bg-[#16345e] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded transition shadow flex items-center">
            <span className="mr-1">💾</span> Save
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded transition flex items-center">
            <X className="w-3 h-3 mr-1" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
