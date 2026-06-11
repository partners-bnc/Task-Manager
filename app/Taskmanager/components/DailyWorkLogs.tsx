'use client';

import React, { useEffect, useState, useMemo } from 'react';

interface LogEntry {
  id: string;
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

export default function DailyWorkLogs() {
  const [mode, setMode] = useState<'daily' | 'individual'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data from API
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [dailyRows, setDailyRows] = useState<EmployeeRow[]>([]);
  const [individualLogs, setIndividualLogs] = useState<LogEntry[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);

  // Fetch work logs
  useEffect(() => {
    let active = true;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        let url = `/HRM/api/admin/work-log?mode=${mode}`;
        if (mode === 'daily') {
          url += `&date=${selectedDate}`;
        } else {
          url += `&employeeId=${selectedEmployeeId}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch work logs');
        }

        if (!active) return;

        setEmployeeOptions(data.employeeOptions || []);

        if (mode === 'daily') {
          setDailyRows(data.rows || []);
        } else {
          setIndividualLogs(data.logs || []);
          setSelectedEmployee(data.selectedEmployee || null);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'An error occurred while loading work logs');
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
  }, [mode, selectedDate, selectedEmployeeId]);

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

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-7xl">
        
        {/* Header Section */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-sm">
                <span className="material-symbols-outlined text-[24px]">assignment</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Daily Work Log</h1>
                <p className="text-sm text-slate-500 mt-0.5">Track, audit, and inspect work log submissions across all employees.</p>
              </div>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-slate-200/60 p-1.5 rounded-xl self-start md:self-center">
            <button
              onClick={() => {
                setMode('daily');
                setSearchQuery('');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                mode === 'daily'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
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
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Employee History
            </button>
          </div>
        </header>

        {/* Stats summary (Only for Day-Wise Audit) */}
        {mode === 'daily' && stats && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Logged Hours</span>
              <span className="text-2xl md:text-3xl font-extrabold text-slate-950 mt-2">{stats.totalHours} hrs</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submitted Logs</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl md:text-3xl font-extrabold text-emerald-600">{stats.submittedCount}</span>
                <span className="text-sm text-slate-400">/ {stats.totalEmployees} employees</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Not Submitted</span>
              <span className="text-2xl md:text-3xl font-extrabold text-rose-600 mt-2">{stats.missingCount}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Hours/Employee</span>
              <span className="text-2xl md:text-3xl font-extrabold text-indigo-600 mt-2">
                {stats.submittedCount > 0 ? (Math.round((stats.totalHours / stats.submittedCount) * 10) / 10) : 0} hrs
              </span>
            </div>
          </section>
        )}

        {/* Filters and Search Bar */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {mode === 'daily' ? (
              <>
                {/* Date Selection */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={() => changeDate(-1)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
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
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
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
                    placeholder="Search employee name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </>
            ) : (
              /* Employee Selection Dropdown */
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 sm:w-28">Select Employee</span>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full sm:w-80 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-semibold"
                >
                  <option value="" disabled>Choose an employee...</option>
                  {employeeOptions.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.employeeId ? `(${emp.employeeId})` : ''}
                    </option>
                  ))}
                </select>
                {selectedEmployee && (
                  <div className="text-xs text-slate-500 sm:ml-auto">
                    Showing logs for: <span className="font-semibold text-slate-800">{selectedEmployee.email}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        {/* Content Area */}
        {loading ? (
          /* Premium Shimmer Skeleton */
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/6" />
                  </div>
                </div>
                <div className="h-24 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          /* Main Tables/Cards lists */
          <div>
            {mode === 'daily' ? (
              filteredDailyRows.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                  <span className="material-symbols-outlined text-slate-300 text-[48px] mb-2 block">assignment_late</span>
                  <h3 className="text-base font-bold text-slate-800">No logs found</h3>
                  <p className="text-sm text-slate-500 mt-1">No employee matches the search criteria.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDailyRows.map((row) => {
                    const hasLogs = row.logs.length > 0;
                    return (
                      <div
                        key={row.employeeId}
                        className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition duration-200 ${
                          hasLogs ? 'hover:shadow-md' : 'opacity-80'
                        }`}
                      >
                        {/* Employee Row Header */}
                        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm text-slate-600 ${
                              hasLogs ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'
                            }`}>
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

                        {/* Employee Log Details */}
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
                                    <tr key={log.id} className="text-slate-700">
                                      <td className="py-3 font-semibold text-slate-900">{log.client_name}</td>
                                      <td className="py-3 text-slate-600">
                                        {log.task_name_snapshot || <span className="text-slate-400 italic">No Task Linked</span>}
                                      </td>
                                      <td className="py-3 font-bold text-center text-indigo-600">{log.hours_spent}</td>
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
            ) : (
              /* Individual Employee History mode */
              !selectedEmployeeId ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                  <span className="material-symbols-outlined text-slate-300 text-[48px] mb-2 block">person</span>
                  <h3 className="text-base font-bold text-slate-800">Select an Employee</h3>
                  <p className="text-sm text-slate-500 mt-1">Please select an employee from the dropdown above to view their logs.</p>
                </div>
              ) : groupedIndividualLogs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                  <span className="material-symbols-outlined text-slate-300 text-[48px] mb-2 block">assignment_late</span>
                  <h3 className="text-base font-bold text-slate-800">No logs logged</h3>
                  <p className="text-sm text-slate-500 mt-1">No daily work log entries found for this employee.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedIndividualLogs.map((group) => (
                    <div key={group.date} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      {/* Date Header */}
                      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {new Date(`${group.date}T00:00:00`).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                          Total: {group.totalHours} hrs
                        </span>
                      </div>

                      {/* Logs for this Date */}
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
                                  <td className="py-3 font-bold text-center text-indigo-600">{log.hours_spent}</td>
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
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
