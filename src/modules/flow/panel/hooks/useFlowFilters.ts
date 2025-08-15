import { useState, useCallback, useEffect } from 'react';
import { useReactFlow } from 'reactflow';

interface FirstMatch { x: number; y: number; w: number }

export function useFlowFilters() {
  const reactFlow = useReactFlow();
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [acquirer, setAcquirer] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [autoApply, setAutoApply] = useState<boolean>(true);

  const applyFilter = useCallback(() => {
    const statusFilter = filterStatus.trim().toLowerCase();
    const acqFilter = acquirer.trim().toLowerCase();
    const titleFilter = title.trim().toLowerCase();
    const first: { value: FirstMatch | null } = { value: null };
    reactFlow.setNodes(ns => {
      const subflowMatch: Record<string, boolean> = {};
      ns.forEach(n => {
        if (n.type !== 'subflow') return;
        const d = n.data || ({} as any);
        const matched = (!statusFilter || (d.paymentStatus || '').toLowerCase() === statusFilter)
          && (!acqFilter || (d.acquirer || '').toLowerCase().includes(acqFilter))
          && (!titleFilter || (d.title || '').toLowerCase().includes(titleFilter));
        subflowMatch[n.id] = matched;
      });
      ns.some(n => {
        if (n.type === 'subflow' && subflowMatch[n.id]) {
          const w = (n.style?.width as number) || 400;
          first.value = { x: (n.positionAbsolute?.x ?? n.position.x), y: (n.positionAbsolute?.y ?? n.position.y), w };
          return true;
        }
        return false;
      });
      return ns.map(n => {
        if (n.type === 'payment') {
          return { ...n, data: { ...n.data, filterPaymentStatus: filterStatus || '', filterAcquirer: acquirer || '', filterTitle: title || '' }, className: (n.className || '').replace(/\bflow-faded\b/g,'').trim() };
        }
        if (n.type === 'subflow') {
          const matched = subflowMatch[n.id];
          const d = n.data || {};
          const base = { ...n, data: { ...d, searchMatch: matched } };
          return matched ? { ...base, className: (base.className||'').replace(/\bflow-faded\b/g,'').trim() } : { ...base, className: ((base.className||'').replace(/\bflow-faded\b/g,'').trim() + ' flow-faded').trim() };
        }
        if (n.type === 'action') {
          const parentMatched = n.parentNode ? subflowMatch[n.parentNode] : false;
          const d = n.data || {};
          const base = { ...n, data: { ...d, searchMatch: parentMatched } };
          return parentMatched ? { ...base, className: (base.className||'').replace(/\bflow-faded\b/g,'').trim() } : { ...base, className: ((base.className||'').replace(/\bflow-faded\b/g,'').trim() + ' flow-faded').trim() };
        }
        return n;
      });
    });
    if (first.value) {
      const { x, y, w } = first.value;
      try { reactFlow.setCenter?.(x + w / 2, y + 40, { zoom: 1, duration: 300 }); } catch (_err) { /* ignore */ }
    }
    window.dispatchEvent(new CustomEvent('clearFlowSelection'));
  }, [reactFlow, filterStatus, acquirer, title]);

  const clearFilter = useCallback(() => {
    setFilterStatus(''); setAcquirer(''); setTitle('');
    reactFlow.setNodes(ns => ns.map(n => n.type === 'payment'
      ? { ...n, data: { ...n.data, filterPaymentStatus: '', filterAcquirer: '', filterTitle: '' } }
      : (n.data?.searchMatch ? { ...n, data: { ...n.data, searchMatch: false } } : n)));
  }, [reactFlow]);

  useEffect(() => { if (autoApply) applyFilter(); }, [filterStatus, acquirer, title, autoApply, applyFilter]);
  useEffect(() => {
    const handler = () => { if (autoApply) requestAnimationFrame(() => applyFilter()); };
    window.addEventListener('subflowUpdated', handler);
    return () => window.removeEventListener('subflowUpdated', handler);
  }, [autoApply, applyFilter]);

  return { filterStatus, setFilterStatus, acquirer, setAcquirer, title, setTitle, autoApply, setAutoApply, applyFilter, clearFilter };
}
