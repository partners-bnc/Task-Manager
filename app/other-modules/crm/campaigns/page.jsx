"use client";

import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import { useToast } from '../context/ToastContext';
import { Play, Pause, Trash2, Plus, Clock, Mail, Users, Settings } from 'lucide-react';
import GenericEditModal from '../components/GenericEditModal';

export default function CampaignsPage() {
  const { campaigns, enrollments, addCampaign, updateCampaign, deleteCampaign, leads, addActivity } = useCrm();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (updatedCampaign) => {
    updateCampaign(updatedCampaign.id, updatedCampaign);
  };

  const toggleStatus = (campaign) => {
    updateCampaign(campaign.id, { status: campaign.status === 'Active' ? 'Paused' : 'Active' });
  };

  // Processing Simulator
  const [isProcessing, setIsProcessing] = useState(false);
  
  const processSimulate = () => {
    setIsProcessing(true);
    setTimeout(() => {
      let activitiesGenerated = 0;
      enrollments.forEach(enr => {
        if (enr.status === "Active") {
          const camp = campaigns.find(c => c.id === enr.campaignId);
          if (camp && camp.status === "Active") {
            const currentStepDef = camp.steps.find(s => s.stepNumber === enr.currentStep);
            if (currentStepDef) {
              // Simulate sending email
              addActivity({
                id: `ACT-CMP-${Date.now()}-${activitiesGenerated}`,
                type: "email sent",
                date: new Date().toISOString().split('T')[0],
                subject: `Campaign: ${camp.name} (Step ${enr.currentStep})`,
                description: `Automated email sent via template: ${currentStepDef.templateId}`,
                outcome: "Positive",
                duration: "-",
                assigneeId: "system",
                leadId: enr.leadId
              });
              activitiesGenerated++;
            }
          }
        }
      });
      toast.success(`Simulation Complete: Triggered ${activitiesGenerated} automated emails.`);
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <div className="p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-white flex items-center">
            <Mail className="w-8 h-8 mr-3 text-blue-600 dark:text-blue-400" />
            Email Sequences (Campaigns)
          </h1>
          <p className="text-slate-500 mt-2">Automate multi-stage email drip flows for leads and partners.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={processSimulate} 
            disabled={isProcessing}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition shadow-sm text-sm flex items-center disabled:opacity-50"
          >
            {isProcessing ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Simulate Cron Processor
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition shadow-sm text-sm flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" /> New Sequence
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map(camp => (
          <div key={camp.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{camp.name}</h3>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wide flex items-center mt-1">
                  <Users className="w-3 h-3 mr-1" /> Target: {camp.targetAudience}
                </span>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold ${camp.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                {camp.status}
              </span>
            </div>
            
            <div className="flex-1 mt-2">
              <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">Sequence Steps</h4>
              <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {camp.steps.map((step, idx) => (
                  <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-slate-300 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow flex-col text-[10px] font-bold z-10">
                      {step.stepNumber}
                    </div>
                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shadow-sm ml-4 md:ml-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Wait {step.delayDays} day(s)</span>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">{step.templateId}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <div className="text-sm font-medium text-slate-500">
                <span className="font-bold text-slate-800 dark:text-slate-200">{enrollments.filter(e => e.campaignId === camp.id).length}</span> Enrolled
              </div>
              <div className="flex space-x-2">
                <button onClick={() => toggleStatus(camp)} className="p-2 text-slate-500 hover:text-green-600 transition bg-slate-50 hover:bg-green-50 rounded dark:bg-slate-800 dark:hover:bg-slate-700" title={camp.status === 'Active' ? 'Pause' : 'Activate'}>
                  {camp.status === 'Active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={() => handleEdit(camp)} className="p-2 text-slate-500 hover:text-blue-600 transition bg-slate-50 hover:bg-blue-50 rounded dark:bg-slate-800 dark:hover:bg-slate-700">
                  <Settings className="w-4 h-4" />
                </button>
                <button onClick={() => deleteCampaign(camp.id)} className="p-2 text-slate-500 hover:text-red-600 transition bg-slate-50 hover:bg-red-50 rounded dark:bg-slate-800 dark:hover:bg-slate-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <GenericEditModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Sequence"
        fields={[
          { key: 'name', label: 'Sequence Name', type: 'text' },
          { key: 'targetAudience', label: 'Target Audience', type: 'select', options: ['Leads', 'Partners', 'All'] },
        ]}
        onSave={(data) => {
          addCampaign({
            id: `CAMP-${Date.now()}`,
            name: data.name,
            targetAudience: data.targetAudience,
            status: "Paused",
            steps: [
              { stepNumber: 1, delayDays: 0, templateId: "Initial Outreach" }
            ]
          });
          setIsModalOpen(false);
        }}
      />

      <GenericEditModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        itemData={editingCampaign}
        title="Edit Sequence Basics"
        fields={[
          { key: 'name', label: 'Sequence Name', type: 'text' },
          { key: 'targetAudience', label: 'Target Audience', type: 'select', options: ['Leads', 'Partners', 'All'] },
          { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Paused'] }
        ]}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
