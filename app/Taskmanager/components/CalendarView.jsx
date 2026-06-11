'use client';

import React from 'react';
import { CalendarPlus, RefreshCw, Clock3, Activity, CheckCircle2 } from 'lucide-react';

export default function CalendarView({ taskId = null, isMini = false }) {
  if (isMini) {
    return (
      <div className="max-w-2xl mx-auto py-2 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-purple-50 rounded-2xl mb-4 text-[#7F40EE]">
          <CalendarPlus className="w-8 h-8" />
        </div>
        
        <h3 className="text-lg font-bold text-slate-800 mb-1">Upcoming Calendar Integration</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-6 text-xs leading-relaxed">
          We are redesigning the scheduling experience. Soon you'll be able to link and automate your task timelines directly with third-party calendars.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-[#7F40EE] flex items-center justify-center mb-2">
              <RefreshCw className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-slate-800 text-xs mb-0.5">Two-Way Sync</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Sync task deadlines instantly with Google Calendar, Outlook, and Apple Calendar.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
              <Clock3 className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-slate-800 text-xs mb-0.5">Time Blocking</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Schedule dedicated focus blocks for tasks directly from your task workspace.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
              <Activity className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-slate-800 text-xs mb-0.5">Automated Alerts</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Receive smart push notifications and daily summary emails ahead of deadlines.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-slate-800 text-xs mb-0.5">Project Milestones</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Track dependency critical paths and timeline gates dynamically in real-time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard / Full Page View
  return (
    <div className="py-12 px-6 max-w-4xl mx-auto text-center">
      <div className="inline-flex items-center justify-center p-4 bg-purple-50 rounded-2xl mb-5 text-[#7F40EE]">
        <CalendarPlus className="w-10 h-10" />
      </div>
      
      <h2 className="text-2xl font-extrabold text-slate-800 mb-3">Workspace Calendar Integration</h2>
      <p className="text-slate-500 max-w-lg mx-auto mb-10 text-sm leading-relaxed">
        We are developing a fully integrated scheduling module. Soon you will be able to synchronize all workspace activities, deadlines, and events into a single unified calendar interface.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-3xl mx-auto">
        <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-[#7F40EE] flex items-center justify-center mb-4">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1.5">Two-Way Calendar Sync</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Connect Google Calendar, Microsoft Outlook, and Apple Calendar to sync tasks, meetings, and update deadlines bidirectionally.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
            <Clock3 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1.5">Intelligent Time Blocking</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Reserve specific hours on your schedule for high-priority tasks and focus work sessions directly from your task lists.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1.5">Automated Notifications</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Set customized push notifications and summary digests to ensure your team stays informed and aligned before any deadline.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1.5">Timeline Milestones</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Define, visualize, and re-order critical path milestones, dependency gates, and project timelines with a drag-and-drop builder.
          </p>
        </div>
      </div>
    </div>
  );
}
