'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Paperclip, Check, X } from 'lucide-react';
import { useData } from './DataContext';

export default function CreateTask({ onCancel }) {
  const { addTask, users } = useData();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [assignees, setAssignees] = useState([]);

  const [checklist, setChecklist] = useState([{ title: '', assignedEmployeeId: '' }]);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [tempAssignees, setTempAssignees] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

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

  const handleAddChecklistItem = () => {
    setChecklist([...checklist, { title: '', assignedEmployeeId: '' }]);
  };

  const handleRemoveChecklistItem = (index) => {
    const newList = [...checklist];
    newList.splice(index, 1);
    setChecklist(newList);
  };

  const handleChecklistChange = (index, value) => {
    const newList = [...checklist];
    newList[index] = { ...newList[index], title: value };
    setChecklist(newList);
  };

  const handleChecklistAssigneeChange = (index, assignedEmployeeId) => {
    const newList = [...checklist];
    newList[index] = { ...newList[index], assignedEmployeeId };
    setChecklist(newList);
  };

  const openUserModal = () => {
    setTempAssignees([...assignees]);
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
    setChecklist((prev) =>
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

        const uploadResponse = await fetch('/api/tasks/files', {
          method: 'POST',
          body: formData,
        });
        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadResult.error || 'Failed to upload attachments');
        }

        uploadedAttachments = uploadResult.attachments || [];
      }

      const cleanedChecklist = checklist
        .map((item) => ({
          title: String(item?.title || '').trim(),
          assignedEmployeeId: item?.assignedEmployeeId || '',
        }))
        .filter((item) => item.title !== '');
      const newTask = {
        id: `t${Date.now()}`,
        title,
        description,
        priority,
        status: 'Pending',
        startDate: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        dueDate: dueDate
          ? new Date(dueDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : 'TBD',
        completedSubtasks: 0,
        totalSubtasks: cleanedChecklist.length,
        assignees,
        subtasks: cleanedChecklist.map((item, i) => ({
          id: `st${i}`,
          title: item.title,
          completed: false,
          assigned_employee_id: item.assignedEmployeeId || null,
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

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-black">Create Task</h2>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm space-y-8">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#7F40EE] outline-none text-slate-700 bg-white"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
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
          <label className="block text-sm font-semibold text-slate-700 mb-2">TODO Checklist</label>
          <div className="space-y-3">
            {checklist.map((item, index) => (
              <div key={index} className="flex flex-wrap gap-2 md:flex-nowrap">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleChecklistChange(index, e.target.value)}
                  placeholder={index === 0 ? 'Create Product Card' : 'Add item...'}
                  className="min-w-[220px] flex-1 px-4 py-2 rounded-lg bg-gray-50 border-none focus:ring-1 focus:ring-[#7F40EE] outline-none text-sm"
                />
                <select
                  value={item.assignedEmployeeId}
                  onChange={(event) => handleChecklistAssigneeChange(index, event.target.value)}
                  className="w-full md:w-52 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-slate-700"
                >
                  <option value="">Unassigned</option>
                  {assignees.map((uid) => {
                    const u = users.find((user) => user.id === uid);
                    if (!u) return null;
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    );
                  })}
                </select>
                <button onClick={() => handleRemoveChecklistItem(index)} className="text-red-400 hover:text-red-600 p-2">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleAddChecklistItem}
            className="mt-3 text-sm font-medium text-slate-500 hover:text-[#7F40EE] flex items-center gap-1 transition-colors"
          >
            <Plus size={16} /> Add Item
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

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {users.map((user) => (
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
              ))}
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
