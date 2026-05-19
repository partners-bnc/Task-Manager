'use client';

import React, { useMemo } from 'react';
import EmployeePageHeader from '../../ui/EmployeePageHeader';
import EmployeeList from './EmployeeList';
import DetailedEmployeeProfile from './DetailedEmployeeProfile';

function formatWorkspaceDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export default function EmployeeDirectoryWorkspace({
  setCurrentTab,
  selectedEmployeeId,
  setSelectedEmployeeId,
  setOnboardingRequestId,
}: {
  setCurrentTab: (tab: string) => void;
  selectedEmployeeId?: string | null;
  setSelectedEmployeeId: (employeeId: string | null) => void;
  setOnboardingRequestId?: (requestId: string | null) => void;
}) {
  const todayLabel = useMemo(() => formatWorkspaceDate(new Date()), []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-7 py-7 pb-10">
      <EmployeePageHeader
        icon="badge"
        title="Employee Directory"
        description={`Today: ${todayLabel}`}
      />

      <div className="space-y-6">
        {selectedEmployeeId ? (
          <DetailedEmployeeProfile
            embedded
            employeeId={selectedEmployeeId}
            onBack={() => setSelectedEmployeeId(null)}
            setCurrentTab={setCurrentTab}
          />
        ) : (
          <EmployeeList
            hideHeader
            setCurrentTab={setCurrentTab}
            setSelectedEmployeeId={(employeeId) => setSelectedEmployeeId(employeeId)}
            selectedEmployeeId={selectedEmployeeId}
            onEmployeeSelect={(employeeId) => setSelectedEmployeeId(employeeId)}
            onAddEmployee={() => {
              setOnboardingRequestId?.(null);
              setCurrentTab('admin-add-employee');
            }}
          />
        )}
      </div>
    </div>
  );
}
