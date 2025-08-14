import React from 'react';
import { FlowEditor } from '../flow/FlowEditor';

export const App: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      <header className="px-4 py-2 bg-neutral-900 text-white font-semibold tracking-wide text-sm">Accounting Script Flow</header>
      <div className="flex-1 flex min-h-0">
        <FlowEditor />
      </div>
    </div>
  );
};
