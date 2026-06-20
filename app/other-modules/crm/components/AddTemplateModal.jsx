import React, { useState } from 'react';
import { X, Mail } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function AddTemplateModal({ isOpen, onClose, onAdd }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subject: '',
    body: '',
    variables: '{{Lead_Name}}, {{Company_Name}}',
    status: 'Draft'
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.subject) {
      toast.warning("Template Name and Subject Line are required.");
      return;
    }
    onAdd({
      id: Math.floor(Math.random() * 1000) + 700,
      name: formData.name,
      category: formData.category || "General",
      subject: formData.subject,
      body: formData.body,
      variables: formData.variables,
      status: formData.status
    });
    setFormData({ name: '', category: '', subject: '', body: '', variables: '{{Lead_Name}}, {{Company_Name}}', status: 'Draft' });
    onClose();
  };

  const availableVars = "{{Lead_Name}}, {{Company_Name}}, {{Product_Name}}, {{Agent_Name}}, {{Estimated_Value}}, {{Currency}}";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-md shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="bg-[#0b1f3d] px-6 py-4 flex items-center justify-between text-white shrink-0">
          <h2 className="text-lg font-semibold flex items-center">
            <span className="mr-2 text-xl leading-none">+</span> Add Email Template
          </h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="add-template-form" onSubmit={handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">Template Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">Category *</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none">
                  <option value="">Select Category</option>
                  <option value="Outreach">Outreach</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Onboarding">Onboarding</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">Subject Line *</label>
              <input type="text" name="subject" value={formData.subject} onChange={handleChange} required className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm" />
            </div>

            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">Body Content *</label>
              <textarea name="body" value={formData.body} onChange={handleChange} rows={6} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white text-sm resize-none" />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-start">
                <span className="mr-1">ℹ</span> Available variables: {availableVars}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">Variables</label>
                <input type="text" name="variables" value={formData.variables} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none">
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-start space-x-3 shrink-0">
          <button type="submit" form="add-template-form" className="px-5 py-2 text-sm font-medium bg-[#0b1f3d] hover:bg-[#16345e] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded transition shadow flex items-center">
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
