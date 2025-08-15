import React, { useState, useEffect, useRef } from 'react';
import { NodeProps, useReactFlow } from 'reactflow';

export const SubflowNode: React.FC<NodeProps> = ({ id, data }) => {
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

export default SubflowNode;
