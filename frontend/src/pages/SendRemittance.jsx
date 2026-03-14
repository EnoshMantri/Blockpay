import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { settlementApi } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { CheckCircle2, Circle, Loader2, AlertCircle, Send, Info, ChevronDown, ChevronUp, FileText, Download, Zap } from 'lucide-react';

const STAGE_LABELS = [
  { n: 1, name: 'Deposit Initiated', desc: 'Fiat deposited via on-ramp; conversion triggered' },
  { n: 2, name: 'Stablecoin Minted', desc: 'ERC-20 BPUSD tokens minted to sender wallet' },
  { n: 3, name: 'Compliance Check', desc: 'Whitelist, blacklist & transfer limit validation' },
  { n: 4, name: 'Remittance Transfer', desc: 'transferFrom executed; 0.5% fee deducted' },
  { n: 5, name: 'Settlement Finalized', desc: 'Block confirmed; cryptographic finality achieved' },
  { n: 6, name: 'Burn + Withdrawal', desc: 'Tokens burned; fiat disbursed in local currency' },
];

function StageTracker({ stages, activeStage, error }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="space-y-1">
      {STAGE_LABELS.map(({ n, name, desc }) => {
        const completed = stages.find(s => s.stage === n);
        const active = activeStage === n;
        const pending = !completed && !active;
        const isExp = expanded === n;

        return (
          <div key={n} className={`rounded-lg border transition-all duration-300 overflow-hidden
            ${completed ? 'border-accent/30 bg-accent/5'
              : active ? 'border-warn/40 bg-warn/5 animate-pulse-accent'
              : error && activeStage < n ? 'border-border/30 bg-transparent opacity-30'
              : 'border-border bg-transparent opacity-60'}`}>
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              onClick={() => completed && setExpanded(isExp ? null : n)}
            >
              <div className="shrink-0">
                {completed ? (
                  <CheckCircle2 size={18} className="text-accent" />
                ) : active ? (
                  <Loader2 size={18} className="text-warn animate-spin" />
                ) : (
                  <Circle size={18} className="text-text-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${completed ? 'text-text-primary' : active ? 'text-warn' : 'text-text-muted'}`}>
                  {n}. {name}
                </div>
                <div className="text-xs text-text-secondary truncate">{desc}</div>
              </div>
              {completed && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-text-muted">
                    {new Date(completed.timestamp).toLocaleTimeString()}
                  </span>
                  {isExp ? <ChevronUp size={12} className="text-text-muted" /> : <ChevronDown size={12} className="text-text-muted" />}
                </div>
              )}
            </button>
            {isExp && completed && (
              <div className="px-4 pb-3 font-mono text-xs space-y-1 border-t border-accent/10 pt-2 mt-0">
                {Object.entries(completed).filter(([k]) => !['stage', 'name', 'timestamp'].includes(k)).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-text-muted w-32 shrink-0">{k}:</span>
                    <span className="text-accent/80 break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  );
}

export default function SendRemittance() {
  const { address, provider, contracts, connectWallet } = useWeb3();
  const [mode, setMode] = useState('simulate'); // 'metamask' | 'simulate'
  const [form, setForm] = useState({ sender: '', receiver: '', amount: '' });
  const [stages, setStages] = useState([]);
  const [activeStage, setActiveStage] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (address) {
      setForm(f => ({ ...f, sender: address }));
    }
  }, [address]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ─── Simulate Mode ──────────────────────────────────────────────────────────
  const handleSimulate = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setStages([]);
    setActiveStage(1);
    setError(null);
    setResult(null);

    try {
      const resp = await settlementApi.simulate({
        sender: form.sender,
        receiver: form.receiver,
        amount: form.amount,
      });

      // Replay stages with animated delays
      for (const s of resp.stages) {
        await new Promise(r => setTimeout(r, 700));
        setStages(prev => [...prev, s]);
        setActiveStage(s.stage + 1);
      }

      setActiveStage(7);
      setResult(resp.record);
      setStatus('success');
      toast('Simulation completed successfully!', 'success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
      toast(err.message, 'error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setStages([]);
    setActiveStage(0);
    setError(null);
    setResult(null);
    setForm({ sender: address || '', receiver: '', amount: '' });
  };

  // ─── MetaMask On-Chain Mode ───────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if (!address || !contracts.BPUSD || !contracts.SettlementEngine) {
      toast('Please connect MetaMask first', 'error');
      return;
    }

    try {
      if (provider) {
        const network = await provider.getNetwork();

        if (network.chainId.toString() !== '31337') {
          // Auto-prompt MetaMask to switch to Hardhat
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x7a69' }], // 31337 in hex
            });
            toast('Network switched to Hardhat! Click Execute again.', 'success');
          } catch (switchErr) {
            // Chain not added yet — add it
            if (switchErr.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{ chainId: '0x7a69', chainName: 'Hardhat Localhost', rpcUrls: ['http://127.0.0.1:8545'], nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 } }],
              });
              toast('Hardhat network added! Click Execute again.', 'success');
            } else {
              toast('Please manually switch MetaMask to the Hardhat (Chain 31337) network.', 'error');
            }
          }
          setStatus('idle');
          return;
        }
      }
    } catch (e) {
      console.warn('Network check failed:', e.message);
    }

    setStatus('sending');
    setStages([]);
    setActiveStage(1);
    setError(null);
    setResult(null);

    try {
      const amountUnits = ethers.parseUnits(form.amount, 6); // 6 decimals for BPUSD

      // We will visually simulate the first 3 stages while MetaMask opens
      const addStage = (n, data) => {
        setStages(prev => {
          if (prev.find(s => s.stage === n)) return prev;
          return [...prev, { stage: n, timestamp: new Date().toISOString(), ...data }];
        });
        setActiveStage(n + 1);
      };

      // Stage 1: Deposit Initiated (Visual)
      addStage(1, { name: "Deposit Initiated", description: "Fiat deposit confirmed", depositRef: "MEM-DEP-" + Date.now().toString(36) });
      await new Promise(r => setTimeout(r, 600));

      // Stage 2: Stablecoin Check (Visual)
      const balance = await contracts.BPUSD.balanceOf(address);
      if (balance < amountUnits) {
        throw new Error(`Insufficient BPUSD balance. You have ${ethers.formatUnits(balance, 6)} BPUSD.`);
      }
      addStage(2, { name: "Stablecoin Verified", description: "Sufficient balance confirmed in wallet", balance: ethers.formatUnits(balance, 6) });
      await new Promise(r => setTimeout(r, 600));

      // Stage 3: Compliance Check (Visual - we assume passed for now, contract will revert if not)
      addStage(3, { name: "Compliance Engine", description: "Pending on-chain whitelist verification" });

      // Stage 4: User Approval
      toast("Please approve the BPUSD transfer in MetaMask", "info");
      
      // Check allowance
      const allowance = await contracts.BPUSD.allowance(address, await contracts.SettlementEngine.getAddress());
      if (allowance < amountUnits) {
        const approveTx = await contracts.BPUSD.approve(await contracts.SettlementEngine.getAddress(), ethers.MaxUint256);
        toast("Waiting for approval confirmation...", "info");
        await approveTx.wait();
      }

      // Stage 5: Execution
      toast("Please confirm the Settlement in MetaMask", "info");
      addStage(4, { name: "Awaiting MetaMask Signature", description: "Waiting for user to sign transaction..." });

      const remittanceId = crypto.randomUUID();
      const tx = await contracts.SettlementEngine.executeRemittance(
        remittanceId,
        form.sender,
        form.receiver,
        amountUnits
      );

      toast("Transaction submitted to local Hardhat node!", "success");
      
      // Wait for block confirmation
      const receipt = await tx.wait();

      addStage(5, { 
        name: "Settlement Finalized", 
        description: "Block confirmed; cryptographic finality achieved",
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash
      });

      // Stage 6: Visual wrap-up
      await new Promise(r => setTimeout(r, 500));
      addStage(6, { name: "Tokens Disbursed", description: "Assets successfully transferred" });

      // Build Result Object for Receipt
      const fee = (Number(amountUnits) * 50) / 10000;
      const netAmount = Number(amountUnits) - fee;
      
      const finalResult = {
        id: remittanceId,
        sender: form.sender,
        receiver: form.receiver,
        grossAmount: Number(amountUnits),
        fee,
        netAmount,
        settlementHash: receipt.hash,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: "settled",
        createdAt: stages[0]?.timestamp || new Date().toISOString(),
        settledAt: new Date().toISOString(),
      };

      // Notify backend to log it for analytics chart
      try {
        await settlementApi.recordOnchain(finalResult);
      } catch (e) {
        console.warn("Backend logging failed, but tx succeeded on-chain", e);
      }

      setActiveStage(7); // all done
      setResult(finalResult);
      setStatus('success');
      toast('Remittance settled successfully on-chain', 'success');

    } catch (err) {
      console.error(err);
      setError(err.reason || err.message || "Unknown MetaMask Error");
      setStatus('error');
      toast(err.reason || err.message, 'error');
    }
  };

  const printReceipt = () => window.print();


  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in print:max-w-none print:m-0 print:p-0">
      <div className="print:hidden flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse inline-block" />
            <span className="text-accent text-xs font-mono font-medium tracking-widest uppercase">Settlement Execution Engine</span>
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent mb-1">Send Remittance</h2>
          <p className="text-text-secondary text-sm">Choose MetaMask for on-chain execution or Simulate for a full demo without a wallet.</p>
        </div>
      </div>

      {/* Mode Switcher */}
      {status === 'idle' && (
        <div className="flex bg-surface border border-border rounded-xl p-1 gap-1 print:hidden">
          <button
            onClick={() => { setMode('simulate'); reset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all
              ${ mode === 'simulate' ? 'bg-accent text-void shadow-btn-glow' : 'text-text-secondary hover:text-text-primary' }`}
          >
            <Zap size={15} /> Simulate (No Wallet Needed)
          </button>
          <button
            onClick={() => { setMode('metamask'); reset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all
              ${ mode === 'metamask' ? 'bg-surface border border-accent/30 text-accent shadow' : 'text-text-secondary hover:text-text-primary' }`}
          >
            <Send size={15} /> MetaMask (On-Chain)
          </button>
        </div>
      )}

      {/* ─── SIMULATION FORM ─── */}
      {status === 'idle' && mode === 'simulate' && (
        <form onSubmit={handleSimulate} className="card space-y-6 print:hidden">
          <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 text-xs text-text-secondary flex gap-3">
            <Zap size={16} className="text-accent shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Simulate a full 6-stage remittance pipeline without MetaMask. The transaction is stored in the database
              and appears in your analytics and transactions log exactly like a real settlement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="label">Sender Wallet Address</label>
                <input
                  className="input font-mono text-sm"
                  placeholder="0xf39Fd6e51a..."
                  value={form.sender}
                  onChange={e => set('sender', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Receiver Wallet Address</label>
                <input
                  className="input font-mono text-sm"
                  placeholder="0x70997970C5..."
                  value={form.receiver}
                  onChange={e => set('receiver', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-xl bg-surface border border-border flex flex-col justify-center">
              <div>
                <label className="label text-accent font-medium">Amount (BPUSD)</label>
                <div className="relative mt-2">
                  <input
                    className="input pr-20 text-xl font-semibold bg-void h-14"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={e => set('amount', e.target.value)}
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-accent font-mono font-bold">BPUSD</span>
                </div>
              </div>
              {form.amount && parseFloat(form.amount) > 0 ? (
                <div className="pt-4 space-y-2 font-mono text-xs border-t border-border mt-2">
                  <div className="flex justify-between text-text-secondary">
                    <span>Gross amount:</span><span>{parseFloat(form.amount).toFixed(2)} BPUSD</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Platform fee (0.5%):</span><span>- {(parseFloat(form.amount) * 0.005).toFixed(4)} BPUSD</span>
                  </div>
                  <div className="flex justify-between text-accent font-medium border-t border-border pt-2 mt-1">
                    <span>Receiver gets:</span><span>{(parseFloat(form.amount) * 0.995).toFixed(4)} BPUSD</span>
                  </div>
                </div>
              ) : (
                <div className="pt-4 text-xs text-text-muted text-center italic mt-2">Enter an amount to see fee breakdown</div>
              )}
            </div>
          </div>

          {/* Quick-fill test addresses */}
          <div className="p-3 rounded-xl bg-void border border-border text-[10px] font-mono space-y-2">
            <div className="text-text-muted uppercase tracking-wider text-[9px] mb-1 font-bold">Quick-fill Hardhat test addresses</div>
            <div className="flex gap-3 flex-wrap">
              <button type="button"
                onClick={() => set('sender', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')}
                className="text-accent hover:underline">Account #0 (Sender)
              </button>
              <button type="button"
                onClick={() => set('receiver', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8')}
                className="text-accent hover:underline">Account #1 (Receiver)
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full h-12 flex items-center justify-center gap-2 text-base shadow-[0_4px_14px_rgba(0,212,170,0.39)]">
            <Zap size={18} /> Run Simulation
          </button>
        </form>
      )}

      {/* ─── METAMASK FORM ─── */}
      {status === 'idle' && mode === 'metamask' && (
        <form onSubmit={handleSend} className="card space-y-6 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="label">Sender Wallet Address</label>
                <input
                  className="input font-mono text-sm"
                  placeholder="0x..."
                  value={form.sender}
                  readOnly
                  onChange={e => set('sender', e.target.value)}
                  title="Sender is locked to your connected MetaMask address"
                  required
                />
              </div>
              <div>
                <label className="label">Receiver Wallet Address</label>
                <input
                  className="input font-mono text-sm"
                  placeholder="0x..."
                  value={form.receiver}
                  onChange={e => set('receiver', e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-4 p-4 rounded-xl bg-surface border border-border flex flex-col justify-center">
              <div>
                <label className="label text-accent font-medium">Amount (BPUSD)</label>
                <div className="relative mt-2">
                  <input
                    className="input pr-20 text-xl font-semibold bg-void h-14"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={e => set('amount', e.target.value)}
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-accent font-mono font-bold">BPUSD</span>
                </div>
              </div>

              {form.amount && parseFloat(form.amount) > 0 ? (
                <div className="pt-4 space-y-2 font-mono text-xs border-t border-border mt-4">
                  <div className="flex justify-between text-text-secondary">
                    <span>Gross amount:</span><span>{parseFloat(form.amount).toFixed(2)} BPUSD</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Platform fee (0.5%):</span><span>- {(parseFloat(form.amount) * 0.005).toFixed(4)} BPUSD</span>
                  </div>
                  <div className="flex justify-between text-accent font-medium border-t border-border border-dashed pt-2 mt-2">
                    <span>Receiver gets:</span><span>{(parseFloat(form.amount) * 0.995).toFixed(4)} BPUSD</span>
                  </div>
                </div>
              ) : (
                <div className="pt-4 text-xs text-text-muted text-center italic mt-4">
                  Enter an amount to see fee breakdown
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 bg-text-secondary/10 border border-text-secondary/20 rounded-xl p-5 text-sm text-text-secondary mt-2 shadow-inner">
            <Info size={20} className="shrink-0 mt-0.5 text-accent" />
            <div className="leading-relaxed text-xs space-y-3">
              <p>
                This is a fully decentralized <strong>Non-Custodial</strong> transaction. To send money, you must be connected to the <span className="text-accent">Localhost 8545</span> network in MetaMask.
              </p>
              <div className="p-3 bg-void rounded-lg border border-border font-mono text-[10px] space-y-2">
                <div className="font-bold text-text-primary uppercase tracking-wider mb-2 text-[11px]">Hardhat Test Accounts (Import into MetaMask)</div>
                <div>
                  <span className="text-text-muted">Account 0 (Sender):</span> 
                  <button type="button" onClick={() => {
                    navigator.clipboard.writeText('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
                    toast('Sender Private Key Copied!', 'success');
                  }} className="ml-2 text-accent hover:underline" title="Click to copy full Private Key">0xac0974bec39...ff80</button>
                  <div className="text-text-muted text-[9px] mt-0.5 ml-[110px]">Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266</div>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <span className="text-text-muted">Account 1 (Receiver):</span> 
                  <button type="button" onClick={() => {
                    navigator.clipboard.writeText('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');
                    toast('Receiver Private Key Copied!', 'success');
                  }} className="ml-2 text-accent hover:underline" title="Click to copy full Private Key">0x59c6995e998...690d</button>
                  <div className="text-text-muted text-[9px] mt-0.5 ml-[120px]">Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8</div>
                </div>
              </div>
              <p className="text-text-muted text-[10px] italic">
                * Click the private keys above to copy them. In MetaMask, go to Accounts &gt; Add account or hardware wallet &gt; Import account, and paste the private key.
              </p>
            </div>
          </div>

          {!address ? (
             <button type="button" onClick={connectWallet} className="btn-secondary w-full h-12 flex items-center justify-center gap-2 text-base text-accent border-accent/30 hover:bg-accent hover:text-void transition-colors shadow-btn-glow">
               Connect MetaMask to Send
             </button>
          ) : (
            <button type="submit" className="btn-primary w-full h-12 flex items-center justify-center gap-2 text-base shadow-[0_4px_14px_rgba(0,212,170,0.39)] hover:shadow-[0_6px_20px_rgba(0,212,170,0.23)]">
              <Send size={18} /> Execute via MetaMask
            </button>
          )}
        </form>
      )}


      {(status === 'sending' || status === 'error' || status === 'success') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:w-full">
          {/* Tracking Column */}
          <div className="card space-y-4 print:hidden">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="text-base font-semibold text-text-primary flex items-center gap-2">
                {status === 'sending' && <><Loader2 size={16} className="animate-spin text-warn" /> Processing Pipeline</>}
                {status === 'success' && <><CheckCircle2 size={16} className="text-accent" /> Settlement Complete</>}
                {status === 'error' && <><AlertCircle size={16} className="text-danger" /> Settlement Failed</>}
              </div>
              {status !== 'sending' && (
                <button onClick={reset} className="btn-secondary text-xs px-3 py-1.5 h-auto">
                  New Transfer
                </button>
              )}
            </div>

            <StageTracker stages={stages} activeStage={activeStage} error={status === 'error'} />

            {status === 'error' && (
              <div className="flex gap-3 bg-danger/10 border border-danger/30 rounded-lg p-4 text-danger animate-slide-up mt-4">
                <AlertCircle size={20} className="shrink-0" />
                <div>
                  <div className="font-bold mb-1">Transaction Reverted</div>
                  <div className="text-sm font-mono opacity-90">{error}</div>
                </div>
              </div>
            )}
          </div>

          {/* Receipt Column */}
          {status === 'success' && result && (
            <div className="card border-accent/30 bg-[#0d151c] relative print:border-none print:shadow-none print:bg-white print:text-black print:p-0">
              {/* Print Only Header */}
              <div className="hidden print:flex justify-between items-center mb-10 border-b pb-4">
                <div className="text-2xl font-bold">BlockPay Inc.</div>
                <div className="text-right">
                  <div className="font-mono text-sm opacity-70">RECEIPT #{result.id.slice(0,8).toUpperCase()}</div>
                  <div className="text-sm">{new Date(result.settledAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="absolute top-0 right-0 p-4 print:hidden">
                <button onClick={printReceipt} className="p-2 bg-surface hover:bg-hover rounded-lg text-text-secondary hover:text-text-primary transition-colors hover:shadow" title="Download Receipt">
                  <Download size={18} />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-6 print:mb-8">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center print:bg-gray-200">
                  <FileText size={20} className="text-accent print:text-black" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2 print:text-xl">
                    Smart Contract Receipt 
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-accent/10 text-accent uppercase tracking-wider font-bold border border-accent/20 print:border-black print:text-black print:bg-transparent">On-Chain</span>
                  </h3>
                  <p className="text-text-muted text-xs font-mono print:text-gray-500">{result.id}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-void border border-border print:bg-transparent print:border-gray-300">
                  <div className="text-center mb-4">
                    <div className="text-text-secondary text-xs uppercase tracking-wider mb-1 print:text-gray-600">Total Settled</div>
                    <div className="text-4xl font-bold text-white print:text-black">
                      {(result.netAmount / 1e6).toFixed(2)} <span className="text-lg text-text-muted font-normal">USD</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm font-mono mt-6">
                    <div className="flex justify-between pt-2 border-t border-border/50 print:border-gray-200">
                      <span className="text-text-muted print:text-gray-600">Sender:</span>
                      <span className="text-accent print:text-blue-600">{result.sender}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border/50 print:border-gray-200">
                      <span className="text-text-muted print:text-gray-600">Receiver:</span>
                      <span className="text-accent print:text-blue-600">{result.receiver}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border/50 print:border-gray-200">
                      <span className="text-text-muted print:text-gray-600">Gross Amount:</span>
                      <span className="text-text-primary print:text-black">{(result.grossAmount / 1e6).toFixed(4)} USD</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border/50 print:border-gray-200">
                      <span className="text-text-muted print:text-gray-600">Network Fee (0.5%):</span>
                      <span className="text-danger print:text-red-600">-{(result.fee / 1e6).toFixed(4)} USD</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs uppercase tracking-wider text-text-secondary mb-3 print:text-gray-600">Cryptographic Proof</h4>
                  <div className="space-y-2 text-xs font-mono p-4 rounded-xl bg-surface border border-border print:bg-transparent print:border-gray-300">
                    <div>
                      <span className="text-text-muted block mb-0.5 print:text-gray-500">Settlement Hash:</span>
                      <span className="text-text-primary break-all print:text-black">{result.settlementHash}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block mb-0.5 mt-2 print:text-gray-500">Block Number:</span>
                      <span className="text-text-primary print:text-black">#{result.blockNumber}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block mb-0.5 mt-2 print:text-gray-500">Timestamp:</span>
                      <span className="text-text-primary print:text-black">{new Date(result.settledAt).toISOString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center text-[10px] text-text-muted font-mono print:text-gray-400">
                This receipt is cryptographically secured by the EVM Hardhat Node.<br/>
                Verify on-chain using the Settlement Hash and Block Number.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
