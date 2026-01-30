import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, Plus, Box, Factory, LogOut, Edit, Trash2, 
  ShoppingCart, CheckCircle2, X, Wallet,
  ShieldCheck, Database, CheckCircle, Link as LinkIcon,
  AlertCircle, RefreshCw, ArrowLeft, Users, Tag, DollarSign, Hash, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function ProductsDashboard() {
  const navigate = useNavigate();
  const [purchasedMaterials, setPurchasedMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Blockchain Transaction States
  const [txStatus, setTxStatus] = useState(null);
  const [txStep, setTxStep] = useState(0);
  const [lastTx, setLastTx] = useState(null);
  
  // Wallet State
  const [account, setAccount] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: ''
  });

  const steps = [
    { title: "Connecting MetaMask", icon: Wallet },
    { title: "Waiting for Signature", icon: ShieldCheck },
    { title: "Mining Transaction", icon: Database },
    { title: "Finalizing Product", icon: CheckCircle2 }
  ];

  // Check for MetaMask installation
  useEffect(() => {
    if (window.ethereum) {
      setIsMetaMaskInstalled(true);
      
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          localStorage.setItem(`wallet_${user._id}`, accounts[0]);
        } else {
          setAccount(null);
          localStorage.removeItem(`wallet_${user._id}`);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      const checkInitialConnection = async () => {
        try {
          const permissions = await window.ethereum.request({
            method: 'wallet_getPermissions'
          });
          
          const hasAccountsPermission = permissions.some(
            perm => perm.parentCapability === 'eth_accounts'
          );
          
          if (hasAccountsPermission) {
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

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    
    setIsConnecting(true);
    try {
      // Try to disconnect first to force account selection
      try {
        const currentAccounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });
        
        if (currentAccounts.length > 0) {
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }]
          });
          
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (disconnectErr) {
        console.log("Disconnect attempt failed:", disconnectErr);
      }
      
      setAccount(null);
      localStorage.removeItem(`wallet_${user._id}`);
      
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
        alert("Connection rejected. Please accept the connection request in MetaMask.");
      } else if (err.code === -32002) {
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
      await window.ethereum.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }]
      });
      
      setAccount(null);
      localStorage.removeItem(`wallet_${user._id}`);
      
      alert("Wallet disconnected. Next time you connect, you'll need to select an account.");
    } catch (err) {
      console.error("Error disconnecting wallet:", err);
      setAccount(null);
      localStorage.removeItem(`wallet_${user._id}`);
      alert("Disconnected from this application. You can connect again anytime.");
    }
  };

  const switchAccount = async () => {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
      
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        localStorage.setItem(`wallet_${user._id}`, accounts[0]);
      }
    } catch (err) {
      console.error("Error switching accounts:", err);
      if (err.code === 4001) {
        alert("Account switch rejected. Please try again.");
      }
    }
  };

  // Fetch purchased materials (using the new endpoint)
  const fetchPurchasedMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/manufacturer/purchased-materials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPurchasedMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading purchased materials:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch created products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/manufacturer/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPurchasedMaterials();
    fetchProducts();
  }, [fetchPurchasedMaterials, fetchProducts]);

  const handleCreateProduct = async (materialId) => {
    if (!account) {
      alert("Please connect your MetaMask wallet first!");
      return;
    }

    setTxStatus('processing');
    setTxStep(0);

    try {
      setTxStep(1);
      
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        await connectWallet();
        if (!account) {
          throw new Error("Wallet connection required to proceed with product creation.");
        }
      }

      const currentAccount = accounts[0];
      if (currentAccount !== account) {
        setAccount(currentAccount);
        localStorage.setItem(`wallet_${user._id}`, currentAccount);
      }

      setTxStep(2);
      const ethAmount = (0.0001).toString();
      const weiAmount = (parseFloat(ethAmount) * 1e18).toString(16);

      const transactionParameters = {
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        from: currentAccount,
        value: '0x' + (parseInt(weiAmount, 10)).toString(16),
        data: '0x',
      };

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });

      setTxStep(3);
      await new Promise(resolve => setTimeout(resolve, 3000));

      setTxStep(4);
      const response = await fetch(`${API_URL}/manufacturer/products`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          materialId: materialId,
          ...formData,
          externalTxHash: txHash
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Backend product creation failed");
      }

      const data = await response.json();

      setLastTx({
        ...data.product,
        txHash: txHash
      });
      setTxStatus('success');
      
      // Refresh data
      fetchPurchasedMaterials();
      fetchProducts();
      setShowCreateModal(false);
      setFormData({ name: '', description: '', price: '', quantity: '' });
      
    } catch (err) {
      console.error("Blockchain Error:", err);
      alert(err.message || "Transaction cancelled or failed");
      setTxStatus(null);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/manufacturer/products/${editingProduct._id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        setProducts(prev => prev.map(p => p._id === updatedProduct._id ? updatedProduct : p));
        setShowEditModal(false);
        setEditingProduct(null);
      }
    } catch (err) {
      console.error('Error updating product:', err);
      alert('Error updating product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await fetch(`${API_URL}/manufacturer/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setProducts(prev => prev.filter(p => p._id !== id));
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Error deleting product');
    }
  };

  const openCreateModal = (materialId) => {
    setSelectedMaterial(materialId);
    setShowCreateModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: product.quantity
    });
    setShowEditModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(`wallet_${user._id}`);
    window.location.href = '/login';
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="w-full bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/manufacturer/dashboard')} 
                className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 transition"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">Back to Dashboard</span>
              </button>
              <div className="flex items-center space-x-2">
                <Factory className="text-indigo-600" size={28} />
                <span className="text-xl font-bold text-gray-900">Products Factory</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Wallet Info */}
              <div className="flex items-center space-x-2">
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
                    <div className="text-right hidden md:block">
                      <div className="text-xs text-gray-500">Wallet Connected</div>
                      <div className="text-[10px] font-mono text-green-600 truncate max-w-[120px]">
                        {account.substring(0, 10)}...
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={switchAccount}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
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

              {/* User Info */}
              <div className="hidden md:flex items-center space-x-3">
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-600 capitalize">{user.role}</div>
                </div>
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
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
          <h2 className="text-3xl font-bold text-gray-900">Manufacture Products</h2>
          <p className="text-gray-500">Create products from your purchased raw materials</p>

          {/* Connection Status Banner */}
          <div className="mt-4">
            {!isMetaMaskInstalled && (
              <div className="flex items-center space-x-1 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle size={16} />
                <span>MetaMask not detected. Please install the extension to continue.</span>
              </div>
            )}
            
            {!account && isMetaMaskInstalled && (
              <div className="flex items-center space-x-1 text-orange-600 text-sm bg-orange-50 p-3 rounded-lg">
                <AlertCircle size={16} />
                <span>Connect wallet to create products</span>
              </div>
            )}
            
            {account && (
              <div className="flex items-center space-x-1 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                <CheckCircle2 size={16} />
                <span>Wallet connected. You can now create products.</span>
              </div>
            )}
          </div>
        </div>

        {loading && products.length === 0 && purchasedMaterials.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <LoaderCircle className="animate-spin text-indigo-600" size={48} />
          </div>
        ) : (
          <>
            {/* Purchased Materials Section */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Your Purchased Raw Materials</h3>
                <span className="text-sm text-gray-500">{purchasedMaterials.length} materials available</span>
              </div>
              
              {purchasedMaterials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {purchasedMaterials.map(material => (
                    <div key={material._id} className="bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-lg transition">
                      <div className="h-48 overflow-hidden">
                        <img src={material.image} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" alt={material.productName} />
                      </div>
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <Box className="text-green-600" size={32} />
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Available</span>
                        </div>
                        <h4 className="text-lg font-bold mb-3 text-gray-900">{material.productName}</h4>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center space-x-2">
                            <Users size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-600">Supplier: {material.supplierName}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <DollarSign size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-600">Cost: ${material.price} per unit</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Hash size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-600">Quantity: {material.quantity} units</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Calendar size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-600">Purchased: {new Date(material.purchasedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => openCreateModal(material._id)}
                          disabled={!account}
                          className={`w-full py-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition ${!account ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                        >
                          <Plus size={16} />
                          <span>Create Product from this Material</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                  <ShoppingCart className="mx-auto text-gray-300 mb-4" size={64} />
                  <p className="text-gray-600 text-lg mb-2">No purchased materials available</p>
                  <p className="text-gray-500 mb-6">You need to purchase raw materials first to create products</p>
                  <button
                    onClick={() => navigate('/manufacturer/dashboard')}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition inline-flex items-center space-x-2"
                  >
                    <ShoppingCart size={20} />
                    <span>Go to Marketplace</span>
                  </button>
                </div>
              )}
            </div>

            {/* Products Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Your Manufactured Products</h3>
                <span className="text-sm text-gray-500">{products.length} products created</span>
              </div>
              
              {products.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Product</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Description</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Stock</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Price</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {products.map(product => (
                          <tr key={product._id} className="hover:bg-indigo-50/30 transition">
                            <td className="px-6 py-4">
                              <div className="font-bold text-gray-900">{product.name}</div>
                              {product.txHash && (
                                <a 
                                  href={`https://etherscan.io/tx/${product.txHash}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex items-center space-x-1 text-indigo-600 hover:underline text-xs"
                                >
                                  <LinkIcon size={10} />
                                  <span>View on Blockchain</span>
                                </a>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{product.description}</td>
                            <td className="px-6 py-4">
                              <span className={`font-bold ${product.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {product.quantity} units
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-900">${product.price}</td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button 
                                onClick={() => openEditModal(product)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(product._id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 size={18} />
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
                  <Factory className="mx-auto text-gray-300 mb-4" size={64} />
                  <p className="text-gray-600">No products created yet. Create your first product from purchased materials.</p>
                  {purchasedMaterials.length > 0 && (
                    <p className="text-gray-500 mt-2">You have {purchasedMaterials.length} materials available for product creation.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full relative">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-bold mb-6">Create New Product</h3>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name</label>
                <input
                  type="text" name="name" value={formData.name} onChange={handleInputChange}
                  placeholder="Enter product name"
                  required
                  className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  name="description" value={formData.description} onChange={handleInputChange}
                  placeholder="Describe your product"
                  required
                  rows="3"
                  className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Price ($)</label>
                  <input
                    type="number" name="price" value={formData.price} onChange={handleInputChange}
                    placeholder="0.00"
                    required
                    min="0"
                    step="0.01"
                    className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number" name="quantity" value={formData.quantity} onChange={handleInputChange}
                    placeholder="0"
                    required
                    min="1"
                    className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => handleCreateProduct(selectedMaterial)}
                disabled={!account || !formData.name || !formData.description || !formData.price || !formData.quantity}
                className={`w-full py-4 rounded-2xl font-bold transition ${!account || !formData.name || !formData.description || !formData.price || !formData.quantity ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                Create with MetaMask
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full relative">
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-bold mb-6">Edit Product</h3>

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name</label>
                <input
                  type="text" name="name" value={formData.name} onChange={handleInputChange}
                  placeholder="Enter product name"
                  required
                  className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  name="description" value={formData.description} onChange={handleInputChange}
                  placeholder="Describe your product"
                  required
                  rows="3"
                  className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Price ($)</label>
                  <input
                    type="number" name="price" value={formData.price} onChange={handleInputChange}
                    placeholder="0.00"
                    required
                    min="0"
                    step="0.01"
                    className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number" name="quantity" value={formData.quantity} onChange={handleInputChange}
                    placeholder="0"
                    required
                    min="0"
                    className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <button
                type="submit" disabled={loading}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 disabled:bg-indigo-300 transition"
              >
                {loading ? 'Updating...' : 'Update Product'}
              </button>
            </form>
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
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Creating Product</h3>
                <p className="text-gray-500 mb-8">Registering product on the blockchain...</p>
                
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
                  <CheckCircle size={48} />
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-2">Product Created</h3>
                <p className="text-gray-500 mb-8">Your product has been registered on the blockchain.</p>
                
                <div className="bg-gray-50 p-6 rounded-3xl text-left border border-gray-100 mb-8">
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">On-Chain Transaction Hash</p>
                    <p className="text-xs font-mono text-indigo-600 break-all bg-white p-3 rounded-xl border">{lastTx?.txHash}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Product</p>
                      <p className="font-bold text-gray-900">{formData.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Status</p>
                      <p className="font-bold text-green-600">Finalized</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setTxStatus(null)}
                    className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition"
                  >
                    Create Another
                  </button>
                  <button 
                    onClick={() => {
                      setTxStatus(null);
                      setShowCreateModal(false);
                    }}
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition"
                  >
                    View Products
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}