import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, { Background, Controls, MiniMap, addEdge, Connection, Edge, Node, OnConnect, useEdgesState, useNodesState, OnSelectionChangeParams, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { useScriptStore } from './store';
import { nodeTypes } from './nodes';
import './flow.css';
import { DragAndDropPanel } from './DragAndDropPanel';

// Legacy script object removed; we just manage nodes/edges in component state.

export const FlowEditor: React.FC = () => {
  const { setNodesJson } = useScriptStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selected, setSelected] = useState<Node | undefined>();

  // Enforce handle positions (top target, bottom source) for vertical flow
  useEffect(() => {
    setNodes(ns => ns.map(n => ({ ...n, sourcePosition: Position.Bottom, targetPosition: Position.Top })));
  }, [setNodes]);

  // Ensure subflow styling stays transparent enough for edges to be visible
  useEffect(() => {
    setNodes(ns => ns.map(n => {
      if (n.type === 'subflow') {
        const style = { ...(n.style || {}) };
        // Only override background if it's fully opaque default we previously set
        if (!style.background || style.background === '#f3f4f6') {
          style.background = 'rgba(243,244,246,0.55)';
        }
        style.zIndex = 0;
        style.overflow = 'visible';
        const className = n.className && n.className.includes('subflow-node') ? n.className : ((n.className ? n.className + ' ' : '') + 'subflow-node');
        return { ...n, style, className };
      }
      return n;
    }));
  }, [setNodes]);

  // Auto-resize subflows to fit contained action nodes (responsive container)
  useEffect(() => {
    const PADDING = 30;
    const MIN_W = 300;
    const MIN_H = 200;
    let changed = false;
    setNodes(current => {
      const subflows = current.filter(n => n.type === 'subflow');
      if (!subflows.length) return current;
      const next = current.map(n => ({ ...n }));
      for (const sf of subflows) {
        const children = current.filter(c => c.parentNode === sf.id && c.type !== 'subflow');
        if (!children.length) continue;
        let maxX = 0, maxY = 0;
        for (const c of children) {
          const cw = (c.width ?? 140); // fallback guess
          const ch = (c.height ?? 70);
          const cx = c.position.x;
          const cy = c.position.y;
          maxX = Math.max(maxX, cx + cw);
          maxY = Math.max(maxY, cy + ch);
        }
        const neededW = Math.max(MIN_W, maxX + PADDING);
        const neededH = Math.max(MIN_H, maxY + PADDING);
        const idx = next.findIndex(n => n.id === sf.id);
        if (idx >= 0) {
          const style = { ...(next[idx].style || {}) };
          if (style.width !== neededW || style.height !== neededH) {
            style.width = neededW;
            style.height = neededH;
            // No transition to avoid perceived animation while resizing
            if (style.transition) delete style.transition;
            next[idx] = { ...next[idx], style };
            changed = true;
          }
        }
      }
      return changed ? next : current;
    });
  }, [nodes, setNodes]);

  // Auto-layout: arrange action nodes inside each subflow; prefer chain order, then responsive multi-column grid.
  useEffect(() => {
    setNodes(current => {
      const subflows = current.filter(n => n.type === 'subflow');
      if (!subflows.length) return current;
      const edgeList = edges; // capture closure
      let anyChange = false;
      const updated = current.map(n => n); // shallow copy references first
      for (const sf of subflows) {
        const width = (sf.style?.width as number) || 400;
        const children = current.filter(c => c.parentNode === sf.id && c.type === 'action');
        if (!children.length) continue;
        const childIds = new Set(children.map(c => c.id));
        const insideEdges = edgeList.filter(e => childIds.has(e.source) && childIds.has(e.target));
        // Build chain order: find heads (no incoming inside)
        const incomingCount: Record<string, number> = {};
        children.forEach(c => incomingCount[c.id] = 0);
        insideEdges.forEach(e => { incomingCount[e.target] = (incomingCount[e.target] || 0) + 1; });
        const heads = children.filter(c => (incomingCount[c.id] || 0) === 0);
        let ordered: typeof children = [];
        if (heads.length === 1) {
          // traverse
          let currentId = heads[0].id;
          const safety = children.length + 5;
          let steps = 0;
          const visited = new Set<string>();
          while (currentId && steps < safety && !visited.has(currentId)) {
            steps++;
            visited.add(currentId);
            const node = children.find(c => c.id === currentId);
            if (node) ordered.push(node);
            const nextEdge = insideEdges.find(e => e.source === currentId);
            currentId = nextEdge?.target || '';
          }
          if (ordered.length !== children.length) {
            // fallback to y sort
            ordered = children.slice().sort((a, b) => a.position.y - b.position.y);
          }
        } else {
          ordered = children.slice().sort((a, b) => a.position.y - b.position.y);
        }
        // Responsive grid parameters
        const nodeW = 160;
        const nodeH = 70;
        const gapX = 40;
        const gapY = 90;
        const innerPaddingX = 40;
        const startY = 140;
        const usableWidth = width - innerPaddingX * 2;
        const columns = Math.max(1, Math.floor((usableWidth + gapX) / (nodeW + gapX)));
        ordered.forEach((node, idx) => {
          const col = idx % columns;
          const row = Math.floor(idx / columns);
          const totalRowWidth = columns * nodeW + (columns - 1) * gapX;
          const offsetX = (width - totalRowWidth) / 2; // center grid
          const desiredX = offsetX + col * (nodeW + gapX);
          const desiredY = startY + row * gapY;
          const i = updated.findIndex(n => n.id === node.id);
          if (i >= 0) {
            const orig = updated[i];
            if (Math.abs(orig.position.x - desiredX) > 1 || Math.abs(orig.position.y - desiredY) > 1) {
              updated[i] = { ...orig, position: { x: desiredX, y: desiredY } };
              anyChange = true;
            }
          }
        });
      }
      return anyChange ? updated : current;
    });
  }, [nodes, edges, setNodes]);

  // Highlight: start from the global head of the linear chain that the selection belongs to (ascend across subflows)
  useEffect(() => {
    setNodes(ns => {
      if (!selected) {
        let changed = false;
        const cleared = ns.map(n => {
          if (n.data?.highlighted || n.data?.conflict) { changed = true; return { ...n, data: { ...n.data, highlighted: false, conflict: false } }; }
          return n;
        });
        return changed ? cleared : ns;
      }
      // Determine an initial origin inside the selected subflow (or the action itself)
      let containerId: string | undefined = (selected as any).type === 'subflow' ? selected.id : (selected as any).parentNode;
      if (!containerId && (selected as any).type === 'action') containerId = (selected as any).parentNode; // could be undefined (no subflow)
      let originId: string | undefined;
      if (containerId) {
        const children = ns.filter(n => n.parentNode === containerId && n.type === 'action');
        if (children.length) {
          const childIds = new Set(children.map(c => c.id));
          const incomingCounts: Record<string, number> = {};
          children.forEach(c => incomingCounts[c.id] = 0);
          edges.forEach(e => { if (childIds.has(e.target) && childIds.has(e.source)) incomingCounts[e.target] = (incomingCounts[e.target] || 0) + 1; });
          const heads = children.filter(c => (incomingCounts[c.id] || 0) === 0);
          if (heads.length === 1) originId = heads[0].id; else if (heads.length > 1) originId = heads.slice().sort((a, b) => a.position.y - b.position.y)[0].id; else originId = children.slice().sort((a, b) => a.position.y - b.position.y)[0].id;
        }
      }
      if (!originId && (selected as any).type === 'action') originId = selected.id;
      if (!originId) {
        // Nothing to highlight
        let changed = false;
        const cleared = ns.map(n => {
          if (n.data?.highlighted || n.data?.conflict) { changed = true; return { ...n, data: { ...n.data, highlighted: false, conflict: false } }; }
          return n;
        });
        return changed ? cleared : ns;
      }
      // Ascend upstream across subflows to find global root (stop on no incoming or cycle)
      const visited = new Set<string>();
      let upstream = originId;
      while (true) {
        if (visited.has(upstream)) break; // cycle guard
        visited.add(upstream);
        const incoming = edges.filter(e => e.target === upstream);
        if (incoming.length !== 1) break; // zero or branching -> stop
        const nextUp = incoming[0].source;
        // ensure node exists
        if (!ns.some(n => n.id === nextUp)) break;
        upstream = nextUp;
      }
      originId = upstream;
      // Forward traversal from global origin
      const reachable = new Set<string>();
      const order: string[] = [];
      const stack: string[] = [originId];
      while (stack.length) {
        const cur = stack.pop()!;
        if (!reachable.has(cur)) {
          reachable.add(cur);
          order.push(cur);
          edges.filter(e => e.source === cur).forEach(e => { if (!reachable.has(e.target)) stack.push(e.target); });
        }
      }
      const pathSet = new Set<string>([originId, ...reachable]);
      const nameFreq: Record<string, number> = {};
      const firstNameId: Record<string, string> = {};
      ns.forEach(n => {
        if (!pathSet.has(n.id) || n.type !== 'action') return;
        const name = (n.data?.name || '').trim();
        if (name) nameFreq[name] = (nameFreq[name] || 0) + 1;
      });
      order.forEach(id => {
        const node = ns.find(n => n.id === id);
        if (!node || node.type !== 'action') return;
        if (!pathSet.has(node.id)) return;
        const name = (node.data?.name || '').trim();
        if (!name) return;
        if (!firstNameId[name]) firstNameId[name] = node.id;
      });
      let changed = false;
      const next = ns.map(n => {
        const highlighted = pathSet.has(n.id) && n.type !== 'subflow';
        const name = (n.data?.name || '').trim();
        const hasDup = highlighted && !!name && nameFreq[name] > 1;
        const conflictPrimary = hasDup && firstNameId[name] === n.id;
        const conflict = hasDup && !conflictPrimary;
        const needsUpdate = (n.data?.highlighted || false) !== highlighted || (n.data?.conflict || false) !== conflict || (n.data?.conflictPrimary || false) !== conflictPrimary || (n.data?.conflictPrimaryId || '') !== (hasDup ? firstNameId[name] : (n.data?.conflictPrimaryId || ''));
        if (needsUpdate) { changed = true; return { ...n, data: { ...n.data, highlighted, conflict, conflictPrimary, conflictPrimaryId: hasDup ? firstNameId[name] : undefined } }; }
        return n;
      });
      return changed ? next : ns;
    });
  }, [selected, edges, nodes, setNodes]);

  // Backfill missing name field for legacy nodes so conflict detection works consistently
  useEffect(() => {
    setNodes(ns => {
      let changed = false; const updated = ns.map(n => {
        if (n.type === 'action' && (!n.data?.name) && n.data?.label) { changed = true; return { ...n, data: { ...n.data, name: n.data.label } }; }
        return n;
      });
      return changed ? updated : ns;
    });
  }, [setNodes]);

  const onConnect: OnConnect = useCallback((params: Edge | Connection) => {
    setEdges((eds) => {
      // New rule: allow multiple incoming edges, but only one outgoing per source
      if (eds.some(e => e.source === params.source)) {
        return eds; // disallow additional outgoing from the same source
      }
      return addEdge({ ...params, animated: true }, eds);
    });
  }, [setEdges]);

  const handleExport = () => {
    const json = JSON.stringify({ nodes, edges }, null, 2);
    setNodesJson(json);
    navigator.clipboard.writeText(json).catch(console.error);
    alert('Graph copied to clipboard');
  };

  const onSelectionChange = (params: OnSelectionChangeParams) => {
    setSelected(params.nodes[0]);
  };

  // Listen for external selection requests (e.g., from conflict tooltip buttons)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const nodeId: string = typeof detail === 'string' ? detail : detail.nodeId;
      if (!nodeId) return;
      setNodes(ns => ns.map(n => ({ ...n, selected: n.id === nodeId })));
      const found = nodes.find(n => n.id === nodeId);
      if (found) setSelected(found as Node);
    };
    window.addEventListener('externalNodeSelect', handler as EventListener);
    return () => window.removeEventListener('externalNodeSelect', handler as EventListener);
  }, [nodes, setNodes]);

  // Delete selected node with Delete / Backspace key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selected) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return; // avoid interfering with text inputs
      const deletingId = selected.id;
      const isSubflow = (selected as any).type === 'subflow';
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
                filtered = [...filtered, { id: edgeId, source: inc.source, target: successor, animated: true } as Edge];
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
    <div className="flex-1 h-full relative">
      <div className="absolute z-10 top-2 left-2 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded shadow flex gap-2 text-xs border border-neutral-200">
        <button className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors" onClick={handleExport}>Export JSON</button>
      </div>
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeDragStart={(e, node) => {
          if (node.type === 'subflow') {
            setNodes(ns => ns.map(n => n.id === node.id ? { ...n, className: ((n.className || '') + ' subflow-no-transition').trim() } : n));
            // add no-transition class to children for drag duration
            setNodes(ns => ns.map(n => n.parentNode === node.id ? { ...n, className: ((n.className || '') + ' node-no-transition').trim() } : n));
          }
        }}
        onNodeDragStop={(e, node) => {
          if (node.type === 'subflow') {
            setNodes(ns => ns.map(n => n.id === node.id ? { ...n, className: (n.className || '').replace(/\bsubflow-no-transition\b/g, '').trim() } : n));
            // remove no-transition from children
            setNodes(ns => ns.map(n => n.parentNode === node.id ? { ...n, className: (n.className || '').replace(/\bnode-no-transition\b/g, '').trim() } : n));
          }
        }}
        fitView
        nodeTypes={nodeTypes}
      >
        <DragAndDropPanel selectedSubflowId={selected?.type === 'subflow' ? selected.id : undefined} />
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
};
