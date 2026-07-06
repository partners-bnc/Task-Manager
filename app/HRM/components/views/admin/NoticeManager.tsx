'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useHrmFeedback } from '../../ui/HrmFeedback';
import HrmEmptyState from '../../ui/HrmEmptyState';
import { TableRowsSkeleton } from '../../ui/Skeleton';

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
  start_time: string;
  end_time: string;
  target_audience: 'all' | 'admin' | 'employee';
  display_frequency: 'always' | 'once_per_day';
  is_active: boolean;
  created_at: string;
};

const defaultColors = {
  bg_color: '#ffffff',
  text_color: '#0f172a',
  primary_color: '#4f46e5',
  border_color: '#e2e8f0',
};

const defaultForm = {
  title: '',
  content: '',
  content_format: 'text' as 'text' | 'html',
  bg_color: defaultColors.bg_color,
  text_color: defaultColors.text_color,
  primary_color: defaultColors.primary_color,
  border_color: defaultColors.border_color,
  title_size: '24px',
  content_size: '16px',
  content_bold: false,
  start_time: '',
  end_time: '',
  target_audience: 'all' as 'all' | 'admin' | 'employee',
  display_frequency: 'always' as 'always' | 'once_per_day',
  is_active: true,
};

export default function NoticeManager() {
  const { showFeedback, confirmFeedback } = useHrmFeedback();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let active = true;

    async function loadNotices() {
      setLoading(true);
      try {
        const response = await fetch('/HRM/api/admin/notices', { method: 'GET' });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load notices');
        }

        if (active) {
          setNotices(result.notices || []);
        }
      } catch (error) {
        if (active) {
          showFeedback({
            type: 'error',
            title: 'Notices Not Loaded',
            message: error instanceof Error ? error.message : 'Failed to load notices',
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadNotices();
    return () => {
      active = false;
    };
  }, [showFeedback]);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId('');
    setAiPrompt('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleColorSelect = (field: string, color: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: color,
    }));
  };

  const insertHtmlTag = (tag: string) => {
    if (!textareaRef.current) return;
    const txtarea = textareaRef.current;
    const start = txtarea.selectionStart;
    const end = txtarea.selectionEnd;
    const text = txtarea.value;
    const selected = text.substring(start, end);
    let replacement = '';

    if (tag === 'bold') {
      replacement = `<strong>${selected || 'bold text'}</strong>`;
    } else if (tag === 'paragraph') {
      replacement = `<p>${selected || 'paragraph text'}</p>`;
    } else if (tag === 'break') {
      replacement = `<br/>${selected}`;
    } else if (tag === 'heading') {
      replacement = `<h3>${selected || 'heading text'}</h3>`;
    }

    const nextContent = text.substring(0, start) + replacement + text.substring(end);
    setForm((prev) => ({ ...prev, content: nextContent }));

    setTimeout(() => {
      txtarea.focus();
      txtarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 10);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      showFeedback({
        type: 'error',
        title: 'Prompt Required',
        message: 'Please enter a description of the notice you want to generate.',
      });
      return;
    }

    setAiGenerating(true);
    try {
      const response = await fetch('/HRM/api/admin/notices/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'AI Notice generation failed');
      }

      const generated = result.notice;
      setForm((prev) => ({
        ...prev,
        title: generated.title || prev.title,
        content: generated.content || prev.content,
        content_format: generated.content_format || prev.content_format,
        bg_color: generated.bg_color || prev.bg_color,
        text_color: generated.text_color || prev.text_color,
        primary_color: generated.primary_color || prev.primary_color,
        border_color: generated.border_color || prev.border_color,
        title_size: generated.title_size || prev.title_size,
        content_size: generated.content_size || prev.content_size,
        content_bold: generated.content_bold !== undefined ? generated.content_bold : prev.content_bold,
      }));

      showFeedback({
        type: 'success',
        title: 'Notice Generated',
        message: 'Notice and style template generated successfully by AI.',
      });
    } catch (error) {
      showFeedback({
        type: 'error',
        title: 'Generation Failed',
        message: error instanceof Error ? error.message : 'Could not generate notice content',
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.title.trim() || !form.content.trim()) {
      showFeedback({ type: 'error', title: 'Validation Error', message: 'Title and content are required.' });
      return;
    }

    if (!form.start_time || !form.end_time) {
      showFeedback({ type: 'error', title: 'Validation Error', message: 'Scheduling start and end times are required.' });
      return;
    }

    if (new Date(form.start_time) >= new Date(form.end_time)) {
      showFeedback({ type: 'error', title: 'Validation Error', message: 'End time must be after the start time.' });
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingId ? `/HRM/api/admin/notices/${editingId}` : '/HRM/api/admin/notices';
      const method = editingId ? 'PUT' : 'POST';

      const payload = {
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      };

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save notice');
      }

      const savedNotice = result.notice;
      setNotices((current) => {
        if (editingId) {
          return current.map((item) => (item.id === editingId ? savedNotice : item));
        }
        return [savedNotice, ...current];
      });

      showFeedback({
        type: 'success',
        title: editingId ? 'Notice Updated' : 'Notice Created',
        message: editingId ? 'The notice has been updated successfully.' : 'New scheduled notice created successfully.',
      });
      resetForm();
    } catch (error) {
      showFeedback({
        type: 'error',
        title: 'Notice Not Saved',
        message: error instanceof Error ? error.message : 'Failed to save notice',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (notice: Notice) => {
    // Format timestamp string for datetime-local input (YYYY-MM-DDTHH:MM)
    const formatDateTime = (isoString: string) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      const tzOffset = date.getTimezoneOffset() * 60000;
      const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
      return localISOTime;
    };

    setEditingId(notice.id);
    setForm({
      title: notice.title,
      content: notice.content,
      content_format: notice.content_format,
      bg_color: notice.bg_color,
      text_color: notice.text_color,
      primary_color: notice.primary_color,
      border_color: notice.border_color,
      title_size: notice.title_size,
      content_size: notice.content_size,
      content_bold: notice.content_bold,
      start_time: formatDateTime(notice.start_time),
      end_time: formatDateTime(notice.end_time),
      target_audience: notice.target_audience,
      display_frequency: notice.display_frequency,
      is_active: notice.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmFeedback({
      type: 'warning',
      title: 'Delete Notice',
      message: 'Are you sure you want to permanently delete this notice? This action cannot be undone.',
      confirmLabel: 'Delete Notice',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/HRM/api/admin/notices/${id}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete notice');
      }

      setNotices((current) => current.filter((item) => item.id !== id));
      if (editingId === id) {
        resetForm();
      }
      showFeedback({ type: 'success', title: 'Notice Deleted', message: 'Notice was deleted successfully.' });
    } catch (error) {
      showFeedback({
        type: 'error',
        title: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Failed to delete notice',
      });
    }
  };

  const handleToggleActive = async (notice: Notice) => {
    try {
      const response = await fetch(`/HRM/api/admin/notices/${notice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !notice.is_active }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update notice status');
      }

      setNotices((current) => current.map((item) => (item.id === notice.id ? result.notice : item)));
      showFeedback({
        type: 'success',
        title: notice.is_active ? 'Notice Deactivated' : 'Notice Activated',
        message: `Notice status updated successfully.`,
      });
    } catch (error) {
      showFeedback({
        type: 'error',
        title: 'Status Update Failed',
        message: error instanceof Error ? error.message : 'Could not change active status',
      });
    }
  };

  const getNoticeStatus = (notice: Notice) => {
    if (!notice.is_active) return { label: 'Inactive', className: 'bg-slate-100 text-slate-700' };
    const now = new Date();
    const start = new Date(notice.start_time);
    const end = new Date(notice.end_time);

    if (now < start) {
      return { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' };
    } else if (now > end) {
      return { label: 'Expired', className: 'bg-slate-200 text-slate-700 font-normal opacity-70' };
    } else {
      return { label: 'Active Now', className: 'bg-emerald-100 text-emerald-800 font-bold' };
    }
  };

  const formatDateTimeDisplay = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Predefined background themes
  const colorThemes = [
    { name: 'Pure White', bg: '#ffffff', text: '#0f172a', border: '#e2e8f0', primary: '#4f46e5' },
    { name: 'Dark Indigo', bg: '#0f172a', text: '#f8fafc', border: '#1e293b', primary: '#6366f1' },
    { name: 'Slate Light', bg: '#f8fafc', text: '#334155', border: '#cbd5e1', primary: '#0ea5e9' },
    { name: 'Emerald Soft', bg: '#ecfdf5', text: '#064e3b', border: '#a7f3d0', primary: '#059669' },
    { name: 'Amber Soft', bg: '#fffbeb', text: '#78350f', border: '#fde68a', primary: '#d97706' },
    { name: 'Rose Soft', bg: '#fff1f2', text: '#881337', border: '#fecdd3', primary: '#e11d48' },
  ];

  return (
    <div className="p-4 sm:p-10 pb-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        {/* Header */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100/90 text-violet-700 shadow-sm">
                <span className="material-symbols-outlined text-[22px]">campaign</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-headline font-bold text-on-background">Notice Board & Announcements</h1>
            </div>
            <p className="pl-1 sm:pl-14 text-sm leading-6 text-on-surface-variant">
              Publish scheduling notices and critical popups. Setup manually or use AI to draft contents and custom color schemes.
            </p>
          </div>
        </section>

        {/* Notice Creation & Live Preview Row */}
        <div className="grid items-start gap-8 lg:grid-cols-[450px_1fr]">
          
          {/* Creator Form */}
          <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-5 sm:p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-on-surface">
                {editingId ? 'Edit Notice Schedule' : 'Create New Notice'}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {/* AI Generator Box */}
            <div className="mb-8 rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 p-4 sm:p-5">
              <label htmlFor="aiPrompt" className="mb-2 block text-xs font-bold uppercase tracking-wider text-violet-800">
                ✨ Generate Notice with AI
              </label>
              <div className="flex flex-col gap-3">
                <textarea
                  id="aiPrompt"
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Notice about office timing change to 9:30 AM tomorrow in Indigo dark theme"
                  className="w-full rounded-xl border border-violet-200/60 bg-white px-4 py-3.5 text-sm placeholder-slate-400 focus:border-violet-500 focus:outline-none resize-y"
                  disabled={aiGenerating}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={aiGenerating}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                  >
                    {aiGenerating ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                        <span>AI Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="title" className="block text-sm font-bold text-slate-700 mb-1.5">
                    Notice Title
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    required
                    value={form.title}
                    onChange={handleInputChange}
                    placeholder="Enter notice title"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="content" className="block text-sm font-bold text-slate-700">
                      Notice Body Content
                    </label>
                    <div className="flex gap-2">
                      <label className="inline-flex items-center text-xs font-semibold text-slate-600">
                        <input
                          type="radio"
                          name="content_format"
                          value="text"
                          checked={form.content_format === 'text'}
                          onChange={() => setForm(p => ({ ...p, content_format: 'text' }))}
                          className="mr-1"
                        />
                        Simple Text
                      </label>
                      <label className="inline-flex items-center text-xs font-semibold text-slate-600">
                        <input
                          type="radio"
                          name="content_format"
                          value="html"
                          checked={form.content_format === 'html'}
                          onChange={() => setForm(p => ({ ...p, content_format: 'html' }))}
                          className="mr-1"
                        />
                        HTML Format
                      </label>
                    </div>
                  </div>

                  {/* HTML inserts */}
                  {form.content_format === 'html' && (
                    <div className="mb-2 flex flex-wrap gap-1 bg-slate-50 border border-slate-200 border-b-0 rounded-t-xl p-1.5">
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('bold')}
                        className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-200 rounded hover:bg-slate-100"
                        title="Bold tag"
                      >
                        Bold
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('paragraph')}
                        className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded hover:bg-slate-100"
                        title="Paragraph tag"
                      >
                        Para
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('heading')}
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded hover:bg-slate-100"
                        title="Heading 3 tag"
                      >
                        Heading
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('break')}
                        className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded hover:bg-slate-100"
                        title="Line break"
                      >
                        Line Break
                      </button>
                    </div>
                  )}

                  <textarea
                    id="content"
                    name="content"
                    ref={textareaRef}
                    required
                    rows={6}
                    value={form.content}
                    onChange={handleInputChange}
                    placeholder={
                      form.content_format === 'html'
                        ? 'Enter HTML content, e.g. <p>Join us at <strong>4 PM</strong> today in the cafeteria.</p>'
                        : 'Enter simple text. Line breaks will be preserved.'
                    }
                    className={`w-full bg-white px-4 py-3 text-sm focus:border-violet-500 focus:outline-none ${
                      form.content_format === 'html'
                        ? 'border border-slate-200 rounded-b-xl'
                        : 'border border-slate-200 rounded-xl'
                    }`}
                  />
                </div>

                {/* Font customization for plain text */}
                <div className="sm:col-span-2 grid grid-cols-3 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <div>
                    <label htmlFor="title_size" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Title Font Size
                    </label>
                    <select
                      id="title_size"
                      name="title_size"
                      value={form.title_size}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="20px">Small (20px)</option>
                      <option value="24px">Medium (24px)</option>
                      <option value="28px">Large (28px)</option>
                      <option value="32px">X-Large (32px)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="content_size" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Content Font Size
                    </label>
                    <select
                      id="content_size"
                      name="content_size"
                      value={form.content_size}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="14px">Small (14px)</option>
                      <option value="16px">Medium (16px)</option>
                      <option value="18px">Large (18px)</option>
                      <option value="20px">X-Large (20px)</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-end pb-1.5 pl-2">
                    <label className="inline-flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer">
                      <input
                        type="checkbox"
                        name="content_bold"
                        checked={form.content_bold}
                        onChange={handleCheckboxChange}
                        className="mr-2 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                      Bold Body Text
                    </label>
                  </div>
                </div>

                {/* Scheduling */}
                <div>
                  <label htmlFor="start_time" className="block text-sm font-bold text-slate-700 mb-1.5">
                    Start Date & Time
                  </label>
                  <input
                    id="start_time"
                    name="start_time"
                    type="datetime-local"
                    required
                    value={form.start_time}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label htmlFor="end_time" className="block text-sm font-bold text-slate-700 mb-1.5">
                    End Date & Time
                  </label>
                  <input
                    id="end_time"
                    name="end_time"
                    type="datetime-local"
                    required
                    value={form.end_time}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Audience & Frequency */}
                <div>
                  <label htmlFor="target_audience" className="block text-sm font-bold text-slate-700 mb-1.5">
                    Target Audience
                  </label>
                  <select
                    id="target_audience"
                    name="target_audience"
                    value={form.target_audience}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                  >
                    <option value="all">All Employees</option>
                    <option value="admin">HR Admins Only</option>
                    <option value="employee">Non-Admin Employees</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="display_frequency" className="block text-sm font-bold text-slate-700 mb-1.5">
                    Display Frequency on Login
                  </label>
                  <select
                    id="display_frequency"
                    name="display_frequency"
                    value={form.display_frequency}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                  >
                    <option value="always">Show on Every Session Login</option>
                    <option value="once_per_day">Show Once Per Day</option>
                  </select>
                </div>

                {/* Color pickers */}
                <div className="sm:col-span-2">
                  <span className="block text-sm font-bold text-slate-700 mb-3">Notice Colors & Theme</span>
                  
                  {/* Theme Presets */}
                  <div className="mb-4">
                    <span className="block text-xs font-semibold text-slate-400 mb-2">Theme Presets:</span>
                    <div className="flex flex-wrap gap-2">
                      {colorThemes.map((theme, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setForm(p => ({
                              ...p,
                              bg_color: theme.bg,
                              text_color: theme.text,
                              border_color: theme.border,
                              primary_color: theme.primary,
                            }));
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                        >
                          <span className="inline-block h-3.5 w-3.5 rounded-full border border-slate-300" style={{ backgroundColor: theme.bg }} />
                          <span>{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Pickers */}
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                    <div>
                      <label htmlFor="bg_color" className="block text-xs font-bold text-slate-500 uppercase mb-1">Background</label>
                      <div className="flex items-center gap-2">
                        <input
                          id="bg_color"
                          name="bg_color"
                          type="color"
                          value={form.bg_color}
                          onChange={handleInputChange}
                          className="h-8 w-8 cursor-pointer rounded border border-slate-200 p-0"
                        />
                        <input
                          type="text"
                          name="bg_color"
                          value={form.bg_color}
                          onChange={handleInputChange}
                          className="w-full text-xs rounded border border-slate-200 px-1 py-1 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="text_color" className="block text-xs font-bold text-slate-500 uppercase mb-1">Text Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          id="text_color"
                          name="text_color"
                          type="color"
                          value={form.text_color}
                          onChange={handleInputChange}
                          className="h-8 w-8 cursor-pointer rounded border border-slate-200 p-0"
                        />
                        <input
                          type="text"
                          name="text_color"
                          value={form.text_color}
                          onChange={handleInputChange}
                          className="w-full text-xs rounded border border-slate-200 px-1 py-1 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="primary_color" className="block text-xs font-bold text-slate-500 uppercase mb-1">Button Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          id="primary_color"
                          name="primary_color"
                          type="color"
                          value={form.primary_color}
                          onChange={handleInputChange}
                          className="h-8 w-8 cursor-pointer rounded border border-slate-200 p-0"
                        />
                        <input
                          type="text"
                          name="primary_color"
                          value={form.primary_color}
                          onChange={handleInputChange}
                          className="w-full text-xs rounded border border-slate-200 px-1 py-1 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="border_color" className="block text-xs font-bold text-slate-500 uppercase mb-1">Border Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          id="border_color"
                          name="border_color"
                          type="color"
                          value={form.border_color}
                          onChange={handleInputChange}
                          className="h-8 w-8 cursor-pointer rounded border border-slate-200 p-0"
                        />
                        <input
                          type="text"
                          name="border_color"
                          value={form.border_color}
                          onChange={handleInputChange}
                          className="w-full text-xs rounded border border-slate-200 px-1 py-1 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Is Active and buttons */}
                <div className="sm:col-span-2 flex items-center justify-between border-t border-slate-100 pt-6">
                  <div className="flex items-center">
                    <input
                      id="is_active"
                      name="is_active"
                      type="checkbox"
                      checked={form.is_active}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm font-semibold text-slate-700 cursor-pointer">
                      Activate Notice Immediately
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">save</span>
                          <span>{editingId ? 'Update Notice' : 'Schedule Notice'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </section>

          {/* Live Preview Panel */}
          <section className="sticky top-24 rounded-[2rem] border border-outline-variant/10 bg-[#eef2f6] p-5 sm:p-8 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Card Live Preview</h2>
                <p className="text-xs text-slate-500">See how this popup displays on different devices</p>
              </div>

              {/* Viewport Selectors */}
              <div className="flex rounded-xl bg-slate-200/80 p-1">
                {(['desktop', 'tablet', 'mobile'] as const).map((device) => (
                  <button
                    key={device}
                    type="button"
                    onClick={() => setPreviewDevice(device)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition capitalize ${
                      previewDevice === device ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {device}
                  </button>
                ))}
              </div>
            </div>

            {/* Viewport Box Container */}
            <div className="flex flex-grow items-center justify-center bg-slate-100 rounded-3xl p-6 sm:p-8 border border-slate-200/60 min-h-[450px] transition-all duration-300">
              {/* Notice Card directly rendered */}
              <div
                className="rounded-3xl shadow-lg flex flex-col border transition-all duration-300 w-full"
                style={{
                  backgroundColor: form.bg_color,
                  color: form.text_color,
                  borderColor: form.border_color,
                  maxWidth: previewDevice === 'desktop' ? '480px' : previewDevice === 'tablet' ? '400px' : '300px',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)',
                }}
              >
                {/* Close cross */}
                <div className="flex justify-end px-4 pt-4">
                  <button type="button" className="opacity-70 hover:opacity-100 transition" style={{ color: form.text_color }}>
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                {/* Header Title */}
                <div className="px-6 pb-2 text-center flex flex-col items-center">
                  <div
                    className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border"
                    style={{
                      backgroundColor: `${form.primary_color}12`,
                      borderColor: `${form.primary_color}25`,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ color: form.primary_color }}>
                      campaign
                    </span>
                  </div>
                  <h3
                    className="font-headline font-bold leading-tight"
                    style={{ fontSize: form.title_size, color: form.text_color }}
                  >
                    {form.title.trim() || 'Notice Title'}
                  </h3>
                </div>

                {/* Body Content - Renders full height in preview */}
                <div className="px-6 py-4 flex-grow text-center">
                  {form.content_format === 'html' ? (
                    <div
                      className="text-sm leading-7 select-none prose prose-sm max-w-none"
                      style={{
                        fontSize: form.content_size,
                        fontWeight: form.content_bold ? 'bold' : 'normal',
                        color: form.text_color,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: form.content.trim() || '<p class="opacity-40">Notice body details will render here...</p>',
                      }}
                    />
                  ) : (
                    <p
                      className="text-sm leading-7 whitespace-pre-line select-none"
                      style={{
                        fontSize: form.content_size,
                        fontWeight: form.content_bold ? 'bold' : 'normal',
                        color: form.text_color,
                      }}
                    >
                      {form.content.trim() || 'Notice body details will render here...'}
                    </p>
                  )}
                </div>

                {/* Footer Dismiss Button */}
                <div className="p-6 pt-2 flex justify-center">
                  <button
                    type="button"
                    className="w-full rounded-2xl py-3 text-sm font-bold text-white shadow-sm transition-all"
                    style={{ backgroundColor: form.primary_color }}
                  >
                    Dismiss Notice
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Notices History Section */}
        <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-5 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Scheduled Notices & History</h2>
            <p className="text-xs text-on-surface-variant mt-1">Review active, expired, and upcoming system announcements</p>
          </div>

          {loading ? (
            <div className="overflow-hidden rounded-2xl border border-outline-variant/10">
              <TableRowsSkeleton rows={5} columns={6} />
            </div>
          ) : notices.length === 0 ? (
            <HrmEmptyState
              compact
              icon="campaign"
              title="No notices created yet"
              message="Schedule your first announcement. It will show up for targeted users immediately when they log in."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-outline-variant/10">
              <table className="w-full border-collapse text-left text-sm text-on-surface">
                <thead>
                  <tr className="border-b border-outline-variant/10 bg-surface-container-low font-bold">
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Audience</th>
                    <th className="px-6 py-4">Frequency</th>
                    <th className="px-6 py-4">Format</th>
                    <th className="px-6 py-4">Display Schedule</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {notices.map((notice) => {
                    const status = getNoticeStatus(notice);
                    return (
                      <tr key={notice.id} className="hover:bg-surface-container-lowest/50 transition">
                        <td className="px-6 py-4 font-bold text-slate-800 max-w-[200px] truncate" title={notice.title}>
                          {notice.title}
                        </td>
                        <td className="px-6 py-4 capitalize text-slate-600">
                          {notice.target_audience === 'all' ? 'All Staff' : notice.target_audience}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          {notice.display_frequency === 'always' ? 'Every Login' : 'Once Per Day'}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase border ${
                            notice.content_format === 'html' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'
                          }`}>
                            {notice.content_format}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs leading-5 text-slate-500">
                          <div className="font-semibold text-slate-700">From: {formatDateTimeDisplay(notice.start_time)}</div>
                          <div>To: {formatDateTimeDisplay(notice.end_time)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(notice)}
                              className={`p-1.5 rounded-lg border transition ${
                                notice.is_active
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                  : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
                              }`}
                              title={notice.is_active ? 'Deactivate notice' : 'Activate notice'}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {notice.is_active ? 'visibility' : 'visibility_off'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(notice)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition"
                              title="Edit notice"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(notice.id)}
                              className="p-1.5 rounded-lg border border-rose-100 bg-white text-rose-600 hover:bg-rose-50 transition"
                              title="Delete notice"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
