"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCrm } from '../context/CrmContext';
import MOCK_DATA from '../data/mockData.json';
import { Zap, Play, Pause, Trash2, Edit3, Plus, X, Save } from 'lucide-react';

export default function EmailTriggersPage() {
  const { currentUser, permissions } = useCrm();
  const router = useRouter();
  const [triggers, setTriggers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTriggers();
  }, []);

  const fetchTriggers = async () => {
    try {
      const res = await fetch('/other-modules/crm/api/triggers');
      const data = await res.json();
      if (data.triggers) setTriggers(data.triggers);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!permissions.canManageEmailTemplates) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-8 text-center transition-colors">
        <div className="max-w-md bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-red-200 dark:border-red-900/50">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">!</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Your role (<span className="uppercase font-bold">{currentUser.role}</span>) does not have authorization to view or edit email automation triggers. Administrator access required.
          </p>
          <button 
            onClick={() => router.push('/other-modules/crm/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition"
          >
            Acknowledge
          </button>
        </div>
      </div>
    );
  }

  const handleAddTrigger = async () => {
    const newTrigger = {
      name: "New Custom Automation",
      event: "Manual Invoice Paid",
      condition_expression: "Value > $5,000",
      template_id: 602,
      status: "Paused"
    };
    try {
      const res = await fetch('/other-modules/crm/api/triggers', { method: 'POST', body: JSON.stringify(newTrigger) });
      const data = await res.json();
      if (data.trigger) setTriggers([data.trigger, ...triggers]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/other-modules/crm/api/triggers?id=${id}`, { method: 'DELETE' });
      setTriggers(triggers.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (trigger) => {
    setEditingId(trigger.id);
    setEditData({
      id: trigger.id,
      name: trigger.name,
      event: trigger.event,
      condition_expression: trigger.condition_expression || trigger.condition,
      template_id: trigger.template_id || trigger.templateId,
      status: trigger.status
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (id) => {
    try {
      const res = await fetch('/other-modules/crm/api/triggers', { method: 'PUT', body: JSON.stringify(editData) });
      const data = await res.json();
      if (data.trigger) {
        setTriggers(triggers.map(t => t.id === id ? data.trigger : t));
      }
    } catch (err) {
      console.error(err);
    }
    setEditingId(null);
    setEditData({});
  };

  const getTemplateName = (id) => {
    return MOCK_DATA.email_templates.find(t => t.id === id)?.name || "Unknown Template";
  };

  return (
    <div className="p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300 h-full overflow-y-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold dark:text-white mb-2">Email Triggers</h1>
          <p className="text-slate-500 dark:text-slate-400">Automate your communication workflow mapped to Lead pipeline events.</p>
        </div>
        <button onClick={handleAddTrigger} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md font-medium transition shadow flex items-center text-sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Trigger
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-x-auto transition-colors duration-300">
        <div className="flex items-center space-x-3 mb-6">
           <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg">
              <Zap className="w-6 h-6" />
           </div>
           <h2 className="text-xl font-bold dark:text-white">Active Automations</h2>
        </div>
        
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm">
              <th className="py-3 px-4 font-semibold text-sm">Trigger Name</th>
              <th className="py-3 px-4 font-semibold text-sm">Event Hook</th>
              <th className="py-3 px-4 font-semibold text-sm">Condition</th>
              <th className="py-3 px-4 font-semibold text-sm">Template Mapped</th>
              <th className="py-3 px-4 font-semibold text-sm">Status</th>
              <th className="py-3 px-4 font-semibold text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {triggers.map(trigger => (
              <tr key={trigger.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                {editingId === trigger.id ? (
                  <>
                    <td className="py-2 px-3">
                      <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full border border-blue-400 dark:border-blue-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="py-2 px-3">
                      <select value={editData.event} onChange={e => setEditData({...editData, event: e.target.value})} className="w-full border border-blue-400 dark:border-blue-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none">
                        <option value="Lead Created">Lead Created</option>
                        <option value="Lead Status Changed to 'Contacted'">Status → Contacted</option>
                        <option value="Lead Status Changed to 'Qualified'">Status → Qualified</option>
                        <option value="Lead Status Changed to 'Won'">Status → Won</option>
                        <option value="Manual Invoice Paid">Invoice Paid</option>
                        <option value="Task Completed">Task Completed</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input type="text" value={editData.condition_expression} onChange={e => setEditData({...editData, condition_expression: e.target.value})} className="w-full border border-blue-400 dark:border-blue-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="py-2 px-3">
                      <select value={editData.template_id} onChange={e => setEditData({...editData, template_id: parseInt(e.target.value)})} className="w-full border border-blue-400 dark:border-blue-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none">
                        {MOCK_DATA.email_templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})} className="w-full border border-blue-400 dark:border-blue-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none">
                        <option value="Active">Active</option>
                        <option value="Paused">Paused</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-right space-x-1">
                      <button onClick={() => saveEdit(trigger.id)} className="text-green-500 hover:text-green-600 transition px-1.5 py-1 bg-green-50 dark:bg-green-900/20 rounded" title="Save">
                        <Save className="w-4 h-4 inline" />
                      </button>
                      <button onClick={cancelEdit} className="text-slate-400 hover:text-red-500 transition px-1.5 py-1 bg-slate-50 dark:bg-slate-700 rounded" title="Cancel">
                        <X className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{trigger.name}</td>
                    <td className="py-3 px-4 text-sm text-yellow-600 dark:text-yellow-400 font-semibold">{trigger.event}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                      <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">{trigger.condition_expression || trigger.condition}</span>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">{getTemplateName(trigger.template_id || trigger.templateId)}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded font-medium text-xs flex w-fit items-center ${trigger.status === "Active" ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                        {trigger.status === "Active" ? <Play className="w-3 h-3 mr-1" /> : <Pause className="w-3 h-3 mr-1" />}
                        {trigger.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                       <button onClick={() => startEdit(trigger)} className="text-slate-400 hover:text-blue-500 transition px-2" title="Edit"><Edit3 className="w-4 h-4 inline" /></button>
                       <button onClick={() => handleDelete(trigger.id)} className="text-slate-400 hover:text-red-500 transition px-2" title="Delete"><Trash2 className="w-4 h-4 inline" /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
