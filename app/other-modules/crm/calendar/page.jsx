"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCrm } from '../context/CrmContext';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Edit2, 
  Trash2, 
  X, 
  Search,
  CheckCircle,
  AlertCircle,
  Instagram,
  Youtube,
  MessageSquare,
  Video,
  FileText,
  FileDown
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';

const PRESET_COLORS = [
  { name: 'Blue', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-500 text-blue-700 dark:text-blue-400', hex: '#3b82f6' },
  { name: 'Green', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-500 text-emerald-700 dark:text-emerald-400', hex: '#10b981' },
  { name: 'Purple', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-500 text-purple-700 dark:text-purple-400', hex: '#8b5cf6' },
  { name: 'Orange', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-500 text-orange-700 dark:text-orange-400', hex: '#f97316' },
  { name: 'Red', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-500 text-rose-700 dark:text-rose-400', hex: '#f43f5e' }
];

export default function CalendarPage() {
  const { 
    currentUser, 
    leads, 
    calendarEvents, 
    addCalendarEvent, 
    updateCalendarEvent, 
    deleteCalendarEvent,
    refreshCrmData,
    setLeads
  } = useCrm();

  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // 'day', 'week', 'month'
  
  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Event form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('meeting');
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('10:00');
  const [eventColor, setEventColor] = useState('#3b82f6');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [showLeadSuggestions, setShowLeadSuggestions] = useState(false);

  // Quick Add Lead form state
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadSource, setLeadSource] = useState('Expert Request');
  const [leadCategory, setLeadCategory] = useState('Hot');
  const [leadType, setLeadType] = useState('Inbound');
  const [leadStatus, setLeadStatus] = useState('New');
  const [leadPriority, setLeadPriority] = useState('Medium');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate demo events dynamically for the visible week if calendarEvents is empty
  const events = useMemo(() => {
    if (calendarEvents && calendarEvents.length > 0) {
      return calendarEvents;
    }

    // Default mock events positioned dynamically relative to the current week
    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
    
    const demoEvents = [
      {
        event_id: 'demo-1',
        title: '1:1 Brand Sync with The Ordinary',
        event_type: 'meeting',
        start_time: new Date(addDays(startOfCurrentWeek, 0).setHours(9, 0, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 0).setHours(10, 0, 0)).toISOString(),
        color: '#3b82f6',
        description: 'Weekly review of agency campaigns and asset alignment.',
        location: 'https://zoom.us/j/123456789'
      },
      {
        event_id: 'demo-2',
        title: 'ZARA Campaign Shoot',
        event_type: 'other',
        start_time: new Date(addDays(startOfCurrentWeek, 0).setHours(10, 30, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 0).setHours(12, 0, 0)).toISOString(),
        color: '#10b981',
        description: 'Zara summer collection product launch shoot.'
      },
      {
        event_id: 'demo-3',
        title: 'Submit Invoice for Etsy Collab',
        event_type: 'task',
        start_time: new Date(addDays(startOfCurrentWeek, 0).setHours(13, 30, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 0).setHours(14, 30, 0)).toISOString(),
        color: '#f97316',
        description: 'Send invoice and deliverable link to Etsy coordinator.'
      },
      {
        event_id: 'demo-4',
        title: 'Publish TikTok for Gymshark',
        event_type: 'task',
        start_time: new Date(addDays(startOfCurrentWeek, 0).setHours(15, 30, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 0).setHours(16, 30, 0)).toISOString(),
        color: '#8b5cf6'
      },
      {
        event_id: 'demo-5',
        title: 'Finalize Carousel Post for Figma EDU',
        event_type: 'meeting',
        start_time: new Date(addDays(startOfCurrentWeek, 1).setHours(10, 30, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 1).setHours(11, 30, 0)).toISOString(),
        color: '#8b5cf6'
      },
      {
        event_id: 'demo-6',
        title: 'Submit Invoice',
        event_type: 'task',
        start_time: new Date(addDays(startOfCurrentWeek, 1).setHours(13, 30, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 1).setHours(14, 15, 0)).toISOString(),
        color: '#10b981'
      },
      {
        event_id: 'demo-7',
        title: 'Review Draft f...',
        event_type: 'task',
        start_time: new Date(addDays(startOfCurrentWeek, 1).setHours(13, 30, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 1).setHours(14, 15, 0)).toISOString(),
        color: '#f97316'
      },
      {
        event_id: 'demo-8',
        title: 'Create IG Story for Headspace Quote Series',
        event_type: 'other',
        start_time: new Date(addDays(startOfCurrentWeek, 1).setHours(17, 0, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 1).setHours(19, 0, 0)).toISOString(),
        color: '#f97316'
      },
      {
        event_id: 'demo-9',
        title: 'Content review: Meta Reels Best Practices',
        event_type: 'meeting',
        start_time: new Date(addDays(startOfCurrentWeek, 2).setHours(8, 30, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 2).setHours(10, 30, 0)).toISOString(),
        color: '#10b981'
      },
      {
        event_id: 'demo-10',
        title: 'Team brainstorm - Holiday Gift Guide Pitch',
        event_type: 'meeting',
        start_time: new Date(addDays(startOfCurrentWeek, 2).setHours(13, 0, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 2).setHours(14, 30, 0)).toISOString(),
        color: '#3b82f6'
      },
      {
        event_id: 'demo-11',
        title: 'H&M Summer Campaign Shoot and Planning',
        event_type: 'other',
        start_time: new Date(addDays(startOfCurrentWeek, 2).setHours(17, 30, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 2).setHours(19, 0, 0)).toISOString(),
        color: '#10b981'
      },
      {
        event_id: 'demo-12',
        title: 'Monthly Check-In with PR Agency',
        event_type: 'meeting',
        start_time: new Date(addDays(startOfCurrentWeek, 3).setHours(10, 0, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 3).setHours(11, 0, 0)).toISOString(),
        color: '#3b82f6'
      },
      {
        event_id: 'demo-13',
        title: 'Approve Draft Tw...',
        event_type: 'task',
        start_time: new Date(addDays(startOfCurrentWeek, 3).setHours(13, 30, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 3).setHours(14, 0, 0)).toISOString(),
        color: '#f97316'
      },
      {
        event_id: 'demo-14',
        title: 'Edit Collaboration Clip with Adobe E...',
        event_type: 'task',
        start_time: new Date(addDays(startOfCurrentWeek, 3).setHours(14, 30, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 3).setHours(15, 30, 0)).toISOString(),
        color: '#3b82f6'
      },
      {
        event_id: 'demo-15',
        title: 'Team brainstorm - Notion board for May Campaigns',
        event_type: 'meeting',
        start_time: new Date(addDays(startOfCurrentWeek, 4).setHours(15, 0, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 4).setHours(18, 0, 0)).toISOString(),
        color: '#8b5cf6'
      },
      {
        event_id: 'demo-16',
        title: 'Follow-up messa...',
        event_type: 'meeting',
        start_time: new Date(addDays(startOfCurrentWeek, 4).setHours(12, 30, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 4).setHours(13, 30, 0)).toISOString(),
        color: '#8b5cf6'
      },
      {
        event_id: 'demo-17',
        title: 'Send Welcome Kit Unboxing photos...',
        event_type: 'task',
        start_time: new Date(addDays(startOfCurrentWeek, 4).setHours(17, 30, 0)).toISOString(),
        end_time: new Date(addDays(startOfCurrentWeek, 4).setHours(18, 30, 0)).toISOString(),
        color: '#f97316'
      }
    ];

    return demoEvents;
  }, [calendarEvents, currentDate]);

  if (!mounted) return null;

  // Week configuration helper
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Navigation handlers
  const handlePrev = () => {
    if (view === 'day') setCurrentDate(addDays(currentDate, -1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, -1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    if (view === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  // Lead suggestions filter
  const filteredLeads = leads.filter(l => 
    l.full_name?.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
    l.email?.toLowerCase().includes(leadSearchQuery.toLowerCase())
  );

  // Add event helper
  const handleOpenAddEvent = (initialDate = new Date(), time = '09:00') => {
    setSelectedEvent(null);
    setEventTitle('');
    setEventType('meeting');
    setEventDate(format(initialDate, 'yyyy-MM-dd'));
    setEventStartTime(time);
    
    // Default duration: 1 hour
    const [hours, minutes] = time.split(':').map(Number);
    const endH = hours + 1;
    const endStr = `${String(endH).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    setEventEndTime(endStr);
    
    setEventColor('#3b82f6');
    setEventDescription('');
    setEventLocation('');
    setSelectedLeadId('');
    setLeadSearchQuery('');
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (evt) => {
    setSelectedEvent(evt);
    setEventTitle(evt.title);
    setEventType(evt.event_type || 'meeting');
    
    const start = new Date(evt.start_time);
    const end = new Date(evt.end_time);
    
    setEventDate(format(start, 'yyyy-MM-dd'));
    setEventStartTime(format(start, 'HH:mm'));
    setEventEndTime(format(end, 'HH:mm'));
    setEventColor(evt.color || '#3b82f6');
    setEventDescription(evt.description || '');
    setEventLocation(evt.location || '');
    setSelectedLeadId(evt.lead_id || '');
    
    if (evt.lead) {
      setLeadSearchQuery(evt.lead.full_name);
    } else {
      setLeadSearchQuery('');
    }
    
    setIsEventModalOpen(true);
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const startDateTime = new Date(`${eventDate}T${eventStartTime}:00`).toISOString();
    const endDateTime = new Date(`${eventDate}T${eventEndTime}:00`).toISOString();

    const payload = {
      title: eventTitle,
      event_type: eventType,
      start_time: startDateTime,
      end_time: endDateTime,
      color: eventColor,
      description: eventDescription,
      location: eventLocation,
      lead_id: selectedLeadId || null
    };

    if (selectedEvent && !selectedEvent.event_id.startsWith('demo-')) {
      await updateCalendarEvent(selectedEvent.event_id, payload);
    } else {
      await addCalendarEvent(payload);
    }

    setIsEventModalOpen(false);
  };

  const handleDelete = async () => {
    if (selectedEvent && !selectedEvent.event_id.startsWith('demo-')) {
      await deleteCalendarEvent(selectedEvent.event_id);
    }
    setIsEventModalOpen(false);
  };

  // Add lead helper
  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!leadName.trim()) return;

    try {
      const res = await fetch("/other-modules/crm/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: leadName,
          email: leadEmail,
          phone: leadPhone,
          lead_source: leadSource,
          lead_category: leadCategory,
          lead_type: leadType,
          lead_status: leadStatus,
          priority: leadPriority
        })
      });

      if (res.ok) {
        const { lead } = await res.json();
        if (lead) {
          // Select newly created lead
          setSelectedLeadId(lead.lead_id);
          setLeadSearchQuery(lead.full_name);
          refreshCrmData();
        }
      }
    } catch (err) {
      console.error("Error creating inline lead:", err);
    }

    setIsLeadModalOpen(false);
    // Reset lead fields
    setLeadName('');
    setLeadEmail('');
    setLeadPhone('');
  };

  // Time positioning calculations for Time Grid View
  const getEventPosition = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    
    const startHour = 7; // We start grid at 7 AM
    const hourHeight = 60; // 60px per hour
    
    const startMinutes = (s.getHours() - startHour) * 60 + s.getMinutes();
    const endMinutes = (e.getHours() - startHour) * 60 + e.getMinutes();
    
    const top = (startMinutes / 60) * hourHeight;
    const height = Math.max(((endMinutes - startMinutes) / 60) * hourHeight, 25);
    
    return { top: `${top}px`, height: `${height}px` };
  };

  // Color helper matching the color-coded UI theme
  const getEventColorStyles = (hexColor) => {
    const match = PRESET_COLORS.find(c => c.hex === hexColor);
    return match || { bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-400 text-slate-700 dark:text-slate-200', hex: hexColor };
  };

  // Render Time Slots (7 AM to 9 PM)
  const timeSlots = [];
  for (let i = 7; i <= 21; i++) {
    const displayHour = i > 12 ? `${i - 12} PM` : i === 12 ? '12 PM' : `${i} AM`;
    timeSlots.push({ value: i, label: displayHour });
  }

  // Filter events matching active calendar dates
  const getEventsForDay = (date) => {
    return events.filter(e => isSameDay(new Date(e.start_time), date));
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 overflow-hidden font-sans">
      
      {/* Main Calendar View Left Panel */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        
        {/* Top Header / View Controller */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Calendar</h1>
          
          {/* Day / Week / Month Switch Mode */}
          <div className="crm-view-toggle">
            <button 
              className={view === 'day' ? 'active' : ''} 
              onClick={() => setView('day')}
            >
              Day
            </button>
            <button 
              className={view === 'week' ? 'active' : ''} 
              onClick={() => setView('week')}
            >
              Week
            </button>
            <button 
              className={view === 'month' ? 'active' : ''} 
              onClick={() => setView('month')}
            >
              Month
            </button>
          </div>

          {/* Switch Month Navigator */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button onClick={handlePrev} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-lg text-slate-500 dark:text-slate-400">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-350 select-none min-w-[90px] text-center">
              {format(currentDate, view === 'month' ? 'MMMM yyyy' : 'MMMM d, yyyy')}
            </span>
            <button onClick={handleNext} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-lg text-slate-500 dark:text-slate-400">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Calendar Body */}
        <div className="flex-1 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          
          {/* Calendar Header Row */}
          {view === 'week' && (
            <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
              <div className="border-r border-slate-150 dark:border-slate-800" />
              {weekDays.map((day, idx) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div 
                    key={idx} 
                    className={`crm-day-header ${isToday ? 'crm-day-header-today bg-blue-50/30 dark:bg-blue-900/5' : ''}`}
                  >
                    <div className="crm-day-header-name">{format(day, 'EEE')}</div>
                    <div className="crm-day-header-number">{format(day, 'd')}</div>
                  </div>
                );
              })}
            </div>
          )}

          {view === 'day' && (
            <div className="grid grid-cols-[60px_1fr] border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
              <div className="border-r border-slate-150 dark:border-slate-800" />
              <div className="crm-day-header crm-day-header-today">
                <div className="crm-day-header-name">{format(currentDate, 'EEEE')}</div>
                <div className="crm-day-header-number">{format(currentDate, 'd')}</div>
              </div>
            </div>
          )}

          {/* Time Scroll Grid View */}
          {(view === 'week' || view === 'day') && (
            <div className="flex-1 overflow-y-auto crm-calendar-scroll relative">
              <div className={`crm-calendar-grid ${view === 'day' ? 'crm-calendar-grid-day' : 'crm-calendar-grid-week'}`}>
                
                {/* Time Indicator Column */}
                <div className="relative">
                  {timeSlots.map((slot) => (
                    <div key={slot.value} className="crm-time-label">
                      {slot.label}
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {(view === 'week' ? weekDays : [currentDate]).map((day, dayIdx) => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div 
                      key={dayIdx} 
                      className={`crm-day-column ${isToday ? 'crm-day-today' : ''}`}
                      style={{ height: `${timeSlots.length * 60}px` }}
                      onDoubleClick={(e) => {
                        // Estimate clicked time slot
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickY = e.clientY - rect.top;
                        const clickedHour = 7 + Math.floor(clickY / 60);
                        const timeStr = `${String(clickedHour).padStart(2, '0')}:00`;
                        handleOpenAddEvent(day, timeStr);
                      }}
                    >
                      {/* Event Cards inside column */}
                      {dayEvents.map((evt) => {
                        const pos = getEventPosition(evt.start_time, evt.end_time);
                        const styles = getEventColorStyles(evt.color);
                        
                        return (
                          <div
                            key={evt.event_id}
                            className={`crm-event-block ${styles.bg} ${styles.border}`}
                            style={{ top: pos.top, height: pos.height }}
                            onClick={() => handleOpenEditEvent(evt)}
                          >
                            <div className="event-time">
                              {format(new Date(evt.start_time), 'h:mm a')}
                            </div>
                            <div className="event-title">{evt.title}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Month View Grid */}
          {view === 'month' && (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="text-center py-2 text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider border-r border-slate-150 dark:border-slate-800 last:border-0">
                    {d}
                  </div>
                ))}
              </div>
              <div className="crm-month-grid">
                {(() => {
                  const monthStart = startOfMonth(currentDate);
                  const monthEnd = endOfMonth(monthStart);
                  
                  // Adjust monthStart to start of week (Monday)
                  const startDay = startOfWeek(monthStart, { weekStartsOn: 1 });
                  const endDay = addDays(startOfWeek(monthEnd, { weekStartsOn: 1 }), 6);
                  
                  const daysInInterval = eachDayOfInterval({ start: startDay, end: endDay });
                  
                  return daysInInterval.map((day, idx) => {
                    const isToday = isSameDay(day, new Date());
                    const isOtherMonth = day.getMonth() !== currentDate.getMonth();
                    const dayEvents = getEventsForDay(day);
                    
                    return (
                      <div 
                        key={idx} 
                        className={`crm-month-cell ${isToday ? 'crm-month-cell-today' : ''} ${isOtherMonth ? 'crm-month-cell-other' : ''}`}
                        onDoubleClick={() => handleOpenAddEvent(day)}
                      >
                        <div className="crm-month-cell-date">{format(day, 'd')}</div>
                        <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-[80px]">
                          {dayEvents.slice(0, 3).map(evt => {
                            const styles = getEventColorStyles(evt.color);
                            return (
                              <div 
                                key={evt.event_id} 
                                className={`crm-month-event-chip text-[10px] ${styles.bg} ${styles.border} border-l-2`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditEvent(evt);
                                }}
                              >
                                {evt.title}
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div className="text-[9px] text-slate-500 font-bold px-1.5">
                              + {dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Right Column Panel */}
      <div className="w-[380px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 flex flex-col gap-6 overflow-y-auto shrink-0 select-none">
        
        {/* Today's Activities Card */}
        <div className="bg-slate-50 dark:bg-slate-850 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-250 text-[15px]">Today's Activities</h3>
            <span className="text-[11px] font-bold text-slate-450 uppercase tracking-wide">
              {format(new Date(), 'MMM d, yyyy')}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {getEventsForDay(new Date()).length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-450 dark:text-slate-500 font-medium">
                No events scheduled for today
              </div>
            ) : (
              getEventsForDay(new Date()).map(evt => {
                const styles = getEventColorStyles(evt.color);
                return (
                  <div 
                    key={evt.event_id}
                    className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-750 shadow-sm cursor-pointer hover:border-slate-250 dark:hover:border-slate-700 transition-all"
                    onClick={() => handleOpenEditEvent(evt)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: evt.color }} />
                      <div>
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                          {evt.title}
                        </div>
                        <div className="text-xs text-slate-450 font-medium mt-1">
                          {format(new Date(evt.start_time), 'h:mm a')} - {format(new Date(evt.end_time), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                    {/* Event Type Platform Logos presets */}
                    <div className="flex items-center gap-1 text-slate-400">
                      {evt.title.toLowerCase().includes('tiktok') && <span className="bg-slate-100 dark:bg-slate-700 p-1.5 rounded-lg text-black dark:text-white font-black text-[10px]">🎵</span>}
                      {evt.title.toLowerCase().includes('instagram') && <Instagram size={16} className="text-pink-500" />}
                      {evt.title.toLowerCase().includes('zoom') && <Video size={16} className="text-blue-500" />}
                      {evt.title.toLowerCase().includes('youtube') && <Youtube size={16} className="text-red-500" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Mini Upcoming To-Do & Campaign status matches reference */}
        <div className="flex flex-col gap-4">
          
          {/* Instagram Post approval banner */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-start gap-3">
            <span className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-lg text-pink-500">
              <Instagram size={18} />
            </span>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Instagram for Fenty</span>
                <span className="text-[10px] text-slate-400">now</span>
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-350 mt-1 leading-snug">
                Caption needs final approval from client
              </p>
            </div>
          </div>

          {/* Brainstorm details card matching screenshot */}
          <div className="bg-white dark:bg-slate-800 border border-slate-250/70 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-xl text-xs font-bold leading-none">
                BAGGU
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 leading-snug">
                  Brainstorm —Baggu Campaign...
                </h4>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 text-slate-500 dark:text-slate-400 text-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-slate-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-350">Wednesday, May 24</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                <span className="font-medium">1:00 AM - 4:00 AM</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-slate-400" />
                <a href="#" className="font-semibold text-blue-500 hover:underline flex items-center gap-1">
                  brief-baggu.pdf
                  <FileDown size={14} />
                </a>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-750 pt-3 mt-1">
              <div className="flex items-center justify-between text-xs text-slate-450 mb-2 font-bold uppercase tracking-wider">
                <span>3 participants</span>
                <span className="rotate-180 cursor-pointer">▲</span>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { name: 'Ralph Edwards', email: 're@gmail.com', status: 'yes' },
                  { name: 'Jenny Wilson', email: 'jw@gmail.com', status: 'yes' },
                  { name: 'Kristin Watson', email: 'kw@gmail.com', status: 'pending' }
                ].map((user, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-300">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{user.name}</span>
                    </div>
                    {user.status === 'yes' ? (
                      <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 p-1 rounded-full"><CheckCircle size={14} /></span>
                    ) : (
                      <span className="text-slate-400 bg-slate-50 dark:bg-slate-800 p-1 rounded-full"><AlertCircle size={14} /></span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick task status banners */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-start gap-3">
            <span className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg text-red-500">
              <Youtube size={18} />
            </span>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">YOUTUBE FOR GYMSHARK</span>
                <span className="text-[10px] text-slate-400">in 1 hour</span>
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-350 mt-1 leading-snug">
                Upload thumbnail before 5PM
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-start gap-3">
            <span className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg text-black dark:text-white font-bold text-xs">
              🎵
            </span>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">PITCH FOR BAGGU</span>
                <span className="text-[10px] text-slate-400">1 hour ago</span>
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-350 mt-1 leading-snug">
                Draft review pending — record alt version.
              </p>
            </div>
          </div>

        </div>

        {/* Primary Plus Button at the bottom of panel to open event booker */}
        <button 
          onClick={() => handleOpenAddEvent(new Date())}
          className="w-full bg-[#6057DA] hover:bg-[#5046c8] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-indigo-500/20 active:translate-y-[1px] transition-all flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Book Calendar Event
        </button>

      </div>

      {/* Booking Calendar Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-250 dark:border-slate-850 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-850 dark:text-white">
                {selectedEvent ? 'Edit Calendar Event' : 'Book Calendar Event'}
              </h3>
              <button 
                onClick={() => setIsEventModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitEvent} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-200px)]">
              
              {/* Event Title */}
              <div>
                <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Event Title *
                </label>
                <input 
                  type="text" 
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. ZARA Campaign Shoot" 
                  required
                  className="w-full border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                />
              </div>

              {/* Event Type & Color Preset */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Event Type
                  </label>
                  <select 
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="call">Call</option>
                    <option value="task">Task</option>
                    <option value="reminder">Reminder</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Color Coding
                  </label>
                  <div className="flex gap-2 items-center py-2">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setEventColor(c.hex)}
                        className={`w-6 h-6 rounded-full border transition-all ${eventColor === c.hex ? 'scale-115 ring-2 ring-indigo-500/40 border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Date & Time selectors */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input 
                    type="date" 
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                    className="w-full border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-850 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Start Time
                  </label>
                  <input 
                    type="time" 
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    required
                    className="w-full border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-850 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                    End Time
                  </label>
                  <input 
                    type="time" 
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    required
                    className="w-full border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-850 dark:text-white"
                  />
                </div>
              </div>

              {/* Lead Link Selector & Quick Add Lead */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                    Link CRM Lead (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsLeadModalOpen(true)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-0.5"
                  >
                    <Plus size={10} /> Add Lead
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search and link lead..."
                    value={leadSearchQuery}
                    onChange={(e) => {
                      setLeadSearchQuery(e.target.value);
                      setShowLeadSuggestions(true);
                      if (!e.target.value) setSelectedLeadId('');
                    }}
                    onFocus={() => setShowLeadSuggestions(true)}
                    className="w-full border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                  />
                  <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
                
                {showLeadSuggestions && leadSearchQuery && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                    {filteredLeads.length === 0 ? (
                      <div className="p-3 text-xs text-slate-450 text-center">No leads found</div>
                    ) : (
                      filteredLeads.map(l => (
                        <div
                          key={l.lead_id}
                          onClick={() => {
                            setSelectedLeadId(l.lead_id);
                            setLeadSearchQuery(l.full_name);
                            setShowLeadSuggestions(false);
                          }}
                          className="px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer text-slate-750 dark:text-slate-250 flex flex-col"
                        >
                          <span className="font-semibold">{l.full_name}</span>
                          <span className="text-xs text-slate-400 mt-0.5">{l.email || l.phone}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Location & Link */}
              <div>
                <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Location / Meeting Link
                </label>
                <input 
                  type="text" 
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="e.g. Zoom link or conference room"
                  className="w-full border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Description / Agenda
                </label>
                <textarea 
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Enter details about this meeting/task..."
                  rows={3}
                  className="w-full border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                <div>
                  {selectedEvent && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 size={14} /> Delete Event
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#6057DA] hover:bg-[#5046c8] text-white rounded-xl font-bold text-xs shadow-md transition-colors"
                  >
                    {selectedEvent ? 'Update Event' : 'Book Event'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Inline Quick Add Lead Modal */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-250 dark:border-slate-850 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/10">
              <h3 className="text-md font-bold text-slate-850 dark:text-white">
                Quick Add CRM Lead
              </h3>
              <button 
                onClick={() => setIsLeadModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddLead} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div>
                <label className="block text-xs font-bold text-slate-455 mb-1 uppercase">Full Name *</label>
                <input 
                  type="text" 
                  value={leadName} 
                  onChange={(e) => setLeadName(e.target.value)} 
                  required
                  placeholder="e.g. Kristin Watson"
                  className="w-full border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-455 mb-1 uppercase">Email Address</label>
                <input 
                  type="email" 
                  value={leadEmail} 
                  onChange={(e) => setLeadEmail(e.target.value)} 
                  placeholder="e.g. kristin@watson.com"
                  className="w-full border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-455 mb-1 uppercase">Phone Number</label>
                <input 
                  type="tel" 
                  value={leadPhone} 
                  onChange={(e) => setLeadPhone(e.target.value)} 
                  placeholder="e.g. +1 555-019-2834"
                  className="w-full border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-455 mb-1 uppercase font-semibold">Priority</label>
                  <select 
                    value={leadPriority} 
                    onChange={(e) => setLeadPriority(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-850 dark:text-white"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-455 mb-1 uppercase font-semibold">Status</label>
                  <select 
                    value={leadStatus} 
                    onChange={(e) => setLeadStatus(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 text-sm focus:outline-none text-slate-850 dark:text-white"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Nurturing">Nurturing</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsLeadModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-md"
                >
                  Add & Select
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
