'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import html2canvas from 'html2canvas';
import EmployeePageHeader from '../ui/EmployeePageHeader';

interface LogEntry {
  id: string;
  employee_id?: string;
  log_date?: string;
  client_name: string;
  task_id?: string | null;
  task_name_snapshot?: string | null;
  hours_spent: number;
  remarks?: string | null;
  created_at: string;
}

interface EmployeeRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeEmail: string;
  logs: LogEntry[];
  totalHours: number;
}

interface EmployeeOption {
  id: string;
  employeeId: string;
  name: string;
  email: string;
}

export default function TeamDailyLog() {
  const [mode, setMode] = useState<'daily' | 'individual' | 'report'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Report date range states
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to last 7 days
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  });
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string>('last7');
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Data from API
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [dailyRows, setDailyRows] = useState<EmployeeRow[]>([]);
  const [individualLogs, setIndividualLogs] = useState<LogEntry[]>([]);
  const [reportLogs, setReportLogs] = useState<LogEntry[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch work logs
  useEffect(() => {
    let active = true;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        let url = `/HRM/api/employee/team-work-log?mode=${mode}`;
        if (mode === 'daily') {
          url += `&date=${selectedDate}`;
        } else if (mode === 'individual') {
          url += `&employeeId=${selectedEmployeeId}`;
        } else if (mode === 'report') {
          url += `&startDate=${startDate}&endDate=${endDate}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch team work logs');
        }

        if (!active) return;

        setEmployeeOptions(data.employeeOptions || []);

        if (mode === 'daily') {
          setDailyRows(data.rows || []);
        } else if (mode === 'individual') {
          setIndividualLogs(data.logs || []);
          setSelectedEmployee(data.selectedEmployee || null);
        } else if (mode === 'report') {
          setReportLogs(data.logs || []);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'An error occurred while loading team work logs');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      active = false;
    };
  }, [mode, selectedDate, selectedEmployeeId, startDate, endDate]);

  // Handle employee dropdown default selection when employeeOptions changes
  useEffect(() => {
    if (mode === 'individual' && employeeOptions.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employeeOptions[0].id);
    }
  }, [employeeOptions, mode, selectedEmployeeId]);

  // Navigate date
  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const tzOffset = current.getTimezoneOffset() * 60000;
    setSelectedDate(new Date(current.getTime() - tzOffset).toISOString().split('T')[0]);
  };

  // Day-wise stats
  const stats = useMemo(() => {
    if (mode !== 'daily') return null;
    const totalHours = dailyRows.reduce((sum, row) => sum + row.totalHours, 0);
    const submittedCount = dailyRows.filter(row => row.logs.length > 0).length;
    const totalEmployees = dailyRows.length;
    return {
      totalHours: Math.round(totalHours * 100) / 100,
      submittedCount,
      missingCount: totalEmployees - submittedCount,
      totalEmployees
    };
  }, [dailyRows, mode]);

  // Filtered daily rows
  const filteredDailyRows = useMemo(() => {
    if (mode !== 'daily') return [];

    let rows = dailyRows;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = dailyRows.filter(
        row =>
          row.employeeName.toLowerCase().includes(q) ||
          row.employeeEmail.toLowerCase().includes(q) ||
          row.employeeCode.toLowerCase().includes(q)
      );
    }

    return [...rows].sort((a, b) => {
      const aHasLogs = a.logs.length > 0;
      const bHasLogs = b.logs.length > 0;

      if (aHasLogs && !bHasLogs) return -1;
      if (!aHasLogs && bHasLogs) return 1;
      if (!aHasLogs && !bHasLogs) return a.employeeName.localeCompare(b.employeeName);

      // Both have logs: sort by earliest submission time
      const aTime = Math.min(...a.logs.map(log => new Date(log.created_at).getTime()));
      const bTime = Math.min(...b.logs.map(log => new Date(log.created_at).getTime()));
      return aTime - bTime;
    });
  }, [dailyRows, searchQuery, mode]);

  // Individual logs grouped by date
  const groupedIndividualLogs = useMemo(() => {
    if (mode !== 'individual') return [];
    const groups: { [date: string]: { logs: LogEntry[]; totalHours: number } } = {};

    individualLogs.forEach(log => {
      const date = log.log_date || 'Unknown Date';
      if (!groups[date]) {
        groups[date] = { logs: [], totalHours: 0 };
      }
      groups[date].logs.push(log);
      groups[date].totalHours += Number(log.hours_spent || 0);
    });

    return Object.entries(groups).map(([date, data]) => ({
      date,
      logs: data.logs,
      totalHours: Math.round(data.totalHours * 100) / 100
    }));
  }, [individualLogs, mode]);

  // Dates in selected range
  const datesInRange = useMemo(() => {
    const dates: string[] = [];
    if (!startDate || !endDate) return dates;
    let curr = new Date(startDate);
    const end = new Date(endDate);
    let safetyCounter = 0;
    while (curr <= end && safetyCounter < 366) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
      safetyCounter++;
    }
    return dates;
  }, [startDate, endDate]);

  // Employee-wise stats for Report
  const reportEmployeeRows = useMemo(() => {
    if (mode !== 'report') return [];

    return employeeOptions.map(emp => {
      const empLogs = reportLogs.filter(log => log.employee_id === emp.id);

      const submittedDates = new Set<string>();
      let totalHours = 0;
      empLogs.forEach(log => {
        if (log.log_date) {
          submittedDates.add(log.log_date);
        }
        totalHours += Number(log.hours_spent || 0);
      });

      const submittedDays = datesInRange.filter(date => submittedDates.has(date)).length;
      const missingDays = datesInRange.length - submittedDays;
      const submissionRate = datesInRange.length > 0 ? (submittedDays / datesInRange.length) * 100 : 0;

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeId,
        employeeName: emp.name,
        employeeEmail: emp.email,
        submittedDays,
        missingDays,
        submissionRate: Math.round(submissionRate * 10) / 10,
        totalHours: Math.round(totalHours * 100) / 100,
        avgHoursPerSubmittedDay: submittedDays > 0 ? Math.round((totalHours / submittedDays) * 10) / 10 : 0,
        submittedDatesList: Array.from(submittedDates)
      };
    });
  }, [mode, employeeOptions, reportLogs, datesInRange]);

  // Filtered employee rows in Report
  const filteredReportEmployeeRows = useMemo(() => {
    if (mode !== 'report') return [];
    if (!reportSearchQuery.trim()) return reportEmployeeRows;
    const q = reportSearchQuery.toLowerCase();
    return reportEmployeeRows.filter(
      row =>
        row.employeeName.toLowerCase().includes(q) ||
        row.employeeEmail.toLowerCase().includes(q) ||
        row.employeeCode.toLowerCase().includes(q)
    );
  }, [reportEmployeeRows, reportSearchQuery, mode]);

  // Report KPIs
  const reportKPIs = useMemo(() => {
    if (mode !== 'report') return null;
    const totalExpected = employeeOptions.length * datesInRange.length;
    let totalSubmitted = 0;
    let totalHours = 0;

    reportEmployeeRows.forEach(row => {
      totalSubmitted += row.submittedDays;
      totalHours += row.totalHours;
    });

    const totalMissing = totalExpected - totalSubmitted;
    const avgSubmitRate = totalExpected > 0 ? (totalSubmitted / totalExpected) * 100 : 0;
    const avgHours = totalSubmitted > 0 ? totalHours / totalSubmitted : 0;

    return {
      totalExpected,
      totalSubmitted,
      totalMissing,
      avgSubmitRate: Math.round(avgSubmitRate * 10) / 10,
      totalHours: Math.round(totalHours * 100) / 100,
      avgHoursPerSubmission: Math.round(avgHours * 10) / 10
    };
  }, [mode, reportEmployeeRows, employeeOptions.length, datesInRange.length]);

  // Day-wise line chart data
  const lineChartData = useMemo(() => {
    if (mode !== 'report') return [];

    return datesInRange.map(date => {
      const logsOnDate = reportLogs.filter(log => log.log_date === date);
      const submittedEmployeesCount = new Set(logsOnDate.map(log => log.employee_id)).size;
      const notSubmittedEmployeesCount = Math.max(0, employeeOptions.length - submittedEmployeesCount);

      const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      return {
        date,
        formattedDate,
        Submitted: submittedEmployeesCount,
        'Not Submitted': notSubmittedEmployeesCount
      };
    });
  }, [mode, datesInRange, reportLogs, employeeOptions.length]);

  // Pie chart data
  const pieChartData = useMemo(() => {
    if (!reportKPIs) return [];
    return [
      { name: 'Submitted', value: reportKPIs.totalSubmitted, color: '#10B981' },
      { name: 'Not Submitted', value: reportKPIs.totalMissing, color: '#EF4444' }
    ];
  }, [reportKPIs]);

  // Preset Date range picker handler
  const setPresetRange = (preset: 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'today':
        break;
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'last7':
        start.setDate(today.getDate() - 7);
        break;
      case 'last30':
        start.setDate(today.getDate() - 30);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
    }

    const startStr = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const endStr = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    setStartDate(startStr);
    setEndDate(endStr);
  };

  // Styled excel report exporter using xlsx-js-style
  const handleExportExcel = async () => {
    if (exportingExcel || !reportKPIs) return;
    setExportingExcel(true);
    try {
      const XLSX = await new Promise<any>((resolve, reject) => {
        if ((window as any).XLSX) {
          resolve((window as any).XLSX);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
        script.async = true;
        script.onload = () => resolve((window as any).XLSX);
        script.onerror = () => reject(new Error('Failed to load Excel library.'));
        document.head.appendChild(script);
      });

      const workbook = XLSX.utils.book_new();

      // --- SHEET 1: SUMMARY ---
      const summaryData = [
        ["TEAM DAILY WORK LOG REPORT SUMMARY", "", "", ""],
        [`Period: ${startDate} to ${endDate}`, "", "", ""],
        [],
        ["KEY PERFORMANCE INDICATORS", "VALUE", "", ""],
        ["Total Expected Submissions (Employee-Days)", reportKPIs.totalExpected, "", ""],
        ["Total Actual Submissions", reportKPIs.totalSubmitted, "", ""],
        ["Total Pending Submissions", reportKPIs.totalMissing, "", ""],
        ["Average Submission Rate", `${reportKPIs.avgSubmitRate}%`, "", ""],
        ["Total Hours Logged", `${reportKPIs.totalHours} hrs`, "", ""],
        ["Average Hours per Submission", `${reportKPIs.avgHoursPerSubmission} hrs`, "", ""],
        [],
        ["DAILY SUBMISSION BREAKDOWN", "", "", ""],
        ["Date", "Submitted Count", "Not Submitted Count", "Submission Rate"]
      ];

      lineChartData.forEach(item => {
        const total = item.Submitted + item['Not Submitted'];
        const rate = total > 0 ? Math.round((item.Submitted / total) * 100) : 0;
        summaryData.push([
          item.date,
          item.Submitted,
          item['Not Submitted'],
          `${rate}%`
        ]);
      });

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

      wsSummary['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
        { s: { r: 11, c: 0 }, e: { r: 11, c: 3 } }
      ];

      wsSummary['!cols'] = [
        { wch: 40 },
        { wch: 20 },
        { wch: 22 },
        { wch: 18 }
      ];

      const titleStyle = {
        font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '426FBF' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };

      const subtitleStyle = {
        font: { name: 'Arial', sz: 10, italic: true, color: { rgb: '6B7280' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };

      const sectionHeaderStyle = {
        fill: { fgColor: { rgb: 'E2E8F0' } },
        font: { name: 'Arial', sz: 11, bold: true, color: { rgb: '1E293B' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'medium', color: { rgb: '94A3B8' } },
          bottom: { style: 'medium', color: { rgb: '94A3B8' } }
        }
      };

      const tableHeaderStyle = {
        fill: { fgColor: { rgb: '426FBF' } },
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'medium', color: { rgb: 'FFFFFF' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      };

      const gridStyle = {
        font: { name: 'Arial', sz: 10 },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        },
        alignment: { vertical: 'center' }
      };

      const boldLabelStyle = {
        ...gridStyle,
        font: { name: 'Arial', sz: 10, bold: true }
      };

      const summaryRange = XLSX.utils.decode_range(wsSummary['!ref'] || 'A1');
      for (let r = summaryRange.s.r; r <= summaryRange.e.r; r++) {
        for (let c = summaryRange.s.c; c <= summaryRange.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = wsSummary[addr];
          if (!cell) continue;

          if (r === 0) {
            cell.s = titleStyle;
          } else if (r === 1) {
            cell.s = subtitleStyle;
          } else if (r === 3 || r === 11) {
            cell.s = sectionHeaderStyle;
          } else if (r === 12) {
            cell.s = tableHeaderStyle;
          } else if (r >= 4 && r <= 9) {
            if (c === 0) {
              cell.s = boldLabelStyle;
            } else {
              cell.s = gridStyle;
              cell.s.alignment = { horizontal: 'right', vertical: 'center' };
            }
          } else if (r > 12) {
            cell.s = gridStyle;
            if (c === 0) {
              cell.s.alignment = { horizontal: 'center', vertical: 'center' };
            } else {
              cell.s.alignment = { horizontal: 'right', vertical: 'center' };
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(workbook, wsSummary, "Summary Report");

      // --- SHEET 2: EMPLOYEES ---
      const employeeHeaders = [
        "Employee Name",
        "Employee Code",
        "Email",
        "Days Submitted",
        "Days Pending",
        "Submission Rate",
        "Total Hours Logged",
        "Avg Hours/Submitted Day"
      ];

      const employeeDataRows = reportEmployeeRows.map(row => [
        row.employeeName,
        row.employeeCode || '--',
        row.employeeEmail,
        row.submittedDays,
        row.missingDays,
        `${row.submissionRate}%`,
        row.totalHours,
        row.avgHoursPerSubmittedDay
      ]);

      const wsEmployees = XLSX.utils.aoa_to_sheet([employeeHeaders, ...employeeDataRows]);

      wsEmployees['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 30 },
        { wch: 15 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 24 }
      ];

      const empRange = XLSX.utils.decode_range(wsEmployees['!ref'] || 'A1');
      for (let r = empRange.s.r; r <= empRange.e.r; r++) {
        for (let c = empRange.s.c; c <= empRange.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = wsEmployees[addr];
          if (!cell) continue;

          if (r === 0) {
            cell.s = tableHeaderStyle;
          } else {
            cell.s = {
              font: { name: 'Arial', sz: 10 },
              border: {
                top: { style: 'thin', color: { rgb: 'E2E8F0' } },
                bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
                left: { style: 'thin', color: { rgb: 'E2E8F0' } },
                right: { style: 'thin', color: { rgb: 'E2E8F0' } }
              },
              alignment: { vertical: 'center' }
            };

            if (c >= 3) {
              cell.s.alignment.horizontal = 'right';
            } else {
              cell.s.alignment.horizontal = 'left';
            }

            if (c === 5) {
              const rate = reportEmployeeRows[r - 1].submissionRate;
              cell.s.font.bold = true;
              if (rate >= 80) {
                cell.s.fill = { fgColor: { rgb: 'DCFCE7' } };
                cell.s.font.color = { rgb: '15803D' };
              } else if (rate >= 50) {
                cell.s.fill = { fgColor: { rgb: 'FEF3C7' } };
                cell.s.font.color = { rgb: 'B45309' };
              } else {
                cell.s.fill = { fgColor: { rgb: 'FEE2E2' } };
                cell.s.font.color = { rgb: 'B91C1C' };
              }
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(workbook, wsEmployees, "Team Details");

      XLSX.writeFile(workbook, `Team_Daily_Work_Log_Report_${startDate}_to_${endDate}.xlsx`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to export Excel.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Download chart as image
  const downloadChartImage = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = fileName;
      link.click();
    } catch (err) {
      console.error("Failed to export chart image:", err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <EmployeePageHeader
        icon="groups"
        title="Team Daily Work Log"
        description="Audit, inspect, and analyze daily work logs submitted by your team members."
      />

      {/* Mode Navigation Tabs */}
      <div className="flex bg-slate-250/60 p-1.5 rounded-xl self-start w-fit">
        <button
          onClick={() => {
            setMode('daily');
            setSearchQuery('');
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
            mode === 'daily'
              ? 'bg-white shadow-sm text-primary'
              : 'text-slate-650 hover:text-slate-900'
          }`}
        >
          Day-Wise Audit
        </button>
        <button
          onClick={() => {
            setMode('individual');
            if (employeeOptions.length > 0 && !selectedEmployeeId) {
              setSelectedEmployeeId(employeeOptions[0].id);
            }
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
            mode === 'individual'
              ? 'bg-white shadow-sm text-primary'
              : 'text-slate-650 hover:text-slate-900'
          }`}
        >
          Employee History
        </button>
        <button
          onClick={() => {
            setMode('report');
            setSearchQuery('');
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
            mode === 'report'
              ? 'bg-white shadow-sm text-primary'
              : 'text-slate-655 hover:text-slate-900'
          }`}
        >
          Report
        </button>
      </div>

      {/* Stats summary (Only for Day-Wise Audit) */}
      {mode === 'daily' && stats && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Logged Hours</span>
            <span className="text-2xl md:text-3xl font-extrabold text-slate-950 mt-2">{stats.totalHours} hrs</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submitted Logs</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl md:text-3xl font-extrabold text-emerald-600">{stats.submittedCount}</span>
              <span className="text-xs text-slate-400">/ {stats.totalEmployees} team members</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Not Submitted</span>
            <span className="text-2xl md:text-3xl font-extrabold text-rose-600 mt-2">{stats.missingCount}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Hours/Employee</span>
            <span className="text-2xl md:text-3xl font-extrabold mt-2 text-primary">
              {stats.submittedCount > 0 ? (Math.round((stats.totalHours / stats.submittedCount) * 10) / 10) : 0} hrs
            </span>
          </div>
        </section>
      )}

      {/* Filters and Search Bar Section */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between w-full">
          {mode === 'daily' && (
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between w-full">
              {/* Date Selection */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => changeDate(-1)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 transition"
                  title="Previous Day"
                >
                  <span className="material-symbols-outlined text-[18px] block">chevron_left</span>
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  onClick={() => changeDate(1)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 transition"
                  title="Next Day"
                >
                  <span className="material-symbols-outlined text-[18px] block">chevron_right</span>
                </button>
                <button
                  onClick={() => {
                    const d = new Date();
                    const tzOffset = d.getTimezoneOffset() * 60000;
                    setSelectedDate(new Date(d.getTime() - tzOffset).toISOString().split('T')[0]);
                  }}
                  className="ml-2 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  Today
                </button>
              </div>

              {/* Search */}
              <div className="relative w-full md:w-72">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Search team member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          )}

          {mode === 'individual' && (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 sm:w-28">Team Member</span>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full sm:w-80 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-semibold"
              >
                <option value="" disabled>Choose a team member...</option>
                {employeeOptions.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.employeeId ? `(${emp.employeeId})` : ''}
                  </option>
                ))}
              </select>
              {selectedEmployee && (
                <div className="text-xs text-slate-500 sm:ml-auto">
                  Email: <span className="font-semibold text-slate-850">{selectedEmployee.email}</span>
                </div>
              )}
            </div>
          )}

          {mode === 'report' && (
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center w-full">
              <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                <select
                  value={activePreset}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setActivePreset(val);
                    if (val !== 'custom') {
                      setPresetRange(val);
                    }
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  style={{ height: '38px' }}
                >
                  <option value="last7">Last 7 Days</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last30">Last 30 Days</option>
                  <option value="thisMonth">This Month</option>
                  <option value="custom" disabled>Custom Range</option>
                </select>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setActivePreset('custom');
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                    style={{ height: '38px' }}
                  />
                  <span className="text-slate-400 font-bold text-xs">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setActivePreset('custom');
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                    style={{ height: '38px' }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full xl:w-auto">
                <div className="relative flex-1 sm:w-64 sm:flex-none">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">search</span>
                  <input
                    type="text"
                    placeholder="Search team member..."
                    value={reportSearchQuery}
                    onChange={(e) => setReportSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none"
                  />
                </div>

                <button
                  onClick={handleExportExcel}
                  disabled={exportingExcel || !reportKPIs}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm transition disabled:opacity-50 bg-primary hover:opacity-90"
                >
                  {exportingExcel ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <span className="material-symbols-outlined text-[18px] block">download</span>
                  )}
                  <span>{exportingExcel ? 'Exporting...' : 'Export Excel'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-slate-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/6" />
                </div>
              </div>
              <div className="h-20 bg-slate-50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div>
          {mode === 'daily' && (
            filteredDailyRows.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                <span className="material-symbols-outlined text-slate-300 text-[48px] mb-2 block">assignment_late</span>
                <h3 className="text-base font-bold text-slate-800">No logs found</h3>
                <p className="text-sm text-slate-505 mt-1">No team member matches the search criteria.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDailyRows.map((row) => {
                  const hasLogs = row.logs.length > 0;
                  return (
                    <div
                      key={row.employeeId}
                      className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition duration-200 ${
                        hasLogs ? 'hover:shadow-md' : 'opacity-70'
                      }`}
                    >
                      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm"
                            style={hasLogs ? { backgroundColor: 'rgba(66, 111, 191, 0.1)', color: 'rgb(66, 111, 191)' } : { backgroundColor: '#F1F5F9', color: '#94A3B8' }}
                          >
                            {row.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 leading-tight">{row.employeeName}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{row.employeeCode || 'No Employee Code'} • {row.employeeEmail}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          {hasLogs ? (
                            <>
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                                Submitted
                              </span>
                              <span className="text-sm font-extrabold text-slate-800">
                                {row.totalHours} hrs logged
                              </span>
                            </>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-400">
                              Not Submitted
                            </span>
                          )}
                        </div>
                      </div>

                      {hasLogs && (
                        <div className="bg-slate-50/50 p-4 sm:p-5">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px] text-left text-sm border-collapse">
                              <thead>
                                <tr className="text-slate-400 text-xs uppercase font-bold tracking-wider border-b border-slate-100 pb-2">
                                  <th className="pb-3 w-1/4">Client Name</th>
                                  <th className="pb-3 w-1/4">Task / Reference</th>
                                  <th className="pb-3 w-12 text-center">Hours</th>
                                  <th className="pb-3 w-2/5 pl-4">Remarks</th>
                                  <th className="pb-3 text-right">Logged Time</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {row.logs.map((log) => (
                                  <tr key={log.id} className="text-slate-750">
                                    <td className="py-3 font-semibold text-slate-900">{log.client_name}</td>
                                    <td className="py-3 text-slate-600">
                                      {log.task_name_snapshot || <span className="text-slate-400 italic">No Task Linked</span>}
                                    </td>
                                    <td className="py-3 font-bold text-center text-primary">{log.hours_spent}</td>
                                    <td className="py-3 pl-4 text-slate-500 text-xs max-w-xs truncate" title={log.remarks || ''}>
                                      {log.remarks || <span className="text-slate-400 italic">No remarks</span>}
                                    </td>
                                    <td className="py-3 text-right text-xs text-slate-400">
                                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {mode === 'individual' && (
            !selectedEmployeeId ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                <span className="material-symbols-outlined text-slate-300 text-[48px] mb-2 block">person</span>
                <h3 className="text-base font-bold text-slate-800">Select a Team Member</h3>
                <p className="text-sm text-slate-505 mt-1">Please select a team member from the dropdown above to view their history.</p>
              </div>
            ) : groupedIndividualLogs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                <span className="material-symbols-outlined text-slate-300 text-[48px] mb-2 block">assignment_late</span>
                <h3 className="text-base font-bold text-slate-800">No logs found</h3>
                <p className="text-sm text-slate-505 mt-1">No daily work log entries found for this team member.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedIndividualLogs.map((group) => (
                  <div key={group.date} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fadeIn">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {new Date(`${group.date}T00:00:00`).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: 'rgba(66, 111, 191, 0.1)', color: 'rgb(66, 111, 191)' }}
                      >
                        Total: {group.totalHours} hrs
                      </span>
                    </div>

                    <div className="p-5">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-left text-sm border-collapse">
                          <thead>
                            <tr className="text-slate-400 text-xs uppercase font-bold tracking-wider border-b border-slate-100 pb-2">
                              <th className="pb-3 w-1/4">Client Name</th>
                              <th className="pb-3 w-1/4">Task / Reference</th>
                              <th className="pb-3 w-12 text-center">Hours</th>
                              <th className="pb-3 w-2/5 pl-4">Remarks</th>
                              <th className="pb-3 text-right">Logged Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {group.logs.map((log) => (
                              <tr key={log.id} className="text-slate-700">
                                <td className="py-3 font-semibold text-slate-900">{log.client_name}</td>
                                <td className="py-3 text-slate-600">
                                  {log.task_name_snapshot || <span className="text-slate-400 italic">No Task Linked</span>}
                                </td>
                                <td className="py-3 font-bold text-center text-primary">{log.hours_spent}</td>
                                <td className="py-3 pl-4 text-slate-505 text-xs max-w-xs truncate" title={log.remarks || ''}>
                                  {log.remarks || <span className="text-slate-400 italic">No remarks</span>}
                                </td>
                                <td className="py-3 text-right text-xs text-slate-400">
                                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {mode === 'report' && reportKPIs && (
            <div className="space-y-6 animate-fadeIn">
              {/* KPI Cards Grid */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submissions</span>
                      <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
                    </div>
                    <span className="text-2xl md:text-3xl font-extrabold text-slate-955 mt-2 block">{reportKPIs.totalSubmitted}</span>
                  </div>
                  <span className="text-xs text-slate-400 mt-2">out of {reportKPIs.totalExpected} expected submissions</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending</span>
                      <span className="material-symbols-outlined text-rose-500 text-[20px]">pending</span>
                    </div>
                    <span className="text-2xl md:text-3xl font-extrabold text-rose-600 mt-2 block">{reportKPIs.totalMissing}</span>
                  </div>
                  <span className="text-xs text-slate-400 mt-2">submissions missing</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submit Rate</span>
                      <span className="material-symbols-outlined text-primary text-[20px]">percent</span>
                    </div>
                    <span className="text-2xl md:text-3xl font-extrabold mt-2 block text-primary">{reportKPIs.avgSubmitRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        reportKPIs.avgSubmitRate >= 80 ? 'bg-emerald-500' : reportKPIs.avgSubmitRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, reportKPIs.avgSubmitRate)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logged Hours</span>
                      <span className="material-symbols-outlined text-violet-500 text-[20px]">schedule</span>
                    </div>
                    <span className="text-2xl md:text-3xl font-extrabold text-slate-955 mt-2 block">{reportKPIs.totalHours} hrs</span>
                  </div>
                  <span className="text-xs text-slate-400 mt-2">avg {reportKPIs.avgHoursPerSubmission} hrs/submission</span>
                </div>
              </section>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div id="line-chart-container" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 text-sm">Submission Trend</h3>
                    <button
                      onClick={() => downloadChartImage('line-chart-container', `Team_Submission_Trend_${startDate}_to_${endDate}.png`)}
                      className="text-xs font-bold hover:opacity-85 flex items-center gap-1 transition cursor-pointer text-primary"
                    >
                      <span className="material-symbols-outlined text-[16px] block">image</span>
                      <span>Export PNG</span>
                    </button>
                  </div>
                  <div className="h-72 w-full text-xs">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="formattedDate" stroke="#94A3B8" tickLine={false} />
                          <YAxis stroke="#94A3B8" tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#E2E8F0',
                              borderRadius: '12px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                          />
                          <Legend verticalAlign="top" height={36} />
                          <Line type="monotone" dataKey="Submitted" stroke="#10B981" strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="Not Submitted" stroke="#EF4444" strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl">Loading chart...</div>
                    )}
                  </div>
                </div>

                <div id="pie-chart-container" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Overall Breakdown</h3>
                      <p className="text-xs text-slate-400">Team status in selected range</p>
                    </div>
                    <button
                      onClick={() => downloadChartImage('pie-chart-container', `Team_Overall_Submission_Breakdown_${startDate}_to_${endDate}.png`)}
                      className="text-xs font-bold hover:opacity-85 flex items-center gap-1 transition cursor-pointer text-primary"
                    >
                      <span className="material-symbols-outlined text-[16px] block">image</span>
                      <span>Export PNG</span>
                    </button>
                  </div>
                  <div className="h-48 w-full relative flex items-center justify-center">
                    {mounted ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#FFFFFF',
                                borderColor: '#E2E8F0',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-extrabold text-slate-805">{reportKPIs.avgSubmitRate}%</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg Rate</span>
                        </div>
                      </>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl">Loading chart...</div>
                    )}
                  </div>
                  <div className="flex justify-around text-xs mt-2 border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-655 font-medium">Submitted ({reportKPIs.totalSubmitted})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-550" />
                      <span className="text-slate-655 font-medium">Pending ({reportKPIs.totalMissing})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employee Summary Table */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-50">
                  <h3 className="font-bold text-slate-900 leading-tight">Team Submission Details</h3>
                  <p className="text-xs text-slate-550 mt-1">Detailed submission rates and logs analysis for your team members.</p>
                </div>

                {filteredReportEmployeeRows.length === 0 ? (
                  <div className="p-12 text-center">
                    <span className="material-symbols-outlined text-slate-300 text-[48px] mb-2 block">group</span>
                    <h4 className="text-sm font-bold text-slate-800">No team members found</h4>
                    <p className="text-xs text-slate-505 mt-1">No team records found matching selection for this period.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm border-collapse">
                      <thead>
                        <tr className="text-slate-450 text-xs uppercase font-bold tracking-wider border-b border-slate-100 bg-slate-50/70">
                          <th className="py-3 px-5">Employee Info</th>
                          <th className="py-3 px-4 text-center">Days Submitted</th>
                          <th className="py-3 px-4 text-center">Days Pending</th>
                          <th className="py-3 px-4">Submission Rate</th>
                          <th className="py-3 px-4 text-right">Total Hours Logged</th>
                          <th className="py-3 px-5 text-right">Avg Hours/Submitted Day</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredReportEmployeeRows.map((row) => {
                          let rateTone = 'red';
                          if (row.submissionRate >= 80) {
                            rateTone = 'emerald';
                          } else if (row.submissionRate >= 50) {
                            rateTone = 'amber';
                          }

                          return (
                            <tr key={row.employeeId} className="text-slate-700 hover:bg-slate-50/40 transition duration-150">
                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs"
                                    style={row.submittedDays > 0 ? { backgroundColor: 'rgba(66, 111, 191, 0.1)', color: 'rgb(66, 111, 191)' } : { backgroundColor: '#F1F5F9', color: '#94A3B8' }}
                                  >
                                    {row.employeeName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-900 block leading-tight">{row.employeeName}</span>
                                    <span className="text-xs text-slate-400 mt-0.5 block">{row.employeeCode || 'No Employee Code'} • {row.employeeEmail}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-center font-semibold text-slate-800">{row.submittedDays}</td>

                              <td className="py-3.5 px-4 text-center font-semibold text-slate-400">{row.missingDays}</td>

                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    rateTone === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
                                    rateTone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                                  }`}>
                                    {row.submissionRate}%
                                  </span>
                                  <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                    <div
                                      className={`h-full rounded-full ${
                                        rateTone === 'emerald' ? 'bg-emerald-500' :
                                        rateTone === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${row.submissionRate}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-right font-bold text-slate-900">{row.totalHours} hrs</td>

                              <td className="py-3.5 px-5 text-right font-semibold text-primary">{row.avgHoursPerSubmittedDay} hrs</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
