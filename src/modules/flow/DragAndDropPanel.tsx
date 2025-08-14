import React from 'react';
import { useReactFlow } from 'reactflow';
import './dnd.css';
import { v4 as uuid } from 'uuid';

export const DragAndDropPanel: React.FC = () => {
  const reactFlow = useReactFlow();

  const addActionNode = () => {
    const id = uuid();
    const name = `action ${id.slice(0,4)}`;
    reactFlow.addNodes({ id, type: 'action', position: { x: 100, y: 100 }, data: { name, label: name, creditAccount: '', debitAccount: '' } });
  };

  return (
    <div className="dnd-panel">
      <h4>Add Node</h4>
  <button onClick={addActionNode}>Action</button>
    </div>
  );
};
