'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Plus,
  Trash2,
  Paperclip,
  Check,
  X,
  Settings,
  FileText,
  Briefcase,
  Tag,
  AlignLeft,
  Flag,
  Repeat,
  Activity,
  CalendarDays,
  Clock3,
  UserCheck,
  Users,
  User,
  ArrowLeft,
  Mic,
  MicOff
} from 'lucide-react';
import { useData } from './DataContext';

export default function CreateTask({ onCancel }) {
  const { addTask, createTaskLabel, taskLabels, users, user } = useData();

  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [label, setLabel] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [priority, setPriority] = useState('medium');
  const [frequency, setFrequency] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [assignees, setAssignees] = useState([]);
  const [assignedBy, setAssignedBy] = useState('');

  // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Regional English optimization

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          setDescription((prev) => {
            const separator = prev && !prev.endsWith(' ') ? ' ' : '';
            return prev + separator + transcript;
          });
        }
      };

      recognition.onerror = (e) => {
        console.error('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // Subtasks list (initialized empty)
  const [subtasks, setSubtasks] = useState([]);

  // Draft subtask states for inline adding bar
  const [draftSubtaskTitle, setDraftSubtaskTitle] = useState('');
  const [draftSubtaskAssignee, setDraftSubtaskAssignee] = useState('');
  const [draftSubtaskPriority, setDraftSubtaskPriority] = useState('medium');
  const [draftSubtaskDueDate, setDraftSubtaskDueDate] = useState('');
  const [draftSubtaskFrequency, setDraftSubtaskFrequency] = useState('');

  const [viewingSubtaskIndex, setViewingSubtaskIndex] = useState(null);
  const [subtaskInstructionDraft, setSubtaskInstructionDraft] = useState('');
  const [subtaskCommentDraft, setSubtaskCommentDraft] = useState('');

  const viewingSubtask = viewingSubtaskIndex !== null ? subtasks[viewingSubtaskIndex] : null;

  const closeSubtaskView = () => { setViewingSubtaskIndex(null); setSubtaskInstructionDraft(''); setSubtaskCommentDraft(''); };

  const updateViewingSubtask = (fields) => {
    if (viewingSubtaskIndex === null) return;
    setSubtasks((prev) => prev.map((item, i) => i === viewingSubtaskIndex ? { ...item, ...fields } : item));
  };

  const addSubtaskInstruction = () => {
    const text = subtaskInstructionDraft.trim();
    if (!text) return;
    updateViewingSubtask({ instructions: [...(viewingSubtask?.instructions || []), { id: Date.now(), text }] });
    setSubtaskInstructionDraft('');
  };

  const removeSubtaskInstruction = (instrId) => {
    updateViewingSubtask({ instructions: (viewingSubtask?.instructions || []).filter((ins) => ins.id !== instrId) });
  };

  const handleSubtaskDocUpload = (files) => {
    if (!files?.length) return;
    const newDocs = Array.from(files).map((f) => ({ id: Date.now() + Math.random(), name: f.name, size: f.size }));
    updateViewingSubtask({ documents: [...(viewingSubtask?.documents || []), ...newDocs] });
  };

  const removeSubtaskDocument = (docId) => {
    updateViewingSubtask({ documents: (viewingSubtask?.documents || []).filter((d) => d.id !== docId) });
  };

  const addSubtaskComment = () => {
    const text = subtaskCommentDraft.trim();
    if (!text) return;
    updateViewingSubtask({ comments: [...(viewingSubtask?.comments || []), { id: Date.now(), text, author: user?.name || 'You', time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }] });
    setSubtaskCommentDraft('');
  };

  const removeSubtaskComment = (commentId) => {
    updateViewingSubtask({ comments: (viewingSubtask?.comments || []).filter((c) => c.id !== commentId) });
  };

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [assignedByModalOpen, setAssignedByModalOpen] = useState(false);
  const [tempAssignees, setTempAssignees] = useState([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [assignedBySearch, setAssignedBySearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [creatingLabel, setCreatingLabel] = useState(false);

  // Default assignedBy to current logged-in user's employee ID or user.id
  useEffect(() => {
    if (user && !assignedBy && users.length > 0) {
      const matchingEmployee = users.find(
        (u) =>
          String(u.email).toLowerCase() === String(user.email || '').toLowerCase() ||
          String(u.auth_user_id || '').toLowerCase() === String(user.id || '').toLowerCase()
      );
      if (matchingEmployee) {
        setAssignedBy(matchingEmployee.id);
      } else if (user.id) {
        setAssignedBy(user.id);
      }
    }
  }, [user, users, assignedBy]);

  const filteredUsers = users.filter((u) => {
    const query = assigneeSearch.trim().toLowerCase();
    if (!query) return true;
    return [u?.name, u?.email, u?.username, u?.employee_id]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const assignedByList = [...users];

  // Put Super Admins / Founders at the top of the list
  assignedByList.sort((a, b) => {
    const isASuper = ['summit@bncglobal.in', 'gurvinder@bncglobal.in'].includes(String(a.email).toLowerCase());
    const isBSuper = ['summit@bncglobal.in', 'gurvinder@bncglobal.in'].includes(String(b.email).toLowerCase());
    if (isASuper && !isBSuper) return -1;
    if (!isASuper && isBSuper) return 1;
    return 0;
  });

  if (user && !assignedByList.some((u) => String(u.id) === String(user.id) || String(u.email).toLowerCase() === String(user.email || '').toLowerCase())) {
    assignedByList.unshift({
      id: user.id,
      name: user.name || 'Super Admin',
      email: user.email || '',
      role: user.role || 'Super Admin',
      avatar: user.avatar || '',
    });
  }

  const filteredAssignedByUsers = assignedByList.filter((u) => {
    const query = assignedBySearch.trim().toLowerCase();
    if (!query) return true;
    return [u?.name, u?.email, u?.username, u?.employee_id]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const renderUserAvatar = (u, className = 'w-10 h-10 rounded-full') => {
    const avatarSrc = u?.avatar || u?.profile_picture_url || null;
    const fallbackInitial = u?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';

    if (!avatarSrc) {
      return (
        <div
          className={`${className} bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-semibold shrink-0`}
          aria-label={u?.name || 'User'}
          title={u?.name || 'User'}
        >
          {fallbackInitial}
        </div>
      );
    }

    return (
      <img
        src={avatarSrc}
        alt={u?.name || 'User'}
        className={`${className} object-cover shrink-0`}
        loading="eager"
      />
    );
  };

  const renderAssigneePicker = ({ value, onChange, options, placeholder = 'Assignee' }) => {
    const filteredOptions = options.filter((u) => assignees.includes(u.id));
    const selectedUser = options.find((u) => String(u.id) === String(value));

    const handlePick = (nextValue, event) => {
      onChange(nextValue);
      event.currentTarget.closest('details')?.removeAttribute('open');
    };

    return (
      <details className="relative inline-block overflow-visible group">
        <summary className="list-none cursor-pointer flex items-center focus:outline-none [&::-webkit-details-marker]:hidden">
          {selectedUser ? (
            <div className="hover:scale-105 transition duration-150 ring-2 ring-transparent group-hover:ring-[#7F40EE]/30 rounded-full" title={selectedUser.name}>
              {renderUserAvatar(selectedUser, 'w-9 h-9 rounded-full border border-slate-100 shadow-sm')}
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full border border-dashed border-slate-350 hover:border-[#7F40EE] bg-purple-50/20 hover:bg-purple-50 flex items-center justify-center text-slate-500 hover:text-[#7F40EE] transition duration-150 shadow-sm" title="Assignee">
              <User size={14} className="text-[#7F40EE] font-bold" />
            </div>
          )}
        </summary>
        <div className="absolute left-0 z-[100] mt-2 w-64 overflow-hidden rounded-2xl border-2 border-purple-100 bg-white shadow-2xl text-left animate-in fade-in-50 slide-in-from-top-1 duration-150">
          <div className="px-3.5 py-2.5 bg-purple-50/40 border-b border-purple-100/50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#7F40EE] uppercase tracking-wider">Select Assignee</span>
            {selectedUser && (
              <button
                type="button"
                onClick={(event) => handlePick('', event)}
                className="text-[10px] font-bold text-red-500 hover:text-red-700 transition"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            <button
              type="button"
              onClick={(event) => handlePick('', event)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-semibold transition ${!value ? 'bg-purple-50 text-[#7F40EE]' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <div className={`flex h-5.5 w-5.5 items-center justify-center rounded-full text-[10px] font-bold ${!value ? 'bg-[#7F40EE] text-white' : 'bg-slate-100 text-slate-400'}`}>
                -
              </div>
              <span>Unassigned</span>
            </button>
            {filteredOptions.length === 0 ? (
              <div className="px-3.5 py-4 text-center text-xs text-slate-400 font-semibold italic">
                Please select parent Assign To members first.
              </div>
            ) : (
              filteredOptions.map((u) => {
                const isSelected = String(u.id) === String(value);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={(event) => handlePick(u.id, event)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left rounded-xl text-xs font-semibold transition ${isSelected ? 'bg-purple-50 text-[#7F40EE]' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {renderUserAvatar(u, 'w-5.5 h-5.5 rounded-full')}
                      <span className="truncate">{u.name}</span>
                    </div>
                    {isSelected && (
                      <Check size={12} className="text-[#7F40EE] font-bold shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </details>
    );
  };

  const renderDraftAssigneePicker = () => {
    const assigneeOptions = users.filter((u) => assignees.includes(u.id));
    const selectedDraftAssigneeUser = users.find(u => u.id === draftSubtaskAssignee);

    const handlePickDraftAssignee = (uid, event) => {
      setDraftSubtaskAssignee(uid);
      event.currentTarget.closest('details')?.removeAttribute('open');
    };

    return (
      <details className="relative inline-block overflow-visible group">
        <summary className="list-none cursor-pointer flex items-center focus:outline-none [&::-webkit-details-marker]:hidden">
          {selectedDraftAssigneeUser ? (
            <div className="hover:scale-105 transition duration-150 ring-2 ring-transparent group-hover:ring-[#7F40EE]/30 rounded-full" title={selectedDraftAssigneeUser.name}>
              {renderUserAvatar(selectedDraftAssigneeUser, 'w-9 h-9 rounded-full border border-slate-100 shadow-sm')}
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full border border-dashed border-slate-350 hover:border-[#7F40EE] bg-purple-50/20 hover:bg-purple-50 flex items-center justify-center text-slate-500 hover:text-[#7F40EE] transition duration-150 shadow-sm" title="Assign">
              <User size={14} className="text-[#7F40EE] font-bold" />
            </div>
          )}
        </summary>
        <div className="absolute left-0 z-[100] mt-2 w-64 overflow-hidden rounded-2xl border-2 border-purple-100 bg-white shadow-2xl text-left animate-in fade-in-50 slide-in-from-top-1 duration-150">
          <div className="px-3.5 py-2.5 bg-purple-50/40 border-b border-purple-100/50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#7F40EE] uppercase tracking-wider">Select Assignee</span>
            {selectedDraftAssigneeUser && (
              <button
                type="button"
                onClick={(event) => handlePickDraftAssignee('', event)}
                className="text-[10px] font-bold text-red-500 hover:text-red-700 transition"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            <button
              type="button"
              onClick={(event) => handlePickDraftAssignee('', event)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-semibold transition ${!draftSubtaskAssignee ? 'bg-purple-50 text-[#7F40EE]' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <div className={`flex h-5.5 w-5.5 items-center justify-center rounded-full text-[10px] font-bold ${!draftSubtaskAssignee ? 'bg-[#7F40EE] text-white' : 'bg-slate-100 text-slate-400'}`}>
                -
              </div>
              <span>Unassigned</span>
            </button>
            {assigneeOptions.length === 0 ? (
              <div className="px-3.5 py-4 text-center text-xs text-slate-400 font-semibold italic">
                Please select parent Assign To members first.
              </div>
            ) : (
              assigneeOptions.map((u) => {
                const isSelected = String(u.id) === String(draftSubtaskAssignee);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={(event) => handlePickDraftAssignee(u.id, event)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left rounded-xl text-xs font-semibold transition ${isSelected ? 'bg-purple-50 text-[#7F40EE]' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {renderUserAvatar(u, 'w-5.5 h-5.5 rounded-full')}
                      <span className="truncate">{u.name}</span>
                    </div>
                    {isSelected && (
                      <Check size={12} className="text-[#7F40EE] font-bold shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </details>
    );
  };

  const renderPriorityDropdown = ({ value, onChange }) => {
    const priorities = [
      { id: 'urgent', name: 'Urgent', color: 'text-red-500 fill-red-500', textClass: 'text-[#0F172A]' },
      { id: 'high', name: 'High', color: 'text-amber-500 fill-amber-500', textClass: 'text-amber-600' },
      { id: 'medium', name: 'Normal', color: 'text-blue-500 fill-blue-500', textClass: 'text-blue-600' },
      { id: 'low', name: 'Low', color: 'text-slate-400 fill-slate-400', textClass: 'text-[#0F172A]' },
    ];

    const currentPriority = priorities.find((p) => p.id === value) || priorities[2];

    const handleSelectPriority = (id, event) => {
      onChange(id);
      event.currentTarget.closest('details')?.removeAttribute('open');
    };

    return (
      <details className="relative inline-block overflow-visible">
        <summary className="list-none cursor-pointer flex items-center gap-1 focus:outline-none [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-1 text-sm font-semibold hover:text-[#7F40EE] transition duration-150">
            <Flag size={14} className={`${currentPriority.color}`} />
            <span className={currentPriority.textClass}>{currentPriority.name}</span>
            <span className="text-[8px] text-slate-400 shrink-0">▼</span>
          </div>
        </summary>
        <div className="absolute left-0 z-50 mt-1.5 w-44 rounded-2xl border border-slate-150 bg-white p-2.5 shadow-xl text-left">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1.5">
            Priority
          </div>
          <div className="flex flex-col gap-0.5">
            {priorities.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={(e) => handleSelectPriority(p.id, e)}
                className="flex items-center gap-3 w-full rounded-xl px-2.5 py-2 text-left hover:bg-slate-50 transition text-sm font-semibold text-slate-700"
              >
                <Flag size={14} className={`${p.color}`} />
                <span className={p.id === 'high' ? 'text-amber-600' : p.id === 'medium' ? 'text-blue-600' : 'text-slate-700'}>
                  {p.name}
                </span>
              </button>
            ))}
            <div className="h-px bg-slate-100 my-1" />
            <button
              type="button"
              onClick={(e) => handleSelectPriority('medium', e)}
              className="flex items-center gap-3 w-full rounded-xl px-2.5 py-2 text-left hover:bg-slate-50 transition text-sm font-semibold text-slate-500"
            >
              <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              </div>
              <span>Clear</span>
            </button>
          </div>
        </div>
      </details>
    );
  };

  const renderDraftPriorityDropdown = () => {
    return renderPriorityDropdown({
      value: draftSubtaskPriority,
      onChange: (nextVal) => setDraftSubtaskPriority(nextVal)
    });
  };

  const handleAddDraftSubtask = () => {
    const titleClean = draftSubtaskTitle.trim();

    setSubtasks([
      ...subtasks,
      {
        title: titleClean,
        assignedEmployeeId: draftSubtaskAssignee,
        priority: draftSubtaskPriority,
        dueDate: draftSubtaskDueDate,
        frequency: draftSubtaskFrequency
      }
    ]);

    // Reset draft fields
    setDraftSubtaskTitle('');
    setDraftSubtaskAssignee('');
    setDraftSubtaskPriority('medium');
    setDraftSubtaskDueDate('');
    setDraftSubtaskFrequency('');
  };

  const handleKeyDownSubtask = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddDraftSubtask();
    }
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

    // Require all requested fields before submission
    if (!title.trim()) {
      setError('Task Title is required.');
      setSubmitting(false);
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      setSubmitting(false);
      return;
    }
    if (!label) {
      setError('Label is required.');
      setSubmitting(false);
      return;
    }
    if (!dueDate) {
      setError('Due Date is required.');
      setSubmitting(false);
      return;
    }
    if (!assignedBy) {
      setError('Assigned By is required.');
      setSubmitting(false);
      return;
    }
    if (!assignees || assignees.length === 0) {
      setError('Assign To is required (please select at least one assignee).');
      setSubmitting(false);
      return;
    }

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

      // Automatically push active draft subtask if they forgot to click 'Add'
      let finalSubtasks = [...subtasks];
      const draftTitleClean = draftSubtaskTitle.trim();
      if (draftTitleClean) {
        finalSubtasks.push({
          title: draftTitleClean,
          assignedEmployeeId: draftSubtaskAssignee,
          priority: draftSubtaskPriority,
          dueDate: draftSubtaskDueDate,
          frequency: draftSubtaskFrequency,
        });
      }

      const cleanedSubtasks = finalSubtasks
        .map((item) => ({
          title: String(item?.title || '').trim(),
          assignedEmployeeId: item?.assignedEmployeeId || '',
          priority: item?.priority || 'medium',
          dueDate: item?.dueDate || '',
          frequency: item?.frequency || '',
          instructions: (item?.instructions || []).map((ins) => ins.text).filter(Boolean),
          documents: (item?.documents || []).map((doc) => ({ name: doc.name, size: doc.size })),
          comments: (item?.comments || []).map((c) => ({ text: c.text, author: c.author, time: c.time })),
        }))
        .filter((item) => item.title !== '');

      const formattedTitle = clientName.trim()
        ? `${clientName.trim()} - ${title.trim()}`
        : title.trim();

      const newTask = {
        id: `t${Date.now()}`,
        title: formattedTitle,
        description,
        label,
        priority,
        frequency: frequency || null,
        status: 'pending',
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
        assignedByEmployeeId: assignedBy || null,
        subtasks: cleanedSubtasks.map((item) => ({
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

  const assignedByUser = assignedByList.find(
    (u) =>
      String(u.id) === String(assignedBy) ||
      (u.auth_user_id && String(u.auth_user_id) === String(assignedBy))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title Bar - Cancel & Create Buttons (Larger and Modernized) */}
      <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 w-11 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition duration-200 shadow-sm"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-medium text-slate-700 font-sans tracking-tight">Create Task</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 h-11 flex items-center justify-center text-sm font-bold text-slate-650 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-2xl transition duration-200 shadow-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-7 h-11 flex items-center justify-center text-sm font-extrabold bg-[#7F40EE] hover:bg-[#6A31D1] text-white rounded-2xl shadow-lg hover:shadow-indigo-150 transition duration-200 disabled:opacity-60 cursor-pointer tracking-wide"
          >
            {submitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {/* Flat Simple Structure WITH slightly larger fields */}
      <div className="space-y-6">

        {/* Client & Task Title */}
        <div className="flex gap-4">
          {/* Client */}
          <div className="flex-initial w-64 space-y-2">
            <div className="flex items-center gap-1.5">
              <Briefcase size={14} className="text-slate-400" />
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Client
              </label>
            </div>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. bnc"
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none bg-white hover:bg-slate-50/50 transition text-slate-800 font-semibold placeholder-slate-400 shadow-sm"
            />
          </div>
          {/* Task Title */}
          <div className="flex-grow space-y-2">
            <div className="flex items-center gap-1.5">
              <FileText size={14} className="text-slate-400" />
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Task Title <span className="text-slate-900 font-extrabold ml-0.5">*</span>
              </label>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Create App UI"
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none bg-white hover:bg-slate-50/50 transition text-slate-800 font-semibold placeholder-slate-400 shadow-sm"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlignLeft size={14} className="text-slate-400" />
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Description <span className="text-slate-900 font-extrabold ml-0.5">*</span>
              </label>
            </div>
            {isListening && (
              <span className="text-xs text-red-500 font-bold flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                Listening... Speak now
              </span>
            )}
          </div>
          <div className="flex items-stretch gap-3">
            <div className="flex-grow">
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Develop a dynamic product catalog with filtering and sorting features..."
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none bg-white hover:bg-slate-50/50 transition resize-none text-slate-800 font-semibold placeholder-slate-400 shadow-sm"
              />
            </div>
            <button
              type="button"
              onClick={toggleListening}
              className={`w-14 flex flex-col items-center justify-center rounded-xl border transition-all duration-300 shadow-sm shrink-0 ${
                isListening
                  ? 'bg-red-500 border-red-500 text-white animate-pulse shadow-md shadow-red-100 hover:bg-red-600'
                  : 'bg-white hover:bg-slate-50 text-slate-400 hover:text-[#7F40EE] border-slate-200 hover:border-[#7F40EE]'
              }`}
              title={isListening ? "Stop listening" : "Click to Speak (Voice to Text)"}
            >
              <Mic size={22} className={isListening ? 'scale-110' : ''} />
              <span className="text-[9px] font-bold mt-1.5 uppercase tracking-wider">
                {isListening ? "Stop" : "Mic"}
              </span>
            </button>
          </div>
        </div>

        {/* Row 1: Label, Priority, Repeat Frequency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Label */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Tag size={14} className="text-slate-400" />
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Label <span className="text-slate-900 font-extrabold ml-0.5">*</span>
              </label>
            </div>
            <div className="flex gap-2">
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="flex-grow rounded-xl border border-slate-200 px-4 py-3 text-sm bg-white hover:bg-slate-50/50 transition focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none text-slate-700 min-w-0 shadow-sm font-semibold"
              >
                <option value="">Select a label</option>
                {taskLabels.map((taskLabel) => (
                  <option key={taskLabel} value={taskLabel}>{taskLabel}</option>
                ))}
              </select>
              <div className="flex gap-1.5 shrink-0">
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="New label"
                  className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white hover:bg-slate-50/50 transition focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none text-slate-705 shadow-sm font-semibold"
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
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-750 hover:border-[#7F40EE] hover:text-[#7F40EE] transition disabled:opacity-60 shrink-0 shadow-sm"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Flag size={14} className="text-slate-400" />
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Priority</label>
            </div>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm bg-white hover:bg-slate-50/50 transition focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none text-slate-700 shadow-sm font-semibold"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Repeat Frequency */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Repeat size={14} className="text-slate-400" />
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Repeat Frequency
              </label>
            </div>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm bg-white hover:bg-slate-50/50 transition focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none text-slate-700 shadow-sm font-semibold"
            >
              <option value="">Never</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        {/* Row 2: Due Date & Time, Assigned By, Assigned To */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Due Date & Time */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={14} className="text-slate-400" />
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Due Date & Time
              </label>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex-grow rounded-xl border border-slate-200 px-4 py-3 text-sm bg-white hover:bg-slate-50/50 transition focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none text-slate-700 min-w-0 shadow-sm font-semibold"
              />
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                disabled={!dueDate}
                className="flex-grow rounded-xl border border-slate-200 px-4 py-3 text-sm bg-white hover:bg-slate-50/50 transition focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] outline-none disabled:bg-slate-50 disabled:text-slate-400 min-w-0 text-slate-700 shadow-sm font-semibold"
              />
            </div>
          </div>

          {/* Assigned By */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <UserCheck size={14} className="text-slate-400" />
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Assigned By <span className="text-slate-900 font-extrabold ml-0.5">*</span>
              </label>
            </div>
            <div
              onClick={() => { setAssignedBySearch(''); setAssignedByModalOpen(true); }}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm bg-white hover:bg-slate-50/50 transition cursor-pointer select-none text-slate-700 h-[48px] shadow-sm font-semibold"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {assignedByUser ? (
                  <>
                    {renderUserAvatar(assignedByUser, 'w-9 h-9 rounded-full')}
                    <span className="truncate text-sm font-semibold text-slate-700">{assignedByUser.name}</span>
                  </>
                ) : (
                  <span className="text-sm text-slate-400 font-semibold">Select Creator</span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">▼</span>
            </div>
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-slate-400" />
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Assign To <span className="text-slate-900 font-extrabold ml-0.5">*</span>
              </label>
            </div>
            <div
              onClick={openUserModal}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-1.5 text-sm bg-white hover:bg-slate-50/50 transition cursor-pointer select-none text-slate-700 h-[48px] shadow-sm font-semibold"
            >
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                {assignees.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2.5">
                      {assignees.slice(0, 3).map((uid) => {
                        const u = users.find((usr) => usr.id === uid);
                        return (
                          <div key={uid} className="border-2 border-white rounded-full overflow-hidden shrink-0">
                            {renderUserAvatar(u, 'w-9 h-9')}
                          </div>
                        );
                      })}
                    </div>
                    {assignees.length > 3 && (
                      <span className="text-xs font-bold text-slate-500">+{assignees.length - 3}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 font-semibold">Select Team Members</span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">▼</span>
            </div>
          </div>
        </div>

        {/* Subtasks Table Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-1.5">
            <Activity size={14} className="text-slate-400" />
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Subtasks</label>
          </div>
          {/* High Fidelity Scrollable Subtasks Table */}
          <div className="w-full border border-slate-200 bg-white rounded-2xl shadow-sm overflow-visible">
            <table className="w-full table-fixed border-collapse text-left text-xs text-slate-700 min-w-[950px]">
              <thead>
                <tr className="border-b border-slate-150 bg-slate-50/60 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                  <th className="px-4 py-3.5 w-[40%]">NAME</th>
                  <th className="px-4 py-3.5 w-[10%]">ASSIGNEE</th>
                  <th className="px-4 py-3.5 w-[10%]">REPEAT</th>
                  <th className="px-4 py-3.5 w-[10%]">DUE DATE</th>
                  <th className="px-4 py-3.5 w-[10%]">PRIORITY</th>
                  <th className="px-4 py-3.5 w-[10%]">STATUS</th>
                  <th className="px-4 py-3.5 text-center w-[10%]">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* List of active subtasks */}
                {subtasks.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/20 transition duration-150">
                    {/* Subtask Title input */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-4.5 w-4.5 shrink-0 rounded-full border-2 border-slate-300 bg-white" />
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleSubtaskChange(index, e.target.value)}
                          placeholder="Subtask Title"
                          className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm text-slate-800 font-semibold p-0 placeholder-slate-400"
                        />
                      </div>
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-3.5 overflow-visible">
                      {renderAssigneePicker({
                        value: item.assignedEmployeeId,
                        onChange: (nextValue) => handleSubtaskAssigneeChange(index, nextValue),
                        options: users,
                        placeholder: 'Assignee',
                      })}
                    </td>

                    {/* Repeat frequency */}
                    <td className="px-4 py-3.5">
                      <div className="relative inline-flex items-center gap-0.5">
                        <select
                          value={item.frequency || ''}
                          onChange={(e) => handleSubtaskFieldChange(index, 'frequency', e.target.value)}
                          className="appearance-none bg-transparent border-none outline-none focus:ring-0 text-sm font-semibold text-slate-700 hover:text-slate-900 cursor-pointer pr-4 pl-0 py-0"
                        >
                          <option value="">Never</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                        <span className="pointer-events-none absolute right-0 text-slate-400 text-[9px]">▼</span>
                      </div>
                    </td>

                    {/* Visible Due Date input overlay */}
                    <td className="px-4 py-3.5">
                      <div className="relative flex items-center gap-1.5 cursor-pointer group text-slate-650 hover:text-slate-900">
                        <CalendarDays size={14} className="text-slate-400 group-hover:text-[#7F40EE] shrink-0" />
                        <span className="text-sm font-semibold whitespace-nowrap">{item.dueDate ? item.dueDate : 'Set Date'}</span>
                        <input
                          type="date"
                          value={item.dueDate || ''}
                          onChange={(e) => handleSubtaskFieldChange(index, 'dueDate', e.target.value)}
                          onClick={(e) => {
                            try { e.currentTarget.showPicker(); } catch (err) { }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                    </td>

                    {/* Priority flag select */}
                    <td className="px-4 py-3.5 overflow-visible">
                      {renderPriorityDropdown({
                        value: item.priority || 'medium',
                        onChange: (nextValue) => handleSubtaskFieldChange(index, 'priority', nextValue),
                      })}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-extrabold tracking-wider text-white rounded-md px-2.5 py-1.5 uppercase block text-center whitespace-nowrap shadow-sm" style={{ backgroundColor: '#62748E' }}>
                        TO DO
                      </span>
                    </td>

                    {/* View + Remove buttons */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => { setViewingSubtaskIndex(index); setSubtaskInstructionDraft(''); setSubtaskCommentDraft(''); }}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 hover:bg-[#7F40EE] text-slate-500 hover:text-white transition shrink-0"
                          title="View Subtask"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(index)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 hover:bg-red-500 text-red-400 hover:text-white transition shrink-0"
                          title="Remove Subtask"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* ADD SUBTASK row (matches style in table form) */}
                <tr className="bg-slate-50/50 font-medium">
                  {/* Title Input */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-4.5 w-4.5 shrink-0 rounded-full border-2 border-dashed border-[#7F40EE]/40 flex items-center justify-center bg-white" />
                      <input
                        type="text"
                        value={draftSubtaskTitle}
                        onChange={(e) => setDraftSubtaskTitle(e.target.value)}
                        onKeyDown={handleKeyDownSubtask}
                        placeholder="Type subtask name and press Enter..."
                        className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm text-slate-700 font-semibold p-0 placeholder-slate-400"
                      />
                    </div>
                  </td>

                  {/* Assignee */}
                  <td className="px-4 py-3.5 overflow-visible">
                    {renderDraftAssigneePicker()}
                  </td>

                  {/* Repeat Frequency */}
                  <td className="px-4 py-3.5">
                    <div className="relative inline-flex items-center gap-0.5">
                      <select
                        value={draftSubtaskFrequency}
                        onChange={(e) => setDraftSubtaskFrequency(e.target.value)}
                        className="appearance-none bg-transparent border-none outline-none focus:ring-0 text-sm font-semibold text-slate-700 hover:text-slate-900 cursor-pointer pr-4 pl-0 py-0"
                      >
                        <option value="">Never</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <span className="pointer-events-none absolute right-0 text-slate-400 text-[9px]">▼</span>
                    </div>
                  </td>

                  {/* Visible Date Input overlay */}
                  <td className="px-4 py-3.5">
                    <div className="relative flex items-center gap-1.5 cursor-pointer group text-slate-655 hover:text-slate-900">
                      <CalendarDays size={14} className="text-slate-400 group-hover:text-[#7F40EE] shrink-0" />
                      <span className="text-sm font-semibold whitespace-nowrap">{draftSubtaskDueDate ? draftSubtaskDueDate : 'Set Date'}</span>
                      <input
                        type="date"
                        value={draftSubtaskDueDate}
                        onChange={(e) => setDraftSubtaskDueDate(e.target.value)}
                        onClick={(e) => {
                          try { e.currentTarget.showPicker(); } catch (err) { }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </td>

                  {/* Priority Flag & dropdown */}
                  <td className="px-4 py-3.5 overflow-visible">
                    {renderDraftPriorityDropdown()}
                  </td>

                  {/* Status Badging */}
                  <td className="px-4 py-3.5">
                    <span className="text-[10px] font-extrabold tracking-wider text-white rounded-md px-2.5 py-1.5 uppercase block text-center whitespace-nowrap shadow-sm" style={{ backgroundColor: '#62748E' }}>
                      TO DO
                    </span>
                  </td>

                  {/* Add & Clear action buttons — green tick + red cross */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAddDraftSubtask}
                        disabled={!draftSubtaskTitle.trim()}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
                        title="Add Subtask"
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftSubtaskTitle('');
                          setDraftSubtaskAssignee('');
                          setDraftSubtaskPriority('medium');
                          setDraftSubtaskDueDate('');
                          setDraftSubtaskFrequency('');
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 hover:bg-red-500 text-red-400 hover:text-white transition shrink-0"
                        title="Clear"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Separate row containing only the + Add Subtask button aligned under the NAME column */}
                <tr className="bg-transparent font-medium border-t-0">
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={handleAddDraftSubtask}
                      className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold text-xs w-fit transition pl-7 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add Subtask</span>
                    </button>
                  </td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Premium Attachment Section: Split Grid Layout */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5">
            <Paperclip size={14} className="text-slate-400" />
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Attachments</label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left side: Upload Zone */}
            <div>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-[#7F40EE] bg-white rounded-2xl p-5 text-center cursor-pointer transition duration-205 group shadow-sm min-h-[130px]">
                <div className="p-2.5 bg-[#7F40EE]/10 rounded-full text-[#7F40EE] group-hover:scale-110 transition duration-205 mb-2">
                  <Paperclip size={18} />
                </div>
                <span className="text-xs font-bold text-slate-700">Drag & drop files, or <span className="text-[#7F40EE] underline">browse files</span></span>
                <span className="text-[10px] text-slate-400 mt-1 font-semibold">Images, PDFs, docs, spreadsheets</span>
                <input
                  type="file"
                  multiple
                  onChange={onFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Right side: Selected/Uploaded documents display */}
            <div className="border border-slate-200 bg-slate-50/40 rounded-2xl p-4 min-h-[130px] flex flex-col justify-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Selected Files ({selectedFiles.length})
              </span>
              {selectedFiles.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${file.size}-${file.lastModified}`} className="inline-flex items-center gap-2 rounded-xl bg-slate-100/80 border border-slate-200/40 px-3 py-1.5 text-xs text-slate-700 w-fit">
                      <Paperclip size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate max-w-[180px] font-bold text-slate-800">{file.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-slate-400 hover:text-red-500 transition p-0.5 rounded-lg hover:bg-slate-200/50 shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-slate-400 py-4">
                  <span className="text-xs font-semibold">No files selected</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Subtask View Modal — fully functional */}
      {viewingSubtask && (() => {
        const assigneeUser = users.find((u) => String(u.id) === String(viewingSubtask.assignedEmployeeId));
        const priorityMap = {
          urgent: { label: 'Urgent', color: 'text-red-600 bg-red-50 border-red-200', flagClass: 'fill-red-500 text-red-500' },
          high:   { label: 'High',   color: 'text-amber-600 bg-amber-50 border-amber-200', flagClass: 'fill-amber-500 text-amber-500' },
          medium: { label: 'Normal', color: 'text-blue-600 bg-blue-50 border-blue-200', flagClass: 'fill-blue-500 text-blue-500' },
          low:    { label: 'Low',    color: 'text-slate-600 bg-slate-100 border-slate-200', flagClass: 'fill-slate-400 text-slate-400' },
        };
        const pInfo = priorityMap[viewingSubtask.priority] || priorityMap.medium;
        const instructions = viewingSubtask.instructions || [];
        const documents = viewingSubtask.documents || [];
        const comments = viewingSubtask.comments || [];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button type="button" className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]" onClick={closeSubtaskView} />
            <aside className="relative z-10 flex h-[min(94vh,780px)] w-[min(98vw,1280px)] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Task</span>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 font-mono border border-slate-200">New</span>
                </div>
                <button type="button" onClick={closeSubtaskView} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-800 transition">
                  <X size={15} />
                </button>
              </div>

              {/* Body */}
              <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[60%_40%]">
                {/* Left */}
                <div className="min-h-0 overflow-y-auto p-6 space-y-6">
                  <h3 className="text-2xl font-bold text-slate-900">{viewingSubtask.title || 'Untitled Subtask'}</h3>

                  {/* Metadata — icon labels + styled values */}
                  <div className="grid grid-cols-2 gap-x-10 gap-y-5 border-b border-slate-100 pb-6">

                    {/* STATUS */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 w-28 text-xs font-bold text-slate-800 uppercase tracking-wider shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                        STATUS
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500 px-3 py-1.5 text-xs font-bold text-white uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                        TO DO
                      </span>
                    </div>

                    {/* ASSIGNEE */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 w-28 text-xs font-bold text-slate-800 uppercase tracking-wider shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                        ASSIGNEE
                      </span>
                      {assigneeUser ? (
                        <div className="flex items-center gap-2">
                          {renderUserAvatar(assigneeUser, 'w-7 h-7 rounded-full')}
                          <span className="text-sm font-semibold text-slate-800">{assigneeUser.name}</span>
                        </div>
                      ) : <span className="text-xs text-slate-400">Unassigned</span>}
                    </div>

                    {/* DUE DATE */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 w-28 text-xs font-bold text-slate-800 uppercase tracking-wider shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        DUE DATE
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {viewingSubtask.dueDate ? new Date(viewingSubtask.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No Date'}
                      </span>
                    </div>

                    {/* REASSIGN (shows assignee picker read-only display) */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 w-28 text-xs font-bold text-slate-800 uppercase tracking-wider shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                        REASSIGN
                      </span>
                      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 min-w-[150px] justify-between">
                        <div className="flex items-center gap-2">
                          {assigneeUser ? (
                            <>{renderUserAvatar(assigneeUser, 'w-6 h-6 rounded-full')}
                            <span className="text-xs font-semibold text-slate-700">{assigneeUser.name}</span></>
                          ) : <span className="text-xs text-slate-400">Unassigned</span>}
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>

                    {/* PRIORITY */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 w-28 text-xs font-bold text-slate-800 uppercase tracking-wider shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                        PRIORITY
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${pInfo.color}`}>
                        <Flag size={13} className={pInfo.flagClass} />
                        {pInfo.label}
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5 opacity-60"><path d="m6 9 6 6 6-6"/></svg>
                      </span>
                    </div>

                    {/* REPEAT */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 w-28 text-xs font-bold text-slate-800 uppercase tracking-wider shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                        REPEAT
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 capitalize">
                        {viewingSubtask.frequency || 'Never'}
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
                      </span>
                    </div>

                  </div>

                  {/* Instructions + Documents */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Instructions */}
                    <div className="flex flex-col gap-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-2">
                        <AlignLeft size={14} className="text-slate-600" />
                        Instructions
                      </div>
                      <div className="min-h-[120px] flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2 overflow-y-auto">
                        {instructions.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                            <AlignLeft size={22} className="text-slate-300 mb-1" />
                            <p className="text-xs font-semibold text-slate-500">No instructions available</p>
                            <p className="text-[11px] text-slate-400">Instructions added for this subtask will appear here.</p>
                          </div>
                        ) : instructions.map((ins, i) => (
                          <div key={ins.id} className="flex items-start gap-2 group">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200">{i + 1}</div>
                            <p className="flex-1 text-xs text-slate-700 leading-relaxed">{ins.text}</p>
                            <button type="button" onClick={() => removeSubtaskInstruction(ins.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition shrink-0"><X size={12} /></button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={subtaskInstructionDraft}
                          onChange={(e) => setSubtaskInstructionDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtaskInstruction(); } }}
                          placeholder="Add instruction..."
                          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] transition"
                        />
                        <button type="button" onClick={addSubtaskInstruction} disabled={!subtaskInstructionDraft.trim()} className="rounded-xl bg-[#7F40EE] px-4 py-2 text-xs font-bold text-white hover:bg-[#6A31D1] disabled:opacity-40 transition flex items-center gap-1">
                          <Plus size={12} /> ADD
                        </button>
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="flex flex-col gap-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-2">
                        <Paperclip size={14} className="text-slate-600" />
                        Documents
                      </div>
                      <div className="min-h-[120px] flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2 overflow-y-auto">
                        {documents.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                            <Paperclip size={22} className="text-slate-300 mb-1" />
                            <p className="text-xs font-semibold text-slate-500">No documents uploaded yet.</p>
                            <p className="text-[11px] text-slate-400">Uploaded documents will appear here.</p>
                          </div>
                        ) : documents.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-2 group">
                            <Paperclip size={12} className="text-slate-400 shrink-0" />
                            <span className="flex-1 truncate text-xs font-semibold text-slate-700">{doc.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">{(doc.size / 1024).toFixed(1)} KB</span>
                            <button type="button" onClick={() => removeSubtaskDocument(doc.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition shrink-0"><X size={12} /></button>
                          </div>
                        ))}
                      </div>
                      <label className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 cursor-pointer hover:border-[#7F40EE] hover:text-[#7F40EE] transition shadow-sm">
                        <Paperclip size={13} />
                        UPLOAD DOCUMENT
                        <input type="file" multiple className="hidden" onChange={(e) => { handleSubtaskDocUpload(e.target.files); e.target.value = ''; }} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Right — Comments (fully functional) */}
                <div className="border-l border-slate-100 flex flex-col">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Comments</p>
                      <p className="text-xs text-slate-400">Chat with the team right here.</p>
                    </div>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{comments.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {comments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200 mb-3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        <p className="text-xs font-semibold text-slate-400">No comments yet. Be the first!</p>
                      </div>
                    ) : comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-3 group">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">{(c.author || 'Y').charAt(0).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-slate-800">{c.author}</span>
                            <span className="text-[10px] text-slate-400">{c.time}</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{c.text}</p>
                        </div>
                        <button type="button" onClick={() => removeSubtaskComment(c.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition shrink-0 mt-0.5"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 px-4 py-3 flex gap-2">
                    <input
                      value={subtaskCommentDraft}
                      onChange={(e) => setSubtaskCommentDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addSubtaskComment(); } }}
                      placeholder="Type comment..."
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] transition"
                    />
                    <button type="button" onClick={addSubtaskComment} disabled={!subtaskCommentDraft.trim()} className="rounded-xl bg-[#7F40EE] px-4 py-2 text-xs font-bold text-white hover:bg-[#6A31D1] disabled:opacity-40 transition">Send</button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        );
      })()}

      {/* Assign To Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Assign To</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={assigneeSearch}
                onChange={(event) => setAssigneeSearch(event.target.value)}
                placeholder="Search employee"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-700 outline-none focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] bg-slate-50 hover:bg-slate-100/50 transition"
              />
            </div>

            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => toggleUserSelection(u.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3">
                      {renderUserAvatar(u, 'w-9 h-9 rounded-full')}
                      <div>
                        <div className="font-bold text-xs text-slate-800">{u.name}</div>
                        <div className="text-[10px] text-slate-500">{u.email}</div>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition ${tempAssignees.includes(u.id)
                          ? 'bg-[#7F40EE] border-[#7F40EE]'
                          : 'border-slate-300 group-hover:border-[#7F40EE]'
                        }`}
                    >
                      {tempAssignees.includes(u.id) && <Check size={10} className="text-white" />}
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-2 py-4 text-xs text-slate-400 text-center">No employees found.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAssignees}
                className="px-6 py-2 rounded-xl text-xs font-bold bg-[#7F40EE] text-white shadow-md hover:bg-[#6A31D1] transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assigned By Modal */}
      {assignedByModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Assigned By</h3>
              <button onClick={() => setAssignedByModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={assignedBySearch}
                onChange={(event) => setAssignedBySearch(event.target.value)}
                placeholder="Search employee"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-700 outline-none focus:border-[#7F40EE] focus:ring-1 focus:ring-[#7F40EE] bg-slate-50 hover:bg-slate-100/50 transition"
              />
            </div>

            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {filteredAssignedByUsers.length > 0 ? (
                filteredAssignedByUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => { setAssignedBy(u.id); setAssignedByModalOpen(false); }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3">
                      {renderUserAvatar(u, 'w-9 h-9 rounded-full')}
                      <div>
                        <div className="font-bold text-xs text-slate-800">
                          {u.name}
                          {u.id === user?.id && (
                            <span className="ml-1.5 text-[10px] font-normal text-[#7F40EE]">(You)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">{u.email}</div>
                      </div>
                    </div>
                    {assignedBy === u.id && (
                      <div className="w-4 h-4 rounded-full bg-[#7F40EE] flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="px-2 py-4 text-xs text-slate-400 text-center">No employees found.</p>
              )}
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setAssignedByModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50"
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
