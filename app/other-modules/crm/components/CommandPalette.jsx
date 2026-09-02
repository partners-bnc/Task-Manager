"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCrm } from '../context/CrmContext';
import {
  Search,
  LayoutDashboard,
  Users,
  Activity,
  CheckSquare,
  Calendar,
  Link as LinkIcon,
  Mail,
  Zap,
  ArrowRight,
  Command,
  FolderKanban,
} from 'lucide-react';

const PAGES = [
  { label: 'Dashboard', path: '/other-modules/crm/dashboard', icon: LayoutDashboard },
  { label: 'Lead Tracking', path: '/other-modules/crm/leads', icon: Users },
  { label: 'Lead Lists & Buckets', path: '/other-modules/crm/lists', icon: FolderKanban },
  { label: 'Tasks', path: '/other-modules/crm/tasks', icon: CheckSquare },
  { label: 'Follow-ups', path: '/other-modules/crm/followups', icon: Calendar },
  { label: 'Calendar', path: '/other-modules/crm/calendar', icon: Calendar },
  { label: 'Lead Sources', path: '/other-modules/crm/sources', icon: LinkIcon },
  { label: 'Email Templates', path: '/other-modules/crm/templates', icon: Mail },
  { label: 'Campaigns', path: '/other-modules/crm/campaigns', icon: Zap },
];

const MAX_PER_CATEGORY = 5;

const statusColors = {
  New: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Contacted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  Qualified: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Won: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Lost: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const priorityColors = {
  High: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const taskStatusColors = {
  Pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  Cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
};

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const router = useRouter();
  const { leads, tasks } = useCrm();

  // Toggle open/close with Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Delay to ensure the DOM has rendered
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Build filtered results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const sections = [];

    // Pages
    const filteredPages = PAGES.filter((p) =>
      p.label.toLowerCase().includes(q)
    ).slice(0, MAX_PER_CATEGORY);
    if (filteredPages.length > 0) {
      sections.push({
        title: 'Pages',
        items: filteredPages.map((p) => ({
          type: 'page',
          label: p.label,
          path: p.path,
          icon: p.icon,
        })),
      });
    }

    // Leads
    if (q.length > 0) {
      const filteredLeads = leads
        .filter(
          (l) =>
            l.company?.toLowerCase().includes(q) ||
            l.contact?.toLowerCase().includes(q)
        )
        .slice(0, MAX_PER_CATEGORY);
      if (filteredLeads.length > 0) {
        sections.push({
          title: 'Leads',
          items: filteredLeads.map((l) => ({
            type: 'lead',
            label: l.company,
            subtitle: l.contact,
            status: l.status,
            value: l.value,
            path: '/other-modules/crm/leads',
          })),
        });
      }

      // Tasks
      const filteredTasks = tasks
        .filter((t) => t.title?.toLowerCase().includes(q))
        .slice(0, MAX_PER_CATEGORY);
      if (filteredTasks.length > 0) {
        sections.push({
          title: 'Tasks',
          items: filteredTasks.map((t) => ({
            type: 'task',
            label: t.title,
            status: t.status,
            priority: t.priority,
            path: '/other-modules/crm/tasks',
          })),
        });
      }
    }

    return sections;
  }, [query, leads, tasks]);

  // Flatten items for keyboard navigation
  const flatItems = useMemo(() => {
    return results.flatMap((section) => section.items);
  }, [results]);

  // Clamp selectedIndex when results change
  useEffect(() => {
    if (selectedIndex >= flatItems.length) {
      setSelectedIndex(Math.max(0, flatItems.length - 1));
    }
  }, [flatItems.length, selectedIndex]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const handleSelect = useCallback(
    (item) => {
      if (item?.path) {
        router.push(item.path);
      }
      close();
    },
    [router, close]
  );

  // Keyboard navigation inside the palette
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flatItems.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flatItems.length - 1
        );
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          handleSelect(flatItems[selectedIndex]);
        }
      }
    },
    [flatItems, selectedIndex, handleSelect, close]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] animate-in fade-in duration-150"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[640px] mx-4 rounded-2xl border border-slate-200/20 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-slate-900/20 dark:shadow-black/40 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200/70 dark:border-slate-700/50">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search pages, leads, tasks..."
            className="flex-1 bg-transparent text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 dark:text-slate-400 select-none">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2 scroll-smooth">
          {results.length === 0 && query.length > 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                No results found
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Try searching with different keywords
              </p>
            </div>
          )}

          {results.length === 0 && query.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Command className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Type to search...
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Search across pages, leads, and tasks
              </p>
            </div>
          )}

          {results.map((section) => (
            <div key={section.title} className="mb-1">
              {/* Section Header */}
              <div className="px-5 py-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {section.title}
                </span>
              </div>

              {/* Items */}
              {section.items.map((item) => {
                flatIndex++;
                const isSelected = flatIndex === selectedIndex;
                const currentIdx = flatIndex;

                return (
                  <button
                    key={`${item.type}-${item.label}-${currentIdx}`}
                    data-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(currentIdx)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors duration-100 cursor-pointer group ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Icon */}
                    {item.type === 'page' && (
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                      </div>
                    )}
                    {item.type === 'lead' && (
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                      </div>
                    )}
                    {item.type === 'task' && (
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <CheckSquare className="w-4 h-4" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium truncate ${
                            isSelected
                              ? 'text-blue-700 dark:text-blue-300'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {item.label}
                        </span>

                        {/* Status badge for leads/tasks */}
                        {item.type === 'lead' && item.status && (
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                              statusColors[item.status] || 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.status}
                          </span>
                        )}
                        {item.type === 'task' && item.status && (
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                              taskStatusColors[item.status] || 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.status}
                          </span>
                        )}
                        {item.type === 'task' && item.priority && (
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                              priorityColors[item.priority] || 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.priority}
                          </span>
                        )}
                      </div>

                      {/* Subtitle for leads */}
                      {item.type === 'lead' && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                          {item.value && (
                            <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                              {item.value}
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <ArrowRight
                      className={`w-4 h-4 shrink-0 transition-all duration-150 ${
                        isSelected
                          ? 'opacity-100 text-blue-500 dark:text-blue-400 translate-x-0'
                          : 'opacity-0 -translate-x-1 text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 font-semibold text-slate-500 dark:text-slate-400">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 font-semibold text-slate-500 dark:text-slate-400">
                ↵
              </kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 font-semibold text-slate-500 dark:text-slate-400">
                esc
              </kbd>
              close
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Fade-in animation style */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInPalette {
          from { opacity: 0; transform: scale(0.98) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-in { animation: fadeInPalette 0.15s ease-out both; }
      `}} />
    </div>
  );
}
