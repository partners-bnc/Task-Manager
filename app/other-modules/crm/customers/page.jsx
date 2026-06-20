"use client";

import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import { useToast } from '../context/ToastContext';
import MOCK_DATA from '../data/mockData.json';
import { exportToCsv } from '../utils/export';
import ExcelImportButton from '../components/ExcelImportButton';
import GenericEditModal from '../components/GenericEditModal';

export default function CustomersPage() {
  const { permissions, currentUser } = useCrm();
  const { toast } = useToast();
  const [customers, setCustomers] = useState(MOCK_DATA.customers);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const handleEdit = (customer) => {
    if (permissions.isReadOnly) {
      toast.error("Permission Denied: Viewers cannot edit customers.");
      return;
    }
    setEditingCustomer(customer);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (updatedCustomer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
  };

  const handleImport = (importedData) => {
    // Map imported data to internal structure if needed, or just append
    const mappedData = importedData.map((row, index) => ({
      id: row.CustomerID || row.id || (Math.random() * 10000).toFixed(0),
      company: row.Name || row.company || 'Unknown',
      contact: row.ContactName || row.contact || 'Unknown',
      email: row.Email || row.email || '',
      notes: row.Notes || row.Status || ''
    }));
    setCustomers(prev => [...mappedData, ...prev]);
  };

  const handleAddCustomer = () => {
    const newCustomer = {
      id: Math.floor(Math.random() * 1000) + 1000,
      company: "New Assigned Client " + Math.floor(Math.random() * 100),
      contact: "New Lead",
      email: "contact@newclient.com",
      notes: "Auto-generated quick add."
    };
    setCustomers([newCustomer, ...customers]);
  };

  return (
    <div className="p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold dark:text-white">Customer Management</h1>
        <div className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 px-4 py-2 rounded-lg font-medium shadow-sm transition border border-transparent dark:border-blue-900">
          Welcome, {currentUser.name} ({currentUser.role})
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Customers</h3>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{customers.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Recently Added</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{Math.min(customers.length, 5)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Active Accounts</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{customers.length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-x-auto transition-colors duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold dark:text-white">Active Customers</h2>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => exportToCsv(customers, 'portfolio_customers_export.csv')}
               className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 px-4 py-2 rounded-md font-medium transition shadow-sm text-sm"
             >
               Export Data
             </button>
             <ExcelImportButton onImport={handleImport} />
             {!permissions.isReadOnly && (
               <button onClick={handleAddCustomer} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition shadow-sm text-sm">
                 + Add Customer
               </button>
             )}
          </div>
        </div>
        
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400">Company</th>
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400">Contact Person</th>
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400">Email</th>
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400">Notes</th>
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <tr key={customer.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="py-3 px-4 font-medium dark:text-slate-200">{customer.company}</td>
                <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{customer.contact}</td>
                <td className="py-3 px-4 text-sm text-blue-600 dark:text-blue-400">{customer.email}</td>
                <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{customer.notes}</td>
                <td className="py-3 px-4 text-right space-x-2">
                   {!permissions.isReadOnly && (
                     <button 
                       onClick={() => handleEdit(customer)}
                       className="text-sm px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded font-medium transition"
                     >
                       Edit
                     </button>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <GenericEditModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        itemData={editingCustomer}
        onSave={handleSaveEdit}
        title="Edit Customer"
        fields={[
          { key: 'company', label: 'Company Name', type: 'text' },
          { key: 'contact', label: 'Contact Person', type: 'text' },
          { key: 'email', label: 'Email Address', type: 'email' },
          { key: 'notes', label: 'Notes', type: 'textarea' }
        ]}
      />
    </div>
  );
}
