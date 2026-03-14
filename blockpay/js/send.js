// ========================
// BlockPay — Send Page JS
// ========================

const RATES = {
  IN: { rate: 83.5, cur: '₹', label: 'INR', flag: '🇮🇳', name: 'India' },
  GB: { rate: 0.79, cur: '£', label: 'GBP', flag: '🇬🇧', name: 'United Kingdom' },
  DE: { rate: 0.92, cur: '€', label: 'EUR', flag: '🇩🇪', name: 'Germany' },
  SG: { rate: 1.34, cur: 'S$', label: 'SGD', flag: '🇸🇬', name: 'Singapore' },
  AE: { rate: 3.67, cur: 'AED', label: 'AED', flag: '🇦🇪', name: 'UAE' },
  CA: { rate: 1.36, cur: 'C$', label: 'CAD', flag: '🇨🇦', name: 'Canada' },
  AU: { rate: 1.52, cur: 'A$', label: 'AUD', flag: '🇦🇺', name: 'Australia' },
};

let currentStep = 1;
let transferData = {};

function goToStep(step) {
  if (step === 2) {
    // Validate
    const amount = document.getElementById('sendAmount').value;
    const country = document.getElementById('destCountry').value;
    const recipient = document.getElementById('recipientAddr').value;
    const name = document.getElementById('recipientName').value;
    const purpose = document.getElementById('purpose').value;

    if (!amount || amount <= 0) { alert('Please enter a valid amount.'); return; }
    if (!country) { alert('Please select a destination country.'); return; }
    if (!recipient) { alert('Please enter recipient address.'); return; }
    if (!name) { alert('Please enter recipient name.'); return; }
    if (!purpose) { alert('Please select a transfer purpose.'); return; }

    const rd = RATES[country];
    const fee = parseFloat(amount) * 0.0009;
    const converted = (parseFloat(amount) - fee) * rd.rate;

    transferData = { amount, country, recipient, name, purpose, rd, fee, converted };
    buildReview(transferData);
  }

  if (step === 3) {
    simulateProcessing();
  }

  document.getElementById(`step${currentStep}`).classList.add('hidden');
  document.getElementById(`step${step}`).classList.remove('hidden');
  currentStep = step;
  updateStepIndicator(step);
}

function buildReview({ amount, country, name, recipient, purpose, rd, fee, converted }) {
  const box = document.getElementById('reviewBox');
  box.innerHTML = `
    <div class="review-row"><span class="label">You Send</span><span class="value">$${parseFloat(amount).toFixed(2)} USD</span></div>
    <div class="review-row"><span class="label">Recipient</span><span class="value">${name}</span></div>
    <div class="review-row"><span class="label">Destination</span><span class="value">${rd.flag} ${rd.name}</span></div>
    <div class="review-row"><span class="label">Recipient Address</span><span class="value" style="font-family:monospace;font-size:12px">${recipient.length > 20 ? recipient.slice(0,20)+'...' : recipient}</span></div>
    <div class="review-row"><span class="label">Exchange Rate</span><span class="value">1 USD = ${rd.cur}${rd.rate}</span></div>
    <div class="review-row"><span class="label">BlockPay Fee (0.09%)</span><span class="value fee-green">$${fee.toFixed(4)}</span></div>
    <div class="review-row"><span class="label">Gas Estimate</span><span class="value">~$0.80</span></div>
    <div class="review-row" style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px;font-weight:700;font-size:15px">
      <span class="label">Recipient Gets</span>
      <span class="value">${rd.cur}${converted.toFixed(2)} ${rd.label}</span>
    </div>
    <div class="review-row"><span class="label">Purpose</span><span class="value" style="text-transform:capitalize">${purpose}</span></div>
    <div class="review-row"><span class="label">Settlement Time</span><span class="value fee-green">~2 seconds</span></div>
  `;
}

function simulateProcessing() {
  const steps = ['ps1', 'ps2', 'ps3', 'ps4', 'ps5'];
  const delays = [0, 800, 1800, 2800, 4000];

  steps.forEach((id, i) => {
    document.getElementById(id)?.classList.add('pending');
  });

  steps.forEach((id, i) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('pending');
    }, delays[i]);
  });

  // Show success
  setTimeout(() => {
    document.querySelector('.hex-spinner').style.display = 'none';
    document.querySelector('.process-steps').style.display = 'none';
    document.getElementById('successState').classList.remove('hidden');
    document.getElementById('txHashDisplay').textContent =
      '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6);
  }, 5500);
}

function updateStepIndicator(step) {
  for (let i = 1; i <= 3; i++) {
    const el = document.querySelector(`[data-step="${i}"]`);
    if (!el) continue;
    el.classList.remove('active', 'complete');
    if (i < step) el.classList.add('complete');
    if (i === step) el.classList.add('active');
  }
}

// Live rate updates
document.addEventListener('DOMContentLoaded', () => {
  const amountInput = document.getElementById('sendAmount');
  const countrySelect = document.getElementById('destCountry');

  function updateRateCard() {
    const amount = parseFloat(amountInput?.value) || 0;
    const country = countrySelect?.value;
    const rd = RATES[country];

    const rbSend = document.getElementById('rb-send');
    const rbRate = document.getElementById('rb-rate');
    const rbFee = document.getElementById('rb-fee');
    const rbGets = document.getElementById('rb-gets');

    if (amount > 0 && rd) {
      const fee = amount * 0.0009;
      const converted = (amount - fee) * rd.rate;
      if (rbSend) rbSend.textContent = `$${amount.toFixed(2)} USD`;
      if (rbRate) rbRate.textContent = `1 USD = ${rd.cur}${rd.rate}`;
      if (rbFee) rbFee.textContent = `$${fee.toFixed(4)}`;
      if (rbGets) rbGets.textContent = `${rd.cur}${converted.toFixed(2)} ${rd.label}`;
    }
  }

  amountInput?.addEventListener('input', updateRateCard);
  countrySelect?.addEventListener('change', updateRateCard);
});
