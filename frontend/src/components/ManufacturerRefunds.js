import React, { useState, useEffect } from 'react';
import {
  DollarSign, CheckCircle, XCircle, Clock, AlertCircle,
  Download, Eye, Search, Filter, RefreshCw, ArrowLeft,
  Check, X, Loader2, FileText, User, Package, Truck,
  ChevronRight, ExternalLink, Calendar, CreditCard,
  Wallet, Banknote, Shield
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
  const [transactionHash, setTransactionHash] = useState('');
  const [processingNotes, setProcessingNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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
    } catch (error) {
      console.error('Error fetching refunds:', error);
      alert('Failed to load refunds. Please try again.');
    } finally {
      setLoading(false);
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

  const handleProcessRefund = async () => {
    if (!action) {
      alert('Please select an action');
      return;
    }

    if (action === 'complete' && !transactionHash.trim()) {
      alert('Transaction hash is required to complete refund');
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
          action,
          transactionHash: action === 'complete' ? transactionHash : undefined,
          notes: processingNotes
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to process refund');
      }

      alert(`Refund ${action}d successfully!`);
      setShowProcessModal(false);
      setAction('');
      setTransactionHash('');
      setProcessingNotes('');
      setProcessingAction(false);
      
      // Refresh data
      fetchRefunds();
      
      // Update selected refund
      if (selectedRefund) {
        const updatedRefund = refunds.find(r => r._id === selectedRefund._id);
        if (updatedRefund) {
          setSelectedRefund(updatedRefund);
        }
      }
      
    } catch (error) {
      console.error('Error processing refund:', error);
      alert(`Failed to process refund: ${error.message}`);
      setProcessingAction(false);
    }
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
          <Check size={16} className="mr-2" />
          Complete Refund
        </button>
      );
    }
    
    return null;
  };

  if (loading) {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/manufacturer/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Refunds Management</h1>
                <p className="text-sm text-gray-600">Process customer refunds for returned orders</p>
              </div>
            </div>
            <button
              onClick={fetchRefunds}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
            >
              <RefreshCw size={18} className="mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Refunds</p>
                <p className="text-3xl font-bold text-gray-900">{refunds.length}</p>
              </div>
              <DollarSign size={32} className="text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {refunds.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <Clock size={32} className="text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Processing</p>
                <p className="text-3xl font-bold text-blue-600">
                  {refunds.filter(r => r.status === 'processing').length}
                </p>
              </div>
              <Loader2 size={32} className="text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Completed</p>
                <p className="text-3xl font-bold text-green-600">
                  {refunds.filter(r => r.status === 'completed').length}
                </p>
              </div>
              <CheckCircle size={32} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter size={18} className="text-gray-500" />
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search by order number or customer..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Refunds List */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        {refunds.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <DollarSign size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No refunds found</h2>
            <p className="text-gray-600">Customer refund requests will appear here after returns are processed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {refunds.map((refund) => {
              const StatusIcon = getStatusIcon(refund.status);
              const filteredRefunds = filters.search 
                ? refunds.filter(r => 
                    r.orderNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
                    r.customerName?.toLowerCase().includes(filters.search.toLowerCase())
                  )
                : refunds;

              return filteredRefunds.map(refund => {
                const StatusIcon = getStatusIcon(refund.status);
                
                return (
                  <div key={refund._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              Refund for Order #{refund.orderNumber}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(refund.status)}`}>
                              {refund.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Requested {formatDate(refund.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">Refund Amount</p>
                          <p className="text-2xl font-bold text-red-600">₹{refund.totalAmount?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <User size={18} className="mr-2 text-blue-600" />
                            Customer Details
                          </h4>
                          <p className="font-medium text-gray-900">{refund.customerName || 'N/A'}</p>
                          <p className="text-sm text-gray-600 mt-2">{refund.customerEmail || 'N/A'}</p>
                          {refund.walletAddress && (
                            <p className="text-sm text-gray-600 mt-1 flex items-center">
                              <Wallet size={14} className="mr-2" />
                              Wallet: {refund.walletAddress.substring(0, 10)}...
                            </p>
                          )}
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <Package size={18} className="mr-2 text-blue-600" />
                            Return Details
                          </h4>
                          <p className="font-medium text-gray-900">{refund.reason || 'N/A'}</p>
                          <p className="text-sm text-gray-600 mt-2">
                            Items: {refund.items?.length || 0}
                          </p>
                          {refund.deliveryPartnerName && (
                            <p className="text-sm text-gray-600 mt-1">
                              Pickup by: {refund.deliveryPartnerName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Items to Refund */}
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3">Items to Refund</h4>
                        <div className="space-y-3">
                          {refund.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{item.productName || 'Product'}</p>
                                <p className="text-sm text-gray-600">Quantity: {item.quantity || 0}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Price</p>
                                <p className="font-semibold text-gray-900">₹{item.price?.toFixed(2) || '0.00'} each</p>
                                <p className="font-bold text-gray-900">₹{item.subtotal?.toFixed(2) || '0.00'} total</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            setSelectedRefund(refund);
                            setShowRefundDetails(true);
                          }}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                        >
                          <Eye size={18} className="mr-2" />
                          View Details
                        </button>
                        
                        {getActionButton(refund)}
                      </div>
                    </div>
                  </div>
                );
              });
            })}
          </div>
        )}
      </div>

      {/* Refund Details Modal */}
      {showRefundDetails && selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <DollarSign size={32} className="text-blue-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Refund Details</h2>
                  <p className="text-gray-600">Order #{selectedRefund.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRefundDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Refund Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center mb-2">
                      <Calendar size={18} className="text-blue-600 mr-2" />
                      <span className="text-sm text-gray-600">Requested</span>
                    </div>
                    <p className="font-semibold text-gray-900">{formatDate(selectedRefund.createdAt)}</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center mb-2">
                      <StatusIcon size={18} className={`${getStatusColor(selectedRefund.status).split(' ')[1]} mr-2`} />
                      <span className="text-sm text-gray-600">Status</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedRefund.status)}`}>
                      {selectedRefund.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center mb-2">
                      <DollarSign size={18} className="text-green-600 mr-2" />
                      <span className="text-sm text-gray-600">Amount</span>
                    </div>
                    <p className="font-bold text-2xl text-green-600">
                      ₹{selectedRefund.totalAmount?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium text-gray-900">{selectedRefund.customerName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{selectedRefund.customerEmail || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Wallet Address</p>
                      <p className="font-medium text-gray-900 break-all">
                        {selectedRefund.walletAddress || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Refund Method</p>
                      <p className="font-medium text-gray-900">{selectedRefund.refundMethod || 'wallet'}</p>
                    </div>
                  </div>
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
                      <p className="text-sm text-gray-600">Delivery Partner</p>
                      <p className="font-medium text-gray-900">{selectedRefund.deliveryPartnerName || 'N/A'}</p>
                    </div>
                    {selectedRefund.transactionHash && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Transaction Hash</p>
                        <p className="font-medium text-gray-900 break-all">{selectedRefund.transactionHash}</p>
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
            <div className="flex space-x-3 mt-6 pt-6 border-t">
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
                  <Check size={18} className="mr-2" />
                  {selectedRefund.status === 'pending' ? 'Process Refund' : 'Complete Refund'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Process Refund Modal */}
      {showProcessModal && selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="flex items-center space-x-3 mb-6">
              {action === 'approve' ? (
                <CheckCircle size={32} className="text-green-600" />
              ) : action === 'complete' ? (
                <DollarSign size={32} className="text-blue-600" />
              ) : (
                <XCircle size={32} className="text-red-600" />
              )}
              <h2 className="text-2xl font-bold text-gray-900">
                {action === 'approve' ? 'Approve Refund' : 
                 action === 'complete' ? 'Complete Refund' : 'Reject Refund'}
              </h2>
            </div>

            <p className="text-gray-600 mb-6">
              You are about to <strong>{action}</strong> the refund for Order #{selectedRefund.orderNumber}.
              Amount: <strong className="text-red-600">₹{selectedRefund.totalAmount?.toFixed(2) || '0.00'}</strong>
            </p>

            {action === 'complete' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Hash *
                </label>
                <input
                  type="text"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  placeholder="Enter blockchain transaction hash"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is required to verify the refund transaction
                </p>
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
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowProcessModal(false);
                  setAction('');
                  setTransactionHash('');
                  setProcessingNotes('');
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                onClick={handleProcessRefund}
                disabled={processingAction || (action === 'complete' && !transactionHash.trim()) || (action === 'reject' && !processingNotes.trim())}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {processingAction ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Processing...
                  </>
                ) : (
                  <>
                    {action === 'approve' ? 'Approve' : 
                     action === 'complete' ? 'Complete' : 'Reject'} Refund
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