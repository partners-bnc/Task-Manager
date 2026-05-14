'use client';

import Tickets from '@/app/HRM/components/views/Tickets';
import { HrmFeedbackProvider } from '@/app/HRM/components/ui/HrmFeedback';
import { useData } from './DataContext';

export default function TaskTickets() {
  const { isAdminMode } = useData();

  return (
    <HrmFeedbackProvider>
      <div className="p-4 sm:p-6 lg:p-8">
        <Tickets
          variant={isAdminMode ? 'admin' : 'employee'}
          apiBasePath="/Taskmanager/api/tickets"
          moduleTitle="Task Tickets"
          moduleDescription="Raise task management issues, blockers, and coordination requests in one place."
          createLabel="Create Task Ticket"
          appearance="task_manager"
        />
      </div>
    </HrmFeedbackProvider>
  );
}
