'use client';

import { Suspense } from 'react';
import '@/app/HRM/components/styles/index.css';
import AdminApp from '@/app/HRM/components/AdminApp';

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminApp />
    </Suspense>
  );
}
