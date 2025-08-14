import React from 'react';
import { useReactFlow } from 'reactflow';
import './dnd.css';
import { v4 as uuid } from 'uuid';

export const DragAndDropPanel: React.FC<{ selectedSubflowId?: string }> = ({ selectedSubflowId }) => {
  const reactFlow = useReactFlow();

  const addSubflow = () => {
    const id = uuid();
  reactFlow.addNodes({ id, type: 'subflow', className: 'subflow-node', position: { x: 50, y: 50 }, data: { title: `Subflow ${id.slice(0,4)}` }, style: { width: 400, height: 300, padding: 10, background: 'rgba(243,244,246,0.55)', border: '2px solid #6366f1', borderRadius: 8, overflow: 'visible', zIndex: 0 } });
  };

  const addActionNode = () => {
    // Determine target subflow: prefer selected, else first existing subflow
    let parentId = selectedSubflowId;
    if (!parentId) {
      const allNodes = reactFlow.getNodes();
      const firstSubflow = allNodes.find(n => n.type === 'subflow');
      if (firstSubflow) parentId = firstSubflow.id;
    }
    if (!parentId) {
      alert('Create or select a subflow first.');
      return;
    }
    const parent = reactFlow.getNode(parentId);
    if (!parent) {
      alert('Selected subflow not found.');
      return;
    }
    const id = uuid();
    const name = `action ${id.slice(0,4)}`;
    const pWidth = (parent.style?.width as number) || 400;
    const pHeight = (parent.style?.height as number) || 300;
    const relX = 40 + Math.random()* (pWidth - 80);
    const relY = 40 + Math.random()* (pHeight - 80);
  const newNode = { id, type: 'action', position: { x: relX, y: relY }, data: { name, label: name, creditAccount: '', debitAccount: '' }, parentNode: parentId, extent: 'parent' as const };
    // Use setNodes for more explicit state update (sometimes more reliable with parent relationships)
    reactFlow.setNodes(ns => [...ns, newNode]);
    console.info('Added action inside subflow', { newNode, parentId });
  };

  return (
    <div className="dnd-panel">
  <h4>Add</h4>
  <button onClick={addSubflow}>Subflow</button>
  <button onClick={addActionNode} disabled={!selectedSubflowId} style={{ opacity: selectedSubflowId ? 1 : .5 }}>Action in Subflow</button>
    </div>
  );
};
