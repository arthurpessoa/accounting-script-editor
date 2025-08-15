import React, { useState } from 'react';
import ReactFlow, { Background, Controls, Edge, MiniMap, Node, OnSelectionChangeParams, useEdgesState, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { DragAndDropPanel } from './panel/DragAndDropPanel';
import './flow.css';
import { nodeTypes } from './nodes/nodeTypes';
import { useFlowConnections } from './hooks/useFlowConnections';
import { useHighlighting } from './hooks/useHighlighting';
import { useAutoLayout } from './hooks/useAutoLayout';
import { useDeleteShortcut } from './hooks/useDeleteShortcut';
import { useExternalSelection } from './hooks/useExternalSelection';

export const FlowEditor: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [selected, setSelected] = useState<Node | undefined>();
  const [paymentDragging, setPaymentDragging] = useState(false);
  const { onConnect } = useFlowConnections(nodes, setNodes, setEdges);
  useHighlighting(nodes, selected, setNodes, edges, setEdges);
  useAutoLayout(nodes, edges, setNodes);
  useDeleteShortcut(selected, nodes, setNodes, setEdges);
  useExternalSelection(nodes, setNodes, setSelected);

  const onSelectionChange = (params: OnSelectionChangeParams) => {
    setSelected(params.nodes[0]);
  };

  // deletion + external selection moved to hooks

  return (
  <div className={"flex-1 h-full relative " + (paymentDragging ? 'payment-dragging' : '')}>
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
  onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeDragStart={(e, node) => {
          if (node.type === 'payment') setPaymentDragging(true);
          if (node.type === 'subflow') {
            setNodes(ns => ns.map(n => {
              if (n.id === node.id) return { ...n, className: ((n.className || '') + ' subflow-no-transition').trim() };
              if (n.parentNode === node.id) return { ...n, className: ((n.className || '') + ' node-no-transition').trim() };
              return n;
            }));
          }
        }}
        onNodeDragStop={(e, node) => {
          if (node.type === 'payment') setPaymentDragging(false);
          if (node.type === 'subflow') {
            setNodes(ns => ns.map(n => {
              if (n.id === node.id) return { ...n, className: (n.className || '').replace(/\bsubflow-no-transition\b/g, '').trim() };
              if (n.parentNode === node.id) return { ...n, className: (n.className || '').replace(/\bnode-no-transition\b/g, '').trim() };
              return n;
            }));
          }
        }}
        fitView
        nodeTypes={nodeTypes}
      >
        <DragAndDropPanel />
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
};
