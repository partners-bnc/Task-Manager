import React, { useState } from 'react';
import { X, User, Building2, Tag } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function AddLeadModal({ isOpen, onClose, onAdd }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    leadName: '',
    email: '',
    phone: '',
    phoneSecondary: '',
    customerName: '',
    companyName: '',
    jobTitle: '',
    industry: '',
    leadSource: '',
    status: 'New',
    priority: 'Medium',
    value: '',
    currency: 'USD'
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.leadName) {
      toast.warning("Lead Name is required.");
      return;
    }
    
    // Pass transformed data back up
    onAdd({
      id: Math.floor(Math.random() * 1000) + 100,
      company: formData.companyName || "Unknown Company",
      contact: formData.leadName,
      value: formData.value ? `$${formData.value}` : "$0",
      status: formData.status,
      // Need assigneeId injected at parent, or pass it here
    });
    
    // Reset and close
    setFormData({
      leadName: '', email: '', phone: '', phoneSecondary: '', customerName: '', companyName: '', jobTitle: '', industry: '', leadSource: '', status: 'New', priority: 'Medium', value: '', currency: 'USD'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header - Navy Blue matching image */}
        <div className="bg-[#0b1f3d] px-6 py-4 flex items-center justify-between text-white border-b border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold flex items-center">
             <span className="mr-2 text-xl leading-none">+</span> Add Lead
          </h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 md:p-8 overflow-y-auto max-h-[75vh]">
          <form id="add-lead-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Basic Information Section */}
            <section>
              <div className="flex items-center text-[#0b1f3d] dark:text-blue-400 font-bold mb-4 border-b border-slate-300 dark:border-slate-700 pb-2">
                <User className="w-4 h-4 mr-2" />
                <h3 className="text-sm tracking-wide">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Lead Name *</label>
                  <input type="text" name="leadName" value={formData.leadName} onChange={handleChange} required className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Phone (Secondary)</label>
                  <input type="tel" name="phoneSecondary" value={formData.phoneSecondary} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" />
                </div>
              </div>
            </section>

            {/* Company Details Section */}
            <section>
              <div className="flex items-center text-[#0b1f3d] dark:text-blue-400 font-bold mb-4 border-b border-slate-300 dark:border-slate-700 pb-2">
                <Building2 className="w-4 h-4 mr-2" />
                <h3 className="text-sm tracking-wide">Company Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Customer Name</label>
                  <input type="text" name="customerName" placeholder="Search or type customer name" value={formData.customerName} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white placeholder:text-slate-400" />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Company Name</label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Job Title</label>
                  <input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Industry</label>
                  <select name="industry" value={formData.industry} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-slate-400">
                    <option value="">Select Industry</option>
                    <option value="Tech">Technology</option>
                    <option value="Finance">Finance</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Retail">Retail</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Classification Section */}
            <section>
              <div className="flex items-center text-[#0b1f3d] dark:text-blue-400 font-bold mb-4 border-b border-slate-300 dark:border-slate-700 pb-2">
                <Tag className="w-4 h-4 mr-2" />
                <h3 className="text-sm tracking-wide">Classification</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Lead Source</label>
                  <select name="leadSource" value={formData.leadSource} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-slate-400">
                    <option value="">Select Source</option>
                    <option value="Service Enquiry">Service Enquiry</option>
                    <option value="Expert Request">Expert Request</option>
                    <option value="Voice Requirement">Voice Requirement</option>
                    <option value="Partner Registration">Partner Registration</option>
                    <option value="Contact Form">Contact Form</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Lead Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white">
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Won">Won</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Estimated Value</label>
                  <input type="text" name="value" value={formData.value} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Currency</label>
                  <input type="text" name="currency" value={formData.currency} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" readOnly />
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-end space-x-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="add-lead-form"
            className="px-6 py-2 text-sm font-medium bg-[#0b1f3d] hover:bg-[#16345e] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded transition shadow"
          >
            Save Lead
          </button>
        </div>

      </div>
    </div>
  );
}
