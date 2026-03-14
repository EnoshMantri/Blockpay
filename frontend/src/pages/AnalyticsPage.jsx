import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { analyticsApi } from '../utils/api';
import { TrendingUp, ShieldAlert, Award } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function AnalyticsPage() {
  const [volumeData, setVolumeData] = useState([]);
  const [feeData, setFeeData] = useState([]);
  const [corridors, setCorridors] = useState([]);
  const [complianceLog, setComplianceLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        const [vol, fees, corr, compl] = await Promise.all([
          analyticsApi.getVolume(),
          analyticsApi.getFees(),
          analyticsApi.getCorridors(),
          analyticsApi.getCompliance(),
        ]);
        setVolumeData(vol);
        setFeeData(fees);
        setCorridors(corr);
        setComplianceLog(compl);
      } catch (err) {
        toast('Failed to load analytics: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
            System Analytics
          </h1>
          <p className="text-sm text-text-muted mt-1">30-day performance and compliance trends</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
              <TrendingUp size={20} className="text-accent" />
            </div>
            <h2 className="font-semibold tracking-wide">Daily Volume (USD)</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00d4aa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="date" stroke="#666" fontSize={12} tickMargin={10} minTickGap={30} />
                <YAxis stroke="#666" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                  formatter={(value) => [formatUSD(value), 'Volume']}
                />
                <Area type="monotone" dataKey="volume" stroke="#00d4aa" strokeWidth={2} fillOpacity={1} fill="url(#colorVol)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-warn/10">
              <Award size={20} className="text-warn" />
            </div>
            <h2 className="font-semibold tracking-wide">Fee Revenue (USD)</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="date" stroke="#666" fontSize={12} tickMargin={10} minTickGap={30} />
                <YAxis stroke="#666" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                  formatter={(value) => [formatUSD(value), 'Fees']}
                />
                <Bar dataKey="fees" fill="#ffb800" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Details Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold tracking-wide mb-4">Top Volume Corridors</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-text-muted uppercase bg-surface">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Sender</th>
                  <th className="px-4 py-3">Receiver</th>
                  <th className="px-4 py-3 text-right">Total TXs</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Volume (USD)</th>
                </tr>
              </thead>
              <tbody>
                {corridors.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-4 text-text-muted">No data available</td></tr>
                ) : corridors.map((c, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-hover">
                    <td className="px-4 py-3 font-mono text-xs">{c.sender}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.receiver}</td>
                    <td className="px-4 py-3 text-right font-medium text-text-secondary">{c.count}</td>
                    <td className="px-4 py-3 text-right font-medium text-accent">{formatUSD(c.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-danger/10">
              <ShieldAlert size={20} className="text-danger" />
            </div>
            <h2 className="font-semibold tracking-wide">Recent Compliance Events</h2>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {complianceLog.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">No recent events</p>
            ) : complianceLog.map((log) => (
              <div key={log.id} className="p-3 bg-surface rounded-lg border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-sm ${
                    log.action === 'WHITELIST' ? 'bg-accent/20 text-accent' :
                    log.action === 'BLACKLIST' ? 'bg-danger/20 text-danger' :
                    'bg-warn/20 text-warn'
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-xs font-mono text-text-secondary truncate mt-2">
                  {log.wallet}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
