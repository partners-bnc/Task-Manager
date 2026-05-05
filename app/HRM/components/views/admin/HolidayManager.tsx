'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useHrmFeedback } from '../../ui/HrmFeedback';
import HrmEmptyState from '../../ui/HrmEmptyState';
import { TableRowsSkeleton } from '../../ui/Skeleton';

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
  const { showFeedback, confirmFeedback } = useHrmFeedback();
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadHolidays() {
      setLoading(true);

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
          showFeedback({ type: 'error', title: 'Holidays Not Loaded', message: requestError instanceof Error ? requestError.message : 'Failed to load holidays' });
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
  }, [showFeedback]);

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
      showFeedback({
        type: 'success',
        title: editingId ? 'Holiday Updated' : 'Holiday Added',
        message: editingId ? 'Holiday updated successfully.' : 'Holiday added successfully.',
      });
      resetForm();
    } catch (requestError) {
      showFeedback({ type: 'error', title: 'Holiday Not Saved', message: requestError instanceof Error ? requestError.message : 'Failed to save holiday' });
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
  };

  const handleDelete = async (holidayId: string) => {
    const confirmed = await confirmFeedback({
      type: 'warning',
      title: 'Delete Holiday',
      message: 'Delete this holiday from the calendar?',
      confirmLabel: 'Delete Holiday',
    });
    if (!confirmed) return;

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
      showFeedback({ type: 'success', title: 'Holiday Deleted', message: 'Holiday deleted successfully.' });
    } catch (requestError) {
      showFeedback({ type: 'error', title: 'Holiday Not Deleted', message: requestError instanceof Error ? requestError.message : 'Failed to delete holiday' });
    }
  };

  return (
    <div className="p-10 pb-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100/90 text-violet-700 shadow-sm">
                <span className="material-symbols-outlined text-[22px]">calendar_month</span>
              </div>
              <h1 className="text-3xl font-headline font-bold text-on-background">Holiday Calendar Management</h1>
            </div>
            <p className="pl-14 text-sm leading-6 text-on-surface-variant">
              Add, update, and manage the yearly holiday list used across employee attendance and dashboard views.
            </p>
          </div>
        </section>

        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-on-surface">Holiday List</h2>
              </div>
            </div>

            {loading ? (
              <div className="overflow-hidden rounded-2xl border border-outline-variant/10">
                <TableRowsSkeleton rows={5} columns={5} />
              </div>
            ) : nextSerialRows.length === 0 ? (
              <HrmEmptyState
                compact
                icon="event_busy"
                title="No holidays added yet"
                message="Create the first holiday entry so employees can see the calendar in attendance and dashboard views."
              />
            ) : (
              <div className="rounded-2xl border border-outline-variant/10">
                <div className="overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-20 bg-surface-container-low text-on-surface">
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
              </div>
            )}
          </section>

          <section className="self-start rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-sm xl:sticky xl:top-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-on-surface">{editingId ? 'Edit Holiday' : 'Add Holiday'}</h2>
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
        </div>
      </div>
    </div>
  );
}
