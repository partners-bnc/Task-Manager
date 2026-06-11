'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Paperclip } from 'lucide-react';
import { useData } from './DataContext';

const normalizeLabelValue = (value) => String(value || '').trim().toLowerCase();

export default function ManageTasks() {
  const router = useRouter();
  const { tasks, users, taskLabels, isAdminMode } = useData();
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [labelFilter, setLabelFilter] = useState('All');
  const [createdByFilter, setCreatedByFilter] = useState('All');
  const [ownershipFilter, setOwnershipFilter] = useState('all');

  const mergedLabelOptions = Array.from(
    new Map(
      [...taskLabels, ...tasks.map((task) => task.label).filter(Boolean)]
        .map((label) => [normalizeLabelValue(label), String(label).trim()])
        .filter(([key, value]) => key && value)
    ).values()
  ).sort((left, right) => left.localeCompare(right));

  const getLabelCount = (label) => {
    const normalized = normalizeLabelValue(label);
    return tasks.filter((task) => normalizeLabelValue(task.label) === normalized).length;
  };

  const createdByOptions = Array.from(
    new Map(
      tasks
        .map((task) => String(task.createdBy || '').trim())
        .filter(Boolean)
        .map((name) => [name.toLowerCase(), name])
    ).values()
  ).sort((left, right) => left.localeCompare(right));

  const getCreatedByCount = (createdBy) =>
    tasks.filter((task) => String(task.createdBy || '').trim().toLowerCase() === String(createdBy || '').trim().toLowerCase()).length;

  const ownershipFilteredTasks = tasks.filter((task) => {
    if (ownershipFilter === 'assigned_to_me') return task.isAssignedToCurrentUser;
    if (ownershipFilter === 'assigned_by_me') return task.isAssignedByCurrentUser;
    return true;
  });

  const displayTasks = ownershipFilteredTasks.filter((task) => {
    const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
    const matchesLabel =
      labelFilter === 'All' || normalizeLabelValue(task.label) === normalizeLabelValue(labelFilter);
    const matchesCreatedBy =
      createdByFilter === 'All' || String(task.createdBy || '').trim().toLowerCase() === String(createdByFilter).trim().toLowerCase();
    return matchesStatus && matchesPriority && matchesLabel && matchesCreatedBy;
  });

  const getPriorityColor = (p) => {
    switch (p) {
      case 'Urgent': return 'bg-red-100 text-red-700';
      case 'High': return 'bg-orange-100 text-orange-600';
      case 'Medium': return 'bg-blue-100 text-blue-600';
      case 'Low': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'Pending': return 'bg-slate-100 text-slate-600';
      case 'In Progress': return 'bg-[#7F40EE]/10 text-[#7F40EE]';
      case 'Completed': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getDeadlineBadgeClasses = (deadlineState) => {
    switch (deadlineState?.tone) {
      case 'success': return 'bg-emerald-100 text-emerald-700';
      case 'warning': return 'bg-amber-100 text-amber-700';
      case 'danger': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getUserById = (id) => users.find((u) => u.id === id);

  const ownershipTabs = [
    { key: 'all', label: 'All', count: tasks.length },
    { key: 'assigned_to_me', label: 'Assigned To Me', count: tasks.filter((task) => task.isAssignedToCurrentUser).length },
    { key: 'assigned_by_me', label: 'Assigned By Me', count: tasks.filter((task) => task.isAssignedByCurrentUser).length },
  ];

  const activeOwnershipIndex = ownershipTabs.findIndex((tab) => tab.key === ownershipFilter);

  const openTaskDetail = (taskId) => {
    const path = isAdminMode ? `/Taskmanager/admin/tasks/${taskId}` : `/Taskmanager/dashboard/tasks/${taskId}`;
    router.push(path);
  };

  const getStatusLabel = (status) => {
    if (status === 'Pending') return 'To Do';
    return status;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div
        className="mb-3 flex flex-nowrap items-center gap-1 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex bg-white p-1 rounded-2xl shadow-sm shrink-0 h-10 items-center">
          {['All', 'Pending', 'In Progress', 'Completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`h-8 px-2.5 flex items-center justify-center text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
                statusFilter === tab ? 'bg-[#7F40EE] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab === 'Pending' ? 'To Do' : tab}</span>
              <span
                className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${
                  statusFilter === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-slate-600'
                }`}
              >
                {tab === 'All' ? tasks.length : tasks.filter((t) => t.status === tab).length}
              </span>
            </button>
          ))}
        </div>

        <div className="flex bg-white p-1 rounded-2xl shadow-sm shrink-0 h-10 items-center">
          {['All', 'Urgent', 'High', 'Medium', 'Low'].map((tab) => (
            <button
              key={tab}
              onClick={() => setPriorityFilter(tab)}
              className={`h-8 px-2.5 flex items-center justify-center text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
                priorityFilter === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab === 'All' ? 'All' : tab}</span>
              <span
                className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${
                  priorityFilter === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-slate-600'
                }`}
              >
                {tab === 'All' ? tasks.length : tasks.filter((t) => t.priority === tab).length}
              </span>
            </button>
          ))}
        </div>

        <div className="w-[130px] shrink-0 rounded-2xl bg-white p-1 shadow-sm h-10 flex items-center">
          <select
            value={labelFilter}
            onChange={(event) => setLabelFilter(event.target.value)}
            className="w-full h-8 rounded-xl border-0 bg-transparent px-2.5 py-1 text-sm font-semibold text-slate-700 outline-none cursor-pointer"
          >
            <option value="All">All Labels ({tasks.length})</option>
            {mergedLabelOptions.map((taskLabel) => (
              <option key={taskLabel} value={taskLabel}>
                {taskLabel} ({getLabelCount(taskLabel)})
              </option>
            ))}
          </select>
        </div>

        <div className="w-[145px] shrink-0 rounded-2xl bg-white p-1 shadow-sm h-10 flex items-center">
          <select
            value={createdByFilter}
            onChange={(event) => setCreatedByFilter(event.target.value)}
            className="w-full h-8 rounded-xl border-0 bg-transparent px-2.5 py-1 text-sm font-semibold text-slate-700 outline-none cursor-pointer"
          >
            <option value="All">All Creators ({tasks.length})</option>
            {createdByOptions.map((createdBy) => (
              <option key={createdBy} value={createdBy}>
                {createdBy} ({getCreatedByCount(createdBy)})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto">
        <div className="relative inline-grid min-w-[500px] grid-cols-3 items-center overflow-hidden rounded-2xl bg-white p-1 shadow-sm h-10">
          <div
            className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-xl bg-[#7F40EE] shadow-md transition-transform duration-300 ease-out"
            style={{ transform: `translateX(calc(${activeOwnershipIndex} * 100%))` }}
          />
          {ownershipTabs.map((tab) => {
            const isActive = ownershipFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setOwnershipFilter(tab.key)}
                className={`relative z-10 inline-flex items-center justify-center gap-2 rounded-xl h-8 text-sm font-semibold transition-colors ${
                  isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {displayTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
          No tasks match the selected task view and filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayTasks.map((task) => (
            <div
              key={task.id}
              role="button"
              tabIndex={0}
              onClick={() => openTaskDetail(task.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openTaskDetail(task.id);
                }
              }}
              className="relative bg-white p-6 rounded-xl shadow-sm border border-transparent hover:border-[#7F40EE]/25 transition-all hover:shadow-md group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${getStatusColor(task.status)}`}>
                    {getStatusLabel(task.status)}
                  </span>
                  <span className={`px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${getPriorityColor(task.priority)}`}>
                    {task.priority} Priority
                  </span>
                  {task.label && (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      {task.label}
                    </span>
                  )}
                  {task.deadlineState?.label && (
                    <span className={`px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${getDeadlineBadgeClasses(task.deadlineState)}`}>
                      {task.deadlineState.label}
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-[#7F40EE] transition-colors">{task.title}</h3>
              <p className="text-sm text-slate-500 mb-6 line-clamp-2 leading-relaxed">{task.description}</p>
              <p className="text-xs text-slate-400 mb-4">Created by: {task.createdBy || 'Unknown'}</p>

              <div className="mb-6">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-2">
                  <span className="font-headline text-[1.35rem] font-light tracking-[0.02em] text-slate-800">
                    {task.completedSubtasks}/{task.totalSubtasks}
                  </span>
                  {task.attachments > 0 && (
                    <div className="flex items-center text-[#7F40EE] gap-1 bg-[#7F40EE]/10 px-2 py-0.5 rounded-full">
                      <Paperclip size={12} />
                      <span>{task.attachments}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-2">
                  <span>Task Progress</span>
                  <span>{task.progressPercentage ?? 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${task.progressPercentage ?? 0}%` }}
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between items-end">
                <div className="flex -space-x-3 items-center">
                  {task.assignees.slice(0, 4).map((uid) => {
                    const assignee = getUserById(uid);
                    const avatarSrc = assignee?.avatar || null;
                    const fallbackInitial = assignee?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';

                    if (!avatarSrc) {
                      return (
                        <div
                          key={uid}
                          className="h-10 w-10 rounded-full border-2 border-white bg-slate-200 text-sm font-bold flex items-center justify-center text-slate-700 shrink-0"
                          title={assignee?.name || 'Assignee'}
                          aria-label={assignee?.name || 'Assignee'}
                        >
                          {fallbackInitial}
                        </div>
                      );
                    }

                    return (
                      <Image
                        key={uid}
                        src={avatarSrc}
                        width={40}
                        height={40}
                        unoptimized
                        className="h-10 w-10 rounded-full border-2 border-white object-cover shrink-0"
                        alt={assignee?.name ? `${assignee.name} avatar` : 'Assignee avatar'}
                        title={assignee?.name || 'Assignee'}
                      />
                    );
                  })}
                  {task.assignees.length > 4 && (
                    <div
                      className="h-10 w-10 rounded-full border-2 border-white bg-[#7F40EE] text-xs font-bold flex items-center justify-center text-white shrink-0 shadow-sm"
                      title={`${task.assignees.length - 4} more assignees`}
                    >
                      +{task.assignees.length - 4}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="text-slate-400">Start Date</div>
                    <div className="text-slate-800 font-medium">{task.startDate}</div>
                    <div className="text-slate-400">Due Date</div>
                    <div className="text-slate-800 font-medium">{task.dueDate}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
