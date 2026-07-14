import Image from 'next/image';
import { Badge } from './ui/Badge';
import { FileCheck, ListTodo, Users, Handshake, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Auditing',
    badge: 'Compliance & Security',
    tagline: 'Comprehensive Auditing & Compliance Control',
    description:
      'Track operations, verify logs, and maintain regulatory compliance with fully trace-mapped automated audit trails.',
    icon: FileCheck,
    image: '/assets/Audit.jpeg',
    bg: 'bg-emerald-500/10',
    color: 'text-emerald-600',
    borderColor: 'border-emerald-100',
    features: ['Automated User Activity Logs', 'Compliance Report Generation', 'Encrypted Data Verification'],
  },
  {
    id: 2,
    title: 'Task Management',
    badge: 'Productivity & Flow',
    tagline: 'Intuitive Task Tracking & Workflows',
    description:
      'Empower your teams to organize, prioritize, and execute tasks across customizable kanbans and interactive timelines.',
    icon: ListTodo,
    image: '/assets/task.jpeg',
    bg: 'bg-violet-500/10',
    color: 'text-violet-600',
    borderColor: 'border-violet-100',
    features: ['Drag-and-Drop Kanban Boards', 'Real-Time Completion Indicators', 'Collaborative Task Threads'],
  },
  {
    id: 3,
    title: 'HRM',
    badge: 'Attendance & Intake',
    tagline: 'Complete Employee Management & Attendance',
    description:
      'Streamline employee onboarding, automated attendance marking, leave request processing, and workforce logs in one unified system.',
    icon: Users,
    image: '/assets/hrm.jpeg',
    bg: 'bg-blue-500/10',
    color: 'text-blue-600',
    borderColor: 'border-blue-100',
    features: ['Digital Employee Onboarding', 'Attendance Marking & Logs', 'Leave & Shift Request Workflows'],
  },
  {
    id: 4,
    title: 'CRM',
    badge: 'Growth & Client Relations',
    tagline: 'Smart Relationship & Lead Pipelines',
    description:
      'Maximize client satisfaction and accelerate deals with a visual pipeline, automated email flows, and contact history logs.',
    icon: Handshake,
    image: '/assets/crm.jpeg',
    bg: 'bg-amber-500/10',
    color: 'text-amber-600',
    borderColor: 'border-amber-100',
    features: ['Visual Deal Pipeline Stages', 'Automated Email Reminders', 'Centralized History Tracking'],
  },
];

export function FeatureSteps() {
  return (
    <section className="py-24 px-4 bg-slate-50/50 overflow-hidden border-t border-slate-100" id="about">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-24">
          <Badge className="mb-4 bg-violet-100 text-violet-700 hover:bg-violet-100 border-none px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            Our Module Ecosystem
          </Badge>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 max-w-3xl leading-tight">
            Integrated Workspaces for All Your Core Operations
          </h2>
          <p className="mt-4 text-slate-600 max-w-xl text-base md:text-lg">
            Empower every department in your company with specialized modules operating under a single workspace.
          </p>
        </div>

        {/* Scrolling Modules Layout */}
        <div className="flex flex-col gap-28 relative">
          {/* Vertical timeline line - changed to black */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black -translate-x-1/2 hidden md:block" />

          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`flex flex-col md:flex-row items-center gap-12 md:gap-24 relative ${
                idx % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              {/* Timeline Node */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-white border border-slate-200 shadow-xs">
                <step.icon className={`w-6 h-6 ${step.color}`} />
              </div>

              {/* Module Description Block */}
              <div className="flex-1 w-full text-center md:text-left">
                <div
                  className={`flex flex-col gap-4 ${
                    idx % 2 === 1 ? 'md:items-end md:text-right' : 'md:items-start'
                  }`}
                >
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${step.bg} ${step.color}`}>
                    {step.badge}
                  </span>
                  
                  <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {step.tagline}
                  </h3>
                  
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed max-w-lg mt-1">
                    {step.description}
                  </p>

                  {/* Bulleted Feature Grid with Checkboxes */}
                  <div className={`mt-6 grid gap-3.5 w-full text-left max-w-md ${idx % 2 === 1 ? 'md:justify-items-end' : ''}`}>
                    {step.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2.5">
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${step.color}`} />
                        <span className="text-sm font-semibold text-slate-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Mobile Icon */}
                  <div
                    className={`md:hidden flex items-center gap-2 mt-6 ${step.color} ${step.bg} w-fit px-3 py-1 rounded-full`}
                  >
                    <step.icon size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">{step.title}</span>
                  </div>
                </div>
              </div>

              {/* Graphical Preview Card */}
              <div className="flex-1 w-full">
                <div className={`relative rounded-3xl overflow-hidden border ${step.borderColor} shadow-[0_20px_50px_rgba(15,23,42,0.06)] bg-white aspect-[4/3] group transition-all duration-500 hover:shadow-[0_30px_70px_rgba(15,23,42,0.12)] hover:-translate-y-1`}>
                  <div className={`absolute inset-0 ${step.bg} opacity-20 z-10 transition-opacity duration-300 group-hover:opacity-10`} />
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-top transform group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
