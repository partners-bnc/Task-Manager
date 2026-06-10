'use client';

import React, { useState, useEffect } from 'react';
import { useData } from './DataContext';
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, Users, Check, X, Edit, Trash, CheckCircle } from 'lucide-react';

export default function CalendarView({ taskId = null, isMini = false }) {
  // Safe context extraction with HRM fallback support
  let dataContextVal = null;
  try {
    dataContextVal = useData();
  } catch (e) {
    // Context is not available, we will fetch data locally
  }

  const [localUsers, setLocalUsers] = useState([]);
  const [localTasks, setLocalTasks] = useState([]);
  const [localCurrentUser, setLocalCurrentUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDateStr, setSelectedDateStr] = useState('');

  // Form states
  const [eventTitle, setEventTitle] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endDateStr, setEndDateStr] = useState('');
  const [endTimeStr, setEndTimeStr] = useState('10:00');
  const [associatedTaskId, setAssociatedTaskId] = useState(taskId || '');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);

  // Derive active values based on available context or fallback
  const activeUsers = (dataContextVal && dataContextVal.users && dataContextVal.users.length > 0) ? dataContextVal.users : localUsers;
  const activeTasks = (dataContextVal && dataContextVal.tasks && dataContextVal.tasks.length > 0) ? dataContextVal.tasks : localTasks;
  const activeCurrentUser = (dataContextVal && dataContextVal.user) ? dataContextVal.user : localCurrentUser;

  // Local fallback data loading if context isn't wrapped
  useEffect(() => {
    if (!dataContextVal) {
      // Fetch users
      fetch('/HRM/api/employees')
        .then(res => res.json())
        .then(data => {
          if (data && data.employees) {
            setLocalUsers(data.employees.map(e => ({
              id: e.id,
              name: e.name,
              email: e.email,
              role: e.role || 'Employee',
              avatar: e.profile_picture_url || ''
            })));
          }
        })
        .catch(err => console.error('Failed to fetch employees in calendar', err));
      
      // Fetch tasks
      fetch('/Taskmanager/api/tasks')
        .then(res => res.json())
        .then(data => {
          if (data && data.tasks) {
            setLocalTasks(data.tasks.map(t => ({
              id: t.id,
              title: t.task_name || t.title
            })));
          }
        })
        .catch(err => console.error('Failed to fetch tasks in calendar', err));

      // Fetch me
      fetch('/HRM/api/employee/me')
        .then(res => res.json())
        .then(data => {
          if (data && data.employee) {
            setLocalCurrentUser(data.employee);
          }
        })
        .catch(() => {
          // Fallback admin
          fetch('/Taskmanager/api/admin/me')
            .then(res => res.json())
            .then(data => {
              if (data && data.admin) {
                setLocalCurrentUser(data.admin);
              }
            })
            .catch(err => console.error('Failed to fetch current user in calendar', err));
        });
    }
  }, [dataContextVal]);

  // Load events from LocalStorage
  useEffect(() => {
    const loadEvents = () => {
      const stored = localStorage.getItem('taskflow_calendar_events');
      if (stored) {
        try {
          setEvents(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse calendar events', e);
        }
      } else {
        // Seed some sample events if empty
        const sampleEvents = [
          {
            id: 'sample-1',
            title: 'Project Kickoff Meeting',
            start: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0] + 'T10:00:00.000Z',
            end: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0] + 'T11:30:00.000Z',
            taskId: activeTasks[0]?.id || '',
            participants: activeUsers.slice(0, 3).map(u => u.id),
            status: 'upcoming',
            createdBy: activeCurrentUser?.id || 'admin',
          },
          {
            id: 'sample-2',
            title: 'Sprint Retrospective',
            start: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0] + 'T15:00:00.000Z',
            end: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0] + 'T16:00:00.000Z',
            taskId: '',
            participants: activeUsers.slice(1, 4).map(u => u.id),
            status: 'completed',
            createdBy: activeCurrentUser?.id || 'admin',
          }
        ];
        localStorage.setItem('taskflow_calendar_events', JSON.stringify(sampleEvents));
        setEvents(sampleEvents);
      }
    };

    loadEvents();

    // Listen to changes (across views)
    const handleStorageChange = (e) => {
      if (e.key === 'taskflow_calendar_events') {
        loadEvents();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [activeUsers, activeTasks, activeCurrentUser]);

  const saveEventsToStorage = (updated) => {
    localStorage.setItem('taskflow_calendar_events', JSON.stringify(updated));
    setEvents(updated);
    // Trigger storage event locally for other components in same window
    window.dispatchEvent(new Event('storage'));
  };

  // Date utilities
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay(); // 0 is Sunday
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayIndex = getFirstDayOfMonth(currentDate);
  const currentMonthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  // Filter events by taskId if mini/task-locked
  const filteredEvents = taskId 
    ? events.filter(e => e.taskId === taskId) 
    : events;

  // Render cells
  const getCellEvents = (day) => {
    return filteredEvents.filter(e => {
      const eDate = new Date(e.start);
      return eDate.getFullYear() === currentDate.getFullYear() &&
             eDate.getMonth() === currentDate.getMonth() &&
             eDate.getDate() === day;
    });
  };

  // Get dynamic status
  const getEventStatus = (event) => {
    if (event.status === 'completed') return 'completed';
    const end = new Date(event.end);
    if (end < new Date()) return 'late';
    return 'upcoming';
  };

  // Open creation modal
  const handleDayClick = (day) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const tzOffset = clickedDate.getTimezoneOffset() * 60000;
    const dateStr = new Date(clickedDate - tzOffset).toISOString().split('T')[0];
    
    setSelectedDateStr(dateStr);
    setEventTitle('');
    setStartDateStr(dateStr);
    setEndDateStr(dateStr);
    setStartTimeStr('09:00');
    setEndTimeStr('10:00');
    setAssociatedTaskId(taskId || '');
    setSelectedParticipants([]);
    setIsCompleted(false);
    setSelectedEvent(null);
    setShowBookingModal(true);
  };

  // Edit event click
  const handleEditClick = (event, e) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setEventTitle(event.title);
    
    const sDate = new Date(event.start);
    const eDate = new Date(event.end);
    
    const tzOffset = sDate.getTimezoneOffset() * 60000;
    setStartDateStr(new Date(sDate - tzOffset).toISOString().split('T')[0]);
    setEndDateStr(new Date(eDate - tzOffset).toISOString().split('T')[0]);
    
    setStartTimeStr(sDate.toTimeString().split(' ')[0].substring(0, 5));
    setEndTimeStr(eDate.toTimeString().split(' ')[0].substring(0, 5));
    
    setAssociatedTaskId(event.taskId || '');
    setSelectedParticipants(event.participants || []);
    setIsCompleted(event.status === 'completed');
    
    setShowDetailModal(false);
    setShowBookingModal(true);
  };

  // Save/Create handler
  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const startDateTime = new Date(`${startDateStr}T${startTimeStr}:00`);
    const endDateTime = new Date(`${endDateStr}T${endTimeStr}:00`);

    if (endDateTime < startDateTime) {
      alert("End time must be after start time");
      return;
    }

    const calculatedStatus = isCompleted ? 'completed' : (endDateTime < new Date() ? 'late' : 'upcoming');

    const eventData = {
      id: selectedEvent ? selectedEvent.id : `event-${Date.now()}`,
      title: eventTitle,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      taskId: associatedTaskId,
      participants: selectedParticipants,
      status: calculatedStatus,
      createdBy: selectedEvent ? selectedEvent.createdBy : (activeCurrentUser?.id || 'admin'),
    };

    let updatedEvents;
    if (selectedEvent) {
      updatedEvents = events.map(ev => ev.id === selectedEvent.id ? eventData : ev);
    } else {
      updatedEvents = [...events, eventData];
    }

    saveEventsToStorage(updatedEvents);
    setShowBookingModal(false);
  };

  // Delete event
  const handleDeleteEvent = (eventId) => {
    if (confirm("Are you sure you want to delete this event?")) {
      const updated = events.filter(ev => ev.id !== eventId);
      saveEventsToStorage(updated);
      setShowDetailModal(false);
      setShowBookingModal(false);
    }
  };

  // Toggle complete
  const handleToggleComplete = (event, e) => {
    e.stopPropagation();
    const nextStatus = event.status === 'completed' ? 'upcoming' : 'completed';
    const updated = events.map(ev => ev.id === event.id ? { ...ev, status: nextStatus } : ev);
    saveEventsToStorage(updated);
    if (selectedEvent && selectedEvent.id === event.id) {
      setSelectedEvent({ ...selectedEvent, status: nextStatus });
    }
  };

  // Participant selection toggle
  const toggleParticipant = (memberId) => {
    setSelectedParticipants(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId) 
        : [...prev, memberId]
    );
  };

  // View event details
  const handleEventClick = (event, e) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setShowDetailModal(true);
  };

  // Generate calendar grid array
  const renderCalendarDays = () => {
    const cells = [];
    const prevMonthDaysCount = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
    
    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDaysCount - i,
        isCurrentMonth: false,
        monthOffset: -1
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        day: i,
        isCurrentMonth: true,
        monthOffset: 0
      });
    }

    // Next month filler days to complete a 6x7 grid (42 days)
    const remainingDays = 42 - cells.length;
    for (let i = 1; i <= remainingDays; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        monthOffset: 1
      });
    }

    return cells;
  };

  const daysGrid = renderCalendarDays();

  // Mini Agenda View for mini-calendar (drawer view)
  if (isMini) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#7F40EE]" />
            <h3 className="font-bold text-slate-800">Task Schedule & Reminders</h3>
          </div>
          <button
            onClick={() => handleDayClick(new Date().getDate())}
            className="flex items-center gap-1 text-xs font-bold text-[#7F40EE] bg-[#7F40EE]/10 px-3 py-1.5 rounded-xl hover:bg-[#7F40EE]/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Book Slot
          </button>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">No events scheduled for this task yet.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {filteredEvents.map(event => {
              const status = getEventStatus(event);
              const startDate = new Date(event.start);
              const endDate = new Date(event.end);
              return (
                <div 
                  key={event.id}
                  onClick={(e) => handleEventClick(event, e)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group flex items-start justify-between ${
                    status === 'completed' 
                      ? 'bg-emerald-50/50 border-emerald-100/80 hover:bg-emerald-50' 
                      : status === 'late'
                        ? 'bg-rose-50/50 border-rose-100/80 hover:bg-rose-50'
                        : 'bg-slate-50/60 border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1 pr-6">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => handleToggleComplete(event, e)}
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          status === 'completed'
                            ? 'bg-emerald-500 border-emerald-600 text-white'
                            : 'border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {status === 'completed' && <Check className="w-2.5 h-2.5" />}
                      </button>
                      <h4 className={`text-sm font-semibold text-slate-800 line-clamp-1 ${status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                        {event.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pl-6">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        {', '}
                        {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleEditClick(event, e)} 
                      className="p-1 rounded-lg text-slate-500 hover:bg-slate-200"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }} 
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-100"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dynamic Modals Rendered inline */}
        {renderModals()}
      </div>
    );
  }

  // Dashboard / Full Page View
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#7F40EE]/10 rounded-xl flex items-center justify-center text-[#7F40EE]">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Advanced Workspace Calendar</h2>
            <p className="text-sm text-slate-500 font-medium">Manage events, track schedules and coordinate team presence</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
            <button 
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-800 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 text-sm font-bold text-slate-700 min-w-[130px] text-center">
              {currentMonthLabel}
            </span>
            <button 
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-800 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={today}
            className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 text-sm transition-all"
          >
            Today
          </button>
          <button
            onClick={() => handleDayClick(new Date().getDate())}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#7F40EE] text-white font-bold rounded-xl hover:bg-[#6A31D1] transition-all shadow-lg shadow-[#7F40EE]/20 text-sm"
          >
            <Plus className="w-4 h-4" /> Book Event
          </button>
        </div>
      </div>

      {/* Main Grid & Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Legend & Upcoming list */}
        <div className="lg:col-span-1 space-y-6">
          {/* Legend */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Status Visualizer</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                </span>
                <span>Upcoming</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </span>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                </span>
                <span>Late (Overdue)</span>
              </div>
            </div>
          </div>

          {/* Agenda / Upcoming events */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">All Booked Events</h3>
            {filteredEvents.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium text-center py-4">No events scheduled.</p>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {filteredEvents.map(event => {
                  const status = getEventStatus(event);
                  const startDate = new Date(event.start);
                  return (
                    <div 
                      key={event.id}
                      onClick={(e) => handleEventClick(event, e)}
                      className={`p-3 rounded-xl border cursor-pointer hover:bg-slate-50 transition-all ${
                        status === 'completed' 
                          ? 'border-emerald-100 bg-emerald-50/10' 
                          : status === 'late'
                            ? 'border-rose-100 bg-rose-50/10'
                            : 'border-slate-100'
                      }`}
                    >
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{event.title}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">
                        {startDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}{', '}
                        {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Month View Grid */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center py-2.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <span key={day} className="text-xs font-bold text-slate-500 uppercase tracking-wider">{day}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-slate-100">
            {daysGrid.map((cell, idx) => {
              const cellEvents = cell.isCurrentMonth ? getCellEvents(cell.day) : [];
              const isToday = cell.isCurrentMonth && 
                              cell.day === new Date().getDate() && 
                              currentDate.getMonth() === new Date().getMonth() && 
                              currentDate.getFullYear() === new Date().getFullYear();

              return (
                <div 
                  key={idx}
                  onClick={() => cell.isCurrentMonth && handleDayClick(cell.day)}
                  className={`min-h-[100px] p-2 flex flex-col group transition-all relative select-none ${
                    cell.isCurrentMonth 
                      ? 'bg-white hover:bg-slate-50/40 cursor-pointer' 
                      : 'bg-slate-50/50 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {/* Date label */}
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-bold rounded-lg px-2 py-1 ${
                      isToday 
                        ? 'bg-[#7F40EE] text-white' 
                        : cell.isCurrentMonth 
                          ? 'text-slate-800' 
                          : 'text-slate-400'
                    }`}>
                      {cell.day}
                    </span>
                    {cell.isCurrentMonth && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDayClick(cell.day); }}
                        className="w-5 h-5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Cell Events List */}
                  <div className="flex-1 space-y-1 overflow-y-auto subtle-scrollbar max-h-16">
                    {cellEvents.map(event => {
                      const status = getEventStatus(event);
                      const startTime = new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                      
                      let badgeColor = 'bg-amber-500 border-amber-600 text-amber-900 bg-amber-50';
                      if (status === 'completed') badgeColor = 'bg-emerald-500 border-emerald-600 text-emerald-900 bg-emerald-50';
                      if (status === 'late') badgeColor = 'bg-rose-500 border-rose-600 text-rose-900 bg-rose-50';

                      return (
                        <div 
                          key={event.id}
                          onClick={(e) => handleEventClick(event, e)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg border flex items-center justify-between gap-1 shadow-sm transition-all hover:scale-[1.02] ${badgeColor}`}
                        >
                          <span className="truncate flex-1">{event.title}</span>
                          <span className="text-[8px] font-semibold opacity-75 shrink-0">{startTime}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {renderModals()}
    </div>
  );

  // Reusable modal definitions
  function renderModals() {
    return (
      <>
        {/* Booking & Edit Modal */}
        {showBookingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#7F40EE]" />
                  {selectedEvent ? 'Modify Scheduled Slot' : 'Book Calendar Slot'}
                </h3>
                <button 
                  onClick={() => setShowBookingModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveEvent} className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Event Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter event name or title"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7F40EE]/30 focus:border-[#7F40EE] text-sm font-medium text-slate-800"
                  />
                </div>

                {/* Date Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDateStr}
                      onChange={(e) => setStartDateStr(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7F40EE]/30 focus:border-[#7F40EE] text-sm font-medium text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDateStr}
                      onChange={(e) => setEndDateStr(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7F40EE]/30 focus:border-[#7F40EE] text-sm font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Time Slot Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Start Time</label>
                    <input
                      type="time"
                      required
                      value={startTimeStr}
                      onChange={(e) => setStartTimeStr(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7F40EE]/30 focus:border-[#7F40EE] text-sm font-medium text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">End Time</label>
                    <input
                      type="time"
                      required
                      value={endTimeStr}
                      onChange={(e) => setEndTimeStr(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7F40EE]/30 focus:border-[#7F40EE] text-sm font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Task Linking (Optional / Hidden in Mini Mode) */}
                {!taskId && activeTasks.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Link to Task</label>
                    <select
                      value={associatedTaskId}
                      onChange={(e) => setAssociatedTaskId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7F40EE]/30 focus:border-[#7F40EE] text-sm font-medium text-slate-800 bg-white"
                    >
                      <option value="">-- None (General Event) --</option>
                      {activeTasks.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Select People (Participants) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    Select People (Participants)
                  </label>
                  
                  {activeUsers.length === 0 ? (
                    <p className="text-xs text-slate-500">No members loaded in directory.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto p-3 space-y-2">
                      {activeUsers.map(member => {
                        const isChecked = selectedParticipants.includes(member.id);
                        return (
                          <div 
                            key={member.id} 
                            onClick={() => toggleParticipant(member.id)}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {member.avatar ? (
                                <img src={member.avatar} alt={member.name} className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center rounded-full">
                                  {member.name?.charAt(0) || 'E'}
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-bold text-slate-800">{member.name}</p>
                                <p className="text-[10px] text-slate-500 font-semibold">{member.role}</p>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked ? 'bg-[#7F40EE] border-[#7F40EE] text-white' : 'border-slate-300'
                            }`}>
                              {isChecked && <Check className="w-2.5 h-2.5" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Status completed check (Only if editing) */}
                {selectedEvent && (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCompleted(!isCompleted)}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isCompleted ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isCompleted && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-xs font-bold text-slate-700">Mark event as Completed</span>
                  </div>
                )}
              </form>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  {selectedEvent && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                      className="px-4 py-2 border border-rose-200 text-rose-500 rounded-xl hover:bg-rose-50 font-bold text-sm transition-all"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEvent}
                    className="px-5 py-2 bg-[#7F40EE] text-white rounded-xl hover:bg-[#6A31D1] font-bold text-sm transition-all shadow-lg shadow-[#7F40EE]/20"
                  >
                    {selectedEvent ? 'Update Event' : 'Book Event'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details View Modal */}
        {showDetailModal && selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  selectedEvent.status === 'completed'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : selectedEvent.status === 'late'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  {selectedEvent.status.toUpperCase()}
                </span>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-800">{selectedEvent.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>
                      {new Date(selectedEvent.start).toLocaleString('en-US', { 
                        weekday: 'short', day: 'numeric', month: 'short', 
                        hour: 'numeric', minute: '2-digit' 
                      })}
                      {' - '}
                      {new Date(selectedEvent.end).toLocaleTimeString('en-US', { 
                        hour: 'numeric', minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>

                {/* Linked task */}
                {selectedEvent.taskId && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Associated Task</p>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">
                        {activeTasks.find(t => t.id === selectedEvent.taskId)?.title || 'Task Details'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Participants */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    Participants ({selectedEvent.participants?.length || 0})
                  </h4>
                  {(!selectedEvent.participants || selectedEvent.participants.length === 0) ? (
                    <p className="text-xs text-slate-500 italic">No other participants selected.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                      {selectedEvent.participants.map(pId => {
                        const m = activeUsers.find(u => u.id === pId);
                        if (!m) return null;
                        return (
                          <div key={pId} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
                            {m.avatar ? (
                              <img src={m.avatar} alt={m.name} className="w-4 h-4 rounded-full object-cover" />
                            ) : (
                              <div className="w-4 h-4 bg-[#7F40EE]/10 text-[#7F40EE] text-[9px] font-extrabold flex items-center justify-center rounded-full">
                                {m.name?.charAt(0)}
                              </div>
                            )}
                            <span className="text-[10px] font-bold text-slate-700">{m.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <button
                  onClick={(e) => { handleToggleComplete(selectedEvent, e); setShowDetailModal(false); }}
                  className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl font-bold text-xs transition-all ${
                    selectedEvent.status === 'completed'
                      ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {selectedEvent.status === 'completed' ? 'Reopen Slot' : 'Complete Event'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleEditClick(selectedEvent, e)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold text-xs transition-all flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    className="px-4 py-2 border border-rose-200 text-rose-500 rounded-xl hover:bg-rose-50 font-bold text-xs transition-all flex items-center gap-1"
                  >
                    <Trash className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
}
