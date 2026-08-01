'use client';

import React, { useState } from 'react';
import { useVendor } from '../layout';
import {
  HandCoins,
  PlusCircle,
  FileText,
  Calendar,
  User,
  UploadCloud,
  File,
  X,
  Download,
  AlertCircle,
  ChevronDown,
  Edit2,
  Trash2
} from 'lucide-react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(val || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export default function FullAndFinalPayments() {
  const { payments, user, loading, refreshData } = useVendor();
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'add'
  const [vendorName, setVendorName] = useState('');
  const [natureOfPayment, setNatureOfPayment] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileErrors, setFileErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeDocModalFiles, setActiveDocModalFiles] = useState(null);

  // Edit Mode state
  const [editingId, setEditingId] = useState(null);
  const [editExistingDocs, setEditExistingDocs] = useState([]);
  const [deletedDocIds, setDeletedDocIds] = useState([]);

  // Filter payments for this page type
  const pagePayments = payments.filter((p) => p.payment_type === 'full_and_final');

  // Handle file selection and validation
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const errors = [];
    const validFiles = [];

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`File "${file.name}" exceeds 10 MB limit.`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setFileErrors(errors);
    } else {
      setFileErrors([]);
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileErrors([]);
  };

  // Submit Handler (Covers both POST for new entries and PATCH for updates)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorName || !natureOfPayment || !amount || !invoiceDate) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      if (editingId) {
        // Edit Mode: Send PATCH with multipart FormData (to handle files + metadata)
        const formData = new FormData();
        formData.append('id', editingId);
        formData.append('vendor_name', vendorName);
        formData.append('nature_of_payment', natureOfPayment);
        formData.append('amount', amount);
        formData.append('invoice_date', invoiceDate);
        formData.append('deleted_document_ids', JSON.stringify(deletedDocIds));
        
        selectedFiles.forEach((file) => {
          formData.append('new_documents', file);
        });

        const res = await fetch('/other-modules/vendor/api/payments', {
          method: 'PATCH',
          body: formData
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update entry.');
        }
      } else {
        // Create Mode: Send POST
        const formData = new FormData();
        formData.append('payment_type', 'full_and_final');
        formData.append('vendor_name', vendorName);
        formData.append('nature_of_payment', natureOfPayment);
        formData.append('amount', amount);
        formData.append('invoice_date', invoiceDate);
        
        selectedFiles.forEach((file) => {
          formData.append('documents', file);
        });

        const res = await fetch('/other-modules/vendor/api/payments', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create settlement entry.');
        }
      }

      // Success Reset
      resetForm();
      setActiveTab('list');
      refreshData();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setVendorName('');
    setNatureOfPayment('');
    setAmount('');
    setInvoiceDate('');
    setSelectedFiles([]);
    setFileErrors([]);
    setEditingId(null);
    setEditExistingDocs([]);
    setDeletedDocIds([]);
    setErrorMessage('');
  };

  // Switch to Edit Mode in Form Panel
  const startEdit = (payment) => {
    setEditingId(payment.id);
    setVendorName(payment.vendor_name);
    setNatureOfPayment(payment.nature_of_payment);
    setAmount(String(payment.amount));
    
    // Format date as YYYY-MM-DD for native input
    const d = new Date(payment.invoice_date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setInvoiceDate(`${year}-${month}-${day}`);

    setEditExistingDocs(payment.documents || []);
    setDeletedDocIds([]);
    setActiveTab('add'); // Switch view tab to the Form panel
  };

  // Delete Handler
  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Are you sure you want to delete this settlement entry? This will also remove all attached files permanently.')) return;
    
    try {
      const res = await fetch(`/other-modules/vendor/api/payments?id=${paymentId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        refreshData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete entry.');
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };

  // Update Payment Status
  const handleUpdateStatus = async (paymentId, nextStatus) => {
    try {
      const res = await fetch('/other-modules/vendor/api/payments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, status: nextStatus })
      });

      if (res.ok) {
        refreshData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status.');
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Status Badge Dropdown Component
  const StatusBadgeDropdown = ({ status, paymentId }) => {
    const getStatusStyles = (s) => {
      switch (s) {
        case 'paid':
          return 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
        case 'approved':
          return 'bg-blue-50 text-blue-700 border-blue-200/50';
        default:
          return 'bg-amber-50 text-amber-700 border-amber-250/20';
      }
    };

    return (
      <div className="relative inline-block">
        <select
          value={status}
          onChange={(e) => handleUpdateStatus(paymentId, e.target.value)}
          className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[11px] font-extrabold outline-none transition-all pr-6.5 appearance-none bg-no-repeat bg-[right_6px_center] ${getStatusStyles(status)}`}
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
            backgroundSize: '12px'
          }}
        >
          <option value="invoice_uploaded" className="bg-white text-slate-800">Uploaded</option>
          <option value="approved" className="bg-white text-slate-805 text-slate-800">Approved</option>
          <option value="paid" className="bg-white text-slate-800">Paid</option>
        </select>
      </div>
    );
  };

  // Documents Cell Component
  const DocumentsCell = ({ documents }) => {
    if (!documents || documents.length === 0) {
      return <span className="text-xs text-slate-400 font-medium">No files</span>;
    }

    if (documents.length === 1) {
      const doc = documents[0];
      return (
        <a
          href={doc.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 px-2 py-1 text-[11px] text-slate-700 transition-colors font-semibold"
          title={`${doc.file_name} (${Math.round(doc.file_size / 1024)} KB)`}
        >
          <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate max-w-[80px]">{doc.file_name}</span>
          <Download className="w-3 h-3 text-slate-400 flex-shrink-0" />
        </a>
      );
    }

    return (
      <button
        onClick={() => setActiveDocModalFiles(documents)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200/50 hover:bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700 transition-colors"
      >
        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
        {documents.length} Files
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 min-h-screen transition-colors duration-300">
      {/* Header & Toggle Switch */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[linear-gradient(135deg,#d1fae5_0%,#a7f3d0_100%)] text-emerald-700 shadow-xs shrink-0">
              <HandCoins className="w-6 h-6" />
            </div>
            Full & Final (F&F) Settlements
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">
            Submit, process, and track payout settlements for exiting employees, contractors, or closed projects.
          </p>
        </div>

        {/* Two-Button Toggle Switch (HRM Style) */}
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200/60 shadow-xs shrink-0 self-start lg:self-center">
          <button
            onClick={() => {
              resetForm();
              setActiveTab('list');
            }}
            className={`px-4 py-2 rounded-xl text-[11px] md:text-xs font-extrabold transition-all duration-200 ${
              activeTab === 'list'
                ? 'bg-[linear-gradient(180deg,#d7e7f9_0%,#7eb0ec_100%)] text-violet-955 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Settlements ({pagePayments.length})
          </button>
          <button
            onClick={() => {
              resetForm();
              setActiveTab('add');
            }}
            className={`px-4 py-2 rounded-xl text-[11px] md:text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'add' && !editingId
                ? 'bg-[linear-gradient(180deg,#d7e7f9_0%,#7eb0ec_100%)] text-violet-955 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Upload & Add New
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === 'list' ? (
        /* List View (Table styled with compact paddings and responsive overflow) */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto w-full [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            <table className="w-full text-left text-sm border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider text-slate-405 bg-slate-50/50">
                  <th className="py-2.5 px-3">Beneficiary</th>
                  <th className="py-2.5 px-3">Nature</th>
                  <th className="py-2.5 px-3">Settlement Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Progress Status</th>
                  <th className="py-2.5 px-3">Uploaded By</th>
                  <th className="py-2.5 px-3">Uploaded Date</th>
                  <th className="py-2.5 px-3">Doc</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-750 bg-white">
                {pagePayments.length > 0 ? (
                  pagePayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-2.5 px-3 font-extrabold text-slate-900 text-xs md:text-sm">
                        {p.vendor_name}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-semibold text-slate-500">
                        {p.nature_of_payment}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-bold text-slate-600">
                        {formatDate(p.invoice_date)}
                      </td>
                      <td className="py-2.5 px-3 font-black text-slate-900 text-xs md:text-sm">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadgeDropdown status={p.payment_status} paymentId={p.id} />
                      </td>
                      <td className="py-2.5 px-3 text-[11px] md:text-xs text-slate-700 font-bold">
                        {p.created_by_name}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] md:text-xs text-slate-400 font-medium">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="py-2.5 px-3">
                        <DocumentsCell documents={p.documents} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(p)}
                            className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                            title="Edit details"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(p.id)}
                            className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium text-xs">
                      {"No Full & Final settlements found. Click on 'Upload & Add New' to submit a settlement invoice."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Form View (Covers both creation and editing) */
        <div className="max-w-3xl mx-auto bg-white p-5 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-5">
            <div className="p-2.5 rounded-2xl bg-[linear-gradient(135deg,#d1fae5_0%,#a7f3d0_100%)] text-emerald-700 shadow-xs shrink-0">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-900">
                {editingId ? 'Edit F&F Settlement Entry' : 'New F&F Settlement Entry'}
              </h2>
              <p className="text-[11px] md:text-xs text-slate-400 mt-0.5">
                {editingId ? 'Modify settlement details and update attachments.' : 'Submit full & final settlement details and attach supporting documents.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800 flex items-center gap-2.5 text-xs md:text-sm">
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Autofilled metadata summary card */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Creator (Auto)</p>
                <p className="text-xs md:text-sm font-bold text-slate-600 mt-0.5">{user?.name || 'Loading...'}</p>
              </div>
              <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Creation Date (Auto)</p>
                <p className="text-xs md:text-sm font-bold text-slate-600 mt-0.5">{formatDate(new Date())}</p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Beneficiary Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Employee or Contractor Name"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-205 bg-white px-3.5 py-2.5 text-xs md:text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nature of Settlement *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Resignation clearance, contract end payout"
                  value={natureOfPayment}
                  onChange={(e) => setNatureOfPayment(e.target.value)}
                  className="w-full rounded-2xl border border-slate-205 bg-white px-3.5 py-2.5 text-xs md:text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all font-medium"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount (INR) *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <span className="text-xs md:text-sm font-semibold">₹</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-7.5 pr-3.5 py-2.5 text-xs md:text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Settlement Date *</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs md:text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Existing Documents List (Only shown in Edit mode) */}
            {editingId && editExistingDocs.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Currently Attached Documents</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {editExistingDocs.map((doc) => {
                    const isDeleted = deletedDocIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                          isDeleted
                            ? 'bg-rose-50/30 border-rose-100 opacity-60 line-through text-slate-400'
                            : 'bg-white border-slate-200/60 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <File className={`w-4 h-4 flex-shrink-0 ${isDeleted ? 'text-rose-350' : 'text-emerald-500'}`} />
                          <div className="min-w-0">
                            <p className="text-[11px] md:text-xs font-bold truncate max-w-[140px]">{doc.file_name}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{Math.round(doc.file_size / 1024)} KB</p>
                          </div>
                        </div>
                        {isDeleted ? (
                          <button
                            type="button"
                            onClick={() => setDeletedDocIds((prev) => prev.filter((id) => id !== doc.id))}
                            className="text-[11px] font-extrabold text-blue-650 hover:text-blue-755 underline transition-colors mr-1 cursor-pointer"
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletedDocIds((prev) => [...prev, doc.id])}
                            className="p-1 rounded-lg hover:bg-slate-100 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Document Upload Area */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {editingId ? 'Upload Additional Documents' : 'Upload Settlement Documents'}
              </label>
              
              <div className="border-2 border-dashed border-slate-200 rounded-3xl p-5 md:p-6 text-center hover:border-emerald-500/50 transition-colors relative cursor-pointer group">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-8 h-8 text-slate-405 mx-auto mb-2 group-hover:scale-105 transition-transform" />
                <p className="text-xs md:text-sm font-semibold text-slate-700">Click to upload files</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Upload multiple documents up to 10 MB per file</p>
              </div>

              {fileErrors.length > 0 && (
                <div className="space-y-1">
                  {fileErrors.map((err, i) => (
                    <p key={i} className="text-xs text-rose-600 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {err}
                    </p>
                  ))}
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-100 space-y-2">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">New Documents to Attach ({selectedFiles.length})</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/50 shadow-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] md:text-xs font-bold text-slate-805 truncate max-w-[140px]">{file.name}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{Math.round(file.size / (1024 * 1024) * 10) / 10} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions (HRM Style Buttons) */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-150 pt-5">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveTab('list');
                }}
                className="px-5 py-2.5 rounded-2xl border border-violet-200 bg-white text-xs font-extrabold text-violet-750 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-2xl bg-[linear-gradient(180deg,#d7e7f9_0%,#7eb0ec_100%)] text-xs font-extrabold text-violet-955 shadow-[0_12px_22px_rgba(49,112,197,0.12)] hover:bg-[linear-gradient(180deg,#c0d7f2_0%,#6ba0e3_100%)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border-none cursor-pointer"
              >
                {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Save & Submit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Screen Centered Viewport Modal for Attached Documents */}
      {activeDocModalFiles && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xl w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Attached Files ({activeDocModalFiles.length})
              </h3>
              <button
                onClick={() => setActiveDocModalFiles(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-655 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide">
              {activeDocModalFiles.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors text-slate-700 font-bold"
                  onClick={() => setActiveDocModalFiles(null)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs truncate max-w-[190px]">{doc.file_name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{Math.round(doc.file_size / 1024)} KB</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </a>
              ))}
            </div>
            
            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveDocModalFiles(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
