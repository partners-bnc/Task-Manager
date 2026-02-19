import TaskDetailPage from '@/app/component-dashboard/TaskDetailPage';

export default async function AdminTaskDetailPage({ params }) {
  const { id } = await params;
  return <TaskDetailPage taskId={id} mode='admin' />;
}

