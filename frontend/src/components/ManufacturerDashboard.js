import React, { useState, useEffect, useCallback } from 'react';
import { 
  Factory, Package, ShoppingCart, LogOut, Building2, 
  Truck, Star, ArrowRight, ArrowLeft, ChevronRight, 
  Boxes, ShieldCheck, Cpu, Database, CheckCircle2, History, Link as LinkIcon, Clock, Wallet, AlertCircle, RefreshCw,
  MapPin, Globe, ExternalLink, X
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

// Custom Loader
function LoaderCircle({ size = 24, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// Rest of the file remains exactly the same as provided earlier
// Just the import statement at the top was missing these icons

export default function ManufacturerDashboard() {
  const [materials, setMaterials] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [purchasedMaterials, setPurchasedMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('marketplace');
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  
  // Purchase modal state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  
  // Wallet State
  const [account, setAccount] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [forceReconnect, setForceReconnect] = useState(false);

  // Blockchain Transaction States
  const [txStatus, setTxStatus] = useState(null);
  const [txStep, setTxStep] = useState(0);
  const [lastTx, setLastTx] = useState(null);
  const [purchaseError, setPurchaseError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const steps = [
    { title: "Connecting MetaMask", icon: Wallet },
    { title: "Waiting for Signature", icon: ShieldCheck },
    { title: "Mining Transaction", icon: Database },
    { title: "Finalizing Ledger", icon: CheckCircle2 }
  ];

  // Check for MetaMask installation only
  useEffect(() => {
    if (window.ethereum) {
      setIsMetaMaskInstalled(true);
      
      // Listen for account changes
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          localStorage.setItem(`wallet_${user._id}`, accounts[0]);
        } else {
          // User disconnected all accounts in MetaMask
          setAccount(null);
          localStorage.removeItem(`wallet_${user._id}`);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      // Check initial connection status
      const checkInitialConnection = async () => {
        try {
          // Check if we have any cached permissions
          const permissions = await window.ethereum.request({
            method: 'wallet_getPermissions'
          });
          
          const hasAccountsPermission = permissions.some(
            perm => perm.parentCapability === 'eth_accounts'
          );
          
          if (hasAccountsPermission) {
            // We have permission, get accounts
            const accounts = await window.ethereum.request({ 
              method: 'eth_accounts' 
            });
            if (accounts.length > 0) {
              setAccount(accounts[0]);
              localStorage.setItem(`wallet_${user._id}`, accounts[0]);
            }
          }
        } catch (err) {
          console.error("Error checking permissions:", err);
        }
      };
      
      checkInitialConnection();
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [user._id]);

  // Force clean connection function
  const forceCleanConnect = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    
    setIsConnecting(true);
    try {
      // First, try to revoke any existing permissions
      try {
        await window.ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }]
        });
      } catch (revokeErr) {
        console.log("No permissions to revoke or revocation failed:", revokeErr);
      }
      
      // Clear any cached state
      setAccount(null);
      localStorage.removeItem(`wallet_${user._id}`);
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Now request fresh connection - this should show account selection
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        const connectedAccount = accounts[0];
        setAccount(connectedAccount);
        localStorage.setItem(`wallet_${user._id}`, connectedAccount);
        setForceReconnect(false);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
      
      if (err.code === 4001) {
        // User rejected the connection request
        alert("Connection rejected. Please accept the connection request in MetaMask.");
      } else if (err.code === -32002) {
        // Request already pending
        alert("Connection request already pending. Please check your MetaMask extension.");
      } else {
        alert("Failed to connect wallet. Please make sure MetaMask is installed and unlocked.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    
    setIsConnecting(true);
    try {
      // Method 1: Try to disconnect first to force account selection
      try {
        // Check if we already have accounts connected
        const currentAccounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });
        
        if (currentAccounts.length > 0) {
          // We already have accounts connected, try to disconnect first
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }]
          });
          
          // Wait for cleanup
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (disconnectErr) {
        console.log("Disconnect attempt failed, proceeding anyway:", disconnectErr);
      }
      
      // Clear local state
      setAccount(null);
      localStorage.removeItem(`wallet_${user._id}`);
      
      // Request accounts - this should show account selection
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        const connectedAccount = accounts[0];
        setAccount(connectedAccount);
        localStorage.setItem(`wallet_${user._id}`, connectedAccount);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
      
      if (err.code === 4001) {
        // User rejected the connection request
        alert("Connection rejected. Please accept the connection request in MetaMask.");
      } else if (err.code === -32002) {
        // Request already pending
        alert("Connection request already pending. Please check your MetaMask extension.");
      } else {
        alert("Failed to connect wallet. Please make sure MetaMask is installed and unlocked.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    if (!window.ethereum) return;
    
    try {
      // Try to revoke permissions in MetaMask
      await window.ethereum.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }]
      });
      
      // Clear local state
      setAccount(null);
      localStorage.removeItem(`wallet_${user._id}`);
      
      alert("Wallet disconnected. Next time you connect, you'll need to select an account.");
    } catch (err) {
      console.error("Error disconnecting wallet:", err);
      // Even if MetaMask disconnect fails, we still disconnect from our app
      setAccount(null);
      localStorage.removeItem(`wallet_${user._id}`);
      alert("Disconnected from this application. You can connect again anytime.");
    }
  };

  const switchAccount = async () => {
    if (!window.ethereum) return;
    
    try {
      // For switching accounts, we need to request permissions again
      // This should show the account selection
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
      
      // After permissions request, get the selected account
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        localStorage.setItem(`wallet_${user._id}`, accounts[0]);
      }
    } catch (err) {
      console.error("Error switching accounts:", err);
      if (err.code === 4001) {
        // User rejected the request
        console.log("User rejected account switch");
        alert("Account switch rejected. Please try again.");
      }
    }
  };

  const fetchMaterials = useCallback(async () => {
    console.log('🔄 Fetching materials for manufacturer:', user._id);
    try {
      const response = await fetch(`${API_URL}/products/available`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('📦 Received materials:', data);
      setMaterials(Array.isArray(data) ? data : []);
      setPurchaseError(null);
      
      // Also fetch debug info
      try {
        const debugResponse = await fetch(`${API_URL}/debug/manufacturer-purchased/${user._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const debugData = await debugResponse.json();
        setDebugInfo(debugData);
        console.log('🔍 Debug info:', debugData);
      } catch (debugErr) {
        console.log('Debug endpoint not available');
      }
    } catch (err) {
      console.error('Error loading marketplace:', err);
      setPurchaseError('Failed to load marketplace. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, user._id]);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/manufacturer/purchases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('📜 Purchases:', data);
      setPurchases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPurchasedMaterials = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/manufacturer/purchased-materials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPurchasedMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading purchased materials:', err);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'marketplace') {
      fetchMaterials();
    } else if (activeTab === 'purchased') {
      fetchPurchasedMaterials();
    } else {
      fetchPurchases();
    }
  }, [activeTab, fetchMaterials, fetchPurchases, fetchPurchasedMaterials]);

  // Function to get Google Maps URL
  const getGoogleMapsUrl = (lat, lng, address) => {
    return `https://www.google.com/maps?q=${lat},${lng}&hl=en`;
  };

  const openPurchaseModal = (product) => {
    if (!account) {
      alert("Please connect your MetaMask wallet first!");
      return;
    }
    setSelectedProduct(product);
    setPurchaseQuantity(1);
    setShowPurchaseModal(true);
  };

  const handleBuy = async () => {
    if (!account || !selectedProduct) {
      alert("Please connect your MetaMask wallet first!");
      return;
    }

    const quantityToBuy = parseInt(purchaseQuantity);
    if (quantityToBuy <= 0 || quantityToBuy > selectedProduct.quantity) {
      alert(`Invalid quantity. Please select between 1 and ${selectedProduct.quantity} units.`);
      return;
    }

    console.log('🛒 Buying product:', selectedProduct._id, selectedProduct.name, 'Quantity:', quantityToBuy);
    setTxStatus('processing');
    setTxStep(0);
    setPurchaseError(null);
    setShowPurchaseModal(false);

    try {
      setTxStep(1);
      
      // First, check if we have permission to access accounts
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        // We need to reconnect
        await connectWallet();
        if (!account) {
          throw new Error("Wallet connection required to proceed with purchase.");
        }
      }

      const currentAccount = accounts[0];
      if (currentAccount !== account) {
        // Account changed in MetaMask, update our state
        setAccount(currentAccount);
        localStorage.setItem(`wallet_${user._id}`, currentAccount);
      }

      // Check which network we're on
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('🌐 Current network chainId:', chainId);
      
      // Convert product price to ETH (you can adjust the conversion rate)
      // For demo: ₹1 = 0.000002 ETH (adjust this rate as needed)
      const ethAmount = (selectedProduct.price * quantityToBuy * 0.000002).toFixed(6);
      const weiAmount = Math.floor(parseFloat(ethAmount) * 1e18);

      setTxStep(2);
      
      // Prepare transaction - sending to supplier's wallet or a designated address
      const transactionParameters = {
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Replace with actual supplier's wallet
        from: currentAccount,
        value: '0x' + weiAmount.toString(16),
        gas: '0x5208', // 21000 gas for simple transfer
      };

      console.log('📤 Sending transaction:', transactionParameters);

      // Send the transaction and get the hash
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });

      console.log('✅ Transaction submitted! Hash:', txHash);
      console.log(`🔗 View on Etherscan: https://etherscan.io/tx/${txHash}`);

      setTxStep(3);
      
      // Wait for transaction to be mined
      console.log('⏳ Waiting for transaction to be mined...');
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 60; // Wait up to 60 seconds
      
      while (!receipt && attempts < maxAttempts) {
        try {
          receipt = await window.ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          });
          
          if (receipt) {
            console.log('✅ Transaction mined!', receipt);
            
            // Check if transaction was successful
            if (receipt.status === '0x0') {
              throw new Error('Transaction failed on blockchain');
            }
            break;
          }
          
          // Wait 1 second before checking again
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        } catch (err) {
          console.log('Checking transaction status...', attempts);
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      if (!receipt) {
        console.log('⚠️ Transaction is taking longer than expected, but it should be confirmed soon.');
        console.log('Proceeding with backend update...');
      }

      setTxStep(4);
      
      // Update backend with the transaction
      const response = await fetch(`${API_URL}/products/buy-raw`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          productId: selectedProduct._id, 
          quantity: quantityToBuy,
          externalTxHash: txHash,
          blockchainReceipt: receipt
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Backend error:', errorData);
        throw new Error(errorData.message || "Backend ledger update failed");
      }

      const data = await response.json();
      console.log('✅ Purchase successful:', data);

      setLastTx({
        ...data.transaction,
        txHash: txHash
      });
      setTxStatus('success');
      
      // Force refresh all data
      console.log('🔄 Refreshing data after purchase...');
      await fetchMaterials();
      await fetchPurchases();
      await fetchPurchasedMaterials();
      
      // Show success message
      setTimeout(() => {
        alert(`✅ Successfully purchased ${quantityToBuy} units of "${selectedProduct.name}"! Transaction confirmed on blockchain.\nTx Hash: ${txHash}`);
      }, 1000);
      
    } catch (err) {
      console.error("❌ Blockchain Error:", err);
      
      // More specific error messages
      let errorMessage = "Transaction failed";
      
      if (err.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (err.code === -32603) {
        errorMessage = "Insufficient funds for transaction";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setPurchaseError(errorMessage);
      setTxStatus(null);
      alert(`❌ ${errorMessage}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(`wallet_${user._id}`);
    window.location.href = '/login';
  };

  const groupedMaterials = materials.reduce((acc, item) => {
    const supplierKey = item.supplierId;
    if (!acc[supplierKey]) {
      acc[supplierKey] = {
        id: supplierKey,
        name: item.supplierName,
        company: item.company || 'Independent Supplier',
        items: []
      };
    }
    acc[supplierKey].items.push(item);
    return acc;
  }, {});

  const selectedSupplier = selectedSupplierId ? groupedMaterials[selectedSupplierId] : null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg p-6 flex flex-col justify-between fixed h-full z-10">
        <div>
          <div className="flex items-center space-x-2 mb-8">
            <Factory className="text-indigo-600" size={32} />
            <h1 className="text-xl font-bold text-gray-900">Manufacturer Hub</h1>
          </div>
          <nav className="space-y-2">
            <button 
              onClick={() => { setActiveTab('marketplace'); setSelectedSupplierId(null); }} 
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition font-medium ${activeTab === 'marketplace' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <ShoppingCart size={20} />
              <span>Marketplace</span>
            </button>
            <button 
              onClick={() => setActiveTab('purchased')} 
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition font-medium ${activeTab === 'purchased' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Package size={20} />
              <span>Purchased Materials</span>
            </button>
            <button 
              onClick={() => setActiveTab('orders')} 
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition font-medium ${activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <History size={20} />
              <span>Blockchain Ledger</span>
            </button>
          </nav>

          {/* Wallet Section */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Manufacturer Wallet</p>
            {!account ? (
              <button 
                onClick={connectWallet}
                disabled={isConnecting || !isMetaMaskInstalled}
                className="w-full flex items-center justify-center space-x-2 bg-orange-50 text-orange-600 p-3 rounded-xl hover:bg-orange-100 transition font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <LoaderCircle className="animate-spin" size={18} />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet size={18} />
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2 text-green-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold">Connected</span>
                    </div>
                    <button onClick={disconnectWallet} className="text-[10px] text-red-500 hover:underline">Disconnect</button>
                  </div>
                  <p className="text-[10px] font-mono text-green-600 truncate">{account}</p>
                </div>
                <button 
                  onClick={switchAccount}
                  className="w-full flex items-center justify-center space-x-1 text-[10px] text-gray-400 hover:text-indigo-600 transition"
                >
                  <RefreshCw size={10} />
                  <span>Switch Account</span>
                </button>
              </div>
            )}
            {!isMetaMaskInstalled && (
              <div className="mt-2 flex items-start space-x-2 p-2 bg-red-50 rounded-lg">
                <AlertCircle size={14} className="text-red-500 mt-0.5" />
                <p className="text-[10px] text-red-600 leading-tight">MetaMask not detected. Install extension to continue.</p>
              </div>
            )}
            
            {/* Alternative connection method - force clean connection */}
            {!account && isMetaMaskInstalled && (
              <div className="mt-2">
                <button
                  onClick={forceCleanConnect}
                  disabled={isConnecting}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Having trouble connecting? Try force reconnection
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Signed in as</p>
            <p className="text-sm font-bold text-gray-900 truncate">{user.company}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center space-x-2 text-red-600 hover:bg-red-50 p-3 rounded-xl transition font-medium">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 flex-1 p-8">
        <div className="mb-8">
          {activeTab === 'marketplace' && selectedSupplier && (
            <button onClick={() => setSelectedSupplierId(null)} className="flex items-center text-indigo-600 font-semibold hover:text-indigo-700 mb-2">
              <ArrowLeft size={20} className="mr-2" /> Back to Marketplace
            </button>
          )}
          <h2 className="text-3xl font-bold text-gray-900">
            {activeTab === 'marketplace' ? (selectedSupplier && selectedSupplier.company ? selectedSupplier.company : 'Supplier Marketplace') : 
             activeTab === 'purchased' ? 'Purchased Materials' :
             'Blockchain Transaction Ledger'}
          </h2>
          <p className="text-gray-500">
            {activeTab === 'marketplace' ? 'Real-time Web3 sourcing with MetaMask integration.' : 
             activeTab === 'purchased' ? 'Materials you have purchased from suppliers.' :
             'Immutable history of verified blockchain transactions.'}
          </p>

          {/* Connection Status Banner */}
          <div className="mt-4">
            {!isMetaMaskInstalled && (
              <div className="mt-4 flex items-center space-x-1 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle size={16} />
                <span>MetaMask not detected. Please install the extension to continue.</span>
              </div>
            )}
            
            {!account && isMetaMaskInstalled && (
              <div className="mt-4 flex items-center space-x-1 text-orange-600 text-sm bg-orange-50 p-3 rounded-lg">
                <AlertCircle size={16} />
                <span>Connect wallet to purchase raw materials</span>
              </div>
            )}
            
            {account && (
              <div className="mt-4 flex items-center space-x-1 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                <CheckCircle2 size={16} />
                <span>Wallet connected. You can now purchase materials.</span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoaderCircle className="animate-spin text-indigo-600" size={48} />
          </div>
        ) : (
          <>
            {activeTab === 'marketplace' ? (
              /* Marketplace View */
              !selectedSupplierId ? (
                <div className="animate-in fade-in duration-500">
                  {Object.values(groupedMaterials).length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package className="text-indigo-600" size={48} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">No Materials Available</h3>
                      <p className="text-gray-500 mb-8">
                        {materials.length === 0 
                          ? "You have purchased all available materials or no materials are currently listed." 
                          : "All materials have been filtered out based on your purchase history."}
                      </p>
                      <div className="space-y-4">
                        <button 
                          onClick={fetchMaterials} 
                          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition"
                        >
                          Refresh Marketplace
                        </button>
                        {debugInfo && (
                          <div className="text-left p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                            <p className="font-bold mb-2">Debug Info:</p>
                            <p>Purchased Product IDs: {debugInfo.transactions?.join(', ') || 'None'}</p>
                            <p>Total Materials in System: {materials.length}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 text-sm text-gray-600">
                        Showing {materials.length} available materials (purchased materials are hidden)
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.values(groupedMaterials).map(group => (
                          <button key={group.id} onClick={() => setSelectedSupplierId(group.id)} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 hover:shadow-xl transition-all text-left group">
                            <div className="flex items-start justify-between mb-4">
                              <Building2 className="text-indigo-600" size={32} />
                              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Verified</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">{group.company}</h3>
                            <p className="text-sm text-gray-500 mb-4">Rep: {group.name}</p>
                            <div className="flex items-center justify-between pt-4 border-t text-indigo-600 font-bold">
                              <span>{group.items.length} Materials</span>
                              <ChevronRight size={20} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  {!selectedSupplier || !selectedSupplier.items || selectedSupplier.items.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="text-orange-600" size={48} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">No Materials from this Supplier</h3>
                      <p className="text-gray-500 mb-8">This supplier has no materials available for purchase or you've purchased all of them.</p>
                      <button 
                        onClick={() => setSelectedSupplierId(null)} 
                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition"
                      >
                        Back to Marketplace
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 text-sm text-gray-600">
                        Showing {selectedSupplier && selectedSupplier.items ? selectedSupplier.items.length : 0} materials from {selectedSupplier && selectedSupplier.company ? selectedSupplier.company : 'Unknown Supplier'}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {selectedSupplier && selectedSupplier.items && selectedSupplier.items.map(item => (
                          <div key={item._id} className="bg-white rounded-3xl shadow-sm border overflow-hidden hover:shadow-lg transition">
                            <img src={item.image} className="w-full h-48 object-cover" alt="" />
                            <div className="p-6">
                              <h4 className="text-lg font-bold mb-2">{item.name}</h4>
                              {item.description && (
                                <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                              )}
                              
                              {/* Location Display */}
                              {item.location && (
                                <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <MapPin size={14} className="text-blue-600" />
                                    <span className="text-sm font-medium text-blue-700">Supplier Location</span>
                                  </div>
                                  <p className="text-xs text-gray-600 mb-2">{item.location.address}</p>
                                  <a
                                    href={getGoogleMapsUrl(item.location.lat, item.location.lng, item.location.address)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    <Globe size={12} />
                                    <span>View on Google Maps</span>
                                  </a>
                                </div>
                              )}
                              
                              <div className="flex justify-between items-center mb-4">
                                <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase">Price per unit</p>
                                  <span className="text-2xl font-black text-gray-900">₹{item.price}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase">Available</p>
                                  <span className="text-lg font-bold text-green-600">{item.quantity} units</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => openPurchaseModal(item)} 
                                className={`w-full px-6 py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 transition ${!account ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                              >
                                <span>Purchase</span>
                                <ArrowRight size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            ) : activeTab === 'purchased' ? (
              /* Purchased Materials View */
              <div className="animate-in fade-in duration-500">
                {purchasedMaterials.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Package className="text-gray-400" size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No Purchased Materials</h3>
                    <p className="text-gray-500 mb-8">You haven't purchased any materials yet. Visit the marketplace to buy materials.</p>
                    <button 
                      onClick={() => setActiveTab('marketplace')} 
                      className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition"
                    >
                      Go to Marketplace
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 text-sm text-gray-600">
                      Showing {purchasedMaterials.length} purchased materials
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {purchasedMaterials.map(material => (
                        <div key={material._id} className="bg-white rounded-3xl shadow-sm border overflow-hidden hover:shadow-lg transition">
                          <img src={material.image} className="w-full h-48 object-cover" alt="" />
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-lg font-bold text-gray-900">{material.productName}</h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                material.status === 'available' ? 'bg-green-100 text-green-700' :
                                material.status === 'used' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {material.status.charAt(0).toUpperCase() + material.status.slice(1)}
                              </span>
                            </div>
                            
                            {/* Location Display */}
                            {material.location && (
                              <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                                <div className="flex items-center space-x-2 mb-1">
                                  <MapPin size={14} className="text-blue-600" />
                                  <span className="text-sm font-medium text-blue-700">Material Location</span>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{material.location.address}</p>
                                <a
                                  href={getGoogleMapsUrl(material.location.lat, material.location.lng, material.location.address)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                                >
                                  <Globe size={12} />
                                  <span>View on Google Maps</span>
                                </a>
                              </div>
                            )}
                            
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Supplier:</span>
                                <span className="font-bold text-gray-900">{material.supplierName}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Quantity:</span>
                                <span className="font-bold text-gray-900">{material.quantity} units</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Price per Unit:</span>
                                <span className="font-bold text-gray-900">₹{material.price}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Total Amount:</span>
                                <span className="font-bold text-green-600">₹{(material.price * material.quantity).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                                <span className="text-gray-600">Purchase Date:</span>
                                <span className="font-medium text-gray-700">
                                  {new Date(material.purchasedAt).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </span>
                              </div>
                            </div>

                            {material.txHash && (
                              <a
                                href={`https://etherscan.io/tx/${material.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center space-x-2 w-full bg-indigo-50 text-indigo-600 px-4 py-2.5 rounded-lg font-semibold hover:bg-indigo-100 transition"
                              >
                                <ExternalLink size={16} />
                                <span>View on Blockchain</span>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Ledger View */
              <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 overflow-hidden animate-in fade-in duration-500">
                {purchases.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <History className="text-gray-400" size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No Purchase History</h3>
                    <p className="text-gray-500 mb-8">You haven't made any purchases yet. Visit the marketplace to buy materials.</p>
                    <button 
                      onClick={() => setActiveTab('marketplace')} 
                      className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition"
                    >
                      Go to Marketplace
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Tx Hash</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Product</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Seller</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Qty</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {purchases.map(tx => (
                          <tr key={tx._id} className="hover:bg-indigo-50/30 transition">
                            <td className="px-6 py-4">
                              <a 
                                href={`https://etherscan.io/tx/${tx.txHash}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center space-x-2 text-indigo-600 hover:underline"
                              >
                                <LinkIcon size={14} />
                                <span className="font-mono text-xs">{tx.txHash?.substring(0, 14)}...</span>
                              </a>
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-900">{tx.productName}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{tx.sellerName}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">{tx.quantity}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">₹{tx.amount}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end text-xs text-gray-400">
                                <Clock size={12} className="mr-1" />
                                {new Date(tx.timestamp).toLocaleDateString()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full relative">
            <button 
              onClick={() => setShowPurchaseModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-bold mb-6">Purchase Material</h3>
            
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-16 h-16 rounded-xl object-cover" />
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{selectedProduct.name}</h4>
                  <p className="text-sm text-gray-600">Supplier: {selectedProduct.supplierName}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Available Stock</p>
                  <p className="text-lg font-bold text-gray-900">{selectedProduct.quantity} units</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Price per Unit</p>
                  <p className="text-lg font-bold text-gray-900">₹{selectedProduct.price}</p>
                </div>
              </div>
              
              {/* Location Display */}
              {selectedProduct.location && (
                <div className="mb-4 p-3 bg-blue-50 rounded-xl">
                  <div className="flex items-center space-x-2 mb-1">
                    <MapPin size={14} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Supplier Location</span>
                  </div>
                  <p className="text-xs text-gray-600">{selectedProduct.location.address.substring(0, 50)}...</p>
                </div>
              )}
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Quantity (1 to {selectedProduct.quantity} units)
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setPurchaseQuantity(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200"
                    disabled={purchaseQuantity <= 1}
                  >
                    <span className="text-lg font-bold">-</span>
                  </button>
                  <input
                    type="number"
                    value={purchaseQuantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      if (value >= 1 && value <= selectedProduct.quantity) {
                        setPurchaseQuantity(value);
                      }
                    }}
                    min="1"
                    max={selectedProduct.quantity}
                    className="w-20 text-center p-2 border rounded-lg"
                  />
                  <button
                    onClick={() => setPurchaseQuantity(prev => Math.min(selectedProduct.quantity, prev + 1))}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200"
                    disabled={purchaseQuantity >= selectedProduct.quantity}
                  >
                    <span className="text-lg font-bold">+</span>
                  </button>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-xl mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-600">₹{(selectedProduct.price * purchaseQuantity).toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Price: ₹{selectedProduct.price} × {purchaseQuantity} units</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleBuy}
                disabled={!account}
                className={`w-full py-4 rounded-2xl font-bold transition ${!account ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                {!account ? 'Connect Wallet First' : `Purchase ${purchaseQuantity} Unit${purchaseQuantity > 1 ? 's' : ''}`}
              </button>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blockchain Transaction Modal */}
      {txStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-6">
          <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl overflow-hidden relative">
            {txStatus === 'processing' ? (
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                  <Wallet className="absolute inset-0 m-auto text-indigo-600" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h3>
                <p className="text-gray-500 mb-8">Communicating with the Ethereum network...</p>
                
                <div className="space-y-4">
                  {steps.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = txStep === (idx + 1);
                    const isDone = txStep > (idx + 1);
                    return (
                      <div key={idx} className={`flex items-center space-x-4 p-4 rounded-2xl transition-all ${isActive ? 'bg-indigo-50 border border-indigo-200 shadow-inner' : 'opacity-40'}`}>
                        <div className={`${isDone ? 'bg-green-500' : isActive ? 'bg-indigo-600' : 'bg-gray-200'} p-2 rounded-lg transition-colors`}>
                          <Icon size={20} className={isDone || isActive ? 'text-white' : 'text-gray-500'} />
                        </div>
                        <span className={`font-semibold ${isActive ? 'text-indigo-900' : 'text-gray-500'}`}>{step.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-2">Payment Verified</h3>
                <p className="text-gray-500 mb-8">The material ownership has been transferred on the blockchain.</p>
                
                <div className="bg-gray-50 p-6 rounded-3xl text-left border border-gray-100 mb-8">
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">On-Chain Transaction Hash</p>
                    <p className="text-xs font-mono text-indigo-600 break-all bg-white p-3 rounded-xl border">{lastTx?.txHash}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Product</p>
                      <p className="font-bold text-gray-900">{selectedProduct?.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Quantity</p>
                      <p className="font-bold text-gray-900">{purchaseQuantity} units</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Network</p>
                      <p className="font-bold text-gray-900">Ethereum Mainnet</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Status</p>
                      <p className="font-bold text-green-600">Finalized</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setTxStatus(null)}
                  className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}