"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/utils/supabase/client';
import { useToast } from '../context/ToastContext';
import * as XLSX from 'xlsx';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Edit,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Briefcase,
  Globe,
  Tag,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  UserCheck,
  Upload,
  Database,
  Sparkles,
  RefreshCw,
  Play,
  FileText,
  Check,
  ArrowRight,
  Flag,
  SlidersHorizontal,
  GraduationCap,
  Activity,
  Folder
} from 'lucide-react';

const supabase = createClient();

// Hardcoded Options
const SOURCES = ["Website", "CA Data", "Saudi Data", "Client Data", "Referral", "Cold List", "Other"];
const CATEGORIES = ["Hot", "Warm", "Cold"];
const TYPES = ["B2B", "B2C", "New Lead", "Existing Client"];
const STATUSES = ["New", "Contacted", "Follow-up", "Qualified", "Converted", "Lost"];
const PRIORITIES = ["High", "Medium", "Low", "Urgent"];
const COMPANY_SIZES = ["1-10", "11-50", "51-200", "200+"];

const COLUMNS = [
  { key: 'lead_id', label: 'ID' },
  { key: 'full_name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'phone_alt', label: 'Alt Phone' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'email_alt', label: 'Alt Email' },
  { key: 'company_name', label: 'Company' },
  { key: 'designation', label: 'Designation' },
  { key: 'industry', label: 'Industry' },
  { key: 'website', label: 'Website' },
  { key: 'company_size', label: 'Company Size' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'business_city', label: 'Biz City' },
  { key: 'business_country', label: 'Biz Country' },
  { key: 'lead_source', label: 'Source' },
  { key: 'lead_category', label: 'Category' },
  { key: 'lead_type', label: 'Lead Type' },
  { key: 'lead_status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'tags', label: 'Tags' },
  { key: 'assigned_to', label: 'Assigned To' },
  { key: 'source_batch', label: 'Source Batch' },
  { key: 'notes', label: 'Notes' },
  { key: 'next_followup_date', label: 'Next Followup' },
  { key: 'last_contacted', label: 'Last Contacted' },
  { key: 'created_at', label: 'Created At' },
  { key: 'created_by', label: 'Created By' },
  { key: 'updated_at', label: 'Updated At' },
  { key: 'updated_by', label: 'Updated By' },
];

const COLUMN_OPTIONS = {
  priority: ['Low', 'Medium', 'High'],
  lead_status: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Nurturing', 'Lost'],
  gender: ['Male', 'Female', 'Other'],
  salutation: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'],
  preferred_contact_method: ['Email', 'Phone', 'WhatsApp', 'LinkedIn'],
  email_consent_status: ['Subscribed', 'Unsubscribed', 'Pending'],
  company_size: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
};

const DB_COLUMNS_MAPPING = [
  { key: 'full_name', label: 'Full Name', icon: User },
  { key: 'phone', label: 'Primary Phone', note: 'At least one Email/Phone required', icon: Phone },
  { key: 'email', label: 'Primary Email', note: 'At least one Email/Phone required', icon: Mail },
  { key: 'phone_alt', label: 'Alternate Phone', icon: Phone },
  { key: 'whatsapp', label: 'WhatsApp Number', icon: Phone },
  { key: 'email_alt', label: 'Alternate Email', icon: Mail },
  { key: 'country', label: 'Country', icon: MapPin },
  { key: 'city', label: 'City', icon: MapPin },
  { key: 'state', label: 'State', icon: MapPin },
  { key: 'salutation', label: 'Salutation', icon: User },
  { key: 'gender', label: 'Gender', icon: User },
  { key: 'date_of_birth', label: 'Date of Birth', icon: Calendar },
  { key: 'company_name', label: 'Company Name', icon: Building2 },
  { key: 'designation', label: 'Designation', icon: Briefcase },
  { key: 'industry', label: 'Industry', icon: Briefcase },
  { key: 'website', label: 'Website', icon: Globe },
  { key: 'company_size', label: 'Company Size', icon: Building2 },
  { key: 'business_country', label: 'Business Country', icon: MapPin },
  { key: 'business_city', label: 'Business City', icon: MapPin },
  { key: 'primary_business_email', label: 'Primary Business Email', icon: Mail },
  { key: 'additional_emails', label: 'Additional Business Emails', icon: Mail },
  { key: 'company_image_url', label: 'Company Image URL', icon: Globe },
  { key: 'business_phone', label: 'Business Phone', icon: Phone },
  { key: 'lead_source', label: 'Lead Source', icon: Tag },
  { key: 'lead_category', label: 'Lead Category', icon: Tag },
  { key: 'lead_type', label: 'Lead Type', icon: Tag },
  { key: 'lead_status', label: 'Lead Status', icon: Tag },
  { key: 'priority', label: 'Priority', icon: Tag },
  { key: 'tags', label: 'Tags (comma separated)', icon: Tag },
  { key: 'assigned_to', label: 'Assigned To', icon: UserCheck },
  { key: 'notes', label: 'Notes', icon: FileText },
  { key: 'next_followup_date', label: 'Next Follow-up Date', icon: Calendar },
  { key: 'last_contacted', label: 'Last Contacted', icon: Calendar },
  { key: 'timezone', label: 'Time Zone', icon: Globe },
  { key: 'preferred_language', label: 'Preferred Language', icon: HelpCircle },
  { key: 'preferred_contact_method', label: 'Preferred Contact Method', icon: HelpCircle },
  { key: 'linkedin_url', label: 'LinkedIn Profile URL', icon: Globe },
  { key: 'twitter_url', label: 'Twitter / X URL', icon: Globe },
  { key: 'github_url', label: 'GitHub Profile URL', icon: Globe },
  { key: 'portfolio_url', label: 'Portfolio Website URL', icon: Globe },
  { key: 'email_consent_status', label: 'Email Consent Status', icon: CheckCircle },
  { key: 'consent_source', label: 'Consent Source', icon: CheckCircle },
  { key: 'lead_score', label: 'Lead Score', icon: Sparkles },
  { key: 'skills', label: 'Skills', icon: Sparkles },
  { key: 'experience_company_name', label: 'Work Exp: Company Name', icon: Briefcase },
  { key: 'experience_job_title', label: 'Work Exp: Job Title', icon: Briefcase },
  { key: 'experience_joining_date', label: 'Work Exp: Joining Date', icon: Calendar },
  { key: 'experience_leave_date', label: 'Work Exp: Leave Date', icon: Calendar },
  { key: 'experience_duration_years', label: 'Work Exp: Duration (Years)', icon: Briefcase },
  { key: 'experience_company_industry', label: 'Work Exp: Company Industry', icon: Briefcase },
  { key: 'experience_skills_used', label: 'Work Exp: Skills Used', icon: Sparkles },
  { key: 'experience_responsibilities', label: 'Work Exp: Responsibilities', icon: FileText },
  { key: 'education_institution_name', label: 'Education: Institution Name', icon: GraduationCap },
  { key: 'education_degree', label: 'Education: Degree', icon: GraduationCap },
  { key: 'education_field_of_study', label: 'Education: Field of Study', icon: GraduationCap },
  { key: 'education_start_date', label: 'Education: Start Date', icon: Calendar },
  { key: 'education_end_date', label: 'Education: End Date', icon: Calendar },
  { key: 'education_grade', label: 'Education: Grade', icon: GraduationCap },
  { key: 'education_activities', label: 'Education: Activities', icon: FileText },
];

const MAPPING_SECTIONS = [
  {
    id: 1,
    title: 'Personal Details & Contacts',
    icon: User,
    color: 'from-blue-550 to-indigo-600 dark:from-blue-600 dark:to-indigo-700',
    keys: ['full_name', 'phone', 'email', 'phone_alt', 'whatsapp', 'email_alt', 'salutation', 'gender', 'date_of_birth', 'country', 'city', 'state']
  },
  {
    id: 2,
    title: 'Business & Company Details',
    icon: Building2,
    color: 'from-purple-550 to-pink-600 dark:from-purple-650 dark:to-pink-700',
    keys: ['company_name', 'designation', 'industry', 'website', 'company_size', 'business_country', 'business_city', 'primary_business_email', 'additional_emails', 'company_image_url', 'business_phone']
  },
  {
    id: 3,
    title: 'Lead Classification & Status',
    icon: Tag,
    color: 'from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700',
    keys: ['lead_source', 'lead_category', 'lead_type', 'lead_status', 'priority', 'tags', 'assigned_to', 'notes', 'next_followup_date', 'last_contacted']
  },
  {
    id: 4,
    title: 'Social & Portfolio Links',
    icon: Globe,
    color: 'from-teal-550 to-emerald-600 dark:from-teal-650 dark:to-emerald-700',
    keys: ['linkedin_url', 'twitter_url', 'github_url', 'portfolio_url']
  },
  {
    id: 5,
    title: 'Outreach & Consent Details',
    icon: Mail,
    color: 'from-rose-550 to-red-600 dark:from-rose-650 dark:to-red-700',
    keys: ['email_consent_status', 'consent_source', 'lead_score', 'skills', 'timezone', 'preferred_language', 'preferred_contact_method']
  },
  {
    id: 6,
    title: 'Work Experience History',
    icon: Briefcase,
    color: 'from-violet-550 to-fuchsia-600 dark:from-violet-650 dark:to-fuchsia-700',
    keys: [
      'experience_company_name', 'experience_job_title', 'experience_joining_date',
      'experience_leave_date', 'experience_duration_years', 'experience_company_industry',
      'experience_skills_used', 'experience_responsibilities'
    ]
  },
  {
    id: 7,
    title: 'Education History',
    icon: GraduationCap,
    color: 'from-cyan-550 to-sky-600 dark:from-cyan-650 dark:to-sky-700',
    keys: [
      'education_institution_name', 'education_degree', 'education_field_of_study',
      'education_start_date', 'education_end_date', 'education_grade', 'education_activities'
    ]
  }
];

const parseDateString = (str) => {
  if (!str) return null;
  const s = String(str).trim();
  if (!s || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') {
    return null;
  }

  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return s;
  }

  // Try DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed month
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Try standard JS Date parsing
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return null; // invalid date string
};

const formatExcelValue = (val) => {
  if (val === undefined || val === null) return '';
  if (val instanceof Date) {
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const dd = String(val.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Check if it's a number or numeric string in Excel serial range (30000 - 60000)
  const num = Number(val);
  if (!isNaN(num) && num >= 30000 && num <= 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + num * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return String(val).trim();
};

export default function LeadsPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Data state
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dynamic unique option lists — derived ONLY from actual database values (no static mixing)
  const allUniqueSources = useMemo(() => {
    return Array.from(new Set(leads.map(l => l.lead_source?.trim()).filter(Boolean))).sort();
  }, [leads]);

  const allUniqueStatuses = useMemo(() => {
    return Array.from(new Set(leads.map(l => l.lead_status?.trim()).filter(Boolean))).sort();
  }, [leads]);

  const allUniqueCategories = useMemo(() => {
    return Array.from(new Set(leads.map(l => l.lead_category?.trim()).filter(Boolean))).sort();
  }, [leads]);

  const allUniquePriorities = useMemo(() => {
    return Array.from(new Set(leads.map(l => l.priority?.trim()).filter(Boolean))).sort();
  }, [leads]);

  const allUniqueTypes = useMemo(() => {
    return Array.from(new Set(leads.map(l => l.lead_type?.trim()).filter(Boolean))).sort();
  }, [leads]);

  const allUniqueTags = useMemo(() => {
    // Tags may contain comma-separated values in a single field
    const tagSet = new Set();
    leads.forEach(l => {
      if (l.tags) {
        l.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tagSet.add(t));
      }
    });
    return Array.from(tagSet).sort();
  }, [leads]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [tagsFilter, setTagsFilter] = useState('All');

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const defaultVisible = {
      lead_id: true,
      full_name: true,
      phone: true,
      phone_alt: false,
      whatsapp: true,
      email: true,
      email_alt: false,
      company_name: true,
      designation: false,
      industry: false,
      website: false,
      company_size: false,
      city: false,
      state: false,
      country: false,
      business_city: false,
      business_country: false,
      lead_source: true,
      lead_category: true,
      lead_type: true,
      lead_status: true,
      priority: true,
      tags: true,
      assigned_to: false,
      source_batch: false,
      notes: false,
      next_followup_date: true,
      last_contacted: false,
      created_at: false,
      created_by: false,
      updated_at: false,
      updated_by: false,
    };
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_leads_columns');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && 'lead_id' in parsed) {
            return { ...defaultVisible, ...parsed };
          }
        } catch (e) {
          // ignore
        }
      }
    }
    return defaultVisible;
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // Sync visible columns to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('crm_leads_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Sorting
  const [sortField, setSortField] = useState('industry');
  const [sortDirection, setSortDirection] = useState('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' or 'edit'
  const [currentLeadId, setCurrentLeadId] = useState(null);

  // Form input state
  const [formData, setFormData] = useState(getDefaultFormData());
  const [customSource, setCustomSource] = useState('');
  const [customType, setCustomType] = useState('');

  // Expandable form sections
  const [expandedSections, setExpandedSections] = useState({
    1: true,  // Personal
    2: false, // Business
    3: false, // Classification
    4: false  // Tracking
  });

  // Expandable mapping sections
  const [expandedMappingSections, setExpandedMappingSections] = useState({
    1: true,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false
  });

  // Duplicate Warning Modal state
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Delete Confirmation Modal
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // Bulk selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [bulkEditField, setBulkEditField] = useState('');
  const [bulkEditValue, setBulkEditValue] = useState('');

  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    company_name: '',
    designation: '',
    industry: '',
    website: '',
    company_size: '',
    business_country: '',
    business_city: '',
    lead_source: 'Website',
    lead_category: 'Warm',
    lead_type: 'New Lead',
    lead_status: 'New',
    priority: 'Medium',
    tags: '',
    assigned_to: ''
  });
  const [bulkEditSelectedFields, setBulkEditSelectedFields] = useState({
    company_name: false,
    designation: false,
    industry: false,
    website: false,
    company_size: false,
    business_country: false,
    business_city: false,
    lead_source: false,
    lead_category: false,
    lead_type: false,
    lead_status: false,
    priority: false,
    tags: false,
    assigned_to: false
  });
  const [expandedBulkSections, setExpandedBulkSections] = useState({
    2: true,
    3: false,
    4: false
  });
  const toggleBulkSection = (sec) => {
    setExpandedBulkSections(prev => ({
      ...prev,
      [sec]: !prev[sec]
    }));
  };

  const [bulkCustomSource, setBulkCustomSource] = useState('');
  const [bulkCustomType, setBulkCustomType] = useState('');

  // Bulk Importer premium wizard state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importFileName, setImportFileName] = useState('');
  const [importFileType, setImportFileType] = useState(''); // 'csv' | 'xlsx' | 'json'
  const [uploadedHeaders, setUploadedHeaders] = useState([]);
  const [uploadedRows, setUploadedRows] = useState([]);
  const [columnMappings, setColumnMappings] = useState({});
  const [columnDefaults, setColumnDefaults] = useState({});
  const [importStep, setImportStep] = useState(1); // 1: Source Selection, 2: Preview & Clean, 3: Schema Mapping, 4: Defaults Configuration, 5: Conflict Resolution, 6: Animated Loading, 7: Success
  const [duplicateLeadsFound, setDuplicateLeadsFound] = useState([]);
  const [importConflictStrategy, setImportConflictStrategy] = useState('skip'); // 'skip', 'overwrite', 'anyway'
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [currentImportPhase, setCurrentImportPhase] = useState('');
  const [importResults, setImportResults] = useState({ inserted: 0, updated: 0, skipped: 0 });
  const [importTicker, setImportTicker] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importWarnings, setImportWarnings] = useState([]);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheetName, setSelectedSheetName] = useState('');

  const dynamicSources = useMemo(() => {
    const existing = leads.map(l => l.lead_source).filter(Boolean);
    const combined = Array.from(new Set([...SOURCES, ...existing]));
    const filtered = combined.filter(s => s !== 'Other');
    return [...filtered, 'Other'];
  }, [leads]);

  const dynamicTypes = useMemo(() => {
    const existing = leads.map(l => l.lead_type).filter(Boolean);
    const combined = Array.from(new Set([...TYPES, ...existing]));
    const filtered = combined.filter(t => t !== 'Other');
    return [...filtered, 'Other'];
  }, [leads]);

  // Load Leads from Central Server API
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/other-modules/crm/api/leads?sortField=${sortField}&sortDirection=${sortDirection}`);
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Failed to fetch leads');
      }
      const data = await response.json();
      setLeads(data.leads || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load leads from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [sortField, sortDirection]);

  // Reset selected leads on list changes
  useEffect(() => {
    setSelectedLeadIds(new Set());
  }, [statusFilter, sourceFilter, categoryFilter, priorityFilter, typeFilter, tagsFilter, searchTerm, currentPage, sortField, sortDirection]);

  function getDefaultFormData() {
    return {
      full_name: '',
      phone: '',
      phone_alt: '',
      whatsapp: '',
      email: '',
      email_alt: '',
      country: '',
      city: '',
      state: '',
      company_name: '',
      designation: '',
      industry: '',
      website: '',
      company_size: '',
      business_country: '',
      business_city: '',
      lead_source: 'Website',
      lead_category: 'Warm',
      lead_type: 'B2B',
      lead_status: 'New',
      priority: 'Medium',
      tags: '',
      assigned_to: '',
      notes: '',
      next_followup_date: '',
      last_contacted: '',

      // New Core Profiling Fields
      salutation: '',
      gender: '',
      date_of_birth: '',
      timezone: 'UTC',
      preferred_language: 'English',
      linkedin_url: '',
      twitter_url: '',
      github_url: '',
      portfolio_url: '',
      email_consent_status: 'Subscribed',
      consent_source: '',
      preferred_contact_method: 'Email',
      lead_score: 0,
      skills: '',
      custom_fields: {},

      // Business Details New Fields
      primary_business_email: '',
      additional_emails: '',
      company_image_url: '',
      business_phone: '',

      // Relational Lists
      experiences: [],
      educations: []
    };
  }

  // Handle Input Changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addExperienceField = () => {
    setFormData(prev => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        {
          company_name: '',
          job_title: '',
          joining_date: '',
          leave_date: '',
          duration_years: '',
          company_industry: '',
          responsibilities: '',
          skills_used: ''
        }
      ]
    }));
  };

  const handleExperienceChange = (index, field, value) => {
    setFormData(prev => {
      const nextExp = [...prev.experiences];
      nextExp[index] = { ...nextExp[index], [field]: value };
      return { ...prev, experiences: nextExp };
    });
  };

  const removeExperienceField = (index) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index)
    }));
  };

  const addEducationField = () => {
    setFormData(prev => ({
      ...prev,
      educations: [
        ...prev.educations,
        {
          institution_name: '',
          degree: '',
          field_of_study: '',
          start_date: '',
          end_date: '',
          grade: '',
          activities: ''
        }
      ]
    }));
  };

  const handleEducationChange = (index, field, value) => {
    setFormData(prev => {
      const nextEdu = [...prev.educations];
      nextEdu[index] = { ...nextEdu[index], [field]: value };
      return { ...prev, educations: nextEdu };
    });
  };

  const removeEducationField = (index) => {
    setFormData(prev => ({
      ...prev,
      educations: prev.educations.filter((_, i) => i !== index)
    }));
  };

  const toggleSection = (sectionIndex) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionIndex]: !prev[sectionIndex]
    }));
  };

  // Toggle Sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Form Validation
  const validateForm = (data) => {
    const hasEmail = data.email?.trim() || data.email_alt?.trim() || data.primary_business_email?.trim();
    const hasPhone = data.phone?.trim() || data.phone_alt?.trim() || data.whatsapp?.trim() || data.business_phone?.trim();
    if (!hasEmail && !hasPhone) {
      toast.error('At least one contact method (Email, Phone, or WhatsApp) must be provided.');
      return false;
    }
    if (data.experiences && Array.isArray(data.experiences)) {
      for (let i = 0; i < data.experiences.length; i++) {
        const exp = data.experiences[i];
        if (!exp.company_name?.trim() || !exp.job_title?.trim()) {
          toast.error(`Experience #${i + 1} requires Company Name and Job Title.`);
          return false;
        }
      }
    }
    if (data.educations && Array.isArray(data.educations)) {
      for (let i = 0; i < data.educations.length; i++) {
        const edu = data.educations[i];
        if (!edu.institution_name?.trim()) {
          toast.error(`Education #${i + 1} requires Institution Name.`);
          return false;
        }
      }
    }
    return true;
  };

  // Check manual duplicates before saving
  const checkDuplicateAndSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(formData)) return;

    setActionLoading(true);
    try {
      const finalSource = formData.lead_source === 'Other' ? customSource : formData.lead_source;
      const finalType = formData.lead_type === 'Other' ? customType : formData.lead_type;

      const finalLeadData = {
        ...formData,
        lead_source: finalSource,
        lead_type: finalType,
        // Trim strings
        full_name: formData.full_name ? formData.full_name.trim() : null,
        phone: formData.phone ? formData.phone.trim() : null,
        email: formData.email ? formData.email.trim() : null,
        email_alt: formData.email_alt ? formData.email_alt.trim() : null,
        primary_business_email: formData.primary_business_email ? formData.primary_business_email.trim() : null,
        additional_emails: formData.additional_emails ? formData.additional_emails.split(',').map(e => e.trim()).filter(Boolean) : [],
        company_image_url: formData.company_image_url ? formData.company_image_url.trim() : null,
        business_phone: formData.business_phone ? formData.business_phone.trim() : null,
      };

      // Check duplicate phone or email (only if they are filled)
      let existingLead = null;
      if (finalLeadData.phone || finalLeadData.email) {
        const queryParams = new URLSearchParams();
        if (finalLeadData.phone) queryParams.set('phones', finalLeadData.phone);
        if (finalLeadData.email) queryParams.set('emails', finalLeadData.email);

        const response = await fetch(`/other-modules/crm/api/leads?${queryParams.toString()}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to check duplicates');
        }
        let { leads: fetchedLeads } = await response.json();
        if (formMode === 'edit' && currentLeadId) {
          fetchedLeads = fetchedLeads.filter(item => item.lead_id !== currentLeadId);
        }
        if (fetchedLeads && fetchedLeads.length > 0) {
          existingLead = fetchedLeads[0];
        }
      }

      if (existingLead) {
        // Duplicate found! Show warning prompt
        setDuplicateWarning({
          existing: existingLead,
          pending: finalLeadData
        });
        setActionLoading(false);
      } else {
        // No duplicate, save directly
        await saveLead(finalLeadData);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error checking duplicate records.');
      setActionLoading(false);
    }
  };

  const saveLead = async (leadData) => {
    setActionLoading(true);
    try {
      if (formMode === 'create') {
        const response = await fetch('/other-modules/crm/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData)
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to create lead');
        }
        toast.success('Lead created successfully!');
      } else {
        const response = await fetch('/other-modules/crm/api/leads', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...leadData, lead_id: currentLeadId })
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to update lead');
        }
        toast.success('Lead updated successfully!');
      }

      setIsFormOpen(false);
      setFormData(getDefaultFormData());
      setDuplicateWarning(null);
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error(`Database Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicateResolve = async (strategy) => {
    if (!duplicateWarning) return;
    const { existing, pending } = duplicateWarning;

    if (strategy === 'skip') {
      toast.info('Operation cancelled. Duplicate skipped.');
      setDuplicateWarning(null);
    } else if (strategy === 'overwrite') {
      // Overwrite the existing lead details
      setActionLoading(true);
      try {
        const response = await fetch('/other-modules/crm/api/leads', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...pending, lead_id: existing.lead_id })
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to overwrite lead');
        }

        toast.success('Existing lead overwritten successfully!');
        setIsFormOpen(false);
        setFormData(getDefaultFormData());
        setDuplicateWarning(null);
        fetchLeads();
      } catch (err) {
        console.error(err);
        toast.error(`Failed to overwrite lead: ${err.message}`);
      } finally {
        setActionLoading(false);
      }
    } else if (strategy === 'anyway') {
      // Insert anyway (will create another record)
      await saveLead(pending);
    }
  };

  // Open Create Form
  const openCreateForm = () => {
    setFormMode('create');
    setFormData(getDefaultFormData());
    setCustomSource('');
    setCustomType('');
    setExpandedSections({ 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false });
    setIsFormOpen(true);
  };

  // Open Edit Form
  const openEditForm = async (lead) => {
    if (selectedLeadIds.size > 1) {
      if (!selectedLeadIds.has(lead.lead_id)) {
        setSelectedLeadIds(prev => {
          const next = new Set(prev);
          next.add(lead.lead_id);
          return next;
        });
      }
      setBulkCustomSource('');
      setBulkCustomType('');
      setBulkEditData({
        company_name: '',
        designation: '',
        industry: '',
        website: '',
        company_size: '',
        business_country: '',
        business_city: '',
        lead_source: 'Website',
        lead_category: 'Warm',
        lead_type: 'New Lead',
        lead_status: 'New',
        priority: 'Medium',
        tags: '',
        assigned_to: ''
      });
      setBulkEditSelectedFields({
        company_name: false,
        designation: false,
        industry: false,
        website: false,
        company_size: false,
        business_country: false,
        business_city: false,
        lead_source: false,
        lead_category: false,
        lead_type: false,
        lead_status: false,
        priority: false,
        tags: false,
        assigned_to: false
      });
      setExpandedBulkSections({
        2: true,
        3: false,
        4: false
      });
      setIsBulkEditModalOpen(true);
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/other-modules/crm/api/leads?lead_id=${lead.lead_id}`);
      if (!response.ok) throw new Error("Failed to fetch lead details");
      const data = await response.json();
      const fullLead = data.lead;

      setFormMode('edit');
      setCurrentLeadId(fullLead.lead_id);

      const sourceExists = SOURCES.includes(fullLead.lead_source);
      const typeExists = TYPES.includes(fullLead.lead_type);

      setFormData({
        full_name: fullLead.full_name || '',
        phone: fullLead.phone || '',
        phone_alt: fullLead.phone_alt || '',
        whatsapp: fullLead.whatsapp || '',
        email: fullLead.email || '',
        email_alt: fullLead.email_alt || '',
        country: fullLead.country || '',
        city: fullLead.city || '',
        state: fullLead.state || '',
        company_name: fullLead.company_name || '',
        designation: fullLead.designation || '',
        industry: fullLead.industry || '',
        website: fullLead.website || '',
        company_size: fullLead.company_size || '',
        business_country: fullLead.business_country || '',
        business_city: fullLead.business_city || '',
        lead_source: sourceExists ? fullLead.lead_source : (fullLead.lead_source ? 'Other' : 'Website'),
        lead_category: fullLead.lead_category || 'Warm',
        lead_type: typeExists ? fullLead.lead_type : (fullLead.lead_type ? 'Other' : 'B2B'),
        lead_status: fullLead.lead_status || 'New',
        priority: fullLead.priority || 'Medium',
        tags: fullLead.tags || '',
        assigned_to: fullLead.assigned_to || '',
        notes: fullLead.notes || '',
        next_followup_date: fullLead.next_followup_date || '',
        last_contacted: fullLead.last_contacted || '',

        salutation: fullLead.salutation || '',
        gender: fullLead.gender || '',
        date_of_birth: fullLead.date_of_birth || '',
        timezone: fullLead.timezone || 'UTC',
        preferred_language: fullLead.preferred_language || 'English',
        linkedin_url: fullLead.linkedin_url || '',
        twitter_url: fullLead.twitter_url || '',
        github_url: fullLead.github_url || '',
        portfolio_url: fullLead.portfolio_url || '',
        email_consent_status: fullLead.email_consent_status || 'Subscribed',
        consent_source: fullLead.consent_source || '',
        preferred_contact_method: fullLead.preferred_contact_method || 'Email',
        lead_score: fullLead.lead_score || 0,
        skills: fullLead.skills || '',
        custom_fields: fullLead.custom_fields || {},

        primary_business_email: fullLead.primary_business_email || '',
        additional_emails: Array.isArray(fullLead.additional_emails) ? fullLead.additional_emails.join(', ') : (typeof fullLead.additional_emails === 'string' ? fullLead.additional_emails : ''),
        company_image_url: fullLead.company_image_url || '',
        business_phone: fullLead.business_phone || '',

        experiences: fullLead.experiences || [],
        educations: fullLead.educations || []
      });

      setCustomSource(sourceExists ? '' : (fullLead.lead_source || ''));
      setCustomType(typeExists ? '' : (fullLead.lead_type || ''));

      setExpandedSections({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true });
      setIsFormOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load full lead details for editing.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Handler
  const confirmDeleteLead = (lead) => {
    setDeleteConfirmId(lead.lead_id);
    setDeleteConfirmName(lead.full_name || lead.company_name || 'Unnamed Lead');
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/other-modules/crm/api/leads?lead_id=${deleteConfirmId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete lead');
      }
      toast.success('Lead deleted successfully!');
      setDeleteConfirmId(null);
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to delete lead: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Actions Methods
  const handleBulkUpdate = async () => {
    if (selectedLeadIds.size === 0) return;
    if (!bulkEditField) {
      toast.error("Please select a field to update.");
      return;
    }
    setActionLoading(true);
    try {
      const response = await fetch('/other-modules/crm/api/leads/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ids: Array.from(selectedLeadIds),
          updates: { [bulkEditField]: bulkEditValue }
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update leads');
      }
      toast.success(`Successfully updated ${selectedLeadIds.size} leads.`);
      setSelectedLeadIds(new Set());
      setBulkEditField('');
      setBulkEditValue('');
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error(`Bulk update failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkEditSubmit = async () => {
    const updates = {};
    let hasUpdates = false;

    Object.keys(bulkEditSelectedFields).forEach(field => {
      if (bulkEditSelectedFields[field]) {
        if (field === 'lead_source' && bulkEditData.lead_source === 'Other') {
          updates[field] = bulkCustomSource || 'Other';
        } else if (field === 'lead_type' && bulkEditData.lead_type === 'Other') {
          updates[field] = bulkCustomType || 'Other';
        } else {
          updates[field] = bulkEditData[field];
        }
        hasUpdates = true;
      }
    });

    if (!hasUpdates) {
      toast.error("Please select at least one field to update.");
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch('/other-modules/crm/api/leads/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ids: Array.from(selectedLeadIds),
          updates
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update leads');
      }

      toast.success(`Successfully updated ${selectedLeadIds.size} leads.`);
      setSelectedLeadIds(new Set());
      setIsBulkEditModalOpen(false);
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error(`Bulk update failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedLeadIds.size} selected leads?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const response = await fetch('/other-modules/crm/api/leads/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ids: Array.from(selectedLeadIds)
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete leads');
      }
      toast.success(`Successfully deleted ${selectedLeadIds.size} leads.`);
      setSelectedLeadIds(new Set());
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error(`Bulk delete failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Upgraded Importer File/Folder/Sheet Traversals
  const getAllFilesFromEntries = async (dataTransferItems) => {
    const files = [];
    const traverseEntry = (entry) => {
      return new Promise((resolve) => {
        if (entry.isFile) {
          entry.file((file) => {
            const ext = file.name.split('.').pop().toLowerCase();
            if (['xlsx', 'xls', 'csv', 'json'].includes(ext)) {
              files.push(file);
            }
            resolve();
          }, () => resolve());
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          const readEntriesPromise = () => {
            return new Promise((resolveRead) => {
              dirReader.readEntries(async (entries) => {
                if (entries.length === 0) {
                  resolveRead();
                } else {
                  for (const childEntry of entries) {
                    await traverseEntry(childEntry);
                  }
                  await readEntriesPromise();
                  resolveRead();
                }
              }, () => resolveRead());
            });
          };
          readEntriesPromise().then(resolve);
        } else {
          resolve();
        }
      });
    };

    const promises = [];
    for (let i = 0; i < dataTransferItems.length; i++) {
      const item = dataTransferItems[i];
      if (item.kind === 'file') {
        const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
        if (entry) {
          promises.push(traverseEntry(entry));
        } else {
          const file = item.getAsFile();
          if (file) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (['xlsx', 'xls', 'csv', 'json'].includes(ext)) {
              files.push(file);
            }
          }
        }
      }
    }
    await Promise.all(promises);
    return files;
  };

  const handleMultipleFiles = async (filesList, batchName) => {
    setActionLoading(true);
    setImportFileName(batchName);
    try {
      const sheetsDataPromises = filesList.map(file => {
        return new Promise((resolve, reject) => {
          const extension = file.name.split('.').pop().toLowerCase();
          const reader = new FileReader();

          reader.onload = (evt) => {
            try {
              const bstr = evt.target.result;
              const fileSheets = [];

              if (extension === 'json') {
                const json = JSON.parse(bstr);
                let rawData = [];
                if (Array.isArray(json)) {
                  rawData = json;
                } else {
                  const arrayKey = Object.keys(json).find(key => Array.isArray(json[key]));
                  if (arrayKey) {
                    rawData = json[arrayKey];
                  } else {
                    rawData = [json];
                  }
                }
                const headerSet = new Set();
                rawData.forEach(item => {
                  Object.keys(item).forEach(k => headerSet.add(k));
                });
                fileSheets.push({
                  sheetName: file.name,
                  headers: Array.from(headerSet),
                  rows: rawData
                });
              } else {
                // Parse Excel / CSV using XLSX
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                wb.SheetNames.forEach(wsname => {
                  const ws = wb.Sheets[wsname];
                  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
                  if (rawData.length > 0) {
                    const headers = rawData[0].map(h => String(h || '').trim());
                    const rows = rawData.slice(1).map(row => {
                      const obj = {};
                      headers.forEach((header, index) => {
                        obj[header] = row[index] !== undefined && row[index] !== null ? formatExcelValue(row[index]) : '';
                      });
                      return obj;
                    });
                    fileSheets.push({
                      sheetName: `${file.name} - ${wsname}`,
                      headers,
                      rows
                    });
                  }
                });
              }
              resolve(fileSheets);
            } catch (err) {
              reject(new Error(`Error parsing ${file.name}: ${err.message}`));
            }
          };

          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));

          if (extension === 'json') {
            reader.readAsText(file);
          } else {
            reader.readAsBinaryString(file);
          }
        });
      });

      const allFilesSheets = await Promise.all(sheetsDataPromises);
      const flattenedSheets = allFilesSheets.flat();

      if (flattenedSheets.length === 0) {
        toast.error("No valid sheets or records found in selected files.");
        setActionLoading(false);
        return;
      }

      setAvailableSheets(flattenedSheets);
      const defaultSheet = flattenedSheets[0];
      setSelectedSheetName(defaultSheet.sheetName);

      setUploadedHeaders(defaultSheet.headers);
      setUploadedRows(defaultSheet.rows);

      // Prepopulate mapping guesses based on default sheet headers
      const mappingGuesses = {};
      DB_COLUMNS_MAPPING.forEach(dbCol => {
        const target = dbCol.key.replace(/_/g, '').toLowerCase();
        const match = defaultSheet.headers.find(h => {
          const normalizedH = h.replace(/[\s_-]/g, '').toLowerCase();
          return normalizedH === target || normalizedH.includes(target) || target.includes(normalizedH);
        });
        if (match) mappingGuesses[dbCol.key] = match;
      });
      setColumnMappings(mappingGuesses);

      // Set file types to a combined summary
      const extensions = Array.from(new Set(filesList.map(f => f.name.split('.').pop().toLowerCase())));
      setImportFileType(extensions.join(', '));

      // Display dynamic summary message
      toast.success(`Loaded ${filesList.length} file(s) and ${flattenedSheets.length} sheet(s). Defaulted to "${defaultSheet.sheetName}" with ${defaultSheet.rows.length} rows.`);
      setImportStep(2); // Go to Preview
    } catch (err) {
      console.error(err);
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const autoMatchColumns = () => {
    const mappingGuesses = {};
    DB_COLUMNS_MAPPING.forEach(dbCol => {
      const target = dbCol.key.replace(/_/g, '').toLowerCase();
      const match = uploadedHeaders.find(h => {
        const normalizedH = h.replace(/[\s_-]/g, '').toLowerCase();
        return normalizedH === target || normalizedH.includes(target) || target.includes(normalizedH);
      });
      if (match) mappingGuesses[dbCol.key] = match;
    });
    setColumnMappings(mappingGuesses);
    toast.success("Auto-mapped columns based on headers.");
  };

  const handleSheetChange = (sheetName) => {
    const sheet = availableSheets.find(s => s.sheetName === sheetName);
    if (!sheet) return;

    setSelectedSheetName(sheetName);
    setUploadedHeaders(sheet.headers);
    setUploadedRows(sheet.rows);

    // Reset warnings and errors
    setImportErrors([]);
    setImportWarnings([]);

    // Re-run auto match for new headers
    const mappingGuesses = {};
    DB_COLUMNS_MAPPING.forEach(dbCol => {
      const target = dbCol.key.replace(/_/g, '').toLowerCase();
      const match = sheet.headers.find(h => {
        const normalizedH = h.replace(/[\s_-]/g, '').toLowerCase();
        return normalizedH === target || normalizedH.includes(target) || target.includes(normalizedH);
      });
      if (match) mappingGuesses[dbCol.key] = match;
    });
    setColumnMappings(mappingGuesses);
    toast.success(`Switched sheet to "${sheetName.split(' - ').slice(1).join(' - ') || sheetName}"`);
  };

  const resetImportState = () => {
    setImportFile(null);
    setImportFileName('');
    setImportFileType('');
    setUploadedHeaders([]);
    setUploadedRows([]);
    setColumnMappings({});
    setColumnDefaults({});
    setDuplicateLeadsFound([]);
    setImportConflictStrategy('skip');
    setImportStep(1);
    setAnimatedProgress(0);
    setCurrentImportPhase('');
    setImportErrors([]);
    setImportWarnings([]);
    setAvailableSheets([]);
    setSelectedSheetName('');
  };

  // Map raw imported rows to schema-compliant leads (converting empty dates/fields to null)
  const getMappedLeads = () => {
    return uploadedRows.map(row => {
      const item = {
        source_batch: importFileName || 'Bulk Import'
      };

      DB_COLUMNS_MAPPING.forEach(col => {
        const mappedHeader = columnMappings[col.key];
        let val = null;

        if (mappedHeader && row[mappedHeader] !== undefined && row[mappedHeader] !== null) {
          val = String(row[mappedHeader]).trim();
          if (val === "" || val.toLowerCase() === "n/a" || val.toLowerCase() === "null" || val.toLowerCase() === "undefined") {
            val = null;
          }
        }

        // If the row value is empty/null, check if a custom default constant is specified
        let customDefault = columnDefaults[col.key];
        if (col.key === 'lead_source' && customDefault === 'Other') {
          customDefault = columnDefaults.lead_source_custom;
        }
        if (col.key === 'lead_type' && customDefault === 'Other') {
          customDefault = columnDefaults.lead_type_custom;
        }

        if ((val === null || val === "") && customDefault !== undefined && customDefault !== null && customDefault !== "") {
          val = String(customDefault).trim();
        }

        if (val !== null) {
          if (col.key.endsWith('date') || col.key === 'last_contacted' || col.key === 'date_of_birth') {
            // Parse date to ensure standard format (YYYY-MM-DD) or null
            item[col.key] = parseDateString(val);
          } else if (col.key === 'lead_score') {
            const intVal = parseInt(val, 10);
            item[col.key] = isNaN(intVal) ? 0 : intVal;
          } else {
            item[col.key] = val;
          }
        } else {
          // System default values for empty column slots
          if (col.key === 'lead_status') item[col.key] = 'New';
          else if (col.key === 'lead_category') item[col.key] = 'Warm';
          else if (col.key === 'priority') item[col.key] = 'Medium';
          else if (col.key === 'lead_type') item[col.key] = 'B2B';
          else if (col.key === 'lead_score') item[col.key] = 0;
          else item[col.key] = null;
        }
      });

      // Gather experience fields if present
      const exp = {};
      if (item.experience_company_name) exp.company_name = item.experience_company_name;
      if (item.experience_job_title) exp.job_title = item.experience_job_title;
      if (item.experience_joining_date) exp.joining_date = item.experience_joining_date;
      if (item.experience_leave_date) exp.leave_date = item.experience_leave_date;
      if (item.experience_duration_years) exp.duration_years = parseFloat(item.experience_duration_years) || null;
      if (item.experience_company_industry) exp.company_industry = item.experience_company_industry;
      if (item.experience_skills_used) exp.skills_used = item.experience_skills_used;
      if (item.experience_responsibilities) exp.responsibilities = item.experience_responsibilities;

      if (exp.company_name || exp.job_title) {
        item.experiences = [exp];
      } else {
        item.experiences = [];
      }

      // Gather education fields if present
      const edu = {};
      if (item.education_institution_name) edu.institution_name = item.education_institution_name;
      if (item.education_degree) edu.degree = item.education_degree;
      if (item.education_field_of_study) edu.field_of_study = item.education_field_of_study;
      if (item.education_start_date) edu.start_date = item.education_start_date;
      if (item.education_end_date) edu.end_date = item.education_end_date;
      if (item.education_grade) edu.grade = item.education_grade;
      if (item.education_activities) edu.activities = item.education_activities;

      if (edu.institution_name) {
        item.educations = [edu];
      } else {
        item.educations = [];
      }

      // Clean up flat experience/education keys from the top-level lead item
      // to avoid passing database-unsupported keys to crm_leads table
      const experienceKeys = [
        'experience_company_name', 'experience_job_title', 'experience_joining_date',
        'experience_leave_date', 'experience_duration_years', 'experience_company_industry',
        'experience_skills_used', 'experience_responsibilities'
      ];
      const educationKeys = [
        'education_institution_name', 'education_degree', 'education_field_of_study',
        'education_start_date', 'education_end_date', 'education_grade', 'education_activities'
      ];
      experienceKeys.forEach(k => delete item[k]);
      educationKeys.forEach(k => delete item[k]);

      // Format additional_emails as an array
      if (item.additional_emails && typeof item.additional_emails === 'string') {
        item.additional_emails = item.additional_emails.split(',').map(e => e.trim()).filter(Boolean);
      } else if (!Array.isArray(item.additional_emails)) {
        item.additional_emails = [];
      }

      if (!item.full_name || !item.full_name.trim()) {
        item.full_name = item.company_name || "Unknown Lead";
      }

      return item;
    });
  };

  const performImportValidation = () => {
    const errors = [];
    const warnings = [];

    if (!columnMappings.full_name && !columnMappings.company_name) {
      warnings.push("Neither 'Full Name' nor 'Company Name' are mapped. Defaulting lead names to 'Unknown Lead'.");
    }

    const nameSrc = columnMappings.full_name;
    const companySrc = columnMappings.company_name;
    const phoneSrc = columnMappings.phone;
    const emailSrc = columnMappings.email;
    const nextFollowupSrc = columnMappings.next_followup_date;
    const lastContactedSrc = columnMappings.last_contacted;

    uploadedRows.forEach((row, idx) => {
      const rowNum = idx + 1;

      // Check name/company
      const hasNameVal = (nameSrc && String(row[nameSrc] || '').trim()) || 
                         (companySrc && String(row[companySrc] || '').trim()) ||
                         (columnDefaults.full_name || '').trim() ||
                         (columnDefaults.company_name || '').trim();
      if (!hasNameVal) {
        warnings.push(`Row ${rowNum}: Name and Company are both empty. Defaulting to 'Unknown Lead'.`);
      }

      // Check contact details (any email, phone, or whatsapp is acceptable)
      const phoneVal = phoneSrc ? String(row[phoneSrc] || '').trim() : (columnDefaults.phone || '');
      const phoneAltVal = columnMappings.phone_alt ? String(row[columnMappings.phone_alt] || '').trim() : (columnDefaults.phone_alt || '');
      const whatsappVal = columnMappings.whatsapp ? String(row[columnMappings.whatsapp] || '').trim() : (columnDefaults.whatsapp || '');
      const busPhoneVal = columnMappings.business_phone ? String(row[columnMappings.business_phone] || '').trim() : (columnDefaults.business_phone || '');

      const emailVal = emailSrc ? String(row[emailSrc] || '').trim() : (columnDefaults.email || '');
      const emailAltVal = columnMappings.email_alt ? String(row[columnMappings.email_alt] || '').trim() : (columnDefaults.email_alt || '');
      const busEmailVal = columnMappings.primary_business_email ? String(row[columnMappings.primary_business_email] || '').trim() : (columnDefaults.primary_business_email || '');

      if (!phoneVal && !phoneAltVal && !whatsappVal && !busPhoneVal && !emailVal && !emailAltVal && !busEmailVal) {
        warnings.push(`Row ${rowNum}: All email and phone fields are empty. This lead will be skipped.`);
      }

      // Check dates
      if (nextFollowupSrc) {
        const val = String(row[nextFollowupSrc] || '').trim();
        if (val && val.toLowerCase() !== 'n/a' && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'undefined') {
          const parsed = parseDateString(val);
          if (!parsed) {
            errors.push(`Row ${rowNum}: "Next Followup Date" contains invalid date/text: "${val}".`);
          }
        }
      }

      if (lastContactedSrc) {
        const val = String(row[lastContactedSrc] || '').trim();
        if (val && val.toLowerCase() !== 'n/a' && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'undefined') {
          const parsed = parseDateString(val);
          if (!parsed) {
            errors.push(`Row ${rowNum}: "Last Contacted" contains invalid date/text: "${val}".`);
          }
        }
      }

      // Check new date fields
      const dateFieldsToCheck = [
        { src: columnMappings.date_of_birth, label: "Date of Birth" },
        { src: columnMappings.experience_joining_date, label: "Work Exp: Joining Date" },
        { src: columnMappings.experience_leave_date, label: "Work Exp: Leave Date" },
        { src: columnMappings.education_start_date, label: "Education: Start Date" },
        { src: columnMappings.education_end_date, label: "Education: End Date" }
      ];

      dateFieldsToCheck.forEach(f => {
        if (f.src) {
          const val = String(row[f.src] || '').trim();
          if (val && val.toLowerCase() !== 'n/a' && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'undefined') {
            const parsed = parseDateString(val);
            if (!parsed) {
              errors.push(`Row ${rowNum}: "${f.label}" contains invalid date/text: "${val}".`);
            }
          }
        }
      });
    });

    setImportErrors(errors);
    setImportWarnings(warnings);
    return errors.length === 0;
  };

  const validateAndRouteToDefaultsScreen = () => {
    setImportErrors([]);
    setImportWarnings([]);
    const isValid = performImportValidation();
    if (!isValid) {
      toast.error("Validation failed. Please review the errors at the top of the mapping screen.");
      return;
    }
    setImportStep(4); // Go to Defaults Screen (Step 4)!
  };

  const validateAndRouteToDuplicateCheck = async () => {
    setImportErrors([]);
    setImportWarnings([]);
    const isValid = performImportValidation();
    if (!isValid) {
      toast.error("Validation failed. Please review the errors at the top of the mapping screen.");
      return;
    }
    await handleMappingSubmit();
  };
  const handleMappingSubmit = async () => {
    setActionLoading(true);
    try {
      const mappedLeads = getMappedLeads();
      // Filter out invalid rows (must have a name or company, and at least one phone or email contact detail)
      const validLeads = mappedLeads.filter(l =>
        (l.full_name || l.company_name) &&
        (l.phone || l.phone_alt || l.whatsapp || l.business_phone || l.email || l.email_alt || l.primary_business_email)
      );

      if (validLeads.length === 0) {
        toast.error("No valid leads found in import file. (Required: Name/Company + at least one email or phone contact detail)");
        setActionLoading(false);
        return;
      }

      // Check for duplicates in the DB based on phone or email
      const phonesToCheck = validLeads.map(l => l.phone).filter(Boolean);
      const emailsToCheck = validLeads.map(l => l.email).filter(Boolean);

      let existingInDb = [];

      if (phonesToCheck.length > 0 || emailsToCheck.length > 0) {
        const queryParams = new URLSearchParams();
        if (phonesToCheck.length > 0) queryParams.set('phones', phonesToCheck.join(','));
        if (emailsToCheck.length > 0) queryParams.set('emails', emailsToCheck.join(','));

        const response = await fetch(`/other-modules/crm/api/leads?${queryParams.toString()}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to check duplicates');
        }
        const data = await response.json();
        existingInDb = data.leads || [];
      }

      const duplicates = [];
      existingInDb.forEach(dbItem => {
        const matchingLead = validLeads.find(l =>
          (l.phone && l.phone === dbItem.phone) ||
          (l.email && l.email === dbItem.email)
        );
        if (matchingLead) {
          duplicates.push({
            imported: matchingLead,
            existing: dbItem
          });
        }
      });

      if (duplicates.length > 0) {
        setDuplicateLeadsFound(duplicates);
        setImportStep(5); // Duplicate resolution selection (Step 5)
      } else {
        // Go straight to import pipeline
        executeBulkImportDirectly(validLeads, existingInDb);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Validation failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const executeBulkImportWithResolution = async () => {
    setActionLoading(true);
    try {
      const mappedLeads = getMappedLeads();
      const validLeads = mappedLeads.filter(l =>
        (l.full_name || l.company_name) &&
        (l.phone || l.phone_alt || l.whatsapp || l.business_phone || l.email || l.email_alt || l.primary_business_email)
      );

      // Re-fetch duplicate matches
      const phonesToCheck = validLeads.map(l => l.phone).filter(Boolean);
      const emailsToCheck = validLeads.map(l => l.email).filter(Boolean);

      let existingInDb = [];

      if (phonesToCheck.length > 0 || emailsToCheck.length > 0) {
        const queryParams = new URLSearchParams();
        if (phonesToCheck.length > 0) queryParams.set('phones', phonesToCheck.join(','));
        if (emailsToCheck.length > 0) queryParams.set('emails', emailsToCheck.join(','));

        const response = await fetch(`/other-modules/crm/api/leads?${queryParams.toString()}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to check duplicates');
        }
        const data = await response.json();
        existingInDb = data.leads || [];
      }

      executeBulkImportDirectly(validLeads, existingInDb);
    } catch (err) {
      console.error(err);
      toast.error(`Import failed: ${err.message}`);
      setActionLoading(false);
    }
  };

  const executeBulkImportDirectly = async (validLeads, existingInDb) => {
    setImportStep(6); // Animated full-screen load stage (Step 6)
    setAnimatedProgress(5);
    setCurrentImportPhase("Analyzing data feed headers...");
    setImportTicker([]);

    try {
      await new Promise(r => setTimeout(r, 450));
      setAnimatedProgress(20);
      setCurrentImportPhase("Sanitizing phone/email structures and auditing columns...");

      let userDetails = 'System';
      try {
        const ctxRes = await fetch('/api/auth/context');
        const ctxData = await ctxRes.json();
        if (ctxData.authenticated && ctxData.user) {
          userDetails = `${ctxData.user.name} (${ctxData.user.email})`;
        }
      } catch (e) {
        console.error("Failed to fetch client auth context:", e);
      }

      await new Promise(r => setTimeout(r, 450));
      setAnimatedProgress(40);
      setCurrentImportPhase("Mapping to active schema metadata and matching duplicates...");

      const leadsToInsert = [];
      const leadsToUpdate = [];
      let skippedCount = 0;

      validLeads.forEach(lead => {
        const duplicateMatch = existingInDb.find(dbItem =>
          (lead.phone && dbItem.phone === lead.phone) ||
          (lead.email && dbItem.email === lead.email)
        );

        if (duplicateMatch) {
          if (importConflictStrategy === 'overwrite') {
            leadsToUpdate.push(lead);
          } else if (importConflictStrategy === 'anyway') {
            leadsToInsert.push(lead);
          } else {
            skippedCount++;
          }
        } else {
          leadsToInsert.push(lead);
        }
      });

      // Show real-time ticker feedback
      setAnimatedProgress(60);
      setCurrentImportPhase(`Ingesting transactions (${leadsToInsert.length} insert, ${leadsToUpdate.length} update)...`);

      const allOps = [
        ...leadsToInsert.map(l => ({ type: 'INSERT', name: l.full_name })),
        ...leadsToUpdate.map(l => ({ type: 'UPDATE', name: l.full_name }))
      ];

      // Quick ticker simulation for lead pipeline UX feedback
      const tickerSampleCount = Math.min(allOps.length, 12);
      for (let i = 0; i < tickerSampleCount; i++) {
        const op = allOps[i];
        setImportTicker(prev => [
          ...prev.slice(-6),
          `[${op.type}] Syncing: "${op.name}" ... OK`
        ]);
        await new Promise(r => setTimeout(r, 100));
      }

      setAnimatedProgress(80);
      setCurrentImportPhase("Committing transactions to crm_leads in database via secure api...");

      const response = await fetch('/other-modules/crm/api/leads/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leads: validLeads,
          strategy: importConflictStrategy,
          userDetails
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to complete transaction in backend.');
      }

      setAnimatedProgress(95);
      setCurrentImportPhase("Rebuilding indices and refreshing Central database views...");
      await new Promise(r => setTimeout(r, 400));

      const validationSkippedCount = getMappedLeads().length - validLeads.length;
      setAnimatedProgress(100);
      setImportResults({
        inserted: resData.inserted || 0,
        updated: resData.updated || 0,
        skipped: (resData.skipped || 0) + validationSkippedCount
      });
      setImportStep(7); // Summary (Step 7)
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error(`Import failed: ${err.message}`);
      setImportStep(3);
    } finally {
      setActionLoading(false);
    }
  };



  // Fuzzy Search & Filters applied locally/client-side on top of fetched leads
  const processedLeads = useMemo(() => {
    const res = leads.filter(lead => {
      // Search term match: name, phone, email
      const searchStr = searchTerm.toLowerCase().trim();
      const nameMatch = lead.full_name?.toLowerCase().includes(searchStr);
      const phoneMatch = lead.phone?.toLowerCase().includes(searchStr);
      const emailMatch = lead.email?.toLowerCase().includes(searchStr);
      const matchesSearch = !searchStr || nameMatch || phoneMatch || emailMatch;

      // Filter matches (case-insensitive & trimmed comparison to handle messy/imported data)
      const matchesStatus = statusFilter === 'All' ||
        (lead.lead_status?.trim().toLowerCase() === statusFilter.trim().toLowerCase());
      const matchesSource = sourceFilter === 'All' ||
        (lead.lead_source?.trim().toLowerCase() === sourceFilter.trim().toLowerCase());
      const matchesCategory = categoryFilter === 'All' ||
        (lead.lead_category?.trim().toLowerCase() === categoryFilter.trim().toLowerCase());
      const matchesPriority = priorityFilter === 'All' ||
        (lead.priority?.trim().toLowerCase() === priorityFilter.trim().toLowerCase());
      const matchesType = typeFilter === 'All' ||
        (lead.lead_type?.trim().toLowerCase() === typeFilter.trim().toLowerCase());
      const matchesTags = tagsFilter === 'All' ||
        (lead.tags && lead.tags.split(',').map(t => t.trim().toLowerCase()).includes(tagsFilter.trim().toLowerCase()));

      return matchesSearch && matchesStatus && matchesSource && matchesCategory && matchesPriority && matchesType && matchesTags;
    });

    return res;
  }, [leads, searchTerm, statusFilter, sourceFilter, categoryFilter, priorityFilter, typeFilter, tagsFilter]);

  // Pagination Slice
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [processedLeads, currentPage]);

  const totalPages = Math.ceil(processedLeads.length / itemsPerPage) || 1;

  // Stats Counters
  const stats = useMemo(() => {
    const total = leads.length;
    const hotLeads = leads.filter(l => l.lead_category === 'Hot').length;
    const converted = leads.filter(l => l.lead_status === 'Converted').length;
    const qualifiedLeads = leads.filter(l => l.lead_status === 'Qualified').length;

    return { total, hotLeads, converted, qualifiedLeads };
  }, [leads]);

  // Priority Flag Badge
  const getPriorityFlag = (priority) => {
    switch (priority) {
      case 'Urgent':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
            <Flag className="w-3.5 h-3.5 fill-red-500 text-red-500 shrink-0" />
            Urgent
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
            <Flag className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
            <Flag className="w-3.5 h-3.5 fill-blue-500 text-blue-500 shrink-0" />
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
            <Flag className="w-3.5 h-3.5 fill-slate-400 text-slate-400 shrink-0" />
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
            <Flag className="w-3.5 h-3.5 fill-slate-400 text-slate-400 shrink-0" />
            {priority}
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    const base = "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ";
    switch (status) {
      case 'New':
        return <span className={base + "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-100 dark:border-blue-800"}>New</span>;
      case 'Contacted':
        return <span className={base + "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"}>Contacted</span>;
      case 'Follow-up':
        return <span className={base + "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-100 dark:border-amber-800"}>Follow-up</span>;
      case 'Qualified':
        return <span className={base + "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 border border-teal-100 dark:border-teal-800"}>Qualified</span>;
      case 'Converted':
        return <span className={base + "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-100 dark:border-green-800"}>Converted</span>;
      case 'Lost':
        return <span className={base + "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 border border-rose-100 dark:border-rose-800"}>Lost</span>;
      default:
        return <span className={base + "bg-slate-50 text-slate-700 dark:bg-slate-900/20 dark:text-slate-300 border border-slate-100 dark:border-slate-800"}>{status}</span>;
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'Hot':
        return <span className="text-red-600 dark:text-red-400 font-bold">🔥 Hot</span>;
      case 'Warm':
        return <span className="text-orange-500 dark:text-orange-400 font-semibold">☀️ Warm</span>;
      case 'Cold':
        return <span className="text-blue-500 dark:text-blue-400">❄️ Cold</span>;
      default:
        return category;
    }
  };

  if (isImportOpen) {
    return (
      <div className="p-6 md:p-8 min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 text-slate-800 dark:text-slate-100">
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes bounceBubble {
            0%, 100% { transform: translateY(0px) scale(1); opacity: 0.4; }
            50% { transform: translateY(-20px) scale(1.1); opacity: 0.8; }
          }
          @keyframes glowPulse {
            0%, 100% { filter: drop-shadow(0 0 15px rgba(37, 89, 165, 0.4)); }
            50% { filter: drop-shadow(0 0 35px rgba(37, 89, 165, 0.7)); }
          }
          .custom-spinner {
            border: 3px solid rgba(37, 89, 165, 0.1);
            border-top: 3px solid rgb(37, 89, 165);
            border-radius: 50%;
            width: 70px;
            height: 70px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          /* Global Color Overrides to Brand Color rgb(37, 89, 165) */
          .text-indigo-600, .text-indigo-500, .text-indigo-650 {
            color: rgb(37, 89, 165) !important;
          }
          .bg-indigo-600, .bg-indigo-500, .bg-indigo-650 {
            background-color: rgb(37, 89, 165) !important;
          }
          .border-indigo-600, .border-indigo-500, .border-indigo-650, .border-indigo-200 {
            border-color: rgb(37, 89, 165) !important;
          }
          .bg-indigo-55, .bg-indigo-50 {
            background-color: rgba(37, 89, 165, 0.08) !important;
          }
          .text-indigo-850 {
            color: rgb(27, 65, 120) !important;
          }
          .bg-indigo-100 {
            background-color: rgba(37, 89, 165, 0.15) !important;
          }
          .hover\:bg-indigo-700:hover, .hover\:bg-indigo-600:hover {
            background-color: rgb(27, 65, 120) !important;
          }
          .focus\:ring-indigo-500:focus {
            --tw-ring-color: rgb(37, 89, 165) !important;
          }
          
          /* Soften all slate borders and black colors to support modern card structures */
          .border-slate-100, .border-slate-150, .border-slate-200, .border-slate-205, .border-slate-250, .border-slate-300, .border-slate-350, .border-slate-400 {
            border-color: rgba(226, 232, 240, 0.6) !important;
          }
          .dark .border-slate-900, .dark .border-slate-800, .dark .border-slate-850, .dark .border-slate-700 {
            border-color: rgba(51, 65, 85, 0.35) !important;
          }
          
          /* Card shadow & border soft styling */
          .shadow-sm {
            box-shadow: 0 4px 12px rgba(37, 89, 165, 0.03), 0 1px 3px rgba(37, 89, 165, 0.02) !important;
          }
          .rounded-2xl {
            border-radius: 1rem !important;
          }
        `}} />

        {/* FULL PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-6 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-tr from-indigo-500 to-blue-500 text-white rounded-2xl shadow-md">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Centralized Lead Importer</h1>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase rounded-full bg-indigo-100 text-indigo-850 dark:bg-indigo-950/50 dark:text-indigo-350 border border-indigo-205 dark:border-indigo-800/60">
                  Multi-Source
                </span>
              </div>
              <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
                Centralized pipeline to map, validate, and inject spreadsheet and JSON lead databases.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              resetImportState();
              setIsImportOpen(false);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 rounded-xl transition cursor-pointer border border-slate-250 dark:border-slate-800"
          >
            <X className="w-4 h-4" />
            Exit Importer
          </button>
        </div>

        {/* STEP STATUS TRACKER */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 p-5 rounded-2xl mb-8 flex justify-center items-center shadow-sm">
          {/* STEP INDICATORS */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { num: 1, label: 'Upload' },
              { num: 2, label: 'Preview' },
              { num: 3, label: 'Mapping' },
              { num: 4, label: 'Defaults' },
              { num: 5, label: 'Conflict' },
              { num: 6, label: 'Ingest' },
              { num: 7, label: 'Summary' }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                {idx > 0 && (
                  <div className={`w-6 sm:w-10 h-0.5 ${importStep >= step.num ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                )}
                <div className="flex items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${importStep === step.num
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/60'
                    : importStep > step.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-450 dark:text-slate-500'
                    }`}>
                    {importStep > step.num ? <Check className="w-4.5 h-4.5" /> : step.num}
                  </div>
                  <span className={`text-[10.5px] font-bold hidden sm:inline ${importStep === step.num ? 'text-indigo-605 dark:text-indigo-400' : 'text-slate-450 dark:text-slate-500'
                    }`}>
                    {step.label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* MAIN PANEL CONTENT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 md:p-8 rounded-3xl shadow-sm transition-colors duration-300">

          {/* STEP 1: SOURCE SELECTION */}
          {importStep === 1 && (
            <div className="max-w-2xl mx-auto py-8 text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">Upload your Data Feed</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Select a standard data file format below. We support Microsoft Excel (.xlsx/.xls), Comma Separated Values (.csv), and standard structured JSON lists.
                </p>
              </div>

              {/* Drag-and-drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer?.items) {
                    const files = await getAllFilesFromEntries(e.dataTransfer.items);
                    if (files.length > 0) {
                      handleMultipleFiles(files, "Dropped items");
                    } else {
                      toast.error("No valid CSV, Excel, or JSON files found in dropped items.");
                    }
                  }
                }}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-950/20 transition shadow-sm hover:shadow-md group"
              >
                <input
                  type="file"
                  id="bulk-file-input"
                  accept=".xlsx,.xls,.csv,.json"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      handleMultipleFiles(files, files.length === 1 ? files[0].name : `${files.length} selected files`);
                    }
                  }}
                  className="hidden"
                />
                <input
                  type="file"
                  id="bulk-folder-input"
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).filter(file => {
                      const ext = file.name.split('.').pop().toLowerCase();
                      return ['xlsx', 'xls', 'csv', 'json'].includes(ext);
                    });
                    if (files.length > 0) {
                      const relativePath = files[0].webkitRelativePath || '';
                      const folderName = relativePath.split('/')[0] || 'Selected Folder';
                      handleMultipleFiles(files, `Folder: ${folderName}`);
                    } else {
                      toast.error("No valid CSV, Excel, or JSON files found in selected folder.");
                    }
                  }}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition duration-300">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Drag and drop files or folders here, or click to browse
                  </p>
                  <p className="text-[10px] text-slate-455 mt-1">
                    Supports Excel (XLSX/XLS), CSV, or JSON
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById('bulk-file-input')?.click()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    Select Files
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('bulk-folder-input')?.click()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-750 dark:hover:bg-slate-650 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer border border-slate-700"
                  >
                    Select Folder
                  </button>
                </div>
              </div>

              {/* Format Pills */}
              <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-450">
                <span className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 px-3.5 py-1.5 rounded-full shadow-sm">
                  <FileText className="w-4 h-4 text-emerald-500" /> Excel (.xlsx)
                </span>
                <span className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 px-3.5 py-1.5 rounded-full shadow-sm">
                  <FileText className="w-4 h-4 text-blue-500" /> CSV (.csv)
                </span>
                <span className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 px-3.5 py-1.5 rounded-full shadow-sm">
                  <FileText className="w-4 h-4 text-amber-500" /> JSON (.json)
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: FULL WIDE DATA PREVIEW */}
          {importStep === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Import File Preview</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Verify all details and columns of the parsed records before configuring database mapping.
                  </p>
                </div>

                {/* Sheet Selection if multiple sheets are loaded */}
                {availableSheets.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-extrabold text-slate-505 dark:text-slate-400 whitespace-nowrap">
                      Select Sheet:
                    </label>
                    <select
                      value={selectedSheetName}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                    >
                      {availableSheets.map((sheet, index) => (
                        <option key={index} value={sheet.sheetName}>
                          {sheet.sheetName.split(' - ').slice(1).join(' - ') || sheet.sheetName} ({sheet.rows.length} rows)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/60 self-start">
                  Total Parsed Rows: {uploadedRows.length}
                </div>
              </div>

              {/* Full-width preview table */}
              <div className="border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse table-auto">
                    <thead>
                      <tr className="border-b border-slate-150 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 sticky top-0 backdrop-blur-sm">
                        {uploadedHeaders.map((header, idx) => (
                          <th key={idx} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {uploadedRows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                          {uploadedHeaders.map((header, colIdx) => (
                            <td key={colIdx} className="py-2.5 px-4 text-xs text-slate-700 dark:text-slate-350 font-mono whitespace-nowrap">
                              {row[header] !== undefined && row[header] !== null ? String(row[header]) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/20 text-center text-slate-455 font-semibold text-[10.5px] border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Showing all {uploadedRows.length} imported leads with all matching columns.
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={resetImportState}
                  className="px-4.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Back / Cancel
                </button>
                <button
                  onClick={() => setImportStep(3)}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition shadow-sm hover:shadow cursor-pointer"
                >
                  Next: Match Schema <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SCHEMA MAPPING */}
          {importStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Central Schema Mapping</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Align your import document headers to the central CRM lead schema. Green indicates successfully mapped fields.
                  </p>
                </div>
                <button
                  onClick={autoMatchColumns}
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-indigo-650 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> Auto-Map Fields
                </button>
              </div>

              {/* Validation error display if present */}
              {importErrors.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 p-4 rounded-xl shadow-sm mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 w-full">
                      <h4 className="text-sm font-bold text-rose-800 dark:text-rose-350">
                        Formatting &amp; Validation Conflicts Detected
                      </h4>
                      <p className="text-xs text-rose-700 dark:text-rose-450">
                        We found formatting issues in the fields of your upload. Standardize these fields or map them to different source columns before launching ingestion:
                      </p>
                      <div className="mt-3 max-h-[150px] overflow-y-auto bg-white/50 dark:bg-black/30 p-3 rounded-lg border border-rose-200/50 dark:border-rose-900/30 text-rose-900 dark:text-rose-300 font-mono text-[11px] leading-relaxed space-y-1">
                        {importErrors.map((err, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="text-rose-400 font-bold">•</span>
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation warning/skip display if present */}
              {importWarnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-550 shrink-0 mt-0.5" />
                    <div className="space-y-1 w-full">
                      <h4 className="text-sm font-bold text-amber-850 dark:text-amber-305">
                        Skipped Records Detected ({importWarnings.length} leads will be skipped)
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-450">
                        The following rows do not contain a phone number or email address and will be automatically skipped during ingestion:
                      </p>
                      <div className="mt-3 max-h-[150px] overflow-y-auto bg-white/50 dark:bg-black/30 p-3 rounded-lg border border-amber-200/50 dark:border-amber-900/30 text-amber-900 dark:text-amber-300 font-mono text-[11px] leading-relaxed space-y-1">
                        {importWarnings.map((warn, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{warn}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Seven Section Accordions */}
              <div className="space-y-4">
                {MAPPING_SECTIONS.map((section) => {
                  const sectionCols = section.keys
                    .map(k => DB_COLUMNS_MAPPING.find(c => c.key === k))
                    .filter(Boolean);

                  // Calculate how many fields in this section are mapped
                  const mappedCount = sectionCols.filter(col => !!columnMappings[col.key]).length;
                  const totalCount = sectionCols.length;
                  const isExpanded = !!expandedMappingSections[section.id];

                  // Determine if this section has any missing required fields (if any exist)
                  const hasMissingRequired = sectionCols.some(col => col.required && !columnMappings[col.key]);

                  const IconComp = section.icon;

                  return (
                    <div
                      key={section.id}
                      className={`group border rounded-3xl transition-all duration-300 shadow-sm bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/40 hover:border-slate-350 dark:hover:border-slate-700`}
                    >
                      {/* Section Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedMappingSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50/20 dark:bg-slate-950/5 font-bold text-sm transition select-none cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 flex items-center justify-center bg-gradient-to-tr ${section.color} text-white rounded-2xl shadow-md transition-transform duration-300 group-hover:scale-110 shrink-0`}>
                            <IconComp className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <span className="text-slate-800 dark:text-slate-200 text-sm font-extrabold">
                              {section.title}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10.5px] font-semibold text-slate-450 dark:text-slate-500">
                                {mappedCount} of {totalCount} fields mapped
                              </span>
                              {hasMissingRequired && (
                                <span className="text-[9px] font-extrabold uppercase bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 px-1.5 py-0.5 rounded animate-pulse">
                                  Missing Required
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          {mappedCount === totalCount ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/40 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-250 dark:border-emerald-900/40">
                              Completed
                            </span>
                          ) : mappedCount > 0 ? (
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100/40 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full border border-indigo-250 dark:border-indigo-900/40">
                              In Progress
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 bg-slate-105 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              Not Mapped
                            </span>
                          )}
                          {isExpanded ? <ChevronUp className="w-4.5 h-4.5 text-slate-400" /> : <ChevronDown className="w-4.5 h-4.5 text-slate-400" />}
                        </div>
                      </button>

                      {/* Section Body */}
                      {isExpanded && (
                        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                            {sectionCols.map((col) => {
                              const selectedVal = columnMappings[col.key] || '';
                              const isMapped = !!selectedVal;
                              const ColIcon = col.icon || Tag;

                              return (
                                <div key={col.key} className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border transition-all duration-205 ${isMapped 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-500/50 dark:border-emerald-500/40 shadow-sm' 
                                  : 'bg-slate-50/30 dark:bg-slate-950/10 border-slate-100 dark:border-slate-850'
                                }`}>
                                  {/* Left side: Schema Field info */}
                                  <div className="flex flex-col justify-center">
                                    <div className="flex items-center gap-2">
                                      <ColIcon className={`w-4 h-4 shrink-0 transition-colors duration-205 ${isMapped ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`} />
                                      <span className={`text-[11.5px] font-bold transition-colors duration-200 ${isMapped 
                                        ? 'text-emerald-900 dark:text-emerald-350' 
                                        : 'text-slate-700 dark:text-slate-350'
                                      }`}>
                                        {col.label}
                                      </span>
                                      {col.required && (
                                        <span className="text-[8px] font-extrabold uppercase bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 px-1 py-0.5 rounded">Required</span>
                                      )}
                                    </div>
                                    <span className={`text-[9.5px] mt-0.5 truncate max-w-full font-medium transition-colors duration-200 ${isMapped 
                                      ? 'text-emerald-600 dark:text-emerald-500 pl-6' 
                                      : 'text-slate-400 dark:text-slate-500 pl-6'
                                    }`}>
                                      {col.note || `column: ${col.key}`}
                                    </span>
                                  </div>

                                  {/* Right side: Mapping Selector */}
                                  <div className="flex items-center">
                                    <select
                                      value={selectedVal}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setColumnMappings(prev => ({
                                          ...prev,
                                          [col.key]: val
                                        }));
                                      }}
                                      className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition duration-205 ${isMapped
                                        ? 'border-emerald-500/60 focus:ring-emerald-500 text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-slate-800'
                                        : 'border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                        }`}
                                    >
                                      <option value="">-- Ignore / Skip Column --</option>
                                      {uploadedHeaders.map((header, hIdx) => (
                                        <option key={hIdx} value={header}>
                                          Column: "{header}"
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-150 dark:border-slate-800">
                <button
                  onClick={() => setImportStep(2)}
                  className="px-4 py-2 border border-slate-350 dark:border-slate-655 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={validateAndRouteToDefaultsScreen}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  Validate & Process Data <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: DEFAULT VALUES CONFIGURATION */}
          {importStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                  Lead Classification Defaults
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Specify default constant values to apply to all imported leads in this batch.
                </p>
              </div>

              <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 backdrop-blur-md space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Lead Status */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-350">
                      <Activity className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      Default Lead Status
                    </label>
                    <select
                      value={columnDefaults.lead_status || ''}
                      onChange={(e) => setColumnDefaults(prev => ({ ...prev, lead_status: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- No Default Status (Use 'New') --</option>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-350">
                      <AlertCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      Default Priority
                    </label>
                    <select
                      value={columnDefaults.priority || ''}
                      onChange={(e) => setColumnDefaults(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- No Default Priority (Use 'Medium') --</option>
                      {['Low', 'Medium', 'High'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  {/* Lead Source */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-350">
                      <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      Default Lead Source
                    </label>
                    <select
                      value={columnDefaults.lead_source || ''}
                      onChange={(e) => setColumnDefaults(prev => ({ ...prev, lead_source: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Select Default Source --</option>
                      {dynamicSources.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {columnDefaults.lead_source === 'Other' && (
                      <input
                        type="text"
                        placeholder="Type custom source..."
                        value={columnDefaults.lead_source_custom || ''}
                        onChange={(e) => setColumnDefaults(prev => ({ ...prev, lead_source_custom: e.target.value }))}
                        className="mt-2 w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  {/* Lead Category */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-350">
                      <Folder className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      Default Lead Category
                    </label>
                    <select
                      value={columnDefaults.lead_category || ''}
                      onChange={(e) => setColumnDefaults(prev => ({ ...prev, lead_category: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- No Default Category (Use 'Warm') --</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Lead Type */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-350">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      Default Lead Type
                    </label>
                    <select
                      value={columnDefaults.lead_type || ''}
                      onChange={(e) => setColumnDefaults(prev => ({ ...prev, lead_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Select Default Type --</option>
                      {dynamicTypes.map(t => <option key={t} value={t}>{t === 'Other' ? 'Other (custom)' : t}</option>)}
                    </select>
                    {columnDefaults.lead_type === 'Other' && (
                      <input
                        type="text"
                        placeholder="Type custom type..."
                        value={columnDefaults.lead_type_custom || ''}
                        onChange={(e) => setColumnDefaults(prev => ({ ...prev, lead_type_custom: e.target.value }))}
                        className="mt-2 w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  {/* Assigned To */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-350">
                      <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      Default Assignee (Assigned To)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sales Rep Name"
                      value={columnDefaults.assigned_to || ''}
                      onChange={(e) => setColumnDefaults(prev => ({ ...prev, assigned_to: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-350">
                      <Tag className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      Default Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. scraping, maps, hot-lead"
                      value={columnDefaults.tags || ''}
                      onChange={(e) => setColumnDefaults(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-350">
                      <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      Default Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Type constant notes..."
                      value={columnDefaults.notes || ''}
                      onChange={(e) => setColumnDefaults(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-150 dark:border-slate-800">
                <button
                  onClick={() => setImportStep(3)}
                  className="px-4 py-2 border border-slate-350 dark:border-slate-655 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Back to Mapping
                </button>
                <button
                  onClick={handleMappingSubmit}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  Continue to Duplicate Check <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: DUPLICATE RESOLUTION Strategizing */}
          {importStep === 5 && (
            <div className="max-w-2xl mx-auto py-4 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-200/50">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-105">Conflicting Records Found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Our duplicate check identified <strong className="text-slate-850 dark:text-white font-bold">{duplicateLeadsFound.length}</strong> record(s) matching existing email or phone numbers in your database.
                </p>
              </div>

              {/* Conflicting leads audit list */}
              {duplicateLeadsFound.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Conflicting Records Audit Log
                    </span>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5">
                      Review the specific incoming lead records that matched existing database entries:
                    </p>
                  </div>

                  <div className="max-h-[220px] overflow-y-auto border border-slate-150 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/20 dark:bg-slate-950/20">
                    {duplicateLeadsFound.map((dup, idx) => (
                      <div key={idx} className="p-3 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            {dup.imported.full_name || dup.existing.full_name}
                          </span>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                            {dup.imported.email && (
                              <span className="flex items-center gap-1">
                                <strong>Email:</strong> {dup.imported.email}
                              </span>
                            )}
                            {dup.imported.phone && (
                              <span className="flex items-center gap-1">
                                <strong>Phone:</strong> {dup.imported.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-100 dark:border-amber-900/40">
                          Matches: {dup.existing.email === dup.imported.email ? "Email" : dup.existing.phone === dup.imported.phone ? "Phone" : "Email/Phone"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategy selection radio group */}
              <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Conflict Resolution Strategy</span>

                <label className="flex items-start gap-3.5 p-3.5 border border-slate-150 dark:border-slate-800 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition cursor-pointer">
                  <input
                    type="radio"
                    name="conflict_strategy"
                    value="skip"
                    checked={importConflictStrategy === 'skip'}
                    onChange={(e) => setImportConflictStrategy(e.target.value)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Skip Duplicates (Recommended)</span>
                    <p className="text-[10.5px] text-slate-450 dark:text-slate-400 mt-0.5">
                      Ignore imported rows that already match existing contacts. Purely insert brand new leads.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3.5 p-3.5 border border-slate-150 dark:border-slate-800 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition cursor-pointer">
                  <input
                    type="radio"
                    name="conflict_strategy"
                    value="overwrite"
                    checked={importConflictStrategy === 'overwrite'}
                    onChange={(e) => setImportConflictStrategy(e.target.value)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Overwrite Existing Values</span>
                    <p className="text-[10.5px] text-slate-455 dark:text-slate-400 mt-0.5">
                      Merge updates. Replace empty fields and overwrite values of older leads with incoming columns.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3.5 p-3.5 border border-slate-150 dark:border-slate-800 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition cursor-pointer">
                  <input
                    type="radio"
                    name="conflict_strategy"
                    value="anyway"
                    checked={importConflictStrategy === 'anyway'}
                    onChange={(e) => setImportConflictStrategy(e.target.value)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Create Duplicate Records</span>
                    <p className="text-[10.5px] text-slate-455 dark:text-slate-400 mt-0.5">
                      Ignore conflicts. Insert all rows from the document creating brand new leads in every case.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setImportStep(4)}
                  className="px-4 py-2 border border-slate-350 dark:border-slate-655 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={executeBulkImportWithResolution}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  Execute Load Transaction <Play className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: DETAILED PREMIUM LOADING & TRANSACTION TICKERS */}
          {importStep === 6 && (
            <div className="max-w-xl mx-auto py-10 text-center space-y-8">

              {/* Pulsing circular core */}
              <div className="flex items-center justify-center relative">
                <div className="absolute w-24 h-24 bg-indigo-550/15 dark:bg-indigo-500/10 rounded-full animate-ping"></div>
                <div className="absolute w-20 h-20 bg-blue-550/15 dark:bg-blue-500/10 rounded-full animate-pulse"></div>
                <div className="custom-spinner shadow-[0_0_25px_rgba(99,102,241,0.4)] flex items-center justify-center">
                  <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                    <Database className="w-6 h-6 text-indigo-550 animate-bounce" />
                  </div>
                </div>
              </div>

              {/* Progress and status reports */}
              <div className="space-y-3.5">
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                  Central Database Ingesting...
                </h4>

                {/* Modern HSL progress bar */}
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-205 dark:border-slate-750 p-0.5 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${animatedProgress}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-slate-455 dark:text-slate-500 px-1">
                  <span>Progress: {animatedProgress}%</span>
                  <span className="italic">"{currentImportPhase}"</span>
                </div>
              </div>

              {/* Transaction Stream Console Ticker */}
              <div className="w-full bg-slate-950 text-slate-350 p-4 rounded-2xl font-mono text-xs text-left h-[200px] overflow-y-auto space-y-1 shadow-2xl border border-slate-850">
                <div className="text-indigo-400 font-bold border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between text-[10.5px]">
                  <span>TRANSACTION LOGS PIPELINE</span>
                  <span className="animate-pulse flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ACTIVE RUN
                  </span>
                </div>
                {importTicker.length === 0 && <p className="text-slate-500 italic">Initializing stream console...</p>}
                {importTicker.map((line, idx) => (
                  <p key={idx} className={line.includes('INSERT') ? 'text-emerald-400' : 'text-blue-450'}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7: IMPORT TRANSACTION COMPLETED SUMMARY */}
          {importStep === 7 && (
            <div className="max-w-md mx-auto py-8 text-center space-y-6">

              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-250 relative shadow-[0_0_40px_rgba(16,185,129,0.25)] animate-bounce">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Import Transaction Completed</h3>
                <p className="text-xs text-slate-450">
                  Leads parsed, audited, and committed to your centralized database successfully.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm">
                <div className="text-center p-2 border-r border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inserted</span>
                  <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">{importResults.inserted}</span>
                </div>
                <div className="text-center p-2 border-r border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Updated</span>
                  <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">{importResults.updated}</span>
                </div>
                <div className="text-center p-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Skipped</span>
                  <span className="text-2xl font-extrabold text-slate-550 dark:text-slate-450 mt-1 block">{importResults.skipped}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={resetImportState}
                  className="px-4.5 py-2 border border-slate-350 dark:border-slate-655 hover:bg-slate-105 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Import More
                </button>
                <button
                  onClick={() => {
                    resetImportState();
                    setIsImportOpen(false);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-xs font-bold transition shadow-sm hover:shadow cursor-pointer"
                >
                  Close Importer
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300 text-slate-800 dark:text-slate-100">

      {/* Header and Add Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight dark:text-white bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
            Centralized Lead Database
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build and manage high-quality customer relationships with unified leads tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              resetImportState();
              setIsImportOpen(true);
            }}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-755 border border-slate-200/60 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 dark:border-slate-700 px-4.5 py-2 rounded-lg font-medium transition shadow-sm hover:shadow-md text-sm cursor-pointer"
          >
            <Upload className="w-4 h-4 text-indigo-500" />
            Bulk Importer
          </button>
          <button
            onClick={openCreateForm}
            style={{ backgroundColor: 'rgb(37, 89, 165)' }}
            className="flex items-center gap-2 hover:opacity-90 text-white px-5 py-2 rounded-lg font-medium transition shadow-md hover:shadow-lg text-sm cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            Add New Lead
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition relative overflow-hidden group hover:scale-[1.01] border-none">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <User className="w-16 h-16 text-blue-600" />
          </div>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Leads</span>
          <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{stats.total}</h3>
          <p className="text-xs text-slate-450 mt-2">Active database records</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition relative overflow-hidden group hover:scale-[1.01] border-none">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <AlertCircle className="w-16 h-16 text-red-500" />
          </div>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Hot Leads</span>
          <h3 className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-1">{stats.hotLeads}</h3>
          <p className="text-xs text-slate-450 mt-2">High conversion probability</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition relative overflow-hidden group hover:scale-[1.01] border-none">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Converted Leads</span>
          <h3 className="text-3xl font-extrabold text-green-600 dark:text-green-400 mt-1">{stats.converted}</h3>
          <p className="text-xs text-slate-450 mt-2">Closed deal success rate</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition relative overflow-hidden group hover:scale-[1.01] border-none">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <UserCheck className="w-16 h-16 text-amber-500" />
          </div>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Qualified Leads</span>
          <h3 className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{stats.qualifiedLeads}</h3>
          <p className="text-xs text-slate-450 mt-2">Leads ready for conversion</p>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md overflow-hidden transition-colors duration-300 border-none">

        {/* Dynamic Source Segment Control — Switch Mode */}
        <div className="px-5 pt-4 pb-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/20 dark:bg-slate-800/20">
          <div className="inline-flex items-center bg-slate-100/60 dark:bg-slate-900/60 p-1 rounded-full max-w-full overflow-x-auto scrollbar-none gap-0.5">
            <button
              onClick={() => { setSourceFilter('All'); setCurrentPage(1); }}
              className={`px-4 py-1 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer shrink-0 select-none ${sourceFilter === 'All'
                ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
            >
              All Sources
            </button>
            {allUniqueSources.map((source) => (
              <button
                key={source}
                onClick={() => { setSourceFilter(source); setCurrentPage(1); }}
                className={`px-4 py-1 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer shrink-0 select-none ${sourceFilter === source
                  ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                {source}
              </button>
            ))}
          </div>
        </div>

        {/* Filters and Search Bar Row */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex flex-wrap items-center gap-3">

            {/* Search */}
            <div className="relative min-w-[180px] max-w-[220px] flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-slate-200"
              >
                <option value="All">All Statuses</option>
                {allUniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Category</span>
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-slate-200"
              >
                <option value="All">All Categories</option>
                {allUniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Lead Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Type</span>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-slate-200"
              >
                <option value="All">All Types</option>
                {allUniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Priority</span>
              <select
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-slate-200"
              >
                <option value="All">All Priorities</option>
                {allUniquePriorities.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Tags Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Tags</span>
              <select
                value={tagsFilter}
                onChange={(e) => { setTagsFilter(e.target.value); setCurrentPage(1); }}
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-slate-200"
              >
                <option value="All">All Tags</option>
                {allUniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Columns Adjuster Popover */}
            <div className="relative">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-200 transition cursor-pointer select-none bg-white dark:bg-slate-800"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Columns</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showColumnDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowColumnDropdown(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 py-2.5 px-3 select-none transition-all duration-150 animate-in fade-in slide-in-from-top-1">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-1.5 mb-2 border-b border-slate-100 dark:border-slate-700">
                      Show/Hide Columns
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto scrollbar-thin">
                      {COLUMNS.map((col) => (
                        <label
                          key={col.key}
                          className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition select-none"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns[col.key] !== false}
                            onChange={() => {
                              setVisibleColumns(prev => ({
                                ...prev,
                                [col.key]: prev[col.key] === false ? true : false
                              }));
                            }}
                            className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 shrink-0 cursor-pointer"
                          />
                          <span>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Reset Filters */}
            {(searchTerm || statusFilter !== 'All' || sourceFilter !== 'All' || categoryFilter !== 'All' || priorityFilter !== 'All' || typeFilter !== 'All' || tagsFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('All');
                  setSourceFilter('All');
                  setCategoryFilter('All');
                  setPriorityFilter('All');
                  setTypeFilter('All');
                  setTagsFilter('All');
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg transition shrink-0 cursor-pointer"
              >
                Reset Filters
              </button>
            )}

          </div>
        </div>

        {/* Data Grid Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400 mt-4 font-medium animate-pulse">Loading leads from Supabase...</p>
            </div>
          ) : processedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
              <HelpCircle className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-700" />
              <p className="font-semibold text-slate-600 dark:text-slate-400 text-base">No Leads Found</p>
              <p className="text-xs mt-1 text-center max-w-xs">
                Try modifying your search query or filters, or add a lead to get started.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse table-auto min-w-[1200px]">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40">
                  <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 select-none whitespace-nowrap w-10 bg-slate-50/70 dark:bg-slate-800/40">
                    <input
                      type="checkbox"
                      checked={processedLeads.length > 0 && processedLeads.every(lead => selectedLeadIds.has(lead.lead_id))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedLeadIds(prev => {
                          const next = new Set(prev);
                          processedLeads.forEach(lead => {
                            if (checked) {
                              next.add(lead.lead_id);
                            } else {
                              next.delete(lead.lead_id);
                            }
                          });
                          return next;
                        });
                      }}
                      className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-800"
                    />
                  </th>
                  {visibleColumns.lead_id !== false && (
                    <th onClick={() => handleSort('lead_id')} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/30 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        ID {sortField === 'lead_id' && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                      </div>
                    </th>
                  )}
                  {visibleColumns.full_name !== false && (
                    <th onClick={() => handleSort('full_name')} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/30 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        Name {sortField === 'full_name' && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                      </div>
                    </th>
                  )}
                  {visibleColumns.phone !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Phone</th>
                  )}
                  {visibleColumns.phone_alt !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Alt Phone</th>
                  )}
                  {visibleColumns.whatsapp !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">WhatsApp</th>
                  )}
                  {visibleColumns.email !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Email</th>
                  )}
                  {visibleColumns.email_alt !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Alt Email</th>
                  )}
                  {visibleColumns.company_name !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Company</th>
                  )}
                  {visibleColumns.designation !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Designation</th>
                  )}
                  {visibleColumns.industry !== false && (
                    <th onClick={() => handleSort('industry')} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/30 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        Industry {sortField === 'industry' && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                      </div>
                    </th>
                  )}
                  {visibleColumns.website !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Website</th>
                  )}
                  {visibleColumns.company_size !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Company Size</th>
                  )}
                  {visibleColumns.city !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">City</th>
                  )}
                  {visibleColumns.state !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">State</th>
                  )}
                  {visibleColumns.country !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Country</th>
                  )}
                  {visibleColumns.business_city !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Biz City</th>
                  )}
                  {visibleColumns.business_country !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Biz Country</th>
                  )}
                  {visibleColumns.lead_source !== false && (
                    <th onClick={() => handleSort('lead_source')} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/30 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        Source {sortField === 'lead_source' && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                      </div>
                    </th>
                  )}
                  {visibleColumns.lead_category !== false && (
                    <th onClick={() => handleSort('lead_category')} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/30 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        Category {sortField === 'lead_category' && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                      </div>
                    </th>
                  )}
                  {visibleColumns.lead_type !== false && (
                    <th onClick={() => handleSort('lead_type')} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/30 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        Lead Type {sortField === 'lead_type' && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                      </div>
                    </th>
                  )}
                  {visibleColumns.lead_status !== false && (
                    <th onClick={() => handleSort('lead_status')} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/30 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        Status {sortField === 'lead_status' && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                      </div>
                    </th>
                  )}
                  {visibleColumns.priority !== false && (
                    <th onClick={() => handleSort('priority')} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/30 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        Priority {sortField === 'priority' && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                      </div>
                    </th>
                  )}
                  {visibleColumns.tags !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Tags</th>
                  )}
                  {visibleColumns.assigned_to !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Assigned To</th>
                  )}
                  {visibleColumns.source_batch !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Source Batch</th>
                  )}
                  {visibleColumns.notes !== false && (
                    <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">Notes</th>
                  )}
                  {visibleColumns.next_followup_date !== false && (
                    <th onClick={() => handleSort('next_followup_date')} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/30 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        Next Followup {sortField === 'next_followup_date' && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                      </div>
                    </th>
                  )}
                  {visibleColumns.last_contacted !== false && (
                    <th onClick={() => handleSort('last_contacted')} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/30 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        Last Contacted {sortField === 'last_contacted' && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                      </div>
                    </th>
                  )}
                  {visibleColumns.created_at !== false && (
                    <th onClick={() => handleSort('created_at')} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/30 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        Created At {sortField === 'created_at' && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                      </div>
                    </th>
                  )}
                  {visibleColumns.created_by !== false && (
                    <th onClick={() => handleSort('created_by')} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/30 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        Created By {sortField === 'created_by' && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                      </div>
                    </th>
                  )}
                  {visibleColumns.updated_at !== false && (
                    <th onClick={() => handleSort('updated_at')} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/30 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        Updated At {sortField === 'updated_at' && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                      </div>
                    </th>
                  )}
                  {visibleColumns.updated_by !== false && (
                    <th onClick={() => handleSort('updated_by')} className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/30 select-none whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        Updated By {sortField === 'updated_by' && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                      </div>
                    </th>
                  )}
                  <th className="py-3.5 px-4 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {paginatedLeads.map((lead) => (
                  <tr
                    key={lead.lead_id}
                    onClick={() => router.push(`/other-modules/crm/leads/${lead.lead_id}`)}
                    className="hover:bg-blue-50/20 dark:hover:bg-slate-750 transition duration-150 cursor-pointer"
                  >
                    <td className="py-3 px-4 w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.has(lead.lead_id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedLeadIds(prev => {
                            const next = new Set(prev);
                            if (checked) {
                              next.add(lead.lead_id);
                            } else {
                              next.delete(lead.lead_id);
                            }
                            return next;
                          });
                        }}
                        className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                      />
                    </td>
                    {visibleColumns.lead_id !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-400 whitespace-nowrap">L-{lead.lead_id}</td>
                    )}
                    {visibleColumns.full_name !== false && (
                      <td className="py-3 px-4 text-xs font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        <span>{lead.full_name || lead.company_name || 'Unnamed Lead'}</span>
                      </td>
                    )}
                    {visibleColumns.phone !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">
                        {lead.phone ? (
                          <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 dark:text-blue-400 hover:underline">
                            {lead.phone}
                          </a>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.phone_alt !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">
                        {lead.phone_alt ? (
                          <a href={`tel:${lead.phone_alt}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 dark:text-blue-400 hover:underline">
                            {lead.phone_alt}
                          </a>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.whatsapp !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">
                        {lead.whatsapp ? (
                          <a
                            href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 dark:text-green-400 hover:underline"
                          >
                            {lead.whatsapp}
                          </a>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.email !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">
                        {lead.email ? (
                          <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 dark:text-blue-400 hover:underline">{lead.email}</a>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.email_alt !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">
                        {lead.email_alt ? (
                          <a href={`mailto:${lead.email_alt}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 dark:text-blue-400 hover:underline">{lead.email_alt}</a>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.company_name !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">{lead.company_name || '-'}</td>
                    )}
                    {visibleColumns.designation !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">{lead.designation || '-'}</td>
                    )}
                    {visibleColumns.industry !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">{lead.industry || '-'}</td>
                    )}
                    {visibleColumns.website !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">
                        {lead.website ? (
                          <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                            {lead.website}
                          </a>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.company_size !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">{lead.company_size || '-'}</td>
                    )}
                    {visibleColumns.city !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">{lead.city || '-'}</td>
                    )}
                    {visibleColumns.state !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">{lead.state || '-'}</td>
                    )}
                    {visibleColumns.country !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">{lead.country || '-'}</td>
                    )}
                    {visibleColumns.business_city !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">{lead.business_city || '-'}</td>
                    )}
                    {visibleColumns.business_country !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">{lead.business_country || '-'}</td>
                    )}
                    {visibleColumns.lead_source !== false && (
                      <td className="py-3 px-4 text-xs text-slate-650 dark:text-slate-350 font-normal whitespace-nowrap">{lead.lead_source || '-'}</td>
                    )}
                    {visibleColumns.lead_category !== false && (
                      <td className="py-3 px-4 text-xs text-slate-650 dark:text-slate-350 font-normal whitespace-nowrap">{lead.lead_category || '-'}</td>
                    )}
                    {visibleColumns.lead_type !== false && (
                      <td className="py-3 px-4 text-xs text-slate-650 dark:text-slate-350 font-normal whitespace-nowrap">{lead.lead_type || '-'}</td>
                    )}
                    {visibleColumns.lead_status !== false && (
                      <td className="py-3 px-4 text-xs whitespace-nowrap">{getStatusBadge(lead.lead_status)}</td>
                    )}
                    {visibleColumns.priority !== false && (
                      <td className="py-3 px-4 text-xs whitespace-nowrap">{getPriorityFlag(lead.priority)}</td>
                    )}
                    {visibleColumns.tags !== false && (
                      <td className="py-3 px-4 text-xs max-w-[150px] truncate text-slate-600 dark:text-slate-350 font-normal whitespace-nowrap">
                        {lead.tags ? lead.tags.split(',').map(t => t.trim()).join(', ') : '-'}
                      </td>
                    )}
                    {visibleColumns.assigned_to !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">{lead.assigned_to || '-'}</td>
                    )}
                    {visibleColumns.source_batch !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-350 whitespace-nowrap">{lead.source_batch || '-'}</td>
                    )}
                    {visibleColumns.notes !== false && (
                      <td className="py-3 px-4 text-xs max-w-[200px] truncate text-slate-600 dark:text-slate-350 font-normal whitespace-nowrap" title={lead.notes || ''}>{lead.notes || '-'}</td>
                    )}
                    {visibleColumns.next_followup_date !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-500 whitespace-nowrap">
                        {lead.next_followup_date ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {new Date(lead.next_followup_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.last_contacted !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-500 whitespace-nowrap">
                        {lead.last_contacted ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {new Date(lead.last_contacted).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.created_at !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-500 whitespace-nowrap">
                        {lead.created_at ? new Date(lead.created_at).toLocaleString() : '-'}
                      </td>
                    )}
                    {visibleColumns.created_by !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-500 whitespace-nowrap">
                        {lead.created_by ? lead.created_by.split(' (')[0] : '-'}
                      </td>
                    )}
                    {visibleColumns.updated_at !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-500 whitespace-nowrap">
                        {lead.updated_at ? new Date(lead.updated_at).toLocaleString() : '-'}
                      </td>
                    )}
                    {visibleColumns.updated_by !== false && (
                      <td className="py-3 px-4 text-xs font-normal text-slate-500 whitespace-nowrap">
                        {lead.updated_by ? lead.updated_by.split(' (')[0] : '-'}
                      </td>
                    )}
                    <td className="py-3 px-4 text-xs text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditForm(lead)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-slate-700 transition"
                          title="Edit Lead"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDeleteLead(lead)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-slate-700 transition"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {!loading && processedLeads.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-t border-slate-150 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-xs font-medium text-slate-500">
              Showing <span className="text-slate-800 dark:text-slate-300 font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, processedLeads.length)}</span> to{' '}
              <span className="text-slate-800 dark:text-slate-300 font-semibold">{Math.min(currentPage * itemsPerPage, processedLeads.length)}</span> of{' '}
              <span className="text-slate-850 dark:text-slate-200 font-bold">{processedLeads.length}</span> leads
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-2 rounded-lg border border-slate-250 dark:border-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition bg-white dark:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                // Limit page buttons visible
                if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-xs font-semibold border transition ${currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-250 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (pageNum === 2 || pageNum === totalPages - 1) {
                  return <span key={pageNum} className="text-slate-400 dark:text-slate-600 px-1">...</span>;
                }
                return null;
              })}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-2 rounded-lg border border-slate-250 dark:border-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition bg-white dark:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-750 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {formMode === 'create' ? 'Add New Lead' : 'Edit Lead Record'}
                </h2>
                <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
                  Complete the fields below. Accordion sections can be toggled.
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={checkDuplicateAndSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* SECTION 1: PERSONAL DETAILS */}
              <div className="border border-slate-150 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(1)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-750 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <User className="w-4 h-4" /> Section 1 — Personal Details
                  </span>
                  {expandedSections[1] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections[1] && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-800/40">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Salutation</label>
                      <select
                        value={formData.salutation}
                        onChange={(e) => handleInputChange('salutation', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Select Salutation</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Dr.">Dr.</option>
                        <option value="Prof.">Prof.</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Primary Phone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="+123456789"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Alternate Phone</label>
                      <input
                        type="text"
                        value={formData.phone_alt}
                        onChange={(e) => handleInputChange('phone_alt', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="+987654321"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">WhatsApp</label>
                      <input
                        type="text"
                        value={formData.whatsapp}
                        onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="WhatsApp Number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Primary Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="email@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Alternate Email</label>
                      <input
                        type="email"
                        value={formData.email_alt}
                        onChange={(e) => handleInputChange('email_alt', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="email_alt@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="Country Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: BUSINESS DETAILS */}
              <div className="border border-slate-150 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(2)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-750 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Building2 className="w-4 h-4" /> Section 2 — Business Details
                  </span>
                  {expandedSections[2] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections[2] && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-800/40">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Company Name</label>
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => handleInputChange('company_name', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="Acme Corp"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Designation</label>
                      <input
                        type="text"
                        value={formData.designation}
                        onChange={(e) => handleInputChange('designation', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="Director, Owner, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Industry</label>
                      <input
                        type="text"
                        value={formData.industry}
                        onChange={(e) => handleInputChange('industry', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="Real Estate, IT, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Website</label>
                      <input
                        type="text"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Company Size</label>
                      <select
                        value={formData.company_size}
                        onChange={(e) => handleInputChange('company_size', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Select Size</option>
                        {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Business Country</label>
                      <input
                        type="text"
                        value={formData.business_country}
                        onChange={(e) => handleInputChange('business_country', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="Business Country"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Business City</label>
                      <input
                        type="text"
                        value={formData.business_city}
                        onChange={(e) => handleInputChange('business_city', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="Business City"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Primary Business Email</label>
                      <input
                        type="email"
                        value={formData.primary_business_email}
                        onChange={(e) => handleInputChange('primary_business_email', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="business@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Additional Emails (comma separated)</label>
                      <input
                        type="text"
                        value={formData.additional_emails}
                        onChange={(e) => handleInputChange('additional_emails', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="email1@comp.com, email2@comp.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Company Image URL</label>
                      <input
                        type="text"
                        value={formData.company_image_url}
                        onChange={(e) => handleInputChange('company_image_url', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Business Phone</label>
                      <input
                        type="text"
                        value={formData.business_phone}
                        onChange={(e) => handleInputChange('business_phone', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="Business Phone Number"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: CLASSIFICATION */}
              <div className="border border-slate-150 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(3)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-750 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Tag className="w-4 h-4" /> Section 3 — Lead Classification
                  </span>
                  {expandedSections[3] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections[3] && (
                  <div className="p-4 space-y-4 bg-white dark:bg-slate-800/40">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Lead Source</label>
                        <select
                          value={formData.lead_source}
                          onChange={(e) => handleInputChange('lead_source', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        >
                          {dynamicSources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {formData.lead_source === 'Other' && (
                          <input
                            type="text"
                            required
                            placeholder="Type custom source..."
                            value={customSource}
                            onChange={(e) => setCustomSource(e.target.value)}
                            className="mt-2 w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Lead Category</label>
                        <select
                          value={formData.lead_category}
                          onChange={(e) => handleInputChange('lead_category', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Lead Type</label>
                        <select
                          value={formData.lead_type}
                          onChange={(e) => handleInputChange('lead_type', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        >
                          {dynamicTypes.map(t => <option key={t} value={t}>{t === 'Other' ? 'Other (custom)' : t}</option>)}
                        </select>
                        {formData.lead_type === 'Other' && (
                          <input
                            type="text"
                            required
                            placeholder="Type custom lead type..."
                            value={customType}
                            onChange={(e) => setCustomType(e.target.value)}
                            className="mt-2 w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                          />
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Lead Status</label>
                        <select
                          value={formData.lead_status}
                          onChange={(e) => handleInputChange('lead_status', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Priority</label>
                        <select
                          value={formData.priority}
                          onChange={(e) => handleInputChange('priority', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        >
                          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tags (comma-separated)</label>
                        <input
                          type="text"
                          value={formData.tags}
                          onChange={(e) => handleInputChange('tags', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                          placeholder="VIP, Callback, Do Not Contact"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: NOTES & TRACKING */}
              <div className="border border-slate-150 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(4)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-750 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Calendar className="w-4 h-4" /> Section 4 — Notes & Tracking
                  </span>
                  {expandedSections[4] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedSections[4] && (
                  <div className="p-4 space-y-4 bg-white dark:bg-slate-800/40">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Assigned To</label>
                        <input
                          type="text"
                          value={formData.assigned_to}
                          onChange={(e) => handleInputChange('assigned_to', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                          placeholder="Rep Name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Next Follow-up Date</label>
                        <input
                          type="date"
                          value={formData.next_followup_date}
                          onChange={(e) => handleInputChange('next_followup_date', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Last Contacted Date</label>
                        <input
                          type="date"
                          value={formData.last_contacted}
                          onChange={(e) => handleInputChange('last_contacted', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows="3"
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        placeholder="Write detailed call summaries or interaction logs here..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 5: ADVANCED & SOCIAL PROFILE */}
              <div className="border border-slate-150 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(5)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-750 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Globe className="w-4 h-4" /> Section 5 — Advanced & Social Details
                  </span>
                  {expandedSections[5] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedSections[5] && (
                  <div className="p-4 space-y-4 bg-white dark:bg-slate-800/40">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Time Zone</label>
                        <input
                          type="text"
                          value={formData.timezone}
                          onChange={(e) => handleInputChange('timezone', e.target.value)}
                          placeholder="e.g. Asia/Kolkata, UTC"
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Preferred Language</label>
                        <input
                          type="text"
                          value={formData.preferred_language}
                          onChange={(e) => handleInputChange('preferred_language', e.target.value)}
                          placeholder="e.g. English, Arabic"
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Preferred Contact Method</label>
                        <select
                          value={formData.preferred_contact_method}
                          onChange={(e) => handleInputChange('preferred_contact_method', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        >
                          <option value="Email">Email</option>
                          <option value="Phone">Phone</option>
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="SMS">SMS</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">LinkedIn Profile URL</label>
                        <input
                          type="url"
                          value={formData.linkedin_url}
                          onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                          placeholder="https://linkedin.com/in/username"
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Twitter / X URL</label>
                        <input
                          type="url"
                          value={formData.twitter_url}
                          onChange={(e) => handleInputChange('twitter_url', e.target.value)}
                          placeholder="https://x.com/username"
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">GitHub Profile URL</label>
                        <input
                          type="url"
                          value={formData.github_url}
                          onChange={(e) => handleInputChange('github_url', e.target.value)}
                          placeholder="https://github.com/username"
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Portfolio Website URL</label>
                        <input
                          type="url"
                          value={formData.portfolio_url}
                          onChange={(e) => handleInputChange('portfolio_url', e.target.value)}
                          placeholder="https://myportfolio.com"
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email Consent Status</label>
                        <select
                          value={formData.email_consent_status}
                          onChange={(e) => handleInputChange('email_consent_status', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        >
                          <option value="Subscribed">Subscribed</option>
                          <option value="Unsubscribed">Unsubscribed</option>
                          <option value="Bounce">Bounce</option>
                          <option value="Spam Complaint">Spam Complaint</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Consent Source</label>
                        <input
                          type="text"
                          value={formData.consent_source}
                          onChange={(e) => handleInputChange('consent_source', e.target.value)}
                          placeholder="e.g. Newsletter, Lead Magnet"
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Lead Score</label>
                        <input
                          type="number"
                          value={formData.lead_score}
                          onChange={(e) => handleInputChange('lead_score', parseInt(e.target.value, 10) || 0)}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Skills (comma-separated)</label>
                      <input
                        type="text"
                        value={formData.skills}
                        onChange={(e) => handleInputChange('skills', e.target.value)}
                        placeholder="React, Negotiation, Python, CRM"
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 6: WORK EXPERIENCE HISTORY */}
              <div className="border border-slate-150 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(6)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-750 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Briefcase className="w-4 h-4" /> Section 6 — Work Experience ({formData.experiences?.length || 0})
                  </span>
                  {expandedSections[6] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedSections[6] && (
                  <div className="p-4 space-y-4 bg-white dark:bg-slate-800/40">
                    {formData.experiences?.map((exp, index) => (
                      <div key={index} className="border border-slate-150 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/60 relative space-y-3">
                        <button
                          type="button"
                          onClick={() => removeExperienceField(index)}
                          className="absolute top-3 right-3 p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Remove Experience"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="text-xs font-bold text-slate-400">Experience #{index + 1}</div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Company Name *</label>
                            <input
                              type="text"
                              required
                              value={exp.company_name}
                              onChange={(e) => handleExperienceChange(index, 'company_name', e.target.value)}
                              placeholder="e.g. Google"
                              className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Job Title / Designation *</label>
                            <input
                              type="text"
                              required
                              value={exp.job_title}
                              onChange={(e) => handleExperienceChange(index, 'job_title', e.target.value)}
                              placeholder="e.g. Sales Manager"
                              className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Joining Date</label>
                            <input
                              type="date"
                              value={exp.joining_date}
                              onChange={(e) => handleExperienceChange(index, 'joining_date', e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Leave Date</label>
                            <input
                              type="date"
                              value={exp.leave_date}
                              onChange={(e) => handleExperienceChange(index, 'leave_date', e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Duration (Years)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={exp.duration_years}
                              onChange={(e) => handleExperienceChange(index, 'duration_years', parseFloat(e.target.value) || '')}
                              placeholder="e.g. 2.5"
                              className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Industry</label>
                            <input
                              type="text"
                              value={exp.company_industry}
                              onChange={(e) => handleExperienceChange(index, 'company_industry', e.target.value)}
                              placeholder="e.g. Tech, SaaS"
                              className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Skills Used (comma-separated)</label>
                            <input
                              type="text"
                              value={exp.skills_used}
                              onChange={(e) => handleExperienceChange(index, 'skills_used', e.target.value)}
                              placeholder="e.g. Negotiation, Cold Calling"
                              className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Responsibilities / Achievements</label>
                          <textarea
                            value={exp.responsibilities}
                            onChange={(e) => handleExperienceChange(index, 'responsibilities', e.target.value)}
                            rows="2"
                            placeholder="Describe main tasks and key achievements..."
                            className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addExperienceField}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-slate-300 dark:border-slate-650 text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-750/30 rounded-xl font-medium text-sm transition"
                    >
                      <Plus className="w-4 h-4" /> Add Work Experience
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION 7: EDUCATION HISTORY */}
              <div className="border border-slate-150 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(7)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-750 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Globe className="w-4 h-4" /> Section 7 — Education ({formData.educations?.length || 0})
                  </span>
                  {expandedSections[7] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedSections[7] && (
                  <div className="p-4 space-y-4 bg-white dark:bg-slate-800/40">
                    {formData.educations?.map((edu, index) => (
                      <div key={index} className="border border-slate-150 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/60 relative space-y-3">
                        <button
                          type="button"
                          onClick={() => removeEducationField(index)}
                          className="absolute top-3 right-3 p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Remove Education"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="text-xs font-bold text-slate-400">Education #{index + 1}</div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Institution / School Name *</label>
                          <input
                            type="text"
                            required
                            value={edu.institution_name}
                            onChange={(e) => handleEducationChange(index, 'institution_name', e.target.value)}
                            placeholder="e.g. Stanford University"
                            className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Degree</label>
                            <input
                              type="text"
                              value={edu.degree}
                              onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                              placeholder="e.g. Bachelor of Science"
                              className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Field of Study / Major</label>
                            <input
                              type="text"
                              value={edu.field_of_study}
                              onChange={(e) => handleEducationChange(index, 'field_of_study', e.target.value)}
                              placeholder="e.g. Computer Science"
                              className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Grade / GPA</label>
                            <input
                              type="text"
                              value={edu.grade}
                              onChange={(e) => handleEducationChange(index, 'grade', e.target.value)}
                              placeholder="e.g. 3.8 or First Class"
                              className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Start Date</label>
                            <input
                              type="date"
                              value={edu.start_date}
                              onChange={(e) => handleEducationChange(index, 'start_date', e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">End Date / Graduation</label>
                            <input
                              type="date"
                              value={edu.end_date}
                              onChange={(e) => handleEducationChange(index, 'end_date', e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Activities & Extracurriculars</label>
                          <textarea
                            value={edu.activities}
                            onChange={(e) => handleEducationChange(index, 'activities', e.target.value)}
                            rows="2"
                            placeholder="Societies, sports, clubs..."
                            className="w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addEducationField}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-slate-300 dark:border-slate-650 text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-750/30 rounded-xl font-medium text-sm transition"
                    >
                      <Plus className="w-4 h-4" /> Add Education
                    </button>
                  </div>
                )}
              </div>

            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-150 dark:border-slate-700 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={checkDuplicateAndSubmit}
                disabled={actionLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                {formMode === 'create' ? 'Save Lead' : 'Update Lead'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DUPLICATE WARNING MODAL FOR MANUAL INPUT */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/60 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500"></div>

            <div className="flex items-start gap-4 mt-2">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Duplicate Record Warning</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  A lead with matching contact details already exists in the centralized database:
                </p>

                <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-150 dark:border-slate-750 my-4 text-xs space-y-2">
                  <div>
                    <span className="font-semibold text-slate-400 uppercase tracking-wider block text-[10px]">Existing Lead</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{duplicateWarning.existing.full_name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-semibold text-slate-400 text-[10px] uppercase">Phone</span>
                      <p className="font-medium text-slate-700 dark:text-slate-350">{duplicateWarning.existing.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 text-[10px] uppercase">Email</span>
                      <p className="font-medium text-slate-700 dark:text-slate-350">{duplicateWarning.existing.email || 'N/A'}</p>
                    </div>
                  </div>
                  {duplicateWarning.existing.company_name && (
                    <div>
                      <span className="font-semibold text-slate-400 text-[10px] uppercase">Company</span>
                      <p className="font-medium text-slate-700 dark:text-slate-350">{duplicateWarning.existing.company_name}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-2 border-t border-slate-200/50 dark:border-slate-700/50 pt-2">
                    <span>Status: {getStatusBadge(duplicateWarning.existing.lead_status)}</span>
                    <span>Priority: {getPriorityFlag(duplicateWarning.existing.priority)}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 font-medium">
                  How would you like to handle this duplicate?
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 mt-6 border-t border-slate-100 dark:border-slate-750 pt-4">
              <button
                type="button"
                onClick={() => handleDuplicateResolve('skip')}
                className="w-full sm:w-auto px-4 py-2 border border-slate-300 dark:border-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition"
              >
                Skip / Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDuplicateResolve('overwrite')}
                className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                Overwrite Existing
              </button>
              <button
                type="button"
                onClick={() => handleDuplicateResolve('anyway')}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                Import Anyway
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 w-full max-w-md rounded-2xl shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Confirm Delete Lead
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
              Are you absolutely sure you want to delete lead <strong className="text-slate-800 dark:text-white font-semibold">"{deleteConfirmName}"</strong>? This operation will remove the lead permanently from the centralized database and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6 border-t border-slate-100 dark:border-slate-700/60 pt-4">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-slate-350 dark:border-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Delete Lead
              </button>
            </div>
            {/* Bulk Importer is now handled via an early full-page return at the top of the render statement */}
          </div>
        </div>
      )}

      {/* Bulk Edit Form Modal */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-750 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Bulk Edit Lead Records
                </h2>
                <p className="text-xs text-slate-555 dark:text-slate-400 mt-0.5">
                  Select which fields to update for the {selectedLeadIds.size} selected leads. Accordion sections can be toggled.
                </p>
              </div>
              <button
                onClick={() => setIsBulkEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* SECTION 2: BUSINESS DETAILS */}
              <div className="border border-slate-150 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleBulkSection(2)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-750 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Building2 className="w-4 h-4" /> Section 2 — Business Details
                  </span>
                  {expandedBulkSections[2] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedBulkSections[2] && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-800/40">

                    {/* Company Name */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-chk-company_name"
                          checked={bulkEditSelectedFields.company_name}
                          onChange={(e) => setBulkEditSelectedFields(prev => ({ ...prev, company_name: e.target.checked }))}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                        />
                        <label htmlFor="bulk-chk-company_name" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          Update Company Name
                        </label>
                      </div>
                      <input
                        type="text"
                        disabled={!bulkEditSelectedFields.company_name}
                        value={bulkEditData.company_name}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, company_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 transition"
                        placeholder="Acme Corp"
                      />
                    </div>

                    {/* Designation */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-chk-designation"
                          checked={bulkEditSelectedFields.designation}
                          onChange={(e) => setBulkEditSelectedFields(prev => ({ ...prev, designation: e.target.checked }))}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                        />
                        <label htmlFor="bulk-chk-designation" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          Update Designation
                        </label>
                      </div>
                      <input
                        type="text"
                        disabled={!bulkEditSelectedFields.designation}
                        value={bulkEditData.designation}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, designation: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 transition"
                        placeholder="Director, Owner, etc."
                      />
                    </div>

                    {/* Industry */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-chk-industry"
                          checked={bulkEditSelectedFields.industry}
                          onChange={(e) => setBulkEditSelectedFields(prev => ({ ...prev, industry: e.target.checked }))}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                        />
                        <label htmlFor="bulk-chk-industry" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          Update Industry
                        </label>
                      </div>
                      <input
                        type="text"
                        disabled={!bulkEditSelectedFields.industry}
                        value={bulkEditData.industry}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, industry: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 transition"
                        placeholder="Real Estate, IT, etc."
                      />
                    </div>

                    {/* Website */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-chk-website"
                          checked={bulkEditSelectedFields.website}
                          onChange={(e) => setBulkEditSelectedFields(prev => ({ ...prev, website: e.target.checked }))}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                        />
                        <label htmlFor="bulk-chk-website" className="text-xs font-bold text-slate-705 dark:text-slate-300 cursor-pointer select-none">
                          Update Website
                        </label>
                      </div>
                      <input
                        type="text"
                        disabled={!bulkEditSelectedFields.website}
                        value={bulkEditData.website}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, website: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 transition"
                        placeholder="https://example.com"
                      />
                    </div>

                    {/* Company Size */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-chk-company_size"
                          checked={bulkEditSelectedFields.company_size}
                          onChange={(e) => setBulkEditSelectedFields(prev => ({ ...prev, company_size: e.target.checked }))}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                        />
                        <label htmlFor="bulk-chk-company_size" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          Update Company Size
                        </label>
                      </div>
                      <select
                        disabled={!bulkEditSelectedFields.company_size}
                        value={bulkEditData.company_size}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, company_size: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 transition"
                      >
                        <option value="">Select Size</option>
                        {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Business Country */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-chk-business_country"
                          checked={bulkEditSelectedFields.business_country}
                          onChange={(e) => setBulkEditSelectedFields(prev => ({ ...prev, business_country: e.target.checked }))}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                        />
                        <label htmlFor="bulk-chk-business_country" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          Update Business Country
                        </label>
                      </div>
                      <input
                        type="text"
                        disabled={!bulkEditSelectedFields.business_country}
                        value={bulkEditData.business_country}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, business_country: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 transition"
                        placeholder="Business Country"
                      />
                    </div>

                    {/* Business City */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-chk-business_city"
                          checked={bulkEditSelectedFields.business_city}
                          onChange={(e) => setBulkEditSelectedFields(prev => ({ ...prev, business_city: e.target.checked }))}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                        />
                        <label htmlFor="bulk-chk-business_city" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          Update Business City
                        </label>
                      </div>
                      <input
                        type="text"
                        disabled={!bulkEditSelectedFields.business_city}
                        value={bulkEditData.business_city}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, business_city: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 transition"
                        placeholder="Business City"
                      />
                    </div>

                  </div>
                )}
              </div>

              {/* SECTION 3: LEAD CLASSIFICATION */}
              <div className="border border-slate-150 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleBulkSection(3)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-750 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Tag className="w-4 h-4" /> Section 3 — Lead Classification
                  </span>
                  {expandedBulkSections[3] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedBulkSections[3] && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-800/40">

                    {/* Lead Source */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-chk-lead_source"
                          checked={bulkEditSelectedFields.lead_source}
                          onChange={(e) => setBulkEditSelectedFields(prev => ({ ...prev, lead_source: e.target.checked }))}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                        />
                        <label htmlFor="bulk-chk-lead_source" className="text-xs font-bold text-slate-705 dark:text-slate-300 cursor-pointer select-none">
                          Update Lead Source
                        </label>
                      </div>
                      <select
                        disabled={!bulkEditSelectedFields.lead_source}
                        value={bulkEditData.lead_source}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, lead_source: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 transition"
                      >
                        {dynamicSources.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {bulkEditSelectedFields.lead_source && bulkEditData.lead_source === 'Other' && (
                        <input
                          type="text"
                          required
                          placeholder="Type custom source..."
                          value={bulkCustomSource}
                          onChange={(e) => setBulkCustomSource(e.target.value)}
                          className="mt-1.5 w-full px-3 py-1.5 border border-slate-350 dark:border-slate-650 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        />
                      )}
                    </div>

                    {/* Lead Category */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-chk-lead_category"
                          checked={bulkEditSelectedFields.lead_category}
                          onChange={(e) => setBulkEditSelectedFields(prev => ({ ...prev, lead_category: e.target.checked }))}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                        />
                        <label htmlFor="bulk-chk-lead_category" className="text-xs font-bold text-slate-705 dark:text-slate-300 cursor-pointer select-none">
                          Update Lead Category
                        </label>
                      </div>
                      <select
                        disabled={!bulkEditSelectedFields.lead_category}
                        value={bulkEditData.lead_category}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, lead_category: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 transition"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Lead Type */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-chk-lead_type"
                          checked={bulkEditSelectedFields.lead_type}
                          onChange={(e) => setBulkEditSelectedFields(prev => ({ ...prev, lead_type: e.target.checked }))}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                        />
                        <label htmlFor="bulk-chk-lead_type" className="text-xs font-bold text-slate-705 dark:text-slate-300 cursor-pointer select-none">
                          Update Lead Type
                        </label>
                      </div>
                      <select
                        disabled={!bulkEditSelectedFields.lead_type}
                        value={bulkEditData.lead_type}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, lead_type: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 transition"
                      >
                        {dynamicTypes.map(t => <option key={t} value={t}>{t === 'Other' ? 'Other (custom)' : t}</option>)}
                      </select>
                      {bulkEditSelectedFields.lead_type && bulkEditData.lead_type === 'Other' && (
                        <input
                          type="text"
                          required
                          placeholder="Type custom lead type..."
                          value={bulkCustomType}
                          onChange={(e) => setBulkCustomType(e.target.value)}
                          className="mt-1.5 w-full px-3 py-1.5 border border-slate-355 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white"
                        />
                      )}
                    </div>

                    {/* Lead Status */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-chk-lead_status"
                          checked={bulkEditSelectedFields.lead_status}
                          onChange={(e) => setBulkEditSelectedFields(prev => ({ ...prev, lead_status: e.target.checked }))}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                        />
                        <label htmlFor="bulk-chk-lead_status" className="text-xs font-bold text-slate-705 dark:text-slate-300 cursor-pointer select-none">
                          Update Lead Status
                        </label>
                      </div>
                      <select
                        disabled={!bulkEditSelectedFields.lead_status}
                        value={bulkEditData.lead_status}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, lead_status: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-350 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 transition"
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Priority */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-chk-priority"
                          checked={bulkEditSelectedFields.priority}
                          onChange={(e) => setBulkEditSelectedFields(prev => ({ ...prev, priority: e.target.checked }))}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                        />
                        <label htmlFor="bulk-chk-priority" className="text-xs font-bold text-slate-705 dark:text-slate-300 cursor-pointer select-none">
                          Update Priority
                        </label>
                      </div>
                      <select
                        disabled={!bulkEditSelectedFields.priority}
                        value={bulkEditData.priority}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-355 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 transition"
                      >
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-chk-tags"
                          checked={bulkEditSelectedFields.tags}
                          onChange={(e) => setBulkEditSelectedFields(prev => ({ ...prev, tags: e.target.checked }))}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                        />
                        <label htmlFor="bulk-chk-tags" className="text-xs font-bold text-slate-705 dark:text-slate-300 cursor-pointer select-none">
                          Update Tags
                        </label>
                      </div>
                      <input
                        type="text"
                        disabled={!bulkEditSelectedFields.tags}
                        value={bulkEditData.tags}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, tags: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-355 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 transition"
                        placeholder="VIP, Callback, etc."
                      />
                    </div>

                  </div>
                )}
              </div>

              {/* SECTION 4: TRACKING & OWNERSHIP */}
              <div className="border border-slate-150 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleBulkSection(4)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-750 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <UserCheck className="w-4 h-4" /> Section 4 — Tracking & Ownership
                  </span>
                  {expandedBulkSections[4] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedBulkSections[4] && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-800/40">

                    {/* Assigned To */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition col-span-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="bulk-chk-assigned_to"
                          checked={bulkEditSelectedFields.assigned_to}
                          onChange={(e) => setBulkEditSelectedFields(prev => ({ ...prev, assigned_to: e.target.checked }))}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white dark:bg-slate-700"
                        />
                        <label htmlFor="bulk-chk-assigned_to" className="text-xs font-bold text-slate-705 dark:text-slate-300 cursor-pointer select-none">
                          Update Assigned Agent
                        </label>
                      </div>
                      <input
                        type="text"
                        disabled={!bulkEditSelectedFields.assigned_to}
                        value={bulkEditData.assigned_to}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, assigned_to: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-355 dark:border-slate-655 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/80 transition"
                        placeholder="Rep Name"
                      />
                    </div>

                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-150 dark:border-slate-700 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsBulkEditModalOpen(false)}
                className="px-4 py-2 border border-slate-350 dark:border-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkEditSubmit}
                disabled={actionLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-md disabled:opacity-50 flex items-center gap-1.5 focus:outline-none cursor-pointer"
              >
                {actionLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Update Leads
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedLeadIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700/80 z-50 flex flex-wrap items-center gap-4 animate-in slide-in-from-bottom-5 duration-350 max-w-[95%] sm:max-w-max">
          <div className="flex items-center gap-2 border-r border-slate-800 pr-4">
            <div className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {selectedLeadIds.size}
            </div>
            <span className="text-xs font-bold tracking-wide text-slate-300">Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBulkCustomSource('');
                setBulkCustomType('');
                setBulkEditData({
                  company_name: '',
                  designation: '',
                  industry: '',
                  website: '',
                  company_size: '',
                  business_country: '',
                  business_city: '',
                  lead_source: 'Website',
                  lead_category: 'Warm',
                  lead_type: 'New Lead',
                  lead_status: 'New',
                  priority: 'Medium',
                  tags: '',
                  assigned_to: ''
                });
                setBulkEditSelectedFields({
                  company_name: false,
                  designation: false,
                  industry: false,
                  website: false,
                  company_size: false,
                  business_country: false,
                  business_city: false,
                  lead_source: false,
                  lead_category: false,
                  lead_type: false,
                  lead_status: false,
                  priority: false,
                  tags: false,
                  assigned_to: false
                });
                setExpandedBulkSections({
                  2: true,
                  3: false,
                  4: false
                });
                setIsBulkEditModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5 focus:outline-none"
            >
              <Edit className="w-3.5 h-3.5" /> Edit Selected
            </button>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-800/80 pl-4">
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button
              onClick={() => setSelectedLeadIds(new Set())}
              className="border border-slate-700 hover:bg-slate-800 text-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
