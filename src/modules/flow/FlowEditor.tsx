import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, { Background, Controls, MiniMap, addEdge, Connection, Edge, Node, OnConnect, useEdgesState, useNodesState, OnSelectionChangeParams, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { useScriptStore } from './store';
import { nodeTypes } from './nodes';
import './flow.css';
import { DragAndDropPanel } from './DragAndDropPanel';

// Legacy script object removed; we just manage nodes/edges in component state.

export const FlowEditor: React.FC = () => {
  const { setNodesJson } = useScriptStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selected, setSelected] = useState<Node | undefined>();

  // Enforce handle positions (left target, right source) so edges connect side-to-side
  useEffect(() => {
    setNodes(ns => ns.map(n => ({ ...n, sourcePosition: Position.Right, targetPosition: Position.Left })));
  }, [setNodes]);

  const onConnect: OnConnect = useCallback((params: Edge | Connection) => {
    setEdges((eds) => {
      // Enforce: one outgoing edge per source and one incoming edge per target
      if (eds.some(e => e.source === params.source) || eds.some(e => e.target === params.target)) {
        return eds; // disallow additional connection
      }
      return addEdge({ ...params, animated: true }, eds);
    });
  }, [setEdges]);

  const handleExport = () => {
    const json = JSON.stringify({ nodes, edges }, null, 2);
    setNodesJson(json);
    navigator.clipboard.writeText(json).catch(console.error);
    alert('Graph copied to clipboard');
  };

  const onSelectionChange = (params: OnSelectionChangeParams) => {
    setSelected(params.nodes[0]);
  };

  // Delete selected node with Delete / Backspace key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selected) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT','TEXTAREA'].includes(target.tagName)) return; // avoid interfering with text inputs
      const deletingId = selected.id;
      setNodes(ns => ns.filter(n => n.id !== deletingId));
      setEdges(es => {
        // Identify predecessor (incoming) and successor (outgoing) before removing
        const incoming = es.find(e => e.target === deletingId);
        const outgoing = es.find(e => e.source === deletingId);
        let filtered = es.filter(e => e.source !== deletingId && e.target !== deletingId);
        if (incoming && outgoing) {
          // Only add new edge if it doesn't violate single in/out constraints
            const predecessorHasOtherOut = filtered.some(e => e.source === incoming.source);
            const successorHasOtherIn = filtered.some(e => e.target === outgoing.target);
            if (!predecessorHasOtherOut && !successorHasOtherIn) {
              filtered = [...filtered, { id: `${incoming.source}-${outgoing.target}`, source: incoming.source, target: outgoing.target, animated: true } as Edge];
            }
        }
        return filtered;
      });
      setSelected(undefined);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, setNodes, setEdges]);

  return (
    <div className="flow-container">
      <div className="toolbar">
        <button onClick={handleExport}>Export JSON</button>
      </div>
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
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
