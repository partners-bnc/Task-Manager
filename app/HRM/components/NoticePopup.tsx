'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Notice = {
  id: string;
  title: string;
  content: string;
  content_format: 'text' | 'html';
  bg_color: string;
  text_color: string;
  primary_color: string;
  border_color: string;
  title_size: string;
  content_size: string;
  content_bold: boolean;
  display_frequency: 'always' | 'once_per_day';
};

export default function NoticePopup() {
  const pathname = usePathname();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !pathname) return;

    // Do not show notices on the login screen
    if (pathname.startsWith('/login')) {
      setIsOpen(false);
      return;
    }

    let active = true;

    async function checkActiveNotice() {
      try {
        const response = await fetch('/api/notices/active', { method: 'GET' });
        const result = await response.json();

        if (!response.ok || !active) return;

        const activeNotice = result.notice as Notice | null;

        if (activeNotice) {
          // Check if this notice was already dismissed based on its frequency setting
          let isDismissed = false;

          if (activeNotice.display_frequency === 'once_per_day') {
            const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const dismissedDate = localStorage.getItem(`dismissed_notice_date_${activeNotice.id}`);
            if (dismissedDate === todayStr) {
              isDismissed = true;
            }
          } else {
            // Default: 'always' (session-based)
            const sessionDismissed = sessionStorage.getItem(`dismissed_notice_${activeNotice.id}`);
            if (sessionDismissed === 'true') {
              isDismissed = true;
            }
          }

          if (!isDismissed) {
            setNotice(activeNotice);
            setIsOpen(true);
          }
        }
      } catch (error) {
        console.error('Failed to check for active notice popup:', error);
      }
    }

    checkActiveNotice();

    return () => {
      active = false;
    };
  }, [pathname, mounted]);

  const handleDismiss = () => {
    if (!notice) return;

    if (notice.display_frequency === 'once_per_day') {
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(`dismissed_notice_date_${notice.id}`, todayStr);
    } else {
      sessionStorage.setItem(`dismissed_notice_${notice.id}`, 'true');
    }

    setIsOpen(false);
  };

  if (!mounted || !isOpen || !notice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-[2px] transition-all duration-300">
      {/* Pop-up Card */}
      <div
        className="w-full rounded-[2rem] border shadow-2xl flex flex-col overflow-hidden max-h-[90vh] transition-all duration-300 transform scale-100"
        style={{
          backgroundColor: notice.bg_color,
          color: notice.text_color,
          borderColor: notice.border_color,
          maxWidth: '480px',
        }}
      >
        {/* Dismiss Icon */}
        <div className="flex justify-end p-4 pb-0">
          <button
            type="button"
            onClick={handleDismiss}
            style={{ color: notice.text_color }}
            className="opacity-70 hover:opacity-100 transition p-1.5 rounded-full hover:bg-slate-500/10 focus:outline-none"
            aria-label="Close Notice"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Notice Icon and Header Title */}
        <div className="px-6 pb-2 text-center flex flex-col items-center">
          <div
            className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl border transition shadow-sm"
            style={{
              backgroundColor: `${notice.primary_color}12`,
              borderColor: `${notice.primary_color}25`,
            }}
          >
            <span className="material-symbols-outlined text-[24px]" style={{ color: notice.primary_color }}>
              campaign
            </span>
          </div>
          <h2
            className="font-headline font-extrabold leading-tight tracking-tight px-1"
            style={{
              fontSize: notice.title_size,
              color: notice.text_color,
            }}
          >
            {notice.title}
          </h2>
        </div>

        {/* Notice Scrollable Body */}
        <div className="px-6 py-4 flex-grow overflow-y-auto max-h-[300px] text-center subtle-scrollbar">
          {notice.content_format === 'html' ? (
            <div
              className="text-sm leading-7 prose prose-sm max-w-none select-text"
              style={{
                fontSize: notice.content_size,
                fontWeight: notice.content_bold ? 'bold' : 'normal',
                color: notice.text_color,
              }}
              dangerouslySetInnerHTML={{ __html: notice.content }}
            />
          ) : (
            <p
              className="text-sm leading-7 whitespace-pre-line select-text"
              style={{
                fontSize: notice.content_size,
                fontWeight: notice.content_bold ? 'bold' : 'normal',
                color: notice.text_color,
              }}
            >
              {notice.content}
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="p-6 pt-2 flex justify-center">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full rounded-2xl py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg focus:outline-none"
            style={{
              backgroundColor: notice.primary_color,
            }}
          >
            Acknowledge Notice
          </button>
        </div>
      </div>
    </div>
  );
}
