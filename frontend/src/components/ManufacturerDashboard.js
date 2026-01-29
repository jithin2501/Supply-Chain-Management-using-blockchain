import React, { useState, useEffect, useCallback } from 'react';
import { 
  Factory, Package, ShoppingCart, LogOut, Building2, 
  Truck, Star, ArrowRight, ArrowLeft, ChevronRight, 
  Boxes, ShieldCheck, Cpu, Database, CheckCircle2, History, Link as LinkIcon, Clock, Wallet, AlertCircle, RefreshCw
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('marketplace');
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  
  // Wallet State
  const [account, setAccount] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  // Blockchain Transaction States
  const [txStatus, setTxStatus] = useState(null); // 'processing', 'success', null
  const [txStep, setTxStep] = useState(0);
  const [lastTx, setLastTx] = useState(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const steps = [
    { title: "Connecting MetaMask", icon: Wallet },
    { title: "Waiting for Signature", icon: ShieldCheck },
    { title: "Mining Transaction", icon: Database },
    { title: "Finalizing Ledger", icon: CheckCircle2 }
  ];

  // Check for MetaMask and handle session-specific wallet connection
  useEffect(() => {
    if (window.ethereum) {
      setIsMetaMaskInstalled(true);
      
      // Identify the wallet previously connected by THIS specific manufacturer
      const savedAccount = localStorage.getItem(`wallet_${user._id}`);

      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          // Only auto-connect if the current MetaMask account matches what THIS user used last
          if (accounts.length > 0 && accounts[0] === savedAccount) {
            setAccount(accounts[0]);
          } else {
            // If it's a different user or different account, don't auto-connect
            setAccount(null);
          }
        });

      // Listen for account changes in MetaMask
      const handleAccountsChanged = (accounts) => {
        const currentSaved = localStorage.getItem(`wallet_${user._id}`);
        if (accounts.length > 0 && accounts[0] === currentSaved) {
          setAccount(accounts[0]);
        } else {
          // If the user manually changes to an unlinked account, we clear the app state
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
      
      // Explicitly link this wallet address to this Manufacturer's user ID
      setAccount(connectedAccount);
      localStorage.setItem(`wallet_${user._id}`, connectedAccount);
      
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  };

  const disconnectWallet = () => {
    // We clear the link for this specific user
    setAccount(null);
    localStorage.removeItem(`wallet_${user._id}`);
  };

  const fetchMaterials = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/products/available`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading marketplace:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/manufacturer/purchases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPurchases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'marketplace') {
      fetchMaterials();
    } else {
      fetchPurchases();
    }
  }, [activeTab, fetchMaterials, fetchPurchases]);

  const handleBuy = async (product) => {
    if (!account) {
      alert("Please connect your specific MetaMask wallet first!");
      return;
    }

    setTxStatus('processing');
    setTxStep(0);

    try {
      setTxStep(1);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const currentAccount = accounts[0];

      if (currentAccount !== account) {
        throw new Error("Active MetaMask account does not match the connected wallet for this session.");
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
      const response = await fetch(`${API_URL}/products/buy`, {
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
        throw new Error(errorData.message || "Backend ledger update failed");
      }

      const data = await response.json();

      setLastTx({
        ...data.transaction,
        txHash: txHash
      });
      setTxStatus('success');
      
      // Refresh both marketplace and purchases
      fetchMaterials();
      fetchPurchases();
      
    } catch (err) {
      console.error("Blockchain Error:", err);
      alert(err.message || "Transaction cancelled or failed");
      setTxStatus(null);
    }
  };

  const handleLogout = () => {
    // Standard logout
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Note: We don't clear the wallet_ ID here in case they want to log back in, 
    // but the session is effectively terminated.
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
            <h1 className="text-xl font-bold text-gray-900">ChainTrack</h1>
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
            {activeTab === 'marketplace' ? (selectedSupplier ? selectedSupplier.company : 'Supplier Marketplace') : 'Blockchain Transaction Ledger'}
          </h2>
          <p className="text-gray-500">
            {activeTab === 'marketplace' ? 'Real-time Web3 sourcing with MetaMask integration.' : 'Immutable history of verified blockchain transactions.'}
          </p>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                  {selectedSupplier.items.map(item => (
                    <div key={item._id} className="bg-white rounded-3xl shadow-sm border overflow-hidden hover:shadow-lg transition">
                      <img src={item.image} className="w-full h-48 object-cover" alt="" />
                      <div className="p-6">
                        <h4 className="text-lg font-bold mb-4">{item.name}</h4>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Price</p>
                            <span className="text-2xl font-black text-gray-900">${item.price}</span>
                          </div>
                          <button 
                            onClick={() => handleBuy(item)} 
                            className={`px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition ${!account ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                          >
                            <span>Buy</span>
                            <ArrowRight size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Ledger View */
              <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 overflow-hidden animate-in fade-in duration-500">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Tx Hash</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Product</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Seller</th>
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
                          <td className="px-6 py-4 font-bold text-gray-900">${tx.amount}</td>
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
              </div>
            )}
          </>
        )}
      </div>

      {/* --- Blockchain Transaction Modal --- */}
      {txStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-6">
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