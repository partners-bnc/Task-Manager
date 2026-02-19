'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FileDown, Paperclip } from 'lucide-react';
import { useData } from './DataContext';

export default function ManageTasks() {
  const { tasks, users, isAdminMode } = useData();
  const [filter, setFilter] = useState('All');

  const displayTasks = filter === 'All' ? tasks : tasks.filter((t) => t.status === filter);

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

  const getUserById = (id) => users.find((u) => u.id === id);

  const openTaskDetail = (taskId) => {
    const path = isAdminMode ? `/admin/tasks/${taskId}` : `/dashboard/tasks/${taskId}`;
    window.open(path, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:justify-between xl:items-center mb-8">
        <h2 className="text-2xl font-bold text-black">My Tasks</h2>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-white p-1 rounded-lg shadow-sm overflow-x-auto">
            {['All', 'Pending', 'In Progress', 'Completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  filter === tab ? 'bg-[#7F40EE] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
                <span
                  className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${
                    filter === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-slate-600'
                  }`}
                >
                  {tab === 'All' ? tasks.length : tasks.filter((t) => t.status === tab).length}
                </span>
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors">
            <FileDown size={18} />
            Download Report
          </button>
        </div>
      </div>

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
              <span className={`px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${getStatusColor(task.status)}`}>
                {task.status}
              </span>
              <span className={`px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${getPriorityColor(task.priority)}`}>
                {task.priority} Priority
              </span>
            </div>

            <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-[#7F40EE] transition-colors">{task.title}</h3>
            <p className="text-sm text-slate-500 mb-6 line-clamp-2 leading-relaxed">{task.description}</p>
            <p className="text-xs text-slate-400 mb-4">Created by: {task.createdBy || 'Unknown'}</p>

            <div className="mb-6">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-2">
                <span>
                  Task Done: {task.completedSubtasks}/{task.totalSubtasks}
                </span>
                {task.attachments > 0 && (
                  <div className="flex items-center text-[#7F40EE] gap-1 bg-[#7F40EE]/10 px-2 py-0.5 rounded-full">
                    <Paperclip size={12} />
                    <span>{task.attachments}</span>
                  </div>
                )}
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-[#7F40EE] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(task.completedSubtasks / Math.max(task.totalSubtasks, 1)) * 100}%` }}
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
                        className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center"
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
                      width={32}
                      height={32}
                      unoptimized
                      className="w-8 h-8 rounded-full border-2 border-white"
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
    </div>
  );
}
