import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';

export const PaymentNode: React.FC<NodeProps> = ({ data }) => {
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

export default PaymentNode;
