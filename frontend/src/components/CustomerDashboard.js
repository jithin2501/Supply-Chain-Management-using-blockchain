import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingBag, Package, Wallet, LogOut, CheckCircle2, 
  ArrowRight, Link as LinkIcon, Clock, AlertCircle, RefreshCw,
  ShieldCheck, Database, CheckCircle, Search, Filter
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

export default function CustomerDashboard() {
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrice, setFilterPrice] = useState('all');
  
  // Blockchain Transaction States
  const [txStatus, setTxStatus] = useState(null);
  const [txStep, setTxStep] = useState(0);
  const [lastTx, setLastTx] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Wallet State
  const [account, setAccount] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const steps = [
    { title: "Connecting MetaMask", icon: Wallet },
    { title: "Waiting for Signature", icon: ShieldCheck },
    { title: "Mining Transaction", icon: Database },
    { title: "Finalizing Purchase", icon: CheckCircle2 }
  ];

  // Check for MetaMask
  useEffect(() => {
    if (window.ethereum) {
      setIsMetaMaskInstalled(true);
      const savedAccount = localStorage.getItem(`wallet_${user._id}`);
      
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0 && accounts[0] === savedAccount) {
            setAccount(accounts[0]);
          }
        });

      const handleAccountsChanged = (accounts) => {
        const currentSaved = localStorage.getItem(`wallet_${user._id}`);
        if (accounts.length > 0 && accounts[0] === currentSaved) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [user._id]);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask!");
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const connectedAccount = accounts[0];
      
      setAccount(connectedAccount);
      localStorage.setItem(`wallet_${user._id}`, connectedAccount);
      
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    localStorage.removeItem(`wallet_${user._id}`);
  };

  // Fetch available products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/products/available`, {
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

  // Fetch customer purchases
  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/customer/purchases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPurchases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading purchases:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProducts();
    fetchPurchases();
  }, [fetchProducts, fetchPurchases]);

  const handleBuyProduct = async (product) => {
    if (!account) {
      alert("Please connect your MetaMask wallet first!");
      return;
    }

    setSelectedProduct(product);
    setTxStatus('processing');
    setTxStep(0);

    try {
      setTxStep(1);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const currentAccount = accounts[0];

      if (currentAccount !== account) {
        throw new Error("Active MetaMask account does not match the connected wallet.");
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
      const response = await fetch(`${API_URL}/products/buy-final`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          productId: product._id, 
          quantity: 1,
          externalTxHash: txHash
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
      console.error("Blockchain Error:", err);
      alert(err.message || "Transaction cancelled or failed");
      setTxStatus(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.company.toLowerCase().includes(searchTerm.toLowerCase());
    
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg p-6 flex flex-col justify-between fixed h-full z-10">
        <div>
          <div className="flex items-center space-x-2 mb-8">
            <ShoppingBag className="text-green-600" size={32} />
            <h1 className="text-xl font-bold text-gray-900">Customer Hub</h1>
          </div>
          <nav className="space-y-2">
            <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-green-600 text-white shadow-md font-medium">
              <Package size={20} />
              <span>Browse Products</span>
            </button>
          </nav>

          {/* Wallet Section */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Customer Wallet</p>
            {!account ? (
              <button 
                onClick={connectWallet}
                className="w-full flex items-center justify-center space-x-2 bg-orange-50 text-orange-600 p-3 rounded-xl hover:bg-orange-100 transition font-bold text-sm"
              >
                <Wallet size={18} />
                <span>Link MetaMask</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2 text-green-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold">Linked</span>
                    </div>
                    <button onClick={disconnectWallet} className="text-[10px] text-red-500 hover:underline">Unlink</button>
                  </div>
                  <p className="text-[10px] font-mono text-green-600 truncate">{account}</p>
                </div>
                <button 
                  onClick={connectWallet}
                  className="w-full flex items-center justify-center space-x-1 text-[10px] text-gray-400 hover:text-green-600 transition"
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
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Customer</p>
            <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
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
          <h2 className="text-3xl font-bold text-gray-900">Product Marketplace</h2>
          <p className="text-gray-500">Browse and purchase blockchain-verified products</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={filterPrice}
                onChange={(e) => setFilterPrice(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Prices</option>
                <option value="under50">Under $50</option>
                <option value="50to100">$50 - $100</option>
                <option value="over100">Over $100</option>
              </select>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500">
                {filteredProducts.length} products found
              </span>
            </div>
          </div>
        </div>

        {loading && products.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <LoaderCircle className="animate-spin text-green-600" size={48} />
          </div>
        ) : (
          <>
            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {filteredProducts.map(product => (
                <div key={product._id} className="bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-lg transition">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Package className="text-green-600" size={32} />
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${product.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {product.quantity > 0 ? `${product.quantity} in stock` : 'Sold Out'}
                      </span>
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h4>
                    <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Manufacturer</p>
                      <p className="text-sm font-semibold">{product.company}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Price</p>
                        <p className="text-2xl font-black text-gray-900">${product.price}</p>
                      </div>
                      <button 
                        onClick={() => handleBuyProduct(product)}
                        disabled={!account || product.quantity === 0}
                        className={`px-6 py-3 rounded-xl font-bold flex items-center space-x-2 transition ${!account || product.quantity === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                      >
                        <span>Buy</span>
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Purchase History */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Purchase History</h3>
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
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {purchases.map(purchase => (
                          <tr key={purchase._id} className="hover:bg-green-50/30 transition">
                            <td className="px-6 py-4">
                              <div className="font-bold text-gray-900">{purchase.productName}</div>
                              {purchase.txHash && (
                                <a 
                                  href={`https://etherscan.io/tx/${purchase.txHash}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex items-center space-x-1 text-green-600 hover:underline text-xs"
                                >
                                  <LinkIcon size={10} />
                                  <span>View on Blockchain</span>
                                </a>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{purchase.sellerName}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">${purchase.amount}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end text-xs text-gray-400">
                                <Clock size={12} className="mr-1" />
                                {new Date(purchase.timestamp).toLocaleDateString()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                  <ShoppingBag className="mx-auto text-gray-300 mb-4" size={64} />
                  <p className="text-gray-600">No purchases yet. Buy your first product!</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Blockchain Transaction Modal */}
      {txStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-6">
          <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl overflow-hidden relative">
            {txStatus === 'processing' ? (
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin"></div>
                  <Wallet className="absolute inset-0 m-auto text-green-600" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Processing Purchase</h3>
                <p className="text-gray-500 mb-8">Processing payment on the blockchain...</p>
                
                <div className="space-y-4">
                  {steps.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = txStep === (idx + 1);
                    const isDone = txStep > (idx + 1);
                    return (
                      <div key={idx} className={`flex items-center space-x-4 p-4 rounded-2xl transition-all ${isActive ? 'bg-green-50 border border-green-200 shadow-inner' : 'opacity-40'}`}>
                        <div className={`${isDone ? 'bg-green-500' : isActive ? 'bg-green-600' : 'bg-gray-200'} p-2 rounded-lg transition-colors`}>
                          <Icon size={20} className={isDone || isActive ? 'text-white' : 'text-gray-500'} />
                        </div>
                        <span className={`font-semibold ${isActive ? 'text-green-900' : 'text-gray-500'}`}>{step.title}</span>
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
                    <p className="text-xs font-mono text-green-600 break-all bg-white p-3 rounded-xl border">{lastTx?.txHash}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                  Return to Marketplace
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
