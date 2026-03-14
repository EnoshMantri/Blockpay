import { useState, useEffect, useCallback } from 'react';
import { complianceApi } from '../utils/api';
import { Shield, ShieldAlert, Plus, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Activity, UploadCloud, Search, Loader2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

function RiskBadge({ score, tier }) {
  if (score === undefined) return null;
  const colors = {
    LOW: 'bg-accent/10 text-accent border-accent/20',
    MEDIUM: 'bg-warn/10 text-warn border-warn/20',
    HIGH: 'bg-danger/10 text-danger border-danger/20'
  };
  return (
    <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colors[tier]}`}>
      {tier} RISK ({score}/100)
    </div>
  );
}

function WalletRow({ w, onAction, onScoreScan }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 hover:bg-hover px-2 rounded transition-colors last:border-0">
      <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 shadow-sm">
        <span className="text-text-secondary text-xs font-mono">{w.address.slice(2, 4).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-mono text-text-primary truncate">{w.address}</div>
          {w.riskTier && <RiskBadge score={w.riskScore} tier={w.riskTier} />}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-text-muted font-mono bg-elevated px-1.5 rounded border border-border">Limit: ${(w.limit / 1e6).toFixed(0)}</span>
          {w.kycData?.name && <span className="text-[10px] text-text-secondary">· {w.kycData.name}</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-2">
          {w.whitelisted && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/20 text-accent">Whitelisted</span>}
          {w.blacklisted && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger/20 text-danger" title={w.blacklistReason}>Blacklisted</span>}
          {!w.whitelisted && !w.blacklisted && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface border border-border text-text-secondary">Pending</span>}
        </div>
        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onScoreScan(w.address)} className="text-[10px] px-2 py-0.5 rounded border border-border hover:bg-surface transition-colors" title="Scan Risk Profile">Scan Risk</button>
          {w.blacklisted ? (
            <button onClick={() => onAction('remove-blacklist', w.address)} className="text-[10px] px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors">Restore</button>
          ) : (
            <button onClick={() => onAction('blacklist', w.address)} className="text-[10px] px-2 py-0.5 rounded bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 transition-colors">Blacklist</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Compliance() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  
  const [formOpen, setFormOpen] = useState(null); // 'single', 'bulk', 'scan'
  const [form, setForm] = useState({ address: '', name: '', email: '', limit: '', kycDocRef: '' });
  const [bulkData, setBulkData] = useState('');
  
  const [riskResult, setRiskResult] = useState(null);
  
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await complianceApi.getAll();
      setWallets(data);
    } catch (e) {
      toast('Failed to load wallets: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load() }, [load]);

  const handleWhitelist = async (e) => {
    e.preventDefault();
    try {
      await complianceApi.whitelist(form);
      toast(`Wallet ${form.address} whitelisted successfully`, 'success');
      setForm({ address: '', name: '', email: '', limit: '', kycDocRef: '' });
      setFormOpen(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleBulkWhitelist = async (e) => {
    e.preventDefault();
    try {
      const addresses = bulkData.split(',').map(a => a.trim()).filter(a => a.length > 0);
      if (addresses.length === 0) throw new Error("No addresses provided");
      
      const res = await complianceApi.bulkWhitelist({ addresses });
      toast(`${res.count} wallets bulk whitelisted successfully`, 'success');
      setBulkData('');
      setFormOpen(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleScanRisk = async (address) => {
    const target = address || form.address;
    if (!target) return toast("Provide an address to scan", "warn");
    
    try {
      toast(`Scanning risk profile for ${target}...`, 'info');
      const score = await complianceApi.getRiskScore(target);
      setRiskResult(score);
      
      // Update local wallet data visually
      setWallets(prev => prev.map(w => 
        w.address.toLowerCase() === target.toLowerCase() 
          ? { ...w, riskScore: score.score, riskTier: score.tier } 
          : w
      ));
      
      if (!address) setFormOpen('scan'); // Only switch UI if invoked from button
      toast(`Scan complete. Score: ${score.score} (${score.tier})`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleAction = async (action, address) => {
    if (!isAuthenticated) return toast('Authentication required', 'error');
    
    try {
      if (action === 'blacklist') {
        const reason = prompt('AML reason for blacklisting:') || 'AML Policy Flag';
        if (!reason) return;
        await complianceApi.blacklist({ address, reason });
        toast(`Wallet ${address} blacklisted`, 'success');
      } else if (action === 'remove-blacklist') {
        await complianceApi.removeBlacklist({ address });
        toast(`Wallet ${address} restored`, 'success');
      }
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const filtered = wallets.filter(w => {
    if (search && !w.address.toLowerCase().includes(search.toLowerCase())) return false;
    if (tab === 'whitelisted') return w.whitelisted;
    if (tab === 'blacklisted') return w.blacklisted;
    if (tab === 'high_risk') return w.riskTier === 'HIGH' || w.blacklisted;
    return true;
  });

  const counts = {
    all: wallets.length,
    whitelisted: wallets.filter(w => w.whitelisted).length,
    blacklisted: wallets.filter(w => w.blacklisted).length,
    high_risk: wallets.filter(w => w.riskTier === 'HIGH' || w.blacklisted).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent mb-1">Compliance Registry</h2>
          <p className="text-text-secondary text-sm">Manage whitelist, run AML risk models, and enforce global limits</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Reload</span>
          </button>
          <button onClick={() => setFormOpen(formOpen === 'single' ? null : 'single')} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> <span className="hidden sm:inline">Add User</span>
          </button>
        </div>
      </div>

      {/* Control Forms */}
      {formOpen === 'single' && (
        <form onSubmit={handleWhitelist} className="card border-accent/30 animate-slide-up relative bg-gradient-to-br from-accent/5 to-transparent">
          <button type="button" onClick={() => setFormOpen(null)} className="absolute top-4 right-4 text-text-muted hover:text-text-primary"><XCircle size={18}/></button>
          <div className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Shield size={16} className="text-accent" /> KYC Whitelist Application
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Wallet Address *</label>
              <input className="input font-mono" placeholder="0x..." value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Full Name</label>
              <input className="input" placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="user@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Transfer Limit (USD, blank = 500)</label>
              <input className="input pl-8" type="number" placeholder="500" value={form.limit} onChange={e => setForm(f => ({ ...f, limit: e.target.value }))} />
            </div>
            <div>
              <label className="label">KYC Document Reference</label>
              <input className="input" placeholder="KYC-2024-..." value={form.kycDocRef} onChange={e => setForm(f => ({ ...f, kycDocRef: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-accent/10">
            <button type="submit" className="btn-primary flex items-center gap-2 shadow-lg shadow-accent/20"><CheckCircle2 size={16}/> Approve & Whitelist</button>
            <button type="button" onClick={() => setFormOpen('bulk')} className="btn-secondary flex items-center gap-2"><UploadCloud size={16}/> Switch to Bulk Import</button>
          </div>
        </form>
      )}

      {formOpen === 'bulk' && (
        <form onSubmit={handleBulkWhitelist} className="card border-accent/30 animate-slide-up relative bg-gradient-to-br from-accent/5 to-transparent">
          <button type="button" onClick={() => setFormOpen(null)} className="absolute top-4 right-4 text-text-muted hover:text-text-primary"><XCircle size={18}/></button>
          <div className="text-sm font-semibold flex items-center gap-2 mb-4">
            <UploadCloud size={16} className="text-accent" /> Bulk Whitelist Import
          </div>
          <div>
            <label className="label mb-2">Comma Separated Addresses *</label>
            <textarea 
              className="input font-mono text-xs p-3 leading-relaxed" 
              rows={4} 
              placeholder="0x111..., 0x222..., 0x333..." 
              value={bulkData} 
              onChange={e => setBulkData(e.target.value)} 
              required 
            />
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-accent/10">
            <button type="submit" className="btn-primary flex items-center gap-2"><UploadCloud size={16}/> Import Addresses</button>
            <button type="button" onClick={() => setFormOpen('single')} className="btn-secondary flex items-center gap-2"><Shield size={16}/> Single User Entry</button>
          </div>
        </form>
      )}

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-elevated group cursor-pointer" onClick={() => setTab('all')}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">Total Tracked</div>
            <Activity size={15} className="text-text-muted" />
          </div>
          <div className="text-3xl font-bold Tracking-tight">{counts.all}</div>
        </div>
        
        <div className="card-elevated border border-accent/20 bg-accent/5 group cursor-pointer" onClick={() => setTab('whitelisted')}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-accent">Whitelisted</div>
            <Shield size={15} className="text-accent" />
          </div>
          <div className="text-3xl font-bold Tracking-tight text-text-primary">{counts.whitelisted}</div>
          <div className="mt-1 text-xs text-text-secondary">KYC Approved Users</div>
        </div>

        <div className="card-elevated border border-danger/20 bg-danger/5 group cursor-pointer" onClick={() => setTab('blacklisted')}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-danger">Blacklisted</div>
            <XCircle size={15} className="text-danger" />
          </div>
          <div className="text-3xl font-bold Tracking-tight text-text-primary">{counts.blacklisted}</div>
          <div className="mt-1 text-xs text-text-secondary">AML Policy Flags</div>
        </div>

        <div className="card-elevated border border-warn/20 bg-warn/5 group cursor-pointer" onClick={() => setTab('high_risk')}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-warn">Suspicious / High Risk</div>
            <ShieldAlert size={15} className="text-warn" />
          </div>
          <div className="text-3xl font-bold Tracking-tight text-text-primary">{counts.high_risk}</div>
          <div className="mt-1 text-xs text-text-secondary">Needs review</div>
        </div>
      </div>

      {/* Main List */}
      <div className="card flex flex-col min-h-[400px]">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="flex p-1 bg-surface rounded-lg w-full sm:w-auto">
            {['all', 'whitelisted', 'blacklisted', 'high_risk'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-md transition-all capitalize whitespace-nowrap
                  ${tab === t ? 'bg-elevated text-text-primary shadow-sm ring-1 ring-border' : 'text-text-muted hover:text-text-primary'}`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:max-w-xs ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Filter by wallet address..." 
              className="input pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <button 
            onClick={() => {
              const target = prompt("Enter wallet address to scan risk model:");
              if(target) handleScanRisk(target);
            }} 
            className="btn-secondary h-9 text-xs shrink-0 flex items-center gap-2"
          >
            <ShieldAlert size={14} className="text-warn"/> Scan Target
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted text-sm py-12">
            <Loader2 size={24} className="animate-spin mb-4" />
            Syncing compliance registry...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted text-sm py-12 bg-surface/30 rounded-lg border border-dashed border-border">
            <Search size={32} className="opacity-20 mb-4" />
            <p>No wallets found in this filter.</p>
          </div>
        ) : (
          <div className="group/list border border-border rounded-lg bg-surface">
            {filtered.map(w => (
              <WalletRow key={w.address} w={w} onAction={handleAction} onScoreScan={handleScanRisk} />
            ))}
          </div>
        )}
      </div>

      {/* Risk Output Display */}
      {riskResult && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-elevated border border-border shadow-2xl rounded-xl p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert size={16} className={riskResult.tier === 'HIGH' ? 'text-danger' : riskResult.tier === 'MEDIUM' ? 'text-warn' : 'text-accent'} />
              AML Risk Model output
            </div>
            <button onClick={() => setRiskResult(null)} className="text-text-muted hover:text-text-primary"><XCircle size={14}/></button>
          </div>
          
          <div className="flex items-end gap-2 mb-4">
            <div className={`text-4xl font-bold Tracking-tight ${riskResult.tier === 'HIGH' ? 'text-danger' : riskResult.tier === 'MEDIUM' ? 'text-warn' : 'text-accent'}`}>
              {riskResult.score}
            </div>
            <div className="text-xs text-text-muted mb-1 font-mono">/ 100 Score</div>
          </div>
          
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between border-b border-border/50 pb-1">
              <span className="text-text-muted">Target Entity:</span>
              <span title={riskResult.address}>{riskResult.address.slice(0, 10)}...</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1">
              <span className="text-text-muted">30-day Volume:</span>
              <span>{riskResult.factors.avgVolumeUSD}M USD</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1">
              <span className="text-text-muted">High-Risk Counters:</span>
              <span className={riskResult.factors.connectedToBlacklisted ? 'text-danger font-bold' : 'text-accent'}>
                {riskResult.factors.connectedToBlacklisted ? 'DETECTED' : 'CLEAN'}
              </span>
            </div>
          </div>
          
          {riskResult.tier === 'HIGH' && (
            <div className="mt-4 flex gap-2">
               <button onClick={() => handleAction('blacklist', riskResult.address)} className="flex-1 btn-primary bg-danger text-white py-1.5 text-xs text-center border border-danger shadow border-transparent rounded hover:bg-danger/80">Blacklist Entity</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
