/**
 * BlockPay Demo Seed Script
 * Pre-loads demo wallets, compliance state, and sample transactions
 * Run: node scripts/seed-demo.js
 */

const BASE = 'http://localhost:4000/api'

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function get(path) {
  const res = await fetch(BASE + path)
  return res.json()
}

async function seed() {
  console.log('🌱 BlockPay Demo Seed Starting...\n')

  // 1. Check API health
  const health = await get('/health')
  console.log('✅ API connected:', health.service, health.version)

  // 2. Whitelist demo wallets
  const wallets = [
    { address: '0xAlice01', name: 'Alice Sharma', email: 'alice@demo.com', limit: '500', kycDocRef: 'KYC-2024-001' },
    { address: '0xBob02', name: 'Bob Verma', email: 'bob@demo.com', limit: '500', kycDocRef: 'KYC-2024-002' },
    { address: '0xCharlie03', name: 'Charlie Reddy', email: 'charlie@demo.com', limit: '1000', kycDocRef: 'KYC-2024-003' },
    { address: '0xDiana04', name: 'Diana Patel', email: 'diana@demo.com', limit: '250', kycDocRef: 'KYC-2024-004' },
  ]

  for (const w of wallets) {
    const r = await post('/compliance/whitelist', w)
    console.log(`  ✓ Whitelisted ${w.name} (${w.address})`)
  }

  // 3. Deposit funds
  const deposits = [
    { address: '0xAlice01', amountUSD: 1000 },
    { address: '0xCharlie03', amountUSD: 2000 },
  ]
  for (const d of deposits) {
    await post('/settlement/deposit', d)
    console.log(`  ✓ Deposited $${d.amountUSD} to ${d.address}`)
  }

  // 4. Demo transactions
  const txs = [
    { sender: '0xAlice01', receiver: '0xBob02', amount: '100' },
    { sender: '0xAlice01', receiver: '0xDiana04', amount: '50' },
    { sender: '0xCharlie03', receiver: '0xBob02', amount: '200' },
  ]

  console.log('\n📤 Processing demo transactions...')
  for (const tx of txs) {
    try {
      const r = await post('/settlement/send', tx)
      console.log(`  ✓ ${tx.sender} → ${tx.receiver} : $${tx.amount} BPUSD (ID: ${r.remittance?.id?.slice(0, 12)}...)`)
    } catch (e) {
      console.log(`  ✗ Failed: ${e.message}`)
    }
  }

  console.log('\n🎉 Demo seed complete! Open http://localhost:5173 to explore BlockPay.\n')
}

seed().catch(console.error)
