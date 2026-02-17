'use client';

import Image from 'next/image';
import { FileDown, Plus } from 'lucide-react';
import { useData } from './DataContext';

export default function TeamMembers() {
  const { users, tasks } = useData();

  const getUserStats = (userId) => {
    const userTasks = tasks.filter((t) => t.assignees.includes(userId));
    return {
      pending: userTasks.filter((t) => t.status === 'Pending').length,
      inProgress: userTasks.filter((t) => t.status === 'In Progress').length,
      completed: userTasks.filter((t) => t.status === 'Completed').length,
    };
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-black">Team Members</h2>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#7F40EE] text-white hover:bg-[#6A31D1] transition-colors">
            <Plus size={16} />
            Add Member
          </button>
          <button className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors">
            <FileDown size={18} />
            Download Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {users.map((user) => {
          const stats = getUserStats(user.id);
          const avatarSrc = user?.avatar || null;
          const fallbackInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';
          return (
            <div key={user.id} className="relative bg-white p-6 rounded-xl shadow-sm flex flex-col items-center text-center">
              <button
                type="button"
                aria-label="Delete member"
                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  ></path>
                </svg>
              </button>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
