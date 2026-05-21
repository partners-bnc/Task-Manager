import { redirect } from 'next/navigation';

export default async function LegacyTaskDetailRedirect({ params }) {
  const { id } = await params;
  redirect(`/Taskmanager/dashboard/tasks/${id}`);
}
