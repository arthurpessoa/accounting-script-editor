import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, Edge, MiniMap, Node, OnConnect, OnSelectionChangeParams, Position, useEdgesState, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { DragAndDropPanel } from './DragAndDropPanel';
import './flow.css';
import { nodeTypes } from './Nodes';
// Inlined layout configuration (moved from layoutConfig.ts)
const LAYOUT = {
  paymentRoot: { x: 40, y: 40 },
  subflowGrid: { marginX: 50, marginY: 50, gapX: 80, gapY: 80 },
  subflowSize: { padding: 30, minWidth: 300, minHeight: 200 },
  actionLayout: { nodeWidth: 160, nodeHeight: 70, gapX: 40, gapY: 90, innerPaddingX: 40, startY: 140 }
} as const;

// --- Helpers ---------------------------------------------------------------

function ensurePaymentRoot(nodes: Node[]): Node[] {
  if (nodes.some(n => n.type === 'payment')) return nodes;
  const root: Node = {
    id: 'payment-root',
    type: 'payment',
    position: { ...LAYOUT.paymentRoot },
    data: {},
    draggable: true,
    sourcePosition: Position.Bottom,
    selectable: false,
  };
  return [root, ...nodes];
}

interface FlowEnds { sf: Node; head: Node; tail: Node }

function computeAutoEdges(nodes: Node[], existing: Edge[]): Edge[] {
  const paymentNode = nodes.find(n => n.type === 'payment');
  if (!paymentNode) return existing;
  const preserved = existing.filter(e => e.source !== paymentNode.id && !e.data?.autoChain);
  const subflows = nodes.filter(n => n.type === 'subflow');
  const matchedEnds: FlowEnds[] = [];
  subflows.forEach(sf => {
    if (!sf.data?.searchMatch) return;
    const actions = nodes.filter(n => n.parentNode === sf.id && n.type === 'action');
    if (!actions.length) return;
    const ids = new Set(actions.map(a => a.id));
    const incoming: Record<string, number> = {}; const outgoing: Record<string, number> = {};
    actions.forEach(a => { incoming[a.id] = 0; outgoing[a.id] = 0; });
    existing.forEach(e => { if (ids.has(e.source) && ids.has(e.target)) { outgoing[e.source]++; incoming[e.target]++; } });
  const head = actions.find(a => (incoming[a.id] || 0) === 0) || actions.slice().sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)[0];
  const tail = actions.find(a => (outgoing[a.id] || 0) === 0) || actions.slice().sort((a, b) => b.position.y - a.position.y || b.position.x - a.position.x)[0];
    matchedEnds.push({ sf, head, tail });
  });
  matchedEnds.sort((a, b) => {
    const pa = typeof a.sf.data?.priority === 'number' ? a.sf.data.priority : Number.MAX_SAFE_INTEGER;
    const pb = typeof b.sf.data?.priority === 'number' ? b.sf.data.priority : Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb; // ascending: smaller priority first
    return (a.sf.position.y - b.sf.position.y) || (a.sf.position.x - b.sf.position.x);
  });
  const auto: Edge[] = [];
  if (matchedEnds.length) {
    const { head } = matchedEnds[0];
    auto.push({ id: `${paymentNode.id}-${head.id}`, source: paymentNode.id, target: head.id, animated: true, data: { autoChain: true, kind: 'payment' } });
  }
  for (let i = 0; i < matchedEnds.length - 1; i++) {
    const tail = matchedEnds[i].tail; const nextHead = matchedEnds[i + 1].head;
    const tailHasOutgoing = preserved.some(e => e.source === tail.id) || auto.some(e => e.source === tail.id);
    if (tailHasOutgoing) continue;
    auto.push({ id: `${tail.id}-${nextHead.id}`, source: tail.id, target: nextHead.id, animated: true, data: { autoChain: true, kind: 'chain' } });
  }
  return [...preserved, ...auto];
}

function layoutSubflows(nodes: Node[], previousIds: string[]): Node[] | null {
  const subflows = nodes.filter(n => n.type === 'subflow');
  const ids = subflows.map(s => s.id).sort();
  const changed = ids.length !== previousIds.length || ids.some((id, i) => id !== previousIds[i]);
  if (!changed) return null;
  const { marginX, marginY, gapX, gapY } = LAYOUT.subflowGrid;
  // Ensure we start laying out subflows below the payment node (which can be moved)
  const payment = nodes.find(n => n.type === 'payment');
  const paymentClearance = 120; // vertical space reserved below payment node
  const topOffset = payment ? Math.max(marginY, payment.position.y + paymentClearance) : marginY;
  const viewportWidth = window.innerWidth || 1200;
  const widths = subflows.map(sf => (sf.style?.width as number) || (LAYOUT.subflowSize.minWidth + 100));
  const heights = subflows.map(sf => (sf.style?.height as number) || (LAYOUT.subflowSize.minHeight + 100));
  const cellW = Math.max(...widths, LAYOUT.subflowSize.minWidth + 100);
  const cellH = Math.max(...heights, LAYOUT.subflowSize.minHeight + 100);
  const usableWidth = Math.max(LAYOUT.subflowSize.minWidth + 100, viewportWidth - marginX * 2);
  const cols = Math.max(1, Math.floor((usableWidth + gapX) / (cellW + gapX)));
  const ordered = subflows.slice().sort((a, b) => (a.position.y - b.position.y) || (a.position.x - b.position.x) || a.id.localeCompare(b.id));
  const next = nodes.map(n => ({ ...n }));
  ordered.forEach((sf, idx) => {
    const col = idx % cols; const row = Math.floor(idx / cols);
    const totalRowWidth = cols * cellW + (cols - 1) * gapX;
    const offsetX = Math.max(0, (usableWidth - (totalRowWidth - gapX)) / 2);
    const x = marginX + offsetX + col * (cellW + gapX);
    const y = topOffset + row * (cellH + gapY);
    const i = next.findIndex(n => n.id === sf.id);
    if (i >= 0 && (Math.abs(next[i].position.x - x) > 1 || Math.abs(next[i].position.y - y) > 1)) {
  next[i] = { ...next[i], position: { x, y } };
    }
  });
  return next;
}

function resizeSubflows(nodes: Node[]): Node[] | null {
  const { padding, minWidth, minHeight } = LAYOUT.subflowSize as { padding: number; minWidth: number; minHeight: number };
  let changed = false;
  const next = nodes.map(n => ({ ...n }));
  const subflows = nodes.filter(n => n.type === 'subflow');
  subflows.forEach(sf => {
    const children = nodes.filter(c => c.parentNode === sf.id && c.type !== 'subflow');
    if (!children.length) return;
    let maxX = 0, maxY = 0;
    children.forEach(c => {
      const cw = (c.width ?? 140); const ch = (c.height ?? 70);
      maxX = Math.max(maxX, c.position.x + cw);
      maxY = Math.max(maxY, c.position.y + ch);
    });
    const neededW = Math.max(minWidth, maxX + padding);
    const neededH = Math.max(minHeight, maxY + padding);
    const i = next.findIndex(n => n.id === sf.id);
    if (i >= 0) {
      const style = { ...(next[i].style || {}) };
      if (style.width !== neededW || style.height !== neededH) {
        style.width = neededW; style.height = neededH; if (style.transition) delete style.transition; changed = true;
  next[i] = { ...next[i], style };
      }
    }
  });
  return changed ? next : null;
}

function layoutActions(nodes: Node[], edges: Edge[]): Node[] | null {
  let anyChange = false;
  const next = nodes.map(n => ({ ...n }));
  const subflows = nodes.filter(n => n.type === 'subflow');
  const { nodeWidth: nodeW, gapX, gapY, innerPaddingX, startY } = LAYOUT.actionLayout;
  subflows.forEach(sf => {
    const width = (sf.style?.width as number) || (LAYOUT.subflowSize.minWidth + 100);
    const actions = nodes.filter(n => n.parentNode === sf.id && n.type === 'action');
    if (!actions.length) return;
    const ids = new Set(actions.map(a => a.id));
    const inside = edges.filter(e => ids.has(e.source) && ids.has(e.target));
    const incoming: Record<string, number> = {}; actions.forEach(a => incoming[a.id] = 0); inside.forEach(e => { incoming[e.target] = (incoming[e.target] || 0) + 1; });
    const heads = actions.filter(a => (incoming[a.id] || 0) === 0);
    let ordered: Node[] = [];
    if (heads.length === 1) {
      let cur = heads[0].id; const visited = new Set<string>(); const safety = actions.length + 5;
      while (cur && !visited.has(cur) && visited.size < safety) {
        visited.add(cur);
        const node = actions.find(a => a.id === cur); if (node) ordered.push(node);
        const nextEdge = inside.find(e => e.source === cur); cur = nextEdge?.target || '';
      }
      if (ordered.length !== actions.length) ordered = actions.slice().sort((a, b) => a.position.y - b.position.y);
    } else {
      ordered = actions.slice().sort((a, b) => a.position.y - b.position.y);
    }
    const usableWidth = width - innerPaddingX * 2;
    const columns = Math.max(1, Math.floor((usableWidth + gapX) / (nodeW + gapX)));
    ordered.forEach((node, idx) => {
      const col = idx % columns; const row = Math.floor(idx / columns);
      const totalRowWidth = columns * nodeW + (columns - 1) * gapX;
      const offsetX = (width - totalRowWidth) / 2;
      const x = offsetX + col * (nodeW + gapX); const y = startY + row * gapY;
      const i = next.findIndex(n => n.id === node.id);
  if (i >= 0 && (Math.abs(next[i].position.x - x) > 1 || Math.abs(next[i].position.y - y) > 1)) { next[i] = { ...next[i], position: { x, y } }; anyChange = true; }
    });
  });
  return anyChange ? next : null;
}

function highlightSelection(nodes: Node[], edges: Edge[], selected?: Node): Node[] | null {
  if (!selected) {
    let changed = false; const cleared = nodes.map(n => {
      if (n.data?.highlighted || n.data?.conflict) { changed = true; return { ...n, data: { ...n.data, highlighted: false, conflict: false, conflictPrimary: false, conflictPrimaryId: undefined } }; }
      return n;
    });
    return changed ? cleared : null;
  }
  const ns = nodes;
  const containerId: string | undefined = selected.type === 'subflow' ? selected.id : (selected as unknown as { parentNode?: string }).parentNode;
  let originId: string | undefined;
  if (containerId) {
    const children = ns.filter(n => n.parentNode === containerId && n.type === 'action');
    if (children.length) {
      const ids = new Set(children.map(c => c.id));
      const incoming: Record<string, number> = {}; children.forEach(c => incoming[c.id] = 0);
      edges.forEach(e => { if (ids.has(e.target) && ids.has(e.source)) incoming[e.target] = (incoming[e.target] || 0) + 1; });
      const heads = children.filter(c => (incoming[c.id] || 0) === 0);
      if (heads.length === 1) originId = heads[0].id; else if (heads.length > 1) originId = heads.slice().sort((a, b) => a.position.y - b.position.y)[0].id; else originId = children.slice().sort((a, b) => a.position.y - b.position.y)[0].id;
    }
  }
  if (!originId && selected.type === 'action') originId = selected.id;
  if (!originId) return null;
  const visited = new Set<string>(); let upstream = originId;
  let guard = 0; while (guard < 100) { if (visited.has(upstream)) break; visited.add(upstream); const inc = edges.filter(e => e.target === upstream); if (inc.length !== 1) break; const nextUp = inc[0].source; if (!ns.some(n => n.id === nextUp)) break; upstream = nextUp; guard++; }
  originId = upstream;
  const reachable = new Set<string>(); const stack = [originId];
  while (stack.length) { const cur = stack.pop()!; if (!reachable.has(cur)) { reachable.add(cur); edges.filter(e => e.source === cur).forEach(e => stack.push(e.target)); } }
  const pathSet = reachable;
  const nameFreq: Record<string, number> = {}; const firstNameId: Record<string, string> = {};
  ns.forEach(n => { if (!pathSet.has(n.id) || n.type !== 'action') return; const name = (n.data?.name || '').trim(); if (name) nameFreq[name] = (nameFreq[name] || 0) + 1; });
  Array.from(pathSet).forEach(id => { const node = ns.find(n => n.id === id); if (!node || node.type !== 'action') return; const name = (node.data?.name || '').trim(); if (!name) return; if (!firstNameId[name]) firstNameId[name] = node.id; });
  let changed = false;
  const next = ns.map(n => {
    const highlighted = pathSet.has(n.id) && n.type !== 'subflow';
    const name = (n.data?.name || '').trim(); const hasDup = highlighted && !!name && nameFreq[name] > 1; const conflictPrimary = hasDup && firstNameId[name] === n.id; const conflict = hasDup && !conflictPrimary;
    const need = highlighted !== (n.data?.highlighted || false) || conflict !== (n.data?.conflict || false) || conflictPrimary !== (n.data?.conflictPrimary || false) || (n.data?.conflictPrimaryId || '') !== (hasDup ? firstNameId[name] : '');
    if (need) { changed = true; return { ...n, data: { ...n.data, highlighted, conflict, conflictPrimary, conflictPrimaryId: hasDup ? firstNameId[name] : undefined } }; }
    return n;
  });
  return changed ? next : null;
}

export const FlowEditor: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [selected, setSelected] = useState<Node | undefined>();
  const [paymentDragging, setPaymentDragging] = useState(false);
  const lastSubflowIdsRef = useRef<string[]>([]);
  // Ensure payment root exists once at mount & whenever nodes array empties
  useEffect(() => { setNodes(ns => ensurePaymentRoot(ns)); }, [setNodes]);

  // Sync auto edges & apply conflict highlighting (fallback to payment's first matched head when nothing selected)
  useEffect(() => {
    setEdges(prev => {
      const newEdges = computeAutoEdges(nodes, prev);
      setNodes(ns => {
        const payment = ns.find(n => n.type === 'payment');
        let headNode: Node | undefined;
        if (payment) {
          const headEdge = newEdges.find(e => e.source === payment.id && e.data?.kind === 'payment');
          if (headEdge) headNode = ns.find(n => n.id === headEdge.target);
        }
        const selectionRef = selected ? ns.find(n => n.id === selected.id) : headNode;
        const updated = highlightSelection(ns, newEdges, selectionRef);
        return updated || ns;
      });
      return newEdges;
    });
  }, [nodes, selected, setEdges, setNodes]);

  // Auto-layout subflows on add/remove
  useEffect(() => {
  }, [nodes]);

  // Structural & style normalizations + resize + internal action layout
  useEffect(() => {
    setNodes(current => {
      let work = ensurePaymentRoot(current);
      const relayout = layoutSubflows(work, lastSubflowIdsRef.current); if (relayout) { work = relayout; lastSubflowIdsRef.current = work.filter(n => n.type === 'subflow').map(s => s.id).sort(); }
      const resized = resizeSubflows(work); if (resized) work = resized;
      const laidOut = layoutActions(work, edges); if (laidOut) work = laidOut;
      // enforce handle positions + subflow style
      let changed = false;
      const next = work.map(n => {
  let mutated = false; const copy: Node & { className?: string } = { ...n } as Node & { className?: string };
        if (copy.sourcePosition !== Position.Bottom || copy.targetPosition !== Position.Top) { copy.sourcePosition = Position.Bottom; copy.targetPosition = Position.Top; mutated = true; }
        if (copy.type === 'subflow') {
          const style = { ...(copy.style || {}) };
          if (!style.background || style.background === '#f3f4f6') { style.background = 'rgba(243,244,246,0.55)'; mutated = true; }
          if (style.zIndex !== 0) { style.zIndex = 0; mutated = true; }
          if (style.overflow !== 'visible') { style.overflow = 'visible'; mutated = true; }
          if (!copy.className || !copy.className.includes('subflow-node')) { copy.className = ((copy.className ? copy.className + ' ' : '') + 'subflow-node').trim(); mutated = true; }
          copy.style = style;
        }
        if (copy.type === 'action') {
          interface ActionData { label?: string; name?: string; [k: string]: unknown }
          const d = copy.data as ActionData;
            if (d?.label && !d.name) { copy.data = { ...d, name: d.label }; mutated = true; }
        }
        if (mutated) { changed = true; return copy; }
        return n;
      });
      return changed || relayout || resized || laidOut ? next : current;
    });
  }, [edges, setNodes, nodes]);

  // Highlight recompute if edges change independently (e.g., deletion) and selection exists
  useEffect(() => {
    if (!selected) return; // fallback handled in edge sync effect
    setNodes(ns => { const updated = highlightSelection(ns, edges, selected); return updated || ns; });
  }, [edges, selected, setNodes]);

  const onConnect: OnConnect = useCallback((conn) => {
    // We interpret a manual connection from payment-root -> action head
    // as a request to move that action's subflow to the first position (swap priorities).
    const { source, target } = conn;
    if (!source || !target) return;
    setNodes(ns => {
      const payment = ns.find(n => n.type === 'payment');
      if (!payment || source !== payment.id) return ns; // only handle payment-root sourced connects for now
      const targetNode = ns.find(n => n.id === target);
      if (!targetNode) return ns;
      const targetSubflowId = (targetNode as any).parentNode;
      if (!targetSubflowId) return ns;
      const subflows = ns.filter(n => n.type === 'subflow');
      if (!subflows.length) return ns;
      // Find current first (lowest numeric priority)
      const sortable = subflows.map(sf => {
        const d: any = sf.data || {};
        return { id: sf.id, p: typeof d.priority === 'number' ? d.priority : Number.MAX_SAFE_INTEGER };
      });
      sortable.sort((a,b)=> a.p - b.p);
      const first = sortable[0];
      if (!first || first.id === targetSubflowId) return ns; // already first
      const targetSf = sortable.find(s => s.id === targetSubflowId);
      if (!targetSf) return ns;
      // Swap priority values
      const pA = first.p;
      const pB = targetSf.p;
      return ns.map(n => {
        if (n.type !== 'subflow') return n;
        if (n.id === first.id) return { ...n, data: { ...(n.data||{}), priority: pB } };
        if (n.id === targetSubflowId) return { ...n, data: { ...(n.data||{}), priority: pA } };
        return n;
      });
    });
    // Do not add a manual edge; auto-edge recomputation will reflect new order.
  }, [setNodes]);


  const onSelectionChange = (params: OnSelectionChangeParams) => {
    setSelected(params.nodes[0]);
  };

  // External selection events
  useEffect(() => {
    const handler = (e: Event) => {
  const detail = (e as CustomEvent).detail; if (!detail) return;
      const nodeId: string = typeof detail === 'string' ? detail : detail.nodeId; if (!nodeId) return;
      setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, selected: true } : { ...n, selected: false }));
      const found = nodes.find(n => n.id === nodeId); if (found) setSelected(found as Node);
    };
    const clearHandler = () => {
      setSelected(undefined);
      setNodes(ns => ns.map(n => (n.selected ? { ...n, selected: false } : n)));
    };
    window.addEventListener('externalNodeSelect', handler as EventListener);
    window.addEventListener('clearFlowSelection', clearHandler as EventListener);
    return () => {
      window.removeEventListener('externalNodeSelect', handler as EventListener);
      window.removeEventListener('clearFlowSelection', clearHandler as EventListener);
    };
  }, [nodes, setNodes]);

  // Delete selected node with Delete / Backspace key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selected) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return; // avoid interfering with text inputs
      const deletingId = selected.id;
  const isSubflow = selected.type === 'subflow';
      setNodes(ns => ns.filter(n => n.id !== deletingId && (!isSubflow || n.parentNode !== deletingId)));
      setEdges(es => {
        if (isSubflow) {
          // Remove edges attached to subflow or its children
          const childIds = new Set(nodes.filter(n => n.parentNode === deletingId).map(n => n.id));
          return es.filter(e => e.source !== deletingId && e.target !== deletingId && !childIds.has(e.source) && !childIds.has(e.target));
        }
        // For action node: rewiring to preserve linear progress for predecessors.
        // Collect ALL incoming predecessors (can be multiple now) and single outgoing successor (still only one allowed).
        const incomings = es.filter(e => e.target === deletingId);
        const outgoing = es.find(e => e.source === deletingId);
        let filtered = es.filter(e => e.source !== deletingId && e.target !== deletingId);
        if (outgoing && incomings.length) {
          const successor = outgoing.target;
          incomings.forEach(inc => {
            // After deletion, inc.source will have no outgoing (since its only outgoing was to deletingId) unless it had some parallel edge (shouldn't due to rule).
            const sourceHasOtherOutgoing = filtered.some(e => e.source === inc.source);
            if (!sourceHasOtherOutgoing) {
              const edgeId = `${inc.source}-${successor}`;
              const duplicate = filtered.some(e => e.id === edgeId || (e.source === inc.source && e.target === successor));
              if (!duplicate) {
                filtered = [...filtered, { id: edgeId, source: inc.source, target: successor, animated: true }];
              }
            }
          });
        }
        return filtered;
      });
      setSelected(undefined);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, setNodes, setEdges]);

  return (
  <div className={"flex-1 h-full relative " + (paymentDragging ? 'payment-dragging' : '')}>
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeDragStart={(e, node) => {
          if (node.type === 'payment') setPaymentDragging(true);
          if (node.type === 'subflow') {
            setNodes(ns => ns.map(n => {
              if (n.id === node.id) return { ...n, className: ((n.className || '') + ' subflow-no-transition').trim() };
              if (n.parentNode === node.id) return { ...n, className: ((n.className || '') + ' node-no-transition').trim() };
              return n;
            }));
          }
        }}
        onNodeDragStop={(e, node) => {
          if (node.type === 'payment') setPaymentDragging(false);
          if (node.type === 'subflow') {
            setNodes(ns => ns.map(n => {
              if (n.id === node.id) return { ...n, className: (n.className || '').replace(/\bsubflow-no-transition\b/g, '').trim() };
              if (n.parentNode === node.id) return { ...n, className: (n.className || '').replace(/\bnode-no-transition\b/g, '').trim() };
              return n;
            }));
          }
        }}
        fitView
        nodeTypes={nodeTypes}
      >
        <DragAndDropPanel />
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
};
