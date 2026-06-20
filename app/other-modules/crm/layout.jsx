export const metadata = {
  title: 'CRM Dashboard',
  description: 'Manage customer relationships, sales pipelines, and track leads.',
};

import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import { CrmProvider } from './context/CrmContext';
import { ToastProvider } from './context/ToastContext';

export default function CRMLayout({ children }) {
  return (
    <CrmProvider>
      <ToastProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-slate-100 transition-colors duration-300 dark:bg-slate-900 md:flex-row">
          <div className="hidden md:block">
            <Sidebar />
          </div>
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white md:hidden">
            <span className="text-sm font-bold tracking-wide">TasksFlow CRM</span>
            <span className="rounded bg-blue-900 px-2 py-1 text-[11px] font-semibold uppercase text-blue-100">Mobile</span>
          </div>
          <main className="min-h-0 w-full flex-1 overflow-y-auto">
            {children}
          </main>
          <CommandPalette />
        </div>
      </ToastProvider>
    </CrmProvider>
  );
}
