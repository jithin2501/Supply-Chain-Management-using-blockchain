import React, { useState, useEffect } from 'react';
import {
  DollarSign, CheckCircle, XCircle, Clock, AlertCircle,
  Download, Eye, Search, Filter, RefreshCw, ArrowLeft,
  Check, X, Loader2, FileText, User, Package, Truck,
  ChevronRight, ExternalLink, Calendar, CreditCard,
  Wallet, Banknote, Shield, ShieldCheck, Database, CheckCircle2,
  Bug, Wrench, BarChart, Activity, Database as DatabaseIcon, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

export default function ManufacturerRefunds() {
  const navigate = useNavigate();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [showRefundDetails, setShowRefundDetails] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [action, setAction] = useState('');
  const [processingNotes, setProcessingNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // MetaMask & Blockchain States
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [account, setAccount] = useState(null);
  const [txStatus, setTxStatus] = useState(null);
  const [txStep, setTxStep] = useState(0);
  const [transactionHash, setTransactionHash] = useState('');

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const steps = [
    { title: "Connecting MetaMask", icon: Wallet },
    { title: "Waiting for Signature", icon: ShieldCheck },
    { title: "Mining Transaction", icon: Database },
    { title: "Finalizing Refund", icon: CheckCircle2 }
  ];

  // Check MetaMask installation and connection
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
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [user._id]);

  useEffect(() => {
    if (!token || user.role !== 'manufacturers') {
      navigate('/login');
      return;
    }
    fetchRefunds();
  }, [filters.status]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.status !== 'all') {
        queryParams.append('status', filters.status);
      }
      
      const response = await fetch(`${API_URL}/manufacturer/refunds?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch refunds');
      
      const data = await response.json();
      setRefunds(data.refunds);
      console.log('Refunds loaded:', data.refunds.length);
    } catch (error) {
      console.error('Error fetching refunds:', error);
      alert('Failed to load refunds. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/debug/check-manufacturer-refunds`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch debug info');
      
      const data = await response.json();
      setDebugInfo(data);
      console.log('Debug info loaded:', data);
    } catch (error) {
      console.error('Error fetching debug info:', error);
      alert('Failed to fetch debug info. This endpoint may not be available.');
    }
  };

  const fixManufacturerRefunds = async () => {
    if (!window.confirm('This will attempt to fix missing manufacturer IDs in refunds. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/debug/fix-manufacturer-refunds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Failed to fix refunds');
      
      alert(`Fix completed:\n\nFixed: ${data.fixed} refunds\nErrors: ${data.errors}\n\nPlease refresh the page.`);
      
      // Refresh data
      fetchRefunds();
      fetchDebugInfo();
      
    } catch (error) {
      console.error('Error fixing refunds:', error);
      alert(`Failed to fix refunds: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createMissingRefunds = async () => {
    if (!window.confirm('This will create refund records for all orders with "refund_requested" status. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/emergency/fix-refund-requested-orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create refunds');
      }

      alert(
        `✅ Emergency Fix Completed!\n\n` +
        `Created: ${data.created || 0} refunds\n` +
        `Skipped: ${data.skipped || 0} (already exist)\n` +
        `Errors: ${data.errors || 0}\n\n` +
        `The page will now refresh.`
      );
      
      // Refresh data
      fetchRefunds();
      if (debugInfo) fetchDebugInfo();
      
    } catch (error) {
      console.error('Error creating refunds:', error);
      alert(`Failed to create refunds: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed. Please install MetaMask to continue.');
      return false;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        localStorage.setItem(`wallet_${user._id}`, accounts[0]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error connecting MetaMask:', error);
      alert('Failed to connect MetaMask. Please try again.');
      return false;
    }
  };

  const processBlockchainRefund = async (refundAmount, customerWalletAddress) => {
    setTxStatus('processing');
    setTxStep(0);

    try {
      // Step 1: Connect MetaMask
      setTxStep(1);
      
      if (!account) {
        const connected = await connectMetaMask();
        if (!connected) {
          throw new Error('MetaMask connection required');
        }
      }

      // Verify we still have access
      const currentAccounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (currentAccounts.length === 0 || !currentAccounts.includes(account)) {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        if (accounts.length === 0) {
          throw new Error('MetaMask connection denied');
        }
        
        setAccount(accounts[0]);
      }

      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('🌐 Current network chainId:', chainId);
      
      // Convert INR to ETH (example rate: 1 INR = 0.000002 ETH)
      const ethAmount = (refundAmount * 0.000002).toFixed(6);
      const weiAmount = Math.floor(parseFloat(ethAmount) * 1e18);

      // Step 2: Request transaction signature
      setTxStep(2);
      
      const transactionParameters = {
        to: customerWalletAddress,
        from: account,
        value: '0x' + weiAmount.toString(16),
        gas: '0x5208', // 21000 gas for simple transfer
      };

      console.log('📤 Sending refund transaction:', transactionParameters);

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });

      console.log('✅ Refund transaction submitted! Hash:', txHash);
      console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/tx/${txHash}`);

      setTransactionHash(txHash);

      // Step 3: Wait for transaction mining
      setTxStep(3);
      
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

      setTxStatus('success');
      return txHash;

    } catch (error) {
      console.error('❌ Blockchain refund error:', error);
      setTxStatus('error');
      throw error;
    }
  };

  const handleProcessRefund = async () => {
    if (!action) {
      alert('Please select an action');
      return;
    }

    // For approve action, just update status
    if (action === 'approve') {
      try {
        setProcessingAction(true);
        
        const response = await fetch(`${API_URL}/manufacturer/refunds/${selectedRefund._id}/process`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'approve',
            notes: processingNotes
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to approve refund');
        }

        alert('Refund approved successfully! You can now complete the refund using MetaMask.');
        setShowProcessModal(false);
        setAction('');
        setProcessingNotes('');
        setProcessingAction(false);
        
        fetchRefunds();
        
      } catch (error) {
        console.error('Error approving refund:', error);
        alert(`Failed to approve refund: ${error.message}`);
        setProcessingAction(false);
      }
      return;
    }

    // For reject action
    if (action === 'reject') {
      if (!processingNotes.trim()) {
        alert('Please provide a reason for rejection');
        return;
      }

      try {
        setProcessingAction(true);
        
        const response = await fetch(`${API_URL}/manufacturer/refunds/${selectedRefund._id}/process`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'reject',
            notes: processingNotes
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to reject refund');
        }

        alert('Refund rejected successfully.');
        setShowProcessModal(false);
        setAction('');
        setProcessingNotes('');
        setProcessingAction(false);
        
        fetchRefunds();
        
      } catch (error) {
        console.error('Error rejecting refund:', error);
        alert(`Failed to reject refund: ${error.message}`);
        setProcessingAction(false);
      }
      return;
    }

    // For complete action - process blockchain refund
    if (action === 'complete') {
      if (!selectedRefund.walletAddress) {
        alert('Customer wallet address not found. Cannot process refund.');
        return;
      }

      if (!isMetaMaskInstalled) {
        alert('MetaMask is required to process refunds. Please install MetaMask.');
        return;
      }

      try {
        setProcessingAction(true);
        
        // Process blockchain transaction
        const txHash = await processBlockchainRefund(
          selectedRefund.totalAmount,
          selectedRefund.walletAddress
        );

        if (!txHash) {
          throw new Error('Transaction hash not received');
        }

        // Update refund status in backend
        const response = await fetch(`${API_URL}/manufacturer/refunds/${selectedRefund._id}/process`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'complete',
            transactionHash: txHash,
            notes: processingNotes
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to complete refund');
        }

        alert('Refund completed successfully! Transaction has been sent to the customer.');
        setShowProcessModal(false);
        setAction('');
        setTransactionHash('');
        setProcessingNotes('');
        setProcessingAction(false);
        setTxStatus(null);
        setTxStep(0);
        
        fetchRefunds();
        
      } catch (error) {
        console.error('Error completing refund:', error);
        alert(`Failed to complete refund: ${error.message}`);
        setProcessingAction(false);
        setTxStatus('error');
      }
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      processing: Loader2,
      approved: CheckCircle,
      rejected: XCircle,
      completed: CheckCircle,
      failed: XCircle
    };
    return icons[status] || Clock;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getActionButton = (refund) => {
    if (refund.status === 'pending') {
      return (
        <button
          onClick={() => {
            setSelectedRefund(refund);
            setAction('approve');
            setShowProcessModal(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
        >
          <Check size={16} className="mr-2" />
          Process Refund
        </button>
      );
    }
    
    if (refund.status === 'processing') {
      return (
        <button
          onClick={() => {
            setSelectedRefund(refund);
            setAction('complete');
            setShowProcessModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
        >
          <Wallet size={16} className="mr-2" />
          Send Refund via MetaMask
        </button>
      );
    }
    
    return null;
  };

  const filteredRefunds = refunds.filter(refund => {
    const searchLower = filters.search.toLowerCase();
    return (
      refund.orderNumber?.toLowerCase().includes(searchLower) ||
      refund.customerName?.toLowerCase().includes(searchLower) ||
      refund.customerEmail?.toLowerCase().includes(searchLower)
    );
  });

  if (loading && !debugInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600">Loading refunds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/manufacturer/dashboard')}
              className="p-2 hover:bg-gray-200 rounded-lg transition"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Refund Management</h1>
              <p className="text-gray-600 mt-1">Process customer refund requests</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              <Bug size={20} />
              <span>Debug</span>
            </button>
            
            <button
              onClick={fetchRefunds}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <RefreshCw size={18} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Fix Banner (shown when no refunds) */}
      {refunds.length === 0 && !loading && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <AlertCircle size={32} className="text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Refunds Found</h3>
                <p className="text-gray-700 mb-4">
                  If customers have requested refunds but they're not showing up here, you may need to create the refund records.
                  This can happen if refund requests were made before the refund system was fully configured.
                </p>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={createMissingRefunds}
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Zap size={20} />
                    <span>{loading ? 'Processing...' : 'Create Missing Refunds'}</span>
                  </button>
                  <button
                    onClick={() => setShowDebugPanel(true)}
                    className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    <Bug size={20} />
                    <span>Open Debug Panel</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="max-w-7xl mx-auto mb-6 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <Activity size={20} className="mr-2 text-red-600" />
              Debug Information
            </h3>
            <button
              onClick={fetchDebugInfo}
              className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              <RefreshCw size={14} />
              <span>Refresh Debug</span>
            </button>
          </div>
          
          {debugInfo ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Refunds in System</p>
                  <p className="text-2xl font-bold text-gray-900">{debugInfo.totalRefunds || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Your Refunds</p>
                  <p className="text-2xl font-bold text-gray-900">{debugInfo.myRefunds || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Orders with Return Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{debugInfo.returnOrders || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Your Products</p>
                  <p className="text-2xl font-bold text-gray-900">{debugInfo.myProducts || 0}</p>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-3">Emergency Actions</h4>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={createMissingRefunds}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                    disabled={loading}
                  >
                    <Zap size={16} />
                    <span>{loading ? 'Creating...' : 'Create Missing Refunds'}</span>
                  </button>
                  <button
                    onClick={fixManufacturerRefunds}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    disabled={loading}
                  >
                    <Wrench size={16} />
                    <span>{loading ? 'Fixing...' : 'Fix Manufacturer IDs'}</span>
                  </button>
                  <button
                    onClick={() => {
                      console.log('Debug Info:', debugInfo);
                      alert(`Check console for detailed debug information.\n\nManufacturer ID: ${debugInfo.manufacturerId || user._id}`);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    <DatabaseIcon size={16} />
                    <span>View Raw Data</span>
                  </button>
                </div>
              </div>
              
              {debugInfo.myRefundsList && debugInfo.myRefundsList.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Your Refunds Found:</h4>
                  <div className="space-y-2">
                    {debugInfo.myRefundsList.map((refund, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">#{refund.orderNumber}</p>
                          <p className="text-sm text-gray-600">₹{refund.amount?.toFixed(2)} - {refund.status}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          getStatusColor(refund.status)
                        }`}>
                          {refund.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600">Click "Refresh Debug" to load debug information</p>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by order number, customer name, or email..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {filteredRefunds.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto mb-4 text-gray-300" size={64} />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No refunds found</h3>
              <p className="text-gray-500 mb-6">
                {filters.status !== 'all' || filters.search
                  ? 'Try adjusting your filters'
                  : 'Refund requests will appear here when customers request returns'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Order Details</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Customer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRefunds.map((refund) => {
                    const StatusIcon = getStatusIcon(refund.status);
                    return (
                      <tr key={refund._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">#{refund.orderNumber}</p>
                            <p className="text-sm text-gray-500">{refund.items?.length || 0} item(s)</p>
                            {refund.manufacturerName && (
                              <p className="text-xs text-gray-400">Manufacturer: {refund.manufacturerName}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{refund.customerName}</p>
                            <p className="text-sm text-gray-500">{refund.customerEmail}</p>
                            {refund.deliveryPartnerName && (
                              <p className="text-xs text-gray-400">Delivery: {refund.deliveryPartnerName}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-red-600">₹{refund.totalAmount?.toFixed(2) || '0.00'}</p>
                          {refund.walletAddress && (
                            <p className="text-xs text-gray-500 truncate max-w-[120px]">
                              {refund.walletAddress.slice(0, 6)}...{refund.walletAddress.slice(-4)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(refund.status)}`}>
                            <StatusIcon size={14} className={refund.status === 'processing' ? 'animate-spin' : ''} />
                            <span className="capitalize">{refund.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{formatDate(refund.createdAt)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedRefund(refund);
                                setShowRefundDetails(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            
                            {getActionButton(refund)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      {filteredRefunds.length > 0 && (
        <div className="max-w-7xl mx-auto mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Refunds</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredRefunds.length}</p>
                </div>
                <BarChart size={24} className="text-blue-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{filteredRefunds.reduce((sum, r) => sum + r.totalAmount, 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign size={24} className="text-red-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Action</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {filteredRefunds.filter(r => r.status === 'pending').length}
                  </p>
                </div>
                <Clock size={24} className="text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Details Modal */}
      {showRefundDetails && selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-8 py-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText size={32} className="text-blue-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Refund Details</h2>
                  <p className="text-sm text-gray-500">Order #{selectedRefund.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRefundDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedRefund.status)}`}>
                  {React.createElement(getStatusIcon(selectedRefund.status), { 
                    size: 18, 
                    className: selectedRefund.status === 'processing' ? 'animate-spin' : '' 
                  })}
                  <span className="capitalize">{selectedRefund.status}</span>
                </span>
                
                <div className="text-right">
                  <p className="text-sm text-gray-600">Refund Amount</p>
                  <p className="text-2xl font-bold text-red-600">₹{selectedRefund.totalAmount?.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium text-gray-900">{selectedRefund.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{selectedRefund.customerEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Wallet Address</p>
                      <p className="font-medium text-gray-900 font-mono text-sm break-all">
                        {selectedRefund.walletAddress || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Delivery Partner</p>
                      <p className="font-medium text-gray-900">{selectedRefund.deliveryPartnerName || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  {selectedRefund.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Package size={20} className="text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{item.productName}</p>
                          <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₹{item.price?.toFixed(2) || '0.00'} each</p>
                        <p className="font-bold text-gray-900">₹{item.subtotal?.toFixed(2) || '0.00'} total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Return Details */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Return Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Reason</p>
                      <p className="font-medium text-gray-900">{selectedRefund.reason || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Refund Method</p>
                      <p className="font-medium text-gray-900">{selectedRefund.refundMethod || 'wallet'}</p>
                    </div>
                    {selectedRefund.transactionHash && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Transaction Hash</p>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 break-all font-mono text-sm flex-1">
                            {selectedRefund.transactionHash}
                          </p>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${selectedRefund.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex-shrink-0"
                          >
                            <ExternalLink size={16} />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Refund Timeline */}
              {selectedRefund.trackingHistory && selectedRefund.trackingHistory.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Refund Timeline</h3>
                  <div className="space-y-4">
                    {selectedRefund.trackingHistory.map((event, idx) => {
                      const isApproved = event.status.includes('approved') || event.status === 'completed';
                      const isRejected = event.status.includes('rejected') || event.status === 'failed';
                      const Icon = isApproved ? CheckCircle : isRejected ? XCircle : Clock;
                      const iconColor = isApproved ? 'text-green-600' : isRejected ? 'text-red-600' : 'text-blue-600';
                      
                      return (
                        <div key={idx} className="flex items-start space-x-4">
                          <div className={`w-10 h-10 rounded-full ${isApproved ? 'bg-green-100' : isRejected ? 'bg-red-100' : 'bg-blue-100'} flex items-center justify-center flex-shrink-0`}>
                            <Icon size={20} className={iconColor} />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 capitalize">
                              {event.status?.replace(/_/g, ' ') || 'Update'}
                            </p>
                            <p className="text-sm text-gray-600">{event.message || 'No message'}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(event.timestamp)}
                            </p>
                            {event.updatedBy && (
                              <p className="text-xs text-gray-600 mt-1">
                                By: {event.updatedBy.name} ({event.updatedBy.role})
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRefund.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">{selectedRefund.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t px-8 py-6 flex space-x-3">
              <button
                onClick={() => setShowRefundDetails(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Close
              </button>
              
              {(selectedRefund.status === 'pending' || selectedRefund.status === 'processing') && (
                <button
                  onClick={() => {
                    setShowRefundDetails(false);
                    setShowProcessModal(true);
                    setAction(selectedRefund.status === 'pending' ? 'approve' : 'complete');
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center ml-auto"
                >
                  {selectedRefund.status === 'pending' ? (
                    <>
                      <Check size={18} className="mr-2" />
                      Process Refund
                    </>
                  ) : (
                    <>
                      <Wallet size={18} className="mr-2" />
                      Send Refund via MetaMask
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Process Refund Modal */}
      {showProcessModal && selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3 mb-6">
              {action === 'approve' ? (
                <CheckCircle size={32} className="text-green-600" />
              ) : action === 'complete' ? (
                <Wallet size={32} className="text-blue-600" />
              ) : (
                <XCircle size={32} className="text-red-600" />
              )}
              <h2 className="text-2xl font-bold text-gray-900">
                {action === 'approve' ? 'Approve Refund' : 
                 action === 'complete' ? 'Complete Refund' : 'Reject Refund'}
              </h2>
            </div>

            {txStatus && action === 'complete' && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="space-y-4">
                  {steps.map((step, idx) => {
                    const StepIcon = step.icon;
                    const isActive = idx <= txStep;
                    const isCurrent = idx === txStep;
                    
                    return (
                      <div key={idx} className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isActive ? 'bg-blue-600' : 'bg-gray-300'
                        }`}>
                          <StepIcon 
                            size={20} 
                            className={`${isActive ? 'text-white' : 'text-gray-500'} ${
                              isCurrent && txStatus === 'processing' ? 'animate-pulse' : ''
                            }`} 
                          />
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${isActive ? 'text-blue-900' : 'text-gray-500'}`}>
                            {step.title}
                          </p>
                          {isCurrent && txStatus === 'processing' && (
                            <p className="text-xs text-blue-600">In progress...</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {txStatus === 'success' && (
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">✅ Transaction successful!</p>
                    {transactionHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-700 hover:underline flex items-center mt-1"
                      >
                        View on Etherscan <ExternalLink size={12} className="ml-1" />
                      </a>
                    )}
                  </div>
                )}

                {txStatus === 'error' && (
                  <div className="mt-4 p-3 bg-red-100 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">❌ Transaction failed</p>
                    <p className="text-xs text-red-700 mt-1">Please try again or contact support</p>
                  </div>
                )}
              </div>
            )}

            <p className="text-gray-600 mb-6">
              {action === 'approve' && 'You are about to approve this refund request. After approval, you can process the refund via MetaMask.'}
              {action === 'complete' && (
                <>
                  You are about to send a refund to the customer via MetaMask.
                  <br /><br />
                  <strong>Order:</strong> #{selectedRefund.orderNumber}<br />
                  <strong>Amount:</strong> <span className="text-red-600">₹{selectedRefund.totalAmount?.toFixed(2) || '0.00'}</span><br />
                  <strong>Customer Wallet:</strong> <span className="font-mono text-sm break-all">{selectedRefund.walletAddress}</span>
                </>
              )}
              {action === 'reject' && 'You are about to reject this refund request. Please provide a reason.'}
            </p>

            {action === 'complete' && !account && (
              <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start space-x-3">
                  <AlertCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-orange-800 font-medium">MetaMask Connection Required</p>
                    <p className="text-xs text-orange-700 mt-1">
                      Please connect your MetaMask wallet to process the refund transaction.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes {action === 'reject' ? '* (Required for rejection)' : ''}
              </label>
              <textarea
                value={processingNotes}
                onChange={(e) => setProcessingNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder={action === 'reject' ? 'Please provide a reason for rejection...' : 'Add any notes...'}
                required={action === 'reject'}
                disabled={processingAction || txStatus === 'processing'}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowProcessModal(false);
                  setAction('');
                  setTransactionHash('');
                  setProcessingNotes('');
                  setTxStatus(null);
                  setTxStep(0);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                disabled={processingAction || txStatus === 'processing'}
              >
                Cancel
              </button>
              <button
                onClick={handleProcessRefund}
                disabled={
                  processingAction || 
                  txStatus === 'processing' ||
                  (action === 'reject' && !processingNotes.trim()) ||
                  (action === 'complete' && !account)
                }
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {processingAction || txStatus === 'processing' ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Processing...
                  </>
                ) : (
                  <>
                    {action === 'approve' && 'Approve Refund'}
                    {action === 'complete' && (
                      <>
                        <Wallet size={18} className="mr-2" />
                        Send Refund via MetaMask
                      </>
                    )}
                    {action === 'reject' && 'Reject Refund'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}