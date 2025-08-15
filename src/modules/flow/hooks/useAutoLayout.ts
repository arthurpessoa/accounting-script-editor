import { useEffect, useRef } from 'react';
import { Edge, Node, Position } from 'reactflow';
import { ensurePaymentRoot, layoutSubflows, resizeSubflows, layoutActions } from '../utils';

// Handles structural/layout related node adjustments (payment root, subflow grid, action layout, resizing)
export function useAutoLayout(nodes: Node[], edges: Edge[], setNodes: (updater: (ns: Node[]) => Node[]) => void) {
  const lastSubflowIdsRef = useRef<string[]>([]);

  useEffect(() => {
    setNodes(current => {
      let work = ensurePaymentRoot(current);
      const relayout = layoutSubflows(work, lastSubflowIdsRef.current); if (relayout) { work = relayout; lastSubflowIdsRef.current = work.filter(n => n.type === 'subflow').map(s => s.id).sort(); }
      const laidOut = layoutActions(work, edges); if (laidOut) work = laidOut;
      const resized = resizeSubflows(work); if (resized) work = resized;
      // enforce handle positions + subflow styling normalizations
      let changed = !!relayout || !!laidOut || !!resized;
      const next = work.map(n => {
        let mutated = false; const copy: Node & { className?: string } = { ...n } as Node & { className?: string };
        if (copy.sourcePosition !== Position.Bottom || copy.targetPosition !== Position.Top) { copy.sourcePosition = Position.Bottom; copy.targetPosition = Position.Top; mutated = true; }
        if (copy.type === 'subflow') {
          const style = { ...(copy.style || {}) } as any;
          if (!style.background || style.background === '#f3f4f6') { style.background = 'rgba(243,244,246,0.55)'; mutated = true; }
          if (style.zIndex !== 0) { style.zIndex = 0; mutated = true; }
          if (style.overflow !== 'visible') { style.overflow = 'visible'; mutated = true; }
          if (!copy.className || !copy.className.includes('subflow-node')) { copy.className = ((copy.className ? copy.className + ' ' : '') + 'subflow-node').trim(); mutated = true; }
          copy.style = style;
        }
        if (copy.type === 'action') {
          const d: any = copy.data || {};
          if (d?.label && !d.name) { copy.data = { ...d, name: d.label }; mutated = true; }
        }
        if (mutated) { changed = true; return copy; }
        return n;
      });
      return changed ? next : current;
    });
  }, [nodes, edges, setNodes]);
}
