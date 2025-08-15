import { useCallback } from 'react';
import { Edge, Node, OnConnect } from 'reactflow';
import { normalizeSubflowPriorities } from '../utils';

export function useFlowConnections(nodes: Node[], setNodes: (updater: (ns: Node[]) => Node[]) => void, setEdges: (updater: (es: Edge[]) => Edge[]) => void) {
  const onConnect: OnConnect = useCallback((conn) => {
    const { source, target } = conn;
    if (!source || !target) return;
    setNodes(ns => {
      const payment = ns.find(n => n.type === 'payment');
      const sourceNode = ns.find(n => n.id === source);
      const targetNode = ns.find(n => n.id === target);
      if (!sourceNode || !targetNode) return ns;
      const sourceParent = (sourceNode as any).parentNode;
      const targetParent = (targetNode as any).parentNode;

      // Case: action -> action same subflow (edge creation handled after)
      if (sourceNode.type === 'action' && targetNode.type === 'action' && sourceParent && sourceParent === targetParent) {
        return ns; // no priority change
      }

      let working = normalizeSubflowPriorities(ns);

      // payment -> action: move target subflow to first via swap
      if (payment && source === payment.id && targetParent) {
        const subs = working.filter(n => n.type === 'subflow');
        if (subs.length < 2) return working;
        const ordered = subs.slice().sort((a,b)=> ((a.data as any).priority - (b.data as any).priority));
        const first = ordered[0];
        if (first.id === targetParent) return working;
        const targetSf = subs.find(s => s.id === targetParent);
        if (!targetSf) return working;
        const pFirst = (first.data as any).priority as number;
        const pTarget = (targetSf.data as any).priority as number;
        working = working.map(n => {
          if (n.type !== 'subflow') return n;
          if (n.id === first.id) return { ...n, data: { ...(n.data||{}), priority: pTarget } };
          if (n.id === targetSf.id) return { ...n, data: { ...(n.data||{}), priority: pFirst } };
          return n;
        });
        return normalizeSubflowPriorities(working);
      }

      // action -> action cross-subflow: swap parent subflow priorities
      if (sourceNode.type === 'action' && targetNode.type === 'action' && sourceParent && targetParent && sourceParent !== targetParent) {
        const subs = working.filter(n => n.type === 'subflow');
        const a = subs.find(s => s.id === sourceParent);
        const b = subs.find(s => s.id === targetParent);
        if (!a || !b) return working;
        const pa = (a.data as any)?.priority as number;
        const pb = (b.data as any)?.priority as number;
        if (pa === pb) return working;
        working = working.map(n => {
          if (n.type !== 'subflow') return n;
          if (n.id === a.id) return { ...n, data: { ...(n.data||{}), priority: pb } };
          if (n.id === b.id) return { ...n, data: { ...(n.data||{}), priority: pa } };
          return n;
        });
        return normalizeSubflowPriorities(working);
      }
      return working;
    });

    // Edge creation for same-subflow action->action
    setEdges(es => {
      const sourceNode = nodes.find(n => n.id === source);
      const targetNode = nodes.find(n => n.id === target);
      const sourceParent = (sourceNode as any)?.parentNode;
      const targetParent = (targetNode as any)?.parentNode;
      if (sourceNode?.type === 'action' && targetNode?.type === 'action' && sourceParent && sourceParent === targetParent) {
        const id = `${source}-${target}`;
        let next = es.filter(e => !(e.source === source && e.source !== target));
        if (!next.some(e => e.id === id)) next = [...next, { id, source, target, animated: true }];
        return next;
      }
      return es;
    });
  }, [nodes, setNodes, setEdges]);

  return { onConnect };
}
