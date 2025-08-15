import { useEffect } from 'react';
import { Edge, Node } from 'reactflow';

export function useDeleteShortcut(selected: Node | undefined, nodes: Node[], setNodes: (updater: (ns: Node[]) => Node[]) => void, setEdges: (updater: (es: Edge[]) => Edge[]) => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selected) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const deletingId = selected.id;
        const isSubflow = selected.type === 'subflow';
        setNodes(ns => ns.filter(n => n.id !== deletingId && (!isSubflow || n.parentNode !== deletingId)));
        setEdges(es => {
          if (isSubflow) {
            const childIds = new Set(nodes.filter(n => n.parentNode === deletingId).map(n => n.id));
            return es.filter(e => e.source !== deletingId && e.target !== deletingId && !childIds.has(e.source) && !childIds.has(e.target));
          }
          const incomings = es.filter(e => e.target === deletingId);
          const outgoing = es.find(e => e.source === deletingId);
          let filtered = es.filter(e => e.source !== deletingId && e.target !== deletingId);
            if (outgoing && incomings.length) {
              const successor = outgoing.target;
              incomings.forEach(inc => {
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
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, setNodes, setEdges, nodes]);
}
