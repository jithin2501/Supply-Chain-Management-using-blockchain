import React, { useState, useEffect } from 'react';
import {
  Package, Truck, MapPin, Clock, CheckCircle, XCircle,
  ArrowLeft, Star, MessageSquare, RotateCcw, AlertCircle,
  Phone, Mail, ChevronRight, CheckCircle2, Home, Key,
  RefreshCw, Info, X, Calendar, DollarSign, FileText,
  ClipboardCheck, Shield, History, ExternalLink, Download,
  ThumbsUp, ThumbsDown, Check, X as XIcon, Loader2, Filter,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

export default function CustomerOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReturnStatusModal, setShowReturnStatusModal] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 0, comment: '' });
  const [returnReason, setReturnReason] = useState('');
  const [returnStatus, setReturnStatus] = useState({});
  const [processingReturn, setProcessingReturn] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, active, delivered, returns

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/customer/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReturnStatus = async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/return-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch return status');
      
      const data = await response.json();
      setReturnStatus(data);
      setSelectedOrder(prev => prev ? { ...prev, returnRequest: data.returnRequest } : null);
      return data;
    } catch (error) {
      console.error('Error fetching return status:', error);
      alert('Failed to load return status. Please try again.');
      return null;
    }
  };

  const getFilteredOrders = () => {
    switch (activeTab) {
      case 'active':
        return orders.filter(order => 
          ['pending', 'confirmed', 'processing', 'out_for_delivery', 'near_location'].includes(order.status)
        );
      case 'delivered':
        return orders.filter(order => order.status === 'delivered');
      case 'returns':
        return orders.filter(order => 
          order.status === 'return_requested' || 
          order.status === 'returned' ||
          order.status === 'out_for_pickup' ||
          order.status === 'pickup_completed' ||
          order.status === 'refund_requested' ||
          (order.returnRequest && order.returnRequest.requested)
        );
      default:
        return orders;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-indigo-100 text-indigo-800',
      out_for_delivery: 'bg-purple-100 text-purple-800',
      near_location: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      returned: 'bg-gray-100 text-gray-800',
      return_requested: 'bg-red-100 text-red-800',
      out_for_pickup: 'bg-purple-100 text-purple-800',
      pickup_completed: 'bg-blue-100 text-blue-800',
      refund_requested: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      confirmed: CheckCircle,
      processing: Package,
      out_for_delivery: Truck,
      near_location: MapPin,
      delivered: CheckCircle2,
      cancelled: XCircle,
      returned: RotateCcw,
      return_requested: RotateCcw,
      out_for_pickup: Truck,
      pickup_completed: CheckCircle
    };
    return icons[status] || Clock;
  };

  const handleFeedbackSubmit = async () => {
    try {
      const response = await fetch(`${API_URL}/orders/${selectedOrder._id}/feedback/${selectedProduct._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(feedback)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Feedback submission failed');
      }

      alert('Thank you for your feedback!');
      setShowFeedbackModal(false);
      setFeedback({ rating: 0, comment: '' });
      fetchOrders();
    } catch (error) {
      alert(`Failed to submit feedback: ${error.message}`);
    }
  };

  const handleReturnRequest = async () => {
    if (!returnReason.trim()) {
      alert('Please select a reason for return');
      return;
    }

    try {
      setProcessingReturn(true);
      const response = await fetch(`${API_URL}/orders/${selectedOrder._id}/return`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: returnReason })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Return request failed');
      }

      alert('✅ Return request submitted successfully!');
      setShowReturnModal(false);
      setReturnReason('');
      setProcessingReturn(false);
      
      fetchOrders();
      fetchReturnStatus(selectedOrder._id);
      setShowReturnStatusModal(true);
      
    } catch (error) {
      console.error('Return request error:', error);
      alert(`Failed to submit return request: ${error.message}`);
      setProcessingReturn(false);
    }
  };

  const handleCancelReturn = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this return request?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/cancel-return`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to cancel return');
      }

      alert('Return request cancelled successfully');
      setShowReturnStatusModal(false);
      fetchOrders();
    } catch (error) {
      alert(`Failed to cancel return: ${error.message}`);
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

  const getReturnStatusText = (returnRequest) => {
    if (!returnRequest) return null;
    
    const statusMap = {
      'pending': { text: 'Pending Approval', color: 'text-yellow-800', bg: 'bg-yellow-100' },
      'approved': { text: 'Approved', color: 'text-green-800', bg: 'bg-green-100' },
      'rejected': { text: 'Rejected', color: 'text-red-800', bg: 'bg-red-100' },
      'out_for_pickup': { text: 'Out for Pickup', color: 'text-blue-800', bg: 'bg-blue-100' },
      'pickup_near_location': { text: 'Near Location', color: 'text-purple-800', bg: 'bg-purple-100' },
      'pickup_otp_generated': { text: 'OTP Generated', color: 'text-indigo-800', bg: 'bg-indigo-100' },
      'pickup_completed': { text: 'Pickup Completed', color: 'text-green-800', bg: 'bg-green-100' },
      'refund_requested': { text: 'Refund Requested', color: 'text-orange-800', bg: 'bg-orange-100' },
      'refund_approved': { text: 'Refund Approved', color: 'text-green-800', bg: 'bg-green-100' },
      'refund_processing': { text: 'Refund Processing', color: 'text-blue-800', bg: 'bg-blue-100' },
      'refund_completed': { text: 'Refund Completed', color: 'text-green-800', bg: 'bg-green-100' }
    };
    
    return statusMap[returnRequest.status] || { text: returnRequest.status, color: 'text-gray-800', bg: 'bg-gray-100' };
  };

  const downloadReturnInstructions = (order) => {
    const instructions = `
RETURN INSTRUCTIONS
Order #${order.orderNumber}
Generated: ${new Date().toLocaleString()}

RETURN DETAILS:
- Order Total: ₹${order.totalAmount}
- Return Reason: ${order.returnRequest?.reason}
- Requested: ${formatDate(order.returnRequest?.requestedAt)}

PICKUP ADDRESS:
${order.deliveryAddress?.name}
${order.deliveryAddress?.street}
${order.deliveryAddress?.city}, ${order.deliveryAddress?.state} ${order.deliveryAddress?.pincode}
Phone: ${order.deliveryAddress?.phone}

INSTRUCTIONS:
1. Keep product in original packaging with all accessories
2. Do not remove any labels, tags, or warranty cards
3. Delivery partner will contact you for pickup scheduling
4. Have your ID ready for verification during pickup
5. Refund will be processed within 5-7 business days after pickup

STATUS: ${order.returnRequest?.status}
    `;
    
    const blob = new Blob([instructions], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Return_Instructions_${order.orderNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTabCounts = () => {
    return {
      all: orders.length,
      active: orders.filter(o => ['pending', 'confirmed', 'processing', 'out_for_delivery', 'near_location'].includes(o.status)).length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      returns: orders.filter(o => 
        o.status === 'return_requested' || 
        o.status === 'returned' ||
        o.status === 'out_for_pickup' ||
        o.status === 'pickup_completed' ||
        o.status === 'refund_requested' ||
        (o.returnRequest && o.returnRequest.requested)
      ).length
    };
  };

  const isReturnEligible = (order) => {
    if (order.status !== 'delivered') return false;
    if (order.returnRequest && order.returnRequest.requested) return false;
    
    if (!order.deliveredAt) return false;
    
    const deliveredDate = new Date(order.deliveredAt);
    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate - deliveredDate) / (1000 * 60 * 60 * 24));
    
    return daysDiff <= 14;
  };

  const filteredOrders = getFilteredOrders();
  const tabCounts = getTabCounts();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-700 font-medium">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/main')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft size={24} className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
                <p className="text-sm text-gray-500">Track and manage your orders</p>
              </div>
            </div>
            <button
              onClick={fetchOrders}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <RefreshCw size={18} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 border-b overflow-x-auto">
            {[
              { id: 'all', label: 'All Orders', icon: Package },
              { id: 'active', label: 'Active', icon: Truck },
              { id: 'delivered', label: 'Delivered', icon: CheckCircle },
              { id: 'returns', label: 'Returns', icon: RotateCcw }
            ].map(tab => {
              const Icon = tab.icon;
              const count = tabCounts[tab.id];
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{tab.label}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <Package size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No orders found
            </h3>
            <p className="text-gray-500 mb-6">
              {activeTab === 'all' ? "You haven't placed any orders yet." : 
               activeTab === 'active' ? "You don't have any active orders." :
               activeTab === 'delivered' ? "No delivered orders yet." :
               "No return requests."}
            </p>
            {activeTab === 'all' && (
              <button
                onClick={() => navigate('/customer/products')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Browse Products
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => {
              const StatusIcon = getStatusIcon(order.status);
              const canReturn = isReturnEligible(order);
              const hasReturn = order.returnRequest?.requested;
              const canSubmitFeedback = order.status === 'delivered' && !hasReturn;
              
              return (
                <div key={order._id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden">
                  <div className="p-6">
                    {/* Order Header */}
                    <div className="flex flex-wrap items-center justify-between mb-4 pb-4 border-b">
                      <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <Package className="text-blue-600" size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Order Number</p>
                          <p className="font-bold text-lg text-gray-900">#{order.orderNumber}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-2 ${getStatusColor(order.status)}`}>
                          <StatusIcon size={16} />
                          <span>{order.status.replace(/_/g, ' ').toUpperCase()}</span>
                        </span>
                      </div>
                    </div>

                    {/* Order Info Grid */}
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <Calendar className="text-gray-400" size={20} />
                        <div>
                          <p className="text-xs text-gray-500">Order Date</p>
                          <p className="font-medium text-gray-900">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <DollarSign className="text-green-500" size={20} />
                        <div>
                          <p className="text-xs text-gray-500">Total Amount</p>
                          <p className="font-bold text-lg text-green-600">₹{order.totalAmount?.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Package className="text-gray-400" size={20} />
                        <div>
                          <p className="text-xs text-gray-500">Items</p>
                          <p className="font-medium text-gray-900">{order.items?.length || 0} item(s)</p>
                        </div>
                      </div>
                    </div>

                    {/* Return Status Alert */}
                    {hasReturn && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start space-x-3">
                          <RotateCcw className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
                          <div className="flex-1">
                            <p className="font-semibold text-orange-900">Return Request Active</p>
                            <p className="text-sm text-orange-700 mt-1">
                              Status: {getReturnStatusText(order.returnRequest)?.text}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              fetchReturnStatus(order._id);
                              setShowReturnStatusModal(true);
                            }}
                            className="text-orange-600 hover:text-orange-700 font-medium text-sm whitespace-nowrap"
                          >
                            View Details →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                      >
                        <Eye size={16} className="mr-2" />
                        View Details
                      </button>
                      
                      {canReturn && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowReturnModal(true);
                          }}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center"
                        >
                          <RotateCcw size={16} className="mr-2" />
                          Request Return
                        </button>
                      )}
                      
                      {canSubmitFeedback && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            if (order.items && order.items.length > 0) {
                              setSelectedProduct(order.items[0]?.product);
                            }
                            setShowFeedbackModal(true);
                          }}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition flex items-center"
                        >
                          <Star size={16} className="mr-2" />
                          Rate Product
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && !showFeedbackModal && !showReturnModal && !showReturnStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Order Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Number:</span>
                      <span className="font-medium">#{selectedOrder.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Date:</span>
                      <span className="font-medium">{formatDate(selectedOrder.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-bold text-green-600">₹{selectedOrder.totalAmount?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Delivery Address</h3>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{selectedOrder.deliveryAddress?.name}</p>
                    <p className="text-gray-600">{selectedOrder.deliveryAddress?.street}</p>
                    <p className="text-gray-600">
                      {selectedOrder.deliveryAddress?.city}, {selectedOrder.deliveryAddress?.state} {selectedOrder.deliveryAddress?.pincode}
                    </p>
                    <p className="text-gray-600 flex items-center mt-2">
                      <Phone size={14} className="mr-2" />
                      {selectedOrder.deliveryAddress?.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <img 
                        src={item.product?.image || '/placeholder.png'} 
                        alt={item.product?.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.product?.name}</h4>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        <p className="text-sm font-semibold text-gray-900">₹{item.price?.toFixed(2)} each</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">₹{(item.price * item.quantity)?.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracking History */}
              {selectedOrder.trackingHistory && selectedOrder.trackingHistory.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <History size={18} className="mr-2 text-blue-600" />
                    Order Timeline
                  </h3>
                  <div className="space-y-4">
                    {selectedOrder.trackingHistory.map((event, idx) => (
                      <div key={idx} className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle size={20} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 capitalize">
                            {event.status?.replace(/_/g, ' ') || 'Update'}
                          </p>
                          <p className="text-sm text-gray-600">{event.message || 'No message'}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t p-6">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedOrder && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Rate Product</h2>
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedback({ rating: 0, comment: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">How would you rate {selectedProduct?.name}?</p>
              
              <div className="flex space-x-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFeedback({ ...feedback, rating: star })}
                    className={`p-2 rounded-lg transition ${
                      feedback.rating >= star
                        ? 'text-yellow-500'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  >
                    <Star size={32} fill={feedback.rating >= star ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review (Optional)
                </label>
                <textarea
                  value={feedback.comment}
                  onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  placeholder="Share your experience with this product..."
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedback({ rating: 0, comment: '' });
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleFeedbackSubmit}
                disabled={feedback.rating === 0}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Request Modal */}
      {showReturnModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Request Return</h2>
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnReason('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Order #{selectedOrder.orderNumber}
              </p>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Return *
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a reason</option>
                <option value="quality_issues">Quality Issues</option>
                <option value="wrong_product">Wrong Product Received</option>
                <option value="damaged">Product Damaged</option>
                <option value="not_as_described">Not as Described</option>
                <option value="changed_mind">Changed Mind</option>
                <option value="other">Other</option>
              </select>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Return must be requested within 14 days of delivery. 
                  Product should be in original packaging with all accessories.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnReason('');
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                disabled={processingReturn}
              >
                Cancel
              </button>
              <button
                onClick={handleReturnRequest}
                disabled={!returnReason.trim() || processingReturn}
                className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {processingReturn ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Processing...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Status Modal */}
      {showReturnStatusModal && selectedOrder && selectedOrder.returnRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Return Status</h2>
                <button
                  onClick={() => setShowReturnStatusModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {(() => {
                const returnStatusInfo = getReturnStatusText(selectedOrder.returnRequest);
                
                return (
                  <>
                    {/* Return Status Card */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl">
                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <div className="flex items-center mb-2">
                            <Calendar size={18} className="text-blue-600 mr-2" />
                            <span className="text-sm text-gray-600">Requested</span>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {formatDate(selectedOrder.returnRequest?.requestedAt)}
                          </p>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <div className="flex items-center mb-2">
                            <ClipboardCheck size={18} className="text-green-600 mr-2" />
                            <span className="text-sm text-gray-600">Status</span>
                          </div>
                          {returnStatusInfo && (
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${returnStatusInfo.bg} ${returnStatusInfo.color}`}>
                              {returnStatusInfo.text}
                            </span>
                          )}
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <div className="flex items-center mb-2">
                            <DollarSign size={18} className="text-green-600 mr-2" />
                            <span className="text-sm text-gray-600">Refund Amount</span>
                          </div>
                          <p className="font-bold text-xl text-green-600">
                            ₹{selectedOrder.totalAmount?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Return Details */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Info size={18} className="mr-2 text-blue-600" />
                        Return Details
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Reason</p>
                            <p className="font-medium text-gray-900">{selectedOrder.returnRequest?.reason || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Pickup Contact</p>
                            <p className="font-medium text-gray-900">{selectedOrder.deliveryAddress?.phone || 'N/A'}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-600">Address</p>
                            <p className="font-medium text-gray-900">{selectedOrder.deliveryAddress?.street || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Return Timeline */}
                    {returnStatus.returnTracking && returnStatus.returnTracking.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <History size={18} className="mr-2 text-blue-600" />
                          Return Timeline
                        </h3>
                        <div className="space-y-4">
                          {returnStatus.returnTracking.map((event, idx) => {
                            const isApproved = event.status.includes('approved');
                            const isRejected = event.status.includes('rejected');
                            const Icon = isApproved ? CheckCircle : isRejected ? XCircle : RotateCcw;
                            const iconColor = isApproved ? 'text-green-600' : isRejected ? 'text-red-600' : 'text-blue-600';
                            
                            return (
                              <div key={idx} className="flex items-start space-x-4">
                                <div className={`w-10 h-10 rounded-full ${isApproved ? 'bg-green-100' : isRejected ? 'bg-red-100' : 'bg-blue-100'} flex items-center justify-center flex-shrink-0`}>
                                  <Icon size={20} className={iconColor} />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900 capitalize">
                                    {event.status?.replace('return_', '').replace(/_/g, ' ') || 'Update'}
                                  </p>
                                  <p className="text-sm text-gray-600">{event.message || 'No message'}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatDate(event.timestamp)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Return Instructions */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <FileText size={18} className="mr-2 text-blue-600" />
                        Return Instructions
                      </h3>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <ul className="text-sm text-blue-800 space-y-2">
                          <li className="flex items-start">
                            <Check size={16} className="text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>Keep product in original packaging with all accessories</span>
                          </li>
                          <li className="flex items-start">
                            <Check size={16} className="text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>Do not remove any labels, tags, or warranty cards</span>
                          </li>
                          <li className="flex items-start">
                            <Check size={16} className="text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>Delivery partner will contact you for pickup scheduling</span>
                          </li>
                          <li className="flex items-start">
                            <Check size={16} className="text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>Have your ID ready for verification during pickup</span>
                          </li>
                          <li className="flex items-start">
                            <Check size={16} className="text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>Refund will be processed within 5-7 business days after pickup</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="sticky bottom-0 bg-white border-t p-6">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => downloadReturnInstructions(selectedOrder)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                >
                  <Download size={18} className="mr-2" />
                  Download Instructions
                </button>
                
                {selectedOrder.returnRequest?.status === 'pending' && (
                  <button
                    onClick={() => handleCancelReturn(selectedOrder._id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center"
                  >
                    <XIcon size={18} className="mr-2" />
                    Cancel Return
                  </button>
                )}
                
                <button
                  onClick={() => setShowReturnStatusModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}