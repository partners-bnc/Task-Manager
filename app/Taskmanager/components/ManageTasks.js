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

  const displayTasks = tasks.filter((task) => {
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
      case 'Low':
        return 'bg-green-100 text-green-600';
      case 'Medium':
        return 'bg-orange-100 text-orange-600';
      case 'High':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'Pending':
        return 'bg-purple-100 text-purple-600';
      case 'In Progress':
        return 'bg-[#7F40EE]/10 text-[#7F40EE]';
      case 'Completed':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getDeadlineBadgeClasses = (deadlineState) => {
    switch (deadlineState?.tone) {
      case 'success':
        return 'bg-emerald-100 text-emerald-700';
      case 'warning':
        return 'bg-amber-100 text-amber-700';
      case 'danger':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getUserById = (id) => users.find((u) => u.id === id);

  const openTaskDetail = (taskId) => {
    const path = isAdminMode ? `/Taskmanager/admin/tasks/${taskId}` : `/Taskmanager/dashboard/tasks/${taskId}`;
    router.push(path);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <h2 className="shrink-0 text-2xl font-bold text-black">Tasks</h2>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <div className="min-w-0 flex bg-white p-1 rounded-lg shadow-sm overflow-x-auto">
            {['All', 'Pending', 'In Progress', 'Completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  statusFilter === tab ? 'bg-[#7F40EE] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
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

            <div className="min-w-0 flex bg-white p-1 rounded-lg shadow-sm overflow-x-auto">
            {['All', 'High', 'Medium', 'Low'].map((tab) => (
              <button
                key={tab}
                onClick={() => setPriorityFilter(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  priorityFilter === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab === 'All' ? 'All Priorities' : tab}
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

            <div className="w-[170px] shrink-0 rounded-lg bg-white p-1 shadow-sm xl:w-[185px]">
              <select
                value={labelFilter}
                onChange={(event) => setLabelFilter(event.target.value)}
                className="w-full rounded-md border-0 bg-transparent px-3 py-2 text-sm font-medium text-slate-700 outline-none"
              >
                <option value="All">All Labels ({tasks.length})</option>
                {mergedLabelOptions.map((taskLabel) => (
                  <option key={taskLabel} value={taskLabel}>
                    {taskLabel} ({getLabelCount(taskLabel)})
                  </option>
                ))}
              </select>
            </div>

            <div className="w-[170px] shrink-0 rounded-lg bg-white p-1 shadow-sm xl:w-[200px]">
              <select
                value={createdByFilter}
                onChange={(event) => setCreatedByFilter(event.target.value)}
                className="w-full rounded-md border-0 bg-transparent px-3 py-2 text-sm font-medium text-slate-700 outline-none"
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
        </div>
      </div>

      {displayTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
          No tasks match the selected status, priority, label, and creator filters.
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
                  {task.status}
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
                ></div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex justify-between items-end">
              <div className="flex -space-x-2">
                {task.assignees.map((uid) => {
                  const assignee = getUserById(uid);
                  const avatarSrc = assignee?.avatar || null;
                  const fallbackInitial = assignee?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';

                  if (!avatarSrc) {
                    return (
                      <div
                        key={uid}
                        className="h-10 w-10 rounded-full border-2 border-white bg-slate-200 text-sm font-semibold flex items-center justify-center text-slate-700"
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
                      className="h-10 w-10 rounded-full border-2 border-white"
                      alt={assignee?.name ? `${assignee.name} avatar` : 'Assignee avatar'}
                    />
                  );
                })}
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
