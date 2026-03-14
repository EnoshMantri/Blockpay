// ========================
// BlockPay — Transactions JS
// ========================

const txData = [
  { type: 'sent', name: 'Priya S.', country: '🇮🇳 India', amount: '-$500.00', fee: '$0.45', status: 'Confirmed', hash: '0xab3f...c821', time: '2h ago' },
  { type: 'received', name: 'Arjun M.', country: '🇸🇬 Singapore', amount: '+$300.00', fee: '—', status: 'Confirmed', hash: '0xcc91...4d3f', time: '1d ago' },
  { type: 'sent', name: 'Rahul K.', country: '🇦🇪 UAE', amount: '-$440.00', fee: '$0.40', status: 'Confirmed', hash: '0xd44e...9f12', time: '3d ago' },
  { type: 'sent', name: 'Kavita P.', country: '🇩🇪 Germany', amount: '-$300.00', fee: '$0.27', status: 'Confirmed', hash: '0xf12c...88ab', time: '5d ago' },
  { type: 'received', name: 'Client US LLC', country: '🇺🇸 USA', amount: '+$1,200.00', fee: '—', status: 'Confirmed', hash: '0x88ab...1f23', time: '1w ago' },
  { type: 'sent', name: 'Neha R.', country: '🇬🇧 UK', amount: '-$250.00', fee: '$0.23', status: 'Confirmed', hash: '0x4f12...c091', time: '2w ago' },
  { type: 'received', name: 'Freelance Client', country: '🇨🇦 Canada', amount: '+$600.00', fee: '—', status: 'Confirmed', hash: '0x99a1...d430', time: '3w ago' },
  { type: 'sent', name: 'Vikram S.', country: '🇦🇺 Australia', amount: '-$180.00', fee: '$0.16', status: 'Confirmed', hash: '0x1bc2...5e90', time: '1mo ago' },
];

let currentFilter = 'all';
let currentSearch = '';

function renderTx(data) {
  const tbody = document.getElementById('txTableBody');
  if (!tbody) return;

  let filtered = data;
  if (currentFilter !== 'all') {
    filtered = data.filter(tx => tx.type === currentFilter);
  }
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    filtered = filtered.filter(tx =>
      tx.name.toLowerCase().includes(q) ||
      tx.hash.toLowerCase().includes(q) ||
      tx.country.toLowerCase().includes(q)
    );
  }

  tbody.innerHTML = filtered.map(tx => `
    <div class="tx-table-row">
      <span class="type-badge ${tx.type}">
        ${tx.type === 'sent' ? '↑' : '↓'} ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
        <span style="color:var(--muted);font-size:11px;margin-left:4px">${tx.time}</span>
      </span>
      <span>${tx.name}</span>
      <span style="font-size:12px">${tx.country}</span>
      <span style="font-weight:600;color:${tx.type === 'sent' ? 'var(--text)' : 'var(--green)'}">${tx.amount}</span>
      <span style="color:var(--green);font-size:12px">${tx.fee}</span>
      <span><span class="status-pill">✓ ${tx.status}</span></span>
      <a class="hash-link" href="#" title="View on Etherscan">${tx.hash}</a>
    </div>
  `).join('');

  if (filtered.length === 0) {
    tbody.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted)">No transactions found.</div>`;
  }
}

function filterTx(type, btn) {
  currentFilter = type;
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderTx(txData);
}

function searchTx(val) {
  currentSearch = val;
  renderTx(txData);
}

document.addEventListener('DOMContentLoaded', () => {
  renderTx(txData);
});
