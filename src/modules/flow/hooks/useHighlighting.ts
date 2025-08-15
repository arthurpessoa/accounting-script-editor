import { useEffect } from 'react';
import { Edge, Node } from 'reactflow';
import { computeAutoEdges, highlightSelection } from '../utils';

export function useHighlighting(nodes: Node[], selected: Node | undefined, setNodes: (updater: (ns: Node[]) => Node[]) => void, edges: Edge[], setEdges: (updater: (es: Edge[]) => Edge[]) => void) {
  // Sync auto-edges + highlighting
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

  // Recompute highlight if edges change separately
  useEffect(() => {
    if (!selected) return;
    setNodes(ns => { const updated = highlightSelection(ns, edges, selected); return updated || ns; });
  }, [edges, selected, setNodes]);

  // Annotate role flags (isHead/isTail/hasOutgoing) + connection drag highlighting
  useEffect(() => {
    setNodes(ns => {
      // Build per-subflow action graph stats
      const group: Record<string, { actions: Node[]; incoming: Record<string, number>; outgoing: Record<string, number> }> = {};
      ns.forEach(n => {
        if (n.type === 'action' && n.parentNode) {
          if (!group[n.parentNode]) group[n.parentNode] = { actions: [], incoming: {}, outgoing: {} };
          group[n.parentNode].actions.push(n);
        }
      });
      Object.values(group).forEach(g => {
        const idSet = new Set(g.actions.map(a => a.id));
        g.actions.forEach(a => { g.incoming[a.id] = 0; g.outgoing[a.id] = 0; });
        edges.forEach(e => { if (idSet.has(e.source) && idSet.has(e.target)) { g.outgoing[e.source]++; g.incoming[e.target]++; } });
      });
      let changed = false;
      const next = ns.map(n => {
        if (n.type !== 'action') return n;
        const g = n.parentNode ? group[n.parentNode] : undefined;
        const hasOutgoing = edges.some(e => e.source === n.id);
        const isHead = g ? g.incoming[n.id] === 0 : false;
        const isTail = g ? g.outgoing[n.id] === 0 : !hasOutgoing;
        const d: any = n.data || {};
        if (d.hasOutgoing === hasOutgoing && d.isHead === isHead && d.isTail === isTail) return n;
        changed = true;
        return { ...n, data: { ...d, hasOutgoing, isHead, isTail } };
      });
      return changed ? next : ns;
    });
  }, [edges, setNodes]);
}
