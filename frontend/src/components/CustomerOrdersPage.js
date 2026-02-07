import React, { useState, useEffect } from 'react';
import {
  Package, Truck, MapPin, Clock, CheckCircle, XCircle,
  ArrowLeft, Star, MessageSquare, RotateCcw, AlertCircle,
  Phone, Mail, ChevronRight, CheckCircle2, Home, Key,
  RefreshCw, Info, X, Calendar, DollarSign, FileText,
  ClipboardCheck, Shield, History, ExternalLink, Download,
  ThumbsUp, ThumbsDown, Check, X as XIcon, Loader2
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
      return_approved: 'bg-blue-100 text-blue-800',
      return_rejected: 'bg-red-100 text-red-800',
      return_picked_up: 'bg-purple-100 text-purple-800',
      return_completed: 'bg-green-100 text-green-800'
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
      return_approved: CheckCircle,
      return_rejected: XCircle
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
      
      // Fetch updated orders and return status
      fetchOrders();
      fetchReturnStatus(selectedOrder._id);
      
      // Show return status modal
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

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel return request');
      }

      alert('Return request cancelled successfully!');
      fetchOrders();
      setShowReturnStatusModal(false);
    } catch (error) {
      alert(`Failed to cancel return request: ${error.message}`);
    }
  };

  const isReturnEligible = (order) => {
    if (order.status !== 'delivered') return false;
    
    if (!order.deliveredAt) return false;
    
    const deliveredDate = new Date(order.deliveredAt);
    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate - deliveredDate) / (1000 * 60 * 60 * 24));
    
    return daysDiff <= 14;
  };

  const getReturnStatusText = (returnRequest) => {
    if (!returnRequest || !returnRequest.requested) return null;
    
    const status = returnRequest.status || 'pending';
    const statusMap = {
      'pending': { text: 'Pending Review', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
      'approved': { text: 'Approved', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
      'rejected': { text: 'Rejected', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
      'pickup_scheduled': { text: 'Pickup Scheduled', color: 'text-blue-600', bg: 'bg-blue-100', icon: Calendar },
      'picked_up': { text: 'Picked Up', color: 'text-purple-600', bg: 'bg-purple-100', icon: Package },
      'in_transit': { text: 'In Transit', color: 'text-indigo-600', bg: 'bg-indigo-100', icon: Truck },
      'received_at_warehouse': { text: 'Received at Warehouse', color: 'text-teal-600', bg: 'bg-teal-100', icon: Home },
      'refund_initiated': { text: 'Refund Initiated', color: 'text-orange-600', bg: 'bg-orange-100', icon: DollarSign },
      'refund_completed': { text: 'Refund Completed', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 }
    };
    
    return statusMap[status] || { 
      text: 'Pending', 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-100', 
      icon: Clock 
    };
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

  const generateReturnInstructions = (order) => {
    if (!order.returnRequest) return '';
    
    const statusInfo = getReturnStatusText(order.returnRequest);
    
    const instructions = `
      RETURN INSTRUCTIONS - ORDER #${order.orderNumber}
      
      Customer: ${order.deliveryAddress?.name || 'N/A'}
      Address: ${order.deliveryAddress?.street || 'N/A'}, ${order.deliveryAddress?.city || 'N/A'}
      Phone: ${order.deliveryAddress?.phone || 'N/A'}
      
      Return Requested: ${formatDate(order.returnRequest.requestedAt)}
      Reason: ${order.returnRequest.reason || 'N/A'}
      Status: ${statusInfo?.text || 'Pending'}
      ${order.returnRequest.pickupSchedule?.date ? `Pickup Date: ${order.returnRequest.pickupSchedule.date}` : ''}
      ${order.returnRequest.pickupSchedule?.time ? `Pickup Time: ${order.returnRequest.pickupSchedule.time}` : ''}
      
      Instructions:
      1. Keep the product in original packaging
      2. Include all accessories and documentation
      3. Do not remove any labels or tags
      4. Wait for delivery partner to contact you for pickup
      5. Have your ID ready for verification
      
      Important Notes:
      - Return pickup is FREE of charge
      - Refund will be processed within 5-7 business days after pickup
      - Contact customer support for any queries
      
      Generated on: ${new Date().toLocaleDateString()}
    `;
    
    return instructions;
  };

  const downloadReturnInstructions = (order) => {
    const instructions = generateReturnInstructions(order);
    const blob = new Blob([instructions], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Return_Instructions_${order.orderNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getDaysSinceDelivery = (deliveredAt) => {
    if (!deliveredAt) return null;
    try {
      const deliveredDate = new Date(deliveredAt);
      if (isNaN(deliveredDate.getTime())) return null;
      const currentDate = new Date();
      return Math.floor((currentDate - deliveredDate) / (1000 * 60 * 60 * 24));
    } catch (error) {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600">Loading your orders...</p>
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
                onClick={() => navigate('/main')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
                <p className="text-sm text-gray-600">{orders.length} total orders</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/customer/products')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <Package size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-600 mb-6">Start shopping to see your orders here</p>
            <button
              onClick={() => navigate('/customer/products')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const StatusIcon = getStatusIcon(order.status);
              const canReturn = isReturnEligible(order);
              const canSubmitFeedback = order.status === 'delivered';
              const returnStatusInfo = getReturnStatusText(order.returnRequest);
              const hasReturnRequest = order.returnRequest && order.returnRequest.requested;
              const daysSinceDelivery = getDaysSinceDelivery(order.deliveredAt);
              
              const reviewedProductIds = order.feedback?.map(f => f.productId?.toString()) || [];
              const unreviewedProducts = order.items
                .filter(item => !reviewedProductIds.includes(item.product?._id?.toString()))
                .map(item => item.product);

              return (
                <div key={order._id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Order Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">Order #{order.orderNumber}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                            {order.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          {hasReturnRequest && returnStatusInfo && (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${returnStatusInfo.bg} ${returnStatusInfo.color}`}>
                              Return: {returnStatusInfo.text}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Placed on {formatDate(order.createdAt)}
                          {order.deliveredAt && (
                            <span className="ml-4">
                              • Delivered on {formatDate(order.deliveredAt)}
                              {daysSinceDelivery !== null && (
                                <span className="ml-2">({daysSinceDelivery} days ago)</span>
                              )}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">₹{order.totalAmount?.toFixed(2) || '0.00'}</p>
                        <p className="text-sm text-gray-600">{order.items?.length || 0} item(s)</p>
                      </div>
                    </div>

                    {/* Return Request Banner */}
                    {hasReturnRequest && (
                      <div className={`mb-4 p-4 rounded-lg ${returnStatusInfo?.bg} border ${returnStatusInfo?.color.replace('text', 'border')}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {returnStatusInfo?.icon && <returnStatusInfo.icon size={20} className={returnStatusInfo?.color} />}
                            <div>
                              <p className="font-semibold">Return Request Submitted</p>
                              <p className="text-sm">
                                <span className="font-medium">Reason:</span> {order.returnRequest.reason} • 
                                <span className="font-medium ml-2">Status:</span> {returnStatusInfo?.text} • 
                                <span className="font-medium ml-2">Requested:</span> {formatDate(order.returnRequest.requestedAt)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              fetchReturnStatus(order._id);
                              setShowReturnStatusModal(true);
                            }}
                            className="px-3 py-1 bg-white rounded text-sm font-medium hover:bg-gray-50"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Delivery OTP Section */}
                    {(order.status === 'out_for_delivery' || order.status === 'near_location') && order.deliveryOTP && (
                      <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Key className="text-purple-600" size={24} />
                            <div>
                              <p className="font-semibold text-purple-900">Delivery Verification OTP</p>
                              <p className="text-sm text-purple-700">
                                Provide this OTP to the delivery partner when they arrive
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-purple-900 tracking-wider">
                              {order.deliveryOTP}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Products in Order */}
                    <div className="space-y-3">
                      {order.items?.map((item, idx) => {
                        const isReviewed = reviewedProductIds.includes(item.product?._id?.toString());
                        return (
                          <div key={idx} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                            <img
                              src={item.product?.image}
                              alt={item.product?.name}
                              className="w-16 h-16 object-cover rounded-lg"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/64x64?text=Product';
                              }}
                            />
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{item.product?.name || 'Product'}</h4>
                              <p className="text-sm text-gray-600">Quantity: {item.quantity} × ₹{item.price?.toFixed(2) || '0.00'}</p>
                              
                              {/* Show if reviewed */}
                              {isReviewed && (
                                <div className="flex items-center mt-1">
                                  <Star size={14} className="text-yellow-400 fill-yellow-400 mr-1" />
                                  <span className="text-xs text-gray-600">Reviewed</span>
                                </div>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900">₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delivery Information */}
                  <div className="p-6 bg-gray-50 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <MapPin size={18} className="mr-2 text-blue-600" />
                      Delivery Address
                    </h4>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="font-medium text-gray-900">{order.deliveryAddress?.name || 'N/A'}</p>
                      <p className="text-gray-600 text-sm mt-1">{order.deliveryAddress?.street || 'N/A'}</p>
                      <p className="text-gray-600 text-sm">
                        {order.deliveryAddress?.city || 'N/A'}, {order.deliveryAddress?.state || 'N/A'} {order.deliveryAddress?.pincode || 'N/A'}
                      </p>
                      <p className="text-gray-600 text-sm mt-2 flex items-center">
                        <Phone size={14} className="mr-2" />
                        {order.deliveryAddress?.phone || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Tracking Timeline */}
                  <div className="p-6 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <Truck size={18} className="mr-2 text-blue-600" />
                      Order Tracking
                    </h4>
                    <div className="space-y-4">
                      {order.trackingHistory?.map((event, idx) => (
                        <div key={idx} className="flex items-start space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            event.status === order.status ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            <StatusIcon size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 capitalize">{event.status?.replace(/_/g, ' ') || 'Update'}</p>
                            <p className="text-sm text-gray-600">{event.message || 'No message'}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(event.timestamp)}
                            </p>
                            {event.deliveryPartner && (
                              <p className="text-xs text-gray-600 mt-1">
                                Delivery Partner: {event.deliveryPartner.name} - {event.deliveryPartner.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-6 bg-white">
                    <div className="flex flex-wrap gap-3">
                      {canSubmitFeedback && unreviewedProducts.length > 0 && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setSelectedProduct(unreviewedProducts[0]);
                            setShowFeedbackModal(true);
                          }}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                        >
                          <Star size={18} className="mr-2" />
                          Rate & Review ({unreviewedProducts.length} items)
                        </button>
                      )}

                      {canReturn && !hasReturnRequest && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowReturnModal(true);
                          }}
                          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center"
                        >
                          <RotateCcw size={18} className="mr-2" />
                          Return Order
                        </button>
                      )}

                      {hasReturnRequest && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            fetchReturnStatus(order._id);
                            setShowReturnStatusModal(true);
                          }}
                          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center"
                        >
                          <History size={18} className="mr-2" />
                          View Return Status
                        </button>
                      )}

                      {order.feedback?.length > 0 && (
                        <div className="px-6 py-3 bg-green-100 rounded-lg flex items-center text-green-800">
                          <CheckCircle size={18} className="mr-2" />
                          Feedback Submitted ({order.feedback.length}/{order.items?.length || 0})
                        </div>
                      )}

                      {order.status === 'delivered' && order.feedback?.length === order.items?.length && (
                        <div className="px-6 py-3 bg-gray-100 rounded-lg flex items-center text-gray-600">
                          <CheckCircle size={18} className="mr-2" />
                          All Items Reviewed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && selectedOrder && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Rate Your Product</h2>
            
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="w-16 h-16 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/64x64?text=Product';
                  }}
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedProduct.name || 'Product'}</h3>
                  <p className="text-sm text-gray-600">From Order #{selectedOrder.orderNumber}</p>
                </div>
              </div>
              
              <p className="text-gray-700 font-medium mb-3">How would you rate this product?</p>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFeedback({ ...feedback, rating: star })}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={40}
                      className={star <= feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Your Review (Optional)</label>
              <textarea
                value={feedback.comment}
                onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                placeholder="Tell us about this product..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                rows="4"
              />
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
            <div className="flex items-center space-x-3 mb-4">
              <RotateCcw size={24} className="text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-900">Return Request</h2>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg mb-6">
              <div className="flex items-start">
                <AlertCircle size={18} className="text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-orange-800">
                    <strong>Return Policy:</strong> You can return this order within 14 days of delivery.
                    Refunds will be processed within 5-7 business days after pickup.
                  </p>
                  <p className="text-sm text-orange-700 mt-2">
                    <strong>Order #{selectedOrder.orderNumber}</strong> • Delivered on {formatDate(selectedOrder.deliveredAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Reason for Return *</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a reason</option>
                <option value="defective">Product is defective/damaged</option>
                <option value="wrong_item">Wrong item received</option>
                <option value="not_as_described">Not as described</option>
                <option value="quality_issues">Quality issues</option>
                <option value="size_fit">Size/fit issues</option>
                <option value="changed_mind">Changed my mind</option>
                <option value="other">Other</option>
              </select>
              
              {returnReason === 'other' && (
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Please specify the reason..."
                  className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                />
              )}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Return Instructions:</h3>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Keep the product in original packaging with all accessories</li>
                <li>Do not remove any labels or tags</li>
                <li>Delivery partner will contact you for pickup</li>
                <li>Pickup is FREE of charge</li>
                <li>Refund will be issued to original payment method</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnReason('');
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReturnRequest}
                disabled={!returnReason || processingReturn}
                className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {processingReturn ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Submitting...
                  </>
                ) : (
                  <>
                    <RotateCcw size={18} className="mr-2" />
                    Submit Return Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Status Modal */}
      {showReturnStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <RotateCcw size={32} className="text-purple-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Return Request Status</h2>
                  <p className="text-gray-600">Order #{selectedOrder.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReturnStatusModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XIcon size={24} />
              </button>
            </div>

            {/* Calculate returnStatusInfo inside the modal */}
            {(() => {
              const returnStatusInfo = getReturnStatusText(selectedOrder.returnRequest);
              
              return (
                <>
                  {/* Return Status Card */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl mb-6">
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
                  <div className="space-y-6">
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
                            <p className="text-sm text-gray-600">Delivery Partner</p>
                            <p className="font-medium text-gray-900">
                              {selectedOrder.deliveryPartner?.name || 'Will be assigned'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Pickup Contact</p>
                            <p className="font-medium text-gray-900">{selectedOrder.deliveryAddress?.phone || 'N/A'}</p>
                          </div>
                          <div>
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
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
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
                        Cancel Return Request
                      </button>
                    )}
                    
                    <button
                      onClick={() => setShowReturnStatusModal(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition ml-auto"
                    >
                      Close
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}