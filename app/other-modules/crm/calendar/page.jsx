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
    <div className="p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300 h-full overflow-y-auto flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold dark:text-white mb-2">Calendar Overview</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Global timeline parsing {events.length} mapped events. Click any <span className="text-amber-500 font-bold">task</span> to view details & edit.
        </p>
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
