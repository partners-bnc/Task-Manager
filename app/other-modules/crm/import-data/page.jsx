"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Columns3,
  Database,
  Download,
  Eye,
  Loader2,
  RefreshCw,
  Rows3,
} from "lucide-react";
import { useCrm } from "../context/CrmContext";

const DEFAULT_LIMITS = [25, 50, 100, 250, 500];

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function normalizeTableState(tables) {
  return Object.fromEntries(
    tables.map((table) => [
      table.name,
      {
        selected: (table.rowCount ?? 0) > 0,
        limit: 25,
        offset: 0,
        columns: table.defaultColumns?.length ? table.defaultColumns : table.columns.map((column) => column.name),
      },
    ])
  );
}

function selectedCount(tableState) {
  return Object.values(tableState).filter((table) => table.selected).length;
}

export default function ImportDataPage() {
  const { currentUser, refreshCrmData } = useCrm();
  const [metadata, setMetadata] = useState(null);
  const [tableState, setTableState] = useState({});
  const [previews, setPreviews] = useState({});
  const [latestImported, setLatestImported] = useState({ followups: [], leads: [] });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState(null);

  const isAdmin = currentUser.role === "admin";

  const selectedTablePayload = useMemo(() => {
    if (!metadata?.tables) return [];
    return metadata.tables
      .filter((table) => tableState[table.name]?.selected)
      .map((table) => ({
        name: table.name,
        limit: tableState[table.name]?.limit ?? 25,
        offset: tableState[table.name]?.offset ?? 0,
        columns: tableState[table.name]?.columns ?? table.defaultColumns,
      }));
  }, [metadata, tableState]);

  const loadMetadata = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");

    try {
      const response = await fetch("/other-modules/crm/api/import-data");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load import metadata");

      setMetadata(data);
      setLatestImported(data.latestImported || { followups: [], leads: [] });
      setLastRefreshAt(new Date());
      setTableState((current) => {
        if (Object.keys(current).length) return current;
        return normalizeTableState(data.tables || []);
      });
    } catch (loadError) {
      setError(loadError.message || "Could not load import metadata");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadMetadata();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMetadata]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadMetadata({ quiet: true });
    }, 7000);
    return () => window.clearInterval(timer);
  }, [loadMetadata]);

  const updateTable = (tableName, patch) => {
    setTableState((current) => ({
      ...current,
      [tableName]: {
        ...current[tableName],
        ...patch,
      },
    }));
  };

  const toggleColumn = (tableName, columnName, requiredColumns) => {
    if (requiredColumns.includes(columnName)) return;
    setTableState((current) => {
      const table = current[tableName];
      const columns = table.columns.includes(columnName)
        ? table.columns.filter((column) => column !== columnName)
        : [...table.columns, columnName];

      return {
        ...current,
        [tableName]: {
          ...table,
          columns: [...new Set([...requiredColumns, ...columns])],
        },
      };
    });
  };

  const setAllTables = (checked) => {
    setTableState((current) =>
      Object.fromEntries(Object.entries(current).map(([name, state]) => [name, { ...state, selected: checked }]))
    );
  };

  const setTableColumns = (tableName, columns) => {
    setTableState((current) => ({
      ...current,
      [tableName]: {
        ...current[tableName],
        columns,
      },
    }));
  };

  const previewRows = async () => {
    if (!selectedTablePayload.length) return;
    setPreviewing(true);
    setError("");

    try {
      const response = await fetch("/other-modules/crm/api/import-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "preview",
          tables: selectedTablePayload,
          currentUser: { role: currentUser.role },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Preview failed");

      setPreviews(data.previews || {});
      setLatestImported(data.latestImported || latestImported);
    } catch (previewError) {
      setError(previewError.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const importRows = async () => {
    if (!selectedTablePayload.length) return;
    setImporting(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/other-modules/crm/api/import-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "import",
          tables: selectedTablePayload,
          currentUser: { role: currentUser.role },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 207) throw new Error(data.error || "Import failed");

      setResult(data);
      setLatestImported(data.latestImported || latestImported);
      setPreviews((current) => {
        const next = { ...current };
        Object.keys(data.tables || {}).forEach((tableName) => {
          delete next[tableName];
        });
        return next;
      });
      setTableState((current) => {
        const next = { ...current };
        Object.entries(data.tables || {}).forEach(([tableName, tableResult]) => {
          if (!next[tableName]) return;
          next[tableName] = {
            ...next[tableName],
            offset: tableResult.nextOffset ?? next[tableName].offset,
          };
        });
        return next;
      });
      await refreshCrmData();
      await loadMetadata({ quiet: true });
    } catch (importError) {
      setError(importError.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-slate-800 dark:text-slate-100">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 text-xl font-semibold">Administrator access required</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Only admin users can import source project data into CRM tables.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 text-slate-800 transition-colors duration-300 dark:text-slate-100 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold dark:text-white">Import Partner Data</h1>
          </div>
          <p className="mt-2 max-w-4xl text-sm text-slate-600 dark:text-slate-400">
            Pull selected batches from the partner Supabase project into CRM leads and follow-ups. The importer stores selected source columns in
            <span className="font-semibold text-slate-800 dark:text-slate-200"> source_payload</span> and uses source identity to avoid duplicate CRM rows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadMetadata()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={previewRows}
            disabled={previewing || importing || selectedTablePayload.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
          >
            {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Preview Batch
          </button>
          <button
            type="button"
            onClick={importRows}
            disabled={importing || previewing || selectedTablePayload.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Import Selected
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Source project</div>
          <div className="mt-2 truncate text-lg font-bold">{metadata?.sourceProjectRef || "loading"}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Target CRM</div>
          <div className="mt-2 truncate text-lg font-bold">{metadata?.targetProjectRef || "loading"}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Selected tables</div>
          <div className="mt-2 text-lg font-bold">{selectedCount(tableState)} of {metadata?.tables?.length || 0}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Live refresh</div>
          <div className="mt-2 text-sm font-semibold">{lastRefreshAt ? lastRefreshAt.toLocaleTimeString() : "Waiting"}</div>
        </div>
      </div>

      {result && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Imported {result.imported ?? 0} source rows. {result.skipped ? `${result.skipped} skipped.` : ""}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(result.tables || {}).map(([tableName, tableResult]) => (
              <div key={tableName} className="rounded-md border border-emerald-200 bg-white/70 px-3 py-2 dark:border-emerald-900 dark:bg-slate-900/30">
                <div className="font-semibold">{tableName}</div>
                <div className="mt-1 text-xs">
                  fetched {tableResult.fetched}, imported {tableResult.imported}, next offset {tableResult.nextOffset}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold dark:text-white">Source Tables</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAllTables(true)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setAllTables(false)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-5">
          {(metadata?.tables || []).map((table) => {
            const state = tableState[table.name] || {};
            const preview = previews[table.name];
            const requiredColumns = table.requiredColumns || [];
            const selectedColumns = state.columns || [];

            return (
              <section key={table.name} className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="border-b border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <label className="flex min-w-0 items-start gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(state.selected)}
                        onChange={(event) => updateTable(table.name, { selected: event.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-bold dark:text-white">{table.label}</span>
                          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{table.name}</span>
                          <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{table.rowCount ?? 0} source rows</span>
                        </span>
                        <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{table.description}</span>
                        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <ChevronRight className="h-3 w-3" />
                          Target: {table.targetTables?.join(" + ")}
                        </span>
                      </span>
                    </label>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Rows
                        <select
                          value={state.limit ?? 25}
                          onChange={(event) => updateTable(table.name, { limit: Number(event.target.value) })}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          {DEFAULT_LIMITS.map((limit) => (
                            <option key={limit} value={limit}>{limit}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Offset
                        <input
                          type="number"
                          min="0"
                          value={state.offset ?? 0}
                          onChange={(event) => updateTable(table.name, { offset: Math.max(Number(event.target.value) || 0, 0) })}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </label>
                      <div className="rounded-md border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                        <Rows3 className="mb-1 h-4 w-4 text-slate-500" />
                        Next batch starts at {state.offset ?? 0}
                      </div>
                      <div className="rounded-md border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                        <Columns3 className="mb-1 h-4 w-4 text-slate-500" />
                        {selectedColumns.length} columns selected
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Columns to import</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTableColumns(table.name, [...new Set([...requiredColumns, ...(table.defaultColumns || [])])])}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                      >
                        Defaults
                      </button>
                      <button
                        type="button"
                        onClick={() => setTableColumns(table.name, table.columns.map((column) => column.name))}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                      >
                        All columns
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {table.columns.map((column) => {
                      const required = requiredColumns.includes(column.name);
                      const checked = selectedColumns.includes(column.name);
                      return (
                        <label key={column.name} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={required}
                            onChange={() => toggleColumn(table.name, column.name, requiredColumns)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className="min-w-0 flex-1 truncate">{column.name}</span>
                          <span className="shrink-0 text-xs text-slate-400">{required ? "key" : column.type}</span>
                        </label>
                      );
                    })}
                  </div>

                  {preview && (
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Batch preview</h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {preview.rows?.length || 0} rows, next offset {preview.nextOffset}
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-700">
                          <thead className="bg-slate-50 dark:bg-slate-900/70">
                            <tr>
                              {(preview.columns || selectedColumns).map((column) => (
                                <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">{column}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
                            {(preview.rows || []).map((row, index) => (
                              <tr key={`${table.name}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/60">
                                {(preview.columns || selectedColumns).map((column) => (
                                  <td key={column} className="max-w-xs truncate px-3 py-2 text-slate-600 dark:text-slate-300" title={formatValue(row[column])}>
                                    {formatValue(row[column])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            {!preview.rows?.length && (
                              <tr>
                                <td colSpan={(preview.columns || selectedColumns).length || 1} className="px-3 py-4 text-center text-slate-500">
                                  No rows in this batch.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold dark:text-white">Imported CRM Data</h2>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Auto-refreshes every 7 seconds</span>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Latest follow-ups</h3>
            <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/70">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Source row</th>
                    <th className="px-3 py-2">Synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {(latestImported.followups || []).map((row) => (
                    <tr key={row.id}>
                      <td className="max-w-xs truncate px-3 py-2">{row.title}</td>
                      <td className="px-3 py-2">{row.type}</td>
                      <td className="px-3 py-2">{row.source_table}:{row.source_row_id}</td>
                      <td className="px-3 py-2">{row.last_synced_at ? new Date(row.last_synced_at).toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                  {!latestImported.followups?.length && (
                    <tr><td colSpan="4" className="px-3 py-4 text-center text-slate-500">No imported follow-ups yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Latest leads</h3>
            <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/70">
                  <tr>
                    <th className="px-3 py-2">Company</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Source row</th>
                    <th className="px-3 py-2">Synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {(latestImported.leads || []).map((row) => (
                    <tr key={row.id}>
                      <td className="max-w-xs truncate px-3 py-2">{row.company}</td>
                      <td className="px-3 py-2">{row.contact}</td>
                      <td className="px-3 py-2">{row.source_table}:{row.source_row_id}</td>
                      <td className="px-3 py-2">{row.last_synced_at ? new Date(row.last_synced_at).toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                  {!latestImported.leads?.length && (
                    <tr><td colSpan="4" className="px-3 py-4 text-center text-slate-500">No imported leads yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
