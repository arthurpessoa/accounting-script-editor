import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';

export function useExportFlows() {
  const reactFlow = useReactFlow();
  const exportFlows = useCallback(() => {
    const nodes = reactFlow.getNodes();
    const subflows = nodes.filter(n => n.type === 'subflow').map(sf => {
      const actions = nodes.filter(a => a.type === 'action' && a.parentNode === sf.id);
      return { id: sf.id, type: sf.type, position: sf.position, style: sf.style, data: sf.data, nodes: actions.map(a => ({ id: a.id, type: a.type, position: a.position, parentNode: a.parentNode, data: a.data, style: a.style })) };
    });
    const payload = { subflows };
    const json = JSON.stringify(payload, null, 2);
    try { navigator.clipboard?.writeText(json).catch(()=>{}); } catch (_e) { /* ignore */ }
    // eslint-disable-next-line no-console
    console.log('[Flow Export]', json);
    try { window.dispatchEvent(new CustomEvent('flowExported', { detail: { count: subflows.length } })); } catch (_e) { /* ignore */ }
  }, [reactFlow]);
  return { exportFlows };
}
