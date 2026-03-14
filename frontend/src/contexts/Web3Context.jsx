import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useToast } from './ToastContext';
import contractData from '../utils/contractData.json';

const Web3Context = createContext();

export function useWeb3() {
  return useContext(Web3Context);
}

export function Web3Provider({ children }) {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState({});
  const { toast } = useToast();

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const userSigner = await browserProvider.getSigner();
        const userAddress = await userSigner.getAddress();
        
        setProvider(browserProvider);
        setSigner(userSigner);
        setAddress(userAddress);

        // Load Contracts
        if (contractData) {
          const bpusd = new ethers.Contract(contractData.BPUSD.address, contractData.BPUSD.abi, userSigner);
          const compliance = new ethers.Contract(contractData.ComplianceRegistry.address, contractData.ComplianceRegistry.abi, userSigner);
          const engine = new ethers.Contract(contractData.SettlementEngine.address, contractData.SettlementEngine.abi, userSigner);
          
          setContracts({
            BPUSD: bpusd,
            ComplianceRegistry: compliance,
            SettlementEngine: engine
          });
        }

        toast('MetaMask Connected Successfully', 'success');
      } catch (error) {
        console.error("Wallet connection failed:", error);
        toast(error.message || 'Failed to connect MetaMask', 'error');
      }
    } else {
      toast('Please install MetaMask to use this Web3 feature', 'error');
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setSigner(null);
    setContracts({});
    toast('Wallet Disconnected', 'info');
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          connectWallet();
        } else {
          disconnectWallet();
        }
      });

      // When the user switches networks in MetaMask, refresh the provider
      window.ethereum.on('chainChanged', () => {
        // Re-initialize only if already connected
        if (window.ethereum.selectedAddress) {
          connectWallet();
          toast('Network changed — wallet refreshed!', 'info');
        }
      });
    }
  }, []);

  return (
    <Web3Context.Provider value={{ address, provider, signer, contracts, connectWallet, disconnectWallet }}>
      {children}
    </Web3Context.Provider>
  );
}
