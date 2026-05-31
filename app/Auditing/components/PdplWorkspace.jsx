"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildAuditingFileSizeLimitMessage,
  readResponsePayload,
  splitAuditingFilesBySize,
} from "@/utils/auditing-upload-client";

const COLORS = {
  bg: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  text: "#0f172a",
  textSoft: "#475569",
  textMuted: "#94a3b8",
  teal: "#0d9488",
  tealDark: "#0f766e",
  tealBg: "#f0fdfa",
  tealBorder: "#99f6e4",
  blue: "#2563eb",
  blueBg: "#eff6ff",
  blueBorder: "#bfdbfe",
  amber: "#d97706",
  amberBg: "#fffbeb",
  amberBorder: "#fde68a",
  green: "#16a34a",
  greenBg: "#f0fdf4",
  greenBorder: "#bbf7d0",
  red: "#dc2626",
  redBg: "#fef2f2",
  redBorder: "#fecaca",
  grayBg: "#f8fafc",
};

const SECTION_META = {
  gantt: { label: "Gantt Chart", accent: COLORS.blue, bg: COLORS.blueBg, border: COLORS.blueBorder },
  controls: { label: "Controls", accent: COLORS.teal, bg: COLORS.tealBg, border: COLORS.tealBorder },
  policies: { label: "Policies", accent: COLORS.amber, bg: COLORS.amberBg, border: COLORS.amberBorder },
  documents: { label: "Documents", accent: COLORS.green, bg: COLORS.greenBg, border: COLORS.greenBorder },
  dashboard: { label: "Dashboard", accent: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
};

const CONTROL_STATUS_OPTIONS = ["Completed", "In Progress", "Not Started"];
const POLICY_STATUS_OPTIONS = ["Approved", "Pending", "Draft", "Rejected"];
const DOCUMENT_STATUS_OPTIONS = ["Received", "Not Received"];
const EXECUTION_STATUS_OPTIONS = ["Complete", "Incomplete", "In Progress", "Not Started"];
const MONO = "'IBM Plex Mono', 'Space Mono', monospace";
const AVATAR_COLORS = ["#0f766e", "#d97706", "#dc2626", "#7c3aed"];

const PDPL_IMPORT_SECTION_FIELDS = {
  gantt: [
    { key: "label", label: "Level / Label" },
    { key: "taskName", label: "Task Name" },
    { key: "indiaTeam", label: "Assign To India Team" },
    { key: "ksaTeam", label: "KSA Team" },
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
    { key: "percentDone", label: "% Done" },
    { key: "workDays", label: "No. of Work Days" },
    { key: "remaining", label: "Remaining" },
  ],
  controls: [
    { key: "serialNo", label: "S.No" },
    { key: "category", label: "All Categories" },
    { key: "title", label: "Title" },
    { key: "status", label: "All Status" },
  ],
  policies: [
    { key: "serialNo", label: "S.No" },
    { key: "policyName", label: "Policy Name" },
    { key: "status", label: "Status" },
    { key: "documentStatus", label: "Documents" },
  ],
  documents: [
    { key: "serialNo", label: "S.No" },
    { key: "documentName", label: "Documents Name" },
    { key: "status", label: "Status" },
    { key: "documentStatus", label: "Documents Status" },
  ],
};

const PDPL_SECTION_FIELDS = {
  gantt: [
    { key: "label", label: "Level / Label" },
    { key: "taskName", label: "Task Name" },
    { key: "indiaTeam", label: "Assign To India Team" },
    { key: "ksaTeam", label: "KSA Team" },
    { key: "memberAssign", label: "Member Assign" },
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
    { key: "isDone", label: "Done Mark" },
    { key: "doneMarkedOn", label: "Done Date" },
    { key: "percentDone", label: "% Done" },
    { key: "workDays", label: "No. of Work Days" },
    { key: "remaining", label: "Remaining" },
    { key: "remark", label: "Remark" },
  ],
  controls: PDPL_IMPORT_SECTION_FIELDS.controls,
  policies: PDPL_IMPORT_SECTION_FIELDS.policies,
  documents: PDPL_IMPORT_SECTION_FIELDS.documents,
};

const COLUMN_ALIASES = {
  gantt: {
    label: ["level", "label", "numbering"],
    taskName: ["task", "task name"],
    memberAssign: ["member assign", "assigned member", "team member", "member assigned"],
    indiaTeam: ["assign to india team", "assign to indian team", "india team"],
    ksaTeam: ["ksa team"],
    startDate: ["start date", "starting date"],
    endDate: ["end date", "enddate"],
    percentDone: ["% done", "done", "percentage done"],
    workDays: ["# of work days", "no of work days", "work days", "number of work days"],
    remaining: ["remaining"],
  },
  controls: {
    serialNo: ["s.no", "s no", "serial number", "serial no"],
    category: ["all categories", "category"],
    title: ["title"],
    status: ["all status", "status"],
  },
  policies: {
    serialNo: ["s.no", "s no", "serial number", "serial no"],
    policyName: ["policy name", "name"],
    status: ["status"],
    documentStatus: ["documents", "document", "documents status"],
  },
  documents: {
    serialNo: ["s.no", "s no", "serial number", "serial no"],
    documentName: ["documents name", "document name", "name"],
    status: ["status"],
    documentStatus: ["documents status", "documents", "document status"],
  },
};

const tableInputStyle = {
  width: "100%",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "9px 11px",
  fontSize: 13,
  color: COLORS.text,
  fontFamily: "Sora, sans-serif",
  outline: "none",
  background: "#fff",
};

const PDPL_DB_SECTIONS = ["gantt", "controls", "policies", "documents"];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPersistedProjectId(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanCell(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function excelSerialToDate(serial) {
  if (!Number.isFinite(serial)) return "";
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  if (Number.isNaN(dateInfo.getTime())) return "";
  return dateInfo.toISOString().slice(0, 10);
}

function normalizeDateValue(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return excelSerialToDate(value);
  const text = String(value).trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return text;
}

function toNumberString(value) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? String(numeric) : String(value);
}

function normalizePercentDoneString(value) {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    const normalized = value > 0 && value <= 1 ? value * 100 : value;
    return String(Number.parseFloat(normalized.toFixed(2)));
  }

  const text = String(value).trim();
  if (!text) return "";

  const hasPercentSymbol = text.includes("%");
  const numeric = Number(text.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) return text;

  const normalized = !hasPercentSymbol && text.includes(".") && numeric > 0 && numeric <= 1
    ? numeric * 100
    : numeric;

  return String(Number.parseFloat(normalized.toFixed(2)));
}

function createEmptyPdplData() {
  return {
    ganttRows: [],
    controlRows: [],
    policyRows: [],
    documentRows: [],
    dashboardRows: [],
    importMeta: null,
  };
}

function ensurePdplProject(project) {
  return {
    ...project,
    teamMemberIds: Array.isArray(project.teamMemberIds) ? project.teamMemberIds : [],
    pdplData: {
      ...createEmptyPdplData(),
      ...(project.pdplData || {}),
    },
  };
}

function mapPdplProjectCardToLocalProject(project) {
  return ensurePdplProject({
    id: project.id,
    templateId: "pdpl-template",
    type: "pdpl",
    icon: "PDPL",
    status: project.status || "active",
    name: project.projectName || "",
    projectLeader: project.projectLeader || "",
    clientName: project.clientName || "",
    unit: project.clientName || "",
    start: project.projectStartDate || "",
    end: project.projectEndDate || "",
    projectLength: project.projectLength ?? "",
    teamMemberIds: Array.isArray(project.members) ? project.members.map((member) => member.id).filter(Boolean) : [],
    progressPercent: project.progressPercent ?? 0,
    ganttCount: project.ganttCount ?? 0,
    controlsCount: project.controlsCount ?? 0,
    policiesCount: project.policiesCount ?? 0,
    documentsCount: project.documentsCount ?? 0,
    members: Array.isArray(project.members) ? project.members : [],
    pdplData: createEmptyPdplData(),
    pdplLoadedFromDb: false,
  });
}

function mapPdplProjectDetailToLocalProject(project) {
  return ensurePdplProject({
    id: project.id,
    templateId: "pdpl-template",
    type: "pdpl",
    icon: "PDPL",
    status: project.status || "active",
    name: project.projectName || "",
    projectLeader: project.projectLeader || "",
    clientName: project.clientName || "",
    unit: project.clientName || "",
    start: project.projectStartDate || "",
    end: project.projectEndDate || "",
    projectLength: project.projectLength ?? "",
    teamMemberIds: Array.isArray(project.members) ? project.members.map((member) => member.employeeId || member.member?.id || member.id).filter(Boolean) : [],
    members: Array.isArray(project.members) ? project.members : [],
    pdplData: {
      ...createEmptyPdplData(),
      ganttRows: project.sections?.gantt || [],
      controlRows: project.sections?.controls || [],
      policyRows: project.sections?.policies || [],
      documentRows: project.sections?.documents || [],
    },
    pdplLoadedFromDb: true,
  });
}

function normalizePdplComparableValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizePdplComparableValue(item));
  }
  if (value && typeof value === "object") {
    if ("storagePath" in value || "fileName" in value || "name" in value) {
      return {
        storagePath: value.storagePath || "",
        fileName: value.fileName || value.name || "",
      };
    }
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = normalizePdplComparableValue(value[key]);
        return result;
      }, {});
  }
  return value ?? "";
}

function buildPdplProjectMetaSignature(project) {
  return JSON.stringify(
    normalizePdplComparableValue({
      name: project?.name || "",
      projectLeader: project?.projectLeader || "",
      clientName: project?.clientName || "",
      start: project?.start || "",
      end: project?.end || "",
      projectLength: project?.projectLength ?? "",
      status: project?.status || "active",
      teamMemberIds: Array.isArray(project?.teamMemberIds) ? [...project.teamMemberIds].map(String).sort() : [],
    })
  );
}

function buildPdplSectionSignature(project, sectionKey) {
  const pdplData = project?.pdplData || createEmptyPdplData();
  const rows =
    sectionKey === "gantt"
      ? pdplData.ganttRows || []
      : sectionKey === "controls"
      ? pdplData.controlRows || []
      : sectionKey === "policies"
      ? pdplData.policyRows || []
      : pdplData.documentRows || [];

  const normalizedRows = rows.map((row, index) => {
    if (sectionKey === "gantt") {
      return {
        sortOrder: index,
        label: row.label || "",
        taskName: row.taskName || "",
        indiaTeam: row.indiaTeam || "",
        ksaTeam: row.ksaTeam || "",
        memberAssign: normalizeMemberAssign(row.memberAssign).sort(),
        startDate: row.startDate || "",
        endDate: row.endDate || "",
        isDone: Boolean(row.isDone),
        doneMarkedOn: row.doneMarkedOn || "",
        percentDone: row.percentDone || 0,
        workDays: row.workDays || 0,
        remaining: row.remaining || 0,
        remark: row.remark || "",
      };
    }

    if (sectionKey === "controls") {
      return {
        sortOrder: index,
        serialNo: row.serialNo || "",
        category: row.category || "",
        title: row.title || "",
        status: row.status || "Not Started",
      };
    }

    if (sectionKey === "policies") {
      return {
        sortOrder: index,
        serialNo: row.serialNo || "",
        policyName: row.policyName || "",
        status: row.status || "Pending",
        documentStatus: row.documentStatus || "Not Received",
      };
    }

    return {
      sortOrder: index,
      serialNo: row.serialNo || "",
      documentName: row.documentName || "",
      status: row.status || "Incomplete",
      documentStatus: row.documentStatus || "Not Received",
      attachments: Array.isArray(row.attachments) ? row.attachments.map((item) => normalizePdplComparableValue(item)) : [],
    };
  });

  return JSON.stringify(normalizePdplComparableValue(normalizedRows));
}

function createPdplSaveBaseline(project) {
  return {
    projectMeta: buildPdplProjectMetaSignature(project),
    sections: {
      gantt: buildPdplSectionSignature(project, "gantt"),
      controls: buildPdplSectionSignature(project, "controls"),
      policies: buildPdplSectionSignature(project, "policies"),
      documents: buildPdplSectionSignature(project, "documents"),
    },
  };
}

function buildPdplDrawerSignature(sectionKey, values) {
  if (!sectionKey) return "";
  if (sectionKey === "dashboard") {
    return JSON.stringify(normalizePdplComparableValue(values));
  }
  if (sectionKey === "gantt") {
    return JSON.stringify(
      normalizePdplComparableValue({
        ...values,
        memberAssign: normalizeMemberAssign(values.memberAssign).sort(),
        isDone: Boolean(values.isDone),
      })
    );
  }
  if (sectionKey === "documents") {
    return JSON.stringify(
      normalizePdplComparableValue({
        ...values,
        attachments: Array.isArray(values.attachments) ? values.attachments.map((item) => normalizePdplComparableValue(item)) : [],
      })
    );
  }
  return JSON.stringify(normalizePdplComparableValue(values));
}

function generateNextGanttLabel(rows) {
  const last = rows[rows.length - 1];
  const value = cleanCell(last?.label);
  if (!value) return `${rows.length + 1}.1.1`;
  const parts = value.split(".").map((part) => Number(part));
  if (parts.every((part) => Number.isFinite(part))) {
    parts[parts.length - 1] += 1;
    return parts.join(".");
  }
  return `${rows.length + 1}.1.1`;
}

function getProjectProgress(project) {
  const ganttRows = project?.pdplData?.ganttRows || [];
  if (!ganttRows.length) return 0;
  const total = ganttRows.reduce((sum, row) => sum + (Number(row.percentDone) || 0), 0);
  return Math.round(total / ganttRows.length);
}

function calculateRemainingValue(percentDone) {
  const done = Math.max(0, Math.min(100, Number(percentDone) || 0));
  return String(Number.parseFloat((100 - done).toFixed(2)));
}

function calculateWorkDays(startDate, endDate) {
  if (!startDate || !endDate) return "0";
  const toLocalDate = (value) => {
    const text = String(value || "").trim();
    if (!text) return null;
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const start = toLocalDate(startDate);
  const end = toLocalDate(endDate);
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return "0";
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;
  return String(Math.max(totalDays, 0));
}

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function getDoneStateFromPercent(percentDone, existingDoneDate = "") {
  const normalizedPercent = Math.max(0, Math.min(100, Number(percentDone) || 0));
  if (normalizedPercent >= 100) {
    return {
      isDone: true,
      doneMarkedOn: existingDoneDate || getTodayDateValue(),
      remaining: "0",
    };
  }

  return {
    isDone: false,
    doneMarkedOn: "",
    remaining: calculateRemainingValue(normalizedPercent),
  };
}

function normalizeMemberAssign(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => cleanCell(item)).filter(Boolean)));
  }
  const text = cleanCell(value);
  if (!text) return [];
  return Array.from(
    new Set(
      text
        .split(",")
        .map((item) => cleanCell(item))
        .filter(Boolean)
    )
  );
}

function formatMemberAssign(value) {
  const members = normalizeMemberAssign(value);
  return members.length ? members.join(", ") : "";
}

function getMemberPhoto(member) {
  return member?.profilePicture || member?.profile_picture || member?.avatar || member?.avatarUrl || member?.photoUrl || member?.photo_url || member?.image || "";
}

function getSectionCounts(project) {
  const pdpl = project?.pdplData || createEmptyPdplData();
  return {
    gantt: pdpl.ganttRows.length,
    controls: pdpl.controlRows.length,
    policies: pdpl.policyRows.length,
    documents: pdpl.documentRows.length,
  };
}

function getHeaderCandidates(rows) {
  return rows.slice(0, 20).map((row, index) => ({
    index,
    values: row.map((cell) => cleanCell(cell)),
  }));
}

function detectHeaderMeta(rows, sectionKey) {
  const aliases = COLUMN_ALIASES[sectionKey];
  const fields = PDPL_IMPORT_SECTION_FIELDS[sectionKey] || [];
  let best = { score: -1, index: 0, values: [] };
  for (const candidate of getHeaderCandidates(rows)) {
    let score = 0;
    for (const field of fields) {
      const expectedAliases = aliases[field.key] || [];
      if (
        candidate.values.some((value) =>
          expectedAliases.some((alias) => normalizeKey(value) === normalizeKey(alias))
        )
      ) {
        score += 1;
      }
    }
    if (score > best.score) best = { ...candidate, score };
  }
  const headers = (best.values || []).map((value, index) => ({
    index,
    label: value || `Column ${index + 1}`,
  }));
  const fieldMapping = {};
  for (const field of fields) {
    const expectedAliases = aliases[field.key] || [];
    const match = headers.find((header) =>
      expectedAliases.some((alias) => normalizeKey(header.label) === normalizeKey(alias))
    );
    fieldMapping[field.key] = match ? match.index : "";
  }
  return { headerIndex: best.index || 0, headers, fieldMapping };
}

function parseMappedRows(sectionKey, rows, headerIndex, fieldMapping) {
  const readValue = (row, key) => {
    const columnIndex = fieldMapping[key];
    if (columnIndex === "" || columnIndex === null || columnIndex === undefined) return "";
    return row[columnIndex];
  };

  const dataRows = rows.slice(headerIndex + 1).filter((row) => row.some((cell) => cleanCell(cell)));

  if (sectionKey === "gantt") {
    return dataRows
      .map((row, index) => {
        const startDate = normalizeDateValue(readValue(row, "startDate"));
        const endDate = normalizeDateValue(readValue(row, "endDate"));
        const percentDone = normalizePercentDoneString(readValue(row, "percentDone")) || "0";
        const doneState = getDoneStateFromPercent(percentDone);

        return {
          id: `gantt-${Date.now()}-${index}`,
          label: cleanCell(readValue(row, "label")) || `${index + 1}.1.1`,
          taskName: cleanCell(readValue(row, "taskName")),
          indiaTeam: cleanCell(readValue(row, "indiaTeam")),
          ksaTeam: cleanCell(readValue(row, "ksaTeam")),
          memberAssign: [],
          startDate,
          endDate,
          isDone: doneState.isDone,
          doneMarkedOn: doneState.doneMarkedOn,
          percentDone,
          workDays: calculateWorkDays(startDate, endDate),
          remaining: doneState.remaining,
          remark: "",
        };
      })
      .filter((row) => row.taskName);
  }

  if (sectionKey === "controls") {
    return dataRows
      .map((row, index) => ({
        id: `control-${Date.now()}-${index}`,
        serialNo: cleanCell(readValue(row, "serialNo")) || String(index + 1),
        category: cleanCell(readValue(row, "category")),
        title: cleanCell(readValue(row, "title")),
        status: cleanCell(readValue(row, "status")) || "Not Started",
      }))
      .filter((row) => row.category || row.title);
  }

  if (sectionKey === "policies") {
    return dataRows
      .map((row, index) => ({
        id: `policy-${Date.now()}-${index}`,
        serialNo: cleanCell(readValue(row, "serialNo")) || String(index + 1),
        policyName: cleanCell(readValue(row, "policyName")),
        status: cleanCell(readValue(row, "status")) || "Pending",
        documentStatus: cleanCell(readValue(row, "documentStatus")) || "Not Received",
      }))
      .filter((row) => row.policyName);
  }

  if (sectionKey === "documents") {
    return dataRows
      .map((row, index) => ({
        id: `document-${Date.now()}-${index}`,
        serialNo: cleanCell(readValue(row, "serialNo")) || String(index + 1),
        documentName: cleanCell(readValue(row, "documentName")),
        status: cleanCell(readValue(row, "status")) || "Incomplete",
        documentStatus: cleanCell(readValue(row, "documentStatus")) || "Not Received",
        attachments: [],
      }))
      .filter((row) => row.documentName);
  }

  return dataRows;
}

function buildControlPivot(rows) {
  const grouped = {};
  rows.forEach((row) => {
    const category = cleanCell(row.category) || "Uncategorized";
    if (!grouped[category]) {
      grouped[category] = {
        category,
        Completed: 0,
        "In Progress": 0,
        "Not Started": 0,
        total: 0,
      };
    }
    const normalizedStatus = normalizeKey(row.status);
    const status =
      normalizedStatus === "completed"
        ? "Completed"
        : normalizedStatus === "in progress"
        ? "In Progress"
        : normalizedStatus === "not started"
        ? "Not Started"
        : "Not Started";
    grouped[category][status] += 1;
    grouped[category].total += 1;
  });
  const result = Object.values(grouped).sort((a, b) => a.category.localeCompare(b.category));
  const totals = result.reduce(
    (accumulator, row) => {
      accumulator.Completed += row.Completed;
      accumulator["In Progress"] += row["In Progress"];
      accumulator["Not Started"] += row["Not Started"];
      accumulator.total += row.total;
      return accumulator;
    },
    { category: "Grand Total", Completed: 0, "In Progress": 0, "Not Started": 0, total: 0 }
  );
  return { rows: result, totals };
}

function openAttachmentFile(file) {
  if (!file) return;
  const fileUrl = file.viewUrl || (typeof file === "string" ? file : URL.createObjectURL(file));
  window.open(fileUrl, "_blank", "noopener,noreferrer");
}

function downloadAttachmentFile(file) {
  if (!file) return;
  const fileUrl = file.viewUrl || (typeof file === "string" ? file : URL.createObjectURL(file));
  const anchor = document.createElement("a");
  anchor.href = fileUrl;
  anchor.download = file.fileName || file.name || (typeof file === "string" ? "attachment" : "attachment");
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function Pill({ children, bg, color, border }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 700,
        background: bg,
        color,
        border: `1px solid ${border}`,
      }}
    >
      {children}
    </span>
  );
}

function statusPill(status, type) {
  const map =
    type === "controls"
      ? {
          Completed: [COLORS.greenBg, COLORS.green, COLORS.greenBorder],
          "In Progress": [COLORS.amberBg, COLORS.amber, COLORS.amberBorder],
          "Not Started": ["#fff", COLORS.textSoft, COLORS.borderStrong],
        }
      : type === "policyDocs"
      ? {
          Approved: [COLORS.greenBg, COLORS.green, COLORS.greenBorder],
          Pending: [COLORS.amberBg, COLORS.amber, COLORS.amberBorder],
          Draft: [COLORS.blueBg, COLORS.blue, COLORS.blueBorder],
          Rejected: [COLORS.redBg, COLORS.red, COLORS.redBorder],
          Received: [COLORS.greenBg, COLORS.green, COLORS.greenBorder],
          "Not Received": [COLORS.redBg, COLORS.red, COLORS.redBorder],
        }
      : {
          Complete: [COLORS.greenBg, COLORS.green, COLORS.greenBorder],
          Incomplete: [COLORS.redBg, COLORS.red, COLORS.redBorder],
          "In Progress": [COLORS.amberBg, COLORS.amber, COLORS.amberBorder],
          "Not Started": ["#fff", COLORS.textSoft, COLORS.borderStrong],
        };

  const [bg, color, border] = map[status] || ["#fff", COLORS.textSoft, COLORS.borderStrong];
  return <Pill bg={bg} color={color} border={border}>{status}</Pill>;
}

function MetricCard({ label, value, note, accent, bg, border }) {
  return (
    <div
      style={{
        background: `linear-gradient(180deg, #ffffff 0%, ${bg} 100%)`,
        border: `1px solid ${border}`,
        borderRadius: 20,
        padding: 20,
        minHeight: 122,
        boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ fontSize: 11, color: accent, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 12 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12.5, color: COLORS.textSoft, marginTop: 12, lineHeight: 1.6 }}>{note}</div>
    </div>
  );
}

function SectionTable({ headers, children, boxed = true }) {
  return (
    <div style={{ background: "#fff", border: boxed ? `1px solid ${COLORS.border}` : "none", borderRadius: boxed ? 18 : 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  style={{
                    padding: "12px 14px",
                    textAlign: "left",
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    color: COLORS.textMuted,
                    background: COLORS.grayBg,
                    borderBottom: `1px solid ${COLORS.border}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function DrawerField({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontSize: 11.5, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: MONO }}>{label}</span>
      {children}
    </label>
  );
}

function PdplRowDrawer({ open, title, subtitle, fields, values, onChange, onClose, onSave, onDelete, saveDisabled = false, saveLabel = "Save", showToast }) {
  const [drawerWidth, setDrawerWidth] = useState(520);
  const [isResizing, setIsResizing] = useState(false);
  const drawerAccent = "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,1) 100%)";
  const uploadCardStyle = {
    border: `2px dashed ${COLORS.borderStrong}`,
    borderRadius: 24,
    padding: "26px 20px",
    cursor: "pointer",
    background: "linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)",
    display: "grid",
    justifyItems: "center",
    gap: 12,
    textAlign: "center",
    transition: "all 0.2s ease",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
  };

  const confirmAttachmentRemoval = (fieldKey, files, index) => {
    const attachment = files[index];
    if (!attachment) return;
    const attachmentLabel = attachment.fileName || attachment.name || "this attachment";
    const isPersistedAttachment = !(attachment instanceof File);
    const confirmed = window.confirm(
      isPersistedAttachment
        ? `Delete "${attachmentLabel}"? Click OK to remove it from this row. When you save, it will also be deleted from the database.`
        : `Delete "${attachmentLabel}" from this row?`
    );
    if (!confirmed) return;
    onChange(fieldKey, files.filter((_, currentIndex) => currentIndex !== index));
  };

  const appendFiles = (fieldKey, files, incomingFiles) => {
    const { validFiles, rejectedFiles } = splitAuditingFilesBySize(incomingFiles);
    if (rejectedFiles.length) {
      showToast?.("error", buildAuditingFileSizeLimitMessage(rejectedFiles));
    }
    if (validFiles.length) {
      onChange(fieldKey, [...files, ...validFiles]);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handleMove = (event) => {
      if (!isResizing) return;
      const nextWidth = Math.min(Math.max(window.innerWidth - event.clientX, 420), 860);
      setDrawerWidth(nextWidth);
    };
    const handleUp = () => setIsResizing(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isResizing, open]);

  if (!open) return null;
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.26)", zIndex: 1200 }} onClick={onClose} />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: `min(${drawerWidth}px, 92vw)`,
          height: "100vh",
          background: "#fff",
          borderLeft: `1px solid ${COLORS.borderStrong}`,
          boxShadow: "-30px 0 70px rgba(15,23,42,0.18)",
          zIndex: 1201,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 10, background: drawerAccent }} />
        <div
          onMouseDown={() => setIsResizing(true)}
          style={{
            position: "absolute",
            top: 0,
            left: -6,
            width: 12,
            height: "100%",
            cursor: "col-resize",
            zIndex: 2,
            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,1) 100%)",
          }}
        />
        <div style={{ padding: "22px 24px", borderBottom: `1px solid ${COLORS.border}`, background: "linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, letterSpacing: "-0.02em" }}>{title}</div>
            {subtitle ? <div style={{ fontSize: 13.5, color: COLORS.textSoft, marginTop: 8, lineHeight: 1.6 }}>{subtitle}</div> : null}
          </div>
          <button onClick={onClose} style={{ ...tableInputStyle, width: 42, height: 42, padding: 0, cursor: "pointer", borderRadius: 14, borderColor: COLORS.border, boxShadow: "0 8px 18px rgba(15,23,42,0.06)" }}>X</button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", display: "grid", gap: 16, flex: 1 }}>
      {fields.map((field) => {
        const value = values[field.key] ?? "";
        const commonStyle = { ...tableInputStyle, padding: "10px 12px" };
        if (field.type === "files") {
          const files = Array.isArray(value) ? value : [];
              return (
                <DrawerField key={field.key} label={field.label}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <label style={uploadCardStyle}>
                      <div style={{ width: 64, height: 64, borderRadius: 20, background: "#f1f5f9", border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)" }}>
                        <div style={{ position: "relative", width: 24, height: 24 }}>
                          <div style={{ position: "absolute", left: "50%", top: 3, width: 2, height: 13, background: COLORS.teal, transform: "translateX(-50%)", borderRadius: 999 }} />
                          <div style={{ position: "absolute", left: "50%", top: 1, width: 8, height: 8, borderTop: `2px solid ${COLORS.teal}`, borderLeft: `2px solid ${COLORS.teal}`, transform: "translateX(-50%) rotate(45deg)" }} />
                          <div style={{ position: "absolute", left: 4, right: 4, bottom: 3, height: 2, borderRadius: 999, background: COLORS.teal }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.text }}>Drop files here or click to browse</div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted }}>Any format supported - Max 20 MB each</div>
                      <input
                        type="file"
                        multiple
                        onChange={(event) => {
                          appendFiles(field.key, files, event.target.files || []);
                          event.target.value = "";
                        }}
                        style={{ display: "none" }}
                      />
                    </label>
                    <label
                      style={{
                        ...uploadCardStyle,
                        borderColor: COLORS.tealBorder,
                        background: "linear-gradient(180deg,#ffffff 0%,#f0fdfa 100%)",
                      }}
                    >
                      <div style={{ width: 64, height: 64, borderRadius: 20, background: "#ecfeff", border: `1px solid ${COLORS.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)" }}>
                        <div style={{ position: "relative", width: 28, height: 22 }}>
                          <div style={{ position: "absolute", left: 2, top: 6, width: 24, height: 14, border: `2px solid ${COLORS.teal}`, borderRadius: 5, background: "rgba(13,148,136,0.06)" }} />
                          <div style={{ position: "absolute", left: 5, top: 2, width: 10, height: 7, borderTopLeftRadius: 4, borderTopRightRadius: 4, border: `2px solid ${COLORS.teal}`, borderBottom: "none", background: "#ecfeff" }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.text }}>Drop folder here or click to browse</div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted }}>Upload a full folder and keep every file together</div>
                      <input
                        type="file"
                        multiple
                        webkitdirectory=""
                        directory=""
                        onChange={(event) => {
                          appendFiles(field.key, files, event.target.files || []);
                          event.target.value = "";
                        }}
                        style={{ display: "none" }}
                      />
                    </label>
                    {!!files.length && (
                      <div style={{ display: "grid", gap: 8 }}>
                        {files.map((file, index) => (
                          <div key={`${file.storagePath || file.fileName || file.name}-${index}`} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: 1 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 10, background: COLORS.greenBg, border: `1px solid ${COLORS.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                                DOC
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.fileName || file.name}</div>
                                <div style={{ fontSize: 11.5, color: COLORS.textSoft, marginTop: 2 }}>{file.mimeType || file.type || "File"}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                                  <button type="button" onClick={() => openAttachmentFile(file)} style={{ border: "none", background: "transparent", color: COLORS.teal, cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 0, lineHeight: 1.2 }}>
                                    View
                                  </button>
                                  <button type="button" onClick={() => downloadAttachmentFile(file)} style={{ border: "none", background: "transparent", color: COLORS.textSoft, cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 0, lineHeight: 1.2 }}>
                                    Download
                                  </button>
                                  <button type="button" onClick={() => confirmAttachmentRemoval(field.key, files, index)} style={{ border: "none", background: "transparent", color: COLORS.red, cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 0, lineHeight: 1.2 }}>
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </DrawerField>
              );
            }
            if (field.type === "select") {
              return (
                <DrawerField key={field.key} label={field.label}>
                  <select value={value} onChange={(event) => onChange(field.key, event.target.value)} style={commonStyle}>
                    {(field.options || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </DrawerField>
              );
            }
            if (field.type === "memberSelect") {
              const selectedMembers = normalizeMemberAssign(value);
              const options = field.options || [];
              return (
                <DrawerField key={field.key} label={field.label}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 34 }}>
                      {selectedMembers.length ? (
                        selectedMembers.map((member) => (
                          <span
                            key={member}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "7px 10px",
                              borderRadius: 999,
                              border: `1px solid ${COLORS.tealBorder}`,
                              background: COLORS.tealBg,
                              color: COLORS.tealDark,
                              fontSize: 12.5,
                              fontWeight: 700,
                            }}
                          >
                            {member}
                            <button
                              type="button"
                              onClick={() => onChange(field.key, selectedMembers.filter((item) => item !== member))}
                              style={{ border: "none", background: "transparent", color: COLORS.tealDark, cursor: "pointer", fontSize: 12, padding: 0 }}
                            >
                              x
                            </button>
                          </span>
                        ))
                      ) : (
                        <div style={{ fontSize: 12.5, color: COLORS.textMuted }}>None selected</div>
                      )}
                    </div>
                    <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ maxHeight: 180, overflowY: "auto" }}>
                        {options.length ? (
                          options.map((option) => {
                            const checked = selectedMembers.includes(option);
                            return (
                              <label
                                key={option}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  padding: "10px 12px",
                                  borderBottom: `1px solid ${COLORS.border}`,
                                  cursor: "pointer",
                                  background: checked ? COLORS.tealBg : "#fff",
                                }}
                              >
                                <span style={{ fontSize: 13, color: COLORS.text, fontWeight: checked ? 700 : 500 }}>{option}</span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    onChange(
                                      field.key,
                                      checked ? selectedMembers.filter((item) => item !== option) : [...selectedMembers, option]
                                    )
                                  }
                                />
                              </label>
                            );
                          })
                        ) : (
                          <div style={{ padding: "12px", fontSize: 12.5, color: COLORS.textMuted }}>No project members available</div>
                        )}
                      </div>
                    </div>
                  </div>
                </DrawerField>
              );
            }
            if (field.type === "textarea") {
              return (
                <DrawerField key={field.key} label={field.label}>
                  <textarea value={value} onChange={(event) => onChange(field.key, event.target.value)} rows={4} style={{ ...commonStyle, resize: "vertical" }} />
                </DrawerField>
              );
            }
            if (field.type === "checkbox") {
              return (
                <DrawerField key={field.key} label={field.label}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      minHeight: 44,
                      padding: "10px 12px",
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 12,
                      background: Boolean(value) ? COLORS.greenBg : "#fff",
                      color: COLORS.text,
                    }}
                  >
                    <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(field.key, event.target.checked)} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{Boolean(value) ? "Marked Done" : "Not Done"}</span>
                  </label>
                </DrawerField>
              );
            }
            return (
              <DrawerField key={field.key} label={field.label}>
                <input type={field.type || "text"} value={value} onChange={(event) => onChange(field.key, event.target.value)} style={commonStyle} />
              </DrawerField>
            );
          })}
        </div>

        <div style={{ padding: "16px 22px 20px", borderTop: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <button onClick={onDelete} style={{ ...tableInputStyle, width: 110, cursor: "pointer", color: COLORS.red, borderColor: COLORS.redBorder }}>
            Delete
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ ...tableInputStyle, width: 110, cursor: "pointer" }}>Cancel</button>
            <button onClick={onSave} disabled={saveDisabled} style={{ border: "none", borderRadius: 12, padding: "10px 18px", background: saveDisabled ? COLORS.borderStrong : COLORS.teal, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saveDisabled ? "not-allowed" : "pointer", opacity: saveDisabled ? 0.85 : 1 }}>
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function EmptySection({ title, note }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px dashed ${COLORS.borderStrong}`,
        borderRadius: 18,
        padding: "30px 22px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: COLORS.textSoft }}>{note}</div>
    </div>
  );
}

function SkeletonBlock({ height, width = "100%", radius = 14, style = {} }) {
  return <div style={{ height, width, borderRadius: radius, background: "#e8eef6", ...style }} />;
}

function ProjectCardsSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 18 }}>
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          style={{
            background: "linear-gradient(135deg,#ffffff 0%, #f8fbff 100%)",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 24,
            padding: 28,
            minHeight: 390,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: "0 14px 34px rgba(15,23,42,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <SkeletonBlock height={66} width={66} radius={18} />
            <SkeletonBlock height={32} width={112} radius={999} />
          </div>
          <SkeletonBlock height={14} width={132} radius={999} />
          <SkeletonBlock height={30} width="72%" radius={12} />
          <SkeletonBlock height={14} width="100%" radius={999} />
          <SkeletonBlock height={14} width="86%" radius={999} />
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <SkeletonBlock height={12} width={92} radius={999} />
              <SkeletonBlock height={12} width={44} radius={999} />
            </div>
            <SkeletonBlock height={8} width="100%" radius={999} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <SkeletonBlock height={28} width={28} radius={999} />
                <SkeletonBlock height={28} width={28} radius={999} />
                <SkeletonBlock height={28} width={28} radius={999} />
              </div>
              <SkeletonBlock height={12} width={76} radius={999} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PdplSectionLoadingPanel({ title = "Loading section data" }) {
  return (
    <div
      style={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: 22,
        background: "#fff",
        padding: "26px 24px",
        boxShadow: "0 14px 34px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.text }}>{title}</div>
          <div style={{ fontSize: 13, color: COLORS.textSoft, marginTop: 8 }}>Fetching the latest records from the database. The page will appear once everything is ready.</div>
        </div>
        <div style={{ width: 54, height: 54, borderRadius: "50%", border: `3px solid ${COLORS.tealBorder}`, borderTopColor: COLORS.teal, animation: "spin 1s linear infinite" }} />
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "grid", gap: 12 }}>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 2.1fr 1.2fr 1.2fr", gap: 12 }}>
            <SkeletonBlock height={48} />
            <SkeletonBlock height={48} />
            <SkeletonBlock height={48} />
            <SkeletonBlock height={48} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectDeleteConfirmationModal({ open, projectName, deleting, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.34)", zIndex: 1400 }} onClick={() => !deleting && onClose()} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1401, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "min(480px, 100%)", background: "#fff", border: `1px solid ${COLORS.redBorder}`, borderRadius: 24, boxShadow: "0 24px 60px rgba(15,23,42,0.18)", overflow: "hidden" }}>
          <div style={{ padding: "22px 24px 18px", background: "linear-gradient(135deg,#fff5f5 0%, #ffffff 100%)", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "inline-flex", alignItems: "center", padding: "6px 10px", borderRadius: 999, background: COLORS.redBg, color: COLORS.red, border: `1px solid ${COLORS.redBorder}`, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase" }}>
              Delete Project
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginTop: 14 }}>Delete entire project?</div>
            <div style={{ fontSize: 13.5, color: COLORS.textSoft, lineHeight: 1.7, marginTop: 10 }}>
              This will permanently delete <strong style={{ color: COLORS.text }}>{projectName || "this project"}</strong> and remove its saved data from the database.
            </div>
          </div>
          <div style={{ padding: "18px 24px 24px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={onClose} disabled={deleting} style={{ ...tableInputStyle, width: 110, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1 }}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={deleting} style={{ border: "none", borderRadius: 12, padding: "10px 18px", background: COLORS.red, color: "#fff", fontSize: 13, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.8 : 1 }}>
              {deleting ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ProjectCard({ project, members, onOpen }) {
  const progress = project.progressPercent ?? getProjectProgress(project);
  const assignedMembers = project.teamMemberIds?.slice(0, 4) || [];
  const stepCount = project.pdplData?.ganttRows?.length || project.ganttCount || 0;
  const projectBadgeLabel = String(project.clientName || project.name || "PD")
    .split(" ")
    .map((part) => part.trim()[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PD";
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        background: "linear-gradient(135deg,#ffffff 0%, #f4fffd 100%)",
        border: `1px solid ${COLORS.tealBorder}`,
        borderRadius: 24,
        padding: 28,
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
        maxWidth: 430,
        minHeight: 390,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow: "0 14px 34px rgba(15,23,42,0.06)",
        transition: "transform .18s ease, box-shadow .18s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 18px 38px rgba(15,23,42,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 14px 34px rgba(15,23,42,0.06)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div
          style={{
            width: 66,
            height: 66,
            borderRadius: 18,
            border: `1px solid ${COLORS.tealBorder}`,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLORS.teal,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "0.06em",
            boxShadow: "0 10px 24px rgba(13,148,136,0.08)",
            flexShrink: 0,
          }}
        >
          {projectBadgeLabel}
        </div>
        <Pill bg={COLORS.tealBg} color={COLORS.teal} border={COLORS.tealBorder}>
          {project.status === "active" ? "Active" : project.status || "Draft"}
        </Pill>
      </div>

      <div style={{ fontSize: 12.5, color: COLORS.teal, textTransform: "uppercase", letterSpacing: "2px", fontFamily: MONO }}>
        PDPL Project
      </div>

      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, lineHeight: 1.3 }}>{project.name}</div>
      <div style={{ fontSize: 14, color: COLORS.textSoft, lineHeight: 1.75 }}>
        {project.desc || `Comprehensive audit for ${project.clientName || "this client"} across PDPL controls, policies, and documentation.`}
      </div>

      <div style={{ height: 1, width: "100%", background: COLORS.border, marginTop: 4 }} />

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "1.2px", fontFamily: MONO }}>Progress</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textSoft }}>{progress}%</div>
        </div>
        <div style={{ width: "100%", height: 8, borderRadius: 999, background: "#dce8f5", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", borderRadius: 999, background: COLORS.teal }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {assignedMembers.map((memberId, index) => {
            const member = members.find((item) => String(item.id) === String(memberId));
            if (!member) return null;
            const initials = member.initials || member.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div
                key={memberId}
                title={member.name}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: AVATAR_COLORS[index % AVATAR_COLORS.length],
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 800,
                  marginLeft: index === 0 ? 0 : -6,
                  border: "2px solid #fff",
                }}
              >
                {initials}
              </div>
            );
          })}
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: MONO }}>
            {stepCount}/{Math.max(stepCount, 1)} steps
          </div>
        </div>
      </div>
    </button>
  );
}

function ImportWorkbookModal({ open, onClose, onApply, showToast }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workbookData, setWorkbookData] = useState(null);
  const [sheetMapping, setSheetMapping] = useState({});
  const [columnMapping, setColumnMapping] = useState({});
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setError("");
      setWorkbookData(null);
      setSheetMapping({});
      setColumnMapping({});
      setDragActive(false);
    }
  }, [open]);

  if (!open) return null;

  const loadXlsx = async () => {
    if (window.XLSX) return window.XLSX;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load workbook reader."));
      document.head.appendChild(script);
    });
    return window.XLSX;
  };

  const autoSelectSection = (sheetName) => {
    const name = normalizeKey(sheetName);
    if (name.includes("gantt")) return "gantt";
    if (name.includes("control")) return "controls";
    if (name.includes("polic")) return "policies";
    if (name.includes("document")) return "documents";
    if (name.includes("dashboard")) return "dashboard";
    return "";
  };

  const readWorkbookFile = async (file) => {
    if (!file) return;
    try {
      setLoading(true);
      setError("");
      setDragActive(false);
      const XLSX = await loadXlsx();
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
      const sheets = workbook.SheetNames.map((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", blankrows: false });
        return { name: sheetName, rows };
      });

      const nextSheetMapping = {};
      const nextColumnMapping = {};

      sheets.forEach((sheet) => {
        const section = autoSelectSection(sheet.name);
        if (section && !nextSheetMapping[section]) {
          nextSheetMapping[section] = sheet.name;
        }
      });

      Object.entries(nextSheetMapping).forEach(([section, sheetName]) => {
        const currentSheet = sheets.find((sheet) => sheet.name === sheetName);
        if (!currentSheet || !PDPL_IMPORT_SECTION_FIELDS[section]) return;
        nextColumnMapping[section] = detectHeaderMeta(currentSheet.rows, section);
      });

      setWorkbookData({ fileName: file.name, sheets });
      setSheetMapping(nextSheetMapping);
      setColumnMapping(nextColumnMapping);
    } catch (importError) {
      setError(importError.message || "Failed to read workbook.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    await readWorkbookFile(file);
  };

  const updateSheetForSection = (section, sheetName) => {
    const nextSheetMapping = { ...sheetMapping, [section]: sheetName };
    setSheetMapping(nextSheetMapping);
    const sheet = workbookData?.sheets.find((item) => item.name === sheetName);
    if (sheet && PDPL_IMPORT_SECTION_FIELDS[section]) {
      setColumnMapping((current) => ({ ...current, [section]: detectHeaderMeta(sheet.rows, section) }));
    }
  };

  const applyImport = () => {
    if (!workbookData) {
      setError("Upload a workbook first.");
      return;
    }

    const selectedSheets = {};
    const nextData = createEmptyPdplData();

    ["gantt", "controls", "policies", "documents", "dashboard"].forEach((section) => {
      const sheetName = sheetMapping[section];
      if (!sheetName) return;
      const sheet = workbookData.sheets.find((item) => item.name === sheetName);
      if (!sheet) return;
      selectedSheets[section] = sheetName;
      if (PDPL_IMPORT_SECTION_FIELDS[section]) {
        const meta = columnMapping[section] || detectHeaderMeta(sheet.rows, section);
        const parsed = parseMappedRows(section, sheet.rows, meta.headerIndex, meta.fieldMapping);
        if (section === "gantt") nextData.ganttRows = parsed;
        if (section === "controls") nextData.controlRows = parsed;
        if (section === "policies") nextData.policyRows = parsed;
        if (section === "documents") nextData.documentRows = parsed;
      } else if (section === "dashboard") {
        nextData.dashboardRows = sheet.rows;
      }
    });

    nextData.importMeta = {
      fileName: workbookData.fileName,
      importedAt: new Date().toISOString(),
      sheetMapping: selectedSheets,
    };

    onApply(nextData);
    showToast("success", "PDPL workbook mapped and loaded into the project.");
    onClose();
  };

  const overlayStyle = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1000 };
  const modalStyle = {
    position: "fixed",
    inset: "8% 10%",
    background: "#fff",
    borderRadius: 24,
    border: `1px solid ${COLORS.border}`,
    zIndex: 1001,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 28px 80px rgba(15,23,42,0.18)",
  };

  const uploadPanelStyle = {
    display: "flex",
    alignItems: "center",
    gap: 18,
    minHeight: 136,
    padding: "18px 20px",
    background: dragActive ? "#f0fdfa" : "linear-gradient(180deg,#ffffff 0%,#fbfffe 100%)",
    border: `2px dashed ${dragActive ? COLORS.teal : COLORS.tealBorder}`,
    borderRadius: 20,
    cursor: "pointer",
    transition: "all .18s ease",
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={modalStyle}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>Import PDPL Workbook</div>
            <div style={{ fontSize: 13, color: COLORS.textSoft, marginTop: 6 }}>
              Upload one workbook and map each sheet into the right PDPL section.
            </div>
          </div>
          <button onClick={onClose} style={{ ...tableInputStyle, width: 42, height: 42, padding: 0, cursor: "pointer" }}>x</button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ background: COLORS.tealBg, border: `1px solid ${COLORS.tealBorder}`, borderRadius: 18, padding: 20 }}>
                <label
                  style={uploadPanelStyle}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files?.[0];
                    readWorkbookFile(file);
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 18,
                      background: "linear-gradient(180deg,#ffffff 0%,#ecfeff 100%)",
                      border: `1px solid ${COLORS.tealBorder}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 12px 30px rgba(13,148,136,0.10)",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ position: "relative", width: 34, height: 34 }}>
                      <div style={{ position: "absolute", inset: 0, borderRadius: 10, background: COLORS.teal, opacity: 0.14 }} />
                      <div style={{ position: "absolute", left: "50%", top: 3, width: 3, height: 18, background: COLORS.teal, transform: "translateX(-50%)", borderRadius: 999 }} />
                      <div style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%) rotate(45deg)", width: 10, height: 10, borderTop: `3px solid ${COLORS.teal}`, borderLeft: `3px solid ${COLORS.teal}` }} />
                      <div style={{ position: "absolute", left: 6, right: 6, bottom: 5, height: 3, borderRadius: 999, background: COLORS.teal }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text }}>Upload PDPL workbook</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Pill bg="#ffffff" color={COLORS.teal} border={COLORS.tealBorder}>.xlsx</Pill>
                        <Pill bg="#ffffff" color={COLORS.teal} border={COLORS.tealBorder}>.xls</Pill>
                        <Pill bg="#ffffff" color={COLORS.textSoft} border={COLORS.borderStrong}>Multi-sheet</Pill>
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.6, color: COLORS.textSoft }}>
                      Drop the workbook here or click to browse. We will auto-detect Gantt, Controls, Policies, Documents, and Dashboard.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                      <Pill bg="#ffffff" color={COLORS.textSoft} border={COLORS.borderStrong}>Upload</Pill>
                      <Pill bg="#ffffff" color={COLORS.textSoft} border={COLORS.borderStrong}>Map</Pill>
                      <Pill bg="#ffffff" color={COLORS.textSoft} border={COLORS.borderStrong}>Preview</Pill>
                    </div>
                  </div>
                  <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
                </label>
                {loading && <div style={{ fontSize: 12.5, color: COLORS.textSoft, marginTop: 14 }}>Reading workbook and preparing sheet mapping...</div>}
                {workbookData && <div style={{ fontSize: 12.5, color: COLORS.teal, marginTop: 14, fontWeight: 700 }}>{workbookData.fileName}</div>}
                {error && <div style={{ marginTop: 14, fontSize: 12.5, color: COLORS.red }}>{error}</div>}
              </div>

              {workbookData && (
                <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 18 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>Sheet mapping</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
                    {Object.entries(SECTION_META).map(([sectionKey, meta]) => (
                      <div key={sectionKey} style={{ border: `1px solid ${meta.border}`, background: meta.bg, borderRadius: 16, padding: 14 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: meta.accent, marginBottom: 8 }}>{meta.label}</div>
                        <select
                          value={sheetMapping[sectionKey] || ""}
                          onChange={(e) => updateSheetForSection(sectionKey, e.target.value)}
                          style={{ ...tableInputStyle, borderColor: meta.border }}
                        >
                          <option value="">Not mapped</option>
                          {workbookData.sheets.map((sheet) => (
                            <option key={sheet.name} value={sheet.name}>
                              {sheet.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>Column mapping preview</div>
                {!workbookData ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 13, color: COLORS.textSoft }}>Upload the workbook to configure manual column mapping.</div>
                    <div style={{ border: `1px dashed ${COLORS.borderStrong}`, borderRadius: 16, padding: 16, background: COLORS.grayBg }}>
                      <div style={{ display: "grid", gap: 10 }}>
                        {[
                          "Sheet names will be matched to the right PDPL sections automatically.",
                          "You can manually change the sheet mapping before import.",
                          "Each core section supports manual column remapping before apply.",
                        ].map((line, index) => (
                          <div key={index} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: COLORS.textMuted }}>
                              {index + 1}
                            </div>
                            <div style={{ fontSize: 12.5, color: COLORS.textSoft, lineHeight: 1.6 }}>{line}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {["gantt", "controls", "policies", "documents"].map((sectionKey) => {
                      const meta = columnMapping[sectionKey];
                      const sheetName = sheetMapping[sectionKey];
                      if (!sheetName || !meta) return null;
                      return (
                        <div key={sectionKey} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>
                            {SECTION_META[sectionKey].label} - {sheetName}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                            {PDPL_IMPORT_SECTION_FIELDS[sectionKey].map((field) => (
                              <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <span style={{ fontSize: 11.5, color: COLORS.textSoft }}>{field.label}</span>
                                <select
                                  value={meta.fieldMapping[field.key]}
                                  onChange={(e) =>
                                    setColumnMapping((current) => ({
                                      ...current,
                                      [sectionKey]: {
                                        ...current[sectionKey],
                                        fieldMapping: {
                                          ...current[sectionKey].fieldMapping,
                                          [field.key]: e.target.value === "" ? "" : Number(e.target.value),
                                        },
                                      },
                                    }))
                                  }
                                  style={tableInputStyle}
                                >
                                  <option value="">Not mapped</option>
                                  {meta.headers.map((header) => (
                                    <option key={header.index} value={header.index}>
                                      {header.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {workbookData && (
                <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 18 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>Workbook sheets</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {workbookData.sheets.map((sheet) => (
                      <div key={sheet.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px" }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.text }}>{sheet.name}</div>
                          <div style={{ fontSize: 12, color: COLORS.textSoft, marginTop: 4 }}>{sheet.rows.length} row(s) detected</div>
                        </div>
                        <div style={{ fontSize: 11.5, color: COLORS.textMuted }}>{autoSelectSection(sheet.name) || "manual"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ ...tableInputStyle, width: 120, cursor: "pointer" }}>Cancel</button>
          <button
            onClick={applyImport}
            style={{
              border: "none",
              borderRadius: 12,
              padding: "11px 18px",
              background: COLORS.teal,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Preview and Apply
          </button>
        </div>
      </div>
    </>
  );
}

function PdplProjectModal({ open, members, mode = "create", initialValues, onClose, onSubmit, submitting = false }) {
  const emptyForm = {
    projectName: "",
    projectLeader: "",
    clientName: "",
    start: "",
    end: "",
    projectLength: "",
    teamMemberIds: [],
  };
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    ...(initialValues || {}),
    teamMemberIds: Array.isArray(initialValues?.teamMemberIds) ? initialValues.teamMemberIds : [],
  }));
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);

  if (!open) return null;

  const toggleMember = (memberId) => {
    setForm((current) => ({
      ...current,
      teamMemberIds: current.teamMemberIds.includes(memberId)
        ? current.teamMemberIds.filter((id) => id !== memberId)
        : [...current.teamMemberIds, memberId],
    }));
  };

  const handleClose = () => {
    setForm({ ...emptyForm });
    setMemberPickerOpen(false);
    onClose();
  };

  const selectedMembers = members.filter((member) => form.teamMemberIds.includes(member.id));

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1000 }} onClick={submitting ? undefined : handleClose} />
      <div
        style={{
          position: "fixed",
          top: "2%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(820px, 92vw)",
          background: "#fff",
          borderRadius: 22,
          border: `1px solid ${COLORS.border}`,
          zIndex: 1001,
          boxShadow: "0 28px 80px rgba(15,23,42,0.18)",
          overflow: "visible",
        }}
      >
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.teal }}>{mode === "edit" ? "Edit PDPL Project Details" : "Create PDPL Project"}</div>
          <div style={{ fontSize: 12.5, color: COLORS.textSoft, marginTop: 6 }}>
            {mode === "edit"
              ? "Update the project heading details here. Your PDPL sections and workbook data will stay as they are."
              : "Fill the project heading details first. After creation you can upload workbook sections or enter rows manually."}
          </div>
        </div>

        <div style={{ padding: "18px 22px", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
          {[
            ["projectName", "Project Name"],
            ["projectLeader", "Project Leader"],
            ["clientName", "Client Name"],
            ["start", "Project Start Date", "date"],
            ["end", "Project End Date", "date"],
            ["projectLength", "Project Length"],
          ].map(([key, label, type]) => (
            <label key={key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.text }}>{label}</span>
              <input
                type={type || "text"}
                value={form[key]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                style={{ ...tableInputStyle, padding: "10px 12px" }}
              />
            </label>
          ))}
        </div>

        <div style={{ padding: "0 22px 18px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>Assign To</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(320px, 1fr) minmax(220px, 280px)",
              gap: 14,
              alignItems: "start",
            }}
          >
            <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setMemberPickerOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: `1px dashed ${COLORS.borderStrong}`,
                background: "transparent",
                borderRadius: 999,
                padding: "8px 12px",
                cursor: "pointer",
                width: "fit-content",
                minHeight: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    border: `1px dashed ${COLORS.borderStrong}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    color: COLORS.textMuted,
                    flexShrink: 0,
                  }}
                >
                  +
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.textSoft }}>Select Team Members</div>
                </div>
              </div>
              <div style={{ fontSize: 15, color: COLORS.textMuted }}>{memberPickerOpen ? "^" : "v"}</div>
            </button>

            {false && memberPickerOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 10px)",
                  left: 0,
                  right: 0,
                  maxHeight: 260,
                  overflowY: "auto",
                  background: "#fff",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 18,
                  boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
                  padding: 10,
                  zIndex: 20,
                }}
              >
                {members.map((member) => {
                  const selected = form.teamMemberIds.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 12,
                        cursor: "pointer",
                        background: selected ? COLORS.tealBg : "#fff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {getMemberPhoto(member) ? (
                          <img
                            src={getMemberPhoto(member)}
                            alt={member.name}
                            style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: `1px solid ${COLORS.border}` }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              background: "#eff6ff",
                              color: COLORS.blue,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {(member.initials || member.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "TM")}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{member.name}</div>
                          <div style={{ fontSize: 11.5, color: COLORS.textSoft }}>{member.designation || member.role || member.email || "Auditing member"}</div>
                        </div>
                      </div>
                      <input type="checkbox" checked={selected} onChange={() => toggleMember(member.id)} />
                    </label>
                  );
                })}
              </div>
            )}
            </div>

            <div
              style={{
                border: "none",
                background: "transparent",
                borderRadius: 0,
                padding: "0",
                minHeight: 0,
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.textMuted, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
                Added Members
              </div>
              {selectedMembers.length ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", maxHeight: 96, overflowY: "auto", paddingRight: 2 }}>
                  {selectedMembers.map((member) => (
                    <div
                      key={`selected-${member.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 999,
                        background: "#fff",
                        border: `1px solid ${COLORS.tealBorder}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        {getMemberPhoto(member) ? (
                          <img src={getMemberPhoto(member)} alt={member.name} style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: COLORS.tealBg,
                              color: COLORS.teal,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 9.5,
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {(member.initials || member.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "TM")}
                          </div>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{member.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleMember(member.id)}
                        style={{ border: "none", background: "transparent", color: COLORS.textMuted, cursor: "pointer", fontSize: 14, padding: 0, flexShrink: 0 }}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: COLORS.textMuted }}>Selected members will appear here.</div>
              )}
            </div>
          </div>

          {false && !!selectedMembers.length && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {selectedMembers.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 999,
                    background: COLORS.tealBg,
                    border: `1px solid ${COLORS.tealBorder}`,
                    fontSize: 12.5,
                    color: COLORS.tealDark,
                    fontWeight: 700,
                  }}
                >
                  {getMemberPhoto(member) ? <img src={getMemberPhoto(member)} alt={member.name} style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} /> : null}
                  <span>{member.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleMember(member.id)}
                    style={{ border: "none", background: "transparent", color: COLORS.tealDark, cursor: "pointer", fontSize: 14, padding: 0 }}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {memberPickerOpen && (
          <>
            <div
              style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.16)", zIndex: 1002 }}
              onClick={() => setMemberPickerOpen(false)}
            />
            <div
              style={{
                position: "fixed",
                top: "10%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(540px, 88vw)",
                background: "#fff",
                borderRadius: 22,
                border: `1px solid ${COLORS.border}`,
                boxShadow: "0 28px 80px rgba(15,23,42,0.18)",
                zIndex: 1003,
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: `1px solid ${COLORS.border}` }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.teal }}>Select Team Members</div>
                  <div style={{ fontSize: 12.5, color: COLORS.textSoft, marginTop: 4 }}>Choose project members and save them into the team list.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setMemberPickerOpen(false)}
                  style={{
                    border: `1px solid ${COLORS.border}`,
                    background: "#fff",
                    color: COLORS.textMuted,
                    borderRadius: 12,
                    width: 38,
                    height: 38,
                    cursor: "pointer",
                    fontSize: 18,
                  }}
                >
                  x
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 220px", gap: 14, padding: 18 }}>
                <div style={{ maxHeight: 360, overflowY: "auto", paddingRight: 2 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {members.map((member) => {
                      const selected = form.teamMemberIds.includes(member.id);
                      return (
                        <label
                          key={`picker-${member.id}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "11px 12px",
                            borderRadius: 14,
                            cursor: "pointer",
                            background: selected ? COLORS.tealBg : "#fff",
                            border: `1px solid ${selected ? COLORS.tealBorder : COLORS.border}`,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            {getMemberPhoto(member) ? (
                              <img
                                src={getMemberPhoto(member)}
                                alt={member.name}
                                style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: `1px solid ${COLORS.border}`, flexShrink: 0 }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: "50%",
                                  background: "#eff6ff",
                                  color: COLORS.blue,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 12,
                                  fontWeight: 800,
                                  flexShrink: 0,
                                }}
                              >
                                {(member.initials || member.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "TM")}
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{member.name}</div>
                              <div style={{ fontSize: 11.5, color: COLORS.textSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {member.designation || member.role || member.email || "Auditing member"}
                              </div>
                            </div>
                          </div>
                          <input type="checkbox" checked={selected} onChange={() => toggleMember(member.id)} />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    border: `1px solid ${COLORS.border}`,
                    background: "#fbfdff",
                    borderRadius: 16,
                    padding: "12px 12px 10px",
                    minHeight: 120,
                  }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.textMuted, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
                    Added Team
                  </div>
                  {selectedMembers.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto", paddingRight: 2 }}>
                      {selectedMembers.map((member) => (
                        <div
                          key={`modal-selected-${member.id}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            padding: "7px 8px",
                            borderRadius: 12,
                            background: "#fff",
                            border: `1px solid ${COLORS.tealBorder}`,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            {getMemberPhoto(member) ? (
                              <img src={getMemberPhoto(member)} alt={member.name} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                            ) : (
                              <div
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: "50%",
                                  background: COLORS.tealBg,
                                  color: COLORS.teal,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  flexShrink: 0,
                                }}
                              >
                                {(member.initials || member.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "TM")}
                              </div>
                            )}
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{member.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleMember(member.id)}
                            style={{ border: "none", background: "transparent", color: COLORS.textMuted, cursor: "pointer", fontSize: 15, padding: 0, flexShrink: 0 }}
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12.5, color: COLORS.textMuted }}>No members selected yet.</div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "0 18px 18px" }}>
                <button onClick={() => setMemberPickerOpen(false)} style={{ ...tableInputStyle, width: 100, cursor: "pointer" }}>Done</button>
              </div>
            </div>
          </>
        )}

        <div style={{ padding: "18px 22px 28px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 10, background: "#fff" }}>
          <button onClick={handleClose} disabled={submitting} style={{ ...tableInputStyle, width: 110, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>Cancel</button>
          <button
            onClick={() => {
              onSubmit(form);
            }}
            disabled={submitting}
            style={{
              border: "none",
              borderRadius: 12,
              padding: "11px 18px",
              background: COLORS.teal,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.75 : 1,
            }}
          >
            {submitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Project"}
          </button>
        </div>
      </div>
    </>
  );
}

function SaveConfirmationModal({ open, title, note, verified, saving, onToggleVerified, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1100 }} onClick={saving ? undefined : onClose} />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(520px, 92vw)",
          background: "#fff",
          borderRadius: 22,
          border: `1px solid ${COLORS.border}`,
          zIndex: 1101,
          boxShadow: "0 28px 80px rgba(15,23,42,0.18)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 22px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.teal }}>{title}</div>
          <div style={{ fontSize: 12.5, color: COLORS.textSoft, marginTop: 8, lineHeight: 1.7 }}>{note}</div>
        </div>

        <div style={{ padding: "18px 22px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              border: `1px solid ${verified ? COLORS.tealBorder : COLORS.border}`,
              background: verified ? COLORS.tealBg : "#fff",
              borderRadius: 16,
              padding: "14px 16px",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            <input type="checkbox" checked={verified} disabled={saving} onChange={(event) => onToggleVerified(event.target.checked)} style={{ marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.text }}>I have verified that the data is correct.</div>
              <div style={{ fontSize: 12.5, color: COLORS.textSoft, marginTop: 6, lineHeight: 1.6 }}>
                After you click save, the selected PDPL data will be stored in the database.
              </div>
            </div>
          </label>
        </div>

        <div style={{ padding: "0 22px 22px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ ...tableInputStyle, width: 110, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!verified || saving}
            style={{
              border: "none",
              borderRadius: 12,
              padding: "11px 18px",
              background: !verified || saving ? COLORS.borderStrong : COLORS.teal,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: !verified || saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}

function renderGridRows(rows) {
  return rows.slice(0, 8).map((row, index) => (
    <tr key={index}>
      {row.slice(0, 8).map((cell, cellIndex) => (
        <td key={cellIndex} style={{ padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>
          {cleanCell(cell) || "-"}
        </td>
      ))}
    </tr>
  ));
}

export default function PdplWorkspace({
  selectedTemplate,
  projects,
  setProjects,
  auditMembers,
  search,
  setSearch,
  showToast,
  onBackToTemplates,
}) {
  const emptyProjectForm = {
    projectName: "",
    projectLeader: "",
    clientName: "",
    start: "",
    end: "",
    projectLength: "",
    teamMemberIds: [],
  };
  const buildPdplDescription = (clientName) => `PDPL audit workspace for ${clientName}`;
  const toProjectFormValues = (project) => ({
    projectName: project?.name || "",
    projectLeader: project?.projectLeader || "",
    clientName: project?.clientName || "",
    start: project?.start || "",
    end: project?.end || "",
    projectLength: project?.projectLength ?? "",
    teamMemberIds: Array.isArray(project?.teamMemberIds) ? project.teamMemberIds : [],
  });
  const [nav, setNav] = useState("dashboard");
  const [projectId, setProjectId] = useState(null);
  const [section, setSection] = useState("overview");
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState("create");
  const [projectModalInitialValues, setProjectModalInitialValues] = useState(emptyProjectForm);
  const [projectModalProjectId, setProjectModalProjectId] = useState(null);
  const [projectModalSaving, setProjectModalSaving] = useState(false);
  const [deleteConfirmState, setDeleteConfirmState] = useState({ open: false, projectId: null, projectName: "" });
  const [projectDeleting, setProjectDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [showControlPivot, setShowControlPivot] = useState(false);
  const [drawerState, setDrawerState] = useState({ open: false, sectionKey: "", key: null });
  const [drawerValues, setDrawerValues] = useState({});
  const [drawerInitialValues, setDrawerInitialValues] = useState({});
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [saveConfirmState, setSaveConfirmState] = useState({ open: false, scope: "all", verified: false });
  const [savingScope, setSavingScope] = useState(null);
  const [projectSaveBaseline, setProjectSaveBaseline] = useState({});
  const [pdplProjectsLoading, setPdplProjectsLoading] = useState(true);
  const [projectDetailsLoading, setProjectDetailsLoading] = useState(false);

  const pdplProjects = useMemo(
    () =>
      projects
        .filter((project) => project.templateId === "pdpl-template")
        .map((project) => ensurePdplProject(project))
        .filter((project) => {
          const query = search.toLowerCase();
          return !query || project.name.toLowerCase().includes(query) || (project.clientName || "").toLowerCase().includes(query);
        }),
    [projects, search]
  );

  const activeProjectId = useMemo(() => {
    if (projectId && pdplProjects.some((project) => project.id === projectId)) return projectId;
    return pdplProjects[0]?.id || null;
  }, [pdplProjects, projectId]);

  const currentProject = useMemo(() => {
    const found = projects.find((project) => project.id === activeProjectId && project.templateId === "pdpl-template");
    return found ? ensurePdplProject(found) : null;
  }, [projects, activeProjectId]);

  useEffect(() => {
    let active = true;

    const loadPdplProjects = async () => {
      setPdplProjectsLoading(true);
      try {
        const response = await fetch("/Auditing/api/pdpl/projects", { cache: "no-store" });
        const result = await readResponsePayload(response);
        if (!response.ok) {
          throw new Error(result.error || "Failed to load PDPL projects.");
        }
        if (!active) return;

        const remoteProjects = Array.isArray(result.projects) ? result.projects.map(mapPdplProjectCardToLocalProject) : [];
        setProjectSaveBaseline((current) => {
          const next = { ...current };
          remoteProjects.forEach((project) => {
            next[project.id] = createPdplSaveBaseline(project);
          });
          return next;
        });
        setProjects((current) => {
          const nonPdplProjects = current.filter((project) => project.templateId !== "pdpl-template");
          const unsavedPdplProjects = current.filter((project) => project.templateId === "pdpl-template" && !isPersistedProjectId(project.id));
          return [...nonPdplProjects, ...remoteProjects, ...unsavedPdplProjects];
        });
      } catch (error) {
        if (!active) return;
        showToast("error", error.message || "Failed to load PDPL projects.");
      } finally {
        if (active) setPdplProjectsLoading(false);
      }
    };

    loadPdplProjects();

    return () => {
      active = false;
    };
  }, [setProjects, showToast]);

  useEffect(() => {
    if (!currentProject || !isPersistedProjectId(currentProject.id) || currentProject.pdplLoadedFromDb) return;

    let active = true;

    const loadProjectDetails = async () => {
      setProjectDetailsLoading(true);
      try {
        const response = await fetch(`/Auditing/api/pdpl/projects/${currentProject.id}`, { cache: "no-store" });
        const result = await readResponsePayload(response);
        if (!response.ok) {
          throw new Error(result.error || "Failed to load PDPL project details.");
        }
        if (!active || !result.project) return;

        const detailedProject = mapPdplProjectDetailToLocalProject(result.project);
        setProjectSaveBaseline((current) => ({ ...current, [detailedProject.id]: createPdplSaveBaseline(detailedProject) }));
        setProjects((existing) => existing.map((project) => (project.id === detailedProject.id ? { ...project, ...detailedProject } : project)));
      } catch (error) {
        if (!active) return;
        showToast("error", error.message || "Failed to load PDPL project details.");
      } finally {
        if (active) setProjectDetailsLoading(false);
      }
    };

    loadProjectDetails();

    return () => {
      active = false;
    };
  }, [currentProject, setProjects, showToast]);

  useEffect(() => {
    if (!currentProject || !isPersistedProjectId(currentProject.id) || currentProject.pdplLoadedFromDb) {
      setProjectDetailsLoading(false);
    }
  }, [currentProject]);

  const currentProjectBaseline = currentProject ? projectSaveBaseline[currentProject.id] || null : null;
  const hasUnsavedProjectMetaChanges = currentProject ? !currentProjectBaseline || currentProjectBaseline.projectMeta !== buildPdplProjectMetaSignature(currentProject) : false;
  const sectionDirtyState = currentProject
    ? {
        gantt: !currentProjectBaseline || currentProjectBaseline.sections.gantt !== buildPdplSectionSignature(currentProject, "gantt"),
        controls: !currentProjectBaseline || currentProjectBaseline.sections.controls !== buildPdplSectionSignature(currentProject, "controls"),
        policies: !currentProjectBaseline || currentProjectBaseline.sections.policies !== buildPdplSectionSignature(currentProject, "policies"),
        documents: !currentProjectBaseline || currentProjectBaseline.sections.documents !== buildPdplSectionSignature(currentProject, "documents"),
      }
    : { gantt: false, controls: false, policies: false, documents: false };
  const hasAnyUnsavedChanges =
    Boolean(currentProject) &&
    (hasUnsavedProjectMetaChanges || Object.values(sectionDirtyState).some(Boolean) || !isPersistedProjectId(currentProject?.id));
  const isDrawerDirty = drawerState.open
    ? buildPdplDrawerSignature(drawerState.sectionKey, drawerValues) !== buildPdplDrawerSignature(drawerState.sectionKey, drawerInitialValues)
    : false;
  const showPdplSectionLoader =
    Boolean(currentProject) &&
    Boolean(projectDetailsLoading) &&
    isPersistedProjectId(currentProject?.id) &&
    !currentProject?.pdplLoadedFromDb &&
    section !== "overview";

  const sectionListKeyMap = {
    gantt: "ganttRows",
    controls: "controlRows",
    policies: "policyRows",
    documents: "documentRows",
    dashboard: "dashboardRows",
  };

  const currentProjectTeamOptions = useMemo(
    () =>
      (currentProject?.teamMemberIds || [])
        .map((memberId) => auditMembers.find((member) => String(member.id) === String(memberId)))
        .filter(Boolean)
        .map((member) => member.name),
    [currentProject, auditMembers]
  );

  const getMemberAssignOptions = (fallbackValue = "") =>
    Array.from(new Set([...currentProjectTeamOptions, ...normalizeMemberAssign(fallbackValue)].filter(Boolean)));

  const getDoneDisplayLabel = (row) => (row?.isDone ? "Done" : "Pending");

  const sectionFieldConfig = {
    gantt: [
      { key: "label", label: "Label" },
      { key: "taskName", label: "Task Name", type: "textarea" },
      { key: "indiaTeam", label: "Assign To India Team", type: "textarea" },
      { key: "ksaTeam", label: "KSA Team", type: "textarea" },
      { key: "memberAssign", label: "Member Assign", type: "memberSelect", options: getMemberAssignOptions(drawerValues.memberAssign) },
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "endDate", label: "End Date", type: "date" },
      { key: "isDone", label: "Done Mark", type: "checkbox" },
      { key: "doneMarkedOn", label: "Done Date", type: "date" },
      { key: "percentDone", label: "% Done", type: "number" },
      { key: "workDays", label: "Work Days", type: "number" },
      { key: "remaining", label: "Remaining", type: "number" },
      { key: "remark", label: "Remark", type: "textarea" },
    ],
    controls: [
      { key: "serialNo", label: "S.No" },
      { key: "category", label: "Category" },
      { key: "title", label: "Title", type: "textarea" },
      { key: "status", label: "Status", type: "select", options: CONTROL_STATUS_OPTIONS },
    ],
    policies: [
      { key: "serialNo", label: "S.No" },
      { key: "policyName", label: "Policy Name", type: "textarea" },
      { key: "status", label: "Status", type: "select", options: POLICY_STATUS_OPTIONS },
      { key: "documentStatus", label: "Documents", type: "select", options: DOCUMENT_STATUS_OPTIONS },
    ],
    documents: [
      { key: "serialNo", label: "S.No" },
      { key: "documentName", label: "Document Name", type: "textarea" },
      { key: "status", label: "Status", type: "select", options: EXECUTION_STATUS_OPTIONS },
      { key: "documentStatus", label: "Documents Status", type: "select", options: DOCUMENT_STATUS_OPTIONS },
    ],
  };

  const allControlRows = pdplProjects.flatMap((project) => project.pdplData?.controlRows || []);
  const allGanttRows = pdplProjects.flatMap((project) => project.pdplData?.ganttRows || []);
  const allPolicyRows = pdplProjects.flatMap((project) => project.pdplData?.policyRows || []);
  const allDocumentRows = pdplProjects.flatMap((project) => project.pdplData?.documentRows || []);

  const updateCurrentProject = (updater) => {
    if (!currentProject) return;
    setProjects((current) =>
      current.map((project) => {
        if (project.id !== currentProject.id) return project;
        const nextProject = typeof updater === "function" ? updater(ensurePdplProject(project)) : updater;
        return nextProject;
      })
    );
  };

  const openCreateProjectModal = () => {
    setProjectModalMode("create");
    setProjectModalProjectId(null);
    setProjectModalInitialValues({ ...emptyProjectForm });
    setProjectModalOpen(true);
  };

  const openEditProjectModal = (project = currentProject) => {
    if (!project) return;
    setProjectModalMode("edit");
    setProjectModalProjectId(project.id);
    setProjectModalInitialValues(toProjectFormValues(project));
    setProjectModalOpen(true);
  };

  const closeProjectModal = (force = false) => {
    if (projectModalSaving && !force) return;
    setProjectModalOpen(false);
    setProjectModalMode("create");
    setProjectModalProjectId(null);
    setProjectModalInitialValues({ ...emptyProjectForm });
  };

  const openDeleteProjectModal = (project) => {
    if (!project) return;
    setDeleteConfirmState({ open: true, projectId: project.id, projectName: project.name || "Untitled project" });
  };

  const closeDeleteProjectModal = () => {
    if (projectDeleting) return;
    setDeleteConfirmState({ open: false, projectId: null, projectName: "" });
  };

  const buildProjectRequestPayload = (project) => ({
    projectName: project?.name || "",
    projectLeader: project?.projectLeader || "",
    clientName: project?.clientName || "",
    projectStartDate: project?.start || "",
    projectEndDate: project?.end || "",
    projectLength: project?.projectLength ?? "",
    memberIds: Array.isArray(project?.teamMemberIds) ? project.teamMemberIds : [],
    status: project?.status || "active",
  });

  const resolveProjectMemberIdsByName = (project, names = []) => {
    const allowedIds = new Set((project?.teamMemberIds || []).map((memberId) => String(memberId)));
    const directory = (auditMembers || []).filter((member) => allowedIds.has(String(member.id)));
    const memberMap = directory.reduce((map, member) => {
      const key = String(member.name || "").trim().toLowerCase();
      if (key && !map.has(key)) map.set(key, member.id);
      return map;
    }, new Map());

    return normalizeMemberAssign(names)
      .map((name) => memberMap.get(String(name || "").trim().toLowerCase()))
      .filter(Boolean);
  };

  const serializeSectionRowsForSave = (project, sectionKey) => {
    const rows = project?.pdplData?.[sectionListKeyMap[sectionKey]] || [];

    if (sectionKey === "gantt") {
      return rows.map((row, index) => ({
        sortOrder: index,
        label: row.label || "",
        taskName: row.taskName || "",
        indiaTeam: row.indiaTeam || "",
        ksaTeam: row.ksaTeam || "",
        memberAssignEmployeeIds: resolveProjectMemberIdsByName(project, row.memberAssign),
        startDate: row.startDate || "",
        endDate: row.endDate || "",
        isDone: Boolean(row.isDone),
        doneMarkedOn: row.doneMarkedOn || "",
        percentDone: row.percentDone || 0,
        workDays: row.workDays || 0,
        remaining: row.remaining || 0,
        remark: row.remark || "",
      }));
    }

    if (sectionKey === "controls") {
      return rows.map((row, index) => ({
        sortOrder: index,
        serialNo: row.serialNo || "",
        category: row.category || "",
        title: row.title || "",
        status: row.status || "Not Started",
      }));
    }

    if (sectionKey === "policies") {
      return rows.map((row, index) => ({
        sortOrder: index,
        serialNo: row.serialNo || "",
        policyName: row.policyName || "",
        status: row.status || "Pending",
        documentStatus: row.documentStatus || "Not Received",
      }));
    }

    return rows.map((row, index) => ({
      sortOrder: index,
      serialNo: row.serialNo || "",
      documentName: row.documentName || "",
      status: row.status || "Incomplete",
      documentStatus: row.documentStatus || "Not Received",
    }));
  };

  const requestSaveConfirmation = (scope) => {
    setSaveConfirmState({ open: true, scope, verified: false });
  };

  const closeSaveConfirmation = () => {
    if (savingScope) return;
    setSaveConfirmState({ open: false, scope: "all", verified: false });
  };

  const saveProjectShellToDatabase = async (project) => {
    const payload = buildProjectRequestPayload(project);

    if (isPersistedProjectId(project.id)) {
      const response = await fetch(`/Auditing/api/pdpl/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result.error || "Failed to update PDPL project.");
      }
      return project.id;
    }

    const response = await fetch("/Auditing/api/pdpl/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await readResponsePayload(response);
    if (!response.ok) {
      throw new Error(result.error || "Failed to create PDPL project in database.");
    }

    const persistedProjectId = result.projectId;
    setProjects((current) => current.map((item) => (item.id === project.id ? { ...item, id: persistedProjectId } : item)));
    setProjectId(persistedProjectId);
    return persistedProjectId;
  };

  const savePdplSectionToDatabase = async (project, sectionKey, persistedProjectId) => {
    if (
      sectionKey === "documents" &&
      (project?.pdplData?.documentRows || []).some((row) => Array.isArray(row.attachments) && row.attachments.length > 0)
    ) {
      throw new Error("Document attachments are not included in section save yet. Save the document rows first, then upload attachments separately.");
    }

    const rows = serializeSectionRowsForSave(project, sectionKey);
    const response = await fetch(`/Auditing/api/pdpl/projects/${persistedProjectId}/sections/${sectionKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const result = await readResponsePayload(response);
    if (!response.ok) {
      throw new Error(result.error || `Failed to save ${SECTION_META[sectionKey]?.label || sectionKey}.`);
    }
    return result;
  };

  const serializePdplRowPayload = (project, sectionKey, row) => {
    if (sectionKey === "gantt") {
      return {
        label: row.label || "",
        taskName: row.taskName || "",
        indiaTeam: row.indiaTeam || "",
        ksaTeam: row.ksaTeam || "",
        memberAssignEmployeeIds: resolveProjectMemberIdsByName(project, row.memberAssign),
        startDate: row.startDate || "",
        endDate: row.endDate || "",
        isDone: Boolean(row.isDone),
        doneMarkedOn: row.doneMarkedOn || "",
        percentDone: row.percentDone || 0,
        workDays: row.workDays || 0,
        remaining: row.remaining || 0,
        remark: row.remark || "",
      };
    }

    if (sectionKey === "controls") {
      return {
        serialNo: row.serialNo || "",
        category: row.category || "",
        title: row.title || "",
        status: row.status || "Not Started",
      };
    }

    if (sectionKey === "policies") {
      return {
        serialNo: row.serialNo || "",
        policyName: row.policyName || "",
        status: row.status || "Pending",
        documentStatus: row.documentStatus || "Not Received",
      };
    }

    return {
      serialNo: row.serialNo || "",
      documentName: row.documentName || "",
      status: row.status || "Incomplete",
      documentStatus: row.documentStatus || "Not Received",
    };
  };

  const reloadPdplProjectFromDatabase = async (persistedProjectId, drawerSectionKey = "", drawerRowId = null) => {
    const response = await fetch(`/Auditing/api/pdpl/projects/${persistedProjectId}`, { cache: "no-store" });
    const result = await readResponsePayload(response);
    if (!response.ok) {
      throw new Error(result.error || "Failed to reload PDPL project.");
    }

    const detailedProject = mapPdplProjectDetailToLocalProject(result.project);
    setProjectSaveBaseline((current) => ({ ...current, [detailedProject.id]: createPdplSaveBaseline(detailedProject) }));
    setProjects((existing) => existing.map((project) => (project.id === detailedProject.id ? { ...project, ...detailedProject } : project)));
    setProjectId(detailedProject.id);

    if (drawerSectionKey && drawerRowId) {
      const listKey = sectionListKeyMap[drawerSectionKey];
      const reloadedRow = (detailedProject.pdplData[listKey] || []).find((item) => item.id === drawerRowId);
      if (reloadedRow) {
        const nextDrawerValues =
          drawerSectionKey === "gantt"
            ? {
                ...reloadedRow,
                memberAssign: normalizeMemberAssign(reloadedRow.memberAssign),
                isDone: Boolean(reloadedRow.isDone),
                doneMarkedOn: reloadedRow.doneMarkedOn || "",
              }
            : { ...reloadedRow };
        setDrawerState({ open: true, sectionKey: drawerSectionKey, key: drawerRowId });
        setDrawerValues(nextDrawerValues);
        setDrawerInitialValues(nextDrawerValues);
        return;
      }
    }

    closeDrawer();
  };

  const createProject = (form) => {
    if (!form.projectName || !form.clientName) {
      showToast("error", "Project name and client name are required.");
      return;
    }
    const newProject = {
      id: Date.now(),
      templateId: "pdpl-template",
      type: "pdpl",
      icon: "PDPL",
      status: "active",
      name: form.projectName,
      projectLeader: form.projectLeader,
      clientName: form.clientName,
      unit: form.clientName,
      start: form.start,
      end: form.end,
      projectLength: form.projectLength,
      teamMemberIds: form.teamMemberIds,
      desc: buildPdplDescription(form.clientName),
      procedures: [],
      pdplData: createEmptyPdplData(),
    };
    setProjects((current) => [newProject, ...current]);
    closeProjectModal();
    setProjectId(newProject.id);
    setNav("project");
    setSection("overview");
    showToast("success", "PDPL project created.");
  };

  const updateProjectDetails = async (targetProjectId, form) => {
    if (!targetProjectId) return;
    if (!form.projectName || !form.clientName) {
      showToast("error", "Project name and client name are required.");
      return;
    }

    const targetProject = projects.find((project) => project.id === targetProjectId && project.templateId === "pdpl-template");
    if (!targetProject) {
      showToast("error", "PDPL project not found.");
      return;
    }

    const applyLocalProjectMeta = (project) => ({
      ...project,
      name: form.projectName,
      projectLeader: form.projectLeader,
      clientName: form.clientName,
      unit: form.clientName,
      start: form.start,
      end: form.end,
      projectLength: form.projectLength,
      teamMemberIds: form.teamMemberIds,
      desc: !project.desc || project.desc.startsWith("PDPL audit workspace for ") ? buildPdplDescription(form.clientName) : project.desc,
    });

    if (!isPersistedProjectId(targetProjectId)) {
      setProjects((current) =>
        current.map((project) => {
          if (project.id !== targetProjectId) return project;
          return applyLocalProjectMeta(project);
        })
      );

      closeProjectModal(true);
      showToast("success", "PDPL project details updated.");
      return;
    }

    setProjectModalSaving(true);

    try {
      const response = await fetch(`/Auditing/api/pdpl/projects/${targetProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildProjectRequestPayload(
            applyLocalProjectMeta(ensurePdplProject(targetProject))
          )
        ),
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result.error || "Failed to update PDPL project.");
      }

      const savedProjectDetail = mapPdplProjectDetailToLocalProject(result.project);
      const mergedProject = ensurePdplProject({
        ...ensurePdplProject(targetProject),
        status: savedProjectDetail.status,
        name: savedProjectDetail.name,
        projectLeader: savedProjectDetail.projectLeader,
        clientName: savedProjectDetail.clientName,
        unit: savedProjectDetail.unit,
        start: savedProjectDetail.start,
        end: savedProjectDetail.end,
        projectLength: savedProjectDetail.projectLength,
        teamMemberIds: savedProjectDetail.teamMemberIds,
        members: savedProjectDetail.members,
        pdplLoadedFromDb: true,
      });

      setProjects((current) =>
        current.map((project) => {
          if (project.id !== targetProjectId) return project;
          const existingProject = ensurePdplProject(project);
          return {
            ...existingProject,
            status: mergedProject.status,
            name: mergedProject.name,
            projectLeader: mergedProject.projectLeader,
            clientName: mergedProject.clientName,
            unit: mergedProject.unit,
            start: mergedProject.start,
            end: mergedProject.end,
            projectLength: mergedProject.projectLength,
            teamMemberIds: mergedProject.teamMemberIds,
            members: mergedProject.members,
            pdplLoadedFromDb: true,
          };
        })
      );

      setProjectSaveBaseline((current) => {
        const existing = current[targetProjectId];
        if (!existing) {
          return { ...current, [targetProjectId]: createPdplSaveBaseline(mergedProject) };
        }
        return {
          ...current,
          [targetProjectId]: {
            ...existing,
            projectMeta: buildPdplProjectMetaSignature(mergedProject),
          },
        };
      });

      closeProjectModal(true);
      showToast("success", "PDPL project details saved.");
    } catch (error) {
      showToast("error", error.message || "Failed to update PDPL project.");
    } finally {
      setProjectModalSaving(false);
    }
  };

  const submitProjectModal = async (form) => {
    if (projectModalMode === "edit") {
      await updateProjectDetails(projectModalProjectId, form);
      return;
    }
    createProject(form);
  };

  const confirmDeleteProject = async () => {
    const targetProject = projects.find((project) => String(project.id) === String(deleteConfirmState.projectId) && project.templateId === "pdpl-template");
    if (!targetProject) {
      closeDeleteProjectModal();
      return;
    }

    setProjectDeleting(true);
    try {
      if (isPersistedProjectId(targetProject.id)) {
        const response = await fetch(`/Auditing/api/pdpl/projects/${targetProject.id}`, { method: "DELETE" });
        const result = await readResponsePayload(response);
        if (!response.ok) throw new Error(result.error || "Failed to delete PDPL project.");
      }

      setProjects((current) => current.filter((project) => !(String(project.id) === String(targetProject.id) && project.templateId === "pdpl-template")));
      setProjectSaveBaseline((current) => {
        const next = { ...current };
        delete next[targetProject.id];
        return next;
      });
      setProjectId((current) => (String(current) === String(targetProject.id) ? null : current));
      setNav("dashboard");
      setSection("overview");
      setDeleteConfirmState({ open: false, projectId: null, projectName: "" });
      showToast("success", `Project "${targetProject.name || "Untitled project"}" deleted.`);
    } catch (error) {
      showToast("error", error.message || "Failed to delete PDPL project.");
    } finally {
      setProjectDeleting(false);
    }
  };

  const performConfirmedSave = async () => {
    if (!currentProject) {
      showToast("error", "Select a PDPL project first.");
      return;
    }

    const scope = saveConfirmState.scope;
    setSavingScope(scope);

    try {
      const projectSnapshot = ensurePdplProject(currentProject);
      const persistedProjectId = await saveProjectShellToDatabase(projectSnapshot);

      if (scope === "all") {
        for (const sectionKey of PDPL_DB_SECTIONS) {
          await savePdplSectionToDatabase(projectSnapshot, sectionKey, persistedProjectId);
        }
        showToast("success", "All PDPL section data has been saved to the database.");
      } else {
        await savePdplSectionToDatabase(projectSnapshot, scope, persistedProjectId);
        showToast("success", `${SECTION_META[scope]?.label || scope} data has been saved to the database.`);
      }

      const savedProjectSnapshot = ensurePdplProject({ ...projectSnapshot, id: persistedProjectId, pdplLoadedFromDb: true });
      setProjectSaveBaseline((current) => {
        const next = { ...current, [persistedProjectId]: createPdplSaveBaseline(savedProjectSnapshot) };
        if (projectSnapshot.id !== persistedProjectId) delete next[projectSnapshot.id];
        return next;
      });
      setSaveConfirmState({ open: false, scope: "all", verified: false });
    } catch (error) {
      showToast("error", error.message || "Failed to save PDPL data.");
    } finally {
      setSavingScope(null);
    }
  };

  const applyImportedData = (importedData) => {
    updateCurrentProject((project) => ({
      ...project,
      pdplData: {
        ...project.pdplData,
        ...importedData,
      },
    }));
  };

  const addSectionRow = (sectionKey) => {
    updateCurrentProject((project) => {
      const pdplData = { ...project.pdplData };
      if (sectionKey === "gantt") {
        pdplData.ganttRows = [
          ...pdplData.ganttRows,
          {
            id: `gantt-${Date.now()}`,
            label: generateNextGanttLabel(pdplData.ganttRows),
            taskName: "",
            indiaTeam: "",
            ksaTeam: "",
            memberAssign: [],
            startDate: "",
            endDate: "",
            isDone: false,
            doneMarkedOn: "",
            percentDone: "0",
            workDays: "0",
            remaining: "100",
            remark: "",
          },
        ];
      }
      if (sectionKey === "controls") {
        pdplData.controlRows = [
          ...pdplData.controlRows,
          { id: `control-${Date.now()}`, serialNo: String(pdplData.controlRows.length + 1), category: "", title: "", status: "Not Started" },
        ];
      }
      if (sectionKey === "policies") {
        pdplData.policyRows = [
          ...pdplData.policyRows,
          { id: `policy-${Date.now()}`, serialNo: String(pdplData.policyRows.length + 1), policyName: "", status: "Pending", documentStatus: "Not Received" },
        ];
      }
      if (sectionKey === "documents") {
        pdplData.documentRows = [
          ...pdplData.documentRows,
          { id: `document-${Date.now()}`, serialNo: String(pdplData.documentRows.length + 1), documentName: "", status: "Incomplete", documentStatus: "Not Received", attachments: [] },
        ];
      }
      return { ...project, pdplData };
    });
  };

  const updateRowField = (sectionKey, rowId, field, value) => {
    updateCurrentProject((project) => {
      const keyMap = {
        gantt: "ganttRows",
        controls: "controlRows",
        policies: "policyRows",
        documents: "documentRows",
      };
      const listKey = keyMap[sectionKey];
      const nextRows = (project.pdplData[listKey] || []).map((row) => (row.id === rowId ? { ...row, [field]: value } : row));
      return {
        ...project,
        pdplData: {
          ...project.pdplData,
          [listKey]: nextRows,
        },
      };
    });
  };

  const openRowDrawer = (sectionKey, rowOrIndex) => {
    if (!currentProject) return;
    if (sectionKey === "dashboard") {
      const rows = currentProject.pdplData[sectionListKeyMap[sectionKey]] || [];
      const header = rows[0] || [];
      const row = rows[rowOrIndex] || [];
      const mapped = {};
      header.forEach((head, index) => {
        mapped[`col_${index}`] = cleanCell(row[index]);
      });
      setDrawerValues(mapped);
      setDrawerInitialValues(mapped);
      setDrawerState({ open: true, sectionKey, key: rowOrIndex });
      return;
    }
    const listKey = sectionListKeyMap[sectionKey];
    const row = (currentProject.pdplData[listKey] || []).find((item) => item.id === rowOrIndex);
    if (!row) return;
    const nextDrawerValues =
      sectionKey === "gantt"
        ? {
            ...row,
            memberAssign: normalizeMemberAssign(row.memberAssign),
            isDone: Boolean(row.isDone),
            doneMarkedOn: row.doneMarkedOn || "",
          }
        : { ...row };
    setDrawerValues(nextDrawerValues);
    setDrawerInitialValues(nextDrawerValues);
    setDrawerState({ open: true, sectionKey, key: rowOrIndex });
  };

  const closeDrawer = () => {
    setDrawerState({ open: false, sectionKey: "", key: null });
    setDrawerValues({});
    setDrawerInitialValues({});
  };

  const saveDrawer = async () => {
    if (!currentProject || !drawerState.open) return;
    const sectionKey = drawerState.sectionKey;
    if (sectionKey === "dashboard") {
      const listKey = sectionListKeyMap[sectionKey];
      updateCurrentProject((project) => {
        const rows = [...(project.pdplData[listKey] || [])];
        const header = rows[0] || [];
        rows[drawerState.key] = header.map((_, index) => drawerValues[`col_${index}`] || "");
        return { ...project, pdplData: { ...project.pdplData, [listKey]: rows } };
      });
      setDrawerInitialValues({ ...drawerValues });
      showToast("success", "Row changes applied. Use the top save button to sync them to the database.");
      return;
    }

    setDrawerSaving(true);
    try {
      const projectSnapshot = ensurePdplProject(currentProject);
      const persistedProjectId = await saveProjectShellToDatabase(projectSnapshot);

      const nextDrawerValues =
        sectionKey === "gantt"
          ? {
              ...drawerValues,
              memberAssign: normalizeMemberAssign(drawerValues.memberAssign),
              ...getDoneStateFromPercent(drawerValues.percentDone, drawerValues.doneMarkedOn),
              workDays: calculateWorkDays(drawerValues.startDate, drawerValues.endDate),
            }
          : sectionKey === "documents"
          ? {
              ...drawerValues,
              status: Array.isArray(drawerValues.attachments) && drawerValues.attachments.length ? "Complete" : drawerValues.status,
              documentStatus: Array.isArray(drawerValues.attachments) && drawerValues.attachments.length ? "Received" : drawerValues.documentStatus,
            }
          : { ...drawerValues };

      const payload = serializePdplRowPayload(projectSnapshot, sectionKey, nextDrawerValues);
      let persistedRowId = drawerState.key;

      if (isPersistedProjectId(String(drawerState.key))) {
        const response = await fetch(`/Auditing/api/pdpl/projects/${persistedProjectId}/sections/${sectionKey}/${drawerState.key}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await readResponsePayload(response);
        if (!response.ok) {
          throw new Error(result.error || `Failed to update ${SECTION_META[sectionKey]?.label || sectionKey} row.`);
        }
      } else {
        const response = await fetch(`/Auditing/api/pdpl/projects/${persistedProjectId}/sections/${sectionKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await readResponsePayload(response);
        if (!response.ok) {
          throw new Error(result.error || `Failed to create ${SECTION_META[sectionKey]?.label || sectionKey} row.`);
        }
        persistedRowId = result.rowId;
      }

      if (sectionKey === "documents") {
        const originalRow = (projectSnapshot.pdplData.documentRows || []).find((row) => row.id === drawerState.key) || { attachments: [] };
        const originalAttachments = Array.isArray(originalRow.attachments) ? originalRow.attachments : [];
        const currentAttachments = Array.isArray(nextDrawerValues.attachments) ? nextDrawerValues.attachments : [];
        const persistedAttachments = currentAttachments.filter((item) => !(item instanceof File));
        const newFiles = currentAttachments.filter((item) => item instanceof File);
        const removedAttachments = originalAttachments.filter(
          (attachment) => !persistedAttachments.some((item) => item.id && item.id === attachment.id)
        );

        for (const attachment of removedAttachments) {
          const response = await fetch(
            `/Auditing/api/pdpl/projects/${persistedProjectId}/documents/${persistedRowId}/attachments/${attachment.id}`,
            { method: "DELETE" }
          );
          const result = await readResponsePayload(response);
          if (!response.ok) {
            throw new Error(result.error || "Failed to delete PDPL attachment.");
          }
        }

        if (newFiles.length) {
          const formData = new FormData();
          newFiles.forEach((file) => formData.append("files", file));
          const response = await fetch(`/Auditing/api/pdpl/projects/${persistedProjectId}/documents/${persistedRowId}/attachments`, {
            method: "POST",
            body: formData,
          });
          const result = await readResponsePayload(response);
          if (!response.ok) {
            throw new Error(result.error || "Failed to upload PDPL attachments.");
          }
        }
      }

      await reloadPdplProjectFromDatabase(persistedProjectId, sectionKey, persistedRowId);
      showToast("success", "Row changes saved to the database.");
    } catch (error) {
      showToast("error", error.message || "Failed to save PDPL row.");
    } finally {
      setDrawerSaving(false);
    }
  };

  const deleteRow = (sectionKey, rowId) => {
    updateCurrentProject((project) => {
      const keyMap = {
        gantt: "ganttRows",
        controls: "controlRows",
        policies: "policyRows",
        documents: "documentRows",
      };
      const listKey = keyMap[sectionKey];
      return {
        ...project,
        pdplData: {
          ...project.pdplData,
          [listKey]: (project.pdplData[listKey] || []).filter((row) => row.id !== rowId),
        },
      };
    });
  };

  const deleteDrawerRow = async () => {
    if (!drawerState.open) return;
    if (drawerState.sectionKey === "dashboard") {
      const listKey = sectionListKeyMap[drawerState.sectionKey];
      updateCurrentProject((project) => {
        const rows = [...(project.pdplData[listKey] || [])];
        rows.splice(drawerState.key, 1);
        return { ...project, pdplData: { ...project.pdplData, [listKey]: rows } };
      });
      closeDrawer();
      return;
    }
    try {
      if (currentProject && isPersistedProjectId(currentProject.id) && isPersistedProjectId(String(drawerState.key))) {
        const response = await fetch(`/Auditing/api/pdpl/projects/${currentProject.id}/sections/${drawerState.sectionKey}/${drawerState.key}`, {
          method: "DELETE",
        });
        const result = await readResponsePayload(response);
        if (!response.ok) {
          throw new Error(result.error || "Failed to delete PDPL row.");
        }
        await reloadPdplProjectFromDatabase(currentProject.id);
      } else {
        deleteRow(drawerState.sectionKey, drawerState.key);
        closeDrawer();
      }
      showToast("success", "Row deleted.");
    } catch (error) {
      showToast("error", error.message || "Failed to delete PDPL row.");
    }
  };

  const downloadTextFile = (fileName, content, type = "text/csv;charset=utf-8;") => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const buildSectionCsv = (sectionKey) => {
    if (!currentProject) return "";
    if (sectionKey === "dashboard") {
      const rows = currentProject.pdplData[sectionListKeyMap[sectionKey]] || [];
      return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    }
    const fields = sectionFieldConfig[sectionKey] || [];
    const rows = currentProject.pdplData[sectionListKeyMap[sectionKey]] || [];
    const header = fields.map((field) => field.label);
    const body = rows.map((row) =>
      fields
        .map((field) => {
          const rawValue =
            field.key === "memberAssign"
              ? formatMemberAssign(row[field.key])
              : field.key === "isDone"
              ? getDoneDisplayLabel(row)
              : row[field.key];
          return `"${String(rawValue ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    return [header.join(","), ...body].join("\n");
  };

  const exportSectionCsv = (sectionKey) => {
    if (!currentProject) return;
    const fileName = `${currentProject.name.replace(/\s+/g, "_")}_${sectionKey}.csv`;
    downloadTextFile(fileName, buildSectionCsv(sectionKey));
  };

  const loadXlsxClient = async () => {
    if (window.XLSX) return window.XLSX;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load workbook library."));
      document.head.appendChild(script);
    });
    return window.XLSX;
  };

  const exportAllWorkbook = async () => {
    if (!currentProject) return;
    try {
      const XLSX = await loadXlsxClient();
      const workbook = XLSX.utils.book_new();
      const overviewRows = [
        ["Project Name", currentProject.name],
        ["Project Leader", currentProject.projectLeader || ""],
        ["Client Name", currentProject.clientName || ""],
        ["Project Start Date", currentProject.start || ""],
        ["Project End Date", currentProject.end || ""],
        ["Project Length", currentProject.projectLength ?? ""],
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(overviewRows), "Overview");

      Object.keys(sectionListKeyMap).forEach((sectionKey) => {
        const csv = buildSectionCsv(sectionKey);
        const rows = csv.split("\n").map((line) => line.split(",").map((cell) => cell.replace(/^"|"$/g, "").replace(/""/g, '"')));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), SECTION_META[sectionKey]?.label?.slice(0, 31) || sectionKey);
      });

      XLSX.writeFile(workbook, `${currentProject.name.replace(/\s+/g, "_")}_PDPL.xlsx`);
    } catch (error) {
      showToast("error", error.message || "Failed to export workbook.");
    }
  };

  const topHeader = (
    <div style={{ background: "#fff", borderBottom: `1px solid ${COLORS.border}`, padding: "18px 28px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,1fr) auto minmax(360px,1fr)", alignItems: "center", gap: 18 }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, color: COLORS.teal, letterSpacing: "-0.8px" }}>AuditFlow</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{selectedTemplate?.name || "PDPL Audit"}</div>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: COLORS.borderStrong }} />
            <div style={{ fontSize: 12.5, color: COLORS.textSoft }}>PDPL audit category workspace</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          {[
            ["dashboard", "Audit Categories"],
            ["project", "Dashboard"],
            ["team", "Team Members"],
          ].map(([value, label], index) => {
            const isActive = (index === 0 && nav === "dashboard") || (index === 1 && nav === "project") || (index === 2 && nav === "team");
            return (
              <button
                key={value}
                onClick={() => {
                  if (value === "dashboard") setNav("dashboard");
                  if (value === "project") setNav(currentProject ? "project" : "dashboard");
                  if (value === "team") setNav("team");
                }}
                style={{
                  border: `1px solid ${isActive ? COLORS.tealBorder : COLORS.borderStrong}`,
                  background: isActive ? COLORS.tealBg : "#fff",
                  color: isActive ? COLORS.teal : COLORS.textSoft,
                  borderRadius: 999,
                  padding: "9px 16px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${COLORS.borderStrong}`, borderRadius: 999, padding: "9px 14px", minWidth: 320 }}>
            <span style={{ color: COLORS.textMuted, fontSize: 12.5 }}>Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search PDPL projects..."
              style={{ border: "none", outline: "none", width: "100%", fontSize: 13, color: COLORS.text, background: "transparent" }}
            />
          </div>
          <button
            onClick={openCreateProjectModal}
            style={{
              border: "none",
              borderRadius: 14,
              padding: "12px 18px",
              background: COLORS.teal,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + Add PDPL Project
          </button>
        </div>
      </div>
    </div>
  );

  const renderStatusBadge = (value, accent = COLORS.teal) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 700,
        color: accent,
        background: `${accent}12`,
        border: `1px solid ${accent}33`,
      }}
    >
      {value}
    </span>
  );

  const formatPercentLabel = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0%";
    return `${Number.parseFloat(numeric.toFixed(2))}%`;
  };

  const renderRemainingBadge = (value) => {
    const numeric = Number(value);
    const label = formatPercentLabel(value);

    if (!Number.isFinite(numeric) || numeric <= 0) {
      return <span style={{ color: COLORS.textSoft }}>{label}</span>;
    }

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "5px 10px",
          borderRadius: 999,
          fontSize: 11.5,
          fontWeight: 700,
          color: COLORS.red,
          background: COLORS.redBg,
          border: `1px solid ${COLORS.redBorder}`,
        }}
      >
        {label}
      </span>
    );
  };

  const renderDashboard = () => (
    <div style={{ padding: "24px 28px 32px", overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button
          onClick={() => onBackToTemplates?.()}
          style={{ ...tableInputStyle, width: 140, cursor: "pointer" }}
        >
          Back Template
        </button>
      </div>

      {pdplProjectsLoading ? (
        <ProjectCardsSkeleton />
      ) : !pdplProjects.length ? (
        <EmptySection title="No PDPL project yet" note="Use Add PDPL Project to start the first PDPL audit workspace." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 18 }}>
          {pdplProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              members={auditMembers}
              onOpen={() => {
                setProjectId(project.id);
                setNav("project");
                setSection("overview");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderOverview = () => {
    if (!currentProject) {
      return <EmptySection title="Select a PDPL project" note="Choose one PDPL project from the dashboard to open PDPL sections." />;
    }
    const overviewRows = [
      ["Project Name", currentProject.name],
      ["Project Leader", currentProject.projectLeader || "-"],
      ["Client Name", currentProject.clientName || "-"],
      ["Project Start Date", currentProject.start || "-"],
      ["Project End Date", currentProject.end || "-"],
      ["Project Length", currentProject.projectLength ?? "-"],
      ["Assigned Team", `${currentProject.teamMemberIds?.length || 0} member(s)`],
      ["Workbook Import", currentProject.pdplData?.importMeta?.fileName || "Manual / not imported yet"],
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.text }}>Project Overview</div>
          <button
            onClick={() => openEditProjectModal(currentProject)}
            style={{ border: `1px solid ${COLORS.borderStrong}`, background: "#fff", color: COLORS.text, borderRadius: 10, padding: "9px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            Edit Details
          </button>
        </div>
        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 18, background: "#fff", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {overviewRows.map(([label, value], index) => (
                <tr key={label} style={{ background: index % 2 === 0 ? "#fff" : "#fbfdff" }}>
                  <td
                    style={{
                      width: "28%",
                      padding: "14px 18px",
                      borderBottom: `1px solid ${COLORS.border}`,
                      fontSize: 11.5,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      fontFamily: MONO,
                      fontWeight: 600,
                      verticalAlign: "top",
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      padding: "14px 18px",
                      borderBottom: `1px solid ${COLORS.border}`,
                      fontSize: 14,
                      color: COLORS.text,
                      fontWeight: 500,
                    }}
                  >
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderLiveDashboard = () => {
    if (!currentProject) return null;
    const rows = currentProject.pdplData.ganttRows || [];
    if (!rows.length) {
      return <EmptySection title="No Gantt data yet" note="Once Gantt tasks are added, the dashboard will update automatically with live project insights." />;
    }

    const completedTasks = rows.filter((row) => Boolean(row.isDone)).length;
    const avgProgress = Math.round(rows.reduce((sum, row) => sum + (Number(row.percentDone) || 0), 0) / rows.length);
    const totalWorkDays = rows.reduce((sum, row) => sum + (Number(row.workDays) || 0), 0);
    const avgRemaining = Math.round(rows.reduce((sum, row) => sum + (Number(row.remaining) || 0), 0) / rows.length);
    const teamBreakdown = rows.reduce((accumulator, row) => {
      const teams = normalizeMemberAssign(row.memberAssign);
      if (!teams.length) {
        accumulator.Unassigned = (accumulator.Unassigned || 0) + 1;
        return accumulator;
      }
      teams.forEach((team) => {
        accumulator[team] = (accumulator[team] || 0) + 1;
      });
      return accumulator;
    }, {});

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }}>
          <MetricCard label="Total Tasks" value={rows.length} note="Live total from Gantt tasks" accent={COLORS.teal} bg={COLORS.tealBg} border={COLORS.tealBorder} />
          <MetricCard label="Completed Tasks" value={completedTasks} note="Tasks marked done" accent={COLORS.green} bg={COLORS.greenBg} border={COLORS.greenBorder} />
          <MetricCard label="Avg % Done" value={`${avgProgress}%`} note="Average task completion" accent={COLORS.blue} bg={COLORS.blueBg} border={COLORS.blueBorder} />
          <MetricCard label="Avg Remaining %" value={`${avgRemaining}%`} note={`${totalWorkDays} total planned work days`} accent={COLORS.amber} bg={COLORS.amberBg} border={COLORS.amberBorder} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.text, marginBottom: 10 }}>Task Percentage</div>
            <SectionTable boxed={false} headers={["Task", "% Done", "Done", "Done Date", "Remaining %"]}>
              {rows.slice(0, 10).map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.text }}>{row.taskName || "-"}</td>
                  <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}` }}>{renderStatusBadge(`${row.percentDone || 0}%`, COLORS.blue)}</td>
                  <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
                    {renderStatusBadge(getDoneDisplayLabel(row), row.isDone ? COLORS.green : COLORS.amber)}
                  </td>
                  <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{row.doneMarkedOn || "-"}</td>
                  <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{renderRemainingBadge(row.remaining)}</td>
                </tr>
              ))}
            </SectionTable>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.text, marginBottom: 10 }}>% Done & Remaining %</div>
            <SectionTable boxed={false} headers={["Member", "Tasks", "Remaining %"]}>
              {Object.entries(teamBreakdown).map(([team, total]) => {
                const averageRemaining = rows
                  .filter((row) => {
                    const assigned = normalizeMemberAssign(row.memberAssign);
                    return team === "Unassigned" ? !assigned.length : assigned.includes(team);
                  })
                  .reduce((sum, row, _, filteredRows) => sum + ((Number(row.remaining) || 0) / Math.max(filteredRows.length, 1)), 0);
                return (
                  <tr key={team}>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.text }}>{team}</td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{total}</td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{renderRemainingBadge(Math.round(averageRemaining))}</td>
                  </tr>
                );
              })}
            </SectionTable>
          </div>
        </div>
      </div>
    );
  };

  const renderGantt = () => {
    if (!currentProject) return null;
    const rows = currentProject.pdplData.ganttRows || [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text }}>Gantt Chart</div>
            <div style={{ fontSize: 13, color: COLORS.textSoft, marginTop: 6 }}>Manage PDPL task planning, team allocation, dates, completion, and workday tracking.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => exportSectionCsv("gantt")} style={{ ...tableInputStyle, width: 110, cursor: "pointer" }}>Export CSV</button>
            <button onClick={() => addSectionRow("gantt")} style={{ border: "none", borderRadius: 10, padding: "9px 13px", background: COLORS.blue, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              + Add Gantt Row
            </button>
          </div>
        </div>
        {!rows.length ? (
          <EmptySection title="No Gantt rows yet" note="Upload the Gantt sheet from the workbook or add rows manually here." />
        ) : (
          <SectionTable boxed={false} headers={["Label", "Task Name", "Assign To India Team", "KSA Team", "Member Assign", "Start Date", "End Date", "Done", "Done Date", "% Done", "Work Days", "Remaining %", "Remark"]}>
            {rows.map((row) => (
              <tr key={row.id} onClick={() => openRowDrawer("gantt", row.id)} style={{ cursor: "pointer" }}>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{row.label || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 280, fontSize: 13, color: COLORS.text }}>{row.taskName || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{row.indiaTeam || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{row.ksaTeam || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{formatMemberAssign(row.memberAssign) || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{row.startDate || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{row.endDate || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}` }}>{renderStatusBadge(getDoneDisplayLabel(row), row.isDone ? COLORS.green : COLORS.amber)}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{row.doneMarkedOn || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}` }}>{renderStatusBadge(`${row.percentDone || 0}%`, COLORS.blue)}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.text }}>{row.workDays || "0"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.text }}>{renderRemainingBadge(row.remaining)}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 150, maxWidth: 180, fontSize: 12.5, color: COLORS.textSoft }}>{row.remark || "-"}</td>
              </tr>
            ))}
          </SectionTable>
        )}
      </div>
    );
  };

  const renderControls = () => {
    if (!currentProject) return null;
    const rows = currentProject.pdplData.controlRows || [];
    const pivot = buildControlPivot(rows);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text }}>Controls</div>
            <div style={{ fontSize: 13, color: COLORS.textSoft, marginTop: 6 }}>Track category-wise control items and open the pivot summary when needed.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setShowControlPivot(true)}
              style={{ border: `1px solid ${COLORS.borderStrong}`, borderRadius: 10, padding: "9px 13px", background: "#fff", color: COLORS.text, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
            >
              Show Pivot Table
            </button>
            <button onClick={() => exportSectionCsv("controls")} style={{ ...tableInputStyle, width: 110, cursor: "pointer" }}>Export CSV</button>
            <button onClick={() => addSectionRow("controls")} style={{ border: "none", borderRadius: 10, padding: "9px 13px", background: COLORS.teal, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              + Add Control Row
            </button>
          </div>
        </div>

        {!rows.length ? (
          <EmptySection title="No control rows yet" note="Upload the Controls sheet or add rows manually in this section." />
        ) : (
          <>
            <SectionTable boxed={false} headers={["S.No", "All Categories", "Title", "Status"]}>
              {rows.map((row) => (
                <tr key={row.id} onClick={() => openRowDrawer("controls", row.id)} style={{ cursor: "pointer" }}>
                  <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, width: 90, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{row.serialNo || "-"}</td>
                  <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 220, fontSize: 12.5, color: COLORS.textSoft }}>{row.category || "-"}</td>
                  <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 320, fontSize: 13, color: COLORS.text }}>{row.title || "-"}</td>
                  <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 180 }}>{renderStatusBadge(row.status || "Not Started", COLORS.teal)}</td>
                </tr>
              ))}
            </SectionTable>

            {showControlPivot && (
              <>
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.3)", zIndex: 1050 }} onClick={() => setShowControlPivot(false)} />
                <div style={{ position: "fixed", top: "8%", left: "50%", transform: "translateX(-50%)", width: "min(880px, 92vw)", maxHeight: "80vh", background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 20, boxShadow: "0 28px 80px rgba(15,23,42,0.18)", zIndex: 1051, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 20, borderBottom: `1px solid ${COLORS.border}` }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text }}>Pivot table</div>
                    <div style={{ fontSize: 12.5, color: COLORS.textSoft, marginTop: 5 }}>Live category summary based on the current Controls table.</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Pill bg={COLORS.tealBg} color={COLORS.teal} border={COLORS.tealBorder}>
                      {pivot.rows.length} categories
                    </Pill>
                    <button onClick={() => setShowControlPivot(false)} style={{ ...tableInputStyle, width: 38, height: 38, padding: 0, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>X</button>
                  </div>
                </div>
                <div style={{ padding: 20, overflowY: "auto" }}>
                  {!pivot.rows.length ? (
                    <div style={{ fontSize: 13, color: COLORS.textSoft }}>No category rows available to calculate the pivot table.</div>
                  ) : (
                    <SectionTable headers={["Category", "Completed", "In Progress", "Not Started", "Grand Total"]}>
                      {pivot.rows.map((row) => (
                        <tr key={row.category}>
                          <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{row.category}</td>
                          <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.text, textAlign: "center" }}>{row.Completed}</td>
                          <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.text, textAlign: "center" }}>{row["In Progress"]}</td>
                          <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.text, textAlign: "center" }}>{row["Not Started"]}</td>
                          <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, fontWeight: 700, color: COLORS.text, textAlign: "center" }}>{row.total}</td>
                        </tr>
                      ))}
                      <tr style={{ background: COLORS.grayBg }}>
                        <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, fontWeight: 800, color: COLORS.text }}>{pivot.totals.category}</td>
                        <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, fontWeight: 800, color: COLORS.text, textAlign: "center" }}>{pivot.totals.Completed}</td>
                        <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, fontWeight: 800, color: COLORS.text, textAlign: "center" }}>{pivot.totals["In Progress"]}</td>
                        <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, fontWeight: 800, color: COLORS.text, textAlign: "center" }}>{pivot.totals["Not Started"]}</td>
                        <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, fontWeight: 800, color: COLORS.text, textAlign: "center" }}>{pivot.totals.total}</td>
                      </tr>
                    </SectionTable>
                  )}
                </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  const renderPolicies = () => {
    if (!currentProject) return null;
    const rows = currentProject.pdplData.policyRows || [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text }}>Policies</div>
            <div style={{ fontSize: 13, color: COLORS.textSoft, marginTop: 6 }}>Maintain PDPL policy name, approval status, and document receipt tracking.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => exportSectionCsv("policies")} style={{ ...tableInputStyle, width: 110, cursor: "pointer" }}>Export CSV</button>
            <button onClick={() => addSectionRow("policies")} style={{ border: "none", borderRadius: 10, padding: "9px 13px", background: COLORS.amber, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              + Add Policy Row
            </button>
          </div>
        </div>
        {!rows.length ? (
          <EmptySection title="No policy rows yet" note="Upload the Policies sheet or start capturing policy rows manually." />
        ) : (
          <SectionTable boxed={false} headers={["S.No", "Policy Name", "Status", "Documents"]}>
            {rows.map((row) => (
              <tr key={row.id} onClick={() => openRowDrawer("policies", row.id)} style={{ cursor: "pointer" }}>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{row.serialNo || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 340, fontSize: 13, color: COLORS.text }}>{row.policyName || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 180 }}>{renderStatusBadge(row.status || "Pending", COLORS.amber)}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 180 }}>{renderStatusBadge(row.documentStatus || "Not Received", COLORS.teal)}</td>
              </tr>
            ))}
          </SectionTable>
        )}
      </div>
    );
  };

  const renderDocuments = () => {
    if (!currentProject) return null;
    const rows = currentProject.pdplData.documentRows || [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text }}>Documents</div>
            <div style={{ fontSize: 13, color: COLORS.textSoft, marginTop: 6 }}>Maintain required PDPL evidence, its completion status, and whether the document is received.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => exportSectionCsv("documents")} style={{ ...tableInputStyle, width: 110, cursor: "pointer" }}>Export CSV</button>
            <button onClick={() => addSectionRow("documents")} style={{ border: "none", borderRadius: 10, padding: "9px 13px", background: COLORS.green, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              + Add Document Row
            </button>
          </div>
        </div>
        {!rows.length ? (
          <EmptySection title="No document rows yet" note="Upload the Documents sheet or start entering rows manually." />
        ) : (
          <SectionTable boxed={false} headers={["S.No", "Documents Name", "Status", "Documents Status", "Attachments"]}>
            {rows.map((row) => (
              <tr key={row.id} onClick={() => openRowDrawer("documents", row.id)} style={{ cursor: "pointer" }}>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{row.serialNo || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 360, fontSize: 13, color: COLORS.text }}>{row.documentName || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 180 }}>{renderStatusBadge(row.status || "Incomplete", COLORS.green)}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 180 }}>{renderStatusBadge(row.documentStatus || "Not Received", COLORS.teal)}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 190 }}>
                  {Array.isArray(row.attachments) && row.attachments.length ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, width: "fit-content", padding: "6px 12px", borderRadius: 999, border: `1px solid ${COLORS.tealBorder}`, background: COLORS.tealBg, flexShrink: 0 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.tealDark }}>
                          {row.attachments.length} {row.attachments.length === 1 ? "file" : "files"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openRowDrawer("documents", row.id);
                        }}
                        style={{ border: "none", background: "transparent", color: COLORS.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 700, padding: 0, flexShrink: 0 }}
                      >
                        View
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12.5, color: COLORS.textSoft }}>No files</span>
                  )}
                </td>
              </tr>
            ))}
          </SectionTable>
        )}
      </div>
    );
  };

  const renderSheetPreview = (rows, label, sectionKey) => (
    rows?.length ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => exportSectionCsv(sectionKey)} style={{ ...tableInputStyle, width: 110, cursor: "pointer" }}>Export CSV</button>
        </div>
        <SectionTable boxed={false} headers={rows[0]?.slice(0, 8).map((header, index) => cleanCell(header) || `Column ${index + 1}`) || []}>
          {rows.slice(1, 9).map((row, index) => (
            <tr key={index} onClick={() => openRowDrawer(sectionKey, index + 1)} style={{ cursor: "pointer" }}>
              {row.slice(0, 8).map((cell, cellIndex) => (
                <td key={cellIndex} style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>
                  {cleanCell(cell) || "-"}
                </td>
              ))}
            </tr>
          ))}
        </SectionTable>
      </div>
    ) : (
      <EmptySection title={`No ${label} sheet loaded`} note={`Upload the workbook and map the ${label} sheet to preview it here.`} />
    )
  );

  const renderProjectView = () => {
    if (!currentProject) {
      return <EmptySection title="No PDPL project selected" note="Open a PDPL project from the dashboard to manage its sections." />;
    }
    const tabs = [
      ["overview", "Overview"],
      ["gantt", "Gantt Chart"],
      ["controls", "Controls"],
      ["policies", "Policies"],
      ["documents", "Documents"],
      ["dashboard", "Dashboard"],
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        <div style={{ padding: "14px 22px 0", borderBottom: `1px solid ${COLORS.border}`, background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <button
                onClick={() => setNav("dashboard")}
                style={{
                  border: `1px solid ${COLORS.borderStrong}`,
                  background: "#fff",
                  color: COLORS.textSoft,
                  borderRadius: 999,
                  padding: "8px 13px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  flexShrink: 0,
                  display: "none",
                }}
              >
                Back
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.teal }}>Project: {currentProject.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: COLORS.textSoft }}>
                  {[
                    currentProject.projectLeader ? `Leader: ${currentProject.projectLeader}` : "",
                    currentProject.clientName ? `Client: ${currentProject.clientName}` : "",
                    currentProject.start ? `Start Date: ${currentProject.start}` : "",
                    currentProject.end ? `End Date: ${currentProject.end}` : "",
                  ].filter(Boolean).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => requestSaveConfirmation("all")}
                disabled={Boolean(savingScope) || !hasAnyUnsavedChanges}
                style={{
                  border: hasAnyUnsavedChanges && !savingScope ? "none" : `1px solid ${COLORS.borderStrong}`,
                  background: hasAnyUnsavedChanges && !savingScope ? COLORS.teal : "#fff",
                  color: hasAnyUnsavedChanges && !savingScope ? "#fff" : COLORS.text,
                  borderRadius: 12,
                  padding: "9px 14px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: savingScope || !hasAnyUnsavedChanges ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: savingScope || !hasAnyUnsavedChanges ? 0.75 : 1,
                  boxShadow: hasAnyUnsavedChanges && !savingScope ? "0 10px 24px rgba(13,148,136,0.18)" : "none",
                }}
              >
                {savingScope === "all" ? "Saving Changes..." : hasAnyUnsavedChanges ? "Save Changes" : "Saved"}
              </button>
              <button onClick={() => openEditProjectModal(currentProject)} style={{ border: `1px solid ${COLORS.borderStrong}`, background: "#fff", color: COLORS.text, borderRadius: 12, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden="true">Edit</span>
                Details
              </button>
              <button onClick={() => openDeleteProjectModal(currentProject)} style={{ border: `1px solid ${COLORS.redBorder}`, background: COLORS.redBg, color: COLORS.red, borderRadius: 12, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden="true">Delete</span>
                Project
              </button>
              <button onClick={() => setImportOpen(true)} style={{ border: `1px solid ${COLORS.borderStrong}`, background: "#fff", color: COLORS.text, borderRadius: 12, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden="true">^</span>
                Import Workbook
              </button>
              <button onClick={exportAllWorkbook} style={{ border: `1px solid ${COLORS.borderStrong}`, background: "#fff", color: COLORS.text, borderRadius: 12, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden="true">v</span>
                Export All
              </button>
              <button onClick={() => setNav("dashboard")} style={{ border: `1px solid ${COLORS.borderStrong}`, background: "#fff", color: COLORS.textSoft, borderRadius: 12, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden="true">Back</span>
                Back
              </button>
            </div>
          </div>
          <div style={{ overflowX: "auto", scrollbarWidth: "thin" }}>
            <div style={{ display: "flex", alignItems: "center", minWidth: "max-content" }}>
            {tabs.map(([value, label]) => {
              const isActive = section === value;
              return (
                <button
                  key={value}
                  onClick={() => setSection(value)}
                  style={{
                    border: "none",
                    borderBottom: `2px solid ${isActive ? COLORS.teal : "transparent"}`,
                    background: "transparent",
                    color: isActive ? COLORS.teal : COLORS.textSoft,
                    padding: "12px 16px 13px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all .2s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              );
            })}
            </div>
          </div>
        </div>

        <div style={{ padding: "18px 22px 28px", overflowY: "auto", flex: 1 }}>
          {showPdplSectionLoader ? (
            <PdplSectionLoadingPanel title={`Loading ${SECTION_META[section]?.label || "project"} data`} />
          ) : (
            <>
              {section === "overview" && renderOverview()}
              {section === "gantt" && renderGantt()}
              {section === "controls" && renderControls()}
              {section === "policies" && renderPolicies()}
              {section === "documents" && renderDocuments()}
              {section === "dashboard" && renderLiveDashboard()}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderTeam = () => (
    <div style={{ padding: "24px 28px 32px", overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={() => setNav("dashboard")} style={{ border: `1px solid ${COLORS.borderStrong}`, background: "#fff", color: COLORS.textSoft, borderRadius: 999, padding: "8px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          Back
        </button>
        <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.text }}>Team Members</div>
      </div>
      <div style={{ fontSize: 13, color: COLORS.textSoft, marginBottom: 18 }}>
        Employees with auditing access from HRM are shown automatically here and can be assigned inside each PDPL project.
      </div>
      {!auditMembers.length ? (
        <EmptySection title="No auditing members available" note="Once HRM module access is granted for auditing, members will appear here automatically." />
      ) : (
        <SectionTable headers={["Employee", "Employee ID", "Designation", "Lifecycle"]}>
          {auditMembers.map((member) => (
            <tr key={member.id}>
              <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{member.name}</td>
              <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{member.employeeId || "-"}</td>
              <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{member.designation || member.role || "-"}</td>
              <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
                <Pill bg={COLORS.tealBg} color={COLORS.teal} border={COLORS.tealBorder}>
                  {member.status === "separated" ? "Separated" : member.stage === "notice_period" ? "Active - Notice" : member.stage === "probation" ? "Active - Probation" : member.status || "Active"}
                </Pill>
              </td>
            </tr>
          ))}
        </SectionTable>
      )}
    </div>
  );

  const drawerFields =
    drawerState.sectionKey === "dashboard"
      ? ((currentProject?.pdplData?.[sectionListKeyMap[drawerState.sectionKey]]?.[0] || []).map((header, index) => ({
          key: `col_${index}`,
          label: cleanCell(header) || `Column ${index + 1}`,
        })))
      : drawerState.sectionKey === "gantt"
      ? [
          { key: "label", label: "Label" },
          { key: "taskName", label: "Task Name", type: "textarea" },
          { key: "indiaTeam", label: "Assign To India Team", type: "textarea" },
          { key: "ksaTeam", label: "KSA Team", type: "textarea" },
          { key: "memberAssign", label: "Member Assign", type: "memberSelect", options: getMemberAssignOptions(drawerValues.memberAssign) },
          { key: "startDate", label: "Start Date", type: "date" },
          { key: "endDate", label: "End Date", type: "date" },
          { key: "isDone", label: "Done Mark", type: "checkbox" },
          { key: "doneMarkedOn", label: "Done Date", type: "date" },
          { key: "percentDone", label: "% Done", type: "number" },
          { key: "workDays", label: "Work Days", type: "number" },
          { key: "remaining", label: "Remaining", type: "number" },
          { key: "remark", label: "Remark", type: "textarea" },
        ]
      : drawerState.sectionKey === "documents"
      ? [
          { key: "serialNo", label: "S.No" },
          { key: "documentName", label: "Document Name", type: "textarea" },
          { key: "status", label: "Status", type: "select", options: EXECUTION_STATUS_OPTIONS },
          { key: "documentStatus", label: "Documents Status", type: "select", options: DOCUMENT_STATUS_OPTIONS },
          { key: "attachments", label: "Attach Documents", type: "files" },
        ]
      : sectionFieldConfig[drawerState.sectionKey] || [];

  const drawerTitle = drawerState.sectionKey ? `${SECTION_META[drawerState.sectionKey]?.label || drawerState.sectionKey} Details` : "";
  const drawerSubtitle =
    drawerState.sectionKey === "dashboard"
      ? "Review this imported workbook row. Apply row changes here, then use the top save button to sync them to the database."
      : "Review and edit this row here. Apply row changes first, then use the top save button to sync them to the database.";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {nav !== "project" && topHeader}
      {nav === "dashboard" && renderDashboard()}
      {nav === "project" && renderProjectView()}
      {nav === "team" && renderTeam()}

      <PdplProjectModal
        key={`${projectModalMode}-${projectModalProjectId || "new"}-${projectModalOpen ? "open" : "closed"}`}
        open={projectModalOpen}
        members={auditMembers}
        mode={projectModalMode}
        initialValues={projectModalInitialValues}
        onClose={closeProjectModal}
        onSubmit={submitProjectModal}
        submitting={projectModalSaving}
      />
      <ProjectDeleteConfirmationModal open={deleteConfirmState.open} projectName={deleteConfirmState.projectName} deleting={projectDeleting} onClose={closeDeleteProjectModal} onConfirm={confirmDeleteProject} />
      <SaveConfirmationModal
        open={saveConfirmState.open}
        title={saveConfirmState.scope === "all" ? "Save All PDPL Data" : `Save ${SECTION_META[saveConfirmState.scope]?.label || "Section"} Data`}
        note={
          saveConfirmState.scope === "all"
            ? "Have you verified that the workbook data and all section details are correct? This will save Gantt Chart, Controls, Policies, and Documents data to the database."
            : `Have you verified that the ${SECTION_META[saveConfirmState.scope]?.label || "selected"} data is correct? This will save that section to the database.`
        }
        verified={saveConfirmState.verified}
        saving={Boolean(savingScope)}
        onToggleVerified={(verified) => setSaveConfirmState((current) => ({ ...current, verified }))}
        onClose={closeSaveConfirmation}
        onConfirm={performConfirmedSave}
      />
      <ImportWorkbookModal open={importOpen} onClose={() => setImportOpen(false)} onApply={applyImportedData} showToast={showToast} />
      <PdplRowDrawer
        open={drawerState.open}
        title={drawerTitle}
        subtitle={drawerSubtitle}
        fields={drawerFields}
        values={drawerValues}
        showToast={showToast}
        onChange={(key, value) =>
          setDrawerValues((current) => {
            const next = { ...current, [key]: value };
            if (drawerState.sectionKey === "gantt") {
              if (key === "startDate" || key === "endDate") {
                next.workDays = calculateWorkDays(next.startDate, next.endDate);
              }
              if (key === "percentDone") {
                Object.assign(next, getDoneStateFromPercent(value, next.doneMarkedOn));
              }
              if (key === "isDone") {
                if (value) {
                  next.percentDone = "100";
                  Object.assign(next, getDoneStateFromPercent(100, next.doneMarkedOn));
                } else {
                  next.isDone = false;
                  next.doneMarkedOn = "";
                  next.remaining = calculateRemainingValue(next.percentDone);
                }
              }
            }
            return next;
          })
        }
        onClose={closeDrawer}
        onSave={saveDrawer}
        onDelete={deleteDrawerRow}
        saveDisabled={!isDrawerDirty || drawerSaving}
        saveLabel={drawerSaving ? "Saving..." : isDrawerDirty ? "Apply Changes" : "Applied"}
      />
    </div>
  );
}


