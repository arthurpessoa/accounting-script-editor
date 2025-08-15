import { useEffect } from 'react';
import { Node } from 'reactflow';

// Handles external window events to programmatically select / clear nodes in the flow
export function useExternalSelection(nodes: Node[], setNodes: (updater: (ns: Node[]) => Node[]) => void, setSelected: (n: Node | undefined) => void) {
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
  }, [nodes, setNodes, setSelected]);
}
