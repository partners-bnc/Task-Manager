"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Pencil,
  Trash2,
  Search,
  Plus,
  Upload,
  FileText,
  Download,
  Info,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Users,
  FolderPlus,
  ArrowLeft,
  X,
  FileUp,
  TrendingUp,
  File,
  Eye,
  Calendar,
  Shield,
  FileSpreadsheet,
  Target,
  ShieldCheck,
  Activity,
  GitBranch,
  FileImage,
  BookOpen,
  Milestone,
  Scale,
  FolderOpen,
  UploadCloud
} from "lucide-react";

// Inline styling for professional hover effects
const Style = () => (
  <style>{`
    .action-btn {
      border: none;
      background: transparent;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .action-btn-edit {
      color: #1e3a8a;
    }
    .action-btn-edit:hover {
      background: #eff6ff;
      color: #2563eb;
    }
    .action-btn-delete {
      color: #dc2626;
    }
    .action-btn-delete:hover {
      background: #fef2f2;
      color: #ef4444;
    }
    .nav-tab-btn {
      padding: 16px 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
    }
    .nav-tab-btn:hover {
      color: #1e3a8a !important;
    }
    .back-btn-hover {
      transition: all 0.2s ease;
    }
    .back-btn-hover:hover {
      background: #f1f5f9 !important;
      color: #0f172a !important;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
  `}</style>
);

// ─── THEME COLORS ───────────────────────────────────────────────────────────
const C = {
  bg: "#f8fafc",
  bg2: "#f1f5f9",
  border: "#e2e8f0",
  border2: "#cbd5e1",
  text1: "#0f172a",
  text2: "#334155",
  text3: "#64748b",
  primary: "#1e3a8a",       // Saudi Audit Deep Navy
  primaryBg: "#eff6ff",
  primaryBorder: "#bfdbfe",
  accent: "#059669",        // Saudi Emerald Green
  accentBg: "#ecfdf5",
  accentBorder: "#a7f3d0",
  red: "#dc2626",
  redBg: "#fef2f2",
  redBorder: "#fca5a5",
  amber: "#d97706",
  amberBg: "#fffbeb",
  amberBorder: "#fde68a",
  blue: "#2563eb",
  blueBg: "#eff6ff",
  blueBorder: "#bfdbfe",
};

// Fonts
const MONO = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

// Default seed values for Saudi Audit
const DEFAULT_PLANNING = {
  purpose: [
    "Provide independent, objective assurance and consulting services to add value and improve organization operations.",
    "Help the organization accomplish goals by bringing a systematic, risk-based approach to evaluating governance, risk management, and controls."
  ],
  standards: [
    "Aligned with the International Standards for the Professional Practice of Internal Auditing (IPPF) issued by the IIA.",
    "Compliant with relevant Saudi regulatory instructions (SOCPA, CMA, and National Cybersecurity Authority - NCA guidelines)."
  ],
  scope: [
    "All business departments, support operations, IT infrastructure, and third-party outsourced processes of the entity inside the Kingdom of Saudi Arabia."
  ],
  methodology: [
    "Risk-Based Assessment: Prioritize high-risk business processes.",
    "Fieldwork & Audit Program: Perform design assessment and operational testing.",
    "Reporting & Follow-Up: Draft reports, audit committee review, and action plan tracking."
  ],
  governance: [
    "Functional reporting to the Audit Committee of the Board of Directors.",
    "Administrative reporting to the Chief Executive Officer."
  ],
  annualPlan: [
    { id: "ap-1", quarter: "Q1 2026", plannedAudits: "Financial Controls and Treasury Audit", status: "Completed" },
    { id: "ap-2", quarter: "Q2 2026", plannedAudits: "Cybersecurity & NCA Standards Compliance", status: "In Progress" },
    { id: "ap-3", quarter: "Q3 2026", plannedAudits: "HR Payroll and GOSI Deductions Audit", status: "Pending" },
    { id: "ap-4", quarter: "Q4 2026", plannedAudits: "Procurement & Vendor Onboarding Audit", status: "Pending" }
  ],
  attachments: []
};

const DEFAULT_RCM = [
  {
    id: "rcm-1",
    serial_no: "RCM-001",
    audit_area: "Finance",
    sub_area: "Bank Reconciliation",
    audit_check: "Verify bank reconciliation statements are prepared monthly and reviewed by the Head of Accounts.",
    risk_description: "Errors, bank charge adjustments, or fraudulent transactions go undetected.",
    control_objective: "All bank accounts are reconciled monthly and differences cleared promptly.",
    audit_procedure: "Examine monthly bank reconciliation files, verify reviewer signatures, and trace unmatched entries.",
    data_requirement: "Reconciliation sheets, bank statements, ledger ledger summary.",
    period_frequency: "Monthly",
    remarks: "High priority cash control."
  },
  {
    id: "rcm-2",
    serial_no: "RCM-002",
    audit_area: "Information Technology",
    sub_area: "Identity & Access Management",
    audit_check: "Verify ERP user access reviews are conducted quarterly to disable inactive or terminated employee accounts.",
    risk_description: "Terminated staff retain login access, leading to data security breaches.",
    control_objective: "Access permissions are revoked immediately upon employee termination.",
    audit_procedure: "Sample terminated employees from HR database and verify their active status in ERP accounts lists.",
    data_requirement: "HR termination list, active ERP user report.",
    period_frequency: "Quarterly",
    remarks: "Important for NCA Cyber compliance."
  },
  {
    id: "rcm-3",
    serial_no: "RCM-003",
    audit_area: "Human Resources",
    sub_area: "Payroll Compliance",
    audit_check: "Confirm payroll deductions for General Organization for Social Insurance (GOSI) are calculated correctly based on basic salary plus housing.",
    risk_description: "Non-compliance with KSA Social Insurance laws resulting in heavy penalty fines.",
    control_objective: "Ensure accurate computation and payment of GOSI contributions.",
    audit_procedure: "Compare HR payroll sheets deductions with monthly GOSI billings and verify wage bases.",
    data_requirement: "GOSI monthly invoices, payroll journals, employee files.",
    period_frequency: "Monthly",
    remarks: "KSA labor regulation standard."
  }
];

const DEFAULT_ORG = [
  {
    id: "org-1",
    serial_no: "ORG-001",
    name: "Fahad Al-Qahtani",
    designation: "Chief Financial Officer (CFO)",
    department_function: "Finance & Accounts",
    phone_number: "+966 50 123 4567",
    email_id: "f.qahtani@company.com.sa"
  },
  {
    id: "org-2",
    serial_no: "ORG-002",
    name: "Sarah Al-Malki",
    designation: "HR Director",
    department_function: "Human Resources",
    phone_number: "+966 53 987 6543",
    email_id: "s.malki@company.com.sa"
  },
  {
    id: "org-3",
    serial_no: "ORG-003",
    name: "Mohammad Al-Otaibi",
    designation: "IT Infrastructure Manager",
    department_function: "Information Technology",
    phone_number: "+966 55 456 7890",
    email_id: "m.otaibi@company.com.sa"
  },
  {
    id: "org-4",
    serial_no: "ORG-004",
    name: "Khalid Al-Dossary",
    designation: "Payroll Lead",
    department_function: "Finance & Accounts",
    phone_number: "+966 56 111 2233",
    email_id: "k.dossary@company.com.sa"
  }
];

const DEFAULT_TRACKER = [
  {
    id: "trk-1",
    serial_no: "TRK-001",
    audit_check: "Verify bank reconciliation statements are prepared monthly and reviewed by the Head of Accounts.",
    sub_area: "Bank Reconciliation",
    data_requested: "Reconciliation sheets, bank statements, ledger ledger summary.",
    purpose_of_request: "All bank accounts are reconciled monthly and differences cleared promptly.",
    requested_on: "2026-06-01",
    requested_to_name: "Fahad Al-Qahtani",
    due_date: "2026-06-10",
    status: "Received",
    date_received: "2026-06-08",
    remarks: "Files uploaded via shared portal. Quality verified."
  },
  {
    id: "trk-2",
    serial_no: "TRK-002",
    audit_check: "Verify ERP user access reviews are conducted quarterly to disable inactive or terminated employee accounts.",
    sub_area: "Identity & Access Management",
    data_requested: "HR termination list, active ERP user report.",
    purpose_of_request: "Access permissions are revoked immediately upon employee termination.",
    requested_on: "2026-06-05",
    requested_to_name: "Mohammad Al-Otaibi",
    due_date: "2026-06-15",
    status: "Partially Received",
    date_received: "2026-06-14",
    remarks: "Terminated employee list obtained. Active user dumps pending."
  },
  {
    id: "trk-3",
    serial_no: "TRK-003",
    audit_check: "Confirm payroll deductions for General Organization for Social Insurance (GOSI) are calculated correctly based on basic salary plus housing.",
    sub_area: "Payroll Compliance",
    data_requested: "GOSI monthly invoices, payroll journals, employee files.",
    purpose_of_request: "Ensure accurate computation and payment of GOSI contributions.",
    requested_on: "2026-06-10",
    requested_to_name: "Sarah Al-Malki",
    due_date: "2026-06-25",
    status: "Pending",
    date_received: "",
    remarks: "Clarification sent on salary components details."
  }
];

const renderBulletPoints = (text, isDataRequirement = false) => {
  if (!text) return "—";
  
  let items = [];
  
  if (isDataRequirement) {
    if (text.includes("\n")) {
      items = text.split("\n").map(s => s.trim()).filter(Boolean);
    } else if (text.includes(",")) {
      items = text.split(",").map(s => s.trim()).filter(Boolean);
    } else if (text.includes(";")) {
      items = text.split(";").map(s => s.trim()).filter(Boolean);
    } else if (text.includes("•")) {
      items = text.split("•").map(s => s.trim()).filter(Boolean);
    } else {
      items = [text.trim()];
    }
  } else {
    if (text.includes("\n")) {
      items = text.split("\n").map(s => s.trim()).filter(Boolean);
    } else if (text.includes("•")) {
      items = text.split("•").map(s => s.trim()).filter(Boolean);
    } else if (text.includes(";")) {
      items = text.split(";").map(s => s.trim()).filter(Boolean);
    } else {
      items = [text.trim()];
    }
  }

  // Clean any leading bullets, numbers, dashes, or stars
  items = items.map(item => item.replace(/^[•\-\*\d\.\)\s]+/, "").trim()).filter(Boolean);

  if (items.length <= 1) {
    return <span>{text}</span>;
  }

  return (
    <ul style={{ margin: 0, paddingLeft: 16, textAlign: "left", listStyleType: "disc" }}>
      {items.map((item, idx) => (
        <li key={idx} style={{ marginBottom: 4, lineHeight: 1.4 }}>
          {item}
        </li>
      ))}
    </ul>
  );
};

export default function SaudiAuditWorkspace({
  selectedTemplate,
  projects,
  setProjects,
  auditMembers,
  search,
  setSearch,
  showToast,
  onBackToTemplates,
}) {
  const [nav, setNav] = useState("dashboard"); // "dashboard" | "project"
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeTab, setActiveTab] = useState("planning"); // "planning" | "rcm" | "tracker" | "org"

  const renderPlanningList = (items) => {
    if (!items || items.length === 0) {
      return <div style={{ color: C.text3, fontSize: 13, fontStyle: "italic" }}>— No items specified —</div>;
    }
    if (items.length === 1) {
      return (
        <div style={{ color: C.text2, fontSize: 13.5, lineHeight: 1.6, paddingLeft: 4 }}>
          {items[0]}
        </div>
      );
    }
    return (
      <ul style={{ paddingLeft: 20, margin: 0, color: C.text2, fontSize: 13.5, lineHeight: 1.6, listStyleType: "disc" }}>
        {items.map((item, idx) => (
          <li key={idx} style={{ marginBottom: 6 }}>{item}</li>
        ))}
      </ul>
    );
  };

  // Local Project Specific States
  const [planning, setPlanning] = useState(DEFAULT_PLANNING);
  const [rcmList, setRcmList] = useState(DEFAULT_RCM);
  const [trackerList, setTrackerList] = useState(DEFAULT_TRACKER);
  const [orgList, setOrgList] = useState(DEFAULT_ORG);

  // Modals management
  const [projectModal, setProjectModal] = useState({ open: false, mode: "create", data: null });
  const [planningModal, setPlanningModal] = useState({ open: false, field: null, val: [] });
  const [planRowModal, setPlanRowModal] = useState({ open: false, mode: "add", data: null });
  const [rcmModal, setRcmModal] = useState({ open: false, mode: "add", data: null });
  const [orgModal, setOrgModal] = useState({ open: false, mode: "add", data: null });
  const [trackerModal, setTrackerModal] = useState({ open: false, mode: "add", data: null });

  // Mapping Excel Uploader Modal State
  const [uploadModal, setUploadModal] = useState({ open: false });
  const [workbookData, setWorkbookData] = useState(null); // { fileName: "", sheets: [{ name: "", rows: [] }] }
  const [targetSheets, setTargetSheets] = useState({ rcm: "", tracker: "", org: "" });
  const [mappings, setMappings] = useState({
    rcm: {},
    tracker: {},
    org: {}
  });
  const [importOption, setImportOption] = useState("append"); // "append" | "overwrite"
  const [dragActive, setDragActive] = useState(false);

  // File attachments in planning
  const fileInputRef = useRef(null);

  // Filter project lists
  const saudiProjects = useMemo(() => {
    return projects.filter(p => p.templateId === "saudi-audit-template");
  }, [projects]);

  const currentProject = useMemo(() => {
    return saudiProjects.find(p => p.id === activeProjectId) || null;
  }, [saudiProjects, activeProjectId]);

  // Load and save local states to/from localStorage
  useEffect(() => {
    if (activeProjectId) {
      const storageKey = `saudi_audit_store_${activeProjectId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPlanning(parsed.planning || DEFAULT_PLANNING);
          setRcmList(parsed.rcmList || DEFAULT_RCM);
          setTrackerList(parsed.trackerList || DEFAULT_TRACKER);
          setOrgList(parsed.orgList || DEFAULT_ORG);
        } catch (e) {
          console.error("Error loading local storage for project: ", e);
        }
      } else {
        // Clear or set to default
        setPlanning(DEFAULT_PLANNING);
        setRcmList(DEFAULT_RCM);
        setTrackerList(DEFAULT_TRACKER);
        setOrgList(DEFAULT_ORG);
      }
    }
  }, [activeProjectId]);

  const saveWorkspaceData = (updatedPlanning, updatedRcm, updatedTracker, updatedOrg) => {
    if (!activeProjectId) return;
    const storageKey = `saudi_audit_store_${activeProjectId}`;
    const payload = {
      planning: updatedPlanning || planning,
      rcmList: updatedRcm || rcmList,
      trackerList: updatedTracker || trackerList,
      orgList: updatedOrg || orgList
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  };

  // ─── PROJECT CRUD ───
  const openProject = (pId) => {
    setActiveProjectId(pId);
    setNav("project");
    setActiveTab("planning");
  };

  const handleCreateProject = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get("name");
    const client = fd.get("client");
    const leader = fd.get("leader");
    const start = fd.get("start");
    const end = fd.get("end");

    if (!name || !client) {
      showToast("error", "Project and Client name are required.");
      return;
    }

    const newProj = {
      id: "saudi-" + Date.now(),
      templateId: "saudi-audit-template",
      name,
      clientName: client,
      projectLeader: leader,
      start,
      end,
      status: "active",
      icon: "🇸🇦",
      procedures: [] // keep compatible with main state
    };

    setProjects([...projects, newProj]);
    setProjectModal({ open: false, mode: "create", data: null });
    showToast("success", "Saudi Audit project created successfully!");
    openProject(newProj.id);
  };

  const handleEditProject = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get("name");
    const client = fd.get("client");
    const leader = fd.get("leader");
    const start = fd.get("start");
    const end = fd.get("end");

    if (!name || !client) {
      showToast("error", "Project and Client name are required.");
      return;
    }

    const updated = projects.map(p => {
      if (p.id === projectModal.data.id) {
        return { ...p, name, clientName: client, projectLeader: leader, start, end };
      }
      return p;
    });

    setProjects(updated);
    setProjectModal({ open: false, mode: "edit", data: null });
    showToast("success", "Project configurations updated.");
  };

  const handleDeleteProject = (pId) => {
    if (confirm("Are you sure you want to delete this Saudi Audit project? All audit records will be lost.")) {
      const updated = projects.filter(p => p.id !== pId);
      setProjects(updated);
      localStorage.removeItem(`saudi_audit_store_${pId}`);
      showToast("success", "Project deleted successfully.");
      if (activeProjectId === pId) {
        setNav("dashboard");
        setActiveProjectId(null);
      }
    }
  };

  // ─── PLANNING CRUD ───
  const updatePlanningField = (field, arrayValues) => {
    const next = { ...planning, [field]: arrayValues };
    setPlanning(next);
    saveWorkspaceData(next, null, null, null);
    showToast("success", "Planning section updated.");
  };

  const handleAddPlanRow = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const quarter = fd.get("quarter");
    const plannedAudits = fd.get("plannedAudits");
    const status = fd.get("status");

    if (!quarter || !plannedAudits) return;

    const newRow = {
      id: "ap-" + Date.now(),
      quarter,
      plannedAudits,
      status
    };

    const nextPlan = { ...planning, annualPlan: [...(planning.annualPlan || []), newRow] };
    setPlanning(nextPlan);
    saveWorkspaceData(nextPlan, null, null, null);
    setPlanRowModal({ open: false, mode: "add", data: null });
    showToast("success", "Quarter added to audit plan.");
  };

  const handleEditPlanRow = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const quarter = fd.get("quarter");
    const plannedAudits = fd.get("plannedAudits");
    const status = fd.get("status");

    const nextRows = (planning.annualPlan || []).map(r => {
      if (r.id === planRowModal.data.id) {
        return { ...r, quarter, plannedAudits, status };
      }
      return r;
    });

    const nextPlan = { ...planning, annualPlan: nextRows };
    setPlanning(nextPlan);
    saveWorkspaceData(nextPlan, null, null, null);
    setPlanRowModal({ open: false, mode: "edit", data: null });
    showToast("success", "Audit plan row updated.");
  };

  const handleDeletePlanRow = (id) => {
    if (confirm("Remove this audit plan row?")) {
      const nextRows = (planning.annualPlan || []).filter(r => r.id !== id);
      const nextPlan = { ...planning, annualPlan: nextRows };
      setPlanning(nextPlan);
      saveWorkspaceData(nextPlan, null, null, null);
      showToast("success", "Audit plan row removed.");
    }
  };

  // Planning Attachments Upload
  const handleAttachmentUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const nextAttachments = [...(planning.attachments || [])];
    files.forEach(f => {
      const reader = new FileReader();
      reader.onloadend = () => {
        nextAttachments.push({
          id: "att-" + Date.now() + Math.random().toString(36).substr(2, 5),
          name: f.name,
          size: (f.size / 1024).toFixed(1) + " KB",
          type: f.name.split(".").pop().toLowerCase(),
          dataUrl: reader.result,
          uploadedAt: new Date().toLocaleDateString()
        });
        const nextPlan = { ...planning, attachments: nextAttachments };
        setPlanning(nextPlan);
        saveWorkspaceData(nextPlan, null, null, null);
      };
      reader.readAsDataURL(f);
    });

    showToast("success", `${files.length} attachment(s) uploaded.`);
  };

  const removeAttachment = (id) => {
    const nextAtts = (planning.attachments || []).filter(a => a.id !== id);
    const nextPlan = { ...planning, attachments: nextAtts };
    setPlanning(nextPlan);
    saveWorkspaceData(nextPlan, null, null, null);
    showToast("success", "Attachment removed.");
  };

  // ─── MASTER RCM CRUD ───
  const handleAddRcm = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newRcm = {
      id: "rcm-" + Date.now(),
      serial_no: fd.get("serial_no") || `RCM-${rcmList.length + 1}`,
      audit_area: fd.get("audit_area"),
      sub_area: fd.get("sub_area"),
      audit_check: fd.get("audit_check"),
      risk_description: fd.get("risk_description"),
      control_objective: fd.get("control_objective"),
      audit_procedure: fd.get("audit_procedure"),
      data_requirement: fd.get("data_requirement"),
      period_frequency: fd.get("period_frequency"),
      remarks: fd.get("remarks")
    };

    const next = [...rcmList, newRcm];
    setRcmList(next);
    saveWorkspaceData(null, next, null, null);
    setRcmModal({ open: false, mode: "add", data: null });
    showToast("success", "Control added to Master RCM.");
  };

  const handleEditRcm = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = rcmList.map(r => {
      if (r.id === rcmModal.data.id) {
        return {
          ...r,
          serial_no: fd.get("serial_no"),
          audit_area: fd.get("audit_area"),
          sub_area: fd.get("sub_area"),
          audit_check: fd.get("audit_check"),
          risk_description: fd.get("risk_description"),
          control_objective: fd.get("control_objective"),
          audit_procedure: fd.get("audit_procedure"),
          data_requirement: fd.get("data_requirement"),
          period_frequency: fd.get("period_frequency"),
          remarks: fd.get("remarks")
        };
      }
      return r;
    });

    setRcmList(updated);
    saveWorkspaceData(null, updated, null, null);
    setRcmModal({ open: false, mode: "edit", data: null });
    showToast("success", "RCM control updated.");
  };

  const handleDeleteRcm = (id) => {
    if (confirm("Delete this control from Master RCM?")) {
      const next = rcmList.filter(r => r.id !== id);
      setRcmList(next);
      saveWorkspaceData(null, next, null, null);
      showToast("success", "Control removed.");
    }
  };

  // ─── ORGANISATION CHART CRUD ───
  const handleAddOrg = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newOrg = {
      id: "org-" + Date.now(),
      serial_no: fd.get("serial_no") || `ORG-${orgList.length + 1}`,
      name: fd.get("name"),
      designation: fd.get("designation"),
      department_function: fd.get("department_function"),
      phone_number: fd.get("phone_number"),
      email_id: fd.get("email_id")
    };

    const next = [...orgList, newOrg];
    setOrgList(next);
    saveWorkspaceData(null, null, null, next);
    setOrgModal({ open: false, mode: "add", data: null });
    showToast("success", "Member added to Organisation Chart.");
  };

  const handleEditOrg = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = orgList.map(o => {
      if (o.id === orgModal.data.id) {
        return {
          ...o,
          serial_no: fd.get("serial_no"),
          name: fd.get("name"),
          designation: fd.get("designation"),
          department_function: fd.get("department_function"),
          phone_number: fd.get("phone_number"),
          email_id: fd.get("email_id")
        };
      }
      return o;
    });

    setOrgList(updated);
    saveWorkspaceData(null, null, null, updated);
    setOrgModal({ open: false, mode: "edit", data: null });
    showToast("success", "Member details updated.");
  };

  const handleDeleteOrg = (id) => {
    if (confirm("Delete this member from the Organisation Chart?")) {
      const next = orgList.filter(o => o.id !== id);
      setOrgList(next);
      saveWorkspaceData(null, null, null, next);
      showToast("success", "Member removed.");
    }
  };

  // ─── DATA TRACKER CRUD ───
  const handleTrackerAttachmentUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const currentAttachments = [...(trackerModal.data?.attachments || [])];
    
    let loadedCount = 0;
    files.forEach(f => {
      const reader = new FileReader();
      reader.onloadend = () => {
        currentAttachments.push({
          id: "att-" + Date.now() + Math.random().toString(36).substr(2, 5),
          name: f.name,
          size: (f.size / 1024).toFixed(1) + " KB",
          type: f.name.split(".").pop().toLowerCase(),
          dataUrl: reader.result,
          uploadedAt: new Date().toLocaleDateString()
        });
        
        loadedCount++;
        if (loadedCount === files.length) {
          setTrackerModal(prev => ({
            ...prev,
            data: {
              ...(prev.data || {}),
              attachments: currentAttachments
            }
          }));
          showToast("success", `Attached ${files.length} document(s). Save changes to persist.`);
        }
      };
      reader.readAsDataURL(f);
    });
  };

  const removeTrackerAttachment = (attId) => {
    const nextAtts = (trackerModal.data?.attachments || []).filter(a => a.id !== attId);
    setTrackerModal(prev => ({
      ...prev,
      data: {
        ...(prev.data || {}),
        attachments: nextAtts
      }
    }));
    showToast("success", "Attachment scheduled for removal. Save changes to persist.");
  };

  const downloadAttachmentFile = (att) => {
    const link = document.createElement("a");
    link.href = att.dataUrl;
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddTracker = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const checkText = fd.get("audit_check");
    const matchedRcm = rcmList.find(r => r.audit_check === checkText);

    const newTrk = {
      id: "trk-" + Date.now(),
      serial_no: fd.get("serial_no") || `TRK-${trackerList.length + 1}`,
      audit_check: checkText,
      sub_area: matchedRcm ? matchedRcm.sub_area : fd.get("sub_area"),
      data_requested: matchedRcm ? matchedRcm.data_requirement : fd.get("data_requested"),
      purpose_of_request: matchedRcm ? matchedRcm.control_objective : fd.get("purpose_of_request"),
      requested_on: fd.get("requested_on"),
      requested_to_name: fd.get("requested_to_name"),
      due_date: fd.get("due_date"),
      status: fd.get("status") || "Pending",
      date_received: fd.get("date_received") || "",
      remarks: fd.get("remarks"),
      attachments: trackerModal.data?.attachments || []
    };

    const next = [...trackerList, newTrk];
    setTrackerList(next);
    saveWorkspaceData(null, null, next, null);
    setTrackerModal({ open: false, mode: "add", data: null });
    showToast("success", "Audit request added to tracker.");
  };

  const handleEditTracker = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const checkText = fd.get("audit_check");
    const matchedRcm = rcmList.find(r => r.audit_check === checkText);

    const updated = trackerList.map(t => {
      if (t.id === trackerModal.data.id) {
        return {
          ...t,
          serial_no: fd.get("serial_no"),
          audit_check: checkText,
          sub_area: matchedRcm ? matchedRcm.sub_area : fd.get("sub_area"),
          data_requested: matchedRcm ? matchedRcm.data_requirement : fd.get("data_requested"),
          purpose_of_request: matchedRcm ? matchedRcm.control_objective : fd.get("purpose_of_request"),
          requested_on: fd.get("requested_on"),
          requested_to_name: fd.get("requested_to_name"),
          due_date: fd.get("due_date"),
          status: fd.get("status"),
          date_received: fd.get("date_received"),
          remarks: fd.get("remarks"),
          attachments: trackerModal.data?.attachments || []
        };
      }
      return t;
    });

    setTrackerList(updated);
    saveWorkspaceData(null, null, updated, null);
    setTrackerModal({ open: false, mode: "edit", data: null });
    showToast("success", "Tracker request updated.");
  };

  const handleDeleteTracker = (id) => {
    if (confirm("Remove this request from Data Tracker?")) {
      const next = trackerList.filter(t => t.id !== id);
      setTrackerList(next);
      saveWorkspaceData(null, null, next, null);
      showToast("success", "Request removed.");
    }
  };

  // Calculated KPIs for Data Tracker
  const trackerKPIs = useMemo(() => {
    const total = trackerList.length;
    const received = trackerList.filter(t => t.status === "Received").length;
    const partial = trackerList.filter(t => t.status === "Partially Received").length;
    const pending = trackerList.filter(t => t.status === "Pending").length;
    const overdue = trackerList.filter(t => {
      if (t.status === "Received") return false;
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date() && t.status !== "Received";
    }).length;

    const compliance = total > 0 ? Math.round(((received + (partial * 0.5)) / total) * 100) : 0;

    return { total, received, partial, pending, overdue, compliance };
  }, [trackerList]);

  // ─── SHEET PARSING & MAPPING ───
  const loadXlsxLibrary = async () => {
    if (window.XLSX) return window.XLSX;
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => reject(new Error("SheetJS failed to load."));
      document.head.appendChild(script);
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processUploadedFile(e.target.files[0]);
    }
  };

  // Auto-detect columns based on target section fields
  const detectFields = (headers, targetType) => {
    const mapping = {};
    const lowerHeaders = headers.map(h => String(h).toLowerCase().trim().replace(/[\s_\-\.\/\(\)]/g, ""));

    const config = {
      rcm: {
        serial_no: ["sno", "srno", "serial", "id", "controlid", "ref"],
        audit_area: ["auditarea", "area", "domain", "process"],
        sub_area: ["subarea", "subprocess", "controlsubarea"],
        audit_check: ["auditcheck", "controlcheck", "testcheck", "checkdescription"],
        risk_description: ["risk", "riskdescription", "threat"],
        control_objective: ["controlobjective", "objective"],
        audit_procedure: ["auditprocedure", "testprocedure", "teststep"],
        data_requirement: ["datarequirement", "datarequested", "evidence", "documentrequirement"],
        period_frequency: ["frequency", "period", "periodicity"],
        remarks: ["remarks", "comment", "note"]
      },
      tracker: {
        serial_no: ["sno", "srno", "serial", "id", "requestid"],
        audit_check: ["auditcheck", "check", "control", "referencedcheck"],
        sub_area: ["subarea", "subprocess", "area"],
        data_requested: ["data", "datarequested", "documentname", "requirement"],
        purpose_of_request: ["purpose", "purposeofrequest", "controlobjective"],
        requested_on: ["requestedon", "dateofrequest", "requestdate"],
        requested_to_name: ["requestedto", "assignee", "coordinator", "owner", "person"],
        due_date: ["duedate", "deadline", "targetdate"],
        status: ["status", "state", "progress"],
        date_received: ["receivedon", "datereceived", "receiptdate"],
        remarks: ["remarks", "notes", "comment"]
      },
      org: {
        serial_no: ["sno", "srno", "serial", "id", "memberid"],
        name: ["name", "fullname", "employee", "personnel"],
        designation: ["designation", "role", "title", "position"],
        department_function: ["department", "function", "dept", "team"],
        phone_number: ["phone", "phonenumber", "mobile", "contact"],
        email_id: ["email", "emailid", "mail", "address"]
      }
    };

    const targetConfig = config[targetType];
    Object.keys(targetConfig).forEach(field => {
      const aliases = targetConfig[field];
      // Find matches
      let matchedIdx = -1;
      for (let i = 0; i < lowerHeaders.length; i++) {
        if (aliases.includes(lowerHeaders[i]) || aliases.some(alias => lowerHeaders[i].includes(alias))) {
          matchedIdx = i;
          break;
        }
      }
      if (matchedIdx !== -1) {
        mapping[field] = headers[matchedIdx];
      } else {
        mapping[field] = ""; // Let user map manually
      }
    });

    return mapping;
  };

  const processUploadedFile = async (file) => {
    try {
      const XLSX = await loadXlsxLibrary();
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      const sheetsData = workbook.SheetNames.map(name => {
        const worksheet = workbook.Sheets[name];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        return { name, rows: jsonRows };
      });

      // Simple Auto-tab recognition
      const newTargetSheets = { rcm: "", tracker: "", org: "" };
      sheetsData.forEach(sh => {
        const lowerName = sh.name.toLowerCase();
        if (lowerName.includes("rcm") || lowerName.includes("matrix") || lowerName.includes("risk")) {
          newTargetSheets.rcm = sh.name;
        } else if (lowerName.includes("track") || lowerName.includes("request")) {
          newTargetSheets.tracker = sh.name;
        } else if (lowerName.includes("org") || lowerName.includes("chart") || lowerName.includes("people") || lowerName.includes("staff")) {
          newTargetSheets.org = sh.name;
        }
      });

      // Fallbacks if not auto detected
      if (!newTargetSheets.rcm && sheetsData[0]) newTargetSheets.rcm = sheetsData[0].name;
      if (!newTargetSheets.tracker && sheetsData[1]) newTargetSheets.tracker = sheetsData[1].name;
      else if (!newTargetSheets.tracker && sheetsData[0]) newTargetSheets.tracker = sheetsData[0].name;
      if (!newTargetSheets.org && sheetsData[2]) newTargetSheets.org = sheetsData[2].name;
      else if (!newTargetSheets.org && sheetsData[0]) newTargetSheets.org = sheetsData[0].name;

      // Detect mappings
      const newMappings = { rcm: {}, tracker: {}, org: {} };
      Object.keys(newTargetSheets).forEach(key => {
        const selectedSheet = sheetsData.find(s => s.name === newTargetSheets[key]);
        if (selectedSheet && selectedSheet.rows.length > 0) {
          const headers = selectedSheet.rows[0];
          newMappings[key] = detectFields(headers, key);
        }
      });

      setWorkbookData({ fileName: file.name, sheets: sheetsData });
      setTargetSheets(newTargetSheets);
      setMappings(newMappings);
    } catch (err) {
      showToast("error", "Failed to parse excel file: " + err.message);
    }
  };

  const handleSheetChange = (section, sheetName) => {
    const nextSheets = { ...targetSheets, [section]: sheetName };
    setTargetSheets(nextSheets);

    const sheet = workbookData.sheets.find(s => s.name === sheetName);
    if (sheet && sheet.rows.length > 0) {
      const headers = sheet.rows[0];
      setMappings(prev => ({
        ...prev,
        [section]: detectFields(headers, section)
      }));
    }
  };

  const handleMappingChange = (section, targetField, sourceCol) => {
    setMappings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [targetField]: sourceCol
      }
    }));
  };

  const executeImport = () => {
    if (!workbookData) return;

    let importedRcm = [];
    let importedTracker = [];
    let importedOrg = [];

    // Parse RCM
    if (targetSheets.rcm) {
      const rcmSheet = workbookData.sheets.find(s => s.name === targetSheets.rcm);
      if (rcmSheet && rcmSheet.rows.length > 1) {
        const headers = rcmSheet.rows[0];
        const rows = rcmSheet.rows.slice(1);
        const map = mappings.rcm;

        importedRcm = rows.map((row, idx) => {
          const item = { id: "rcm-imp-" + idx + "-" + Date.now() };
          Object.keys(map).forEach(field => {
            const srcCol = map[field];
            const colIdx = headers.indexOf(srcCol);
            item[field] = colIdx !== -1 ? String(row[colIdx] || "").trim() : "";
          });
          if (!item.serial_no) item.serial_no = `RCM-IMP-${idx + 1}`;
          return item;
        }).filter(item => item.audit_check || item.audit_area);
      }
    }

    // Parse Tracker
    if (targetSheets.tracker) {
      const trkSheet = workbookData.sheets.find(s => s.name === targetSheets.tracker);
      if (trkSheet && trkSheet.rows.length > 1) {
        const headers = trkSheet.rows[0];
        const rows = trkSheet.rows.slice(1);
        const map = mappings.tracker;

        importedTracker = rows.map((row, idx) => {
          const item = { id: "trk-imp-" + idx + "-" + Date.now() };
          Object.keys(map).forEach(field => {
            const srcCol = map[field];
            const colIdx = headers.indexOf(srcCol);
            let val = colIdx !== -1 ? String(row[colIdx] || "").trim() : "";
            // Dates formatting
            if ((field === "requested_on" || field === "due_date" || field === "date_received") && val) {
              // try standard format conversions if it is numeric xlsx date
              if (!isNaN(val) && Number(val) > 30000) {
                const date = new Date((Number(val) - 25569) * 86400 * 1000);
                val = date.toISOString().split("T")[0];
              }
            }
            item[field] = val;
          });
          if (!item.serial_no) item.serial_no = `TRK-IMP-${idx + 1}`;
          if (!item.status) item.status = "Pending";
          return item;
        }).filter(item => item.audit_check || item.data_requested);
      }
    }

    // Parse Org
    if (targetSheets.org) {
      const orgSheet = workbookData.sheets.find(s => s.name === targetSheets.org);
      if (orgSheet && orgSheet.rows.length > 1) {
        const headers = orgSheet.rows[0];
        const rows = orgSheet.rows.slice(1);
        const map = mappings.org;

        importedOrg = rows.map((row, idx) => {
          const item = { id: "org-imp-" + idx + "-" + Date.now() };
          Object.keys(map).forEach(field => {
            const srcCol = map[field];
            const colIdx = headers.indexOf(srcCol);
            item[field] = colIdx !== -1 ? String(row[colIdx] || "").trim() : "";
          });
          if (!item.serial_no) item.serial_no = `ORG-IMP-${idx + 1}`;
          return item;
        }).filter(item => item.name);
      }
    }

    // Apply mappings to state
    let nextRcm = rcmList;
    let nextTracker = trackerList;
    let nextOrg = orgList;

    if (importOption === "overwrite") {
      if (importedRcm.length) nextRcm = importedRcm;
      if (importedTracker.length) nextTracker = importedTracker;
      if (importedOrg.length) nextOrg = importedOrg;
    } else {
      if (importedRcm.length) nextRcm = [...rcmList, ...importedRcm];
      if (importedTracker.length) nextTracker = [...trackerList, ...importedTracker];
      if (importedOrg.length) nextOrg = [...orgList, ...importedOrg];
    }

    setRcmList(nextRcm);
    setTrackerList(nextTracker);
    setOrgList(nextOrg);
    saveWorkspaceData(planning, nextRcm, nextTracker, nextOrg);

    showToast("success", `Workbook Imported! RCM: ${importedRcm.length} rows, Tracker: ${importedTracker.length} rows, Org Chart: ${importedOrg.length} rows.`);
    setUploadModal({ open: false });
    setWorkbookData(null);
  };

  // Export Excel Workbook utility
  const exportWorkbook = async () => {
    try {
      const XLSX = await loadXlsxLibrary();
      const workbook = XLSX.utils.book_new();

      // Tab 1: Planning Overview info
      const planningDataSheet = [
        ["Saudi Audit Planning & Scope Summary"],
        ["Project:", currentProject?.name || "Saudi Audit"],
        ["Client Name:", currentProject?.clientName || ""],
        ["Project Leader:", currentProject?.projectLeader || ""],
        [],
        ["1. Purpose & Objectives"],
        ...planning.purpose.map(p => ["- " + p]),
        [],
        ["2. Standards & Alignment"],
        ...planning.standards.map(s => ["- " + s]),
        [],
        ["3. Scope of Audit"],
        ...planning.scope.map(sc => ["- " + sc]),
        [],
        ["4. Audit Approach & Methodology"],
        ...planning.methodology.map(m => ["- " + m]),
        [],
        ["5. Reporting Governance"],
        ...planning.governance.map(g => ["- " + g]),
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(planningDataSheet), "Planning & Scope");

      // Tab 2: Annual Plan
      const annualPlanData = [
        ["Quarter", "Planned Audits", "Status"]
      ];
      planning.annualPlan.forEach(p => {
        annualPlanData.push([p.quarter, p.plannedAudits, p.status]);
      });
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(annualPlanData), "Annual Plan");

      // Tab 3: RCM
      const rcmSheetData = [
        ["S.No", "Audit Area", "Sub Area", "Audit Check", "Risk Description", "Control Objective", "Audit Procedure", "Data Requirement", "Period / Frequency", "Remarks"]
      ];
      rcmList.forEach(r => {
        rcmSheetData.push([
          r.serial_no, r.audit_area, r.sub_area, r.audit_check, r.risk_description,
          r.control_objective, r.audit_procedure, r.data_requirement, r.period_frequency, r.remarks
        ]);
      });
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rcmSheetData), "Master RCM");

      // Tab 4: Tracker
      const trkSheetData = [
        ["Sr. No.", "Audit Check", "Sub Area", "Data Requested", "Purpose of Request", "Requested On", "Requested To", "Due Date", "Status", "Date Received", "Remarks"]
      ];
      trackerList.forEach(t => {
        trkSheetData.push([
          t.serial_no, t.audit_check, t.sub_area, t.data_requested, t.purpose_of_request,
          t.requested_on, t.requested_to_name, t.due_date, t.status, t.date_received, t.remarks
        ]);
      });
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(trkSheetData), "Data Tracker");

      // Tab 5: Org
      const orgSheetData = [
        ["S.No", "Name", "Designation", "Department / Function", "Phone Number", "Email ID"]
      ];
      orgList.forEach(o => {
        orgSheetData.push([
          o.serial_no, o.name, o.designation, o.department_function, o.phone_number, o.email_id
        ]);
      });
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(orgSheetData), "Organisation Chart");

      // Download file
      const fileName = `${(currentProject?.name || "Saudi_Audit").replace(/\s+/g, "_")}_Export.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showToast("success", `Audit Workbook exported as ${fileName}`);
    } catch (e) {
      showToast("error", "Failed to export Excel: " + e.message);
    }
  };

  // Pre-fill Tracker request modal details when RCM check is picked
  const onRcmSelectInTrackerForm = (checkText, formRef) => {
    const matched = rcmList.find(r => r.audit_check === checkText);
    if (matched && formRef) {
      const subAreaInput = formRef.querySelector('input[name="sub_area"]');
      const dataReqInput = formRef.querySelector('textarea[name="data_requested"]');
      const purposeInput = formRef.querySelector('textarea[name="purpose_of_request"]');

      if (subAreaInput) subAreaInput.value = matched.sub_area;
      if (dataReqInput) dataReqInput.value = matched.data_requirement;
      if (purposeInput) purposeInput.value = matched.control_objective;
    }
  };

  // Helper for Badge colors in status
  const getStatusStyle = (st) => {
    switch (st) {
      case "Completed":
      case "Received":
        return { color: "#065f46", bg: "#d1fae5", border: "#a7f3d0", dot: "#059669" };
      case "In Progress":
      case "Partially Received":
        return { color: "#92400e", bg: "#fef3c7", border: "#fde68a", dot: "#d97706" };
      case "Pending":
        return { color: "#374151", bg: "#f3f4f6", border: "#e5e7eb", dot: "#9ca3af" };
      case "Overdue":
        return { color: "#991b1b", bg: "#fee2e2", border: "#fca5a5", dot: "#dc2626" };
      default:
        return { color: "#374151", bg: "#ffffff", border: "#e5e7eb", dot: "#6b7280" };
    }
  };

  // Filter lists by global search query
  const filteredRcm = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rcmList;
    return rcmList.filter(r =>
      r.audit_area.toLowerCase().includes(q) ||
      r.sub_area.toLowerCase().includes(q) ||
      r.audit_check.toLowerCase().includes(q) ||
      (r.remarks || "").toLowerCase().includes(q)
    );
  }, [rcmList, search]);

  const filteredTracker = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return trackerList;
    return trackerList.filter(t =>
      t.audit_check.toLowerCase().includes(q) ||
      t.sub_area.toLowerCase().includes(q) ||
      t.requested_to_name.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    );
  }, [trackerList, search]);

  const filteredOrg = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orgList;
    return orgList.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.designation.toLowerCase().includes(q) ||
      o.department_function.toLowerCase().includes(q) ||
      (o.email_id || "").toLowerCase().includes(q)
    );
  }, [orgList, search]);

  // Grouped Org chart members by Department for gorgeous visual overview
  const orgGroups = useMemo(() => {
    const groups = {};
    orgList.forEach(m => {
      const dept = m.department_function || "Uncategorized";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(m);
    });
    return groups;
  }, [orgList]);


  // ───────────────────────────────────────────────────────────────────────────
  // ─── RENDER DASHBOARD (PROJECT LIST) ───────────────────────────────────────
  // ───────────────────────────────────────────────────────────────────────────
  if (nav === "dashboard") {
    return (
      <div style={{ flex: 1, padding: "28px 40px", background: C.bg, overflowY: "auto", minHeight: "100vh" }}>
        <Style />
        {/* Title bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button 
                onClick={onBackToTemplates} 
                className="action-btn back-btn-hover"
                style={{ color: C.text3, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <ArrowLeft size={18} />
              </button>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text1, margin: 0, fontFamily: "Sora, sans-serif" }}>
                Saudi Audit Workspace
              </h1>
            </div>
            <p style={{ color: C.text3, fontSize: 13.5, margin: "4px 0 0 38px" }}>
              Manage audit assignments, master risk-control matrices, data collection trackers, and organization personnel.
            </p>
          </div>

          <button
            onClick={() => setProjectModal({ open: true, mode: "create", data: null })}
            style={{
              background: C.primary,
              color: "#fff",
              border: "none",
              padding: "10px 18px",
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: `0 4px 14px ${C.primary}33`,
              transition: "transform 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "none"}
          >
            <Plus size={16} /> New Saudi Audit
          </button>
        </div>

        {/* Project grid list */}
        {saudiProjects.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, textAlign: "center" }}>
            <FileSpreadsheet size={56} style={{ color: C.primary, opacity: 0.8, marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text1, margin: "0 0 8px 0" }}>No Saudi Audit Projects Yet</h3>
            <p style={{ color: C.text3, fontSize: 13.5, maxWidth: 400, margin: "0 0 20px 0" }}>
              Create a new audit engagement targeting Saudi regulatory guidelines, RCM matching, and interactive workflows.
            </p>
            <button
              onClick={() => setProjectModal({ open: true, mode: "create", data: null })}
              style={{ background: C.primary, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
            >
              Create First Project
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {saudiProjects.map(proj => {
              // Read local statistics if present to show completion info
              let savedData = null;
              try { savedData = JSON.parse(localStorage.getItem(`saudi_audit_store_${proj.id}`) || "{}"); } catch(e){}
              const totalChecks = savedData?.rcmList?.length || DEFAULT_RCM.length;
              const trackerItems = savedData?.trackerList || DEFAULT_TRACKER;
              const receivedItems = trackerItems.filter(t => t.status === "Received").length;
              const complPercent = trackerItems.length > 0 ? Math.round((receivedItems / trackerItems.length) * 100) : 0;

              return (
                <div
                  key={proj.id}
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    border: `1px solid ${C.border}`,
                    padding: 24,
                    cursor: "pointer",
                    transition: "all 0.25s",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                  }}
                  onClick={() => openProject(proj.id)}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = C.primary;
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(30,58,138,0.06)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <FileSpreadsheet size={32} style={{ color: C.primary }} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          title="Edit Config"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectModal({ open: true, mode: "edit", data: proj });
                          }}
                          className="action-btn action-btn-edit"
                          style={{ width: 28, height: 28, background: C.bg2 }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          title="Delete Project"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(proj.id);
                          }}
                          className="action-btn action-btn-delete"
                          style={{ width: 28, height: 28, background: C.redBg }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text1, margin: "0 0 6px 0", fontFamily: "Sora, sans-serif" }}>
                      {proj.name}
                    </h3>
                    <p style={{ color: C.text3, fontSize: 12.5, margin: "0 0 16px 0", fontWeight: 500 }}>
                      Client: <strong style={{ color: C.text2 }}>{proj.clientName}</strong>
                    </p>

                    {/* Stats metrics */}
                    <div style={{ background: C.bg, borderRadius: 10, padding: 12, marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: C.text3, marginBottom: 6 }}>
                        <span>Master Controls:</span>
                        <strong style={{ color: C.text1 }}>{totalChecks}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: C.text3, marginBottom: 6 }}>
                        <span>Pending Evidence:</span>
                        <strong style={{ color: C.text1 }}>{trackerItems.filter(t => t.status === "Pending").length} / {trackerItems.length}</strong>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${complPercent}%`, height: "100%", background: C.accent, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: C.accent }}>{complPercent}%</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                    <span style={{ fontSize: 11.5, color: C.text3, fontFamily: MONO, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={13} /> {proj.start ? proj.start : "No dates set"}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, display: "flex", alignItems: "center", gap: 4 }}>
                      Open Engagement →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ──────── CREATE/EDIT PROJECT MODAL ──────── */}
        {projectModal.open && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(3px)" }}>
            <div style={{ background: "#fff", borderRadius: 16, width: 480, padding: 32, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 850, color: C.text1, margin: 0, fontFamily: "Sora, sans-serif" }}>
                  {projectModal.mode === "create" ? "Create Saudi Audit Project" : "Edit Project Details"}
                </h3>
                <button onClick={() => setProjectModal({ open: false, mode: "create", data: null })} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: C.text3 }}>✕</button>
              </div>

              <form onSubmit={projectModal.mode === "create" ? handleCreateProject : handleEditProject}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Project / Engagement Name</label>
                    <input name="name" defaultValue={projectModal.data?.name || ""} placeholder="e.g. Saudi Aramco Compliance Review" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5 }} required />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Client Name</label>
                    <input name="client" defaultValue={projectModal.data?.clientName || ""} placeholder="e.g. Saudi Aramco Ltd." style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5 }} required />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Project Lead / Auditor</label>
                    <input name="leader" defaultValue={projectModal.data?.projectLeader || ""} placeholder="e.g. Fahad Bin Khalid" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5 }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Start Date</label>
                      <input type="date" name="start" defaultValue={projectModal.data?.start || ""} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>End Date</label>
                      <input type="date" name="end" defaultValue={projectModal.data?.end || ""} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5 }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                    <button type="submit" style={{ flex: 1, background: C.primary, color: "#fff", border: "none", padding: "11px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
                      Confirm & Save
                    </button>
                    <button type="button" onClick={() => setProjectModal({ open: false, mode: "create", data: null })} style={{ background: C.bg2, color: C.text2, border: "none", padding: "11px 16px", borderRadius: 8, fontWeight: 650, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }


  // ───────────────────────────────────────────────────────────────────────────
  // ─── RENDER PROJECT WORKSPACE ──────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, minHeight: "100vh" }}>
      
      <Style />
      {/* ─── WORKSPACE HEADER ─── */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "18px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button 
              onClick={() => setNav("dashboard")} 
              className="back-btn-hover"
              style={{ background: C.bg, border: `1px solid ${C.border}`, width: 32, height: 32, borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.text2 }}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileSpreadsheet size={20} style={{ color: C.primary }} />
                <h2 style={{ fontSize: 18, fontWeight: 850, color: C.text1, margin: 0, fontFamily: "Sora, sans-serif" }}>
                  {currentProject?.name}
                </h2>
                <span style={{ background: C.primaryBg, color: C.primary, border: `1px solid ${C.primaryBorder}`, borderRadius: 20, fontSize: 10, fontFamily: MONO, fontWeight: 700, padding: "2px 8px" }}>
                  SAUDI AUDIT MODULE
                </span>
              </div>
              <p style={{ margin: "2px 0 0 28px", fontSize: 12.5, color: C.text3 }}>
                Client: <strong style={{ color: C.text2 }}>{currentProject?.clientName}</strong> | Auditor: <strong style={{ color: C.text2 }}>{currentProject?.projectLeader || "Unassigned"}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Global actions */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setUploadModal({ open: true })}
            style={{
              background: "#fff",
              color: C.primary,
              border: `1.5px solid ${C.primary}`,
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Upload size={15} /> Import Excel Workbook
          </button>

          <button
            onClick={exportWorkbook}
            style={{
              background: C.primary,
              color: "#fff",
              border: "none",
              padding: "9px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Download size={15} /> Export Audit Excel
          </button>
        </div>
      </div>

      {/* ─── WORKSPACE NAVIGATION TABS ─── */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", gap: 24 }}>
        {[
          { key: "planning", label: "Planning & Scope", icon: <FileText size={16} /> },
          { key: "rcm", label: "Master RCM", icon: <Shield size={16} />, badge: rcmList.length },
          { key: "tracker", label: "Data Tracker", icon: <TrendingUp size={16} />, badge: trackerList.length },
          { key: "org", label: "Organisation Chart", icon: <Users size={16} />, badge: orgList.length }
        ].map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="nav-tab-btn"
              style={{
                borderBottom: `3px solid ${isActive ? C.primary : "transparent"}`,
                color: isActive ? C.primary : C.text3,
                fontSize: 13.5,
                fontWeight: isActive ? 750 : 600,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center" }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 12,
                    background: isActive ? C.primary : C.bg2,
                    color: isActive ? "#fff" : C.text2,
                    padding: "2px 6px"
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── WORKSPACE WORK AREA ─── */}
      <div style={{ flex: 1, padding: "16px 32px 32px 32px", overflowY: "auto" }}>
        
        {/* Search header for tabular sections */}
        {activeTab !== "planning" && (
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            {/* Search Input Container */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 8, 
              flex: 1, 
              maxWidth: 320, 
              background: "#fff", 
              border: `1px solid ${C.border}`, 
              borderRadius: 8, 
              padding: "6px 12px", 
              height: 36, 
              boxSizing: "border-box" 
            }}>
              <Search size={14} style={{ color: C.text3, flexShrink: 0 }} />
              <input
                type="text"
                placeholder={`Search ${activeTab === "rcm" ? "Master RCM" : activeTab === "tracker" ? "Data Tracker" : "Org Chart"}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", border: "none", outline: "none", fontSize: 12.5, color: C.text1, background: "transparent" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.text3, fontSize: 11, padding: 0 }} className="action-btn">✕</button>
              )}
            </div>

            {/* Actions */}
            <div>
              {activeTab === "rcm" && (
                <button onClick={() => setRcmModal({ open: true, mode: "add", data: null })} style={{ background: C.primary, color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, height: 36 }}>
                  <Plus size={14} /> Add Control
                </button>
              )}
              {activeTab === "tracker" && (
                <button onClick={() => setTrackerModal({ open: true, mode: "add", data: null })} style={{ background: C.primary, color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, height: 36 }}>
                  <Plus size={14} /> Create Request
                </button>
              )}
              {activeTab === "org" && (
                <button onClick={() => setOrgModal({ open: true, mode: "add", data: null })} style={{ background: C.primary, color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, height: 36 }}>
                  <Plus size={14} /> Add Member
                </button>
              )}
            </div>
          </div>
        )}

        {/* ════ TAB: PLANNING & SCOPE ════ */}
        {activeTab === "planning" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              
              {/* Left Column: Purpose, Standards, Scope */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Purpose & Objectives */}
                <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: C.text1, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <Target size={16} style={{ color: C.primary }} /> Purpose & Objectives
                    </h3>
                    <button 
                      onClick={() => setPlanningModal({ open: true, field: "purpose", val: planning.purpose })} 
                      style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: 6, 
                        background: "transparent", 
                        border: "none", 
                        color: C.primary, 
                        cursor: "pointer", 
                        fontSize: 12.5, 
                        fontWeight: 700,
                        padding: "5px 10px",
                        borderRadius: 6,
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = C.primaryBg}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <Pencil size={12} />
                      <span>Edit</span>
                    </button>
                  </div>
                  {renderPlanningList(planning.purpose)}
                </div>

                {/* Standards Alignment */}
                <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: C.text1, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <BookOpen size={16} style={{ color: C.primary }} /> Standards & Regulatory Alignment
                    </h3>
                    <button 
                      onClick={() => setPlanningModal({ open: true, field: "standards", val: planning.standards })} 
                      style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: 6, 
                        background: "transparent", 
                        border: "none", 
                        color: C.primary, 
                        cursor: "pointer", 
                        fontSize: 12.5, 
                        fontWeight: 700,
                        padding: "5px 10px",
                        borderRadius: 6,
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = C.primaryBg}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <Pencil size={12} />
                      <span>Edit</span>
                    </button>
                  </div>
                  {renderPlanningList(planning.standards)}
                </div>

                {/* Scope of Audits */}
                <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: C.text1, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <Search size={16} style={{ color: C.primary }} /> Scope of Audits
                    </h3>
                    <button 
                      onClick={() => setPlanningModal({ open: true, field: "scope", val: planning.scope })} 
                      style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: 6, 
                        background: "transparent", 
                        border: "none", 
                        color: C.primary, 
                        cursor: "pointer", 
                        fontSize: 12.5, 
                        fontWeight: 700,
                        padding: "5px 10px",
                        borderRadius: 6,
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = C.primaryBg}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <Pencil size={12} />
                      <span>Edit</span>
                    </button>
                  </div>
                  {renderPlanningList(planning.scope)}
                </div>
              </div>

              {/* Right Column: Approach, Governance, Attachments */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Audit Approach & Methodology */}
                <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: C.text1, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <Milestone size={16} style={{ color: C.primary }} /> Approach & Methodology
                    </h3>
                    <button 
                      onClick={() => setPlanningModal({ open: true, field: "methodology", val: planning.methodology })} 
                      style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: 6, 
                        background: "transparent", 
                        border: "none", 
                        color: C.primary, 
                        cursor: "pointer", 
                        fontSize: 12.5, 
                        fontWeight: 700,
                        padding: "5px 10px",
                        borderRadius: 6,
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = C.primaryBg}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <Pencil size={12} />
                      <span>Edit</span>
                    </button>
                  </div>
                  {renderPlanningList(planning.methodology)}
                </div>

                {/* Reporting Line & Independence */}
                <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: C.text1, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <Scale size={16} style={{ color: C.primary }} /> Reporting Line & Governance
                    </h3>
                    <button 
                      onClick={() => setPlanningModal({ open: true, field: "governance", val: planning.governance })} 
                      style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: 6, 
                        background: "transparent", 
                        border: "none", 
                        color: C.primary, 
                        cursor: "pointer", 
                        fontSize: 12.5, 
                        fontWeight: 700,
                        padding: "5px 10px",
                        borderRadius: 6,
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = C.primaryBg}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <Pencil size={12} />
                      <span>Edit</span>
                    </button>
                  </div>
                  {renderPlanningList(planning.governance)}
                </div>

                {/* Attachments / Diagram Upload */}
                <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: C.text1, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <FolderOpen size={16} style={{ color: C.primary }} /> Planning Diagrams & Supporting Uploads
                  </h3>
                  
                  {/* Drag drop zone */}
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      border: `2px dashed ${C.border2}`,
                      borderRadius: 12,
                      padding: "20px 16px",
                      background: C.bg,
                      cursor: "pointer",
                      textAlign: "center",
                      marginBottom: 16
                    }}
                  >
                    <UploadCloud size={24} style={{ color: C.primary, marginBottom: 6 }} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.primary }}>Upload structure chart or PDF audit plan</span>
                    <span style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Supports JPEG, PNG, WebP, PDF</span>
                    <input type="file" multiple ref={fileInputRef} onChange={handleAttachmentUpload} style={{ display: "none" }} />
                  </label>

                  {/* List attachments */}
                  {(!planning.attachments || planning.attachments.length === 0) ? (
                    <div style={{ textAlign: "center", fontSize: 12.5, color: C.text3, padding: 12 }}>No attachments uploaded yet.</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {planning.attachments.map(att => (
                        <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg, padding: 10, borderRadius: 8, border: `1px solid ${C.border}` }}>
                          <div style={{ display: "inline-flex", alignItems: "center" }}>
                            {["jpg", "png", "webp", "jpeg"].includes(att.type) ? <FileImage size={20} style={{ color: C.primary }} /> : <FileText size={20} style={{ color: C.text3 }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 650, color: C.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={att.name}>{att.name}</div>
                            <div style={{ fontSize: 10, color: C.text3 }}>{att.size}</div>
                          </div>
                          <button onClick={() => removeAttachment(att.id)} className="action-btn action-btn-delete" title="Delete" style={{ width: 22, height: 22 }}><Trash2 size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Annual Audit Plan Schedule Table */}
            <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 850, color: C.text1, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    <Calendar size={16} style={{ color: C.primary }} /> Annual Audit Plan Schedule
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: 12.5, color: C.text3 }}>Quarterly execution roadmap of planned audits.</p>
                </div>
                <button
                  onClick={() => setPlanRowModal({ open: true, mode: "add", data: null })}
                  style={{ background: C.primary, color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border2}` }}>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase" }}>Quarter</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase" }}>Planned Audit Engagements</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase" }}>Status</th>
                      <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(planning.annualPlan || []).map(row => {
                      const st = getStatusStyle(row.status);
                      return (
                        <tr key={row.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: "12px 14px", fontSize: 13.5, fontWeight: 700, color: C.text1 }}>{row.quarter}</td>
                          <td style={{ padding: "12px 14px", fontSize: 13.5, color: C.text2 }}>{row.plannedAudits}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 12, padding: "2px 8px", border: `1px solid ${st.border}`, background: st.bg, color: st.color }}>
                              {row.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              <button 
                                onClick={() => setPlanRowModal({ open: true, mode: "edit", data: row })} 
                                className="action-btn action-btn-edit" 
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>
                              <button 
                                onClick={() => handleDeletePlanRow(row.id)} 
                                className="action-btn action-btn-delete" 
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB: MASTER RCM ════ */}
        {activeTab === "rcm" && (
          <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.01)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border2}` }}>
                    {["Ref No.", "Audit Area", "Sub Area", "Frequency", "Audit Check / Control", "Risk Description", "Control Objective", "Audit Procedure", "Data Requirement", "Remarks", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRcm.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: "center", padding: "48px 16px", color: C.text3 }}>
                        No records match the search. Click "Add Control" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredRcm.map(rcm => (
                      <tr 
                        key={rcm.id} 
                        style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.2s", cursor: "pointer" }} 
                        onClick={() => setRcmModal({ open: true, mode: "edit", data: rcm })}
                        onMouseEnter={e => e.currentTarget.style.background = C.bg} 
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "16px", fontSize: 12.5, fontWeight: 700, color: C.primary, fontFamily: MONO }}>{rcm.serial_no}</td>
                        <td style={{ padding: "16px", fontSize: 13, fontWeight: 600, color: C.text1 }}>{rcm.audit_area}</td>
                        <td style={{ padding: "16px", fontSize: 12.5, color: C.text2, fontWeight: 500 }}>{rcm.sub_area}</td>
                        <td style={{ padding: "16px", fontSize: 12.5, color: C.text2, fontWeight: 600 }}>{rcm.period_frequency}</td>
                        <td style={{ padding: "16px", fontSize: 13, color: C.text1, minWidth: 350, lineHeight: 1.4 }}>{renderBulletPoints(rcm.audit_check)}</td>
                        <td style={{ padding: "16px", fontSize: 12.5, color: C.text2, minWidth: 320, lineHeight: 1.4 }}>{renderBulletPoints(rcm.risk_description)}</td>
                        <td style={{ padding: "16px", fontSize: 12.5, color: C.text2, minWidth: 300, lineHeight: 1.4 }}>{renderBulletPoints(rcm.control_objective)}</td>
                        <td style={{ padding: "16px", fontSize: 12.5, color: C.text2, minWidth: 350, lineHeight: 1.4 }}>{renderBulletPoints(rcm.audit_procedure)}</td>
                        <td style={{ padding: "16px", fontSize: 12.5, color: C.text1, minWidth: 280, lineHeight: 1.4 }}>{renderBulletPoints(rcm.data_requirement, true)}</td>
                        <td style={{ padding: "16px", fontSize: 12.5, color: C.text2, minWidth: 320, lineHeight: 1.4 }}>{rcm.remarks || "—"}</td>
                        <td style={{ padding: "16px" }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button 
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setRcmModal({ open: true, mode: "edit", data: rcm });
                              }} 
                              className="action-btn action-btn-edit"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                            <button 
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRcm(rcm.id);
                              }} 
                              className="action-btn action-btn-delete"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════ TAB: DATA TRACKER ════ */}
        {activeTab === "tracker" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* KPI Cards Strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
              {[
                { label: "Total Requests", val: trackerKPIs.total, icon: <FileText size={20} />, color: C.primary, bg: C.primaryBg },
                { label: "Received", val: trackerKPIs.received, icon: <CheckCircle2 size={20} />, color: C.accent, bg: C.accentBg },
                { label: "Partially Received", val: trackerKPIs.partial, icon: <Calendar size={20} />, color: C.amber, bg: C.amberBg },
                { label: "Pending Requests", val: trackerKPIs.pending, icon: <AlertTriangle size={20} />, color: C.text3, bg: C.bg2 },
                { label: "Compliance %", val: `${trackerKPIs.compliance}%`, icon: <TrendingUp size={20} />, color: C.blue, bg: C.blueBg }
              ].map((kpi, idx) => (
                <div key={idx} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center", color: kpi.color }}>
                    {kpi.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 850, color: C.text1, fontFamily: MONO }}>{kpi.val}</div>
                    <div style={{ fontSize: 11.5, color: C.text3, fontWeight: 600, marginTop: 2 }}>{kpi.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tracker Table */}
            <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border2}` }}>
                      {["Ref No.", "Audit Check Reference", "Sub Area", "Data Requested", "Purpose", "Req. On", "Requested To", "Due Date", "Status", "Date Received", "Remarks", "Actions"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTracker.length === 0 ? (
                      <tr>
                        <td colSpan={12} style={{ textAlign: "center", padding: "48px 16px", color: C.text3 }}>
                          No requests found. Click "Create Request" to log a new request.
                        </td>
                      </tr>
                    ) : (
                      filteredTracker.map(trk => {
                        const st = getStatusStyle(trk.status);
                        return (
                          <tr 
                            key={trk.id} 
                            style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.2s", cursor: "pointer" }}
                            onClick={() => setTrackerModal({ open: true, mode: "edit", data: trk })}
                            onMouseEnter={e => e.currentTarget.style.background = C.bg}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <td style={{ padding: "16px", fontSize: 12.5, fontWeight: 700, color: C.primary, fontFamily: MONO }}>
                              <div>{trk.serial_no}</div>
                              {trk.attachments && trk.attachments.length > 0 && (
                                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, padding: "2px 6px", background: C.bg2, borderRadius: 4, fontSize: 10, color: C.text3, fontWeight: 600 }}>
                                  <FileText size={11} style={{ color: C.primary }} /> {trk.attachments.length} {trk.attachments.length === 1 ? "file" : "files"}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "16px", fontSize: 13, color: C.text1, minWidth: 350, lineHeight: 1.4 }}>{renderBulletPoints(trk.audit_check)}</td>
                            <td style={{ padding: "16px", fontSize: 12.5, color: C.text3 }}>{trk.sub_area}</td>
                            <td style={{ padding: "16px", fontSize: 12.5, color: C.text2, minWidth: 280, lineHeight: 1.4 }}>{renderBulletPoints(trk.data_requested, true)}</td>
                            <td style={{ padding: "16px", fontSize: 12.5, color: C.text3, minWidth: 280, lineHeight: 1.4 }}>{renderBulletPoints(trk.purpose_of_request)}</td>
                            <td style={{ padding: "16px", fontSize: 12.5, color: C.text2, whiteSpace: "nowrap" }}>{trk.requested_on}</td>
                            <td style={{ padding: "16px" }}>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                                <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.primaryBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.primary }}>
                                  <Users size={12} />
                                </div>
                                <span style={{ fontSize: 12.5, fontWeight: 650, color: C.text2 }}>{trk.requested_to_name || "—"}</span>
                              </div>
                            </td>
                            <td style={{ padding: "16px", fontSize: 12.5, color: trk.status !== "Received" && new Date(trk.due_date) < new Date() ? C.red : C.text2, fontWeight: 700, whiteSpace: "nowrap" }}>
                              {trk.due_date}
                            </td>
                            <td style={{ padding: "16px" }}>
                              <span style={{ 
                                display: "inline-flex", 
                                alignItems: "center", 
                                gap: 6,
                                fontSize: 11, 
                                fontWeight: 700, 
                                borderRadius: 12, 
                                padding: "4px 10px", 
                                border: `1px solid ${st.border}`, 
                                background: st.bg, 
                                color: st.color, 
                                whiteSpace: "nowrap",
                                textTransform: "uppercase",
                                letterSpacing: "0.3px"
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />
                                {trk.status}
                              </span>
                            </td>
                            <td style={{ padding: "16px", fontSize: 12.5, color: C.text2, whiteSpace: "nowrap" }}>{trk.date_received || "—"}</td>
                            <td style={{ padding: "16px", fontSize: 12.5, color: C.text2, minWidth: 320, lineHeight: 1.4 }}>{trk.remarks || "—"}</td>
                            <td style={{ padding: "16px" }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTrackerModal({ open: true, mode: "edit", data: trk });
                                  }} 
                                  className="action-btn action-btn-edit"
                                  title="Edit"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTracker(trk.id);
                                  }} 
                                  className="action-btn action-btn-delete"
                                  title="Delete"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB: ORGANISATION CHART ════ */}
        {activeTab === "org" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Detailed list table */}
            <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border2}` }}>
                      {["S.No", "Name", "Designation", "Department / Function", "Phone Number", "Email ID", "Actions"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrg.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "48px 16px", color: C.text3 }}>
                          No personnel records found.
                        </td>
                      </tr>
                    ) : (
                      filteredOrg.map(member => (
                        <tr key={member.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: "16px", fontSize: 12.5, fontWeight: 700, color: C.primary, fontFamily: MONO }}>{member.serial_no}</td>
                          <td style={{ padding: "16px", fontSize: 13.5, fontWeight: 700, color: C.text1 }}>{member.name}</td>
                          <td style={{ padding: "16px", fontSize: 13, color: C.text2 }}>{member.designation}</td>
                          <td style={{ padding: "16px", fontSize: 12.5, color: C.text2, fontWeight: 600 }}>{member.department_function}</td>
                          <td style={{ padding: "16px", fontSize: 12.5, color: C.text2, fontFamily: MONO }}>{member.phone_number || "—"}</td>
                          <td style={{ padding: "16px", fontSize: 12.5, color: C.primary, fontWeight: 500 }}>{member.email_id || "—"}</td>
                          <td style={{ padding: "16px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button 
                                onClick={() => setOrgModal({ open: true, mode: "edit", data: member })} 
                                className="action-btn action-btn-edit"
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>
                              <button 
                                onClick={() => handleDeleteOrg(member.id)} 
                                className="action-btn action-btn-delete"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────
          ─── DIALOGS / POPUPS ──────────────────────────────────────────────────────
          ─────────────────────────────────────────────────────────────────────────── */}

      {/* 1. Planning Fields Slide-over Right Panel (covers 38% of screen) */}
      {planningModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.3)", zIndex: 1000, display: "flex", justifyContent: "flex-end", backdropFilter: "blur(2px)" }}>
          {/* Transparent click dismiss overlay */}
          <div style={{ position: "absolute", inset: 0, cursor: "pointer" }} onClick={() => setPlanningModal({ open: false, field: null, val: [] })} />
          
          <div style={{
            position: "relative",
            width: "38%",
            minWidth: 420,
            maxWidth: 600,
            height: "100%",
            background: "#fff",
            boxShadow: "-8px 0 32px rgba(15,23,42,0.12)",
            display: "flex",
            flexDirection: "column",
            animation: "slideIn 0.25s ease-out"
          }}>
            {/* Header */}
            <div style={{ padding: "24px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 850, color: C.text1, margin: 0, fontFamily: "Sora, sans-serif" }}>
                  Configure Planning Elements
                </h3>
                <p style={{ margin: "3px 0 0 0", fontSize: 12, color: C.text3 }}>
                  Edit scope guidelines and objective statements
                </p>
              </div>
              <button 
                onClick={() => setPlanningModal({ open: false, field: null, val: [] })} 
                className="action-btn"
                style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form */}
            <div style={{ flex: 1, overflowY: "auto", padding: "28px", display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ fontSize: 12.5, color: C.text3, margin: 0 }}>Enter each objective or scope parameter on a new line.</p>
              <textarea
                defaultValue={planningModal.val.join("\n")}
                id="planningTextarea"
                rows={12}
                style={{ width: "100%", padding: 14, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, lineHeight: 1.6, outline: "none", resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 12, marginTop: 12, marginBottom: 24 }}>
                <button
                  onClick={() => {
                    const text = document.getElementById("planningTextarea").value;
                    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
                    updatePlanningField(planningModal.field, lines);
                    setPlanningModal({ open: false, field: null, val: [] });
                  }}
                  style={{ flex: 1, background: C.primary, color: "#fff", border: "none", padding: "11px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <CheckCircle2 size={16} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Planning Annual Row Slide-over Right Panel (covers 38% of screen) */}
      {planRowModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.3)", zIndex: 1000, display: "flex", justifyContent: "flex-end", backdropFilter: "blur(2px)" }}>
          {/* Transparent click dismiss overlay */}
          <div style={{ position: "absolute", inset: 0, cursor: "pointer" }} onClick={() => setPlanRowModal({ open: false, mode: "add", data: null })} />
          
          <div style={{
            position: "relative",
            width: "38%",
            minWidth: 420,
            maxWidth: 600,
            height: "100%",
            background: "#fff",
            boxShadow: "-8px 0 32px rgba(15,23,42,0.12)",
            display: "flex",
            flexDirection: "column",
            animation: "slideIn 0.25s ease-out"
          }}>
            {/* Header */}
            <div style={{ padding: "24px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 850, color: C.text1, margin: 0, fontFamily: "Sora, sans-serif" }}>
                  {planRowModal.mode === "add" ? "Add Audit Engagement" : "Audit Engagement details"}
                </h3>
                <p style={{ margin: "3px 0 0 0", fontSize: 12, color: C.text3 }}>
                  Schedule or edit quarter planning engagements
                </p>
              </div>
              <button 
                onClick={() => setPlanRowModal({ open: false, mode: "add", data: null })} 
                className="action-btn"
                style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form */}
            <form 
              onSubmit={planRowModal.mode === "add" ? handleAddPlanRow : handleEditPlanRow}
              style={{ flex: 1, overflowY: "auto", padding: "28px", display: "flex", flexDirection: "column", gap: 20 }}
            >
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>QUARTER</label>
                <input name="quarter" defaultValue={planRowModal.data?.quarter || ""} placeholder="e.g. Q1 2026" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5 }} required />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>PLANNED AUDITS</label>
                <input name="plannedAudits" defaultValue={planRowModal.data?.plannedAudits || ""} placeholder="e.g. Financial Control Audit" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5 }} required />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>STATUS</label>
                <select name="status" defaultValue={planRowModal.data?.status || "Pending"} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5 }}>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 12, marginBottom: 24, flexShrink: 0 }}>
                {planRowModal.mode === "edit" && (
                  <button 
                    type="button"
                    onClick={() => {
                      if (confirm("Delete this scheduled row?")) {
                        handleDeletePlanRow(planRowModal.data.id);
                        setPlanRowModal({ open: false, mode: "add", data: null });
                      }
                    }}
                    style={{ background: "#fef2f2", color: C.red, border: `1.5px solid ${C.red}`, padding: "11px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                )}
                <button type="submit" style={{ flex: 1, background: C.primary, color: "#fff", border: "none", padding: "11px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <CheckCircle2 size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Master RCM Slide-over Right Panel (covers 38% of screen) */}
      {rcmModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.3)", zIndex: 1000, display: "flex", justifyContent: "flex-end", backdropFilter: "blur(2px)" }}>
          {/* Transparent click dismiss overlay */}
          <div style={{ position: "absolute", inset: 0, cursor: "pointer" }} onClick={() => setRcmModal({ open: false, mode: "add", data: null })} />
          
          <div style={{
            position: "relative",
            width: "38%",
            minWidth: 420,
            maxWidth: 600,
            height: "100%",
            background: "#fff",
            boxShadow: "-8px 0 32px rgba(15,23,42,0.12)",
            display: "flex",
            flexDirection: "column",
            animation: "slideIn 0.25s ease-out"
          }}>
            {/* Header */}
            <div style={{ padding: "24px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 850, color: C.text1, margin: 0, fontFamily: "Sora, sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
                  <Shield size={18} style={{ color: C.primary }} />
                  <span>{rcmModal.mode === "add" ? "Add Control to Master RCM" : "Control Details"}</span>
                </h3>
                <p style={{ margin: "3px 0 0 0", fontSize: 12, color: C.text3 }}>
                  {rcmModal.mode === "add" ? "Create a new internal control record" : `Reference ID: ${rcmModal.data?.serial_no || "N/A"}`}
                </p>
              </div>
              <button 
                onClick={() => setRcmModal({ open: false, mode: "add", data: null })} 
                className="action-btn"
                style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form */}
            <form 
              onSubmit={rcmModal.mode === "add" ? handleAddRcm : handleEditRcm}
              style={{ flex: 1, overflowY: "auto", padding: "28px", display: "flex", flexDirection: "column", gap: 20 }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                    <Milestone size={14} style={{ color: C.primary }} />
                    <span>REFERENCE NO.</span>
                  </label>
                  <input name="serial_no" defaultValue={rcmModal.data?.serial_no || ""} placeholder="e.g. RCM-004" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                    <FolderOpen size={14} style={{ color: C.primary }} />
                    <span>AUDIT AREA</span>
                  </label>
                  <input name="audit_area" defaultValue={rcmModal.data?.audit_area || ""} placeholder="e.g. Cybersecurity / IT" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: "border-box" }} required />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                    <GitBranch size={14} style={{ color: C.primary }} />
                    <span>SUB AREA</span>
                  </label>
                  <input name="sub_area" defaultValue={rcmModal.data?.sub_area || ""} placeholder="e.g. Access Management" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: "border-box" }} required />
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                    <Calendar size={14} style={{ color: C.primary }} />
                    <span>PERIOD / FREQUENCY</span>
                  </label>
                  <input name="period_frequency" defaultValue={rcmModal.data?.period_frequency || ""} placeholder="e.g. Quarterly / Annual" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: "border-box" }} required />
                </div>
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                  <CheckCircle2 size={14} style={{ color: C.primary }} />
                  <span>AUDIT CHECK / CONTROL DESCRIPTION (Point-wise: separate lines)</span>
                </label>
                <textarea name="audit_check" defaultValue={rcmModal.data?.audit_check || ""} placeholder="Describe control check details. Press enter for new points." rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, lineHeight: 1.5, boxSizing: "border-box" }} required />
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                  <AlertTriangle size={14} style={{ color: C.primary }} />
                  <span>RISK DESCRIPTION (Point-wise: separate lines)</span>
                </label>
                <textarea name="risk_description" defaultValue={rcmModal.data?.risk_description || ""} placeholder="Risk if control fails. Press enter for new points." rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, lineHeight: 1.5, boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                  <Target size={14} style={{ color: C.primary }} />
                  <span>CONTROL OBJECTIVE (Point-wise: separate lines)</span>
                </label>
                <textarea name="control_objective" defaultValue={rcmModal.data?.control_objective || ""} placeholder="Objective of this control check. Press enter for new points." rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, lineHeight: 1.5, boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                  <Activity size={14} style={{ color: C.primary }} />
                  <span>AUDIT TEST PROCEDURE (Point-wise: separate lines)</span>
                </label>
                <textarea name="audit_procedure" defaultValue={rcmModal.data?.audit_procedure || ""} placeholder="Steps the auditor should perform. Press enter for new points." rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, lineHeight: 1.5, boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                  <FileText size={14} style={{ color: C.primary }} />
                  <span>DATA REQUIREMENT / EVIDENCE (Point-wise: separate lines)</span>
                </label>
                <textarea name="data_requirement" defaultValue={rcmModal.data?.data_requirement || ""} placeholder="Evidence files needed. Press enter for new points." rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, lineHeight: 1.5, boxSizing: "border-box" }} required />
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                  <Info size={14} style={{ color: C.primary }} />
                  <span>REMARKS</span>
                </label>
                <input name="remarks" defaultValue={rcmModal.data?.remarks || ""} placeholder="Additional notes..." style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 12, marginBottom: 24, flexShrink: 0 }}>
                {rcmModal.mode === "edit" && (
                  <button 
                    type="button"
                    onClick={() => {
                      if (confirm("Delete this control from Master RCM?")) {
                        handleDeleteRcm(rcmModal.data.id);
                        setRcmModal({ open: false, mode: "add", data: null });
                      }
                    }}
                    style={{ background: "#fef2f2", color: C.red, border: `1.5px solid ${C.red}`, padding: "11px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                )}
                <button type="submit" style={{ flex: 1, background: C.primary, color: "#fff", border: "none", padding: "11px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <CheckCircle2 size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Organisation Chart Member Slide-over Right Panel (covers 38% of screen) */}
      {orgModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.3)", zIndex: 1000, display: "flex", justifyContent: "flex-end", backdropFilter: "blur(2px)" }}>
          {/* Transparent click dismiss overlay */}
          <div style={{ position: "absolute", inset: 0, cursor: "pointer" }} onClick={() => setOrgModal({ open: false, mode: "add", data: null })} />
          
          <div style={{
            position: "relative",
            width: "38%",
            minWidth: 420,
            maxWidth: 600,
            height: "100%",
            background: "#fff",
            boxShadow: "-8px 0 32px rgba(15,23,42,0.12)",
            display: "flex",
            flexDirection: "column",
            animation: "slideIn 0.25s ease-out"
          }}>
            {/* Header */}
            <div style={{ padding: "24px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 850, color: C.text1, margin: 0, fontFamily: "Sora, sans-serif" }}>
                  {orgModal.mode === "add" ? "Add Personnel details" : "Personnel info"}
                </h3>
                <p style={{ margin: "3px 0 0 0", fontSize: 12, color: C.text3 }}>
                  {orgModal.mode === "add" ? "Register new employee profile" : `Profile ID: ${orgModal.data?.serial_no || "N/A"}`}
                </p>
              </div>
              <button 
                onClick={() => setOrgModal({ open: false, mode: "add", data: null })} 
                className="action-btn"
                style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form */}
            <form 
              onSubmit={orgModal.mode === "add" ? handleAddOrg : handleEditOrg}
              style={{ flex: 1, overflowY: "auto", padding: "28px", display: "flex", flexDirection: "column", gap: 20 }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>SERIAL / ID</label>
                  <input name="serial_no" defaultValue={orgModal.data?.serial_no || ""} placeholder="e.g. ORG-005" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>NAME</label>
                  <input name="name" defaultValue={orgModal.data?.name || ""} placeholder="Full Name" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5 }} required />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>DESIGNATION / ROLE</label>
                <input name="designation" defaultValue={orgModal.data?.designation || ""} placeholder="e.g. Audit Coordinator" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5 }} required />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>DEPARTMENT / FUNCTION</label>
                <input name="department_function" defaultValue={orgModal.data?.department_function || ""} placeholder="e.g. Human Resources" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5 }} required />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>PHONE NUMBER</label>
                <input name="phone_number" defaultValue={orgModal.data?.phone_number || ""} placeholder="+966 50 000 0000" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5 }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>EMAIL ID</label>
                <input type="email" name="email_id" defaultValue={orgModal.data?.email_id || ""} placeholder="email@company.com.sa" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5 }} />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 12, marginBottom: 24, flexShrink: 0 }}>
                {orgModal.mode === "edit" && (
                  <button 
                    type="button"
                    onClick={() => {
                      if (confirm("Remove this member?")) {
                        handleDeleteOrg(orgModal.data.id);
                        setOrgModal({ open: false, mode: "add", data: null });
                      }
                    }}
                    style={{ background: "#fef2f2", color: C.red, border: `1.5px solid ${C.red}`, padding: "11px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                )}
                <button type="submit" style={{ flex: 1, background: C.primary, color: "#fff", border: "none", padding: "11px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <CheckCircle2 size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Data Tracker Slide-over Right Panel (covers 38% of screen) */}
      {trackerModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.3)", zIndex: 1000, display: "flex", justifyContent: "flex-end", backdropFilter: "blur(2px)" }}>
          {/* Transparent click dismiss overlay */}
          <div style={{ position: "absolute", inset: 0, cursor: "pointer" }} onClick={() => setTrackerModal({ open: false, mode: "add", data: null })} />
          
          <div style={{
            position: "relative",
            width: "38%",
            minWidth: 420,
            maxWidth: 600,
            height: "100%",
            background: "#fff",
            boxShadow: "-8px 0 32px rgba(15,23,42,0.12)",
            display: "flex",
            flexDirection: "column",
            animation: "slideIn 0.25s ease-out"
          }}>
            {/* Header */}
            <div style={{ padding: "24px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 850, color: C.text1, margin: 0, fontFamily: "Sora, sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
                  <TrendingUp size={18} style={{ color: C.primary }} />
                  <span>{trackerModal.mode === "add" ? "Log Evidence Request Details" : "Evidence Request details"}</span>
                </h3>
                <p style={{ margin: "3px 0 0 0", fontSize: 12, color: C.text3 }}>
                  {trackerModal.mode === "add" ? "Log a new data request entry" : `Reference ID: ${trackerModal.data?.serial_no || "N/A"}`}
                </p>
              </div>
              <button 
                onClick={() => setTrackerModal({ open: false, mode: "add", data: null })} 
                className="action-btn"
                style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form */}
            {(() => {
              let formRef = null;
              return (
                <form 
                  ref={el => formRef = el}
                  onSubmit={trackerModal.mode === "add" ? handleAddTracker : handleEditTracker}
                  style={{ flex: 1, overflowY: "auto", padding: "28px", display: "flex", flexDirection: "column", gap: 20 }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                        <Milestone size={14} style={{ color: C.primary }} />
                        <span>SERIAL NO.</span>
                      </label>
                      <input name="serial_no" defaultValue={trackerModal.data?.serial_no || ""} placeholder="e.g. TRK-004" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                        <Activity size={14} style={{ color: C.primary }} />
                        <span>STATUS</span>
                      </label>
                      <select name="status" defaultValue={trackerModal.data?.status || "Pending"} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: "border-box" }}>
                        <option value="Pending">Pending</option>
                        <option value="Received">Received</option>
                        <option value="Partially Received">Partially Received</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                      <ShieldCheck size={14} style={{ color: C.primary }} />
                      <span>LINKED AUDIT CHECK / CONTROL (FROM MASTER RCM)</span>
                    </label>
                    <select
                      name="audit_check"
                      defaultValue={trackerModal.data?.audit_check || ""}
                      onChange={e => onRcmSelectInTrackerForm(e.target.value, formRef)}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: "border-box" }}
                      required
                    >
                      <option value="">— Select Control —</option>
                      {rcmList.map(r => (
                        <option key={r.id} value={r.audit_check}>{r.serial_no}: {r.audit_check.substring(0, 70)}...</option>
                      ))}
                    </select>
                  </div>

                  {/* Pre-fillable / customizable columns */}
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                      <GitBranch size={14} style={{ color: C.primary }} />
                      <span>SUB AREA</span>
                    </label>
                    <input name="sub_area" defaultValue={trackerModal.data?.sub_area || ""} placeholder="Auto fills from control check" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: "border-box" }} />
                  </div>

                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                      <FileText size={14} style={{ color: C.primary }} />
                      <span>DATA REQUESTED / REQUIRED EVIDENCE (Point-wise: separate lines)</span>
                    </label>
                    <textarea name="data_requested" defaultValue={trackerModal.data?.data_requested || ""} placeholder="Documents needed. Press enter for new points." rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, lineHeight: 1.5, boxSizing: "border-box" }} />
                  </div>

                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                      <Target size={14} style={{ color: C.primary }} />
                      <span>PURPOSE OF REQUEST (Point-wise: separate lines)</span>
                    </label>
                    <textarea name="purpose_of_request" defaultValue={trackerModal.data?.purpose_of_request || ""} placeholder="Control objective reference. Press enter for new points." rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, lineHeight: 1.5, boxSizing: "border-box" }} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                        <Calendar size={14} style={{ color: C.primary }} />
                        <span>REQUESTED ON</span>
                      </label>
                      <input type="date" name="requested_on" defaultValue={trackerModal.data?.requested_on || new Date().toISOString().split("T")[0]} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: "border-box" }} required />
                    </div>
                    <div>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                        <Calendar size={14} style={{ color: C.primary }} />
                        <span>DUE DATE</span>
                      </label>
                      <input type="date" name="due_date" defaultValue={trackerModal.data?.due_date || ""} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: "border-box" }} required />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                        <Users size={14} style={{ color: C.primary }} />
                        <span>REQUESTED TO (ORG PERSONNEL)</span>
                      </label>
                      <select name="requested_to_name" defaultValue={trackerModal.data?.requested_to_name || ""} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: "border-box" }} required>
                        <option value="">— Select Member —</option>
                        {orgList.map(o => (
                          <option key={o.id} value={o.name}>{o.name} ({o.designation})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                        <Calendar size={14} style={{ color: C.primary }} />
                        <span>DATE RECEIVED</span>
                      </label>
                      <input type="date" name="date_received" defaultValue={trackerModal.data?.date_received || ""} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: "border-box" }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>
                      <Info size={14} style={{ color: C.primary }} />
                      <span>REMARKS</span>
                    </label>
                    <input name="remarks" defaultValue={trackerModal.data?.remarks || ""} placeholder="Follow up notes..." style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: "border-box" }} />
                  </div>

                  {/* Attachments Section */}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 750, color: C.text3, textTransform: "uppercase", marginBottom: 10 }}>
                      Evidence Documents & Attachments
                    </label>
                    
                    {/* Upload Box */}
                    <div style={{
                      border: `1.5px dashed ${C.border2}`,
                      borderRadius: 8,
                      padding: "16px 20px",
                      background: C.bg,
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onClick={() => document.getElementById("trackerFileInput").click()}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border2}
                    >
                      <UploadCloud size={24} style={{ color: C.primary, opacity: 0.8, margin: "0 auto 6px auto" }} />
                      <div style={{ fontSize: 12.5, fontWeight: 650, color: C.text2 }}>
                        Click to upload audit files
                      </div>
                      <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                        Any format supported (PDF, Excel, Images, etc.)
                      </div>
                      <input 
                        type="file" 
                        id="trackerFileInput" 
                        multiple 
                        onChange={handleTrackerAttachmentUpload} 
                        style={{ display: "none" }} 
                      />
                    </div>

                    {/* Attached List */}
                    {trackerModal.data?.attachments && trackerModal.data.attachments.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                        {trackerModal.data.attachments.map(att => (
                          <div 
                            key={att.id} 
                            style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "space-between", 
                              padding: "10px 12px", 
                              background: C.bg, 
                              border: `1px solid ${C.border}`, 
                              borderRadius: 8 
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden", marginRight: 8 }}>
                              <File size={16} style={{ color: C.primary, flexShrink: 0 }} />
                              <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text1, whiteSpace: "nowrap" }} title={att.name}>{att.name}</div>
                                <div style={{ fontSize: 10.5, color: C.text3 }}>{att.size} • {att.uploadedAt}</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => downloadAttachmentFile(att)}
                                className="action-btn"
                                style={{ color: C.primary }}
                                title="Download File"
                              >
                                <Download size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeTrackerAttachment(att.id)}
                                className="action-btn"
                                style={{ color: C.red }}
                                title="Delete Attachment"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 12, marginBottom: 24, flexShrink: 0 }}>
                    {trackerModal.mode === "edit" && (
                      <button 
                        type="button"
                        onClick={() => {
                          if (confirm("Delete this request?")) {
                            handleDeleteTracker(trackerModal.data.id);
                            setTrackerModal({ open: false, mode: "add", data: null });
                          }
                        }}
                        style={{ background: "#fef2f2", color: C.red, border: `1.5px solid ${C.red}`, padding: "11px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    )}
                    <button type="submit" style={{ flex: 1, background: C.primary, color: "#fff", border: "none", padding: "11px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <CheckCircle2 size={16} /> Save Changes
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* 6. Advanced Mapping Excel Uploader Modal */}
      {uploadModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyCenter: "center", backdropFilter: "blur(3px)", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 24, width: "84vw", maxWidth: 1050, height: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            
            {/* Header */}
            <div style={{ borderBottom: `1px solid ${C.border}`, padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 850, color: C.text1, margin: 0, fontFamily: "Sora, sans-serif" }}>
                  Excel Workbook Importing & Column Mapping Wizard
                </h3>
                <p style={{ fontSize: 12.5, color: C.text3, margin: "2px 0 0 0" }}>Import multi-sheet audit workbooks with column mappings.</p>
              </div>
              <button 
                onClick={() => { setUploadModal({ open: false }); setWorkbookData(null); }} 
                style={{ background: "transparent", border: "none", cursor: "pointer", color: C.text3, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6 }}
                className="action-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Split Panel */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              
              {/* Left Panel: Upload or Sheet setup */}
              <div style={{ width: "40%", borderRight: `1px solid ${C.border}`, padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
                
                {/* Drag drop area */}
                {!workbookData ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    style={{
                      border: `2.5px dashed ${dragActive ? C.primary : C.border2}`,
                      borderRadius: 16,
                      background: dragActive ? C.primaryBg : C.bg,
                      padding: "48px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                      transition: "all 0.2s"
                    }}
                  >
                    <FileSpreadsheet size={48} style={{ color: C.primary, opacity: 0.8 }} />
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 800, color: C.text1, margin: "0 0 4px 0" }}>Drag & Drop Audit Workbook</h4>
                      <p style={{ fontSize: 12, color: C.text3, margin: 0 }}>Excel files (.xlsx, .xls) containing multiple sheets</p>
                    </div>
                    <label style={{ background: C.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                      Browse Files
                      <input type="file" onChange={handleFileInput} accept=".xlsx, .xls" style={{ display: "none" }} />
                    </label>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Active File banner */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.primaryBg, border: `1px solid ${C.primaryBorder}`, borderRadius: 12, padding: 14 }}>
                      <FileText size={24} style={{ color: C.primary }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 750, color: C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workbookData.fileName}</div>
                        <div style={{ fontSize: 11, color: C.text3 }}>{workbookData.sheets.length} sheets parsed.</div>
                      </div>
                      <button onClick={() => setWorkbookData(null)} style={{ border: "none", background: "transparent", color: C.red, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Change</button>
                    </div>

                    {/* Import Strategy */}
                    <div style={{ background: C.bg, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
                      <h4 style={{ fontSize: 12.5, fontWeight: 800, color: C.text1, margin: "0 0 10px 0" }}>Import Option</h4>
                      <div style={{ display: "flex", gap: 16 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.text2, cursor: "pointer" }}>
                          <input type="radio" checked={importOption === "append"} onChange={() => setImportOption("append")} />
                          Append to existing data
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.text2, cursor: "pointer" }}>
                          <input type="radio" checked={importOption === "overwrite"} onChange={() => setImportOption("overwrite")} />
                          Overwrite existing data
                        </label>
                      </div>
                    </div>

                    {/* Sheet selectors per Target Section */}
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 800, color: C.text1, marginBottom: 12 }}>Match Sheets / Tabs</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {[
                          { key: "rcm", label: "Master RCM Sheet" },
                          { key: "tracker", label: "Data Tracker Sheet" },
                          { key: "org", label: "Organisation Chart Sheet" }
                        ].map(sec => (
                          <div key={sec.key}>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 4 }}>{sec.label}</label>
                            <select
                              value={targetSheets[sec.key]}
                              onChange={e => handleSheetChange(sec.key, e.target.value)}
                              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }}
                            >
                              <option value="">— Skip / No sheet mapped —</option>
                              {workbookData.sheets.map(sh => (
                                <option key={sh.name} value={sh.name}>{sh.name}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel: Column mapping details & live preview */}
              <div style={{ width: "60%", padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
                {!workbookData ? (
                  <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.text3, textAlign: "center" }}>
                    <FileSpreadsheet size={48} style={{ color: C.text3, opacity: 0.4 }} />
                    <h4 style={{ fontSize: 15, fontWeight: 700, margin: "12px 0 4px 0" }}>Mapping Interface</h4>
                    <p style={{ fontSize: 12.5, maxWidth: 300, margin: 0 }}>Once an excel workbook is uploaded, you can custom-map headers and preview rows here.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                    
                    {/* Columns mappings panels */}
                    {["rcm", "tracker", "org"].map(sectionKey => {
                      const selectedSheetName = targetSheets[sectionKey];
                      if (!selectedSheetName) return null;
                      const sheet = workbookData.sheets.find(s => s.name === selectedSheetName);
                      if (!sheet || sheet.rows.length === 0) return null;

                      const headers = sheet.rows[0];
                      const sectionFields = {
                        rcm: [
                          { key: "serial_no", label: "Ref / S.No" },
                          { key: "audit_area", label: "Audit Area" },
                          { key: "sub_area", label: "Sub Area" },
                          { key: "audit_check", label: "Audit Check" },
                          { key: "risk_description", label: "Risk" },
                          { key: "control_objective", label: "Objective" },
                          { key: "audit_procedure", label: "Test Procedure" },
                          { key: "data_requirement", label: "Data Requirement" },
                          { key: "period_frequency", label: "Frequency" }
                        ],
                        tracker: [
                          { key: "serial_no", label: "S.No" },
                          { key: "audit_check", label: "Audit Check" },
                          { key: "sub_area", label: "Sub Area" },
                          { key: "data_requested", label: "Data Requested" },
                          { key: "purpose_of_request", label: "Purpose" },
                          { key: "requested_on", label: "Requested On" },
                          { key: "requested_to_name", label: "Requested To" },
                          { key: "due_date", label: "Due Date" },
                          { key: "status", label: "Status" }
                        ],
                        org: [
                          { key: "serial_no", label: "S.No" },
                          { key: "name", label: "Name" },
                          { key: "designation", label: "Designation" },
                          { key: "department_function", label: "Department" },
                          { key: "phone_number", label: "Phone" },
                          { key: "email_id", label: "Email" }
                        ]
                      }[sectionKey];

                      return (
                        <div key={sectionKey} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                          <h4 style={{ fontSize: 13.5, fontWeight: 850, color: C.primary, margin: "0 0 14px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Mapping: {sectionKey === "rcm" ? "Master RCM" : sectionKey === "tracker" ? "Data Tracker" : "Organisation Chart"}
                          </h4>
                          
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                            {sectionFields.map(f => (
                              <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ width: "35%", fontSize: 12.5, fontWeight: 700, color: C.text2 }}>{f.label}</span>
                                <select
                                  value={mappings[sectionKey]?.[f.key] || ""}
                                  onChange={e => handleMappingChange(sectionKey, f.key, e.target.value)}
                                  style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }}
                                >
                                  <option value="">— Unmapped —</option>
                                  {headers.map((h, i) => (
                                    <option key={i} value={h}>{String(h).substring(0, 30)}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>

                          {/* Live preview subset */}
                          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${C.border}` }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.text3, marginBottom: 8 }}>Row Parsing Preview (top 2 rows):</div>
                            <div style={{ overflowX: "auto", maxHeight: 90 }}>
                              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ background: "#fff", borderBottom: `1px solid ${C.border}` }}>
                                    {sectionFields.map(f => (
                                      <th key={f.key} style={{ padding: "4px 8px", textAlign: "left", color: C.text3 }}>{f.label}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {sheet.rows.slice(1, 3).map((row, rIdx) => (
                                    <tr key={rIdx} style={{ background: "#fff", borderBottom: `1px solid ${C.border}` }}>
                                      {sectionFields.map(f => {
                                        const mappedHeader = mappings[sectionKey]?.[f.key];
                                        const colIdx = headers.indexOf(mappedHeader);
                                        return (
                                          <td key={f.key} style={{ padding: "6px 8px", color: C.text1 }}>
                                            {colIdx !== -1 ? String(row[colIdx] || "") : "—"}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer controls */}
            <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 28px", display: "flex", justifyContent: "flex-end", gap: 12, flexShrink: 0, background: "#fff" }}>
              <button
                type="button"
                onClick={() => { setUploadModal({ open: false }); setWorkbookData(null); }}
                style={{ background: C.bg2, color: C.text2, border: "none", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 650, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={executeImport}
                disabled={!workbookData}
                style={{
                  background: workbookData ? C.primary : C.border2,
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: workbookData ? "pointer" : "not-allowed",
                  boxShadow: workbookData ? `0 4px 12px ${C.primary}33` : "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <CheckCircle2 size={15} /> Import Checked Mappings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
