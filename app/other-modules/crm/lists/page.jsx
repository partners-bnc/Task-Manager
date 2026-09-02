'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  Tag, 
  Globe, 
  Users, 
  Trash2, 
  Edit3, 
  X, 
  Filter, 
  Check, 
  Download, 
  ArrowRight,
  ArrowLeft,
  Layers,
  Sparkles,
  RefreshCw,
  Mail,
  ChevronRight,
  Database,
  Save,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

export default function LeadListsPage() {
  const router = useRouter();

  // Navigation / View Mode: 'grid' (Cards Dashboard) or 'studio' (Split-Panel Editor)
  const [viewMode, setViewMode] = useState('grid');

  // Master Data State
  const [lists, setLists] = useState([]);
  const [availableSources, setAvailableSources] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gridSearchTerm, setGridSearchTerm] = useState('');

  // Selected Active List for Studio Editing & Live Preview
  const [activeListId, setActiveListId] = useState(null);
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  // Left Panel Instant Search Filter State
  const [sourceSearchQuery, setSourceSearchQuery] = useState('');
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  // Right Panel Lead Table State
  const [leadSearchTerm, setLeadSearchTerm] = useState('');

  // Fetch all lists & master leads data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/other-modules/crm/api/lists');
      const data = await res.json();
      if (res.ok) {
        const listData = data.lists || [];
        setLists(listData);
        setAvailableSources(data.available_sources || []);
        setAvailableTags(data.available_tags || []);
        setTotalLeadsCount(data.total_leads || 0);

        // Fetch full leads for live client-side interactive filtering
        const leadsRes = await fetch('/other-modules/crm/api/leads');
        if (leadsRes.ok) {
          const leadsData = await leadsRes.json();
          setAllLeads(leadsData.leads || []);
        }
      }
    } catch (err) {
      console.error("Fetch lists error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Open Studio view for editing a specific list
  const openStudioForList = (list) => {
    if (!list) return;
    setActiveListId(list.list_id);
    setListName(list.name || '');
    setListDescription(list.description || '');
    setSelectedSources(list.selected_sources || []);
    setSelectedTags(list.selected_tags || []);
    setSourceSearchQuery('');
    setTagSearchQuery('');
    setLeadSearchTerm('');
    setViewMode('studio');
  };

  // Open Studio view for creating a new list
  const handleStartNewList = () => {
    setActiveListId('new');
    setListName('New Lead List Bucket');
    setListDescription('');
    setSelectedSources([]);
    setSelectedTags([]);
    setSourceSearchQuery('');
    setTagSearchQuery('');
    setLeadSearchTerm('');
    setViewMode('studio');
  };

  // Return to Cards Grid Dashboard view
  const handleBackToGrid = () => {
    setViewMode('grid');
  };

  // Toggle Source Pill Selection
  const toggleSource = (source) => {
    setSelectedSources(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  // Toggle Tag Pill Selection
  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Save List (Create or Update)
  const handleSaveList = async (e) => {
    if (e) e.preventDefault();
    if (!listName.trim()) {
      alert("Please enter a list name.");
      return;
    }

    setSaving(true);
    try {
      const isNew = activeListId === 'new';
      const payload = {
        name: listName.trim(),
        description: listDescription.trim(),
        selected_sources: selectedSources,
        selected_tags: selectedTags
      };

      const url = '/other-modules/crm/api/lists';
      const method = isNew ? 'POST' : 'PUT';

      if (!isNew) {
        payload.list_id = activeListId;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.list) {
        await fetchData();
        setActiveListId(data.list.list_id);
      } else {
        alert(`Failed to save list: ${data.error}`);
      }
    } catch (err) {
      console.error("Save list error:", err);
      alert(`Error saving list: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete List
  const handleDeleteList = async (list_id, listNameStr, e) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to delete the list "${listNameStr}"? Master lead records will NOT be deleted.`)) return;

    try {
      const res = await fetch(`/other-modules/crm/api/lists?list_id=${list_id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const remainingLists = lists.filter(l => String(l.list_id) !== String(list_id));
        setLists(remainingLists);
        if (viewMode === 'studio') {
          if (remainingLists.length > 0) {
            openStudioForList(remainingLists[0]);
          } else {
            setViewMode('grid');
          }
        }
      } else {
        const data = await res.json();
        alert(`Failed to delete list: ${data.error}`);
      }
    } catch (err) {
      console.error("Delete list error:", err);
    }
  };

  // Instant Search filtered lists for left panel pills
  const filteredSourcesList = useMemo(() => {
    if (!sourceSearchQuery.trim()) return availableSources;
    const q = sourceSearchQuery.toLowerCase().trim();
    return availableSources.filter(s => s.toLowerCase().includes(q));
  }, [availableSources, sourceSearchQuery]);

  const filteredTagsList = useMemo(() => {
    if (!tagSearchQuery.trim()) return availableTags;
    const q = tagSearchQuery.toLowerCase().trim();
    return availableTags.filter(t => t.toLowerCase().includes(q));
  }, [availableTags, tagSearchQuery]);

  // Real-time Matching Leads Calculation based on current left panel selections
  const matchingLeads = useMemo(() => {
    if (!allLeads || allLeads.length === 0) return [];
    if (selectedSources.length === 0 && selectedTags.length === 0) {
      return allLeads; // Default: show all if no filters selected
    }

    const normSources = selectedSources.map(s => s.toLowerCase().trim()).filter(Boolean);
    const normTags = selectedTags.map(t => t.toLowerCase().trim()).filter(Boolean);

    return allLeads.filter(lead => {
      // Source match
      let sourceMatch = normSources.length === 0;
      if (normSources.length > 0 && lead.lead_source) {
        const leadSources = lead.lead_source.split(',').map(s => s.toLowerCase().trim());
        sourceMatch = normSources.some(s => leadSources.includes(s));
      }

      // Tag match
      let tagMatch = normTags.length === 0;
      if (normTags.length > 0 && lead.tags) {
        const leadTags = lead.tags.split(',').map(t => t.toLowerCase().trim());
        tagMatch = normTags.some(t => leadTags.includes(t));
      }

      return sourceMatch && tagMatch;
    });
  }, [allLeads, selectedSources, selectedTags]);

  // Filtered leads inside right panel search
  const filteredMatchingLeads = useMemo(() => {
    if (!leadSearchTerm.trim()) return matchingLeads;
    const term = leadSearchTerm.toLowerCase().trim();
    return matchingLeads.filter(lead => 
      (lead.full_name && lead.full_name.toLowerCase().includes(term)) ||
      (lead.email && lead.email.toLowerCase().includes(term)) ||
      (lead.phone && lead.phone.toLowerCase().includes(term)) ||
      (lead.company_name && lead.company_name.toLowerCase().includes(term)) ||
      (lead.lead_source && lead.lead_source.toLowerCase().includes(term)) ||
      (lead.tags && lead.tags.toLowerCase().includes(term))
    );
  }, [matchingLeads, leadSearchTerm]);

  // Filtered cards for Grid view search
  const filteredGridLists = useMemo(() => {
    if (!gridSearchTerm.trim()) return lists;
    const term = gridSearchTerm.toLowerCase().trim();
    return lists.filter(l => 
      l.name.toLowerCase().includes(term) ||
      (l.description && l.description.toLowerCase().includes(term)) ||
      (l.selected_sources && l.selected_sources.some(s => s.toLowerCase().includes(term))) ||
      (l.selected_tags && l.selected_tags.some(t => t.toLowerCase().includes(term)))
    );
  }, [lists, gridSearchTerm]);

  // Export Filtered Leads to CSV
  const handleExportCSV = () => {
    if (!filteredMatchingLeads || filteredMatchingLeads.length === 0) return;
    const headers = ['Full Name', 'Email', 'Phone', 'Company Name', 'Lead Source', 'Tags', 'Status', 'Category'];
    const rows = filteredMatchingLeads.map(l => [
      `"${(l.full_name || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.company_name || '').replace(/"/g, '""')}"`,
      `"${(l.lead_source || '').replace(/"/g, '""')}"`,
      `"${(l.tags || '').replace(/"/g, '""')}"`,
      `"${(l.lead_status || '').replace(/"/g, '""')}"`,
      `"${(l.lead_category || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(listName || 'lead_list').replace(/\s+/g, '_')}_leads.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // VIEW MODE 1: CARDS GRID DASHBOARD VIEW
  // =========================================================================
  if (viewMode === 'grid') {
    return (
      <div className="flex flex-col h-full min-h-screen bg-slate-50 dark:bg-slate-900 overflow-y-auto">
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl text-white shadow-sm" style={{ backgroundColor: 'rgb(51, 88, 160)' }}>
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Lead Lists & Buckets
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search lists..."
                value={gridSearchTerm}
                onChange={(e) => setGridSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48 md:w-64 transition-all"
              />
            </div>

            <button
              onClick={fetchData}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Refresh Lists"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleStartNewList}
              style={{ backgroundColor: 'rgb(51, 88, 160)' }}
              className="flex items-center gap-2 px-4.5 py-2 text-xs font-semibold rounded-xl text-white shadow-sm hover:opacity-90 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New List</span>
            </button>
          </div>
        </div>

        {/* Main Dashboard Content */}
        <div className="p-6 flex-1 flex flex-col gap-6">
          {/* KPI Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Lists</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{lists.length}</h3>
              </div>
            </div>

            <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tracked Sources</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{availableSources.length}</h3>
              </div>
            </div>

            <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Master CRM Leads</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalLeadsCount}</h3>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'rgb(51, 88, 160)' }} />
              <p className="text-xs font-medium">Loading lists...</p>
            </div>
          ) : filteredGridLists.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                <FolderKanban className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">No Lists Found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {gridSearchTerm ? 'No list matches your search query.' : 'Create your first Lead List (e.g. "5thSep Seminar") and assign Sources & Tags to bucket your leads.'}
                </p>
              </div>
              {!gridSearchTerm && (
                <button
                  onClick={handleStartNewList}
                  style={{ backgroundColor: 'rgb(51, 88, 160)' }}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-sm hover:opacity-90 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create List Now</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGridLists.map((list) => {
                const hasSources = list.selected_sources && list.selected_sources.length > 0;
                const hasTags = list.selected_tags && list.selected_tags.length > 0;

                return (
                  <div
                    key={list.list_id}
                    onClick={() => openStudioForList(list)}
                    className="group relative bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/50 dark:hover:border-blue-500/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-sm">
                            <FolderKanban className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {list.name}
                            </h3>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              Created {list.created_at ? new Date(list.created_at).toLocaleDateString() : 'Recently'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); openStudioForList(list); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                            title="Edit List & View Studio"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteList(list.list_id, list.name, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                            title="Delete List"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      {list.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                          {list.description}
                        </p>
                      )}

                      {/* Filter Badges */}
                      <div className="space-y-2 mb-4">
                        {/* Sources */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Globe className="w-3 h-3" style={{ color: 'rgb(51, 88, 160)' }} /> Sources:
                          </span>
                          {hasSources ? (
                            list.selected_sources.map((src, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40 text-[11px] font-medium">
                                {src}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] italic text-slate-400">All Sources</span>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Tag className="w-3 h-3 text-purple-500" /> Tags:
                          </span>
                          {hasTags ? (
                            list.selected_tags.map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40 text-[11px] font-medium">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] italic text-slate-400">All Tags</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {list.matching_lead_count || 0} Unique Leads
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/other-modules/crm/leads?list_id=${list.list_id}`);
                        }}
                        style={{ color: 'rgb(51, 88, 160)' }}
                        className="inline-flex items-center gap-1 font-bold hover:underline group-hover:translate-x-1 transition-transform cursor-pointer"
                      >
                        View Bucket <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE 2: SPLIT-PANEL STUDIO MODE (WHEN CLICKING A CARD OR EDITING)
  // =========================================================================
  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Studio Top Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToGrid}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Lists</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

          <div className="p-2 rounded-xl text-white shadow-sm" style={{ backgroundColor: 'rgb(51, 88, 160)' }}>
            <FolderKanban className="w-4 h-4" />
          </div>

          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {listName || 'Editing List Bucket'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleStartNewList}
            style={{ backgroundColor: 'rgb(51, 88, 160)' }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-sm hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New List</span>
          </button>
        </div>
      </div>

      {/* Main Full-Page Split-Panel Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: List Configuration & Filter Pills (~410px) */}
        <div className="w-80 md:w-[410px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col shrink-0 overflow-y-auto">
          {/* List Bucket Selector Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-900 bg-slate-50/70 dark:bg-slate-900/50">
            <label className="block text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5">
              Select Saved List Bucket
            </label>
            <div className="relative">
              <select
                value={activeListId || ''}
                onChange={(e) => {
                  const selected = lists.find(l => String(l.list_id) === String(e.target.value));
                  if (selected) openStudioForList(selected);
                  else if (e.target.value === 'new') handleStartNewList();
                }}
                className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
              >
                {lists.map(l => (
                  <option key={l.list_id} value={l.list_id}>
                    📁 {l.name} ({l.matching_lead_count || 0} leads)
                  </option>
                ))}
                <option value="new">+ Create New List Bucket...</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Configuration Form */}
          <div className="p-5 flex-1 space-y-5 overflow-y-auto">
            {/* List Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                List Bucket Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 5thSep Seminar"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <input
                type="text"
                placeholder="Optional details about this event or campaign bucket..."
                value={listDescription}
                onChange={(e) => setListDescription(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <hr className="border-slate-100 dark:border-slate-900" />

            {/* Select Sources Pills */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" style={{ color: 'rgb(51, 88, 160)' }} /> Select Sources to Include
                </label>
                <span className="text-[11px] font-semibold text-slate-400">
                  {selectedSources.length > 0 ? `${selectedSources.length} selected` : 'None (Includes All)'}
                </span>
              </div>

              {/* Instant Search Bar for Sources */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter sources..."
                  value={sourceSearchQuery}
                  onChange={(e) => setSourceSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/50 flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {filteredSourcesList.length === 0 ? (
                  <span className="text-xs italic text-slate-400">No matching sources found.</span>
                ) : (
                  filteredSourcesList.map(src => {
                    const isSelected = selectedSources.includes(src);
                    return (
                      <button
                        type="button"
                        key={src}
                        onClick={() => toggleSource(src)}
                        style={isSelected ? { backgroundColor: 'rgb(51, 88, 160)', borderColor: 'rgb(51, 88, 160)' } : {}}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                          isSelected
                            ? 'text-white shadow-xs'
                            : 'bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{src}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Select Tags Pills */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-purple-500" /> Select Tags to Include
                </label>
                <span className="text-[11px] font-semibold text-slate-400">
                  {selectedTags.length > 0 ? `${selectedTags.length} selected` : 'None (Includes All)'}
                </span>
              </div>

              {/* Instant Search Bar for Tags */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter tags..."
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/50 flex flex-wrap gap-2 max-h-56 overflow-y-auto">
                {filteredTagsList.length === 0 ? (
                  <span className="text-xs italic text-slate-400">No matching tags found.</span>
                ) : (
                  filteredTagsList.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{tag}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Left Panel Action Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
            {activeListId !== 'new' && (
              <button
                type="button"
                onClick={(e) => handleDeleteList(activeListId, listName, e)}
                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Delete List Bucket"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => handleSaveList()}
                disabled={saving}
                style={{ backgroundColor: 'rgb(51, 88, 160)' }}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white hover:opacity-90 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{activeListId === 'new' ? 'Save New List' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Live Data Table (Flex-1) */}
        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-900 overflow-hidden">
          {/* Right Panel Header Bar */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1.5" style={{ backgroundColor: 'rgb(51, 88, 160)' }}>
                <Users className="w-3.5 h-3.5" />
                <span>{filteredMatchingLeads.length} Matching Leads</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Filtered by selected Sources ({selectedSources.length > 0 ? selectedSources.join(', ') : 'All'}) & Tags ({selectedTags.length > 0 ? selectedTags.join(', ') : 'All'})
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter leads in table..."
                  value={leadSearchTerm}
                  onChange={(e) => setLeadSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none w-56"
                />
              </div>

              <button
                onClick={handleExportCSV}
                disabled={filteredMatchingLeads.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-500" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => router.push(`/other-modules/crm/leads?list_id=${activeListId}`)}
                style={{ color: 'rgb(51, 88, 160)' }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Open in Centralized Lead Database"
              >
                <span>Full Lead Database</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table Content Area */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'rgb(51, 88, 160)' }} />
                <p className="text-xs font-semibold">Loading live lead records...</p>
              </div>
            ) : filteredMatchingLeads.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-center px-4">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                <div className="max-w-md">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">No Matching Leads</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    No leads in the CRM match the selected sources or tags on the left panel. Toggle different pills to filter leads.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4"># Lead ID</th>
                      <th className="py-3.5 px-4">Lead Name</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4">Company</th>
                      <th className="py-3.5 px-4">Lead Source</th>
                      <th className="py-3.5 px-4">Tags</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {filteredMatchingLeads.map((lead) => (
                      <tr key={lead.lead_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          #{lead.lead_id}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {lead.full_name || 'Unnamed Lead'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {lead.email || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {lead.phone || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {lead.company_name || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-md font-bold text-[11px] text-white" style={{ backgroundColor: 'rgb(51, 88, 160)' }}>
                            {lead.lead_source || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {lead.tags ? (
                            <div className="flex flex-wrap gap-1">
                              {lead.tags.split(',').map((t, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-200/50 text-[10px] font-bold">
                                  {t.trim()}
                                </span>
                              ))}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {lead.lead_status || 'New'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Panel Footer Status */}
          <div className="px-6 py-2.5 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span>Showing {filteredMatchingLeads.length} of {allLeads.length} total master leads</span>
            <span className="font-semibold text-slate-400">Real-time dynamic filtering active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
