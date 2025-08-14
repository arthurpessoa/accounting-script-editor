import React, { useState, useEffect, useRef } from 'react';
import { Handle, NodeProps, Position, useReactFlow, Connection, Edge } from 'reactflow';

export const ActionNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const reactFlow = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(data?.name || data?.label || 'action');
  const [credit, setCredit] = useState<string>(data?.creditAccount || '');
  const [debit, setDebit] = useState<string>(data?.debitAccount || '');
  const [showConflictTip, setShowConflictTip] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const showConflict = () => {
    if (hideTimerRef.current) { window.clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    if (data?.conflict) setShowConflictTip(true);
  };
  const scheduleHideConflict = () => {
    if (hideTimerRef.current) { window.clearTimeout(hideTimerRef.current); }
    hideTimerRef.current = window.setTimeout(() => {
      setShowConflictTip(false);
      hideTimerRef.current = null;
    }, 350);
  };
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
  reactFlow.setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, name: value, label: value, creditAccount: credit, debitAccount: debit } } : n));
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') {
  setValue(data?.name || data?.label || 'action');
      setEditing(false);
    }
  };

  const [showHandleMenu, setShowHandleMenu] = useState<false | 'b'>(false);
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null);

  const createAndConnect = () => {
    const newId = crypto.randomUUID();
    // Try to place new node visually below current node for vertical flow
    const current = reactFlow.getNode(id as string);
  const position = current ? { x: current.position.x, y: current.position.y + 120 } : { x: 150 + (Math.random()*40), y: 80 + (Math.random()*40) };
  const parentNode = current?.parentNode; // ensure new node stays inside same subflow
  reactFlow.setNodes(ns => [...ns, { id: newId, type: 'action', position, data: { name: 'action ' + newId.slice(0,4), label: 'action ' + newId.slice(0,4) }, parentNode, extent: parentNode ? 'parent' : undefined }]);
    reactFlow.setEdges(es => {
      const existing = es.find(e => e.source === id);
      let updated = es.filter(e => e !== existing);
      updated = [...updated, { id: `${id}-${newId}`, source: id, target: newId, animated: true } as Edge];
      if (existing) {
        updated = [...updated, { id: `${newId}-${existing.target}`, source: newId, target: existing.target, animated: true } as Edge];
      }
      return updated;
    });
    setShowHandleMenu(false);
  };

  const connectToExisting = () => {
    // Future: open a modal; for now just hide menu.
    setShowHandleMenu(false);
  };

  return (
  <div
    className={[
      'relative min-w-[140px] rounded-md p-2 text-[12px] transition-colors duration-150',
      'shadow-sm',
      selected ? 'border-2 border-sky-500 shadow-[0_0_0_2px_rgba(14,165,233,0.25)]' : 'border',
  data?.conflict ? 'bg-neutral-100 border-neutral-300 opacity-[0.85]' : (data?.highlighted ? 'bg-green-100 border-green-600' : 'bg-sky-50 border-sky-600')
    ].join(' ')}
    onDoubleClick={() => setEditing(true)}
    onMouseEnter={showConflict}
    onMouseLeave={scheduleHideConflict}
  >
      <strong className="font-semibold text-[11px] uppercase tracking-wide text-neutral-600">Action</strong>
      <div className="flex flex-col gap-1 mt-1">
        {editing ? (
          <div className="flex flex-col gap-1">
            <input
              ref={inputRef}
              placeholder="Name"
              value={value}
              className="w-full text-[12px] px-1 py-0.5 border rounded"
              onChange={e => setValue(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <input
              placeholder="CreditAccount"
              value={credit}
              className="w-full text-[12px] px-1 py-0.5 border rounded"
              onChange={e => setCredit(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <input
              placeholder="DebitAccount"
              value={debit}
              className="w-full text-[12px] px-1 py-0.5 border rounded"
              onChange={e => setDebit(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <div className="flex gap-1 pt-1">
              <button className="text-[10px] px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-white" onClick={commit}>Save</button>
              <button className="text-[10px] px-2 py-1 rounded bg-neutral-300 hover:bg-neutral-200" onClick={() => { setValue(data?.label || 'action'); setCredit(data?.creditAccount||''); setDebit(data?.debitAccount||''); setEditing(false); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="font-medium text-neutral-800">{value || 'action'}</div>
            {(credit || debit) && (<div className="opacity-70">{credit && `Cr: ${credit}`} {debit && `Db: ${debit}`}</div>)}
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Top} id="t" />
      <Handle type="source" position={Position.Bottom} id="b"
        onMouseEnter={() => setShowHandleMenu('b')}
        onMouseLeave={() => setShowHandleMenu(false)}
      />
      {showHandleMenu && (
        <div className="absolute left-1/2 -bottom-1 translate-x-[-50%] translate-y-full bg-white border border-sky-600 rounded p-1 flex flex-row gap-1 z-20 shadow"
             onMouseEnter={() => setShowHandleMenu('b')}
             onMouseLeave={() => setShowHandleMenu(false)}>
          <button className="text-[10px] px-1.5 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white" onClick={createAndConnect}>+ New</button>
          <button className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 hover:bg-neutral-300" onClick={connectToExisting}>Link</button>
        </div>
      )}
      {data?.conflict && showConflictTip && (
        <div className="absolute -top-1 -right-1 translate-x-full -translate-y-full bg-neutral-900 text-white px-2 py-1 text-[10px] rounded max-w-[200px] z-30 shadow-lg"
             onMouseEnter={showConflict}
             onMouseLeave={scheduleHideConflict}>
          <div className="font-semibold mb-1">Name conflict</div>
          <div className="leading-tight">This node name duplicates the first node in this path.</div>
          {data?.conflictPrimaryId && (
            <button className="mt-1.5 text-[10px] bg-neutral-300 text-neutral-700 border border-neutral-300 hover:bg-neutral-200 px-2 py-0.5 rounded cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const primaryId = data.conflictPrimaryId;
                const primaryNode = reactFlow.getNode(primaryId);
                if (primaryNode) {
                  const x = (primaryNode.positionAbsolute?.x ?? primaryNode.position.x) + (primaryNode.width ? primaryNode.width/2 : 0);
                  const y = (primaryNode.positionAbsolute?.y ?? primaryNode.position.y) + (primaryNode.height ? primaryNode.height/2 : 0);
                  try { (reactFlow as any).setCenter?.(x, y, { zoom: 1, duration: 300 }); } catch {}
                }
                window.dispatchEvent(new CustomEvent('externalNodeSelect', { detail: primaryId }));
                // Hide tooltip immediately after navigation
                if (hideTimerRef.current) { window.clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
                setShowConflictTip(false);
              }}>
              Go to first
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const nodeTypes = {
  action: ActionNode,
  subflow: ({ id, data, selected }: NodeProps) => {
    const reactFlow = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState<string>(data?.title || 'Subflow');
  const [paymentStatus, setPaymentStatus] = useState<string>(data?.paymentStatus || 'Scheduled');
  const [acquirer, setAcquirer] = useState<string>(data?.acquirer || '');
    const titleRef = useRef<HTMLInputElement|null>(null);
    const acquirerRef = useRef<HTMLInputElement|null>(null);
    useEffect(()=>{ if(editing && titleRef.current){ titleRef.current.focus(); titleRef.current.select(); } },[editing]);
    // Hide / show child nodes while editing for clarity
    useEffect(()=>{
      reactFlow.setNodes(ns => ns.map(n => {
        if (n.parentNode === id) {
          const style = { ...(n.style||{}) };
          if (editing) {
            style.opacity = 0;
            style.pointerEvents = 'none';
          } else {
            if (style.opacity === 0) delete style.opacity;
            if (style.pointerEvents === 'none') delete style.pointerEvents;
          }
          return { ...n, style };
        }
        return n;
      }));
    }, [editing, id, reactFlow]);
    const commit = () => {
      setEditing(false);
      reactFlow.setNodes(ns => ns.map(n => n.id===id ? { ...n, data: { ...n.data, title, paymentStatus, acquirer } } : n));
    };
    const cancel = () => {
      setTitle(data?.title || 'Subflow');
      setPaymentStatus(data?.paymentStatus || 'Scheduled');
      setAcquirer(data?.acquirer || '');
      setEditing(false);
    };
    const highlighted = data?.highlighted;
    const conflict = data?.conflict;
    return (
      <div
        className={[
          'w-full h-full relative pointer-events-auto text-[12px] rounded-sm',
          conflict ? 'bg-neutral-100/65 opacity-90' : (highlighted ? 'bg-green-200/45' : '')
        ].join(' ')}
        onDoubleClick={()=>setEditing(true)}
      >
        {editing ? (
          <div className="flex flex-col gap-1 text-[12px]">
            <input ref={titleRef} value={title} placeholder="Title" onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') commit(); if(e.key==='Escape') cancel(); }} className="text-[12px] w-full px-1 py-0.5 border rounded" />
            <select value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)} className="text-[12px] px-1 py-0.5 border rounded">
              <option value="Scheduled">Scheduled</option>
              <option value="Canceled">Canceled</option>
              <option value="Completed">Completed</option>
            </select>
            <input ref={acquirerRef} value={acquirer} placeholder="Acquirer" onChange={e=>setAcquirer(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') commit(); if(e.key==='Escape') cancel(); }} className="text-[12px] w-full px-1 py-0.5 border rounded" />
            <div className="flex gap-2 pt-1">
              <button className="text-[10px] px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-white" onClick={commit}>Save</button>
              <button className="text-[10px] px-2 py-1 rounded bg-neutral-300 hover:bg-neutral-200" onClick={cancel}>Cancel</button>
            </div>
            <div className="text-[10px] opacity-60">esc to cancel • enter to save</div>
          </div>
        ) : (
          <div className="text-[12px]">
            <div className="font-semibold">{title}</div>
            <div className="opacity-75 mt-0.5">Status: {data?.paymentStatus || paymentStatus}</div>
            {(data?.acquirer || acquirer) && (<div className="opacity-75">Acquirer: {data?.acquirer || acquirer}</div>)}
            <div className="absolute top-1 right-1 text-[10px] opacity-60">double-click to edit</div>
          </div>
        )}
      </div>
    );
  }
};
