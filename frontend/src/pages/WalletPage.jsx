import { useState } from 'react'
import { settlementApi, walletApi, complianceApi } from '../utils/api'
import { Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw, CheckCircle2, XCircle, Coins } from 'lucide-react'

export default function WalletPage() {
  const [address, setAddress] = useState('')
  const [wallet, setWallet] = useState(null)
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(false)
  const [depositAmt, setDepositAmt] = useState('')
  const [msg, setMsg] = useState(null)

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  const load = async (addr) => {
    const a = addr || address
    if (!a) return
    setLoading(true)
    try {
      const [info, txData] = await Promise.all([
        walletApi.getInfo(a),
        walletApi.getTransactions(a),
      ])
      setWallet(info)
      setTxs(txData.data || [])
    } catch (e) {
      showMsg(e.message, 'error')
    }
    setLoading(false)
  }

  const handleDeposit = async () => {
    if (!depositAmt || parseFloat(depositAmt) <= 0) return
    try {
      await settlementApi.deposit({ address, amountUSD: parseFloat(depositAmt) })
      showMsg(`Deposited $${depositAmt} BPUSD to wallet`)
      setDepositAmt('')
      load()
    } catch (e) {
      showMsg(e.message, 'error')
    }
  }

  const handleWhitelistSelf = async () => {
    try {
      await complianceApi.whitelist({ address, limit: '500' })
      showMsg('Wallet whitelisted with default $500 limit')
      load()
    } catch (e) {
      showMsg(e.message, 'error')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-1">Wallet</h2>
        <p className="text-text-secondary text-sm">View balance, deposit funds (fiat on-ramp simulation), and check transaction history.</p>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border
          ${msg.type === 'error' ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-accent/10 border-accent/20 text-accent'}`}>
          {msg.type === 'error' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
          {msg.text}
        </div>
      )}

      {/* Address lookup */}
      <div className="card space-y-3">
        <label className="label">Wallet Address</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="0x... or alias (e.g. 0xAlice01)"
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
          />
          <button onClick={() => load()} className="btn-primary flex items-center gap-2 shrink-0">
            <Wallet size={14} /> Lookup
          </button>
        </div>
        <div className="flex gap-2">
          {['0xAlice01', '0xBob02'].map(a => (
            <button
              key={a}
              onClick={() => { setAddress(a); load(a) }}
              className="text-xs font-mono px-3 py-1.5 rounded-lg bg-elevated border border-border text-text-secondary hover:text-accent hover:border-accent/30 transition-colors"
            >
              {a}
            </button>
          ))}
          <span className="text-xs text-text-muted self-center ml-1">← Demo wallets</span>
        </div>
      </div>

      {wallet && (
        <>
          {/* Balance card */}
          <div className="card border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-medium text-text-secondary uppercase tracking-wider">BPUSD Balance</div>
              <button onClick={() => load()} className="text-text-muted hover:text-accent transition-colors">
                <RefreshCw size={13} />
              </button>
            </div>
            <div className="text-4xl font-semibold text-text-primary mb-1">
              ${parseFloat(wallet.balanceUSD).toFixed(2)}
            </div>
            <div className="text-xs font-mono text-text-secondary">{wallet.address}</div>

            <div className="mt-4 flex items-center gap-3">
              {wallet.compliance?.whitelisted && <span className="badge-green">KYC Verified</span>}
              {wallet.compliance?.blacklisted && <span className="badge-red">Blacklisted</span>}
              {!wallet.compliance?.whitelisted && !wallet.compliance?.blacklisted && (
                <span className="badge-yellow">Not Whitelisted</span>
              )}
              {wallet.compliance?.limit && (
                <span className="text-xs text-text-muted font-mono">
                  Limit: ${(wallet.compliance.limit / 1e6).toFixed(0)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Deposit (fiat on-ramp simulation) */}
            <div className="card space-y-3">
              <div className="flex items-center gap-2">
                <Coins size={15} className="text-accent" />
                <span className="text-sm font-medium text-text-primary">Deposit Funds</span>
              </div>
              <div className="text-xs text-text-secondary">Simulate fiat on-ramp: INR → BPUSD</div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  type="number"
                  placeholder="Amount USD"
                  min="1"
                  value={depositAmt}
                  onChange={e => setDepositAmt(e.target.value)}
                />
                <button onClick={handleDeposit} className="btn-primary shrink-0 text-sm">Deposit</button>
              </div>
              <div className="flex gap-1.5">
                {[50, 100, 200, 500].map(a => (
                  <button
                    key={a}
                    onClick={() => setDepositAmt(String(a))}
                    className="text-xs px-2.5 py-1 rounded bg-elevated border border-border text-text-secondary hover:border-accent/30 hover:text-accent transition-colors"
                  >
                    ${a}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick whitelist */}
            <div className="card space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-accent" />
                <span className="text-sm font-medium text-text-primary">KYC Compliance</span>
              </div>
              <div className="text-xs text-text-secondary">
                {wallet.compliance?.whitelisted
                  ? 'This wallet is KYC-verified and can send/receive remittances.'
                  : 'This wallet is not whitelisted. Whitelist it to enable remittances.'}
              </div>
              {!wallet.compliance?.whitelisted && !wallet.compliance?.blacklisted && (
                <button onClick={handleWhitelistSelf} className="btn-primary text-sm w-full">
                  Quick Whitelist (Demo)
                </button>
              )}
              {wallet.compliance?.whitelisted && (
                <div className="text-xs font-mono text-accent bg-accent/5 border border-accent/20 rounded-lg px-3 py-2">
                  ✓ isWhitelisted() = true on ComplianceRegistry.sol
                </div>
              )}
            </div>
          </div>

          {/* Transaction history */}
          <div className="card">
            <div className="section-title mb-3">Transaction History</div>
            {loading ? (
              <div className="text-center text-text-muted py-6 text-sm">Loading...</div>
            ) : txs.length === 0 ? (
              <div className="text-center text-text-muted py-6 text-sm">No transactions yet.</div>
            ) : (
              <div>
                {txs.map(tx => {
                  const isSender = tx.sender === address.toLowerCase()
                  return (
                    <div key={tx.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
                        ${isSender ? 'bg-danger/10' : 'bg-accent/10'}`}>
                        {isSender
                          ? <ArrowUpRight size={14} className="text-danger" />
                          : <ArrowDownLeft size={14} className="text-accent" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-text-primary">
                          {isSender ? 'Sent to ' : 'Received from '}
                          <span className="font-mono">{isSender ? tx.receiver?.slice(0, 10) : tx.sender?.slice(0, 10)}...</span>
                        </div>
                        <div className="text-xs text-text-muted">{new Date(tx.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-mono ${isSender ? 'text-danger' : 'text-accent'}`}>
                          {isSender ? '-' : '+'}{isSender ? (tx.grossAmount / 1e6).toFixed(2) : (tx.netAmount / 1e6).toFixed(2)} BPUSD
                        </div>
                        <span className="badge-green text-[10px]">Settled</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
