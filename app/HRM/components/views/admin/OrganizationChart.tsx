'use client';

import Image from 'next/image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import HrmEmptyState from '../../ui/HrmEmptyState';
import { LoadingPanel, Skeleton } from '../../ui/Skeleton';

type OrgChartNode = {
  id: string;
  entityId: string;
  kind: 'super_admin' | 'employee' | 'group';
  name: string;
  employeeId: string | null;
  title: string;
  avatarUrl: string | null;
  parentId: string | null;
  childIds: string[];
  directReportCount: number;
  status?: string | null;
  departmentName?: string;
  reportingManagerId?: string | null;
  reportingSuperAdminId?: string | null;
  departmentId?: string | null;
};

type OrgChartResponse = {
  success: boolean;
  roots: string[];
  nodes: OrgChartNode[];
  metadata?: {
    rootCount?: number;
    superAdminCount?: number;
    employeeCount?: number;
    reportingSuperAdminSupported?: boolean;
    generatedAt?: string;
  };
};

const MIN_ZOOM = 0.65;
const MAX_ZOOM = 1.45;
const ZOOM_STEP = 0.1;

function formatWorkspaceDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

function buildStatusTone(node: OrgChartNode, isHighlighted: boolean) {
  if (isHighlighted) {
    return 'border-violet-400 bg-violet-50 shadow-[0_18px_44px_rgba(139,92,246,0.16)]';
  }

  if (node.kind === 'employee' && String(node.status || '').toLowerCase() === 'separated') {
    return 'border-rose-300 bg-[linear-gradient(180deg,#fff4f4_0%,#ffe1e1_100%)] shadow-[0_18px_40px_rgba(190,24,93,0.08)]';
  }

  if (node.kind === 'super_admin') {
    return 'border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#eef4ff_100%)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]';
  }

  if (node.kind === 'group') {
    return 'border-amber-200 bg-amber-50';
  }

  return 'border-outline-variant/20 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)]';
}

function Avatar({ node }: { node: OrgChartNode }) {
  if (node.avatarUrl) {
    return (
      <Image
        alt={node.name}
        className="h-12 w-12 rounded-2xl object-cover ring-1 ring-slate-200"
        src={node.avatarUrl}
        width={48}
        height={48}
        unoptimized
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
      <span className="material-symbols-outlined text-[22px]">
        {node.kind === 'super_admin' ? 'shield_person' : node.kind === 'group' ? 'warning' : 'person'}
      </span>
    </div>
  );
}

function CountBadge({ count, isActive = false }: { count: number; isActive?: boolean }) {
  if (!count) {
    return null;
  }

  return (
    <span
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-[11px] font-semibold ${
        isActive
          ? 'border-violet-300 bg-violet-50 text-violet-700'
          : 'border-slate-200 bg-white text-slate-600'
      }`}
    >
      {count}
    </span>
  );
}

function OrgNodeCard({
  node,
  registerNodeRef,
  onToggle,
  hasChildren,
  showChildren,
  isHighlighted,
}: {
  node: OrgChartNode;
  registerNodeRef: (nodeId: string, element: HTMLButtonElement | null) => void;
  onToggle: (nodeId: string) => void;
  hasChildren: boolean;
  showChildren: boolean;
  isHighlighted: boolean;
}) {
  return (
    <button
      ref={(element) => {
        registerNodeRef(node.id, element);
      }}
      type="button"
      onClick={() => {
        if (hasChildren) {
          onToggle(node.id);
        }
      }}
      className={`group relative w-[260px] rounded-[28px] border px-4 py-4 text-left transition-all ${buildStatusTone(node, isHighlighted)} ${
        hasChildren ? 'cursor-pointer hover:-translate-y-0.5 hover:border-violet-300' : 'cursor-default'
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar node={node} />
        <div className="min-w-0 flex-1">
          <div className="min-w-0">
            <p className="truncate text-[17px] font-bold text-slate-900">{node.name}</p>
            <p className="mt-1 truncate text-sm font-medium text-slate-500">{node.title}</p>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            <span>{node.kind === 'super_admin' ? 'Executive' : node.kind === 'group' ? 'Fallback Group' : 'Employee'}</span>
            {node.employeeId ? <span className="truncate tracking-[0.14em] text-slate-500">{node.employeeId}</span> : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function TreeNode({
  nodeId,
  nodes,
  expandedNodeIds,
  highlightedNodeIds,
  registerNodeRef,
  onToggle,
  depth = 0,
}: {
  nodeId: string;
  nodes: Map<string, OrgChartNode>;
  expandedNodeIds: Set<string>;
  highlightedNodeIds: Set<string>;
  registerNodeRef: (nodeId: string, element: HTMLButtonElement | null) => void;
  onToggle: (nodeId: string) => void;
  depth?: number;
}) {
  const node = nodes.get(nodeId);

  if (!node) {
    return null;
  }

  const hasChildren = node.childIds.length > 0;
  const showChildren = hasChildren && (depth === 0 || expandedNodeIds.has(nodeId));
  const isHighlighted = highlightedNodeIds.has(nodeId);

  return (
    <div className="flex flex-col items-center">
      <OrgNodeCard
        node={node}
        registerNodeRef={registerNodeRef}
        onToggle={onToggle}
        hasChildren={hasChildren}
        showChildren={showChildren}
        isHighlighted={isHighlighted}
      />

      {hasChildren ? (
        <button
          type="button"
          onClick={() => onToggle(nodeId)}
          className="mt-3 inline-flex flex-col items-center gap-2 text-center"
        >
          <div className="h-4 w-[2px] bg-slate-400" />
          <CountBadge count={node.directReportCount} isActive={showChildren} />
        </button>
      ) : null}

      {showChildren ? (
        <div className="mt-3 flex w-full flex-col items-center">
          <div className="h-5 w-[2px] bg-slate-400" />
          <div className="relative">
            {node.childIds.length > 1 ? (
              <div className="absolute left-12 right-12 top-0 h-[2px] bg-slate-400" />
            ) : null}
            <div className="flex items-start justify-center gap-6 px-2 pt-0">
              {node.childIds.map((childId) => (
                <div key={childId} className="flex flex-col items-center">
                  <div className="h-5 w-[2px] bg-slate-400" />
                  <TreeNode
                    nodeId={childId}
                    nodes={nodes}
                    expandedNodeIds={expandedNodeIds}
                    highlightedNodeIds={highlightedNodeIds}
                    registerNodeRef={registerNodeRef}
                    onToggle={onToggle}
                    depth={depth + 1}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function OrganizationChart({
  apiPath = '/HRM/api/admin/organization-chart',
}: {
  apiPath?: string;
}) {
  const todayLabel = useMemo(() => formatWorkspaceDate(new Date()), []);
  const [data, setData] = useState<OrgChartResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [viewMode, setViewMode] = useState<'reporting' | 'department'>('reporting');
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([]);
  const [dragState, setDragState] = useState<{
    active: boolean;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const topClusterRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    let active = true;

    async function loadOrganizationChart() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(apiPath, { method: 'GET' });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || 'Failed to load organization chart');
        }

        if (!active) {
          return;
        }

        setData(result);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load organization chart');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadOrganizationChart();

    return () => {
      active = false;
    };
  }, [apiPath]);

  const nodes = useMemo(
    () => new Map((data?.nodes || []).map((node) => [node.id, node])),
    [data]
  );

  const searchMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return Array.from(nodes.values())
      .filter((node) => {
        const haystack = `${node.name} ${node.employeeId || ''} ${node.title}`.toLowerCase();
        return haystack.includes(query);
      })
      .map((node) => node.id);
  }, [nodes, searchQuery]);

  const highlightedNodeIds = useMemo(() => new Set(searchMatches), [searchMatches]);

  const searchExpandedNodeIds = useMemo(() => {
    const expanded = new Set<string>();

    searchMatches.forEach((nodeId) => {
      let currentId = nodes.get(nodeId)?.parentId || null;

      while (currentId) {
        expanded.add(currentId);
        currentId = nodes.get(currentId)?.parentId || null;
      }
    });

    return expanded;
  }, [nodes, searchMatches]);

  const effectiveExpandedNodeIds = useMemo(() => {
    const expanded = new Set(expandedNodeIds);

    searchExpandedNodeIds.forEach((nodeId) => {
      expanded.add(nodeId);
    });

    return expanded;
  }, [expandedNodeIds, searchExpandedNodeIds]);

  const filteredRoots = useMemo(() => {
    return (data?.roots || []).filter((id) => !id.startsWith('group:'));
  }, [data?.roots]);

  const rootChildIds = useMemo(() => {
    const ids = new Set<string>();

    filteredRoots.forEach((rootId) => {
      const rootNode = nodes.get(rootId);
      (rootNode?.childIds || []).forEach((childId) => ids.add(childId));
    });

    return Array.from(ids).sort((leftId, rightId) => {
      const left = nodes.get(leftId);
      const right = nodes.get(rightId);
      return String(left?.name || '').localeCompare(String(right?.name || ''), 'en', { sensitivity: 'base' });
    });
  }, [filteredRoots, nodes]);

  // Group employees by department for Department View
  const departmentData = useMemo(() => {
    if (!data?.nodes) return [];

    // Filter out super admins and group nodes
    const allEmployees = data.nodes.filter(node => node.kind === 'employee');

    // Get all unique departments
    const departments = Array.from(new Set(allEmployees.map(node => node.departmentName || 'Other')));

    return departments.map(deptName => {
      const deptEmployees = allEmployees.filter(node => (node.departmentName || 'Other') === deptName);

      // Find roots for this department:
      // Employees in this department who either have no manager, or their manager is outside this department (or is a super admin).
      const deptRoots = deptEmployees.filter(emp => {
        if (!emp.reportingManagerId) return true;
        const managerNodeId = `employee:${emp.reportingManagerId}`;
        const manager = nodes.get(managerNodeId);
        return !manager || manager.departmentName !== deptName;
      }).map(emp => emp.id);

      // Create a filtered nodes map for this department where children are restricted to the same department
      const deptNodesMap = new Map<string, OrgChartNode>();
      data.nodes.forEach(node => {
        if (node.kind === 'super_admin') {
          deptNodesMap.set(node.id, node);
        } else {
          // Filter children to only same-department employees
          const filteredChildren = (node.childIds || []).filter(childId => {
            const childNode = nodes.get(childId);
            return childNode && childNode.departmentName === deptName;
          });
          deptNodesMap.set(node.id, {
            ...node,
            childIds: filteredChildren,
            directReportCount: filteredChildren.length
          });
        }
      });

      return {
        name: deptName,
        roots: deptRoots,
        nodesMap: deptNodesMap,
        count: deptEmployees.length
      };
    }).sort((a, b) => b.count - a.count); // Show departments with most members first
  }, [data?.nodes, nodes]);

  useEffect(() => {
    if (!searchMatches.length) {
      return;
    }

    const firstMatchId = searchMatches[0];
    const element = nodeRefs.current[firstMatchId];

    if (!element) {
      return;
    }

    const timer = window.setTimeout(() => {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchMatches]);

  useEffect(() => {
    if (!data?.roots?.length || searchQuery.trim()) {
      return;
    }

    const viewport = viewportRef.current;
    const cluster = topClusterRef.current;

    if (!viewport || !cluster) {
      return;
    }

    const timer = window.setTimeout(() => {
      const viewportRect = viewport.getBoundingClientRect();
      const clusterRect = cluster.getBoundingClientRect();

      const nextScrollLeft =
        viewport.scrollLeft +
        (clusterRect.left - viewportRect.left) -
        Math.max(0, (viewport.clientWidth - clusterRect.width) / 2);

      viewport.scrollTo({
        left: Math.max(0, nextScrollLeft),
        top: 0,
        behavior: 'smooth',
      });
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [data?.roots, searchQuery, zoom]);

  function handleToggle(nodeId: string) {
    setExpandedNodeIds((current) =>
      current.includes(nodeId) ? current.filter((item) => item !== nodeId) : [...current, nodeId]
    );
  }

  function registerNodeRef(nodeId: string, element: HTMLButtonElement | null) {
    nodeRefs.current = {
      ...nodeRefs.current,
      [nodeId]: element,
    };
  }

  function handleZoom(nextZoom: number) {
    setZoom(clampZoom(nextZoom));
  }

  function handleViewportMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (!viewportRef.current) {
      return;
    }

    setDragState({
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    });
  }

  function handleViewportMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!dragState.active || !viewportRef.current) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    viewportRef.current.scrollLeft = dragState.scrollLeft - deltaX;
    viewportRef.current.scrollTop = dragState.scrollTop - deltaY;
  }

  function endDragging() {
    setDragState((current) => (current.active ? { ...current, active: false } : current));
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    handleZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }

  const peopleSummary = `${data?.metadata?.employeeCount || 0} employees • ${data?.metadata?.superAdminCount || 0} super admins`;

  return (
    <div className="space-y-4 px-0 pt-3 pb-0">
      <section className="flex flex-col gap-2 px-6 pt-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <span className="material-symbols-outlined text-[18px]">account_tree</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-headline font-bold tracking-tight text-on-background">
              Organization Chart
            </h1>
            <p className="mt-1 text-xs text-on-surface-variant">Today: {todayLabel}</p>
          </div>
        </div>

        <div className="pt-1 text-right lg:pr-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            Live Reporting View
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">{peopleSummary}</p>
        </div>
      </section>

      <section className="space-y-2 px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
            <label className="relative block w-full max-w-lg">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
                search
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Find by employee name or ID"
                className="h-11 w-full rounded-lg border border-black bg-transparent pl-11 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-black"
              />
            </label>

            {/* View Mode Toggle */}
            <div className="relative inline-grid grid-cols-2 items-center overflow-hidden rounded-xl bg-slate-100 p-1 shadow-[inset_0_1px_1px_rgba(148,163,184,0.05)] w-72 h-11">
              {/* Sliding background */}
              <div
                className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-lg bg-white shadow-sm border border-slate-200/50 transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(${viewMode === 'department' ? '100%' : '0%'})`
                }}
              />
              <button
                type="button"
                onClick={() => setViewMode('reporting')}
                className={`relative z-10 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  viewMode === 'reporting'
                    ? 'text-violet-950'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">account_tree</span>
                Reporting Tree
              </button>
              <button
                type="button"
                onClick={() => setViewMode('department')}
                className={`relative z-10 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  viewMode === 'department'
                    ? 'text-violet-950'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">schema</span>
                Dept Hierarchy
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1 lg:justify-end lg:pr-6">
            <button
              type="button"
              onClick={() => handleZoom(zoom - ZOOM_STEP)}
              className="inline-flex h-11 items-center gap-2 border border-black px-3 text-sm font-semibold text-slate-700 transition hover:text-black"
            >
              <span className="material-symbols-outlined text-[18px]">zoom_out</span>
              Zoom Out
            </button>
            <button
              type="button"
              onClick={() => handleZoom(1)}
              className="inline-flex h-11 items-center border border-black px-3 text-sm font-semibold text-slate-700 transition hover:text-black"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => handleZoom(zoom + ZOOM_STEP)}
              className="inline-flex h-11 items-center gap-2 border border-black px-3 text-sm font-semibold text-slate-700 transition hover:text-black"
            >
              <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              Zoom In
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden p-0">
        {isLoading ? (
          <div className="space-y-6 rounded-[1.5rem] border border-dashed border-outline-variant/25 bg-surface p-8">
            <LoadingPanel
              title="Building organization chart"
              message="Reporting lines, teams, and hierarchy branches are being assembled."
              className="border-none bg-transparent px-0 py-0 shadow-none"
            />
            <div className="flex flex-col items-center gap-8">
              <Skeleton className="h-28 w-64 rounded-[28px]" />
              <div className="h-8 w-px bg-slate-200" />
              <div className="flex flex-wrap justify-center gap-6">
                <Skeleton className="h-24 w-56 rounded-[28px]" />
                <Skeleton className="h-24 w-56 rounded-[28px]" />
                <Skeleton className="h-24 w-56 rounded-[28px]" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex min-h-[520px] items-center justify-center rounded-[1.5rem] border border-rose-200 bg-rose-50 p-6 text-center">
            <div className="space-y-2">
              <p className="text-lg font-semibold text-rose-700">Unable to load organization chart</p>
              <p className="text-sm text-rose-600">{error}</p>
            </div>
          </div>
        ) : !data?.roots?.length ? (
          <div className="flex min-h-[520px] items-center justify-center rounded-[1.5rem] border border-dashed border-outline-variant/25 bg-surface p-6 text-center">
            <div className="w-full max-w-lg">
              <HrmEmptyState
                icon="account_tree"
                title="No reporting data available yet"
                message="Add employees and reporting relationships to start building the organization tree here."
              />
            </div>
          </div>
        ) : (
          <div
            ref={viewportRef}
            onMouseDown={handleViewportMouseDown}
            onMouseMove={handleViewportMouseMove}
            onMouseUp={endDragging}
            onMouseLeave={endDragging}
            onWheel={handleWheel}
            className={`h-[calc(100vh-170px)] overflow-auto bg-transparent p-0 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              dragState.active ? 'cursor-grabbing select-none' : 'cursor-grab'
            }`}
          >
            <div
              className="origin-top-left"
              style={{
                transform: `scale(${zoom})`,
                width: 'max-content',
                minWidth: '100%',
              }}
            >
              <div className="flex min-w-[1650px] justify-center px-0 pb-0 pt-1">
                <div className="space-y-8">
                  {viewMode === 'department' ? (
                    <div ref={topClusterRef} className="flex flex-col items-center">
                      {/* Level 1: Executives */}
                      <div className="relative flex items-start justify-center gap-14 pb-9">
                        {filteredRoots.length > 1 ? (
                          <>
                            <div className="absolute left-[130px] right-[130px] bottom-4 h-[2px] bg-slate-400" />
                            <div className="absolute left-[130px] bottom-4 h-5 w-[2px] -translate-x-1/2 bg-slate-400" />
                            <div className="absolute right-[130px] bottom-4 h-5 w-[2px] translate-x-1/2 bg-slate-400" />
                            <div className="absolute left-1/2 bottom-0 h-4 w-[2px] -translate-x-1/2 bg-slate-400" />
                          </>
                        ) : (
                          <div className="absolute left-1/2 bottom-0 h-4 w-[2px] -translate-x-1/2 bg-slate-400" />
                        )}
                        {filteredRoots.map((rootId) => {
                          const rootNode = nodes.get(rootId);
                          if (!rootNode) return null;
                          return (
                            <div key={rootId} className="flex flex-col items-center">
                              <OrgNodeCard
                                node={rootNode}
                                registerNodeRef={registerNodeRef}
                                onToggle={handleToggle}
                                hasChildren={false}
                                showChildren={false}
                                isHighlighted={highlightedNodeIds.has(rootId)}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Level 2: Department Cards connected below the Executives */}
                      <div className="relative pt-0">
                        {departmentData.length > 1 ? (
                          <div className="absolute left-[130px] right-[130px] top-0 h-[2px] bg-slate-400" />
                        ) : null}
                        <div className="absolute left-1/2 top-0 h-5 w-[2px] -translate-x-1/2 bg-slate-400" />
                        
                        <div className="flex items-start justify-center gap-14 px-2 pt-0">
                          {departmentData.map((dept) => (
                            <div key={dept.name} className="flex flex-col items-center">
                              <div className="h-6 w-[2px] bg-slate-400" />
                              
                              {/* Department Card */}
                              <div className="w-[260px] rounded-[24px] border border-violet-200 bg-[linear-gradient(180deg,#fcfaff_0%,#f5f0ff_100%)] p-4 text-center shadow-[0_8px_20px_rgba(139,92,246,0.04)]">
                                <span className="material-symbols-outlined text-violet-600 text-[20px] mb-1">corporate_fare</span>
                                <p className="text-sm font-bold uppercase tracking-wider text-violet-800">{dept.name}</p>
                                <p className="text-xs font-semibold text-slate-500 mt-1">{dept.count} members</p>
                              </div>

                              {/* Level 3: Department Employee Trees */}
                              {dept.roots.length > 0 ? (
                                dept.roots.length === 1 ? (
                                  <div className="flex flex-col items-center">
                                    <div className="h-6 w-[2px] bg-slate-400" />
                                    <TreeNode
                                      nodeId={dept.roots[0]}
                                      nodes={dept.nodesMap}
                                      expandedNodeIds={effectiveExpandedNodeIds}
                                      highlightedNodeIds={highlightedNodeIds}
                                      registerNodeRef={registerNodeRef}
                                      onToggle={handleToggle}
                                      depth={1}
                                    />
                                  </div>
                                ) : (
                                  <div className="relative pt-0 flex flex-col items-center">
                                    <div className="h-6 w-[2px] bg-slate-400" />
                                    <div className="relative">
                                      <div className="absolute left-[130px] right-[130px] top-0 h-[2px] bg-slate-400" />
                                      <div className="flex items-start justify-center gap-6 px-2 pt-0">
                                        {dept.roots.map((childId) => (
                                          <div key={childId} className="flex flex-col items-center">
                                            <div className="h-5 w-[2px] bg-slate-400" />
                                            <TreeNode
                                              nodeId={childId}
                                              nodes={dept.nodesMap}
                                              expandedNodeIds={effectiveExpandedNodeIds}
                                              highlightedNodeIds={highlightedNodeIds}
                                              registerNodeRef={registerNodeRef}
                                              onToggle={handleToggle}
                                              depth={1}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )
                              ) : (
                                <p className="text-xs text-slate-400 mt-2 italic">No members assigned</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : filteredRoots.length > 1 ? (
                    <div ref={topClusterRef} className="flex flex-col items-center">
                      <div className="relative flex items-start justify-center gap-14 pb-9">
                        <div className="absolute left-[130px] right-[130px] bottom-4 h-[2px] bg-slate-400" />
                        <div className="absolute left-[130px] bottom-4 h-5 w-[2px] -translate-x-1/2 bg-slate-400" />
                        <div className="absolute right-[130px] bottom-4 h-5 w-[2px] translate-x-1/2 bg-slate-400" />
                        <div className="absolute left-1/2 bottom-0 h-4 w-[2px] -translate-x-1/2 bg-slate-400" />
                        {filteredRoots.map((rootId) => {
                          const rootNode = nodes.get(rootId);
                          if (!rootNode) {
                            return null;
                          }

                          return (
                            <div key={rootId} className="flex flex-col items-center">
                              <OrgNodeCard
                                node={rootNode}
                                registerNodeRef={registerNodeRef}
                                onToggle={handleToggle}
                                hasChildren={rootNode.childIds.length > 0}
                                showChildren={false}
                                isHighlighted={highlightedNodeIds.has(rootId)}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {rootChildIds.length ? (
                        <div className="mt-0 flex flex-col items-center">
                          {rootChildIds.length === 1 ? (
                            <div className="flex flex-col items-center">
                              <div className="h-6 w-[2px] bg-slate-400" />
                              <TreeNode
                                nodeId={rootChildIds[0]}
                                nodes={nodes}
                                expandedNodeIds={effectiveExpandedNodeIds}
                                highlightedNodeIds={highlightedNodeIds}
                                registerNodeRef={registerNodeRef}
                                onToggle={handleToggle}
                                depth={1}
                              />
                            </div>
                          ) : (
                            <div className="relative pt-0">
                              <div className="absolute left-[130px] right-[130px] top-0 h-[2px] bg-slate-400" />
                              <div className="absolute left-1/2 top-0 h-5 w-[2px] -translate-x-1/2 bg-slate-400" />
                              <div className="flex items-start justify-center gap-6 px-2 pt-0">
                                {rootChildIds.map((childId) => (
                                  <div key={childId} className="flex flex-col items-center">
                                    <div className="h-6 w-[2px] bg-slate-400" />
                                    <TreeNode
                                      nodeId={childId}
                                      nodes={nodes}
                                      expandedNodeIds={effectiveExpandedNodeIds}
                                      highlightedNodeIds={highlightedNodeIds}
                                      registerNodeRef={registerNodeRef}
                                      onToggle={handleToggle}
                                      depth={1}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div ref={topClusterRef} className="flex items-start justify-center gap-14">
                      {filteredRoots.map((rootId) => (
                        <TreeNode
                          key={rootId}
                          nodeId={rootId}
                          nodes={nodes}
                          expandedNodeIds={effectiveExpandedNodeIds}
                          highlightedNodeIds={highlightedNodeIds}
                          registerNodeRef={registerNodeRef}
                          onToggle={handleToggle}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
