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
  <div style={{ padding: 10, border: `${selected ? '2px' : '1px'} solid ${selected ? '#0ea5e9' : (data?.conflict ? '#d1d5db' : (data?.highlighted ? '#16a34a' : '#3b82f6'))}`, boxShadow: selected ? '0 0 0 2px rgba(14,165,233,0.25)' : 'none', borderRadius: 6, background: data?.conflict ? '#f3f4f6' : (data?.highlighted ? '#dcfce7' : '#eff6ff'), minWidth: 140, position:'relative', transition:'border-color 150ms ease, background-color 150ms ease, opacity 150ms ease, box-shadow 150ms ease', opacity: data?.conflict ? 0.85 : 1 }} onDoubleClick={() => setEditing(true)}
       onMouseEnter={showConflict}
       onMouseLeave={scheduleHideConflict}>
      <strong>Action</strong>
      <div style={{ fontSize: 12, display:'flex', flexDirection:'column', gap:4 }}>
        {editing ? (
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <input
              ref={inputRef}
              placeholder="Name"
              value={value}
              style={{ width: '100%', fontSize: 12 }}
              onChange={e => setValue(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <input
              placeholder="CreditAccount"
              value={credit}
              style={{ width: '100%', fontSize: 12 }}
              onChange={e => setCredit(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <input
              placeholder="DebitAccount"
              value={debit}
              style={{ width: '100%', fontSize: 12 }}
              onChange={e => setDebit(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <div style={{ display:'flex', gap:4 }}>
              <button style={{ fontSize:10 }} onClick={commit}>Save</button>
              <button style={{ fontSize:10 }} onClick={() => { setValue(data?.label || 'action'); setCredit(data?.creditAccount||''); setDebit(data?.debitAccount||''); setEditing(false); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <div>{value || 'action'}</div>
            {(credit || debit) && (<div style={{ opacity:.7 }}>{credit && `Cr: ${credit}`} {debit && `Db: ${debit}`}</div>)}
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Top} id="t" />
      <Handle type="source" position={Position.Bottom} id="b"
        onMouseEnter={() => setShowHandleMenu('b')}
        onMouseLeave={() => setShowHandleMenu(false)}
      />
      {showHandleMenu && (
        <div style={{ position:'absolute', left:'50%', bottom:-4, transform:'translate(-50%, 100%)', background:'#fff', border:'1px solid #3b82f6', borderRadius:4, padding:4, display:'flex', flexDirection:'row', gap:4, zIndex:20, boxShadow:'0 2px 4px rgba(0,0,0,.15)' }}
             onMouseEnter={() => setShowHandleMenu('b')}
             onMouseLeave={() => setShowHandleMenu(false)}>
          <button style={{ fontSize: 10 }} onClick={createAndConnect}>+ New</button>
          <button style={{ fontSize: 10 }} onClick={connectToExisting}>Link</button>
        </div>
      )}
      {data?.conflict && showConflictTip && (
        <div style={{ position:'absolute', top:-4, right:-4, transform:'translate(100%, -100%)', background:'#111', color:'#fff', padding:'6px 8px', fontSize:10, borderRadius:4, maxWidth:200, zIndex:30, boxShadow:'0 2px 6px rgba(0,0,0,.35)' }}
             onMouseEnter={showConflict}
             onMouseLeave={scheduleHideConflict}>
          <div style={{ fontWeight:600, marginBottom:4 }}>Name conflict</div>
          <div style={{ lineHeight:1.3 }}>This node name duplicates the first node in this path.</div>
          {data?.conflictPrimaryId && (
            <button style={{ marginTop:6, fontSize:10, background:'#d1d5db', color:'#374151', border:'1px solid #cbd5e1', padding:'3px 6px', borderRadius:3, cursor:'pointer' }}
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
    const [title, setTitle] = useState<string>(data?.title || 'Subflow');
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement|null>(null);
    useEffect(()=>{ if(editing && inputRef.current){ inputRef.current.focus(); inputRef.current.select(); } },[editing]);
    const commit = () => {
      setEditing(false);
      reactFlow.setNodes(ns => ns.map(n => n.id===id ? { ...n, data: { ...n.data, title } } : n));
    };
    const highlighted = data?.highlighted;
    const conflict = data?.conflict;
    return (
  <div style={{ width: '100%', height: '100%', position:'relative', pointerEvents:'auto', /* keep static border from style; no dynamic highlight */ background: conflict ? 'rgba(243,244,246,0.65)' : (highlighted ? 'rgba(187,247,208,0.45)' : undefined), transition:'background-color 150ms ease, opacity 150ms ease', opacity: conflict ? 0.9 : 1 }} onDoubleClick={()=>setEditing(true)}>
        {editing ? (
          <input ref={inputRef} value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') commit(); if(e.key==='Escape'){ setTitle(data?.title||'Subflow'); setEditing(false);} }} onBlur={commit} style={{ fontSize:12, width:'100%', boxSizing:'border-box' }}/>
        ) : (
          <div style={{ fontWeight:600, fontSize:12 }}>{title}</div>
        )}
        <div style={{ position:'absolute', top:4, right:6, fontSize:10, opacity:.6 }}>double-click to edit</div>
      </div>
    );
  }
};
