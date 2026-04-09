'use client';

import React, { useEffect, useMemo, useState } from 'react';

type HolidayRow = {
  id: string;
  date: string;
  name: string;
  type: string;
};

const defaultForm = {
  holidayDate: '',
  holidayName: '',
  holidayType: 'company',
};

function formatHolidayTypeLabel(type: string) {
  if (type === 'company') {
    return 'General';
  }

  if (!type) {
    return 'General';
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function HolidayManager() {
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadHolidays() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/HRM/api/admin/holidays', { method: 'GET' });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load holidays');
        }

        if (active) {
          setHolidays(result.holidays || []);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Failed to load holidays');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHolidays();
    return () => {
      active = false;
    };
  }, []);

  const nextSerialRows = useMemo(
    () => holidays.map((holiday, index) => ({ ...holiday, serialNumber: index + 1 })),
    [holidays]
  );

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const endpoint = editingId ? `/HRM/api/admin/holidays/${editingId}` : '/HRM/api/admin/holidays';
      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save holiday');
      }

      const nextHoliday = result.holiday;
      setHolidays((current) => {
        if (editingId) {
          return current
            .map((item) => (item.id === editingId ? nextHoliday : item))
            .sort((left, right) => left.date.localeCompare(right.date));
        }

        return [...current, nextHoliday].sort((left, right) => left.date.localeCompare(right.date));
      });
      setMessage(editingId ? 'Holiday updated successfully.' : 'Holiday added successfully.');
      resetForm();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to save holiday');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (holiday: HolidayRow) => {
    setEditingId(holiday.id);
    setForm({
      holidayDate: holiday.date,
      holidayName: holiday.name,
      holidayType: holiday.type || 'company',
    });
    setMessage('');
    setError('');
  };

  const handleDelete = async (holidayId: string) => {
    setMessage('');
    setError('');

    try {
      const response = await fetch(`/HRM/api/admin/holidays/${holidayId}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete holiday');
      }

      setHolidays((current) => current.filter((item) => item.id !== holidayId));
      if (editingId === holidayId) {
        resetForm();
      }
      setMessage('Holiday deleted successfully.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to delete holiday');
    }
  };

  return (
    <div className="p-10 pb-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-on-surface-variant">HR Admin / Holiday Calendar</p>
            <h1 className="mt-3 text-5xl font-extrabold tracking-tight text-on-surface">Holiday Management</h1>
            <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
              Add, update, and manage the yearly holiday list used across employee attendance and dashboard views.
            </p>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-sm">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-on-surface">{editingId ? 'Edit Holiday' : 'Add Holiday'}</h2>
              <p className="mt-2 text-sm text-on-surface-variant">Fill the same holiday details you maintain in your yearly sheet.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Date</span>
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  type="date"
                  value={form.holidayDate}
                  onChange={(event) => setForm((current) => ({ ...current, holidayDate: event.target.value }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Holiday</span>
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  value={form.holidayName}
                  onChange={(event) => setForm((current) => ({ ...current, holidayName: event.target.value }))}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Holiday Type</span>
                <select
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  value={form.holidayType}
                  onChange={(event) => setForm((current) => ({ ...current, holidayType: event.target.value }))}
                >
                  <option value="company">General</option>
                  <option value="national">National</option>
                  <option value="regional">Regional</option>
                </select>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Holiday' : 'Add Holiday'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl border border-outline-variant/15 bg-surface px-6 py-3 text-sm font-bold text-on-surface"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-on-surface">Holiday List</h2>
                <p className="mt-2 text-sm text-on-surface-variant">All holidays stored in `hrm_holidays`.</p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
                Loading holidays...
              </div>
            ) : nextSerialRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface px-5 py-6 text-sm text-on-surface-variant">
                No holidays have been added yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-outline-variant/10">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-surface-container-low text-on-surface">
                    <tr>
                      <th className="px-4 py-3 font-bold">Sl No.</th>
                      <th className="px-4 py-3 font-bold">Date</th>
                      <th className="px-4 py-3 font-bold">Holiday</th>
                      <th className="px-4 py-3 font-bold">Holiday Type</th>
                      <th className="px-4 py-3 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nextSerialRows.map((holiday) => (
                      <tr key={holiday.id} className="border-t border-outline-variant/10 bg-white">
                        <td className="px-4 py-3">{holiday.serialNumber}</td>
                        <td className="px-4 py-3">{new Date(`${holiday.date}T00:00:00`).toLocaleDateString('en-GB')}</td>
                        <td className="px-4 py-3 font-semibold text-on-surface">{holiday.name}</td>
                        <td className="px-4 py-3">{formatHolidayTypeLabel(holiday.type || 'company')}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(holiday)}
                              className="rounded-xl border border-outline-variant/15 bg-surface px-3 py-2 text-xs font-bold text-on-surface"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(holiday.id)}
                              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
