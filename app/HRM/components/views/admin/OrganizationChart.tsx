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
  email?: string | null;
  phone?: string | null;
  dateOfJoining?: string | null;
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
    return 'border-blue-400 bg-blue-50 shadow-[0_18px_44px_rgba(49,112,198,0.16)]';
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
          ? 'border-blue-300 bg-blue-50 text-blue-700'
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
  onViewDetail,
  hasChildren,
  showChildren,
  isHighlighted,
}: {
  node: OrgChartNode;
  registerNodeRef: (nodeId: string, element: HTMLElement | null) => void;
  onToggle: (nodeId: string) => void;
  onViewDetail: (node: OrgChartNode) => void;
  hasChildren: boolean;
  showChildren: boolean;
  isHighlighted: boolean;
}) {
  return (
    <div
      ref={(element) => {
        registerNodeRef(node.id, element);
      }}
      onClick={() => {
        if (hasChildren) {
          onToggle(node.id);
        }
      }}
      className={`group relative w-[260px] rounded-[28px] border px-4 py-4 text-left transition-all ${buildStatusTone(node, isHighlighted)} ${
        hasChildren ? 'cursor-pointer hover:-translate-y-0.5 hover:border-blue-300' : 'cursor-default'
      }`}
    >
      {node.kind !== 'group' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(node);
          }}
          title="View Details"
          className="absolute bottom-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-50/50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:scale-95 cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100 z-10 transition-all"
        >
          <span className="material-symbols-outlined text-[16px] font-light">arrow_outward</span>
        </button>
      )}

      <div className="flex items-start gap-3">
        <Avatar node={node} />
        <div className="min-w-0 flex-1 pr-2">
          <div className="min-w-0">
            <p className="truncate text-[17px] font-bold text-slate-900">{node.name}</p>
            {node.kind !== 'super_admin' && (
              <p className="mt-1 truncate text-sm font-medium text-slate-500">{node.title}</p>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            <span>
              {node.kind === 'super_admin'
                ? (node.title || 'Executive')
                : node.kind === 'group'
                  ? 'Fallback Group'
                  : 'Employee'}
            </span>
            {node.employeeId ? <span className="truncate tracking-[0.14em] text-slate-500">{node.employeeId}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function TreeNode({
  nodeId,
  nodes,
  expandedNodeIds,
  highlightedNodeIds,
  registerNodeRef,
  onToggle,
  onViewDetail,
  depth = 0,
}: {
  nodeId: string;
  nodes: Map<string, OrgChartNode>;
  expandedNodeIds: Set<string>;
  highlightedNodeIds: Set<string>;
  registerNodeRef: (nodeId: string, element: HTMLElement | null) => void;
  onToggle: (nodeId: string) => void;
  onViewDetail: (node: OrgChartNode) => void;
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
        onViewDetail={onViewDetail}
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
          <div className="h-4 w-[2px] bg-transparent" />
          <CountBadge count={node.directReportCount} isActive={showChildren} />
        </button>
      ) : null}

      {showChildren ? (
        <div className="mt-3 flex w-full flex-col items-center">
          <div className="h-5 w-[2px] bg-transparent" />
          <div className="relative">
            {node.childIds.length > 1 ? (
              <div className="absolute left-12 right-12 top-0 h-[2px] bg-transparent" />
            ) : null}
            <div className="flex items-start justify-center gap-6 px-2 pt-0">
              {node.childIds.map((childId) => (
                <div key={childId} className="flex flex-col items-center">
                  <div className="h-5 w-[2px] bg-transparent" />
                  <TreeNode
                    nodeId={childId}
                    nodes={nodes}
                    expandedNodeIds={expandedNodeIds}
                    highlightedNodeIds={highlightedNodeIds}
                    registerNodeRef={registerNodeRef}
                    onToggle={onToggle}
                    onViewDetail={onViewDetail}
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

function OrgChartLines({
  data,
  nodes,
  expandedNodeIds,
  viewMode,
  filteredRoots,
  rootChildIds,
  departmentData,
  containerRef,
  nodeRefs,
  zoom,
}: {
  data: OrgChartResponse | null;
  nodes: Map<string, OrgChartNode>;
  expandedNodeIds: Set<string>;
  viewMode: 'reporting' | 'department';
  filteredRoots: string[];
  rootChildIds: string[];
  departmentData: any[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  nodeRefs: React.RefObject<Record<string, HTMLElement | null>>;
  zoom: number;
}) {
  const [paths, setPaths] = useState<string[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !data) return;

    const updateLines = () => {
      // 1. Reset existing transforms first to get clean baseline measurements
      departmentData.forEach((dept) => {
        const deptCardEl = nodeRefs.current[`department:${dept.name}`];
        if (deptCardEl) {
          deptCardEl.style.transform = 'none';
        }
      });

      const containerRect = container.getBoundingClientRect();
      const w = containerRect.width / zoom;
      const h = containerRect.height / zoom;
      setDimensions({ width: w, height: h });

      // 2. Center department cards horizontally over their direct child nodes (dept.roots)
      departmentData.forEach((dept) => {
        const deptCardId = `department:${dept.name}`;
        const deptCardEl = nodeRefs.current[deptCardId];
        if (!deptCardEl || dept.roots.length === 0) return;

        const cardRect = deptCardEl.getBoundingClientRect();
        const cardCenter = (cardRect.left + cardRect.right) / 2;

        let minLeft = Infinity;
        let maxRight = -Infinity;
        let validRootsCount = 0;

        dept.roots.forEach((rootId) => {
          const rootNodeEl = nodeRefs.current[rootId];
          if (rootNodeEl) {
            const rootRect = rootNodeEl.getBoundingClientRect();
            const rootCardCenter = (rootRect.left + rootRect.right) / 2;
            minLeft = Math.min(minLeft, rootCardCenter);
            maxRight = Math.max(maxRight, rootCardCenter);
            validRootsCount++;
          }
        });

        if (validRootsCount > 0) {
          const targetCenter = (minLeft + maxRight) / 2;
          const shiftX = (targetCenter - cardCenter) / zoom;
          if (Math.abs(shiftX) > 0.5) {
            deptCardEl.style.transform = `translateX(${shiftX}px)`;
          }
        }
      });

      const getElRect = (id: string) => {
        const el = nodeRefs.current[id];
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          left: (rect.left - containerRect.left) / zoom,
          top: (rect.top - containerRect.top) / zoom,
          width: rect.width / zoom,
          height: rect.height / zoom,
        };
      };

      const newPaths: string[] = [];

      // Helper to generate rounded orthogonal path
      const drawCurve = (sx: number, sy: number, tx: number, ty: number, radius = 16, customMidY?: number) => {
        const midY = customMidY !== undefined ? customMidY : (sy + ty) / 2;
        if (Math.abs(sx - tx) < 1) {
          return `M ${sx} ${sy} L ${tx} ${ty}`;
        }
        const dx = tx > sx ? 1 : -1;

        // Calculate radius constraint safely
        const limitY1 = Math.abs(sy - midY) / 2;
        const limitY2 = Math.abs(midY - ty) / 2;
        const activeLimitY = (limitY1 > 0 && limitY2 > 0) ? Math.min(limitY1, limitY2) : (limitY1 || limitY2 || radius);
        const r = Math.min(radius, Math.abs(sx - tx) / 2, activeLimitY);

        if (midY === ty) {
          // Path ends at horizontal level: curve down to horizontal
          return `M ${sx} ${sy} L ${sx} ${midY - r} Q ${sx} ${midY} ${sx + dx * r} ${midY} L ${tx} ${midY}`;
        }
        if (midY === sy) {
          // Path starts at horizontal level: run horizontal, curve down
          return `M ${sx} ${sy} L ${tx - dx * r} ${sy} Q ${tx} ${sy} ${tx} ${sy + r} L ${tx} ${ty}`;
        }

        return `M ${sx} ${sy} L ${sx} ${midY - r} Q ${sx} ${midY} ${sx + dx * r} ${midY} L ${tx - dx * r} ${midY} Q ${tx} ${midY} ${tx} ${midY + r} L ${tx} ${ty}`;
      };

      // 1. Gather all connections
      const connections: { from: string; to: string }[] = [];
      const junctionConnections: { from: string; toJunction: string }[] = [];
      const fromJunctionConnections: { fromJunction: string; to: string }[] = [];

      if (viewMode === 'reporting') {
        if (filteredRoots.length === 1) {
          const traverse = (nodeId: string) => {
            const node = nodes.get(nodeId);
            if (!node) return;
            const showChildren = node.childIds.length > 0 && expandedNodeIds.has(nodeId);
            if (showChildren) {
              node.childIds.forEach((childId) => {
                connections.push({ from: nodeId, to: childId });
                traverse(childId);
              });
            }
          };
          traverse(filteredRoots[0]);
        } else {
          filteredRoots.forEach((rootId) => {
            junctionConnections.push({ from: rootId, toJunction: 'root-junction' });
          });

          rootChildIds.forEach((childId) => {
            fromJunctionConnections.push({ fromJunction: 'root-junction', to: childId });
            const traverse = (nodeId: string) => {
              const node = nodes.get(nodeId);
              if (!node) return;
              const showChildren = node.childIds.length > 0 && expandedNodeIds.has(nodeId);
              if (showChildren) {
                node.childIds.forEach((childId) => {
                  connections.push({ from: nodeId, to: childId });
                  traverse(childId);
                });
              }
            };
            traverse(childId);
          });
        }
      } else {
        filteredRoots.forEach((rootId) => {
          junctionConnections.push({ from: rootId, toJunction: 'dept-junction' });
        });

        departmentData.forEach((dept) => {
          const deptCardId = `department:${dept.name}`;
          fromJunctionConnections.push({ fromJunction: 'dept-junction', to: deptCardId });

          dept.roots.forEach((rootId: string) => {
            connections.push({ from: deptCardId, to: rootId });

            const traverse = (nodeId: string) => {
              const node = dept.nodesMap.get(nodeId);
              if (!node) return;
              const showChildren = node.childIds.length > 0 && expandedNodeIds.has(nodeId);
              if (showChildren) {
                node.childIds.forEach((childId: string) => {
                  connections.push({ from: nodeId, to: childId });
                  traverse(childId);
                });
              }
            };
            traverse(rootId);
          });
        });
      }

      // 2. Draw connections
      connections.forEach((conn) => {
        const fromRect = getElRect(conn.from);
        const toRect = getElRect(conn.to);
        if (fromRect && toRect) {
          const sx = fromRect.left + fromRect.width / 2;
          const sy = fromRect.top + fromRect.height;
          const tx = toRect.left + toRect.width / 2;
          const ty = toRect.top;
          // Offset the horizontal split so it runs below the count badge (approx 32px above destination card)
          newPaths.push(drawCurve(sx, sy, tx, ty, 16, ty - 32));
        }
      });

      const junctions: Record<string, { x: number; y: number }> = {};
      const findJunctionY = (jName: string) => {
        let fromBottoms: number[] = [];
        let toTops: number[] = [];

        junctionConnections
          .filter((jc) => jc.toJunction === jName)
          .forEach((jc) => {
            const rect = getElRect(jc.from);
            if (rect) fromBottoms.push(rect.top + rect.height);
          });

        fromJunctionConnections
          .filter((fjc) => fjc.fromJunction === jName)
          .forEach((fjc) => {
            const rect = getElRect(fjc.to);
            if (rect) toTops.push(rect.top);
          });

        const avgFrom = fromBottoms.length ? fromBottoms.reduce((a, b) => a + b, 0) / fromBottoms.length : 0;
        const avgTo = toTops.length ? toTops.reduce((a, b) => a + b, 0) / toTops.length : 0;

        return (avgFrom + avgTo) / 2;
      };

      const jNames = Array.from(
        new Set([
          ...junctionConnections.map((jc) => jc.toJunction),
          ...fromJunctionConnections.map((fjc) => fjc.fromJunction),
        ])
      );

      jNames.forEach((jName) => {
        let xs: number[] = [];
        junctionConnections
          .filter((jc) => jc.toJunction === jName)
          .forEach((jc) => {
            const rect = getElRect(jc.from);
            if (rect) xs.push(rect.left + rect.width / 2);
          });
        fromJunctionConnections
          .filter((fjc) => fjc.fromJunction === jName)
          .forEach((fjc) => {
            const rect = getElRect(fjc.to);
            if (rect) xs.push(rect.left + rect.width / 2);
          });

        if (xs.length) {
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          junctions[jName] = {
            x: (minX + maxX) / 2,
            y: findJunctionY(jName),
          };
        }
      });

      junctionConnections.forEach((jc) => {
        const fromRect = getElRect(jc.from);
        const j = junctions[jc.toJunction];
        if (fromRect && j) {
          const sx = fromRect.left + fromRect.width / 2;
          const sy = fromRect.top + fromRect.height;
          // Connect vertically to the junction level, then curve into horizontal
          newPaths.push(drawCurve(sx, sy, j.x, j.y, 16, j.y));
        }
      });

      fromJunctionConnections.forEach((fjc) => {
        const toRect = getElRect(fjc.to);
        const j = junctions[fjc.fromJunction];
        if (toRect && j) {
          const tx = toRect.left + toRect.width / 2;
          const ty = toRect.top;
          // Start horizontal at the junction level, then curve down to child card.
          newPaths.push(drawCurve(j.x, j.y, tx, ty, 16, j.y));
        }
      });

      setPaths(newPaths);
    };

    updateLines();

    // Use ResizeObserver to detect dimension changes of the container
    const observer = new ResizeObserver(() => {
      updateLines();
    });
    observer.observe(container);

    // Safety fallbacks to ensure lines render after content shifts
    const t1 = setTimeout(updateLines, 100);
    const t2 = setTimeout(updateLines, 300);
    const t3 = setTimeout(updateLines, 700);

    return () => {
      observer.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [data, expandedNodeIds, viewMode, filteredRoots, rootChildIds, departmentData, zoom]);

  return (
    <svg
      width={dimensions.width}
      height={dimensions.height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
      }}
    >
      {paths.map((d, index) => (
        <path
          key={index}
          d={d}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

function calculateTenure(dateString?: string | null) {
  if (!dateString) return 'N/A';
  const joinDate = new Date(dateString);
  const now = new Date();
  
  let years = now.getFullYear() - joinDate.getFullYear();
  let months = now.getMonth() - joinDate.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (years === 0 && months === 0) {
    return 'Joined this month';
  }
  
  const parts = [];
  if (years > 0) {
    parts.push(`${years} year${years > 1 ? 's' : ''}`);
  }
  if (months > 0) {
    parts.push(`${months} month${months > 1 ? 's' : ''}`);
  }
  return parts.join(' and ');
}

function formatJoiningDate(dateString?: string | null) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function EmployeeDetailModal({
  node,
  onClose,
}: {
  node: OrgChartNode;
  onClose: () => void;
}) {
  const tenure = calculateTenure(node.dateOfJoining);
  const formattedJoinDate = formatJoiningDate(node.dateOfJoining);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm transition-all duration-300"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md transform overflow-hidden rounded-[32px] border border-slate-100 bg-white p-6 shadow-2xl transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Card Header Profile Info (Horizontal Layout) */}
        <div className="flex items-center gap-4 pb-5 border-b border-slate-100 mt-2">
          <div className="relative flex-shrink-0">
            {node.avatarUrl ? (
              <Image
                alt={node.name}
                className="h-20 w-20 rounded-full object-cover ring-4 ring-blue-50"
                src={node.avatarUrl}
                width={80}
                height={80}
                unoptimized
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 ring-4 ring-blue-50 shadow-inner">
                <span className="material-symbols-outlined text-[36px]">
                  {node.kind === 'super_admin' ? 'shield_person' : 'person'}
                </span>
              </div>
            )}
            <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${
              node.status === 'active' || String(node.status).toLowerCase() === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
            }`} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight truncate">{node.name}</h3>
            <span className="mt-1 inline-flex px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {node.kind === 'super_admin' ? 'Executive Admin' : 'Employee'}
            </span>
          </div>
        </div>

        {/* Detailed Fields List (Key-Value Format) */}
        <div className="mt-4 divide-y divide-slate-100">
          <div className="flex items-center justify-between py-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Designation</span>
            <span className="text-sm font-semibold text-slate-700">{node.title || 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Department</span>
            <span className="text-sm font-semibold text-slate-700">
              {node.departmentName || (node.kind === 'super_admin' ? 'Management' : 'Other')}
            </span>
          </div>

          {node.kind !== 'super_admin' && (
            <>
              <div className="flex items-center justify-between py-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Employee ID</span>
                <span className="text-sm font-semibold text-slate-700">{node.employeeId || 'N/A'}</span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tenure</span>
                <span className="text-sm font-semibold text-slate-700">{tenure}</span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between py-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Address</span>
            <span className="text-sm font-semibold text-slate-700 truncate max-w-[240px]" title={node.email || ''}>
              {node.email || 'N/A'}
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Phone Number</span>
            <span className="text-sm font-semibold text-slate-700">{node.phone || 'N/A'}</span>
          </div>

          {node.kind !== 'super_admin' && (
            <div className="flex items-center justify-between py-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Date of Joining</span>
              <span className="text-sm font-semibold text-slate-700">{formattedJoinDate}</span>
            </div>
          )}
        </div>
      </div>
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
  const [selectedNode, setSelectedNode] = useState<OrgChartNode | null>(null);
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLElement | null>>({});

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
  
  useEffect(() => {
    if (data?.nodes?.length) {
      const parentIds = data.nodes
        .filter((n) => n.childIds && n.childIds.length > 0)
        .map((n) => n.id);
      setExpandedNodeIds(parentIds);
    }
  }, [data]);

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
    const container = containerRef.current;

    if (!viewport || !container) {
      return;
    }

    const timer = window.setTimeout(() => {
      const firstRootId = data.roots[0];
      const rootEl = nodeRefs.current[firstRootId];

      if (!rootEl) {
        // Fallback to cluster centering if root element is not found in refs
        const cluster = topClusterRef.current;
        if (cluster) {
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
        }
        return;
      }

      const rootRect = rootEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();

      // Calculate horizontal center of the root element relative to the container canvas
      const relativeCenterX = (rootRect.left + rootRect.right) / 2 - containerRect.left;

      // Scroll position that aligns the center of the root with the center of the viewport
      const nextScrollLeft = relativeCenterX - viewportRect.width / 2;

      viewport.scrollTo({
        left: Math.max(0, nextScrollLeft),
        top: 0,
        behavior: 'smooth',
      });
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [data, searchQuery, zoom]);

  function handleToggle(nodeId: string) {
    setExpandedNodeIds((current) =>
      current.includes(nodeId) ? current.filter((item) => item !== nodeId) : [...current, nodeId]
    );
  }

  function registerNodeRef(nodeId: string, element: HTMLElement | null) {
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
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
            <div className="inline-grid grid-cols-2 gap-2 rounded-full border border-outline-variant/10 bg-surface-container-lowest p-1 shadow-sm w-72">
              <button
                type="button"
                onClick={() => setViewMode('reporting')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  viewMode === 'reporting'
                    ? 'bg-white text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">account_tree</span>
                Reporting Tree
              </button>
              <button
                type="button"
                onClick={() => setViewMode('department')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  viewMode === 'department'
                    ? 'bg-white text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
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
              ref={containerRef}
              className="origin-top-left relative"
              style={{
                transform: `scale(${zoom})`,
                width: 'max-content',
                minWidth: '100%',
              }}
            >
              <OrgChartLines
                data={data}
                nodes={nodes}
                expandedNodeIds={effectiveExpandedNodeIds}
                viewMode={viewMode}
                filteredRoots={filteredRoots}
                rootChildIds={rootChildIds}
                departmentData={departmentData}
                containerRef={containerRef}
                nodeRefs={nodeRefs}
                zoom={zoom}
              />
              <div className="flex min-w-[1650px] justify-center px-0 pb-0 pt-1">
                <div className="space-y-8">
                  {viewMode === 'department' ? (
                    <div ref={topClusterRef} className="flex flex-col items-center">
                      {/* Level 1: Executives */}
                      <div className="relative flex items-start justify-center gap-14 pb-9">
                        {filteredRoots.length > 1 ? (
                          <>
                            <div className="absolute left-[130px] right-[130px] bottom-4 h-[2px] bg-transparent" />
                            <div className="absolute left-[130px] bottom-4 h-5 w-[2px] -translate-x-1/2 bg-transparent" />
                            <div className="absolute right-[130px] bottom-4 h-5 w-[2px] translate-x-1/2 bg-transparent" />
                            <div className="absolute left-1/2 bottom-0 h-4 w-[2px] -translate-x-1/2 bg-transparent" />
                          </>
                        ) : (
                          <div className="absolute left-1/2 bottom-0 h-4 w-[2px] -translate-x-1/2 bg-transparent" />
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
                                onViewDetail={setSelectedNode}
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
                          <div className="absolute left-[130px] right-[130px] top-0 h-[2px] bg-transparent" />
                        ) : null}
                        <div className="absolute left-1/2 top-0 h-5 w-[2px] -translate-x-1/2 bg-transparent" />
                        
                        <div className="flex items-start justify-center gap-14 px-2 pt-0">
                          {departmentData.map((dept) => (
                            <div key={dept.name} className="flex flex-col items-center">
                              <div className="h-6 w-[2px] bg-transparent" />
                              
                              {/* Department Card */}
                              <div
                                ref={(el) => {
                                  nodeRefs.current[`department:${dept.name}`] = el;
                                }}
                                className="w-[260px] rounded-[24px] border border-blue-200 bg-[linear-gradient(180deg,#f8fbfd_0%,#eef6fc_100%)] p-4 text-center shadow-[0_8px_20px_rgba(49,112,198,0.04)]"
                              >
                                <span className="material-symbols-outlined text-blue-600 text-[20px] mb-1">corporate_fare</span>
                                <p className="text-sm font-bold uppercase tracking-wider text-blue-800">{dept.name}</p>
                                <p className="text-xs font-semibold text-slate-500 mt-1">{dept.count} members</p>
                              </div>

                              {/* Level 3: Department Employee Trees */}
                              {dept.roots.length > 0 ? (
                                dept.roots.length === 1 ? (
                                  <div className="flex flex-col items-center">
                                    <div className="h-6 w-[2px] bg-transparent" />
                                    <TreeNode
                                      nodeId={dept.roots[0]}
                                      nodes={dept.nodesMap}
                                      expandedNodeIds={effectiveExpandedNodeIds}
                                      highlightedNodeIds={highlightedNodeIds}
                                      registerNodeRef={registerNodeRef}
                                      onToggle={handleToggle}
                                      onViewDetail={setSelectedNode}
                                      depth={1}
                                    />
                                  </div>
                                ) : (
                                  <div className="relative pt-0 flex flex-col items-center">
                                    <div className="h-6 w-[2px] bg-transparent" />
                                    <div className="relative">
                                      <div className="absolute left-[130px] right-[130px] top-0 h-[2px] bg-transparent" />
                                      <div className="flex items-start justify-center gap-6 px-2 pt-0">
                                        {dept.roots.map((childId) => (
                                          <div key={childId} className="flex flex-col items-center">
                                            <div className="h-5 w-[2px] bg-transparent" />
                                            <TreeNode
                                              nodeId={childId}
                                              nodes={dept.nodesMap}
                                              expandedNodeIds={effectiveExpandedNodeIds}
                                              highlightedNodeIds={highlightedNodeIds}
                                              registerNodeRef={registerNodeRef}
                                              onToggle={handleToggle}
                                              onViewDetail={setSelectedNode}
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
                        <div className="absolute left-[130px] right-[130px] bottom-4 h-[2px] bg-transparent" />
                        <div className="absolute left-[130px] bottom-4 h-5 w-[2px] -translate-x-1/2 bg-transparent" />
                        <div className="absolute right-[130px] bottom-4 h-5 w-[2px] translate-x-1/2 bg-transparent" />
                        <div className="absolute left-1/2 bottom-0 h-4 w-[2px] -translate-x-1/2 bg-transparent" />
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
                                onViewDetail={setSelectedNode}
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
                              <div className="h-6 w-[2px] bg-transparent" />
                              <TreeNode
                                nodeId={rootChildIds[0]}
                                nodes={nodes}
                                expandedNodeIds={effectiveExpandedNodeIds}
                                highlightedNodeIds={highlightedNodeIds}
                                registerNodeRef={registerNodeRef}
                                onToggle={handleToggle}
                                onViewDetail={setSelectedNode}
                                depth={1}
                              />
                            </div>
                          ) : (
                            <div className="relative pt-0">
                              <div className="absolute left-[130px] right-[130px] top-0 h-[2px] bg-transparent" />
                              <div className="absolute left-1/2 top-0 h-5 w-[2px] -translate-x-1/2 bg-transparent" />
                              <div className="flex items-start justify-center gap-6 px-2 pt-0">
                                {rootChildIds.map((childId) => (
                                  <div key={childId} className="flex flex-col items-center">
                                    <div className="h-6 w-[2px] bg-transparent" />
                                    <TreeNode
                                      nodeId={childId}
                                      nodes={nodes}
                                      expandedNodeIds={effectiveExpandedNodeIds}
                                      highlightedNodeIds={highlightedNodeIds}
                                      registerNodeRef={registerNodeRef}
                                      onToggle={handleToggle}
                                      onViewDetail={setSelectedNode}
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
                          onViewDetail={setSelectedNode}
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

      {selectedNode && (
        <EmployeeDetailModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
