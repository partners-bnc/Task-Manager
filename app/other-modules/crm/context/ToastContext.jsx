"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_TYPES = {
  success: {
    icon: CheckCircle,
    className: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300',
    iconClassName: 'text-green-500 dark:text-green-400',
  },
  error: {
    icon: XCircle,
    className: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300',
    iconClassName: 'text-red-500 dark:text-red-400',
  },
  info: {
    icon: Info,
    className: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300',
    iconClassName: 'text-blue-500 dark:text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300',
    iconClassName: 'text-amber-500 dark:text-amber-400',
  },
};

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 4000;

function ToastContainer({ toasts, onDismiss }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes toast-slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes toast-fade-out {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        .toast-enter {
          animation: toast-slide-in 0.3s ease-out forwards;
        }
        .toast-exit {
          animation: toast-fade-out 0.25s ease-in forwards;
        }
      `}} />
      <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info;
          const Icon = config.icon;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 min-w-[320px] max-w-[420px] rounded-lg border px-4 py-3 shadow-lg ${config.className} ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.iconClassName}`} />
              <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition"
              >
                <X className="w-4 h-4 opacity-60" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const dismissToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    // Remove from DOM after exit animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const addToast = useCallback(
    (type, message) => {
      const id = ++toastIdRef.current;
      setToasts((prev) => {
        const next = [...prev, { id, type, message, exiting: false }];
        // Enforce max visible toasts — dismiss oldest
        if (next.length > MAX_TOASTS) {
          const oldest = next[0];
          setTimeout(() => dismissToast(oldest.id), 0);
        }
        return next;
      });

      // Auto-dismiss after timeout
      setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);

      return id;
    },
    [dismissToast]
  );

  const toast = React.useMemo(
    () => ({
      success: (message) => addToast('success', message),
      error: (message) => addToast('error', message),
      info: (message) => addToast('info', message),
      warning: (message) => addToast('warning', message),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
