import React, { useState, useEffect, useCallback } from 'react';
import { 
  Factory, Package, ShoppingCart, LogOut, Building2, 
  Truck, Star, ArrowRight, ArrowLeft, ChevronRight, 
  Boxes, ShieldCheck, Cpu, Database, CheckCircle2, History, Link as LinkIcon, Clock, Wallet, AlertCircle, RefreshCw,
  MapPin, Globe, ExternalLink, X, Plus, Minus
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

export default function ManufacturerDashboard() {
  const [materials, setMaterials] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [boughtMaterials, setBoughtMaterials] = useState([]);
  const [manufacturedProducts, setManufacturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('marketplace');
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  
  // Purchase modal state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  
  // Manufacture product modal state
  const [showManufactureModal, setShowManufactureModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [manufactureFormData, setManufactureFormData] = useState({
    name: '',
    description: '',
    quantity: '',
    price: ''
  });
  const [manufactureImage, setManufactureImage] = useState(null);
  
  // NEW: Combine materials modal state
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [selectedMaterialsForCombine, setSelectedMaterialsForCombine] = useState([]);
  const [combineFormData, setCombineFormData] = useState({
    name: '',
    description: '',
    quantity: '',
    price: ''
  });
  const [combineImage, setCombineImage] = useState(null);
  
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
        
        // ✅ SAVE WALLET TO BACKEND
        try {
          const response = await fetch(`${API_URL}/users/wallet`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ walletAddress: connectedAccount })
          });
          
          if (response.ok) {
            console.log('✅ Wallet saved to backend:', connectedAccount);
          } else {
            const error = await response.json();
            console.error('Failed to save wallet:', error);
          }
        } catch (saveErr) {
          console.error('Error saving wallet to backend:', saveErr);
        }
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

  const fetchBoughtMaterials = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/manufacturer/bought-materials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setBoughtMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading bought materials:', err);
    }
  }, [token]);

  const fetchManufacturedProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/manufacturer/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setManufacturedProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading manufactured products:', err);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'marketplace') {
      fetchMaterials();
    } else if (activeTab === 'bought') {
      fetchBoughtMaterials();
    } else if (activeTab === 'products') {
      fetchManufacturedProducts();
    } else {
      fetchPurchases();
    }
  }, [activeTab, fetchMaterials, fetchPurchases, fetchBoughtMaterials, fetchManufacturedProducts]);

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
        // eslint-disable-next-line no-undef
        value: '0x' + BigInt(weiAmount).toString(16),
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
      await fetchBoughtMaterials();
      
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

  const handleManufactureProduct = async (e) => {
    e.preventDefault();
    
    if (!manufactureImage) {
      alert('Please upload a product image');
      return;
    }
    
    if (!selectedMaterial) {
      alert('No material selected');
      return;
    }
    
    console.log('🔍 Debug - Starting manufacture product:');
    console.log('Selected material:', selectedMaterial);
    console.log('Form data:', manufactureFormData);
    console.log('Image file:', manufactureImage);
    
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('name', manufactureFormData.name);
      formData.append('description', manufactureFormData.description);
      formData.append('quantity', manufactureFormData.quantity);
      formData.append('price', manufactureFormData.price);
      formData.append('materialId', selectedMaterial._id);
      formData.append('image', manufactureImage);
      
      console.log('📤 Sending request to:', `${API_URL}/manufacturer/create-product`);
      console.log('FormData entries:');
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ', pair[1]);
      }
      
      const response = await fetch(`${API_URL}/manufacturer/create-product`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Backend error response:', error);
        throw new Error(error.message || 'Failed to create product');
      }
      
      const newProduct = await response.json();
      console.log('✅ Product manufactured successfully:', newProduct);
      
      alert(`✅ Successfully created "${manufactureFormData.name}"!`);
      
      // Reset form and close modal
      setShowManufactureModal(false);
      setManufactureFormData({ name: '', description: '', quantity: '', price: '' });
      setManufactureImage(null);
      setSelectedMaterial(null);
      
      // Refresh data
      await fetchBoughtMaterials();
      await fetchManufacturedProducts();
      
    } catch (err) {
      console.error('❌ Error manufacturing product:', err);
      console.error('❌ Full error object:', err);
      console.error('❌ Error message:', err.message);
      alert(`❌ ${err.message || 'Failed to create product'}`);
    } finally {
      setLoading(false);
    }
  };

  // UPDATED: Handle combining materials to create product
  const handleCombineMaterials = async (e) => {
    e.preventDefault();
    
    console.log('🔍 Debug - Starting combine materials process');
    
    if (selectedMaterialsForCombine.length < 2 || selectedMaterialsForCombine.length > 3) {
      alert('Please select 2-3 materials to combine');
      return;
    }
    
    if (!combineImage) {
      alert('Please upload a product image');
      return;
    }
    
    // Validate form data
    if (!combineFormData.name || !combineFormData.description || 
        !combineFormData.quantity || !combineFormData.price) {
      alert('Please fill in all product details');
      return;
    }

    console.log('🔍 Combine materials details:');
    console.log('Selected materials:', selectedMaterialsForCombine);
    console.log('Form data:', combineFormData);
    console.log('Image file:', combineImage);

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', combineFormData.name);
      formData.append('description', combineFormData.description);
      formData.append('quantity', combineFormData.quantity);
      formData.append('price', combineFormData.price);
      formData.append('materialIds', JSON.stringify(selectedMaterialsForCombine.map(m => m._id)));
      formData.append('image', combineImage);

      console.log('📤 Sending request to:', `${API_URL}/manufacturer/manufacture-combined`);
      console.log('FormData entries:');
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ', pair[1]);
      }

      const response = await fetch(`${API_URL}/manufacturer/manufacture-combined`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('❌ Backend error response:', responseData);
        console.error('❌ Status:', response.status);
        console.error('❌ Status text:', response.statusText);
        
        throw new Error(responseData.message || `Server error: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Combined product created:', responseData);

      alert(`✅ Successfully created "${combineFormData.name}" from ${selectedMaterialsForCombine.length} materials!`);
      
      // Reset and close modal
      setShowCombineModal(false);
      setSelectedMaterialsForCombine([]);
      setCombineFormData({ name: '', description: '', quantity: '', price: '' });
      setCombineImage(null);
      
      // Refresh data
      await fetchBoughtMaterials();
      await fetchManufacturedProducts();
      
    } catch (err) {
      console.error('❌ Error creating combined product:', err);
      console.error('❌ Error name:', err.name);
      console.error('❌ Error message:', err.message);
      console.error('❌ Error stack:', err.stack);
      
      alert(`❌ ${err.message || 'Failed to create combined product'}`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle material selection for combining
  const toggleMaterialSelection = (material) => {
    setSelectedMaterialsForCombine(prev => {
      const exists = prev.find(m => m._id === material._id);
      if (exists) {
        return prev.filter(m => m._id !== material._id);
      } else {
        if (prev.length >= 3) {
          alert('You can only combine up to 3 materials');
          return prev;
        }
        return [...prev, material];
      }
    });
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

  // Filter available materials for combining (only 'available' status)
  const availableMaterialsForCombine = boughtMaterials.filter(m => m.status === 'available');

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
              <span>Supplier Marketplace</span>
            </button>
            <button 
              onClick={() => setActiveTab('bought')} 
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition font-medium ${activeTab === 'bought' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Package size={20} />
              <span>Bought Materials</span>
            </button>
            <button 
              onClick={() => setActiveTab('products')} 
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition font-medium ${activeTab === 'products' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Boxes size={20} />
              <span>My Products</span>
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {activeTab === 'marketplace' ? (selectedSupplier && selectedSupplier.company ? selectedSupplier.company : 'Supplier Marketplace') : 
                 activeTab === 'bought' ? 'Bought Materials' :
                 activeTab === 'products' ? 'My Products' :
                 'Blockchain Transaction Ledger'}
              </h2>
              <p className="text-gray-500">
                {activeTab === 'marketplace' ? 'Real-time Web3 sourcing with MetaMask integration.' : 
                 activeTab === 'bought' ? 'Materials you have purchased from suppliers. Use these to manufacture new products.' :
                 activeTab === 'products' ? 'Products you have manufactured from raw materials.' :
                 'Immutable history of verified blockchain transactions.'}
              </p>
            </div>
            
            {/* Combine Materials Button */}
            {activeTab === 'bought' && availableMaterialsForCombine.length >= 2 && (
              <button
                onClick={() => setShowCombineModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg transition"
              >
                <Plus size={20} />
                <span>Combine Materials</span>
              </button>
            )}
          </div>

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
                      <p className="text-gray-500 mb-8">No materials are currently available in the marketplace.</p>
                      <div className="space-y-4">
                        <button 
                          onClick={fetchMaterials} 
                          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition"
                        >
                          Refresh Marketplace
                        </button>
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
                /* Supplier Detail View */
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  {selectedSupplier && selectedSupplier.items && selectedSupplier.items.length > 0 ? (
                    <>
                      <div className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-200">
                        <div className="flex items-center space-x-3">
                          <Building2 className="text-indigo-600" size={24} />
                          <div>
                            <p className="font-bold text-indigo-900">{selectedSupplier.company}</p>
                            <p className="text-sm text-indigo-600">Representative: {selectedSupplier.name}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4 text-sm text-gray-600">
                        Showing {selectedSupplier.items.length} materials from this supplier
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {selectedSupplier.items.map(material => (
                          <div key={material._id} className="bg-white rounded-3xl shadow-sm border overflow-hidden hover:shadow-xl transition group">
                            {material.image && (
                              <div className="h-48 overflow-hidden">
                                <img 
                                  src={material.image} 
                                  alt={material.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                />
                              </div>
                            )}
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="text-lg font-bold text-gray-900 flex-1">{material.name}</h4>
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ml-2">
                                  Verified
                                </span>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{material.description}</p>
                              
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
                                  <span className="text-gray-600">Available Quantity:</span>
                                  <span className="font-bold text-gray-900">{material.quantity} units</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Price per Unit:</span>
                                  <span className="font-bold text-green-600">₹{material.price}</span>
                                </div>
                              </div>
                              
                              <button
                                onClick={() => {
                                  setSelectedProduct(material);
                                  setPurchaseQuantity(1);
                                  setShowPurchaseModal(true);
                                }}
                                disabled={!account}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-2xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                              >
                                <ShoppingCart size={18} />
                                <span>Purchase Material</span>
                              </button>
                              
                              {!account && (
                                <p className="text-xs text-orange-600 text-center mt-2">
                                  Connect wallet to purchase
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package className="text-gray-400" size={48} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">No Materials Available</h3>
                      <p className="text-gray-500">This supplier currently has no materials listed.</p>
                    </div>
                  )}
                </div>
              )
            ) : activeTab === 'bought' ? (
              /* Purchased Materials View */
              <div className="animate-in fade-in duration-500">
                {boughtMaterials.length === 0 ? (
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
                      Showing {boughtMaterials.length} purchased materials
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {boughtMaterials.map(material => (
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

                            <div className="space-y-2">
                              {material.status === 'available' && (
                                <button
                                  onClick={() => {
                                    setSelectedMaterial(material);
                                    setShowManufactureModal(true);
                                  }}
                                  className="flex items-center justify-center space-x-2 w-full bg-green-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition"
                                >
                                  <Factory size={16} />
                                  <span>Create Product</span>
                                </button>
                              )}
                              
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
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : activeTab === 'products' ? (
              /* My Products */
              <div className="animate-in fade-in duration-500">
                {manufacturedProducts.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Boxes className="text-gray-400" size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No Products Yet</h3>
                    <p className="text-gray-500 mb-8">You haven't manufactured any products. Buy materials and create your first product!</p>
                    <button 
                      onClick={() => setActiveTab('bought')} 
                      className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition"
                    >
                      View Bought Materials
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 text-sm text-gray-600">
                      Showing {manufacturedProducts.length} manufactured products
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {manufacturedProducts.map(product => (
                        <div key={product._id} className="bg-white rounded-3xl shadow-sm border overflow-hidden hover:shadow-lg transition">
                          <img src={product.image} className="w-full h-48 object-cover" alt="" />
                          <div className="p-6">
                            <h4 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h4>
                            <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                            
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Quantity:</span>
                                <span className="font-bold text-gray-900">{product.quantity} {product.unit || 'units'}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Price:</span>
                                <span className="font-bold text-green-600">₹{product.price}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Status:</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  product.status === 'active' ? 'bg-green-100 text-green-700' :
                                  product.status === 'sold_out' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {product.status}
                                </span>
                              </div>
                              
                              {/* Display materials used in combination */}
                              {product.usedMaterials && product.usedMaterials.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <p className="text-xs font-bold text-gray-500 mb-2">Materials Used:</p>
                                  <div className="space-y-1">
                                    {product.usedMaterials.map((mat, idx) => (
                                      <div key={idx} className="text-xs text-gray-600 flex items-center space-x-1">
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                                        <span>{mat}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {product.txHash && (
                              <a
                                href={`https://etherscan.io/tx/${product.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 text-xs"
                              >
                                <ExternalLink size={12} />
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-4 text-left text-sm font-semibold text-gray-600">Product</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600">Quantity</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600">Amount</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600">Supplier</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600">Date</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-600">Tx Hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {purchases.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <History className="text-gray-300 mb-2" size={32} />
                              <p>No transactions yet</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        purchases.map(purchase => (
                          <tr key={purchase._id} className="hover:bg-gray-50 transition">
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                {purchase.productId?.image && (
                                  <img 
                                    src={purchase.productId.image} 
                                    className="w-10 h-10 rounded-lg object-cover" 
                                    alt="" 
                                  />
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">{purchase.productName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-gray-700">{purchase.quantity}</td>
                            <td className="p-4">
                              <p className="font-bold text-green-600">₹{purchase.amount.toFixed(2)}</p>
                            </td>
                            <td className="p-4 text-sm text-gray-700">{purchase.sellerName}</td>
                            <td className="p-4 text-sm text-gray-500">
                              {new Date(purchase.timestamp).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <a
                                href={`https://etherscan.io/tx/${purchase.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 text-sm"
                              >
                                <ExternalLink size={12} />
                                <span>View</span>
                              </a>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full relative max-h-[95vh] overflow-y-auto">
            <button 
              onClick={() => setShowPurchaseModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 bg-white rounded-full p-1"
            >
              <X size={20} />
            </button>
            
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-1">Purchase Material</h3>
              <p className="text-sm text-gray-600">Confirm your purchase details</p>
            </div>

            {selectedProduct.image && (
              <div className="mb-4 h-40 rounded-2xl overflow-hidden">
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Product:</span>
                <span className="font-bold text-right ml-2">{selectedProduct.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Supplier:</span>
                <span className="font-bold">{selectedProduct.supplierName || selectedProduct.company}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Price per Unit:</span>
                <span className="font-bold text-green-600">₹{selectedProduct.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available:</span>
                <span className="font-bold">{selectedProduct.quantity} units</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity to Purchase</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition"
                >
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(Math.max(1, Math.min(selectedProduct.quantity, parseInt(e.target.value) || 1)))}
                  min="1"
                  max={selectedProduct.quantity}
                  className="flex-1 text-center text-xl font-bold py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                />
                <button
                  onClick={() => setPurchaseQuantity(Math.min(selectedProduct.quantity, purchaseQuantity + 1))}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-2xl p-3 mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-gray-900">Total Amount:</span>
                <span className="text-xl font-bold text-indigo-600">₹{(selectedProduct.price * purchaseQuantity).toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500">≈ {(selectedProduct.price * purchaseQuantity * 0.000002).toFixed(6)} ETH (for demo)</p>
            </div>

            <button
              onClick={handleBuy}
              disabled={!account}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-2xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {account ? '🔐 Confirm & Pay with MetaMask' : '⚠️ Connect Wallet First'}
            </button>
          </div>
        </div>
      )}

      {/* Transaction Status Modal */}
      {txStatus && txStatus !== 'idle' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-md">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full relative">
            {txStatus === 'success' ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="text-green-600" size={48} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Purchase Successful!</h3>
                  <p className="text-gray-600">Your transaction has been confirmed on the blockchain</p>
                </div>

                {lastTx && (
                  <div className="space-y-3 mb-6 bg-gray-50 rounded-2xl p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Product:</span>
                      <span className="font-bold">{lastTx.productName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-bold">{lastTx.quantity} units</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-bold text-green-600">₹{lastTx.totalAmount}</span>
                    </div>
                    {lastTx.txHash && (
                      <div className="pt-3 border-t">
                        <p className="text-xs text-gray-500 mb-1">Transaction Hash:</p>
                        <p className="text-xs font-mono bg-white p-2 rounded break-all">{lastTx.txHash}</p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    setTxStatus(null);
                    setLastTx(null);
                  }}
                  className="w-full bg-green-600 text-white py-3 rounded-2xl font-bold hover:bg-green-700 transition"
                >
                  Continue Shopping
                </button>
              </>
            ) : txStatus === 'error' ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="text-red-600" size={48} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Transaction Failed</h3>
                  <p className="text-gray-600">There was an issue processing your transaction</p>
                </div>

                {purchaseError && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                    <p className="text-sm text-red-700">{purchaseError}</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setTxStatus(null);
                    setPurchaseError(null);
                  }}
                  className="w-full bg-red-600 text-white py-3 rounded-2xl font-bold hover:bg-red-700 transition"
                >
                  Try Again
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                    <Wallet className="text-indigo-600 animate-pulse" size={48} />
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Processing Transaction</h3>
                  <p className="text-gray-600">Please don't close this window</p>
                </div>

                <div className="space-y-4">
                  {steps.map((step, index) => {
                    const StepIcon = step.icon;
                    const isActive = index === txStep;
                    const isComplete = index < txStep;

                    return (
                      <div key={index} className={`flex items-center space-x-4 p-4 rounded-2xl transition ${
                        isActive ? 'bg-indigo-50 border-2 border-indigo-500' : 
                        isComplete ? 'bg-green-50' : 'bg-gray-50'
                      }`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isActive ? 'bg-indigo-600' : 
                          isComplete ? 'bg-green-600' : 'bg-gray-300'
                        }`}>
                          {isComplete ? (
                            <CheckCircle2 className="text-white" size={20} />
                          ) : (
                            <StepIcon className="text-white" size={20} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-semibold ${
                            isActive ? 'text-indigo-900' : 
                            isComplete ? 'text-green-900' : 'text-gray-600'
                          }`}>
                            {step.title}
                          </p>
                        </div>
                        {isActive && (
                          <LoaderCircle className="animate-spin text-indigo-600" size={20} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Manufacture Product Modal */}
      {showManufactureModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => {
                setShowManufactureModal(false);
                setManufactureFormData({ name: '', description: '', quantity: '', price: '' });
                setManufactureImage(null);
                setSelectedMaterial(null);
              }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-bold mb-2">Manufacture New Product</h3>
            <p className="text-sm text-gray-600 mb-6">Transform raw materials into finished products</p>

            <div className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-200">
              <p className="text-sm font-semibold text-indigo-900 mb-1">Using Material:</p>
              <div className="flex items-center space-x-3">
                {selectedMaterial.image && (
                  <img 
                    src={selectedMaterial.image} 
                    alt={selectedMaterial.productName}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{selectedMaterial.productName}</p>
                  <p className="text-sm text-gray-600">{selectedMaterial.quantity} units available</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleManufactureProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g., Gaming PC Pro"
                  value={manufactureFormData.name}
                  onChange={(e) => setManufactureFormData({...manufactureFormData, name: e.target.value})}
                  required
                  className="w-full p-4 border border-gray-300 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  placeholder="Describe your product..."
                  value={manufactureFormData.description}
                  onChange={(e) => setManufactureFormData({...manufactureFormData, description: e.target.value})}
                  required
                  rows={3}
                  className="w-full p-4 border border-gray-300 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    placeholder="Units to produce"
                    value={manufactureFormData.quantity}
                    onChange={(e) => setManufactureFormData({...manufactureFormData, quantity: e.target.value})}
                    required
                    min="1"
                    max={selectedMaterial.quantity}
                    className="w-full p-4 border border-gray-300 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max: {selectedMaterial.quantity} units</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹)</label>
                  <input
                    type="number"
                    placeholder="Selling price"
                    value={manufactureFormData.price}
                    onChange={(e) => setManufactureFormData({...manufactureFormData, price: e.target.value})}
                    required
                    min="0"
                    step="0.01"
                    className="w-full p-4 border border-gray-300 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Product Image</label>
                <div className="border-2 border-dashed border-gray-300 p-6 rounded-2xl text-center cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="file"
                    onChange={(e) => setManufactureImage(e.target.files[0])}
                    className="hidden"
                    id="manufacture-image-upload"
                    accept="image/*"
                    required
                  />
                  <label htmlFor="manufacture-image-upload" className="cursor-pointer">
                    <Factory className="mx-auto text-indigo-600 mb-2" size={32} />
                    <span className="text-sm font-semibold text-gray-700">
                      {manufactureImage ? manufactureImage.name : 'Click to upload product image'}
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-2xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Product...' : '🏭 Manufacture Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Combine Materials Modal */}
      {showCombineModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-4xl w-full relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => {
                setShowCombineModal(false);
                setSelectedMaterialsForCombine([]);
                setCombineFormData({ name: '', description: '', quantity: '', price: '' });
                setCombineImage(null);
              }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-bold mb-2">Combine Materials to Create Product</h3>
            <p className="text-sm text-gray-600 mb-6">Select 2-3 materials to combine into a new product (e.g., Display Panel + Backlight Unit + Power Supply = TV)</p>

            {/* Material Selection Grid */}
            <div className="mb-6">
              <h4 className="font-bold text-lg mb-3">Select Materials ({selectedMaterialsForCombine.length}/3)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 bg-gray-50 rounded-xl">
                {availableMaterialsForCombine.map((material) => {
                  const isSelected = selectedMaterialsForCombine.find(m => m._id === material._id);
                  return (
                    <div
                      key={material._id}
                      onClick={() => toggleMaterialSelection(material)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition ${
                        isSelected 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-bold text-sm text-gray-900 line-clamp-1">{material.productName}</p>
                          <p className="text-xs text-gray-500">{material.quantity} units</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                      </div>
                      {material.image && (
                        <div className="h-16 bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={material.image}
                            alt={material.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Materials Display */}
            {selectedMaterialsForCombine.length > 0 && (
              <div className="mb-6 p-4 bg-green-50 rounded-2xl border border-green-200">
                <p className="font-bold text-sm text-green-900 mb-2">Selected Materials:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMaterialsForCombine.map((material) => (
                    <div key={material._id} className="bg-white px-3 py-1.5 rounded-full text-sm font-semibold text-gray-700 flex items-center space-x-2">
                      <span>{material.productName}</span>
                      <button
                        onClick={() => toggleMaterialSelection(material)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Creation Form */}
            {selectedMaterialsForCombine.length >= 2 && (
              <form onSubmit={handleCombineMaterials} className="space-y-4 border-t pt-6">
                <h4 className="font-bold text-lg mb-3">Product Details</h4>
                
                <input
                  type="text"
                  placeholder="Product Name (e.g., Smart TV 55 inch)"
                  value={combineFormData.name}
                  onChange={(e) => setCombineFormData({...combineFormData, name: e.target.value})}
                  required
                  className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-green-500"
                />
                
                <textarea
                  placeholder="Product Description"
                  value={combineFormData.description}
                  onChange={(e) => setCombineFormData({...combineFormData, description: e.target.value})}
                  required
                  rows={3}
                  className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={combineFormData.quantity}
                    onChange={(e) => setCombineFormData({...combineFormData, quantity: e.target.value})}
                    required
                    min="1"
                    className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={combineFormData.price}
                    onChange={(e) => setCombineFormData({...combineFormData, price: e.target.value})}
                    required
                    min="0"
                    step="0.01"
                    className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div className="border-2 border-dashed p-6 rounded-2xl text-center cursor-pointer hover:bg-gray-50">
                  <input
                    type="file"
                    onChange={(e) => setCombineImage(e.target.files[0])}
                    className="hidden"
                    id="combine-image-upload"
                    accept="image/*"
                    required
                  />
                  <label htmlFor="combine-image-upload" className="cursor-pointer">
                    <Package className="mx-auto text-green-600 mb-2" size={32} />
                    <span className="text-sm font-semibold">{combineImage ? combineImage.name : 'Upload Product Image'}</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || selectedMaterialsForCombine.length < 2}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-2xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : `Create Product from ${selectedMaterialsForCombine.length} Materials`}
                </button>
              </form>
            )}

            {selectedMaterialsForCombine.length < 2 && (
              <div className="text-center py-8 text-gray-500">
                <Boxes className="mx-auto mb-3 text-gray-300" size={48} />
                <p className="font-semibold">Select at least 2 materials to continue</p>
                <p className="text-sm">Choose materials that complement each other to create your product</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}