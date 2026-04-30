'use client';

import { useEffect, useState } from 'react';
import { useData } from './DataContext';

export default function AdminSettings() {
  const { user, refreshData } = useData();
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isSuperAdmin = user?.accountRole === 'Super Admin';

  useEffect(() => {
    setName(user?.name || '');
    setDesignation(user?.designation || '');
  }, [user?.name, user?.designation]);

  const handleSave = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/Taskmanager/api/admin/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          designation: isSuperAdmin ? designation : undefined,
          password: password || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Failed to save settings');
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setMessage('Settings updated');
      await refreshData();
    } catch (requestError) {
      setError(requestError.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl p-4 sm:p-6 lg:p-8">
      <h2 className="text-2xl font-bold text-black mb-2">Admin Settings</h2>
      <p className="text-slate-600 mb-6">Update your profile and account password.</p>

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </div>
        )}

        <label className="block text-sm">
          <span className="block text-slate-700 mb-1">Full Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
          />
        </label>

        <label className="block text-sm">
          <span className="block text-slate-700 mb-1">Email</span>
          <input
            type="email"
            value={user?.email || ''}
            readOnly
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
          />
        </label>

        {isSuperAdmin ? (
          <label className="block text-sm">
            <span className="block text-slate-700 mb-1">Executive Level</span>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="Founder / Co-Founder"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
            />
          </label>
        ) : null}

        <label className="block text-sm">
          <span className="block text-slate-700 mb-1">New Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
          />
        </label>

        <label className="block text-sm">
          <span className="block text-slate-700 mb-1">Confirm New Password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
          />
        </label>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-[#7F40EE] text-white font-medium hover:bg-[#6A31D1] disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
