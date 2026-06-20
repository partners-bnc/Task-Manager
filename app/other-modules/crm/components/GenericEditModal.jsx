"use client";

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * GenericEditModal
 * @param {boolean} isOpen 
 * @param {function} onClose 
 * @param {object} itemData - The data object to edit
 * @param {Array} fields - Array of field configs: { key: 'name', label: 'Company Name', type: 'text' }
 * @param {function} onSave - Callback with updated data object
 */
export default function GenericEditModal({ isOpen, onClose, itemData, fields, onSave, title = "Edit Record" }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (itemData) {
      setFormData({ ...itemData });
    }
  }, [itemData]);

  if (!isOpen) return null;

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {fields.map(field => (
            <div key={field.key} className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                {field.label}
              </label>
              {field.type === 'textarea' ? (
                <textarea 
                  className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={formData[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              ) : field.type === 'select' ? (
                <select
                  className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                >
                  <option value="">Select...</option>
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input 
                  type={field.type || 'text'}
                  className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
          >
            Save Changes
          </button>
        </div>
        
      </div>
    </div>
  );
}
