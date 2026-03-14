import { useState, useEffect } from 'react';
import { Network, Server, Cpu, Activity, Clock, Database, Shield, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function NodeInspector() {
  const [nodeData, setNodeData] = useState(null);
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    let interval;
    
    const fetchNodeStats = async () => {
      try {
        // The backend communicates natively with the local Hardhat Node. Ask the backend for chain details.
        const res = await fetch(`/api/admin/node-stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('blockpay_token')}` }
        });
        if (res.ok) {
            const data = await res.json();
            setNodeData(data);
        }
      } catch (err) {
        // Silently fail if not running
      }
    };
    
    if (isAuthenticated) {
        fetchNodeStats();
        interval = setInterval(fetchNodeStats, 2000); // Poll every 2s
    }
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!nodeData) return null;

  return (
    <div className="card space-y-4 border-accent/20 bg-void/50 backdrop-blur-md relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-accent/10 transition-colors" />
      
      <div className="flex items-center gap-3 border-b border-border pb-3 relative">
        <div className="w-8 h-8 rounded-lg bg-surface border border-accent/30 flex items-center justify-center">
          <Server size={16} className="text-accent animate-pulse-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
            Local EVM Node <span className="px-1.5 py-0.5 rounded text-[9px] bg-accent/10 text-accent uppercase tracking-wider font-bold">Live</span>
          </h3>
          <p className="text-xs text-text-muted font-mono">{nodeData.network}({nodeData.chainId}) — RPC: http://127.0.0.1:8545</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative">
        <div className="bg-surface rounded-lg p-3 border border-border">
          <div className="text-text-muted text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5"><Database size={12}/> Current Block</div>
          <div className="text-lg font-mono font-semibold text-text-primary">#{nodeData.blockNumber}</div>
        </div>
        <div className="bg-surface rounded-lg p-3 border border-border">
          <div className="text-text-muted text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5"><Zap size={12}/> Gas Price</div>
          <div className="text-lg font-mono font-semibold text-text-primary">{nodeData.gasPrice} <span className="text-xs text-text-muted">Gwei</span></div>
        </div>
        <div className="bg-surface rounded-lg p-3 border border-border">
          <div className="text-text-muted text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5"><Shield size={12}/> Base Fee</div>
          <div className="text-lg font-mono font-semibold text-text-primary">{nodeData.baseFee} <span className="text-xs text-text-muted">Gwei</span></div>
        </div>
        <div className="bg-surface rounded-lg p-3 border border-border">
          <div className="text-text-muted text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5"><Activity size={12}/> Network Load</div>
          <div className="text-lg font-mono font-semibold text-text-primary">Low</div>
        </div>
      </div>
      
      <div className="pt-2 border-t border-border mt-2 text-xs text-text-muted">
        <div className="flex justify-between items-center">
            <span className="font-mono">Hardhat Network (Automine)</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-accent rounded-full animate-ping" /> Synchronized</span>
        </div>
      </div>
    </div>
  );
}
