import TaskDetailPage from '@/app/component-dashboard/TaskDetailPage';

export default async function EmployeeTaskDetailPage({ params }) {
  const { id } = await params;
  return <TaskDetailPage taskId={id} mode='employee' />;
}
