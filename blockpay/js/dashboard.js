// ========================
// BlockPay — Dashboard JS
// ========================

const RATES = {
  IN: { rate: 83.5, cur: '₹', label: 'INR' },
  GB: { rate: 0.79, cur: '£', label: 'GBP' },
  DE: { rate: 0.92, cur: '€', label: 'EUR' },
  SG: { rate: 1.34, cur: 'S$', label: 'SGD' },
  AE: { rate: 3.67, cur: 'AED', label: 'AED' },
  CA: { rate: 1.36, cur: 'C$', label: 'CAD' },
  AU: { rate: 1.52, cur: 'A$', label: 'AUD' },
};

document.addEventListener('DOMContentLoaded', () => {
  const amountInput = document.getElementById('quickAmount');
  const countrySelect = document.getElementById('quickCountry');
  const ratePreview = document.getElementById('ratePreview');
  const rateVal = document.getElementById('rateVal');
  const recipientGets = document.getElementById('recipientGets');

  function updateRate() {
    const amount = parseFloat(amountInput?.value) || 0;
    const country = countrySelect?.value;
    const rateData = RATES[country];

    if (amount > 0 && rateData) {
      const fee = amount * 0.0009;
      const converted = (amount - fee) * rateData.rate;
      rateVal.textContent = `1 USD = ${rateData.cur}${rateData.rate}`;
      recipientGets.textContent = `${rateData.cur}${converted.toFixed(2)} ${rateData.label}`;
      ratePreview?.classList.add('visible');
    } else {
      ratePreview?.classList.remove('visible');
    }
  }

  amountInput?.addEventListener('input', updateRate);
  countrySelect?.addEventListener('change', updateRate);

  // Animate balance cards
  document.querySelectorAll('.balance-card').forEach((card, i) => {
    card.style.animationDelay = `${i * 0.08}s`;
  });
});
