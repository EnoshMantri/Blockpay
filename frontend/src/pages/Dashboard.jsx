import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { settlementApi } from '../utils/api';
import {
  TrendingUp, Zap, Shield, Clock, Send, ArrowUpRight,
  Activity, Users, DollarSign, Radio
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import NodeInspector from '../components/NodeInspector';

const COMPARISON = [
  { name: 'SWIFT', latency: 2880, fee: 5.0, color: '#484F58' },
  { name: 'Ripple', latency: 4, fee: 0.8, color: '#484F58' },
  { name: 'Stellar', latency: 4, fee: 0.1, color: '#484F58' },
  { name: 'BlockPay', latency: 0.5, fee: 0.5, color: '#00D4AA' },
];

function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-text-secondary text-xs font-medium uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? 'bg-accent/10' : 'bg-elevated'}`}>
          <Icon size={15} className={accent ? 'text-accent' : 'text-text-secondary'} />
        </div>
      </div>
      <div>
        <div className="text-2xl font-semibold text-text-primary">{value}</div>
        {sub && <div className="text-xs text-text-secondary mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-elevated border border-border rounded-lg px-3 py-2 text-xs">
      <div className="text-text-secondary mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState([]);

  const load = async () => {
    try {
      const s = await settlementApi.getStats();
      setStats(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // WebSocket Connection for Live Feed
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log('WebSocket connected to live feed');
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'STAGE_UPDATE') {
          setLiveEvents(prev => {
            const newEvents = [data, ...prev].slice(0, 10); // Keep last 10
            return newEvents;
          });
        }
      } catch (err) {
        console.error('Failed to parse WS msg', err);
      }
    };
    socket.onclose = () => console.log('WebSocket disconnected');

    return () => socket.close();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="card border-accent/20 bg-gradient-to-br from-accent/5 to-transparent relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse inline-block" />
                <span className="text-accent text-xs font-mono font-medium tracking-widest uppercase">
                  {stats?.network === 'simulation' ? 'Simulation Mode' : 'Live Hardhat Network'}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-text-primary mb-2">BlockPay Settlement Console</h1>
              <p className="text-text-secondary text-sm max-w-xl leading-relaxed">
                Blockchain-based cross-border remittance framework. Settlement under 30s · 0.5% flat fee · Zero intermediaries · Full on-chain compliance.
              </p>
            </div>
            <Link to="/send" className="btn-primary flex items-center gap-2 shrink-0 z-10">
              <Send size={15} />
              Send Transfer
            </Link>
          </div>
        </div>
      </div>
      
      {/* Node Inspector */}
      <NodeInspector />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Volume" value={loading ? '—' : `$${stats?.totalVolumeBPUSD}`} sub="BPUSD settled" icon={DollarSign} accent />
        <StatCard label="Transactions" value={loading ? '—' : stats?.totalTransactions} sub="settled on-chain" icon={Activity} />
        <StatCard label="Active Wallets" value={loading ? '—' : stats?.activeWallets} sub="in compliance registry" icon={Users} />
        <StatCard label="Avg Settlement" value="28s" sub="vs 1–3 days SWIFT" icon={Clock} accent />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Charts & System) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fee comparison */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Fee & Latency Comparison</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={COMPARISON} barSize={40} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#8B949E', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: '#8B949E', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Bar yAxisId="left" dataKey="fee" name="Fee %" radius={[4, 4, 0, 0]}>
                  {COMPARISON.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* System properties */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Zap, label: 'Sub-30s Settlement', desc: 'Cryptographic finality achieved on Ethereum', color: 'accent' },
              { icon: Shield, label: 'On-Chain Compliance', desc: 'Embedded whitelist & AML transfer limits', color: 'accent' },
              { icon: TrendingUp, label: 'Guaranteed Rates', desc: 'Transparent 0.5% fee structure', color: 'accent' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-4 rounded-xl bg-elevated border border-border flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-accent" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">{label}</div>
                  <div className="text-xs text-text-muted leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (Live Feed) */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-accent animate-pulse" />
              <h2 className="font-semibold">Live Network Feed</h2>
            </div>
            <span className="text-xs font-mono text-text-muted bg-surface px-2 py-1 rounded">WS Connected</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-[300px]">
            {liveEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-muted text-sm pb-8">
                <Activity size={24} className="mb-2 opacity-50" />
                <p>Awaiting live network transactions...</p>
                <p className="text-xs mt-1">Initiate a transfer to see activity.</p>
              </div>
            ) : (
              liveEvents.map((evt, idx) => (
                <div key={idx} className="p-3 bg-elevated border border-border rounded-lg text-sm animate-fade-in">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-accent text-xs">Stage {evt.stage.stage}</span>
                    <span className="text-[10px] text-text-muted">{new Date(evt.stage.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="font-medium text-text-primary mb-1">{evt.stage.name}</div>
                  <div className="text-xs text-text-secondary">{evt.stage.description}</div>
                  {evt.stage.txHash && (
                    <div className="mt-2 text-[10px] font-mono text-text-muted truncate">
                      TX: {evt.stage.txHash}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
