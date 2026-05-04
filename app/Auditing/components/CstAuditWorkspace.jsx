"use client";

import { useEffect, useMemo, useState } from "react";

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
  green: "#16a34a",
  greenBg: "#f0fdf4",
  greenBorder: "#bbf7d0",
  amber: "#d97706",
  amberBg: "#fffbeb",
  amberBorder: "#fde68a",
  red: "#dc2626",
  redBg: "#fef2f2",
  redBorder: "#fecaca",
  grayBg: "#f8fafc",
  violet: "#7c3aed",
  violetBg: "#f5f3ff",
  violetBorder: "#ddd6fe",
};

const MONO = "'IBM Plex Mono', 'Space Mono', monospace";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const GANTT_FIELDS = [
  { key: "label", label: "Level / Label" },
  { key: "taskName", label: "Task Name" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "memberAssign", label: "Member Assigned" },
  { key: "startDate", label: "Start Date" },
  { key: "endDate", label: "End Date" },
  { key: "isDone", label: "Done Mark" },
  { key: "doneMarkedOn", label: "Done Date" },
  { key: "percentDone", label: "% Done" },
  { key: "workDays", label: "No. of Work Days" },
  { key: "remaining", label: "Remaining" },
  { key: "remark", label: "Remark" },
];

const GANTT_IMPORT_FIELDS = [
  { key: "label", label: "Level / Label" },
  { key: "taskName", label: "Task Name" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "startDate", label: "Start Date" },
  { key: "endDate", label: "End Date" },
  { key: "percentDone", label: "% Done" },
  { key: "workDays", label: "No. of Work Days" },
  { key: "remaining", label: "Remaining" },
];

const COLUMN_ALIASES = {
  label: ["level", "label", "numbering"],
  taskName: ["task", "task name"],
  assignedTo: ["assigned to", "assign to", "assigned to india team", "assign to india team"],
  memberAssign: ["member assigned", "member assign", "assigned member", "team member"],
  startDate: ["start date", "starting date"],
  endDate: ["end date", "enddate"],
  percentDone: ["% done", "done", "percentage done"],
  workDays: ["# of work days", "no of work days", "work days", "number of work days"],
  remaining: ["remaining"],
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

function isPersistedProjectId(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function cleanCell(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
  const normalized = !hasPercentSymbol && text.includes(".") && numeric > 0 && numeric <= 1 ? numeric * 100 : numeric;
  return String(Number.parseFloat(normalized.toFixed(2)));
}

function normalizeMemberAssign(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => cleanCell(item)).filter(Boolean)));
  }
  const text = cleanCell(value);
  if (!text) return [];
  return Array.from(new Set(text.split(",").map((item) => cleanCell(item)).filter(Boolean)));
}

function formatMemberAssign(value) {
  const members = normalizeMemberAssign(value);
  return members.length ? members.join(", ") : "";
}

function calculateRemainingValue(percentDone) {
  const done = Math.max(0, Math.min(100, Number(percentDone) || 0));
  return String(Number.parseFloat((100 - done).toFixed(2)));
}

function calculateWorkDays(startDate, endDate) {
  if (!startDate || !endDate) return "0";
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return "0";
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
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

function createEmptyCstData() {
  return {
    ganttRows: [],
    importMeta: null,
  };
}

function ensureCstProject(project) {
  return {
    ...project,
    teamMemberIds: Array.isArray(project.teamMemberIds) ? project.teamMemberIds : [],
    cstData: {
      ...createEmptyCstData(),
      ...(project.cstData || {}),
    },
  };
}

function normalizeComparable(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeComparable(item));
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
        result[key] = normalizeComparable(value[key]);
        return result;
      }, {});
  }
  return value ?? "";
}

function buildProjectMetaSignature(project) {
  return JSON.stringify(
    normalizeComparable({
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

function buildGanttSectionSignature(project) {
  const rows = project?.cstData?.ganttRows || [];
  return JSON.stringify(
    normalizeComparable(
      rows.map((row, index) => ({
        sortOrder: index,
        label: row.label || "",
        taskName: row.taskName || "",
        assignedTo: row.assignedTo || "",
        memberAssign: normalizeMemberAssign(row.memberAssign).sort(),
        startDate: row.startDate || "",
        endDate: row.endDate || "",
        isDone: Boolean(row.isDone),
        doneMarkedOn: row.doneMarkedOn || "",
        percentDone: row.percentDone || 0,
        workDays: row.workDays || 0,
        remaining: row.remaining || 0,
        remark: row.remark || "",
        attachments: Array.isArray(row.attachments) ? row.attachments.map((item) => normalizeComparable(item)) : [],
      }))
    )
  );
}

function createSaveBaseline(project) {
  return {
    projectMeta: buildProjectMetaSignature(project),
    gantt: buildGanttSectionSignature(project),
  };
}

function buildDrawerSignature(values) {
  return JSON.stringify(
    normalizeComparable({
      ...values,
      memberAssign: normalizeMemberAssign(values.memberAssign).sort(),
      isDone: Boolean(values.isDone),
      attachments: Array.isArray(values.attachments) ? values.attachments.map((item) => normalizeComparable(item)) : [],
    })
  );
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
  anchor.download = file.fileName || file.name || "attachment";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function mapProjectCardToLocalProject(project) {
  return ensureCstProject({
    id: project.id,
    templateId: "cst-audit-template",
    type: "cst-audit",
    icon: "CST",
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
    members: Array.isArray(project.members) ? project.members : [],
    cstData: createEmptyCstData(),
    cstLoadedFromDb: false,
  });
}

function mapProjectDetailToLocalProject(project) {
  return ensureCstProject({
    id: project.id,
    templateId: "cst-audit-template",
    type: "cst-audit",
    icon: "CST",
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
    cstData: {
      ...createEmptyCstData(),
      ganttRows: project.sections?.gantt || [],
    },
    cstLoadedFromDb: true,
  });
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
      <div style={{ fontSize: 11, color: accent, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 12 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12.5, color: COLORS.textSoft, marginTop: 12, lineHeight: 1.6 }}>{note}</div>
    </div>
  );
}

function SectionTable({ headers, children }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 18, overflow: "hidden" }}>
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

function EmptySection({ title, note }) {
  return (
    <div style={{ background: "#fff", border: `1px dashed ${COLORS.borderStrong}`, borderRadius: 18, padding: "30px 22px", textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: COLORS.textSoft }}>{note}</div>
    </div>
  );
}

function StatusPill({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 700,
        background: COLORS.tealBg,
        color: COLORS.teal,
        border: `1px solid ${COLORS.tealBorder}`,
      }}
    >
      {children}
    </span>
  );
}

function renderStatusBadge(value, accent = COLORS.teal) {
  return (
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
}

function formatPercentLabel(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0%";
  return `${Number.parseFloat(numeric.toFixed(2))}%`;
}

function renderRemainingBadge(value) {
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
}

function CstProjectCard({ project, members, onOpen }) {
  const progress = project.progressPercent ?? 0;
  const assignedMembers = project.teamMemberIds?.slice(0, 4) || [];
  const stepCount = project.cstData?.ganttRows?.length || project.ganttCount || 0;

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
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-3px)";
        event.currentTarget.style.boxShadow = "0 18px 38px rgba(15,23,42,0.1)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "none";
        event.currentTarget.style.boxShadow = "0 14px 34px rgba(15,23,42,0.06)";
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
            boxShadow: "0 10px 24px rgba(13,148,136,0.08)",
            flexShrink: 0,
          }}
        >
          CST
        </div>
        <StatusPill>{project.status === "active" ? "Active" : project.status || "Draft"}</StatusPill>
      </div>

      <div style={{ fontSize: 12.5, color: COLORS.teal, textTransform: "uppercase", letterSpacing: "2px", fontFamily: MONO }}>
        CST Project
      </div>

      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, lineHeight: 1.3 }}>{project.name}</div>
      <div style={{ fontSize: 14, color: COLORS.textSoft, lineHeight: 1.75 }}>
        {`Execution workspace for ${project.clientName || "this client"} with Gantt tracking, member assignment, uploads, and dashboard progress.`}
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
                    background: [COLORS.tealDark, COLORS.amber, COLORS.blue, COLORS.violet][index % 4],
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

function CstRowDrawer({
  open,
  values,
  memberOptions,
  saving,
  saveDisabled,
  onChange,
  onClose,
  onSave,
  onDelete,
}) {
  if (!open) return null;

  const files = Array.isArray(values.attachments) ? values.attachments : [];
  const selectedMembers = normalizeMemberAssign(values.memberAssign);

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.26)", zIndex: 1200 }} onClick={onClose} />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "min(560px, 92vw)",
          height: "100vh",
          background: "#fff",
          borderLeft: `1px solid ${COLORS.border}`,
          boxShadow: "-18px 0 45px rgba(15,23,42,0.12)",
          zIndex: 1201,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "20px 22px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: COLORS.text }}>Gantt Task Details</div>
            <div style={{ fontSize: 12.5, color: COLORS.textSoft, marginTop: 6 }}>Apply changes here to save this CST row and its attachments to the database.</div>
          </div>
          <button onClick={onClose} style={{ ...tableInputStyle, width: 38, height: 38, padding: 0, cursor: "pointer" }}>x</button>
        </div>

        <div style={{ padding: 22, overflowY: "auto", display: "grid", gap: 14, flex: 1 }}>
          <DrawerField label="Label">
            <input value={values.label || ""} onChange={(event) => onChange("label", event.target.value)} style={tableInputStyle} />
          </DrawerField>
          <DrawerField label="Task Name">
            <textarea value={values.taskName || ""} onChange={(event) => onChange("taskName", event.target.value)} rows={4} style={{ ...tableInputStyle, resize: "vertical" }} />
          </DrawerField>
          <DrawerField label="Assigned To">
            <textarea value={values.assignedTo || ""} onChange={(event) => onChange("assignedTo", event.target.value)} rows={3} style={{ ...tableInputStyle, resize: "vertical" }} />
          </DrawerField>
          <DrawerField label="Member Assigned">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 34 }}>
                {selectedMembers.length ? (
                  selectedMembers.map((member) => (
                    <span key={member} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 999, border: `1px solid ${COLORS.tealBorder}`, background: COLORS.tealBg, color: COLORS.tealDark, fontSize: 12.5, fontWeight: 700 }}>
                      {member}
                      <button type="button" onClick={() => onChange("memberAssign", selectedMembers.filter((item) => item !== member))} style={{ border: "none", background: "transparent", color: COLORS.tealDark, cursor: "pointer", fontSize: 12, padding: 0 }}>
                        x
                      </button>
                    </span>
                  ))
                ) : (
                  <div style={{ fontSize: 12.5, color: COLORS.textMuted }}>None selected</div>
                )}
              </div>
              <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", maxHeight: 180, overflowY: "auto" }}>
                {memberOptions.length ? (
                  memberOptions.map((option) => {
                    const checked = selectedMembers.includes(option);
                    return (
                      <label key={option} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", background: checked ? COLORS.tealBg : "#fff" }}>
                        <span style={{ fontSize: 13, color: COLORS.text, fontWeight: checked ? 700 : 500 }}>{option}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onChange("memberAssign", checked ? selectedMembers.filter((item) => item !== option) : [...selectedMembers, option])}
                        />
                      </label>
                    );
                  })
                ) : (
                  <div style={{ padding: "12px", fontSize: 12.5, color: COLORS.textMuted }}>No project members available</div>
                )}
              </div>
            </div>
          </DrawerField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DrawerField label="Start Date">
              <input type="date" value={values.startDate || ""} onChange={(event) => onChange("startDate", event.target.value)} style={tableInputStyle} />
            </DrawerField>
            <DrawerField label="End Date">
              <input type="date" value={values.endDate || ""} onChange={(event) => onChange("endDate", event.target.value)} style={tableInputStyle} />
            </DrawerField>
          </div>
          <DrawerField label="Done Mark">
            <label style={{ display: "inline-flex", alignItems: "center", gap: 10, minHeight: 44, padding: "10px 12px", border: `1px solid ${COLORS.border}`, borderRadius: 12, background: Boolean(values.isDone) ? COLORS.greenBg : "#fff", color: COLORS.text }}>
              <input type="checkbox" checked={Boolean(values.isDone)} onChange={(event) => onChange("isDone", event.target.checked)} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{Boolean(values.isDone) ? "Marked Done" : "Not Done"}</span>
            </label>
          </DrawerField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <DrawerField label="Done Date">
              <input type="date" value={values.doneMarkedOn || ""} onChange={(event) => onChange("doneMarkedOn", event.target.value)} style={tableInputStyle} />
            </DrawerField>
            <DrawerField label="% Done">
              <input type="number" value={values.percentDone || ""} onChange={(event) => onChange("percentDone", event.target.value)} style={tableInputStyle} />
            </DrawerField>
            <DrawerField label="Work Days">
              <input type="number" value={values.workDays || ""} readOnly style={{ ...tableInputStyle, background: COLORS.grayBg }} />
            </DrawerField>
          </div>
          <DrawerField label="Remaining">
            <input type="number" value={values.remaining || ""} readOnly style={{ ...tableInputStyle, background: COLORS.grayBg }} />
          </DrawerField>
          <DrawerField label="Remark">
            <textarea value={values.remark || ""} onChange={(event) => onChange("remark", event.target.value)} rows={4} style={{ ...tableInputStyle, resize: "vertical" }} />
          </DrawerField>
          <DrawerField label="Attach Documents">
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ border: `1px dashed ${COLORS.borderStrong}`, borderRadius: 14, padding: "14px 16px", cursor: "pointer", background: COLORS.grayBg, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center", fontSize: 12.5, color: COLORS.textSoft }}>
                <span style={{ fontWeight: 700, color: COLORS.text }}>Upload documents</span>
                <input
                  type="file"
                  multiple
                  onChange={(event) => {
                    const nextFiles = Array.from(event.target.files || []);
                    onChange("attachments", [...files, ...nextFiles]);
                    event.target.value = "";
                  }}
                  style={{ display: "none" }}
                />
              </label>
              {!!files.length && (
                <div style={{ display: "grid", gap: 8 }}>
                  {files.map((file, index) => (
                    <div key={`${file.storagePath || file.name}-${index}`} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, padding: "9px 10px", border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.fileName || file.name}</div>
                        <div style={{ fontSize: 11.5, color: COLORS.textSoft, marginTop: 2 }}>{file.mimeType || file.type || "File"}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <button type="button" onClick={() => openAttachmentFile(file)} style={{ border: "none", background: "transparent", color: COLORS.teal, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>View</button>
                        <button type="button" onClick={() => downloadAttachmentFile(file)} style={{ border: "none", background: "transparent", color: COLORS.textSoft, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Download</button>
                        <button type="button" onClick={() => onChange("attachments", files.filter((_, currentIndex) => currentIndex !== index))} style={{ border: "none", background: "transparent", color: COLORS.red, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DrawerField>
        </div>

        <div style={{ padding: "16px 22px 20px", borderTop: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <button onClick={onDelete} style={{ ...tableInputStyle, width: 110, cursor: "pointer", color: COLORS.red, borderColor: COLORS.redBorder }}>Delete</button>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ ...tableInputStyle, width: 110, cursor: "pointer" }}>Cancel</button>
            <button onClick={onSave} disabled={saveDisabled || saving} style={{ border: "none", borderRadius: 12, padding: "10px 18px", background: saveDisabled || saving ? COLORS.borderStrong : COLORS.teal, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saveDisabled || saving ? "not-allowed" : "pointer", opacity: saveDisabled || saving ? 0.85 : 1 }}>
              {saving ? "Saving..." : saveDisabled ? "Applied" : "Apply Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
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

  const detectHeaderMeta = (rows) => {
    let best = { score: -1, index: 0, values: [] };
    rows.slice(0, 20).forEach((row, index) => {
      const values = row.map((cell) => cleanCell(cell));
      let score = 0;
      GANTT_IMPORT_FIELDS.forEach((field) => {
        const expectedAliases = COLUMN_ALIASES[field.key] || [];
        if (values.some((value) => expectedAliases.some((alias) => normalizeKey(value) === normalizeKey(alias)))) {
          score += 1;
        }
      });
      if (score > best.score) {
        best = { score, index, values };
      }
    });

    const fallbackValues = Array.isArray(rows?.[0]) ? rows[0].map((cell) => cleanCell(cell)) : [];
    const headerValues = (best.values || []).length ? best.values : fallbackValues;
    const headers = headerValues.map((value, index) => ({ index, label: value || `Column ${index + 1}` }));
    const fieldMapping = {};
    GANTT_IMPORT_FIELDS.forEach((field) => {
      const aliases = COLUMN_ALIASES[field.key] || [];
      const match = headers.find((header) => aliases.some((alias) => normalizeKey(header.label) === normalizeKey(alias)));
      fieldMapping[field.key] = match ? match.index : "";
    });

    return { headerIndex: best.index || 0, headers, fieldMapping };
  };

  const parseRows = (rows, headerIndex, fieldMapping) =>
    rows
      .slice(headerIndex + 1)
      .filter((row) => row.some((cell) => cleanCell(cell)))
      .map((row, index) => {
        const readValue = (key) => {
          const columnIndex = fieldMapping[key];
          if (columnIndex === "" || columnIndex === null || columnIndex === undefined) return "";
          return row[columnIndex];
        };

        const startDate = normalizeDateValue(readValue("startDate"));
        const endDate = normalizeDateValue(readValue("endDate"));
        const percentDone = normalizePercentDoneString(readValue("percentDone")) || "0";
        const doneState = getDoneStateFromPercent(percentDone);

        return {
          id: `gantt-${Date.now()}-${index}`,
          label: cleanCell(readValue("label")) || `${index + 1}.1.1`,
          taskName: cleanCell(readValue("taskName")),
          assignedTo: cleanCell(readValue("assignedTo")),
          memberAssign: normalizeMemberAssign(readValue("memberAssign")),
          startDate,
          endDate,
          isDone: doneState.isDone,
          doneMarkedOn: doneState.doneMarkedOn,
          percentDone,
          workDays: calculateWorkDays(startDate, endDate),
          remaining: doneState.remaining,
          remark: "",
          attachments: [],
        };
      })
      .filter((row) => row.taskName);

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

  const autoSelectSection = (sheetName) => {
    const name = normalizeKey(sheetName);
    if (name.includes("gantt")) return "gantt";
    if (name.includes("cst")) return "gantt";
    return "";
  };

  const readWorkbookFile = async (file) => {
    if (!file) return;
    try {
      setLoading(true);
      setError("");
      setDragActive(false);
      const XLSX = await loadXlsxClient();
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheets = workbook.SheetNames.map((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", blankrows: false, raw: true });
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
        if (!currentSheet) return;
        nextColumnMapping[section] = detectHeaderMeta(currentSheet.rows);
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
    if (sheet) {
      setColumnMapping((current) => ({ ...current, [section]: detectHeaderMeta(sheet.rows) }));
    }
  };

  const applyImport = () => {
    if (!workbookData) {
      setError("Upload a workbook first.");
      return;
    }

    const ganttSheetName = sheetMapping.gantt;
    if (!ganttSheetName) {
      setError("Map a workbook sheet to the Gantt section before applying.");
      return;
    }

    const sheet = workbookData.sheets.find((item) => item.name === ganttSheetName);
    if (!sheet) {
      setError("The mapped Gantt sheet could not be found.");
      return;
    }

    const meta = columnMapping.gantt || detectHeaderMeta(sheet.rows);
    const ganttRows = parseRows(sheet.rows, meta.headerIndex, meta.fieldMapping);
    onApply({
      ganttRows,
      importMeta: {
        fileName: workbookData.fileName,
        importedAt: new Date().toISOString(),
        sheetMapping: { gantt: ganttSheetName },
      },
    });
    showToast("success", `${ganttRows.length} CST Gantt rows imported.`);
    onClose();
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1100 }} onClick={onClose} />
      <div
        style={{
          position: "fixed",
          inset: "8% 10%",
          background: "#fff",
          borderRadius: 24,
          border: `1px solid ${COLORS.border}`,
          zIndex: 1101,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 28px 80px rgba(15,23,42,0.18)",
        }}
      >
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>Import CST Workbook</div>
            <div style={{ fontSize: 13, color: COLORS.textSoft, marginTop: 6 }}>
              Upload one workbook and map the correct sheet and columns into the CST Gantt section.
            </div>
          </div>
          <button onClick={onClose} style={{ ...tableInputStyle, width: 42, height: 42, padding: 0, cursor: "pointer" }}>x</button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ background: COLORS.tealBg, border: `1px solid ${COLORS.tealBorder}`, borderRadius: 18, padding: 20 }}>
                <label
                  style={{
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
                  }}
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
                      <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text }}>Upload CST workbook</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <StatusPill>.xlsx</StatusPill>
                        <StatusPill>.xls</StatusPill>
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.6, color: COLORS.textSoft }}>
                      Drop the workbook here or click to browse. We will auto-detect the best sheet for CST Gantt and let you remap columns before apply.
                    </div>
                  </div>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
                </label>
                {loading && <div style={{ fontSize: 12.5, color: COLORS.textSoft, marginTop: 14 }}>Reading workbook and preparing sheet mapping...</div>}
                {workbookData && <div style={{ fontSize: 12.5, color: COLORS.teal, marginTop: 14, fontWeight: 700 }}>{workbookData.fileName}</div>}
                {error && <div style={{ marginTop: 14, fontSize: 12.5, color: COLORS.red }}>{error}</div>}
              </div>

              {workbookData && (
                <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 18 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>Sheet mapping</div>
                  <div style={{ border: `1px solid ${COLORS.blueBorder}`, background: COLORS.blueBg, borderRadius: 16, padding: 14 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.blue, marginBottom: 8 }}>Gantt Chart</div>
                    <select
                      value={sheetMapping.gantt || ""}
                      onChange={(event) => updateSheetForSection("gantt", event.target.value)}
                      style={{ ...tableInputStyle, borderColor: COLORS.blueBorder }}
                    >
                      <option value="">Not mapped</option>
                      {workbookData.sheets.map((sheet) => (
                        <option key={sheet.name} value={sheet.name}>
                          {sheet.name}
                        </option>
                      ))}
                    </select>
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
                          "The workbook sheet will be auto-matched to the CST Gantt section.",
                          "You can manually change the selected sheet before import.",
                          "Every CST Gantt column can be remapped before you apply the import.",
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
                ) : sheetMapping.gantt && columnMapping.gantt ? (
                  <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>
                      Gantt Chart - {sheetMapping.gantt}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                      {GANTT_IMPORT_FIELDS.map((field) => (
                        <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <span style={{ fontSize: 11.5, color: COLORS.textSoft }}>{field.label}</span>
                          <select
                            value={columnMapping.gantt.fieldMapping[field.key]}
                            onChange={(event) =>
                              setColumnMapping((current) => ({
                                ...current,
                                gantt: {
                                  ...current.gantt,
                                  fieldMapping: {
                                    ...current.gantt.fieldMapping,
                                    [field.key]: event.target.value === "" ? "" : Number(event.target.value),
                                  },
                                },
                              }))
                            }
                            style={tableInputStyle}
                          >
                            <option value="">Not mapped</option>
                            {(columnMapping.gantt.headers || []).map((header) => (
                              <option key={header.index} value={header.index}>
                                {header.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: COLORS.textSoft }}>Map a Gantt sheet to configure column mapping.</div>
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

function ProjectModal({ open, members, initialValues, mode, submitting, onClose, onSubmit }) {
  const [form, setForm] = useState(initialValues);

  if (!open) return null;

  const toggleMember = (memberId) => {
    setForm((current) => {
      const currentIds = Array.isArray(current.teamMemberIds) ? current.teamMemberIds : [];
      const exists = currentIds.some((id) => String(id) === String(memberId));
      return {
        ...current,
        teamMemberIds: exists ? currentIds.filter((id) => String(id) !== String(memberId)) : [...currentIds, memberId],
      };
    });
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.26)", zIndex: 1000 }} onClick={() => !submitting && onClose()} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(720px, 94vw)", background: "#fff", borderRadius: 22, border: `1px solid ${COLORS.border}`, boxShadow: "0 24px 60px rgba(15,23,42,0.16)", zIndex: 1001, overflow: "hidden" }}>
        <div style={{ padding: "20px 22px", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>{mode === "edit" ? "Edit CST Project" : "Create CST Project"}</div>
          <div style={{ fontSize: 13, color: COLORS.textSoft, marginTop: 6 }}>Project details and member access behave the same as the PDPL workflow.</div>
        </div>
        <div style={{ padding: 22, display: "grid", gap: 16, maxHeight: "70vh", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <DrawerField label="Project Name">
              <input value={form.projectName || ""} onChange={(event) => setForm((current) => ({ ...current, projectName: event.target.value }))} style={tableInputStyle} />
            </DrawerField>
            <DrawerField label="Client Name">
              <input value={form.clientName || ""} onChange={(event) => setForm((current) => ({ ...current, clientName: event.target.value }))} style={tableInputStyle} />
            </DrawerField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <DrawerField label="Project Leader">
              <input value={form.projectLeader || ""} onChange={(event) => setForm((current) => ({ ...current, projectLeader: event.target.value }))} style={tableInputStyle} />
            </DrawerField>
            <DrawerField label="Start Date">
              <input type="date" value={form.start || ""} onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))} style={tableInputStyle} />
            </DrawerField>
            <DrawerField label="End Date">
              <input type="date" value={form.end || ""} onChange={(event) => setForm((current) => ({ ...current, end: event.target.value }))} style={tableInputStyle} />
            </DrawerField>
          </div>
          <DrawerField label="Project Length">
            <input type="number" value={form.projectLength ?? ""} onChange={(event) => setForm((current) => ({ ...current, projectLength: event.target.value }))} style={tableInputStyle} />
          </DrawerField>
          <DrawerField label="Project Members">
            <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                {members.length ? (
                  members.map((member) => {
                    const checked = (form.teamMemberIds || []).some((id) => String(id) === String(member.id));
                    return (
                      <label key={member.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", background: checked ? COLORS.tealBg : "#fff" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{member.name}</div>
                          <div style={{ fontSize: 11.5, color: COLORS.textSoft, marginTop: 2 }}>{member.designation || member.role || member.employeeId || ""}</div>
                        </div>
                        <input type="checkbox" checked={checked} onChange={() => toggleMember(member.id)} />
                      </label>
                    );
                  })
                ) : (
                  <div style={{ padding: "12px", fontSize: 12.5, color: COLORS.textMuted }}>No auditing members available.</div>
                )}
              </div>
            </div>
          </DrawerField>
        </div>
        <div style={{ padding: "16px 22px 20px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => !submitting && onClose()} style={{ ...tableInputStyle, width: 110, cursor: submitting ? "not-allowed" : "pointer" }}>Cancel</button>
          <button onClick={() => onSubmit(form)} disabled={submitting} style={{ border: "none", borderRadius: 12, padding: "10px 18px", background: COLORS.teal, color: "#fff", fontSize: 13, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.8 : 1 }}>
            {submitting ? "Saving..." : mode === "edit" ? "Save Project" : "Create Project"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function CstAuditWorkspace({
  selectedTemplate,
  projects,
  setProjects,
  auditMembers,
  search,
  setSearch,
  showToast,
  onBackToTemplates,
}) {
  const [nav, setNav] = useState("dashboard");
  const [projectId, setProjectId] = useState(null);
  const [section, setSection] = useState("overview");
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState("create");
  const [projectModalProjectId, setProjectModalProjectId] = useState(null);
  const [projectModalInitialValues, setProjectModalInitialValues] = useState({
    projectName: "",
    projectLeader: "",
    clientName: "",
    start: "",
    end: "",
    projectLength: "",
    teamMemberIds: [],
  });
  const [projectModalSaving, setProjectModalSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [drawerState, setDrawerState] = useState({ open: false, rowId: null });
  const [drawerValues, setDrawerValues] = useState({});
  const [drawerInitialValues, setDrawerInitialValues] = useState({});
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [cstProjectsLoading, setCstProjectsLoading] = useState(true);
  const [projectDetailsLoading, setProjectDetailsLoading] = useState(false);
  const [projectSaveBaseline, setProjectSaveBaseline] = useState({});
  const [dashboardStats, setDashboardStats] = useState(null);

  const cstProjects = useMemo(
    () =>
      projects
        .filter((project) => project.templateId === "cst-audit-template")
        .map((project) => ensureCstProject(project))
        .filter((project) => {
          const query = search.toLowerCase();
          return !query || project.name.toLowerCase().includes(query) || (project.clientName || "").toLowerCase().includes(query);
        }),
    [projects, search]
  );

  const activeProjectId = useMemo(() => {
    if (projectId && cstProjects.some((project) => project.id === projectId)) return projectId;
    return cstProjects[0]?.id || null;
  }, [cstProjects, projectId]);

  const currentProject = useMemo(() => {
    const found = projects.find((project) => project.id === activeProjectId && project.templateId === "cst-audit-template");
    return found ? ensureCstProject(found) : null;
  }, [projects, activeProjectId]);

  useEffect(() => {
    let active = true;

    const loadProjects = async () => {
      setCstProjectsLoading(true);
      try {
        const response = await fetch("/Auditing/api/cst/projects", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to load CST projects.");
        }
        if (!active) return;

        const remoteProjects = Array.isArray(result.projects) ? result.projects.map(mapProjectCardToLocalProject) : [];
        setProjectSaveBaseline((current) => {
          const next = { ...current };
          remoteProjects.forEach((project) => {
            next[project.id] = createSaveBaseline(project);
          });
          return next;
        });
        setProjects((current) => {
          const nonCstProjects = current.filter((project) => project.templateId !== "cst-audit-template");
          const unsavedCstProjects = current.filter((project) => project.templateId === "cst-audit-template" && !isPersistedProjectId(project.id));
          return [...nonCstProjects, ...remoteProjects, ...unsavedCstProjects];
        });
      } catch (error) {
        if (!active) return;
        showToast("error", error.message || "Failed to load CST projects.");
      } finally {
        if (active) setCstProjectsLoading(false);
      }
    };

    loadProjects();
    return () => {
      active = false;
    };
  }, [setProjects, showToast]);

  useEffect(() => {
    if (!currentProject || !isPersistedProjectId(currentProject.id) || currentProject.cstLoadedFromDb) return;

    let active = true;

    const loadProjectDetails = async () => {
      setProjectDetailsLoading(true);
      try {
        const response = await fetch(`/Auditing/api/cst/projects/${currentProject.id}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to load CST project details.");
        }
        if (!active || !result.project) return;

        const detailedProject = mapProjectDetailToLocalProject(result.project);
        setProjectSaveBaseline((current) => ({ ...current, [detailedProject.id]: createSaveBaseline(detailedProject) }));
        setProjects((existing) => existing.map((project) => (project.id === detailedProject.id ? { ...project, ...detailedProject } : project)));
      } catch (error) {
        if (!active) return;
        showToast("error", error.message || "Failed to load CST project details.");
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
    if (!currentProject || !isPersistedProjectId(currentProject.id)) {
      setDashboardStats(null);
      return;
    }

    const loadDashboard = async () => {
      await refreshDashboard(currentProject.id);
    };

    loadDashboard();
  }, [currentProject, currentProject?.id]);

  const currentProjectBaseline = currentProject ? projectSaveBaseline[currentProject.id] || null : null;
  const hasUnsavedProjectMetaChanges = currentProject ? !currentProjectBaseline || currentProjectBaseline.projectMeta !== buildProjectMetaSignature(currentProject) : false;
  const hasUnsavedGanttChanges = currentProject ? !currentProjectBaseline || currentProjectBaseline.gantt !== buildGanttSectionSignature(currentProject) : false;
  const hasAnyUnsavedChanges = Boolean(currentProject) && (hasUnsavedProjectMetaChanges || hasUnsavedGanttChanges || !isPersistedProjectId(currentProject?.id));
  const isDrawerDirty = drawerState.open ? buildDrawerSignature(drawerValues) !== buildDrawerSignature(drawerInitialValues) : false;

  const currentProjectTeamOptions = useMemo(
    () =>
      (currentProject?.teamMemberIds || [])
        .map((memberId) => auditMembers.find((member) => String(member.id) === String(memberId)))
        .filter(Boolean)
        .map((member) => member.name),
    [currentProject, auditMembers]
  );

  const refreshDashboard = async (targetProjectId) => {
    if (!targetProjectId || !isPersistedProjectId(targetProjectId)) {
      setDashboardStats(null);
      return;
    }
    try {
      const response = await fetch(`/Auditing/api/cst/projects/${targetProjectId}/dashboard`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load CST dashboard.");
      setDashboardStats(result.dashboard || null);
    } catch (_error) {
      setDashboardStats(null);
    }
  };

  const updateCurrentProject = (updater) => {
    if (!currentProject) return;
    setProjects((current) =>
      current.map((project) => {
        if (project.id !== currentProject.id) return project;
        const nextProject = typeof updater === "function" ? updater(ensureCstProject(project)) : updater;
        return nextProject;
      })
    );
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

  const serializeGanttRowsForSave = (project) =>
    (project?.cstData?.ganttRows || []).map((row, index) => ({
      sortOrder: index,
      label: row.label || "",
      taskName: row.taskName || "",
      assignedTo: row.assignedTo || "",
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

  const saveProjectShellToDatabase = async (project) => {
    const payload = buildProjectRequestPayload(project);

    if (isPersistedProjectId(project.id)) {
      const response = await fetch(`/Auditing/api/cst/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update CST project.");
      return project.id;
    }

    const response = await fetch("/Auditing/api/cst/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to create CST project in database.");

    const persistedProjectId = result.projectId;
    setProjects((current) => current.map((item) => (item.id === project.id ? { ...item, id: persistedProjectId } : item)));
    setProjectId(persistedProjectId);
    return persistedProjectId;
  };

  const saveAllGanttRowsToDatabase = async () => {
    if (!currentProject) return;
    try {
      const projectSnapshot = ensureCstProject(currentProject);
      const persistedProjectId = await saveProjectShellToDatabase(projectSnapshot);
      const response = await fetch(`/Auditing/api/cst/projects/${persistedProjectId}/sections/gantt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: serializeGanttRowsForSave(projectSnapshot) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save CST Gantt rows.");

      const refreshedProject = ensureCstProject({ ...projectSnapshot, id: persistedProjectId, cstLoadedFromDb: true });
      setProjectSaveBaseline((current) => ({ ...current, [persistedProjectId]: createSaveBaseline(refreshedProject) }));
      await refreshDashboard(persistedProjectId);
      showToast("success", "CST project data has been saved to the database.");
    } catch (error) {
      showToast("error", error.message || "Failed to save CST project data.");
    }
  };

  const openCreateProjectModal = () => {
    setProjectModalMode("create");
    setProjectModalProjectId(null);
    setProjectModalInitialValues({
      projectName: "",
      projectLeader: "",
      clientName: "",
      start: "",
      end: "",
      projectLength: "",
      teamMemberIds: [],
    });
    setProjectModalOpen(true);
  };

  const openEditProjectModal = (project = currentProject) => {
    if (!project) return;
    setProjectModalMode("edit");
    setProjectModalProjectId(project.id);
    setProjectModalInitialValues({
      projectName: project.name || "",
      projectLeader: project.projectLeader || "",
      clientName: project.clientName || "",
      start: project.start || "",
      end: project.end || "",
      projectLength: project.projectLength ?? "",
      teamMemberIds: Array.isArray(project.teamMemberIds) ? project.teamMemberIds : [],
    });
    setProjectModalOpen(true);
  };

  const closeProjectModal = () => {
    if (projectModalSaving) return;
    setProjectModalOpen(false);
    setProjectModalProjectId(null);
  };

  const submitProjectModal = async (form) => {
    if (!form.projectName || !form.clientName || !form.projectLeader) {
      showToast("error", "Project name, client name, and project leader are required.");
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
    });

    if (projectModalMode === "create") {
      const newProject = ensureCstProject({
        id: Date.now(),
        templateId: "cst-audit-template",
        type: "cst-audit",
        icon: "CST",
        status: "active",
        name: form.projectName,
        projectLeader: form.projectLeader,
        clientName: form.clientName,
        unit: form.clientName,
        start: form.start,
        end: form.end,
        projectLength: form.projectLength,
        teamMemberIds: form.teamMemberIds,
        cstData: createEmptyCstData(),
      });
      setProjects((current) => [newProject, ...current]);
      setProjectId(newProject.id);
      setNav("project");
      setSection("overview");
      setProjectModalOpen(false);
      showToast("success", "CST project created.");
      return;
    }

    const targetProject = projects.find((project) => project.id === projectModalProjectId && project.templateId === "cst-audit-template");
    if (!targetProject) return;

    if (!isPersistedProjectId(targetProject.id)) {
      setProjects((current) => current.map((project) => (project.id === targetProject.id ? applyLocalProjectMeta(ensureCstProject(project)) : project)));
      setProjectModalOpen(false);
      showToast("success", "CST project details updated.");
      return;
    }

    setProjectModalSaving(true);
    try {
      const response = await fetch(`/Auditing/api/cst/projects/${targetProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildProjectRequestPayload(applyLocalProjectMeta(ensureCstProject(targetProject)))),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update CST project.");

      const savedProjectDetail = mapProjectDetailToLocalProject(result.project);
      setProjects((current) => current.map((project) => (project.id === targetProject.id ? { ...ensureCstProject(project), ...savedProjectDetail } : project)));
      setProjectSaveBaseline((current) => ({ ...current, [targetProject.id]: createSaveBaseline(savedProjectDetail) }));
      setProjectModalOpen(false);
      showToast("success", "CST project details saved.");
    } catch (error) {
      showToast("error", error.message || "Failed to update CST project.");
    } finally {
      setProjectModalSaving(false);
    }
  };

  const addSectionRow = () => {
    updateCurrentProject((project) => ({
      ...project,
      cstData: {
        ...project.cstData,
        ganttRows: [
          ...(project.cstData.ganttRows || []),
          {
            id: `gantt-${Date.now()}`,
            label: generateNextGanttLabel(project.cstData.ganttRows || []),
            taskName: "",
            assignedTo: "",
            memberAssign: [],
            startDate: "",
            endDate: "",
            isDone: false,
            doneMarkedOn: "",
            percentDone: "0",
            workDays: "0",
            remaining: "100",
            remark: "",
            attachments: [],
          },
        ],
      },
    }));
  };

  const openRowDrawer = (rowId) => {
    if (!currentProject) return;
    const row = (currentProject.cstData.ganttRows || []).find((item) => item.id === rowId);
    if (!row) return;
    const nextValues = {
      ...row,
      memberAssign: normalizeMemberAssign(row.memberAssign),
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
    };
    setDrawerValues(nextValues);
    setDrawerInitialValues(nextValues);
    setDrawerState({ open: true, rowId });
  };

  const closeDrawer = () => {
    setDrawerState({ open: false, rowId: null });
    setDrawerValues({});
    setDrawerInitialValues({});
    setDrawerSaving(false);
  };

  const syncLocalRow = (targetProjectId, targetRowId, nextRow) => {
    setProjects((current) =>
      current.map((project) => {
        if (project.id !== targetProjectId) return project;
        const ensured = ensureCstProject(project);
        return {
          ...ensured,
          cstData: {
            ...ensured.cstData,
            ganttRows: (ensured.cstData.ganttRows || []).map((row) => (row.id === targetRowId ? nextRow : row)),
          },
        };
      })
    );
  };

  const replaceLocalRowId = (targetProjectId, oldRowId, newRowId, nextRow) => {
    setProjects((current) =>
      current.map((project) => {
        if (project.id !== targetProjectId) return project;
        const ensured = ensureCstProject(project);
        return {
          ...ensured,
          cstData: {
            ...ensured.cstData,
            ganttRows: (ensured.cstData.ganttRows || []).map((row) => (row.id === oldRowId ? { ...nextRow, id: newRowId } : row)),
          },
        };
      })
    );
  };

  const saveDrawer = async () => {
    if (!currentProject || !drawerState.rowId) return;
    setDrawerSaving(true);
    try {
      const projectSnapshot = ensureCstProject(currentProject);
      const persistedProjectId = await saveProjectShellToDatabase(projectSnapshot);

      const normalizedRow = {
        ...drawerValues,
        memberAssign: normalizeMemberAssign(drawerValues.memberAssign),
        ...getDoneStateFromPercent(drawerValues.percentDone, drawerValues.doneMarkedOn),
        workDays: calculateWorkDays(drawerValues.startDate, drawerValues.endDate),
      };

      const payload = {
        label: normalizedRow.label || "",
        taskName: normalizedRow.taskName || "",
        assignedTo: normalizedRow.assignedTo || "",
        memberAssignEmployeeIds: resolveProjectMemberIdsByName(projectSnapshot, normalizedRow.memberAssign),
        startDate: normalizedRow.startDate || "",
        endDate: normalizedRow.endDate || "",
        isDone: Boolean(normalizedRow.isDone),
        doneMarkedOn: normalizedRow.doneMarkedOn || "",
        percentDone: normalizedRow.percentDone || 0,
        workDays: normalizedRow.workDays || 0,
        remaining: normalizedRow.remaining || 0,
        remark: normalizedRow.remark || "",
      };

      const existingRow = (projectSnapshot.cstData.ganttRows || []).find((row) => row.id === drawerState.rowId);
      const existingAttachments = Array.isArray(existingRow?.attachments) ? existingRow.attachments : [];
      const draftAttachments = Array.isArray(normalizedRow.attachments) ? normalizedRow.attachments : [];
      const persistedAttachments = draftAttachments.filter((item) => !(item instanceof File));
      const newFiles = draftAttachments.filter((item) => item instanceof File);
      const removedPersistedAttachments = existingAttachments.filter(
        (attachment) => !persistedAttachments.some((item) => item.id && attachment.id === item.id)
      );

      let rowId = drawerState.rowId;
      if (isPersistedProjectId(String(drawerState.rowId))) {
        const response = await fetch(`/Auditing/api/cst/projects/${persistedProjectId}/sections/gantt/${drawerState.rowId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to save CST row.");
      } else {
        const response = await fetch(`/Auditing/api/cst/projects/${persistedProjectId}/sections/gantt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to create CST row.");
        rowId = result.rowId;
      }

      for (const attachment of removedPersistedAttachments) {
        await fetch(`/Auditing/api/cst/projects/${persistedProjectId}/gantt/${rowId}/attachments/${attachment.id}`, { method: "DELETE" });
      }

      let uploadedAttachments = [];
      if (newFiles.length) {
        const formData = new FormData();
        newFiles.forEach((file) => formData.append("files", file));
        const uploadResponse = await fetch(`/Auditing/api/cst/projects/${persistedProjectId}/gantt/${rowId}/attachments`, {
          method: "POST",
          body: formData,
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadResult.error || "Failed to upload CST attachments.");
        uploadedAttachments = Array.isArray(uploadResult.attachments) ? uploadResult.attachments : [];
      }

      const finalRow = {
        ...normalizedRow,
        id: rowId,
        attachments: [...persistedAttachments, ...uploadedAttachments],
      };

      if (String(rowId) !== String(drawerState.rowId)) {
        replaceLocalRowId(persistedProjectId, drawerState.rowId, rowId, finalRow);
      } else {
        syncLocalRow(persistedProjectId, rowId, finalRow);
      }

      const nextProject = ensureCstProject({
        ...projectSnapshot,
        id: persistedProjectId,
        cstLoadedFromDb: true,
        cstData: {
          ...projectSnapshot.cstData,
          ganttRows: (projectSnapshot.cstData.ganttRows || []).map((row) => (row.id === drawerState.rowId ? finalRow : row)),
        },
      });
      setProjectSaveBaseline((current) => ({ ...current, [persistedProjectId]: createSaveBaseline(nextProject) }));
      setDrawerValues(finalRow);
      setDrawerInitialValues(finalRow);
      setDrawerState({ open: true, rowId });
      setProjectId(persistedProjectId);
      await refreshDashboard(persistedProjectId);
      showToast("success", "CST row saved to the database.");
    } catch (error) {
      showToast("error", error.message || "Failed to save CST row.");
    } finally {
      setDrawerSaving(false);
    }
  };

  const deleteDrawerRow = async () => {
    if (!currentProject || !drawerState.rowId) return;

    try {
      const projectSnapshot = ensureCstProject(currentProject);
      if (isPersistedProjectId(projectSnapshot.id) && isPersistedProjectId(String(drawerState.rowId))) {
        const response = await fetch(`/Auditing/api/cst/projects/${projectSnapshot.id}/sections/gantt/${drawerState.rowId}`, { method: "DELETE" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to delete CST row.");
      }

      updateCurrentProject((project) => ({
        ...project,
        cstData: {
          ...project.cstData,
          ganttRows: (project.cstData.ganttRows || []).filter((row) => row.id !== drawerState.rowId),
        },
      }));
      const nextProject = ensureCstProject({
        ...projectSnapshot,
        cstData: {
          ...projectSnapshot.cstData,
          ganttRows: (projectSnapshot.cstData.ganttRows || []).filter((row) => row.id !== drawerState.rowId),
        },
      });
      if (isPersistedProjectId(projectSnapshot.id)) {
        setProjectSaveBaseline((current) => ({ ...current, [projectSnapshot.id]: createSaveBaseline(nextProject) }));
      }
      if (isPersistedProjectId(projectSnapshot.id)) {
        await refreshDashboard(projectSnapshot.id);
      }
      closeDrawer();
      showToast("success", "CST row deleted.");
    } catch (error) {
      showToast("error", error.message || "Failed to delete CST row.");
    }
  };

  const applyImportedData = (importedData) => {
    updateCurrentProject((project) => ({
      ...project,
      cstData: {
        ...project.cstData,
        ...importedData,
      },
    }));
  };

  const buildSectionCsv = () => {
    if (!currentProject) return "";
    const header = GANTT_FIELDS.map((field) => field.label);
    const body = (currentProject.cstData.ganttRows || []).map((row) =>
      GANTT_FIELDS.map((field) => {
        const rawValue =
          field.key === "memberAssign"
            ? formatMemberAssign(row[field.key])
            : field.key === "isDone"
            ? row.isDone
              ? "Done"
              : "Pending"
            : row[field.key];
        return `"${String(rawValue ?? "").replace(/"/g, '""')}"`;
      }).join(",")
    );
    return [header.join(","), ...body].join("\n");
  };

  const downloadTextFile = (fileName, content) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportSectionCsv = () => {
    if (!currentProject) return;
    downloadTextFile(`${currentProject.name.replace(/\s+/g, "_")}_cst_gantt.csv`, buildSectionCsv());
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
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([
          ["Project Name", currentProject.name],
          ["Project Leader", currentProject.projectLeader || ""],
          ["Client Name", currentProject.clientName || ""],
          ["Project Start Date", currentProject.start || ""],
          ["Project End Date", currentProject.end || ""],
          ["Project Length", currentProject.projectLength ?? ""],
        ]),
        "Overview"
      );
      const rows = [GANTT_FIELDS.map((field) => field.label)].concat(
        (currentProject.cstData.ganttRows || []).map((row) =>
          GANTT_FIELDS.map((field) =>
            field.key === "memberAssign"
              ? formatMemberAssign(row[field.key])
              : field.key === "isDone"
              ? row.isDone
                ? "Done"
                : "Pending"
              : row[field.key]
          )
        )
      );
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Gantt Chart");
      XLSX.writeFile(workbook, `${currentProject.name.replace(/\s+/g, "_")}_CST_Audit.xlsx`);
    } catch (error) {
      showToast("error", error.message || "Failed to export workbook.");
    }
  };

  const renderProjectCards = () => {
    if (cstProjectsLoading) {
      return <EmptySection title="Loading CST projects" note="We are preparing the CST audit workspace." />;
    }
    if (!cstProjects.length) {
      return <EmptySection title="No CST projects yet" note="Create a CST project to start tracking Gantt tasks and dashboard progress." />;
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 18 }}>
        {cstProjects.map((project) => (
          <CstProjectCard
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
    );
  };

  const renderGantt = () => {
    if (!currentProject) return null;
    const rows = currentProject.cstData.ganttRows || [];
    if (projectDetailsLoading && isPersistedProjectId(currentProject.id) && !currentProject.cstLoadedFromDb) {
      return <EmptySection title="Loading Gantt data" note="Pulling the latest CST task rows from the database." />;
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text }}>Gantt Chart</div>
            <div style={{ fontSize: 13, color: COLORS.textSoft, marginTop: 6 }}>Track CST task ownership, dates, completion percentage, and supporting files.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={exportSectionCsv} style={{ ...tableInputStyle, width: 110, cursor: "pointer" }}>Export CSV</button>
            <button onClick={addSectionRow} style={{ border: "none", borderRadius: 10, padding: "9px 13px", background: COLORS.blue, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              + Add Task Row
            </button>
          </div>
        </div>
        {!rows.length ? (
          <EmptySection title="No Gantt rows yet" note="Import the workbook or add task rows manually to begin the CST audit plan." />
        ) : (
          <SectionTable headers={["Level / Label", "Task Name", "Assigned To", "Member Assigned", "Start Date", "End Date", "Done", "Done Date", "% Done", "Work Days", "Remaining", "Remark", "Files"]}>
            {rows.map((row) => (
              <tr key={row.id} onClick={() => openRowDrawer(row.id)} style={{ cursor: "pointer" }}>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, fontWeight: 700, color: COLORS.text }}>{row.label || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 320, fontSize: 13, color: COLORS.text }}>{row.taskName || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 220, fontSize: 12.5, color: COLORS.textSoft }}>{row.assignedTo || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 220, fontSize: 12.5, color: COLORS.textSoft }}>{formatMemberAssign(row.memberAssign) || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 118, fontSize: 12.5, color: COLORS.textSoft, whiteSpace: "nowrap" }}>{row.startDate || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 118, fontSize: 12.5, color: COLORS.textSoft, whiteSpace: "nowrap" }}>{row.endDate || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}` }}>{renderStatusBadge(row.isDone ? "Done" : "Pending", row.isDone ? COLORS.green : COLORS.amber)}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 118, fontSize: 12.5, color: COLORS.textSoft, whiteSpace: "nowrap" }}>{row.doneMarkedOn || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}` }}>{renderStatusBadge(formatPercentLabel(row.percentDone || 0), Number(row.percentDone || 0) >= 100 ? COLORS.green : COLORS.blue)}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{row.workDays || "0"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{renderRemainingBadge(row.remaining)}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, minWidth: 220, fontSize: 12.5, color: COLORS.textSoft }}>{row.remark || "-"}</td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{Array.isArray(row.attachments) ? row.attachments.length : 0}</td>
              </tr>
            ))}
          </SectionTable>
        )}
      </div>
    );
  };

  const renderDashboardInsights = () => {
    if (!currentProject) return null;

    const rows = dashboardStats?.taskPercentages || (currentProject.cstData.ganttRows || []).map((row) => ({
      id: row.id,
      label: row.label,
      taskName: row.taskName,
      percentDone: Number(row.percentDone || 0),
      remaining: Math.max(0, Number(row.remaining || 0)),
      isDone: Boolean(row.isDone),
    }));
    const totalTasks = dashboardStats?.totalTasks ?? rows.length;
    const completedTasks = dashboardStats?.completedTasks ?? rows.filter((row) => Boolean(row.isDone)).length;
    const averagePercentDone =
      dashboardStats?.averagePercentDone ??
      (rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.percentDone || 0), 0) / rows.length) : 0);
    const averageRemainingPercent =
      dashboardStats?.averageRemainingPercent ??
      (rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.remaining || 0), 0) / rows.length) : 0);

    if (!rows.length) {
      return <EmptySection title="No dashboard data yet" note="Once Gantt tasks are added, the CST dashboard will show completion and remaining percentages automatically." />;
    }

    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 16 }}>
          <MetricCard label="Project Progress" value={`${averagePercentDone}%`} note="Average completion across all CST tasks." accent={COLORS.blue} bg={COLORS.blueBg} border={COLORS.blueBorder} />
          <MetricCard label="Total Tasks" value={totalTasks} note="All Gantt tasks in this CST project." accent={COLORS.blue} bg={COLORS.blueBg} border={COLORS.blueBorder} />
          <MetricCard label="Completed Tasks" value={completedTasks} note="Tasks auto-marked done or completed manually." accent={COLORS.green} bg={COLORS.greenBg} border={COLORS.greenBorder} />
          <MetricCard label="Average Done" value={`${averagePercentDone}%`} note="Average completion percentage across all tasks." accent={COLORS.teal} bg={COLORS.tealBg} border={COLORS.tealBorder} />
          <MetricCard label="Average Remaining" value={`${averageRemainingPercent}%`} note="Average remaining percentage across all tasks." accent={COLORS.violet} bg={COLORS.violetBg} border={COLORS.violetBorder} />
        </div>
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 22, padding: 22, boxShadow: "0 14px 34px rgba(15,23,42,0.05)" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text }}>Task Completion vs Remaining</div>
          <div style={{ fontSize: 13, color: COLORS.textSoft, marginTop: 6 }}>Horizontal progress bars show done versus remaining percentage for each CST task.</div>
          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            {rows.map((row) => {
              const done = Math.max(0, Math.min(100, Number(row.percentDone || 0)));
              const remaining = Math.max(0, Math.min(100, Number(row.remaining ?? 100 - done)));
              return (
                <div key={row.id || `${row.label}-${row.taskName}`} style={{ display: "grid", gridTemplateColumns: "minmax(220px, 320px) minmax(360px,1fr) auto", alignItems: "center", gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{row.taskName || row.label || "Untitled task"}</div>
                    <div style={{ fontSize: 11.5, color: COLORS.textSoft, marginTop: 2 }}>{row.label || "No label"}</div>
                  </div>
                  <div style={{ display: "flex", width: "100%", height: 18, borderRadius: 999, overflow: "hidden", background: COLORS.grayBg, border: `1px solid ${COLORS.border}` }}>
                    <div style={{ width: `${done}%`, background: "linear-gradient(90deg,#0d9488 0%,#2563eb 100%)" }} />
                    <div style={{ width: `${remaining}%`, background: "linear-gradient(90deg,#e2e8f0 0%,#cbd5e1 100%)" }} />
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 12, color: COLORS.textSoft, flexShrink: 0 }}>
                    <span>Done {done}%</span>
                    <span>Remaining {remaining}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderOverview = () => {
    if (!currentProject) return null;
    return (
      <div>
        <SectionTable headers={["Field", "Value"]}>
          {[
            ["Project Name", currentProject.name || "-"],
            ["Client Name", currentProject.clientName || "-"],
            ["Project Leader", currentProject.projectLeader || "-"],
            ["Start Date", currentProject.start || "-"],
            ["End Date", currentProject.end || "-"],
            ["Project Length", currentProject.projectLength || "-"],
            ["Workbook Import", currentProject.cstData?.importMeta?.fileName || "Manual / not imported yet"],
          ].map(([label, value]) => (
            <tr key={label}>
              <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, fontWeight: 700, color: COLORS.text }}>{label}</td>
              <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{value}</td>
            </tr>
          ))}
        </SectionTable>
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
      {!auditMembers.length ? (
        <EmptySection title="No auditing members available" note="Once HRM module access is granted for auditing, members will appear here automatically." />
      ) : (
        <SectionTable headers={["Employee", "Employee ID", "Designation"]}>
          {auditMembers.map((member) => (
            <tr key={member.id}>
              <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{member.name}</td>
              <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{member.employeeId || "-"}</td>
              <td style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textSoft }}>{member.designation || member.role || "-"}</td>
            </tr>
          ))}
        </SectionTable>
      )}
    </div>
  );

  const memberOptions = Array.from(new Set([...currentProjectTeamOptions, ...normalizeMemberAssign(drawerValues.memberAssign)].filter(Boolean)));

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {nav !== "project" && (
      <div style={{ background: "#fff", borderBottom: `1px solid ${COLORS.border}`, padding: "18px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,1fr) auto minmax(320px,1fr)", alignItems: "center", gap: 18 }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 800, color: COLORS.teal, letterSpacing: "-0.8px" }}>AuditFlow</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{selectedTemplate?.name || "CST Audit"}</div>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: COLORS.borderStrong }} />
              <div style={{ fontSize: 12.5, color: COLORS.textSoft }}>CST audit category workspace</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <button onClick={() => setNav("dashboard")} style={{ background: nav === "dashboard" ? COLORS.tealBg : "#fff", border: `1px solid ${nav === "dashboard" ? COLORS.tealBorder : COLORS.borderStrong}`, borderRadius: 999, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, color: nav === "dashboard" ? COLORS.teal : COLORS.textSoft, cursor: "pointer" }}>Dashboard</button>
            <button onClick={() => setNav("team")} style={{ background: nav === "team" ? COLORS.tealBg : "#fff", border: `1px solid ${nav === "team" ? COLORS.tealBorder : COLORS.borderStrong}`, borderRadius: 999, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, color: nav === "team" ? COLORS.teal : COLORS.textSoft, cursor: "pointer" }}>Team Members</button>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: "9px 14px", minWidth: 280 }}>
              <span style={{ color: COLORS.textSoft, fontSize: 12.5, fontWeight: 600 }}>Find</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search CST projects..." style={{ background: "none", border: "none", outline: "none", color: COLORS.text, fontSize: 13, fontFamily: "Sora,sans-serif", width: "100%" }} />
            </div>
            <button onClick={openCreateProjectModal} style={{ border: "none", borderRadius: 12, padding: "10px 16px", background: COLORS.teal, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              + Add CST Project
            </button>
          </div>
        </div>
      </div>
      )}

      {nav === "dashboard" && (
        <div style={{ padding: "24px 28px 32px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <button onClick={() => onBackToTemplates?.()} style={{ ...tableInputStyle, width: 140, cursor: "pointer" }}>Back Template</button>
            <button onClick={openCreateProjectModal} style={{ ...tableInputStyle, width: 150, cursor: "pointer" }}>+ Add CST Project</button>
          </div>
          {renderProjectCards()}
        </div>
      )}

      {nav === "team" && renderTeam()}

      {nav === "project" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          {!currentProject ? (
            <div style={{ padding: "24px 28px 32px", overflowY: "auto", flex: 1 }}>
              <EmptySection title="No CST project selected" note="Choose one CST project from the dashboard to open the workspace." />
            </div>
          ) : (
            <>
              <div style={{ padding: "14px 22px 0", borderBottom: `1px solid ${COLORS.border}`, background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.teal }}>Project: {currentProject.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: COLORS.textSoft }}>
                      {[currentProject.projectLeader ? `Leader: ${currentProject.projectLeader}` : "", currentProject.clientName ? `Client: ${currentProject.clientName}` : "", currentProject.start ? `Start Date: ${currentProject.start}` : "", currentProject.end ? `End Date: ${currentProject.end}` : ""].filter(Boolean).map((item) => <span key={item}>{item}</span>)}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={saveAllGanttRowsToDatabase} disabled={!hasAnyUnsavedChanges} style={{ border: hasAnyUnsavedChanges ? "none" : `1px solid ${COLORS.borderStrong}`, background: hasAnyUnsavedChanges ? COLORS.teal : "#fff", color: hasAnyUnsavedChanges ? "#fff" : COLORS.text, borderRadius: 12, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: hasAnyUnsavedChanges ? "pointer" : "not-allowed", opacity: hasAnyUnsavedChanges ? 1 : 0.75 }}>
                      {hasAnyUnsavedChanges ? "Save Changes" : "Saved"}
                    </button>
                    <button onClick={() => openEditProjectModal(currentProject)} style={{ border: `1px solid ${COLORS.borderStrong}`, background: "#fff", color: COLORS.text, borderRadius: 12, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Edit Details</button>
                    <button onClick={() => setImportOpen(true)} style={{ border: `1px solid ${COLORS.borderStrong}`, background: "#fff", color: COLORS.text, borderRadius: 12, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Import Workbook</button>
                    <button onClick={exportAllWorkbook} style={{ border: `1px solid ${COLORS.borderStrong}`, background: "#fff", color: COLORS.text, borderRadius: 12, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Export All</button>
                    <button onClick={() => setNav("dashboard")} style={{ border: `1px solid ${COLORS.borderStrong}`, background: "#fff", color: COLORS.textSoft, borderRadius: 12, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Back</button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {[
                    ["overview", "Overview"],
                    ["gantt", "Gantt Chart"],
                    ["dashboard", "Dashboard"],
                  ].map(([value, label]) => {
                    const active = section === value;
                    return (
                      <button key={value} onClick={() => setSection(value)} style={{ border: "none", borderBottom: `2px solid ${active ? COLORS.teal : "transparent"}`, background: "transparent", color: active ? COLORS.teal : COLORS.textSoft, padding: "12px 16px 13px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ padding: "18px 22px 28px", overflowY: "auto", flex: 1 }}>
                {section === "overview" && renderOverview()}
                {section === "gantt" && renderGantt()}
                {section === "dashboard" && renderDashboardInsights()}
              </div>
            </>
          )}
        </div>
      )}

      <ProjectModal
        key={`${projectModalMode}-${projectModalProjectId || "new"}-${projectModalOpen ? "open" : "closed"}`}
        open={projectModalOpen}
        members={auditMembers}
        initialValues={projectModalInitialValues}
        mode={projectModalMode}
        submitting={projectModalSaving}
        onClose={closeProjectModal}
        onSubmit={submitProjectModal}
      />
      <ImportWorkbookModal open={importOpen} onClose={() => setImportOpen(false)} onApply={applyImportedData} showToast={showToast} />
      <CstRowDrawer
        open={drawerState.open}
        values={drawerValues}
        memberOptions={memberOptions}
        saving={drawerSaving}
        saveDisabled={!isDrawerDirty}
        onChange={(key, value) =>
          setDrawerValues((current) => {
            const next = { ...current, [key]: value };
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
            return next;
          })
        }
        onClose={closeDrawer}
        onSave={saveDrawer}
        onDelete={deleteDrawerRow}
      />
    </div>
  );
}
