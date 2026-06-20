"use client";

import React from 'react';
import { useCrm, MOCK_USERS } from '../context/CrmContext';

const COLUMNS = ['New', 'Contacted', 'Qualified', 'Won'];

export default function KanbanBoard({ leads, setLeads, onLeadClick }) {
  const { currentUser, permissions } = useCrm();

  const handleDragStart = (e, leadId) => {
    e.dataTransfer.setData("leadId", leadId.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // necessary to allow dropping
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    if (permissions.isReadOnly) return;

    const leadId = parseInt(e.dataTransfer.getData("leadId"));
    if (!leadId) return;

    setLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId ? { ...lead, status: targetStatus } : lead
      )
    );
  };

  const getUserName = (id) => {
    const user = Object.values(MOCK_USERS).find(u => u.id === id);
    return user ? user.name : "Unassigned";
  };

  return (
    <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300">
      <h2 className="text-xl font-bold dark:text-white mb-6">Pipeline Kanban</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(status => {
          const columnLeads = leads.filter(l => l.status === status);
          
          return (
            <div 
              key={status}
              className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 shadow-inner border border-slate-100 dark:border-slate-800 min-h-[400px] flex flex-col transition-colors duration-300"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-300">{status}</h3>
                <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-full">
                  {columnLeads.length}
                </span>
              </div>
              
              <div className="flex-1 flex flex-col space-y-3">
                {columnLeads.map(lead => {
                  const isOwner = lead.assigneeId === currentUser.id;
                  const canDrag = !permissions.isReadOnly;

                  return (
                    <div
                      key={lead.id}
                      draggable={canDrag}
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onClick={(e) => { e.stopPropagation(); onLeadClick?.(lead); }}
                      className={`bg-white dark:bg-slate-800 p-4 rounded shadow-sm border border-slate-200 dark:border-slate-700 relative transition hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 ${
                        canDrag ? 'cursor-pointer active:cursor-grabbing' : 'cursor-pointer opacity-90'
                      }`}
                    >
                      <div className="font-bold text-slate-800 dark:text-white mb-1 transition-colors">
                        {lead.company}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 truncate">
                        {lead.contact}
                      </div>
                      <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        <span className="font-bold text-sm text-green-600 dark:text-green-400">{lead.value}</span>
                        <div 
                          className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 relative"
                          title={getUserName(lead.assigneeId)}
                        >
                          {getUserName(lead.assigneeId).substring(0,2).toUpperCase()}
                          {isOwner && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 border border-white dark:border-slate-800 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {columnLeads.length === 0 && (
                  <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg h-32 flex items-center justify-center">
                    Drop leads here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
