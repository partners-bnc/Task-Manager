'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminSidebar from './layout/AdminSidebar';

// We will import the actual views here once they are created
import AdminDashboard from './views/admin/AdminDashboard';
import PayoutsPayroll from './views/admin/PayoutsPayroll';
import EmployeeList from './views/admin/EmployeeList';
import DetailedEmployeeProfile from './views/admin/DetailedEmployeeProfile';
import AddEmployee from './views/admin/AddEmployee';
import EmployeeAnalytics from './views/admin/EmployeeAnalytics';
import RegularizationInbox from './views/admin/RegularizationInbox';
import HolidayManager from './views/admin/HolidayManager';
import LeaveManagement from './views/admin/LeaveManagement';

export default function AdminApp() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [currentTab, setCurrentTab] = useState(requestedTab || 'admin-dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadAdmin() {
      try {
        const response = await fetch('/HRM/api/admin/me', { method: 'GET' });
        const result = await response.json();

        if (!response.ok || !active) {
          return;
        }

        setAdmin(result.admin || null);
      } catch {
        if (active) {
          setAdmin(null);
        }
      }
    }

    loadAdmin();
    return () => {
      active = false;
    };
  }, []);

  const renderContent = () => {
    switch (currentTab) {
      case 'admin-dashboard':
        return <AdminDashboard admin={admin} setCurrentTab={setCurrentTab} />;
      case 'admin-employee-list':
        return (
          <EmployeeList
            setCurrentTab={setCurrentTab}
            setSelectedEmployeeId={setSelectedEmployeeId}
          />
        );
      case 'admin-payouts':
        return <PayoutsPayroll />;
      case 'admin-analytics':
        return <EmployeeAnalytics />;
      case 'admin-regularization':
        return <RegularizationInbox />;
      case 'admin-leaves':
        return <LeaveManagement />;
      case 'admin-holidays':
        return <HolidayManager />;
      // Detailed views
      case 'admin-employee-profile':
        return (
          <DetailedEmployeeProfile
            employeeId={selectedEmployeeId}
            setCurrentTab={setCurrentTab}
          />
        );
      case 'admin-add-employee':
        return <AddEmployee setCurrentTab={setCurrentTab} />;
      default:
        return (
          <div className="flex items-center justify-center p-12">
            <p className="text-on-surface-variant text-lg">This view is under construction.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <AdminSidebar currentTab={currentTab} setCurrentTab={setCurrentTab} admin={admin} />
      
      <div className="flex-1 flex flex-col ml-64 min-w-0">
        <main className="flex-1 relative">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
