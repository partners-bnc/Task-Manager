import DashboardApp from '@/app/component-dashboard/DashboardApp';

export default function AdminTasksPage() {
  return <DashboardApp mode='admin' startLoggedIn initialView='tasks' />;
}

