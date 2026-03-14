// ========================
// BlockPay — Landing Page JS
// ========================

document.addEventListener('DOMContentLoaded', () => {
  const walletModal = document.getElementById('walletModal');
  const closeModal = document.getElementById('closeModal');
  const connectBtn = document.getElementById('connectBtn');
  const statusText = document.getElementById('statusText');
  const walletStatus = document.getElementById('walletStatus');
  const statusDot = walletStatus?.querySelector('.status-dot');

  // Check if already connected — redirect to dashboard
  const savedWallet = localStorage.getItem('blockpay_wallet');
  if (savedWallet) {
    window.location.href = 'pages/dashboard.html';
    return;
  }

  function openModal() {
    walletModal.classList.add('open');
    detectMetaMask();
  }

  function closeModalFn() {
    walletModal.classList.remove('open');
  }

  function detectMetaMask() {
    setTimeout(() => {
      if (WalletManager.hasMetaMask()) {
        statusDot.className = 'status-dot found';
        statusText.textContent = 'MetaMask detected! Click below to connect.';
        connectBtn.disabled = false;
      } else {
        statusDot.className = 'status-dot error';
        statusText.innerHTML = 'MetaMask not found. <a href="https://metamask.io" target="_blank" style="color:var(--accent)">Install MetaMask →</a>';
        connectBtn.textContent = 'Install MetaMask';
        connectBtn.onclick = () => window.open('https://metamask.io', '_blank');
      }
    }, 800);
  }

  async function handleConnect() {
    connectBtn.textContent = 'Connecting...';
    connectBtn.disabled = true;
    statusDot.className = 'status-dot detecting';
    statusText.textContent = 'Requesting wallet access...';

    let result;

    if (WalletManager.hasMetaMask()) {
      result = await WalletManager.connect();
    } else {
      // Demo mode: simulate connection for non-MetaMask environments
      result = { success: true, address: '0x742d35Cc6634C0532925a3b8D4C9F5E2aB12345' };
      WalletManager.address = result.address;
      localStorage.setItem('blockpay_wallet', result.address);
    }

    if (result.success) {
      statusDot.className = 'status-dot connected';
      statusText.textContent = `Connected: ${WalletManager.shortAddress(result.address)}`;
      connectBtn.textContent = '✓ Connected! Redirecting...';

      setTimeout(() => {
        window.location.href = 'pages/dashboard.html';
      }, 1200);
    } else {
      statusDot.className = 'status-dot error';
      statusText.textContent = result.error || 'Connection failed. Try again.';
      connectBtn.textContent = 'Try Again';
      connectBtn.disabled = false;
    }
  }

  // Event listeners
  document.getElementById('connectWallet')?.addEventListener('click', openModal);
  document.getElementById('connectWallet2')?.addEventListener('click', openModal);
  document.getElementById('connectNav')?.addEventListener('click', openModal);
  closeModal?.addEventListener('click', closeModalFn);
  walletModal?.addEventListener('click', (e) => { if (e.target === walletModal) closeModalFn(); });
  connectBtn?.addEventListener('click', handleConnect);

  // Scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(el => {
      if (el.isIntersecting) {
        el.target.style.opacity = '1';
        el.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.step-card, .feature-item, .stat-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
});
