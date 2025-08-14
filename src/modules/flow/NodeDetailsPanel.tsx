import React from 'react';
import { Node } from 'reactflow';
import { useScriptStore } from './store';

interface Props {
  selected?: Node;
  onUpdate: (nodeId: string, data: any) => void;
}

export const NodeDetailsPanel: React.FC<Props> = ({ selected, onUpdate }) => {
  const { script } = useScriptStore();
  if (!selected) return <div className="node-details"><em>Select a node</em></div>;

  const isAction = selected.type === 'action';
  const data = selected.data || {};

  const updateField = (k: string, v: any) => {
    onUpdate(selected.id, { ...data, [k]: v });
  };

  return (
    <div className="node-details">
      <h4>Node {selected.id}</h4>
      <div><strong>Type:</strong> {selected.type}</div>
      <label>
        Label
        <input value={data.label || ''} onChange={e => updateField('label', e.target.value)} />
      </label>
      {isAction && (
        <>
          <label>
            Action
            <select value={data.action || ''} onChange={e => updateField('action', e.target.value)}>
              <option value="">Select</option>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </label>
          <label>
            Account
            <input value={data.account || ''} onChange={e => updateField('account', e.target.value)} />
          </label>
          <label>
            Amount
            <input type="number" value={data.amount || ''} onChange={e => updateField('amount', e.target.value)} />
          </label>
        </>
      )}
    </div>
  );
};
