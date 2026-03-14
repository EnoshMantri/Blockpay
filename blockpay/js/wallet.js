// ========================
// BlockPay — Wallet.js
// MetaMask Integration
// ========================

const WalletManager = {
  address: null,
  isConnected: false,

  // Check if MetaMask is installed
  hasMetaMask() {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
  },

  // Short address display
  shortAddress(addr) {
    return addr ? `${addr.slice(0,6)}...${addr.slice(-4)}` : '';
  },

  // Connect wallet
  async connect() {
    if (!this.hasMetaMask()) {
      return { success: false, error: 'MetaMask not installed' };
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        this.address = accounts[0];
        this.isConnected = true;
        localStorage.setItem('blockpay_wallet', this.address);
        this.updateUI();
        return { success: true, address: this.address };
      }
      return { success: false, error: 'No accounts found' };
    } catch (err) {
      if (err.code === 4001) {
        return { success: false, error: 'User rejected connection' };
      }
      return { success: false, error: err.message };
    }
  },

  // Disconnect
  disconnect() {
    this.address = null;
    this.isConnected = false;
    localStorage.removeItem('blockpay_wallet');
    window.location.href = this.isOnLanding() ? '#' : '../index.html';
    if (this.isOnLanding()) location.reload();
  },

  isOnLanding() {
    return !window.location.pathname.includes('/pages/');
  },

  // Restore from localStorage
  async restore() {
    const saved = localStorage.getItem('blockpay_wallet');
    if (saved && this.hasMetaMask()) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0 && accounts[0].toLowerCase() === saved.toLowerCase()) {
          this.address = accounts[0];
          this.isConnected = true;
          this.updateUI();
          return true;
        }
      } catch (_) {}
    }
    // If on dashboard page and no wallet — redirect
    if (!this.isOnLanding()) {
      const path = window.location.pathname;
      if (path.includes('/pages/')) {
        // For demo purposes, set a mock address if no MetaMask
        if (!this.hasMetaMask()) {
          this.address = '0x742d35Cc6634C0532925a3b8D4C9F5E2aB12345';
          this.isConnected = true;
          this.updateUI();
          return true;
        }
      }
    }
    return false;
  },

  // Update all wallet-related UI elements
  updateUI() {
    const walletAddress = document.getElementById('walletAddress');
    const userGreet = document.getElementById('userGreet');
    const disconnectBtn = document.getElementById('disconnectBtn');

    if (walletAddress && this.address) {
      walletAddress.textContent = this.shortAddress(this.address);
    }
    if (userGreet && this.address) {
      userGreet.textContent = this.shortAddress(this.address);
    }
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => this.disconnect());
    }
  },

  // Listen for account changes
  listenForChanges() {
    if (this.hasMetaMask()) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.address = accounts[0];
          localStorage.setItem('blockpay_wallet', this.address);
          this.updateUI();
        }
      });
      window.ethereum.on('chainChanged', () => location.reload());
    }
  }
};

// Initialize on all pages
document.addEventListener('DOMContentLoaded', async () => {
  await WalletManager.restore();
  WalletManager.listenForChanges();
});
