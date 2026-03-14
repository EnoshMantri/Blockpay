import { useState, useEffect } from 'react';
import { adminApi } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { Download, Database, Settings, Server, RefreshCw } from 'lucide-react';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch (err) {
      toast('Failed to load system stats: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const downloadCSV = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast(`Started download: ${filename}`, 'info');
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-text-muted text-sm font-mono">Connecting to Admin API...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Administration</h1>
          <p className="text-sm text-text-muted mt-1">Manage database, configs, and exports</p>
        </div>
        <button onClick={loadStats} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Stats */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="p-2.5 rounded-lg bg-accent/10">
              <Database size={20} className="text-accent" />
            </div>
            <h2 className="font-semibold text-lg">Database Entities</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <StatBox label="Registered Users" value={stats?.usersCount} />
            <StatBox label="Wallets Tracked" value={stats?.walletsCount} />
            <StatBox label="Total Remittances" value={stats?.remittancesCount} />
            <StatBox label="Audit Log Entries" value={stats?.auditLogsCount} />
          </div>

          <div className="mt-6 pt-6 border-t border-border space-y-3">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Data Exports</h3>
            <button 
              onClick={() => downloadCSV('/api/admin/export/transactions', 'blockpay_tx_export.csv')}
              className="w-full btn-secondary flex justify-between items-center group"
            >
              <span>Export Transactions (CSV)</span>
              <Download size={16} className="text-accent group-hover:translate-y-0.5 transition-transform" />
            </button>
            <button 
              onClick={() => downloadCSV('/api/admin/export/audit', 'blockpay_audit_export.csv')}
              className="w-full btn-secondary flex justify-between items-center group"
            >
              <span>Export Audit Logs (CSV)</span>
              <Download size={16} className="text-accent group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* System Configuration */}
        <div className="card flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="p-2.5 rounded-lg bg-[#4facfe]/10">
              <Settings size={20} className="text-[#4facfe]" />
            </div>
            <h2 className="font-semibold text-lg">System Configuration</h2>
          </div>

          <div className="space-y-4 flex-1">
            <ConfigRow label="Version" value={`v${stats?.config?.version || '1.0.0'}`} />
            <ConfigRow label="Base Fee (BPS)" value={stats?.config?.feeBps} />
            <ConfigRow 
              label="Default TX Limit" 
              value={`$${((stats?.config?.defaultLimit || 0) / 1000000).toLocaleString()}`} 
            />
            
            <div className="p-4 rounded-xl bg-surface border border-border mt-4">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-text-primary">
                <Server size={14} className="text-accent" />
                Network Status
              </div>
              <p className="text-xs text-text-muted">
                System is running on localized lowdb simulation mode. To enable real blockchain execution, edit the server <code className="text-accent">.env</code> and restart the nodes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="p-4 bg-surface rounded-xl border border-border">
      <div className="text-2xl font-semibold tracking-tight text-white mb-1">{value ?? '-'}</div>
      <div className="text-xs font-medium text-text-muted">{label}</div>
    </div>
  );
}

function ConfigRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-mono text-text-primary px-2 py-1 bg-surface rounded">{value}</span>
    </div>
  );
}
