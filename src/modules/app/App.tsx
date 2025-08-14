import React from 'react';
import { FlowEditor } from '../flow/FlowEditor';
import './app.css';

export const App: React.FC = () => {
  return (
    <div className="app-root">
      <header className="app-header">Accounting Script Flow</header>
      <div className="app-body">
        <FlowEditor />
      </div>
    </div>
  );
};
