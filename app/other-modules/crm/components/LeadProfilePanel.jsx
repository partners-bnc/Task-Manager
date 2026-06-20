"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCrm, MOCK_USERS } from '../context/CrmContext';
import { 
  X, Briefcase, Mail, Phone, Calendar, Clock, 
  Activity, MessageSquareCode, Send, Target, 
  CheckCircle, Plus
} from 'lucide-react';

export default function LeadProfilePanel({ isOpen, onClose, leadData, onSave }) {
  const { activities, addActivity, followups, campaigns, enrollLead, currentUser } = useCrm();
  const [formData, setFormData] = useState({});
  const [newNote, setNewNote] = useState("");
  const panelRef = useRef(null);

  useEffect(() => {
    if (leadData) {
      setFormData({ ...leadData });
    }
  }, [leadData]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen || !leadData) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Check if status changed to log activity automatically
    if (leadData.status !== formData.status) {
      addActivity({
        id: `ACT-${Date.now()}`,
        type: "status changed",
        date: new Date().toISOString().split('T')[0],
        subject: "Lead Status Updated",
        description: `Status changed from ${leadData.status} to ${formData.status}`,
        outcome: formData.status === "Won" ? "Positive" : "Neutral",
        duration: "-",
        assigneeId: currentUser.id,
        leadId: leadData.id
      });
    }

    // Check enrollment
    if (formData.enrollCampaignId && formData.enrollCampaignId !== 'None') {
      enrollLead(leadData.id, formData.enrollCampaignId);
      addActivity({
        id: `ACT-${Date.now()}-enr`,
        type: "system",
        date: new Date().toISOString().split('T')[0],
        subject: "Enrolled in Sequence",
        description: `Enrolled in campaign ${formData.enrollCampaignId}`,
        outcome: "Neutral",
        duration: "-",
        assigneeId: currentUser.id,
        leadId: leadData.id
      });
      delete formData.enrollCampaignId;
    }

    onSave(formData);
    onClose();
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addActivity({
      id: `ACT-NOTE-${Date.now()}`,
      type: "admin note added",
      date: new Date().toISOString().split('T')[0],
      subject: "Manual Note",
      description: newNote,
      outcome: "Neutral",
      duration: "-",
      assigneeId: currentUser.id,
      leadId: leadData.id
    });
    setNewNote("");
  };

  const leadActivities = activities.filter(a => a.leadId === leadData.id).sort((a,b) => new Date(b.date) - new Date(a.date));
  const leadFollowups = followups.filter(f => f.leadId === leadData.id && f.status !== 'Completed');

  const getStatusColor = (s) => {
    switch(s) {
      case 'New': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
      case 'Contacted': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400';
      case 'Qualified': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400';
      case 'Won': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
      case 'Lost': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div 
        ref={panelRef}
        className="w-full max-w-4xl bg-slate-50 dark:bg-slate-900 h-full shadow-2xl flex flex-col transform transition-transform border-l border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{formData.company}</h2>
              <span className={`px-2.5 py-1 text-xs font-bold rounded uppercase tracking-wider ${getStatusColor(formData.status)}`}>
                {formData.status}
              </span>
              <span className={`px-2.5 py-1 text-xs font-bold rounded uppercase tracking-wider border ${formData.priority === 'High' ? 'border-red-200 text-red-600 dark:border-red-900 dark:text-red-400 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}>
                {formData.priority} Priority
              </span>
            </div>
            <div className="text-sm font-medium text-slate-500 flex items-center space-x-4">
              <span className="flex items-center"><Briefcase className="w-4 h-4 mr-1.5" /> {formData.contact}</span>
              <span className="flex items-center"><Target className="w-4 h-4 mr-1.5 text-emerald-500" /> {formData.value}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
             <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition shadow-sm text-sm">
               Save Changes
             </button>
             <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 rounded-full transition">
               <X className="w-6 h-6" />
             </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          
          {/* Left Column: Editable Details */}
          <div className="w-full md:w-[40%] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 space-y-6">
            
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Lead Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Company</label>
                  <input type="text" name="company" value={formData.company || ''} onChange={handleChange} className="w-full border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Name</label>
                  <input type="text" name="contact" value={formData.contact || ''} onChange={handleChange} className="w-full border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Estimated Value</label>
                  <input type="text" name="value" value={formData.value || ''} onChange={handleChange} className="w-full border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Pipeline Status</label>
                    <select name="status" value={formData.status || ''} onChange={handleChange} className="w-full border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500">
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Won">Won</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Priority</label>
                    <select name="priority" value={formData.priority || ''} onChange={handleChange} className="w-full border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500">
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Source</label>
                  <select name="source" value={formData.source || ''} onChange={handleChange} className="w-full border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500">
                    <option value="Service Enquiry">Service Enquiry</option>
                    <option value="Expert Request">Expert Request</option>
                    <option value="Voice Requirement">Voice Requirement</option>
                    <option value="Partner Registration">Partner Registration</option>
                    <option value="Contact Form">Contact Form</option>
                    <option value="Import">Import</option>
                  </select>
                </div>
                
                {campaigns && (
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide flex items-center">
                      <Send className="w-3 h-3 mr-1" /> Automation
                    </label>
                    <select name="enrollCampaignId" value={formData.enrollCampaignId || 'None'} onChange={handleChange} className="w-full border border-blue-200 dark:border-blue-900/50 rounded-md px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 focus:outline-none focus:border-blue-500 font-medium">
                      <option value="None">-- Enroll in Email Sequence --</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Active Followups Box */}
            <div className="mt-8">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
                <MessageSquareCode className="w-4 h-4 mr-2 text-amber-500" /> Pending Action Items
              </h3>
              {leadFollowups.length > 0 ? (
                <div className="space-y-3">
                  {leadFollowups.map(fwp => (
                    <div key={fwp.id} className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-amber-100">{fwp.title}</h4>
                      <div className="flex items-center text-xs text-slate-600 dark:text-amber-200/70 mt-1">
                        <Clock className="w-3 h-3 mr-1" /> Due: {fwp.dueDate} {fwp.dueTime}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-center">
                  <p className="text-sm text-slate-500">No active follow-ups.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Timeline & Notes */}
          <div className="w-full md:w-[60%] bg-slate-50 dark:bg-slate-950 p-6 flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider flex items-center">
              <Activity className="w-4 h-4 mr-2 text-blue-500" /> Activity Timeline
            </h3>
            
            {/* Note Input */}
            <div className="mb-6 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center shrink-0 text-xs font-bold">
                {currentUser.name.substring(0,2).toUpperCase()}
              </div>
              <div className="flex-1 flex flex-col items-end">
                <textarea 
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Log a call, meeting, or internal note..."
                  className="w-full bg-transparent text-sm resize-none focus:outline-none h-16 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                />
                <button onClick={handleAddNote} disabled={!newNote.trim()} className="mt-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 px-4 py-1.5 rounded-md text-xs font-bold disabled:opacity-50 transition">
                  Log Note
                </button>
              </div>
            </div>

            {/* Timeline Feed */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 relative before:absolute before:inset-0 before:ml-[1.4rem] before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {leadActivities.length > 0 ? leadActivities.map((act, i) => (
                <div key={act.id} className="relative flex items-start gap-4 z-10">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center border-4 border-slate-50 dark:border-slate-950 shrink-0 shadow-sm ${act.type.includes('note') ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400' : act.type.includes('email') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : act.type.includes('status') ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                    {act.type.includes('note') ? <MessageSquareCode className="w-4 h-4" /> : act.type.includes('email') ? <Mail className="w-4 h-4" /> : act.type.includes('status') ? <CheckCircle className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl shadow-sm mt-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{act.subject}</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(act.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{act.description}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-50 dark:border-slate-800/50 pt-2">
                       <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center">
                         By {MOCK_USERS[Object.keys(MOCK_USERS).find(k => MOCK_USERS[k].id === act.assigneeId)]?.name || 'System'}
                       </span>
                       <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${act.outcome === 'Positive' ? 'bg-green-100 text-green-700' : act.outcome === 'Negative' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                         {act.outcome}
                       </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 text-slate-400 z-10 relative">No activities logged yet.</div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
