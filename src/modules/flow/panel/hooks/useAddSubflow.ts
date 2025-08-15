import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { v4 as uuid } from 'uuid';

export function useAddSubflow(autoApply: boolean, applyFilter: () => void) {
  const reactFlow = useReactFlow();

  const addSubflow = useCallback(() => {
    const id = uuid();
    const width = 400; const height = 300;
    const nodes = reactFlow.getNodes();
    const payment = nodes.find(n => n.type === 'payment');
    const paymentBottom = payment ? (payment.position.y + 120) : 50;
    const existingSubflows = nodes.filter(n => n.type === 'subflow');
    const startX = 50, startY = paymentBottom; const stepX = width + 80; const stepY = height + 80; const maxCols = 4; let position = { x: startX, y: startY }; const margin = 20;
    const overlaps = (x: number, y: number) => existingSubflows.some(n => {
      const w = (n.style?.width as number) || width; const h = (n.style?.height as number) || height;
      return !(x + width + margin < n.position.x || x > n.position.x + w + margin || y + height + margin < n.position.y || y > n.position.y + h + margin);
    });
    outer: {
      for (let row = 0; row < 12; row++) {
        for (let col = 0; col < maxCols; col++) {
          const x = startX + col * stepX; const y = startY + row * stepY;
          if (!overlaps(x, y)) { position = { x, y }; break outer; }
        }
      }
      if (existingSubflows.length) {
        const last = existingSubflows[existingSubflows.length - 1];
        position = { x: last.position.x + 60, y: Math.max(last.position.y + 60, paymentBottom) };
      }
    }
    const maxPriority = existingSubflows.reduce((m, s) => { const p = typeof s.data?.priority === 'number' ? s.data.priority : m; return p > m ? p : m; }, -1);
    const nextPriority = maxPriority + 1;
    const subflowNode = { id, type: 'subflow' as const, className: 'subflow-node', position, data: { title: `Subflow ${id.slice(0,4)}`, paymentStatus: 'Scheduled', acquirer: '', priority: nextPriority }, style: { width, height, padding: 10, background: 'rgba(243,244,246,0.55)', border: '2px solid #6366f1', borderRadius: 8, overflow: 'visible', zIndex: 0 } };
    const actionId = uuid();
    const emptyAction = { id: actionId, type: 'action' as const, position: { x: 40, y: 40 }, data: { name: 'Nova Movimentação', label: 'Nova Movimentação', creditAccount: '', debitAccount: '' }, parentNode: id, extent: 'parent' as const };
    reactFlow.addNodes([subflowNode, emptyAction]);
    if (autoApply) { requestAnimationFrame(() => applyFilter()); } else { window.dispatchEvent(new CustomEvent('subflowUpdated', { detail: { id } })); }
  }, [reactFlow, autoApply, applyFilter]);

  return { addSubflow };
}
