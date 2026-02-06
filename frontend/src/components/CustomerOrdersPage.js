import React, { useState, useEffect } from 'react';
import {
  Package, Truck, MapPin, Clock, CheckCircle, XCircle,
  ArrowLeft, Star, MessageSquare, RotateCcw, AlertCircle,
  Phone, Mail, ChevronRight, CheckCircle2, Home, Key
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
  const [feedback, setFeedback] = useState({ rating: 0, comment: '' });
  const [returnReason, setReturnReason] = useState('');

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
    } finally {
      setLoading(false);
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
      returned: 'bg-gray-100 text-gray-800'
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
      returned: RotateCcw
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

      if (!response.ok) throw new Error('Feedback submission failed');

      alert('Thank you for your feedback!');
      setShowFeedbackModal(false);
      setFeedback({ rating: 0, comment: '' });
      fetchOrders();
    } catch (error) {
      alert('Failed to submit feedback. Please try again.');
    }
  };

  const handleReturnRequest = async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/return`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: returnReason })
      });

      if (!response.ok) throw new Error('Return request failed');

      alert('Return request submitted successfully!');
      setShowReturnModal(false);
      setReturnReason('');
      fetchOrders();
    } catch (error) {
      alert('Failed to submit return request. Please try again.');
    }
  };

  const isReturnEligible = (order) => {
    if (order.status !== 'delivered') return false;
    
    const deliveredDate = new Date(order.deliveredAt);
    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate - deliveredDate) / (1000 * 60 * 60 * 24));
    
    return daysDiff <= 14;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
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
                        </div>
                        <p className="text-sm text-gray-600">
                          Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">₹{order.totalAmount.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">{order.items.length} item(s)</p>
                      </div>
                    </div>

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
                      {order.items.map((item, idx) => {
                        const isReviewed = reviewedProductIds.includes(item.product?._id?.toString());
                        return (
                          <div key={idx} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                            <img
                              src={item.product?.image}
                              alt={item.product?.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{item.product?.name}</h4>
                              <p className="text-sm text-gray-600">Quantity: {item.quantity} × ₹{item.price}</p>
                              
                              {/* Show if reviewed */}
                              {isReviewed && (
                                <div className="flex items-center mt-1">
                                  <Star size={14} className="text-yellow-400 fill-yellow-400 mr-1" />
                                  <span className="text-xs text-gray-600">Reviewed</span>
                                </div>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900">₹{(item.quantity * item.price).toFixed(2)}</p>
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
                      <p className="font-medium text-gray-900">{order.deliveryAddress.name}</p>
                      <p className="text-gray-600 text-sm mt-1">{order.deliveryAddress.street}</p>
                      <p className="text-gray-600 text-sm">
                        {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.pincode}
                      </p>
                      <p className="text-gray-600 text-sm mt-2 flex items-center">
                        <Phone size={14} className="mr-2" />
                        {order.deliveryAddress.phone}
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
                      {order.trackingHistory && order.trackingHistory.map((event, idx) => (
                        <div key={idx} className="flex items-start space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            event.status === order.status ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            <StatusIcon size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 capitalize">{event.status.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-gray-600">{event.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(event.timestamp).toLocaleString('en-IN')}
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

                      {canReturn && (
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

                      {order.feedback?.length > 0 && (
                        <div className="px-6 py-3 bg-green-100 rounded-lg flex items-center text-green-800">
                          <CheckCircle size={18} className="mr-2" />
                          Feedback Submitted ({order.feedback.length}/{order.items.length})
                        </div>
                      )}

                      {order.status === 'delivered' && order.feedback?.length === order.items.length && (
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
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
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

      {/* Return Modal */}
      {showReturnModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Return Request</h2>
            
            <div className="bg-orange-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-orange-800 flex items-start">
                <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                You can return this order within 14 days of delivery.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Reason for Return *</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a reason</option>
                <option value="defective">Product is defective</option>
                <option value="wrong_item">Wrong item received</option>
                <option value="not_as_described">Not as described</option>
                <option value="quality_issues">Quality issues</option>
                <option value="changed_mind">Changed my mind</option>
                <option value="other">Other</option>
              </select>
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
                onClick={() => handleReturnRequest(selectedOrder._id)}
                disabled={!returnReason}
                className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}