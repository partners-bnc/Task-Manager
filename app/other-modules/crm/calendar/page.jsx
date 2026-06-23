"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar-overrides.css';
import { useCrm } from '../context/CrmContext';
import MOCK_DATA from '../data/mockData.json';
import TaskDetailsModal from '../components/TaskDetailsModal';
import { CalendarDays } from 'lucide-react';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function CalendarPage() {
  const { currentUser, tasks, updateTask } = useCrm();
  const [mounted, setMounted] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Derive events from shared context tasks + static activities
  const events = useMemo(() => {
    let filteredTasks = tasks;
    let filteredActivities = MOCK_DATA.activities;

    // RBAC: Sales/Viewers only see their own
    if (!["admin", "manager"].includes(currentUser.role)) {
      filteredTasks = filteredTasks.filter(t => t.assigneeId === currentUser.id);
      filteredActivities = filteredActivities.filter(a => a.assigneeId === currentUser.id);
    }

    const mappedTasks = filteredTasks.map(t => ({
      id: `t_${t.id}`,
      taskId: t.id,
      title: `[Task] ${t.title}`,
      start: new Date(t.dueDate),
      end: new Date(t.dueDate),
      allDay: true,
      resource: 'task',
    }));

    const mappedActivities = filteredActivities.map(a => {
      const d = new Date(a.date);
      const dEnd = new Date(d.getTime() + 60 * 60 * 1000);
      return {
        id: `a_${a.id}`,
        title: `[${a.type}] ${a.subject || a.description?.substring(0, 20)}...`,
        start: d,
        end: dEnd,
        allDay: false,
        resource: 'activity',
      };
    });

    return [...mappedTasks, ...mappedActivities];
  }, [currentUser, tasks]);

  if (!mounted) return null;

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3174ad';
    if (event.resource === 'task') {
      backgroundColor = '#f59e0b';
    } else {
      backgroundColor = '#3b82f6';
    }
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        cursor: 'pointer'
      }
    };
  };

  const handleSelectEvent = (event) => {
    if (event.resource === 'task' && event.taskId) {
      const task = tasks.find(t => t.id === event.taskId);
      if (task) {
        setSelectedTask(task);
        setIsModalOpen(true);
      }
    }
  };

  const handleEditTask = (taskId, updates) => {
    updateTask(taskId, updates);
    // Refresh the selected task view
    setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <div className="p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300 h-full overflow-y-auto flex flex-col bg-slate-50 dark:bg-slate-900/50 font-sans">
      <div className="flex items-start gap-3 mb-6 pb-5 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/40">
        <CalendarDays size={38} className="text-[#6057DA] stroke-[1.8] shrink-0 mt-0.5" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight dark:text-white bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent leading-none">Calendar Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1.5">
            Global timeline parsing {events.length} mapped events. Click any task to view details & edit.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 min-h-[600px] transition-colors event-calendar-wrapper">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView="month"
          views={["month", "week", "day"]}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          className="dark:text-slate-200 font-sans"
        />
      </div>

      <TaskDetailsModal
        isOpen={isModalOpen}
        task={selectedTask}
        onClose={() => { setIsModalOpen(false); setSelectedTask(null); }}
        onEditTask={handleEditTask}
      />
    </div>
  );
}
