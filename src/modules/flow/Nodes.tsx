import React, { useState, useEffect, useRef } from 'react';
import { Handle, NodeProps, Position, useReactFlow, Connection, Edge } from 'reactflow';

export const ActionNode: React.FC<NodeProps> = ({ id, data }) => {
  const reactFlow = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(data?.label || 'action');
  const [credit, setCredit] = useState<string>(data?.creditAccount || '');
  const [debit, setDebit] = useState<string>(data?.debitAccount || '');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    reactFlow.setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, label: value, creditAccount: credit, debitAccount: debit } } : n));
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') {
      setValue(data?.label || 'action');
      setEditing(false);
    }
  };

  const [showHandleMenu, setShowHandleMenu] = useState<false | 'r'>(false);
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null);

  const createAndConnect = () => {
    const newId = crypto.randomUUID();
    const position = { x: (data?.xOffset || 150) + (Math.random() * 40), y: (data?.yOffset || 80) + (Math.random() * 40) };
    reactFlow.setNodes(ns => [...ns, { id: newId, type: 'action', position, data: { label: 'action ' + newId.slice(0,4) } }]);
    reactFlow.setEdges(es => {
      // Linked-list insert: if current node already points to next, splice new node between
      const existing = es.find(e => e.source === id);
      let updated = es.filter(e => e !== existing); // remove existing outgoing if any
      updated = [...updated, { id: `${id}-${newId}`, source: id, target: newId, animated: true } as Edge];
      if (existing) {
        updated = [...updated, { id: `${newId}-${existing.target}` , source: newId, target: existing.target, animated: true } as Edge];
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
    <div style={{ padding: 10, border: '1px solid #3b82f6', borderRadius: 6, background: '#eff6ff', minWidth: 140, position:'relative' }} onDoubleClick={() => setEditing(true)}>
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
      <Handle type="target" position={Position.Left} id="l" />
      <Handle type="source" position={Position.Right} id="r"
        onMouseEnter={() => setShowHandleMenu('r')}
        onMouseLeave={() => setShowHandleMenu(false)}
      />
      {showHandleMenu && (
        <div style={{ position:'absolute', top:'50%', right:-4, transform:'translate(100%, -50%)', background:'#fff', border:'1px solid #3b82f6', borderRadius:4, padding:4, display:'flex', flexDirection:'row', gap:4, zIndex:20, boxShadow:'0 2px 4px rgba(0,0,0,.15)' }}
             onMouseEnter={() => setShowHandleMenu('r')}
             onMouseLeave={() => setShowHandleMenu(false)}>
          <button style={{ fontSize: 10 }} onClick={createAndConnect}>+ New</button>
          <button style={{ fontSize: 10 }} onClick={connectToExisting}>Link</button>
        </div>
      )}
    </div>
  );
};

export const nodeTypes = {
  action: ActionNode
};
