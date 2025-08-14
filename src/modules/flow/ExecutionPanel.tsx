import React, { useState } from 'react';
import { useScriptStore } from './store';
import { runScriptOnTransaction } from '../scripts/runner';

export const ExecutionPanel: React.FC = () => {
  const { script } = useScriptStore();
  const [logs, setLogs] = useState<string[]>([]);
  const [amount, setAmount] = useState(100);

  const run = async () => {
    if (!script) return;
    const result = await runScriptOnTransaction(script, {
      id: 'tx-ui',
      timestamp: new Date().toISOString(),
      amount,
      currency: 'USD',
      metadata: {}
    });
    setLogs(result.logs.concat(result.errors));
  };

  return (
    <div className="execution-panel" style={{ position:'absolute', bottom:8, left:8, zIndex:10, background:'#fff', padding:8, borderRadius:4, boxShadow:'0 2px 4px rgba(0,0,0,.15)', width:220 }}>
      <h4 style={{ margin:'0 0 6px' }}>Run Script</h4>
      <label style={{ display:'block', fontSize:12 }}>Amount <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} style={{ width:'100%' }} /></label>
      <button disabled={!script} onClick={run} style={{ marginTop:6, width:'100%' }}>Execute</button>
      <div style={{ maxHeight: 120, overflow: 'auto', fontSize: 11, background:'#f5f5f5', padding:4, marginTop:6 }}>
        {logs.map((l,i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
};
