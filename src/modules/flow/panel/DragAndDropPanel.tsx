import React from 'react';
import './dnd.css';
import { useFlowFilters } from './hooks/useFlowFilters';
import { useAddSubflow } from './hooks/useAddSubflow';
import { useExportFlows } from '../hooks/useExportFlows';

export const DragAndDropPanel: React.FC = () => {
  const { filterStatus, setFilterStatus, acquirer, setAcquirer, title, setTitle, autoApply, setAutoApply, applyFilter, clearFilter } = useFlowFilters();
  const { addSubflow } = useAddSubflow(autoApply, applyFilter);
  const { exportFlows } = useExportFlows();
  return (
    <div className="dnd-panel flex flex-col gap-3 text-xs max-w-[220px]">
      <div className="flex flex-col gap-2 border-t pt-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">Buscar</h4>
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">Payment Status</span>
            <select value={filterStatus} onChange={e=> setFilterStatus(e.target.value)} className="px-2 py-1 rounded border text-[11px] bg-white">
              <option value="">Any</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Canceled">Canceled</option>
              <option value="Completed">Completed</option>
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">Acquirer</span>
            <input value={acquirer} onChange={e=>setAcquirer(e.target.value)} placeholder="contains" className="px-2 py-1 rounded border text-[11px]" />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">Title</span>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="contains" className="px-2 py-1 rounded border text-[11px]" />
          </label>
          <label className="inline-flex items-center gap-1 mt-1 select-none cursor-pointer text-[11px]">
            <input type="checkbox" checked={autoApply} onChange={e=>setAutoApply(e.target.checked)} className="scale-90" />
            <span>Aplicar automaticamente</span>
          </label>
          {!autoApply && (
            <div className="flex gap-2 mt-1">
              <button onClick={applyFilter} className="flex-1 px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] flex items-center gap-1" title="Apply Filters" aria-label="Apply Filters">✅ <span>Aplicar</span></button>
              <button onClick={clearFilter} className="px-2 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-[11px] flex items-center gap-1" title="Clear Filters" aria-label="Clear Filters">🧹 <span>Limpar</span></button>
            </div>
          )}
          {autoApply && (
            <button onClick={clearFilter} className="mt-1 px-2 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-[11px] flex items-center gap-1" title="Clear Filters" aria-label="Clear Filters">🧹 <span>Limpar</span></button>
          )}
        </div>
      </div>
            <div className="flex flex-col gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">Criar Fluxos</h4>
        <button
          onClick={addSubflow}
          className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          title="Add Subflow"
          aria-label="Add Subflow"
        >
          ➕ <span>Criar Fluxo</span>
        </button>
        <button
          onClick={exportFlows}
          className="px-3 py-1.5 rounded-md bg-neutral-600 hover:bg-neutral-500 active:bg-neutral-700 text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          title="Exportar JSON"
          aria-label="Export JSON"
        >
          📤 <span>Salvar (Console Log)</span>
        </button>
      </div>
    </div>
  );
};
