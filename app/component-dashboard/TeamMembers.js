'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FileDown, Plus } from 'lucide-react';
import { useData } from './DataContext';

export default function TeamMembers() {
  const { users, tasks, loading, error, refreshData, isAdminMode } = useData();
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({
    employeeId: '',
    name: '',
    username: '',
    email: '',
    role: '',
  });
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    employeeId: '',
    name: '',
    username: '',
    email: '',
    role: '',
  });
  const [createProfilePicture, setCreateProfilePicture] = useState(null);

  const getUserStats = (userId) => {
    const userTasks = tasks.filter((t) => t.assignees.includes(userId));
    return {
      pending: userTasks.filter((t) => t.status === 'Pending').length,
      inProgress: userTasks.filter((t) => t.status === 'In Progress').length,
      completed: userTasks.filter((t) => t.status === 'Completed').length,
    };
  };

  const closeModal = () => {
    setIsDetailOpen(false);
    setSelectedUser(null);
    setModalError('');
    setForm({
      employeeId: '',
      name: '',
      username: '',
      email: '',
      role: '',
    });
  };

  const openMemberDetails = async (userId) => {
    if (!isAdminMode) return;
    setIsDetailOpen(true);
    setIsLoadingDetails(true);
    setModalError('');

    try {
      const response = await fetch(`/api/employees?id=${userId}`, { method: 'GET' });
      const result = await response.json();

      if (!response.ok) {
        setModalError(result.error || 'Failed to load employee details');
        return;
      }

      const employee = result.employee;
      setSelectedUser(employee);
      setForm({
        employeeId: employee?.employee_id || '',
        name: employee?.name || '',
        username: employee?.username || '',
        email: employee?.email || '',
        role: employee?.role || '',
      });
    } catch (requestError) {
      setModalError(requestError.message || 'Failed to load employee details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSave = async () => {
    if (!selectedUser?.id) return;
    setIsSaving(true);
    setModalError('');

    try {
      const response = await fetch('/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          employeeId: form.employeeId,
          name: form.name,
          username: form.username,
          email: form.email,
          role: form.role,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setModalError(result.error || 'Failed to update employee');
        return;
      }

      setSelectedUser((prev) => (prev ? { ...prev, ...result.employee } : prev));
      await refreshData();
    } catch (requestError) {
      setModalError(requestError.message || 'Failed to update employee');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser?.id) return;
    const confirmed = window.confirm('Delete this employee? This action cannot be undone.');
    if (!confirmed) return;

    setIsDeleting(true);
    setModalError('');
    try {
      const response = await fetch(`/api/employees?id=${selectedUser.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok) {
        setModalError(result.error || 'Failed to delete employee');
        return;
      }

      await refreshData();
      closeModal();
    } catch (requestError) {
      setModalError(requestError.message || 'Failed to delete employee');
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreateModal = () => {
    if (!isAdminMode) return;
    setCreateForm({
      employeeId: '',
      name: '',
      username: '',
      email: '',
      role: '',
    });
    setCreateProfilePicture(null);
    setCreateError('');
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setCreateError('');
  };

  const handleCreateEmployee = async () => {
    const normalizedUsername = String(createForm.username || '').trim().toLowerCase();
    if (!createForm.employeeId || !createForm.name || !normalizedUsername || !createForm.role) {
      setCreateError('Employee ID, name, username, and role are required.');
      return;
    }

    setIsCreating(true);
    setCreateError('');

    try {
      const formData = new FormData();
      formData.append('employeeId', String(createForm.employeeId).trim());
      formData.append('name', String(createForm.name).trim());
      formData.append('username', normalizedUsername);
      formData.append('role', String(createForm.role).trim());
      formData.append('email', String(createForm.email || '').trim());
      if (createProfilePicture) {
        formData.append('profilePicture', createProfilePicture);
      }

      const response = await fetch('/api/employees', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        setCreateError(result.error || 'Failed to create employee');
        return;
      }

      await refreshData();
      closeCreateModal();
    } catch (requestError) {
      setCreateError(requestError.message || 'Failed to create employee');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-black">Team Members</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#7F40EE] text-white hover:bg-[#6A31D1] transition-colors"
          >
            <Plus size={16} />
            Add Member
          </button>
          <button className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors">
            <FileDown size={18} />
            Download Report
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
          Loading team members...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={refreshData}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          No team members found yet.
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {users.map((user) => {
            const stats = getUserStats(user.id);
            const avatarSrc = user?.avatar || null;
            const fallbackInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => openMemberDetails(user.id)}
                disabled={!isAdminMode}
                className={`relative bg-white p-6 rounded-xl shadow-sm flex flex-col items-center text-center ${
                  isAdminMode ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
                }`}
              >
                <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-4 border-[#7F40EE]/10 bg-slate-200 text-slate-700 text-xl font-semibold flex items-center justify-center">
                  {avatarSrc ? (
                    <Image src={avatarSrc} alt={user.name} width={80} height={80} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <span aria-label={user.name}>{fallbackInitial}</span>
                  )}
                </div>
                <h3 className="font-bold text-slate-800">{user.name}</h3>
                <p className="text-sm text-slate-500 mb-6">{user.email}</p>

                <div className="w-full grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
                  <div>
                    <div className="font-bold text-purple-600 text-lg">{stats.pending}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending</div>
                  </div>
                  <div className="border-l border-r border-gray-100">
                    <div className="font-bold text-[#7F40EE] text-lg">{stats.inProgress}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">In Progress</div>
                  </div>
                  <div>
                    <div className="font-bold text-green-600 text-lg">{stats.completed}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Completed</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Employee Details</h3>
                <p className="text-sm text-slate-500">Edit details or delete this employee.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            {isLoadingDetails ? (
              <p className="text-sm text-slate-500">Loading details...</p>
            ) : (
              <>
                {modalError && (
                  <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {modalError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="text-sm">
                    <span className="block text-slate-600 mb-1">Employee ID</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
                      value={form.employeeId}
                      onChange={(e) => setForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="block text-slate-600 mb-1">Name</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="block text-slate-600 mb-1">Username</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
                      value={form.username}
                      onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="block text-slate-600 mb-1">Email</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </label>
                  <label className="text-sm md:col-span-2">
                    <span className="block text-slate-600 mb-1">Role</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
                      value={form.role}
                      onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                    />
                  </label>
                </div>

                <div className="mt-5 rounded-lg border border-slate-200 p-4">
                  <h4 className="font-semibold text-slate-800 mb-2">Assigned Tasks</h4>
                  {selectedUser?.task_assignments?.length ? (
                    <ul className="space-y-2 max-h-44 overflow-y-auto">
                      {selectedUser.task_assignments.map((assignment) => (
                        <li key={assignment?.task?.id} className="text-sm text-slate-700">
                          {assignment?.task?.task_name || 'Untitled task'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No assigned tasks.</p>
                  )}
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting || isSaving}
                    className="px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Employee'}
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isDeleting || isSaving}
                      className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isDeleting || isSaving}
                      className="px-4 py-2 rounded-lg bg-[#7F40EE] text-white hover:bg-[#6A31D1] disabled:opacity-60"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Add Employee</h3>
                <p className="text-sm text-slate-500">Credentials will be sent by email automatically.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="text-slate-500 hover:text-slate-700"
                disabled={isCreating}
              >
                Close
              </button>
            </div>

            {createError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm">
                <span className="block text-slate-600 mb-1">Employee ID</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="block text-slate-600 mb-1">Name</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="block text-slate-600 mb-1">Username</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
                  value={createForm.username}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="block text-slate-600 mb-1">Email</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="block text-slate-600 mb-1">Role</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
                  value={createForm.role}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="block text-slate-600 mb-1">Profile Picture (optional)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7F40EE]/30"
                  onChange={(e) => setCreateProfilePicture(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={isCreating}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateEmployee}
                disabled={isCreating}
                className="px-4 py-2 rounded-lg bg-[#7F40EE] text-white hover:bg-[#6A31D1] disabled:opacity-60"
              >
                {isCreating ? 'Creating...' : 'Create Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
