'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Paperclip, Check, X } from 'lucide-react';
import { useData } from './DataContext';

export default function CreateTask({ onCancel }) {
  const { addTask, createTaskLabel, taskLabels, users } = useData();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [label, setLabel] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [priority, setPriority] = useState('medium');
  const [frequency, setFrequency] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [assignees, setAssignees] = useState([]);

  const [subtasks, setSubtasks] = useState([{ title: '', assignedEmployeeId: '', priority: 'medium', dueDate: '', frequency: '' }]);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [tempAssignees, setTempAssignees] = useState([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [creatingLabel, setCreatingLabel] = useState(false);

  const filteredUsers = users.filter((user) => {
    const query = assigneeSearch.trim().toLowerCase();
    if (!query) return true;
    return [user?.name, user?.email, user?.username, user?.employee_id]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const renderUserAvatar = (user, className = 'w-10 h-10 rounded-full') => {
    const avatarSrc = user?.avatar || null;
    const fallbackInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';

    if (!avatarSrc) {
      return (
        <div
          className={`${className} bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-semibold`}
          aria-label={user?.name || 'User'}
          title={user?.name || 'User'}
        >
          {fallbackInitial}
        </div>
      );
    }

    return (
      <Image
        src={avatarSrc}
        alt={user?.name || 'User'}
        width={40}
        height={40}
        className={className}
      />
    );
  };

  const renderAssigneePicker = ({ value, onChange, options, placeholder = 'Unassigned' }) => {
    const selectedUser = options.find((user) => String(user.id) === String(value));

    const handlePick = (nextValue, event) => {
      onChange(nextValue);
      event.currentTarget.closest('details')?.removeAttribute('open');
    };

    return (
      <details className="relative w-full md:w-44">
        <summary className="flex list-none items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 cursor-pointer">
          <span className="flex min-w-0 items-center gap-2">
            {selectedUser ? (
              <>
                {renderUserAvatar(selectedUser, 'w-6 h-6 rounded-full')}
                <span className="truncate text-xs">{selectedUser.name}</span>
              </>
            ) : (
              <span className="text-xs text-slate-500">{placeholder}</span>
            )}
          </span>
          <span className="text-[10px] text-slate-400">▼</span>
        </summary>
        <div className="absolute left-0 z-20 mt-2 w-full min-w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <button
            type="button"
            onClick={(event) => handlePick('', event)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-gray-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
              -
            </div>
            <span>{placeholder}</span>
          </button>
          {options.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={(event) => handlePick(user.id, event)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50"
            >
              {renderUserAvatar(user, 'w-8 h-8 rounded-full')}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800">{user.name}</div>
                <div className="truncate text-xs text-slate-500">{user.email}</div>
              </div>
            </button>
          ))}
        </div>
      </details>
    );
  };

  const handleAddSubtask = () => {
    setSubtasks([...subtasks, { title: '', assignedEmployeeId: '', priority: 'medium', dueDate: '', frequency: '' }]);
  };

  const handleRemoveSubtask = (index) => {
    const newList = [...subtasks];
    newList.splice(index, 1);
    setSubtasks(newList);
  };

  const handleSubtaskChange = (index, value) => {
    const newList = [...subtasks];
    newList[index] = { ...newList[index], title: value };
    setSubtasks(newList);
  };

  const handleSubtaskAssigneeChange = (index, assignedEmployeeId) => {
    const newList = [...subtasks];
    newList[index] = { ...newList[index], assignedEmployeeId };
    setSubtasks(newList);
  };

  const handleSubtaskFieldChange = (index, field, value) => {
    const newList = [...subtasks];
    newList[index] = { ...newList[index], [field]: value };
    setSubtasks(newList);
  };

  const openUserModal = () => {
    setTempAssignees([...assignees]);
    setAssigneeSearch('');
    setIsUserModalOpen(true);
  };

  const toggleUserSelection = (userId) => {
    if (tempAssignees.includes(userId)) {
      setTempAssignees(tempAssignees.filter((id) => id !== userId));
    } else {
      setTempAssignees([...tempAssignees, userId]);
    }
  };

  const confirmAssignees = () => {
    setAssignees(tempAssignees);
    const selected = new Set(tempAssignees);
    setSubtasks((prev) =>
      prev.map((item) =>
        item.assignedEmployeeId && !selected.has(item.assignedEmployeeId)
          ? { ...item, assignedEmployeeId: '' }
          : item
      )
    );
    setIsUserModalOpen(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      let uploadedAttachments = [];

      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });

        const uploadResponse = await fetch('/Taskmanager/api/tasks/files', {
          method: 'POST',
          body: formData,
        });
        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadResult.error || 'Failed to upload attachments');
        }

        uploadedAttachments = uploadResult.attachments || [];
      }

      const cleanedSubtasks = subtasks
        .map((item) => ({
          title: String(item?.title || '').trim(),
          assignedEmployeeId: item?.assignedEmployeeId || '',
          priority: item?.priority || 'medium',
          dueDate: item?.dueDate || '',
          frequency: item?.frequency || '',
        }))
        .filter((item) => item.title !== '');

      const newTask = {
        id: `t${Date.now()}`,
        title,
        description,
        label,
        priority,
        frequency: frequency || null,
        status: 'Pending',
        startDate: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        dueDate,
        dueTime,
        completedSubtasks: 0,
        totalSubtasks: cleanedSubtasks.length,
        assignees,
        subtasks: cleanedSubtasks.map((item, i) => ({
          id: `st${i}`,
          title: item.title,
          completed: false,
          assigned_employee_id: item.assignedEmployeeId || null,
          priority: item.priority || 'medium',
          due_date: item.dueDate || null,
          frequency: item.frequency || null,
        })),
        attachments: uploadedAttachments,
      };

      const result = await addTask(newTask);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create task');
      }

      onCancel();
    } catch (submitError) {
      setError(submitError.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const onFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles((prev) => {
      const bySignature = new Map(prev.map((file) => [`${file.name}-${file.size}-${file.lastModified}`, file]));
      files.forEach((file) => {
        bySignature.set(`${file.name}-${file.size}-${file.lastModified}`, file);
      });
      return Array.from(bySignature.values());
    });

    event.target.value = '';
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleCreateLabel = async () => {
    const cleanLabel = newLabelName.trim();
    if (!cleanLabel) return;

    setCreatingLabel(true);
    setError('');

    try {
      const result = await createTaskLabel(cleanLabel);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create label');
      }

      setLabel(result.label || cleanLabel);
      setNewLabelName('');
    } catch (createLabelError) {
      setError(createLabelError.message || 'Failed to create label');
    } finally {
      setCreatingLabel(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-black">Create Task</h2>
      </div>

      <div className="space-y-8 rounded-xl bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        {error && (
          <div className='text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2'>
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Task Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Create App UI"
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#7F40EE] outline-none text-slate-700"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Develop a dynamic product catalog with filtering and sorting features..."
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#7F40EE] outline-none text-slate-700 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Label</label>
            <select
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#7F40EE] outline-none text-slate-700 bg-white"
            >
              <option value="">Select a label</option>
              {taskLabels.map((taskLabel) => (
                <option key={taskLabel} value={taskLabel}>{taskLabel}</option>
              ))}
            </select>
            <div className="mt-3 flex flex-col gap-2 md:flex-row">
              <input
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Create a new label"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:border-[#7F40EE] outline-none text-slate-700"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleCreateLabel();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleCreateLabel}
                disabled={creatingLabel || !newLabelName.trim()}
                className="px-4 py-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:border-[#7F40EE] hover:text-[#7F40EE] disabled:opacity-60"
              >
                {creatingLabel ? 'Adding...' : 'Add Label'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Repeat</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#7F40EE] outline-none text-slate-700 bg-white"
            >
              <option value="">Never</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#7F40EE] outline-none text-slate-700 bg-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#7F40EE] outline-none text-slate-700"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Due Time</label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              disabled={!dueDate}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#7F40EE] outline-none text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Assign To</label>
            <div className="flex items-center gap-2 cursor-pointer" onClick={openUserModal}>
              <div className="flex -space-x-2">
                {assignees.length > 0 ? (
                  assignees.slice(0, 3).map((uid) => {
                    const u = users.find((user) => user.id === uid);
                    return <div key={uid} className="border-2 border-white rounded-full">{renderUserAvatar(u, 'w-10 h-10 rounded-full')}</div>;
                  })
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                    <Plus size={16} />
                  </div>
                )}
                {assignees.length > 3 && (
                  <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500">
                    +{assignees.length - 3}
                  </div>
                )}
              </div>
              {assignees.length === 0 && <span className="text-sm text-slate-400">Select Team Members</span>}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Subtasks</label>
          <div className="space-y-3">
            {subtasks.map((item, index) => (
              <div key={index} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => handleSubtaskChange(index, e.target.value)}
                    placeholder={index === 0 ? 'Create Product Card' : 'Add subtask...'}
                    className="flex-1 px-4 py-2 rounded-lg bg-white border border-gray-200 focus:ring-1 focus:ring-[#7F40EE] outline-none text-sm"
                  />
                  <button onClick={() => handleRemoveSubtask(index)} className="text-red-400 hover:text-red-600 p-2 shrink-0">
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Assignee</span>
                    {renderAssigneePicker({
                      value: item.assignedEmployeeId,
                      onChange: (nextValue) => handleSubtaskAssigneeChange(index, nextValue),
                      options: assignees
                        .map((uid) => users.find((user) => user.id === uid))
                        .filter(Boolean),
                      placeholder: 'Assign to',
                    })}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Priority</span>
                    <select
                      value={item.priority || 'medium'}
                      onChange={(e) => handleSubtaskFieldChange(index, 'priority', e.target.value)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#7F40EE]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Due Date</span>
                    <input
                      type="date"
                      value={item.dueDate || ''}
                      onChange={(e) => handleSubtaskFieldChange(index, 'dueDate', e.target.value)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#7F40EE]"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Repeat</span>
                    <select
                      value={item.frequency || ''}
                      onChange={(e) => handleSubtaskFieldChange(index, 'frequency', e.target.value)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#7F40EE]"
                    >
                      <option value="">No Repeat</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleAddSubtask}
            className="mt-3 text-sm font-medium text-slate-500 hover:text-[#7F40EE] flex items-center gap-1 transition-colors"
          >
            <Plus size={16} /> Add Subtask
          </button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Add Attachments</label>
          <label className="w-full border-2 border-dashed border-gray-200 rounded-lg py-4 px-4 text-slate-400 hover:border-[#7F40EE] hover:text-[#7F40EE] transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Paperclip size={18} /> Add Files
            <input
              type="file"
              multiple
              onChange={onFileChange}
              className="hidden"
            />
          </label>

          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <div className="truncate pr-3 text-slate-700">{file.name}</div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                    aria-label={`Remove ${file.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-lg text-slate-500 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-3 rounded-lg bg-[#7F40EE] text-white font-bold shadow-lg shadow-[#7F40EE]/30 hover:bg-[#6A31D1] transition-colors"
          >
            {submitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Select Users</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={assigneeSearch}
                onChange={(event) => setAssigneeSearch(event.target.value)}
                placeholder="Search employee"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#7F40EE]"
              />
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => toggleUserSelection(user.id)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {renderUserAvatar(user, 'w-10 h-10 rounded-full')}
                      <div>
                        <div className="font-bold text-sm text-slate-800">{user.name}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        tempAssignees.includes(user.id)
                          ? 'bg-[#7F40EE] border-[#7F40EE]'
                          : 'border-gray-300 group-hover:border-[#7F40EE]'
                      }`}
                    >
                      {tempAssignees.includes(user.id) && <Check size={12} className="text-white" />}
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-1 py-2 text-sm text-slate-500">No employees found.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-gray-100"
              >
                CANCEL
              </button>
              <button
                onClick={confirmAssignees}
                className="px-6 py-2 rounded-lg text-sm font-bold bg-[#7F40EE] text-white shadow-md hover:bg-[#6A31D1]"
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
