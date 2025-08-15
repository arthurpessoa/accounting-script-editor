import { Edge, Node, Position } from 'reactflow';

// Layout configuration
export const LAYOUT = {
  paymentRoot: { x: 40, y: 40 },
  subflowGrid: { marginX: 50, marginY: 50, gapX: 80, gapY: 80 },
  subflowSize: { padding: 30, minWidth: 300, minHeight: 200 },
  actionLayout: { nodeWidth: 160, nodeHeight: 70, gapX: 40, gapY: 90, innerPaddingX: 40, startY: 140 }
} as const;

export function ensurePaymentRoot(nodes: Node[]): Node[] {
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

export function computeAutoEdges(nodes: Node[], existing: Edge[]): Edge[] {
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
    if (pa !== pb) return pa - pb; // ascending
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

export function layoutSubflows(nodes: Node[], previousIds: string[]): Node[] | null {
  const subflows = nodes.filter(n => n.type === 'subflow');
  const ids = subflows.map(s => s.id).sort();
  const changed = ids.length !== previousIds.length || ids.some((id, i) => id !== previousIds[i]);
  if (!changed) return null;
  const { marginX, marginY, gapX, gapY } = LAYOUT.subflowGrid;
  const payment = nodes.find(n => n.type === 'payment');
  const paymentClearance = 120;
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

export function resizeSubflows(nodes: Node[]): Node[] | null {
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

export function layoutActions(nodes: Node[], edges: Edge[]): Node[] | null {
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

export function highlightSelection(nodes: Node[], edges: Edge[], selected?: Node): Node[] | null {
  if (!selected) {
    let changed = false; const cleared = nodes.map(n => {
      if (n.data?.highlighted || n.data?.conflict) { changed = true; return { ...n, data: { ...n.data, highlighted: false, conflict: false, conflictPrimary: false, conflictPrimaryId: undefined } }; }
      return n;
    });
    return changed ? cleared : null;
  }
  const ns = nodes;
  const containerId: string | undefined = selected.type === 'subflow' ? selected.id : (selected as any).parentNode;
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

export function normalizeSubflowPriorities(nodes: Node[]): Node[] {
  const subs = nodes.filter(n => n.type === 'subflow');
  if (!subs.length) return nodes;
  const ordered = subs.slice().sort((a,b)=> {
    const pa = typeof (a.data as any)?.priority === 'number' ? (a.data as any).priority : Number.MAX_SAFE_INTEGER;
    const pb = typeof (b.data as any)?.priority === 'number' ? (b.data as any).priority : Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    const dy = a.position.y - b.position.y; if (dy) return dy;
    const dx = a.position.x - b.position.x; if (dx) return dx;
    return a.id.localeCompare(b.id);
  });
  return nodes.map(n => {
    if (n.type !== 'subflow') return n;
    const idx = ordered.findIndex(s => s.id === n.id);
    if (idx < 0) return n;
    const currentP = typeof (n.data as any)?.priority === 'number' ? (n.data as any).priority : undefined;
    if (currentP === idx) return n;
    return { ...n, data: { ...(n.data||{}), priority: idx } };
  });
}
