'use client';

import { DataProvider } from '@/app/Taskmanager/components/DataContext';
import Login from '@/app/Taskmanager/components/Login';

export default function LoginPageClient() {
  return (
    <DataProvider bootstrap={false}>
      <Login />
    </DataProvider>
  );
}
