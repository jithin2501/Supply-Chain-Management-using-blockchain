import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingBag, Package, Wallet, LogOut, CheckCircle2, 
  ArrowRight, Link as LinkIcon, Clock, AlertCircle, RefreshCw,
  ShieldCheck, Database, CheckCircle, Search, Filter,
  ShoppingCart, Factory, ArrowLeft, Users, Tag, Eye, X, Trash2,
  MapPin, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

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

export default function CustomerProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrice, setFilterPrice] = useState('all');
  const [account, setAccount] = useState(null);
  const [txStatus, setTxStatus] = useState(null);
  const [txStep, setTxStep] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [lastTx, setLastTx] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const steps = [
    { title: "Connecting MetaMask", icon: Wallet },
    { title: "Waiting for Signature", icon: ShieldCheck },
    { title: "Mining Transaction", icon: Database },
    { title: "Finalizing Purchase", icon: CheckCircle2 }
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

  // Function to get Google Maps URL
  const getGoogleMapsUrl = (lat, lng, address) => {
    return `https://www.google.com/maps?q=${lat},${lng}&hl=en`;
  };

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

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/products/available`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      // Debug: Log the products data
      console.log('📦 Products data received:', data);
      if (Array.isArray(data)) {
        data.forEach((product, index) => {
          console.log(`   Product ${index + 1}: ${product.name}, Image: ${product.image}, Has Image: ${!!product.image}`);
        });
      }
      
      // Get manufactured products (products with manufacturerId)
      const manufacturedProducts = Array.isArray(data) 
        ? data.filter(product => product.manufacturerId || product.manufacturerName) 
        : [];
      
      console.log(`✅ Found ${manufacturedProducts.length} manufactured products`);
      setProducts(manufacturedProducts);
      
    } catch (err) {
      console.error('❌ Error loading products:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPurchases = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/customer/purchases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPurchases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading purchases:', err);
    }
  }, [token]);

  // Delete a purchase from history
  const handleDeletePurchase = async (purchaseId) => {
    if (!window.confirm("Are you sure you want to delete this purchase from your history?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/customer/purchases/${purchaseId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        // Remove from local state
        setPurchases(purchases.filter(p => p._id !== purchaseId));
        alert("Purchase deleted successfully");
      } else {
        const data = await response.json();
        alert(data.message || "Failed to delete purchase");
      }
    } catch (err) {
      console.error("Error deleting purchase:", err);
      alert("Error deleting purchase");
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchPurchases();
  }, [fetchProducts, fetchPurchases]);

  const openPurchaseModal = (product) => {
    if (!account) {
      alert("Please connect your MetaMask wallet first!");
      return;
    }
    setSelectedProduct(product);
    setPurchaseQuantity(1);
    setShowPurchaseModal(true);
  };

  const handleBuyProduct = async () => {
    if (!account || !selectedProduct) {
      alert("Please connect your MetaMask wallet first!");
      return;
    }

    const quantityToBuy = parseInt(purchaseQuantity);
    if (quantityToBuy <= 0 || quantityToBuy > selectedProduct.quantity) {
      alert(`Invalid quantity. Please select between 1 and ${selectedProduct.quantity} units.`);
      return;
    }

    setSelectedProduct(selectedProduct);
    setTxStatus('processing');
    setTxStep(0);
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

      const transactionParameters = {
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Replace with manufacturer's wallet
        from: currentAccount,
        value: '0x' + weiAmount.toString(16),
        gas: '0x5208', // 21000 gas for simple transfer
      };

      console.log('📤 Sending transaction:', transactionParameters);

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
      const maxAttempts = 60;
      
      while (!receipt && attempts < maxAttempts) {
        try {
          receipt = await window.ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          });
          
          if (receipt) {
            console.log('✅ Transaction mined!', receipt);
            
            if (receipt.status === '0x0') {
              throw new Error('Transaction failed on blockchain');
            }
            break;
          }
          
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
      }

      setTxStep(4);
      const response = await fetch(`${API_URL}/products/buy-final`, {
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
        throw new Error(errorData.message || "Purchase failed");
      }

      const data = await response.json();

      setLastTx({
        ...data.transaction,
        txHash: txHash
      });
      setTxStatus('success');
      
      // Refresh data
      fetchProducts();
      fetchPurchases();
      
    } catch (err) {
      console.error("❌ Blockchain Error:", err);
      
      let errorMessage = "Transaction failed";
      
      if (err.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (err.code === -32603) {
        errorMessage = "Insufficient funds for transaction";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      alert(`❌ ${errorMessage}`);
      setTxStatus(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(`wallet_${user._id}`);
    window.location.href = '/login';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (product.company && product.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesPrice = true;
    if (filterPrice === 'under50') {
      matchesPrice = product.price < 50;
    } else if (filterPrice === '50to100') {
      matchesPrice = product.price >= 50 && product.price <= 100;
    } else if (filterPrice === 'over100') {
      matchesPrice = product.price > 100;
    }
    
    return matchesSearch && matchesPrice;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="w-full bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/main')} 
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">Back to Main</span>
              </button>
              <div className="flex items-center space-x-2">
                <ShoppingBag className="text-blue-600" size={28} />
                <span className="text-xl font-bold text-gray-900">Products Marketplace</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="hidden md:flex items-center space-x-3">
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-600 capitalize">{user.role}</div>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
              >
                <LogOut size={18} />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Blockchain-Verified Products</h2>
          <p className="text-gray-500">Purchase products with complete supply chain transparency</p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products by name, description, or manufacturer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={filterPrice}
                onChange={(e) => setFilterPrice(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Prices</option>
                <option value="under50">Under ₹50</option>
                <option value="50to100">₹50 - ₹100</option>
                <option value="over100">Over ₹100</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {filteredProducts.length} products found
              </span>
              
              {/* Connect Wallet Button */}
              <div className="flex items-center space-x-3">
                {!account ? (
                  <button
                    onClick={connectWallet}
                    disabled={isConnecting || !isMetaMaskInstalled}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Wallet Connected</div>
                      <div className="text-[10px] font-mono text-green-600 truncate max-w-[120px]">
                        {account.substring(0, 10)}...
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={switchAccount}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Switch Account"
                      >
                        <RefreshCw size={18} />
                      </button>
                      <button
                        onClick={disconnectWallet}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Disconnect Wallet"
                      >
                        <LogOut size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Informational messages */}
          {!isMetaMaskInstalled && (
            <div className="mt-4 flex items-center space-x-1 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle size={16} />
              <span>MetaMask not detected. Please install the extension to continue.</span>
            </div>
          )}
          
          {!account && isMetaMaskInstalled && (
            <div className="mt-4 flex items-center space-x-1 text-orange-600 text-sm bg-orange-50 p-3 rounded-lg">
              <AlertCircle size={16} />
              <span>Connect wallet to purchase products</span>
            </div>
          )}
          
          {account && (
            <div className="mt-4 flex items-center space-x-1 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
              <CheckCircle size={16} />
              <span>Wallet connected. You can now purchase products.</span>
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

        {/* Debug Button (Remove in production) */}
        <button
          onClick={() => fetchProducts()}
          className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
        >
          Debug: Refresh Products
        </button>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoaderCircle className="animate-spin text-blue-600" size={48} />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {filteredProducts.map(product => (
              <div key={product._id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                {/* Product Image */}
                <div className="relative h-56 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <Package className="text-gray-400 mb-2" size={48} />
                      <span className="text-gray-500 text-sm">No image available</span>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="p-6">
                  {/* Product Name */}
                  <h4 className="text-xl font-bold text-gray-900 mb-3">
                    {product.name}
                  </h4>

                  {/* Manufacturer Name */}
                  <div className="mb-4 pb-3 border-b border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Manufacturer</p>
                    <p className="text-base font-semibold text-gray-900">
                      {product.manufacturerName || product.company || "Manufacturer"}
                    </p>
                  </div>

                  {/* Location Display */}
                  {product.location && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <MapPin size={14} className="text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">Product Location</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{product.location.address.substring(0, 40)}...</p>
                      <a
                        href={getGoogleMapsUrl(product.location.lat, product.location.lng, product.location.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <Globe size={12} />
                        <span>View on Google Maps</span>
                      </a>
                    </div>
                  )}

                  {/* Price and Stock - Side by Side */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Price</p>
                      <p className="text-2xl font-bold text-gray-900">₹{product.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">In Stock</p>
                      <p className={`text-xl font-bold ${product.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.quantity}
                      </p>
                    </div>
                  </div>

                  {/* Buy Button */}
                  <button 
                    onClick={() => openPurchaseModal(product)}
                    disabled={!account || product.quantity === 0}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all ${
                      !account || product.quantity === 0 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <span>{!account ? 'Connect Wallet' : product.quantity === 0 ? 'Out of Stock' : 'Buy Now'}</span>
                    {account && product.quantity > 0 && <ArrowRight size={18} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center">
            <Factory className="mx-auto text-gray-300 mb-4" size={64} />
            <p className="text-gray-600 text-lg mb-2">No products available yet</p>
            <p className="text-gray-500 mb-6">Manufacturers are creating blockchain-verified products.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterPrice('all');
              }}
              className="mt-4 px-6 py-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Purchase History Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Your Purchase History</h3>
            <span className="text-sm text-gray-500">{purchases.length} purchases</span>
          </div>
          
          {purchases.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Product</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Manufacturer</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Qty</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {purchases.map(purchase => (
                      <tr key={purchase._id} className="hover:bg-blue-50/30 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{purchase.productName}</div>
                          {purchase.txHash && (
                            <a 
                              href={`https://etherscan.io/tx/${purchase.txHash}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center space-x-1 text-blue-600 hover:underline text-xs"
                            >
                              <LinkIcon size={10} />
                              <span>View on Blockchain</span>
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{purchase.sellerName}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{purchase.quantity}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">₹{purchase.amount}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end text-xs text-gray-400">
                            <Clock size={12} className="mr-1" />
                            {new Date(purchase.timestamp).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDeletePurchase(purchase._id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                            title="Delete purchase"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center">
              <ShoppingCart className="mx-auto text-gray-300 mb-4" size={64} />
              <p className="text-gray-600">No purchases yet. Buy your first product!</p>
              {!account && (
                <button
                  onClick={connectWallet}
                  className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                >
                  Connect Wallet to Start Buying
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[150] backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full relative">
            <button 
              onClick={() => setShowPurchaseModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-bold mb-6">Purchase Product</h3>
            
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-16 h-16 rounded-xl object-cover" />
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{selectedProduct.name}</h4>
                  <p className="text-sm text-gray-600">Manufacturer: {selectedProduct.manufacturerName || selectedProduct.company}</p>
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
                    <span className="text-sm font-medium text-blue-700">Product Location</span>
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
                onClick={handleBuyProduct}
                disabled={!account}
                className={`w-full py-4 rounded-2xl font-bold transition ${!account ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
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

      {/* Image View Modal */}
      {viewImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4">
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setViewImage(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300"
            >
              <X size={24} />
            </button>
            <img 
              src={viewImage} 
              alt="Product full view"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="mt-2 text-center text-white text-sm">
              Click outside image to close
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
                  <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  <Wallet className="absolute inset-0 m-auto text-blue-600" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Processing Purchase</h3>
                <p className="text-gray-500 mb-8">Processing payment on the blockchain...</p>
                
                <div className="space-y-4">
                  {steps.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = txStep === (idx + 1);
                    const isDone = txStep > (idx + 1);
                    return (
                      <div key={idx} className={`flex items-center space-x-4 p-4 rounded-2xl transition-all ${isActive ? 'bg-blue-50 border border-blue-200 shadow-inner' : 'opacity-40'}`}>
                        <div className={`${isDone ? 'bg-green-500' : isActive ? 'bg-blue-600' : 'bg-gray-200'} p-2 rounded-lg transition-colors`}>
                          <Icon size={20} className={isDone || isActive ? 'text-white' : 'text-gray-500'} />
                        </div>
                        <span className={`font-semibold ${isActive ? 'text-blue-900' : 'text-gray-500'}`}>{step.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                  <CheckCircle size={48} />
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-2">Purchase Verified</h3>
                <p className="text-gray-500 mb-8">Your purchase of "{selectedProduct?.name}" has been recorded on the blockchain.</p>
                
                <div className="bg-gray-50 p-6 rounded-3xl text-left border border-gray-100 mb-8">
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">On-Chain Transaction Hash</p>
                    <p className="text-xs font-mono text-blue-600 break-all bg-white p-3 rounded-xl border">{lastTx?.txHash}</p>
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
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition"
                >
                  Return to Products
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}