import DashboardApp from '@/app/component-dashboard/DashboardApp';

export default function AdminPage() {
  return <DashboardApp mode='admin' startLoggedIn initialView='dashboard' />;
}
