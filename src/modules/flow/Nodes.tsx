import React, { useState, useEffect, useRef } from 'react';
import { Handle, NodeProps, Position, useReactFlow, Edge } from 'reactflow';

// ---------------- Action Node ----------------
export const ActionNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const rf = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState<string>(data?.name || data?.label || 'action');
  const [credit, setCredit] = useState<string>(data?.creditAccount || '');
  const [debit, setDebit] = useState<string>(data?.debitAccount || '');
  const [showConflictTip, setShowConflictTip] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    rf.setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, name, label: name, creditAccount: credit, debitAccount: debit } } : n));
  };
  const cancel = () => {
    setName(data?.name || data?.label || 'action');
    setCredit(data?.creditAccount || '');
    setDebit(data?.debitAccount || '');
    setEditing(false);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = e => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') cancel();
  };

  const showConflict = () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); if (data?.conflict) setShowConflictTip(true); };
  const hideConflictSoon = () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); hideTimer.current = window.setTimeout(()=>{ setShowConflictTip(false); hideTimer.current = null; },300); };

  const [showMenu, setShowMenu] = useState(false);
  const addBelow = () => {
    const newId = crypto.randomUUID();
    const current = rf.getNode(id)!;
    const pos = current ? { x: current.position.x, y: current.position.y + 120 } : { x: 120, y: 120 };
    const parentNode = current?.parentNode;
    
    // Add the new node first
    rf.setNodes(ns => [...ns, { id: newId, type: 'action', position: pos, data: { name: 'action ' + newId.slice(0,4), label: 'action ' + newId.slice(0,4) }, parentNode, extent: parentNode ? 'parent' : undefined }]);
    // Wire edges: insert into existing single-successor chain if present
    const edges = rf.getEdges();
    const outgoing = edges.filter(e => e.source === id);
    rf.setEdges(es => {
      let updated: Edge[] = es;
      if (outgoing.length === 1) {
        const old = outgoing[0];
        // Rewire old edge to originate from the new node
        updated = updated.map(e => e.id === old.id ? { ...e, source: newId, id: `${newId}-${e.target}` } : e);
        // Add edge from current -> new
        const edgeId = `${id}-${newId}`;
        if (!updated.some(e => e.id === edgeId)) {
          updated = [...updated, { id: edgeId, source: id, target: newId, animated: true }];
        }
      } else {
        // No outgoing (or multiple) -> just add current -> new
        const edgeId = `${id}-${newId}`;
        if (!updated.some(e => e.id === edgeId)) {
          updated = [...updated, { id: edgeId, source: id, target: newId, animated: true }];
        }
      }
      return updated;
    });
    setShowMenu(false);
  };

  return (
    <div
      className={[
        'relative min-w-[140px] rounded-md p-2 text-[12px] shadow-sm transition-colors',
        selected ? 'border-2 border-sky-500 shadow-[0_0_0_2px_rgba(14,165,233,0.25)]' : 'border',
        data?.conflict ? 'bg-neutral-100 border-neutral-300 opacity-85' : ((data?.highlighted || data?.searchMatch) ? 'bg-green-100 border-green-600' : 'bg-sky-50 border-sky-600')
      ].join(' ')}
      onDoubleClick={()=>setEditing(true)}
      onMouseEnter={showConflict}
      onMouseLeave={hideConflictSoon}
    >
      <strong className="font-semibold text-[11px] uppercase tracking-wide text-neutral-600">Movimentação</strong>
      <div className="flex flex-col gap-1 mt-1">
        {editing ? (
          <div className="flex flex-col gap-1">
            <input ref={nameInputRef} value={name} placeholder="Name" className="w-full text-[12px] px-1 py-0.5 border rounded" onChange={e=>setName(e.target.value)} onKeyDown={onKeyDown} />
            <input value={credit} placeholder="CreditAccount" className="w-full text-[12px] px-1 py-0.5 border rounded" onChange={e=>setCredit(e.target.value)} onKeyDown={onKeyDown} />
            <input value={debit} placeholder="DebitAccount" className="w-full text-[12px] px-1 py-0.5 border rounded" onChange={e=>setDebit(e.target.value)} onKeyDown={onKeyDown} />
            <div className="flex gap-1 pt-1">
              <button className="text-[10px] px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-white flex items-center gap-1" onClick={commit}>💾 <span>Save</span></button>
              <button className="text-[10px] px-2 py-1 rounded bg-neutral-300 hover:bg-neutral-200 flex items-center gap-1" onClick={cancel}>✖ <span>Cancel</span></button>
            </div>
          </div>
        ) : (
          <div>
            <div className="font-medium text-neutral-800">{name || 'action'}</div>
            {(credit || debit) && <div className="opacity-70">{credit && `Cr: ${credit}`} {debit && `Db: ${debit}`}</div>}
          </div>
        )}
      </div>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable
        style={{
          background: data?.highlightTargetHandle ? '#f97316' : '#ffffff', // orange for head targets
          border: data?.highlightTargetHandle ? '2px solid #f97316' : '1px solid #555',
          width: data?.highlightTargetHandle ? 16 : 10,
          height: data?.highlightTargetHandle ? 16 : 10,
          boxShadow: data?.highlightTargetHandle ? '0 0 0 5px rgba(249,115,22,0.40)' : 'none',
          transition: 'all 120ms'
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable
        onMouseEnter={()=>setShowMenu(true)}
        onMouseLeave={()=>setShowMenu(false)}
        style={{
          background: data?.highlightSourceHandle ? '#8b5cf6' : '#ffffff', // purple for tail sources
          border: data?.highlightSourceHandle ? '2px solid #8b5cf6' : '1px solid #555',
          width: data?.highlightSourceHandle ? 16 : 10,
          height: data?.highlightSourceHandle ? 16 : 10,
          boxShadow: data?.highlightSourceHandle ? '0 0 0 5px rgba(139,92,246,0.40)' : 'none',
          transition: 'all 120ms'
        }}
      />
      {showMenu && !editing && (
        <div className="absolute left-1/2 -bottom-1 translate-x-[-50%] translate-y-full bg-white border border-sky-600 rounded p-1 flex gap-1 z-20 shadow"
          onMouseEnter={()=>setShowMenu(true)}
          onMouseLeave={()=>setShowMenu(false)}>
          <button className="text-[10px] px-1.5 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1" onClick={addBelow}>➕ <span>New</span></button>
        </div>
      )}
      {data?.conflict && showConflictTip && (
        <div className="absolute -top-1 -right-1 translate-x-full -translate-y-full bg-neutral-900 text-white px-2 py-1 text-[10px] rounded max-w-[200px] z-30 shadow-lg"
          onMouseEnter={showConflict}
          onMouseLeave={hideConflictSoon}>
          <div className="font-semibold mb-1">Name conflict</div>
          <div className="leading-tight">This node name duplicates the first node in this path.</div>
          {data?.conflictPrimaryId && (
            <button className="mt-1.5 text-[10px] bg-neutral-300 text-neutral-700 border border-neutral-300 hover:bg-neutral-200 px-2 py-0.5 rounded flex items-center gap-1"
              onClick={e=>{
                e.stopPropagation();
                const primaryId = data.conflictPrimaryId;
                const primaryNode = rf.getNode(primaryId);
                if (primaryNode) {
                  const x = (primaryNode.positionAbsolute?.x ?? primaryNode.position.x) + (primaryNode.width ? primaryNode.width/2 : 0);
                  const y = (primaryNode.positionAbsolute?.y ?? primaryNode.position.y) + (primaryNode.height ? primaryNode.height/2 : 0);
                  try { rf.setCenter?.(x, y, { zoom: 1, duration: 300 }); } catch (_err) { /* ignore */ }
                }
                window.dispatchEvent(new CustomEvent('externalNodeSelect', { detail: primaryId }));
                if (hideTimer.current) window.clearTimeout(hideTimer.current);
                setShowConflictTip(false);
              }}>🔍 <span>First</span></button>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------- Payment Node ----------------
const PaymentNode: React.FC<NodeProps> = ({ data }) => {
  const parts: string[] = [];
  if (data?.filterPaymentStatus) parts.push(data.filterPaymentStatus);
  if (data?.filterAcquirer) parts.push(`Acq:${data.filterAcquirer}`);
  if (data?.filterTitle) parts.push(`Title:${data.filterTitle}`);
  const desc = parts.length ? parts.join(' • ') : 'All subflows';
  return (
    <div className="min-w-[160px] rounded-md border-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-[12px] shadow relative">
      <div className="font-semibold text-emerald-700 tracking-wide text-[11px] uppercase">Payment</div>
      <div className="mt-1 text-[11px] text-emerald-800 opacity-80 break-words leading-snug min-h-[14px]">{desc}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// ---------------- Subflow Node ----------------
const SubflowNode: React.FC<NodeProps> = ({ id, data }) => {
  const rf = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState<string>(data?.title || 'Subflow');
  const [paymentStatus, setPaymentStatus] = useState<string>(data?.paymentStatus || 'Scheduled');
  const [acquirer, setAcquirer] = useState<string>(data?.acquirer || '');
  const [priority, setPriority] = useState<number>(typeof data?.priority === 'number' ? data.priority : 0);
  const titleRef = useRef<HTMLInputElement|null>(null);
  useEffect(()=>{ if(editing && titleRef.current){ titleRef.current.focus(); titleRef.current.select(); } },[editing]);

  const commit = () => {
    rf.setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, title, paymentStatus, acquirer, priority } } : n));
    setEditing(false);
    window.dispatchEvent(new CustomEvent('subflowUpdated', { detail: { id, paymentStatus, acquirer, title } }));
  };
  const cancel = () => {
    setTitle(data?.title || 'Subflow');
    setPaymentStatus(data?.paymentStatus || 'Scheduled');
    setAcquirer(data?.acquirer || '');
    setPriority(typeof data?.priority === 'number' ? data.priority : 0);
    setEditing(false);
  };
  const highlighted = data?.highlighted;
  const conflict = data?.conflict;
  return (
    <div className={[ 'w-full h-full relative pointer-events-auto text-[12px] rounded-sm', conflict ? 'bg-neutral-100/65 opacity-90' : (highlighted ? 'bg-green-200/45' : '') ].join(' ')} onDoubleClick={()=>setEditing(true)}>
      {editing ? (
        <div className="flex flex-col gap-1 text-[12px]">
          <input ref={titleRef} value={title} placeholder="Title" onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') commit(); if(e.key==='Escape') cancel(); }} className="text-[12px] w-full px-1 py-0.5 border rounded" />
          <select value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)} className="text-[12px] px-1 py-0.5 border rounded">
            <option value="Scheduled">Scheduled</option>
            <option value="Canceled">Canceled</option>
            <option value="Completed">Completed</option>
          </select>
            <input value={acquirer} placeholder="Acquirer" onChange={e=>setAcquirer(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') commit(); if(e.key==='Escape') cancel(); }} className="text-[12px] w-full px-1 py-0.5 border rounded" />
          <div className="flex items-center gap-1">
            <label className="text-[11px] uppercase tracking-wide opacity-70">Priority</label>
            <input type="number" value={priority} onChange={e=>setPriority(Number.isFinite(parseInt(e.target.value)) ? parseInt(e.target.value) : 0)} onKeyDown={e=>{ if(e.key==='Enter') commit(); if(e.key==='Escape') cancel(); }} className="w-20 text-[12px] px-1 py-0.5 border rounded" />
          </div>
          <div className="flex gap-2 pt-1">
            <button className="text-[10px] px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-white flex items-center gap-1" onClick={commit}>💾 <span>Save</span></button>
            <button className="text-[10px] px-2 py-1 rounded bg-neutral-300 hover:bg-neutral-200 flex items-center gap-1" onClick={cancel}>✖ <span>Cancel</span></button>
          </div>
        </div>
      ) : (
        <div className="text-[12px]">
          <div className="font-semibold">{title}</div>
          <div className="opacity-75 mt-0.5">Payment Status: {paymentStatus}</div>
          {acquirer && <div className="opacity-75">Acquirer: {acquirer}</div>}
          <div className="opacity-75">Priority: {typeof data?.priority === 'number' ? data.priority : priority}</div>
          <div className="absolute top-1 right-1 text-[10px] opacity-60">editar</div>
        </div>
      )}
    </div>
  );
};

export const nodeTypes = {
  payment: PaymentNode,
  action: ActionNode,
  subflow: SubflowNode
};
