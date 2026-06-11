'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Task {
  id: string;
  task_name: string;
  created_at: string;
}

interface LogEntry {
  id?: string;
  client_name: string;
  task_id: string;
  task_name_snapshot: string;
  hours_spent: string;
  remarks: string;
  isExisting?: boolean;
}

interface DailyWorkLogModalProps {
  date: string;
  tasks: Task[];
  onSubmitAndCheckout: (entries: LogEntry[]) => Promise<void>;
  onClose: () => void;
}

const EMPTY_FORM: Omit<LogEntry, 'isExisting'> = {
  client_name: '',
  task_id: '',
  task_name_snapshot: '',
  hours_spent: '',
  remarks: '',
};

export default function DailyWorkLogModal({
  date,
  tasks,
  onSubmitAndCheckout,
  onClose,
}: DailyWorkLogModalProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitError, setSubmitError] = useState('');
  // inline edit state: index -> edited values
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Omit<LogEntry, 'isExisting'>>({ ...EMPTY_FORM });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const clientRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/HRM/api/attendance/work-log?date=${date}`);
        const result = await res.json();
        if (active && Array.isArray(result.logs) && result.logs.length > 0) {
          setEntries(
            result.logs.map((log: any) => ({
              id: log.id,
              client_name: log.client_name,
              task_id: log.task_id || '',
              task_name_snapshot: log.task_name_snapshot || '',
              hours_spent: String(log.hours_spent),
              remarks: log.remarks || '',
              isExisting: true,
            }))
          );
        }
      } catch {
        // silently ignore
      } finally {
        if (active) setLoadingExisting(false);
      }
    }
    load();
    return () => { active = false; };
  }, [date]);

  useEffect(() => {
    if (!loadingExisting) setTimeout(() => clientRef.current?.focus(), 80);
  }, [loadingExisting]);

  const handleFormChange = (field: string, value: string) => {
    setFormError('');
    if (field === 'task_id') {
      const task = tasks.find((t) => t.id === value);
      setForm((prev) => ({ ...prev, task_id: value, task_name_snapshot: task?.task_name || '' }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleAddEntry = () => {
    if (!form.client_name.trim()) {
      setFormError('Client name is required.');
      clientRef.current?.focus();
      return;
    }
    if (!form.task_id) {
      setFormError('Please select a project/task.');
      return;
    }
    const hours = parseFloat(form.hours_spent);
    if (!form.hours_spent || isNaN(hours) || hours <= 0 || hours > 24) {
      setFormError('Enter valid hours (0.5 – 24).');
      return;
    }
    if (!form.remarks.trim()) {
      setFormError('Remarks are required.');
      return;
    }
    setEntries((prev) => [...prev, { ...form }]);
    setForm({ ...EMPTY_FORM });
    setFormError('');
  };

  // Delete — removes from DB if existing, else just from state
  const handleDelete = async (index: number) => {
    const entry = entries[index];
    if (entry.isExisting && entry.id) {
      setDeletingIndex(index);
      try {
        const res = await fetch(`/HRM/api/attendance/work-log?id=${entry.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const r = await res.json();
          alert(r.error || 'Failed to delete');
          return;
        }
      } catch {
        alert('Failed to delete');
        return;
      } finally {
        setDeletingIndex(null);
      }
    }
    setEntries((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  // Start edit
  const handleStartEdit = (index: number) => {
    const entry = entries[index];
    setEditForm({
      client_name: entry.client_name,
      task_id: entry.task_id,
      task_name_snapshot: entry.task_name_snapshot,
      hours_spent: entry.hours_spent,
      remarks: entry.remarks,
    });
    setEditingIndex(index);
  };

  const handleEditFormChange = (field: string, value: string) => {
    if (field === 'task_id') {
      const task = tasks.find((t) => t.id === value);
      setEditForm((prev) => ({ ...prev, task_id: value, task_name_snapshot: task?.task_name || prev.task_name_snapshot }));
    } else {
      setEditForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Save edit — updates DB if existing, else just updates state
  const handleSaveEdit = async (index: number) => {
    if (!editForm.client_name.trim()) {
      alert('Client name is required.');
      return;
    }
    if (!editForm.task_id) {
      alert('Please select a project/task.');
      return;
    }
    const hours = parseFloat(editForm.hours_spent);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      alert('Enter valid hours.');
      return;
    }
    if (!editForm.remarks.trim()) {
      alert('Remarks are required.');
      return;
    }

    const entry = entries[index];
    setSavingEdit(true);
    try {
      if (entry.isExisting && entry.id) {
        const res = await fetch(`/HRM/api/attendance/work-log?id=${entry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_name: editForm.client_name.trim(),
            task_id: editForm.task_id || null,
            task_name_snapshot: editForm.task_name_snapshot || null,
            hours_spent: hours,
            remarks: editForm.remarks.trim() || null,
          }),
        });
        if (!res.ok) {
          const r = await res.json();
          alert(r.error || 'Failed to update');
          return;
        }
      }
      setEntries((prev) =>
        prev.map((e, i) =>
          i === index
            ? { ...e, ...editForm, hours_spent: String(hours) }
            : e
        )
      );
      setEditingIndex(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const totalHours = entries.reduce((sum, e) => sum + (parseFloat(e.hours_spent) || 0), 0);
  const newEntriesCount = entries.filter((e) => !e.isExisting).length;
  const canCheckout = entries.length > 0;

  const handleSubmit = async () => {
    if (entries.length === 0) {
      setSubmitError('Add at least one work log entry before checking out.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmitAndCheckout(entries);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit. Please try again.');
      setSubmitting(false);
    }
  };

  const formattedDate = (() => {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-3 overflow-y-auto">
      <div className="relative w-full max-w-5xl flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200/60 overflow-hidden my-2 sm:my-0 sm:max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-violet-500 text-lg sm:text-xl">assignment_turned_in</span>
              Daily Work Log
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{formattedDate} · Fill your work summary before checking out</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">

          {/* LEFT — Add Entry Form */}
          <div className="w-full lg:w-72 xl:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 p-4 flex flex-col gap-3 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Add Entry</p>

            {formError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {formError}
              </div>
            )}

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Client <span className="text-red-400">*</span>
                </label>
                <input
                  ref={clientRef}
                  type="text"
                  value={form.client_name}
                  onChange={(e) => handleFormChange('client_name', e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddEntry(); } }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Project / Task <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.task_id}
                  onChange={(e) => handleFormChange('task_id', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-violet-400 bg-white transition"
                >
                  <option value="">— Select a task —</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>{task.task_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Hours Spent <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={form.hours_spent}
                  onChange={(e) => handleFormChange('hours_spent', e.target.value)}
                  placeholder="e.g. 2.5"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Remarks <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.remarks}
                  onChange={(e) => handleFormChange('remarks', e.target.value)}
                  placeholder="What did you accomplish?"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 resize-none transition"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddEntry}
              className="mt-auto w-full py-2 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold hover:bg-violet-100 transition flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Add to List
            </button>
          </div>

          {/* RIGHT — Entries Table */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Today's Work Entries</p>
              {entries.length > 0 && (
                <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
                  Total: {totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)} hrs
                </span>
              )}
            </div>

            {loadingExisting ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
                Loading previous entries...
              </div>
            ) : entries.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-8">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-40">inbox</span>
                <p className="text-sm">No entries yet. Add your first work entry on the left.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-xs min-w-[480px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-2 pr-3 font-semibold text-[10px] uppercase tracking-wider text-slate-400 w-[18%]">Client</th>
                      <th className="pb-2 pr-3 font-semibold text-[10px] uppercase tracking-wider text-slate-400 w-[35%]">Project / Task</th>
                      <th className="pb-2 pr-3 font-semibold text-[10px] uppercase tracking-wider text-slate-400 w-[10%]">Hours</th>
                      <th className="pb-2 pr-3 font-semibold text-[10px] uppercase tracking-wider text-slate-400">Remarks</th>
                      <th className="pb-2 w-16 text-right font-semibold text-[10px] uppercase tracking-wider text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {entries.map((entry, index) => (
                      <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                        {editingIndex === index ? (
                          /* Inline edit row */
                          <>
                            <td className="py-2 pr-3">
                              <input
                                type="text"
                                value={editForm.client_name}
                                onChange={(e) => handleEditFormChange('client_name', e.target.value)}
                                className="w-full px-2 py-1 rounded border border-violet-300 text-xs outline-none"
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <select
                                value={editForm.task_id}
                                onChange={(e) => handleEditFormChange('task_id', e.target.value)}
                                className="w-full px-2 py-1 rounded border border-violet-300 text-xs outline-none bg-white"
                              >
                                <option value="">— No task —</option>
                                {tasks.map((t) => (
                                  <option key={t.id} value={t.id}>{t.task_name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                type="number"
                                min="0.5"
                                max="24"
                                step="0.5"
                                value={editForm.hours_spent}
                                onChange={(e) => handleEditFormChange('hours_spent', e.target.value)}
                                className="w-full px-2 py-1 rounded border border-violet-300 text-xs outline-none"
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                type="text"
                                value={editForm.remarks}
                                onChange={(e) => handleEditFormChange('remarks', e.target.value)}
                                className="w-full px-2 py-1 rounded border border-violet-300 text-xs outline-none"
                              />
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(index)}
                                  disabled={savingEdit}
                                  className="w-6 h-6 flex items-center justify-center rounded text-emerald-500 hover:bg-emerald-50 transition-colors"
                                  title="Save"
                                >
                                  <span className="material-symbols-outlined text-sm">check</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingIndex(null)}
                                  className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 transition-colors"
                                  title="Cancel edit"
                                >
                                  <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          /* Normal display row */
                          <>
                            <td className="py-2.5 pr-3 font-medium text-slate-800 truncate max-w-0 w-[18%]">
                              <span className="block truncate">{entry.client_name}</span>
                            </td>
                            <td className="py-2.5 pr-3 text-slate-600 truncate max-w-0 w-[35%]">
                              <span className="block truncate">{entry.task_name_snapshot || <span className="text-slate-300">—</span>}</span>
                            </td>
                            <td className="py-2.5 pr-3 whitespace-nowrap w-[10%]">
                              <span className="text-slate-800 font-medium">{entry.hours_spent}h</span>
                            </td>
                            <td className="py-2.5 pr-3 text-slate-500 truncate max-w-0">
                              <span className="block truncate">{entry.remarks || <span className="text-slate-300">—</span>}</span>
                            </td>
                            <td className="py-2.5 text-right w-20">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(index)}
                                  className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-violet-600 transition-colors"
                                  title="Edit"
                                >
                                  <span className="material-symbols-outlined" style={{fontSize:'17px'}}>edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(index)}
                                  disabled={deletingIndex === index}
                                  className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-red-500 transition-colors"
                                  title="Delete"
                                >
                                  <span className="material-symbols-outlined" style={{fontSize:'17px'}}>
                                    {deletingIndex === index ? 'hourglass_top' : 'delete'}
                                  </span>
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 bg-slate-50/60">
          <div className="text-xs text-slate-500 leading-relaxed">
            {newEntriesCount > 0 ? (
              <span className="text-violet-600 font-semibold">
                {newEntriesCount} new {newEntriesCount === 1 ? 'entry' : 'entries'} will be saved
              </span>
            ) : entries.length > 0 ? (
              <span>Checking out with <span className="font-semibold text-slate-700">{entries.length}</span> existing {entries.length === 1 ? 'entry' : 'entries'} from today.</span>
            ) : (
              <span>You must add at least one work entry to check out. Please fill your <span className="font-semibold text-slate-700">8 hours</span> of work.</span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            {submitError && (
              <span className="text-xs text-red-500">{submitError}</span>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-500 hover:bg-slate-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canCheckout}
              className="px-4 sm:px-5 py-2 rounded-xl bg-violet-600 text-white text-xs sm:text-sm font-bold hover:bg-violet-700 transition flex items-center gap-2 shadow-md shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-base">
                {submitting ? 'hourglass_top' : 'logout'}
              </span>
              {submitting ? 'Checking Out...' : 'Submit & Check Out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
