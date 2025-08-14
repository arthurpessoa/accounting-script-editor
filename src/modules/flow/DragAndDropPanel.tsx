import React, { useState, useEffect, useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import './dnd.css';
import { v4 as uuid } from 'uuid';

export const DragAndDropPanel: React.FC = () => {
  const reactFlow = useReactFlow();
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [acquirer, setAcquirer] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [autoApply, setAutoApply] = useState<boolean>(true);

  interface FirstMatch { x: number; y: number; w: number }
  const applyFilter = useCallback(() => {
    const statusFilter = filterStatus.trim().toLowerCase();
    const acqFilter = acquirer.trim().toLowerCase();
    const titleFilter = title.trim().toLowerCase();
    const first: { value: FirstMatch | null } = { value: null };
    reactFlow.setNodes(ns => ns.map(n => {
      if (n.type === 'payment') {
        return { ...n, data: { ...n.data, filterPaymentStatus: filterStatus || '', filterAcquirer: acquirer || '', filterTitle: title || '' } };
      }
      if (n.type === 'subflow') {
        const d = n.data || {};
        const matched = (!statusFilter || (d.paymentStatus || '').toLowerCase() === statusFilter)
          && (!acqFilter || (d.acquirer || '').toLowerCase().includes(acqFilter))
          && (!titleFilter || (d.title || '').toLowerCase().includes(titleFilter));
        if (matched && !first.value) {
          const w = (n.style?.width as number) || 400;
          first.value = { x: (n.positionAbsolute?.x ?? n.position.x), y: (n.positionAbsolute?.y ?? n.position.y), w };
        }
        if (d.searchMatch === matched) return n;
        return { ...n, data: { ...d, searchMatch: matched } };
      }
      if (n.type === 'action') {
        const parentMatched = n.parentNode ? (ns.find(s => s.id === n.parentNode)?.data?.searchMatch || false) : false;
        const d = n.data || {};
        if (d.searchMatch === parentMatched) return n;
        return { ...n, data: { ...d, searchMatch: parentMatched } };
      }
      return n;
    }));
    if (first.value) {
      const { x, y, w } = first.value;
      try { reactFlow.setCenter?.(x + w / 2, y + 40, { zoom: 1, duration: 300 }); } catch (_err) {
        // ignore viewport centering errors
      }
    }
  }, [reactFlow, filterStatus, acquirer, title]);

  const clearFilter = () => {
    setFilterStatus(''); setAcquirer(''); setTitle('');
    reactFlow.setNodes(ns => ns.map(n => n.type === 'payment'
      ? { ...n, data: { ...n.data, filterPaymentStatus: '', filterAcquirer: '', filterTitle: '' } }
      : (n.data?.searchMatch ? { ...n, data: { ...n.data, searchMatch: false } } : n)));
  };

  useEffect(() => {
    if (autoApply) applyFilter();
  }, [filterStatus, acquirer, title, autoApply, applyFilter]);

  // Re-apply filter when a subflow updates (status/acquirer/title) externally
  useEffect(() => {
    const handler = () => { if (autoApply) requestAnimationFrame(()=>applyFilter()); };
    window.addEventListener('subflowUpdated', handler);
    return () => window.removeEventListener('subflowUpdated', handler);
  }, [autoApply, applyFilter]);

  const addSubflow = () => {
    const id = uuid();
    const width = 400;
    const height = 300;
    // Find a free spot (simple grid scan avoiding overlaps with existing subflows)
    const existingSubflows = reactFlow.getNodes().filter(n => n.type === 'subflow');
    const startX = 50, startY = 50;
    const stepX = width + 80; // horizontal gap
    const stepY = height + 80; // vertical gap
    const maxCols = 4;
    let position = { x: startX, y: startY };
    const margin = 20;
    const overlaps = (x: number, y: number) => {
      return existingSubflows.some(n => {
        const w = (n.style?.width as number) || width;
        const h = (n.style?.height as number) || height;
        return !(
          x + width + margin < n.position.x ||
          x > n.position.x + w + margin ||
          y + height + margin < n.position.y ||
          y > n.position.y + h + margin
        );
      });
    };
    outer: {
      for (let row = 0; row < 12; row++) {
        for (let col = 0; col < maxCols; col++) {
          const x = startX + col * stepX;
          const y = startY + row * stepY;
          if (!overlaps(x, y)) { position = { x, y }; break outer; }
        }
      }
      // Fallback: slight random offset if grid filled
      if (existingSubflows.length) {
        const last = existingSubflows[existingSubflows.length - 1];
        position = { x: last.position.x + 60, y: last.position.y + 60 };
      }
    }
    const subflowNode = {
      id,
      type: 'subflow' as const,
      className: 'subflow-node',
      position,
      data: { title: `Subflow ${id.slice(0,4)}`, paymentStatus: 'Scheduled', acquirer: '' },
      style: { width, height, padding: 10, background: 'rgba(243,244,246,0.55)', border: '2px solid #6366f1', borderRadius: 8, overflow: 'visible', zIndex: 0 }
    };
    // Automatically add an Empty Action inside the new subflow
    const actionId = uuid();
    const emptyAction = {
      id: actionId,
      type: 'action' as const,
      position: { x: 40, y: 40 }, // margin from top-left
      data: { name: 'Empty Action', label: 'Empty Action', creditAccount: '', debitAccount: '' },
      parentNode: id,
      extent: 'parent' as const
    };
    reactFlow.addNodes([subflowNode, emptyAction]);
    // Ensure filters/searchMatch are updated immediately after structural change
    if (autoApply) {
      requestAnimationFrame(() => applyFilter());
    } else {
      // Still dispatch so external listeners can react if needed
      window.dispatchEvent(new CustomEvent('subflowUpdated', { detail: { id } }));
    }
  };

  return (
    <div className="dnd-panel flex flex-col gap-3 text-xs max-w-[220px]">
      <div className="flex flex-col gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">Add</h4>
        <button
          onClick={addSubflow}
          className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          title="Add Subflow"
          aria-label="Add Subflow"
        >
          ➕ <span>Add Subflow</span>
        </button>
      </div>
      <div className="flex flex-col gap-2 border-t pt-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">Find Subflows</h4>
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">Payment Status</span>
            <select value={filterStatus} onChange={e=> setFilterStatus(e.target.value)} className="px-2 py-1 rounded border text-[11px] bg-white">
              <option value="Scheduled">Scheduled</option>
              <option value="Canceled">Canceled</option>
              <option value="Completed">Completed</option>
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">Acquirer</span>
            <input value={acquirer} onChange={e=>setAcquirer(e.target.value)} placeholder="contains" className="px-2 py-1 rounded border text-[11px]" />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">Title</span>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="contains" className="px-2 py-1 rounded border text-[11px]" />
          </label>
          <label className="inline-flex items-center gap-1 mt-1 select-none cursor-pointer text-[11px]">
            <input type="checkbox" checked={autoApply} onChange={e=>setAutoApply(e.target.checked)} className="scale-90" />
            <span>Auto apply</span>
          </label>
          {!autoApply && (
            <div className="flex gap-2 mt-1">
              <button onClick={applyFilter} className="flex-1 px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] flex items-center gap-1" title="Apply Filters" aria-label="Apply Filters">✅ <span>Apply</span></button>
              <button onClick={clearFilter} className="px-2 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-[11px] flex items-center gap-1" title="Clear Filters" aria-label="Clear Filters">🧹 <span>Clear</span></button>
            </div>
          )}
          {autoApply && (
            <button onClick={clearFilter} className="mt-1 px-2 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-[11px] flex items-center gap-1" title="Clear Filters" aria-label="Clear Filters">🧹 <span>Clear</span></button>
          )}
        </div>
      </div>
    </div>
  );
};
