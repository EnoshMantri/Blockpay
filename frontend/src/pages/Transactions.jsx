import { useState, useEffect } from 'react';
import { settlementApi, auditApi } from '../utils/api';
import { RefreshCw, Search, XCircle, FileText, CheckCircle2, Copy, ExternalLink, Activity } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

function TransactionModal({ tx, onClose }) {
  const { toast } = useToast();
  if (!tx) return null;

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast(`${label} copied to clipboard`, 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-elevated">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30">
              <FileText size={18} className="text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-text-primary">Transaction Details</h3>
              <p className="text-xs text-text-muted font-mono">{tx.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-hover text-text-muted hover:text-text-primary transition-colors">
            <XCircle size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Top Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-void border border-border flex flex-col justify-center items-center">
              <span className="text-xs text-text-secondary uppercase tracking-wider mb-1">Status</span>
              <div className="flex items-center gap-2 text-accent font-semibold">
                <CheckCircle2 size={16} /> Settled
              </div>
            </div>
            <div className="p-4 rounded-xl bg-void border border-border flex flex-col justify-center items-center">
              <span className="text-xs text-text-secondary uppercase tracking-wider mb-1">Net Amount</span>
              <div className="text-xl font-bold text-text-primary h-[24px]">
                {(tx.netAmount / 1e6).toFixed(4)} <span className="text-sm font-normal text-text-muted">USD</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm font-mono p-4 rounded-xl bg-elevated border border-border">
            <div className="col-span-1 md:col-span-2 flex justify-between pb-2 border-b border-border/50">
               <span className="text-text-muted">Sender:</span>
               <span className="text-accent break-all">{tx.sender}</span>
            </div>
            <div className="col-span-1 md:col-span-2 flex justify-between pb-2 border-b border-border/50">
               <span className="text-text-muted">Receiver:</span>
               <span className="text-accent break-all">{tx.receiver}</span>
            </div>
            <div className="flex justify-between pb-1">
               <span className="text-text-muted">Gross:</span>
               <span className="text-text-primary">{(tx.grossAmount / 1e6).toFixed(4)}</span>
            </div>
            <div className="flex justify-between pb-1">
               <span className="text-text-muted">Fee (0.5%):</span>
               <span className="text-danger">-{(tx.fee / 1e6).toFixed(4)}</span>
            </div>
          </div>

          {/* Cryptographic Proof */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity size={16} className="text-accent"/> Cryptographic Proof</h4>
            <div className="space-y-3 font-mono text-xs p-4 rounded-xl bg-void border border-border">
               <div className="flex items-start justify-between gap-4">
                 <div>
                   <div className="text-text-muted mb-1">Settlement Hash</div>
                   <div className="text-text-primary break-all">{tx.settlementHash}</div>
                 </div>
                 <button onClick={() => handleCopy(tx.settlementHash, 'Settlement Hash')} className="p-1.5 hover:bg-hover rounded text-text-secondary shrink-0"><Copy size={14}/></button>
               </div>
               
               <div className="flex items-start justify-between gap-4">
                 <div>
                   <div className="text-text-muted mb-1">Ethereum TX Hash (Simulation)</div>
                   <div className="text-text-primary break-all">{tx.txHash}</div>
                 </div>
                 <button onClick={() => handleCopy(tx.txHash, 'TX Hash')} className="p-1.5 hover:bg-hover rounded text-text-secondary shrink-0"><Copy size={14}/></button>
               </div>
               
               <div className="flex justify-between mt-2 pt-3 border-t border-border/50">
                  <div>
                    <span className="text-text-muted mr-2">Block:</span> 
                    <span className="text-text-primary">#{tx.blockNumber}</span>
                  </div>
                  <div>
                    <span className="text-text-muted mr-2">Timestamp:</span> 
                    <span className="text-text-primary">{new Date(tx.settledAt).toISOString()}</span>
                  </div>
               </div>
            </div>
            <a 
              href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-xs text-accent hover:underline font-medium"
            >
              Verify on Etherscan <ExternalLink size={12} />
            </a>
          </div>

          {/* Stage Timeline */}
          {tx.stages?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">Settlement Pipeline</h4>
              <div className="p-4 rounded-xl bg-elevated border border-border">
                 <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                   {tx.stages.map((s, i) => (
                     <div key={i} className="flex gap-4 relative z-10">
                       <div className="w-6 h-6 rounded-full bg-accent text-void flex items-center justify-center font-bold text-xs shrink-0 shadow-[0_0_10px_rgba(0,212,170,0.4)]">
                         {s.stage}
                       </div>
                       <div className="flex-1 pb-1">
                         <div className="flex justify-between items-center mb-1">
                           <span className="text-sm font-medium text-text-primary">{s.name}</span>
                           <span className="text-[10px] text-text-muted font-mono">{new Date(s.timestamp).toLocaleTimeString()}</span>
                         </div>
                         <div className="text-xs text-text-secondary">{s.description}</div>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function TxRow({ tx, onClick }) {
  return (
    <div 
      className="flex items-center gap-4 py-3 px-4 border-b border-border hover:bg-hover transition-colors cursor-pointer group last:border-0"
      onClick={() => onClick(tx)}
    >
      <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0 shadow-sm group-hover:border-accent/40 transition-colors">
        <span className="text-text-secondary text-xs font-mono font-bold">{(tx.stages?.length || 6)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-mono text-text-primary truncate">{tx.id?.slice(0, 16)}...</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/20 text-accent shrink-0">Settled</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="truncate">{tx.sender?.slice(0, 10)}...</span>
          <span className="text-text-muted font-mono">→</span>
          <span className="truncate">{tx.receiver?.slice(0, 10)}...</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-mono text-text-primary font-semibold mb-1">{(tx.grossAmount / 1e6).toFixed(2)} USD</div>
        <div className="text-[10px] text-text-muted">{new Date(tx.createdAt).toLocaleDateString()}</div>
      </div>
    </div>
  );
}

export default function Transactions() {
  const [txs, setTxs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('transactions');
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [txData, logs] = await Promise.all([
        settlementApi.getAll(),
        auditApi.getLogs({ limit: 50 }),
      ]);
      setTxs(txData.data || []);
      setAuditLogs(logs.data || []);
    } catch (e) {
      setTxs([]);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load() }, []);

  const filtered = txs.filter(tx =>
    !search ||
    tx.id?.includes(search) ||
    tx.sender?.toLowerCase().includes(search.toLowerCase()) ||
    tx.receiver?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent mb-1">Transactions & Audit Log</h2>
          <p className="text-text-secondary text-sm">{txs.length} settlements recorded · Full on-chain proof per transaction</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-lg p-1 w-fit border border-border">
        {['transactions', 'audit'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-md text-xs font-semibold transition-all capitalize
              ${tab === t ? 'bg-elevated text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
          >
            {t === 'transactions' ? `Settlements (${txs.length})` : `Audit Log (${auditLogs.length})`}
          </button>
        ))}
      </div>

      {tab === 'transactions' && (
        <div className="card space-y-0 p-0 overflow-hidden border-border/60">
          <div className="p-4 border-b border-border bg-surface/50">
            <div className="relative max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                className="input pl-10 bg-void border-border/80"
                placeholder="Search by ID, sender, or receiver..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="min-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center h-64 text-text-muted text-sm">Synchronizing ledger...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-text-muted text-sm">
                <FileText size={32} className="opacity-20 mb-3" />
                No transactions match criteria.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map(tx => <TxRow key={tx.id} tx={tx} onClick={setSelectedTx} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="card min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-text-muted text-sm">Loading audit entries...</div>
          ) : auditLogs.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-text-muted text-sm">No audit entries found.</div>
          ) : (
             <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/50 pl-2">
              {auditLogs.map(log => (
                <div key={log.id} className="relative flex items-start gap-4">
                  <div className={`mt-1 shrink-0 w-3 h-3 rounded-full border-2 border-void z-10
                    ${log.action?.includes('FAIL') || log.action === 'BLACKLIST' ? 'bg-danger shadow-[0_0_8px_rgba(255,71,87,0.5)]' :
                      log.action === 'WHITELIST' || log.action === 'REMITTANCE_SETTLED' ? 'bg-accent shadow-[0_0_8px_rgba(0,212,170,0.5)]' : 'bg-warn text-white'}`}
                  />
                  <div className="flex-1 bg-surface border border-border/50 rounded-lg p-3 hover:border-border transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold tracking-wide text-text-primary capitalize">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-text-muted font-mono bg-void px-2 py-0.5 rounded">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      {log.wallet && <div>Target: <span className="font-mono text-accent">{log.wallet}</span></div>}
                      {log.remittanceId && <div className="mt-0.5">Remittance: <span className="font-mono text-text-muted">{log.remittanceId}</span></div>}
                      {log.reason && <div className="mt-1 text-warn">Reason: {log.reason}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transaction Modal Popup */}
      {selectedTx && (
         <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
}
