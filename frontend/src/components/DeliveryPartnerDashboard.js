import React, { useState, useEffect } from 'react';
import {
  Truck, Package, MapPin, CheckCircle, Navigation,
  Phone, Clock, AlertCircle, LogOut, RefreshCw,
  User, Home, Search, List, PlusCircle, Key, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

export default function DeliveryPartnerDashboard() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-assignments');
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    completedToday: 0,
    pending: 0
  });
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showVerifyOTPModal, setShowVerifyOTPModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [generatedOTP, setGeneratedOTP] = useState('');

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchAssignments();
    fetchPendingOrders();
    fetchStats();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/delivery/assignments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch assignments');
      
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/delivery/pending-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch pending orders');
      
      const data = await response.json();
      setPendingOrders(data);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/delivery/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const selfAssignOrder = async (orderId) => {
    if (!window.confirm('Do you want to accept this delivery assignment?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/delivery/self-assign/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign order');
      }

      alert('Order assigned successfully! It now appears in "My Assignments".');
      
      fetchAssignments();
      fetchPendingOrders();
      fetchStats();
      
      setActiveTab('my-assignments');
    } catch (error) {
      alert(`Failed to assign order: ${error.message}`);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/delivery/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');

      alert('Order status updated successfully!');
      fetchAssignments();
      fetchStats();
    } catch (error) {
      alert('Failed to update order status');
    }
  };

  const generateOTP = async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/delivery/orders/${orderId}/generate-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to generate OTP');

      const data = await response.json();
      setGeneratedOTP(data.deliveryOTP);
      alert(`OTP generated: ${data.deliveryOTP}\n\nGive this OTP to the customer and ask them to provide it back to you for delivery verification.`);
      
      fetchAssignments();
    } catch (error) {
      alert('Failed to generate OTP');
    }
  };

  const verifyCustomerOTP = async (orderId) => {
    const enteredOTP = otpInput.join('');
    
    try {
      const response = await fetch(`${API_URL}/delivery/orders/${orderId}/verify-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ otp: enteredOTP })
      });

      if (!response.ok) throw new Error('OTP verification failed');

      alert('Delivery verified successfully!');
      setShowVerifyOTPModal(false);
      setOtpInput(['', '', '', '', '', '']);
      fetchAssignments();
      fetchStats();
    } catch (error) {
      alert('Invalid OTP. Please ask customer for the correct OTP.');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-indigo-100 text-indigo-800',
      out_for_delivery: 'bg-purple-100 text-purple-800',
      near_location: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleRefresh = () => {
    fetchAssignments();
    fetchPendingOrders();
    fetchStats();
  };

  const handleOTPChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOTP = [...otpInput];
      newOTP[index] = value;
      setOtpInput(newOTP);

      if (value && index < 5) {
        document.getElementById(`delivery-otp-${index + 1}`).focus();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Truck className="animate-bounce mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600">Loading deliveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Truck size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Delivery Partner Dashboard</h1>
                <p className="text-blue-100">Welcome back, {user.name}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center space-x-2"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Total Deliveries</p>
                  <p className="text-3xl font-bold">{stats.totalDeliveries}</p>
                </div>
                <Package size={32} className="text-blue-200" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Completed Today</p>
                  <p className="text-3xl font-bold">{stats.completedToday}</p>
                </div>
                <CheckCircle size={32} className="text-green-300" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Pending</p>
                  <p className="text-3xl font-bold">{stats.pending}</p>
                </div>
                <Clock size={32} className="text-yellow-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('my-assignments')}
              className={`px-6 py-3 rounded-lg font-semibold transition flex items-center space-x-2 ${
                activeTab === 'my-assignments'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List size={18} />
              <span>My Assignments ({assignments.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('available-orders')}
              className={`px-6 py-3 rounded-lg font-semibold transition flex items-center space-x-2 ${
                activeTab === 'available-orders'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <PlusCircle size={18} />
              <span>Available Orders ({pendingOrders.length})</span>
            </button>
          </div>
          
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
          >
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'my-assignments' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Active Deliveries</h2>
            
            {assignments.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                <Package size={64} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No active assignments</h3>
                <p className="text-gray-600 mb-4">Pick up new orders from the "Available Orders" tab</p>
                <button
                  onClick={() => setActiveTab('available-orders')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center"
                >
                  <PlusCircle size={18} className="mr-2" />
                  View Available Orders
                </button>
              </div>
            ) : (
              <div className="grid gap-6">
                {assignments.map((assignment) => (
                  <OrderCard
                    key={assignment._id}
                    order={assignment}
                    getStatusColor={getStatusColor}
                    updateOrderStatus={updateOrderStatus}
                    generateOTP={generateOTP}
                    setSelectedOrder={setSelectedOrder}
                    setShowOTPModal={setShowOTPModal}
                    setShowVerifyOTPModal={setShowVerifyOTPModal}
                    showActions={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'available-orders' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Orders to Pick Up</h2>
            
            {pendingOrders.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                <Package size={64} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No available orders</h3>
                <p className="text-gray-600">Check back later for new delivery opportunities</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {pendingOrders.map((order) => (
                  <div key={order._id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6">
                      {/* Order Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              Order #{order.orderNumber}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                              {order.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Placed {new Date(order.createdAt).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">Total Amount</p>
                          <p className="text-2xl font-bold text-blue-600">₹{order.totalAmount.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <User size={18} className="mr-2 text-blue-600" />
                            Customer Details
                          </h4>
                          <p className="font-medium text-gray-900">{order.deliveryAddress.name}</p>
                          <p className="text-sm text-gray-600 mt-2 flex items-center">
                            <Phone size={14} className="mr-2" />
                            {order.deliveryAddress.phone}
                          </p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <MapPin size={18} className="mr-2 text-blue-600" />
                            Delivery Address
                          </h4>
                          <p className="text-gray-900">{order.deliveryAddress.street}</p>
                          <p className="text-gray-600 text-sm">
                            {order.deliveryAddress.city}, {order.deliveryAddress.state}
                          </p>
                          <p className="text-gray-600 text-sm">{order.deliveryAddress.pincode}</p>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <Package size={18} className="mr-2 text-blue-600" />
                          Items ({order.items.length})
                        </h4>
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                              <img
                                src={item.product.image}
                                alt={item.product.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{item.product.name}</p>
                                <p className="text-sm text-gray-600">Quantity: {item.quantity} × ₹{item.price}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Accept Button */}
                      <button
                        onClick={() => selfAssignOrder(order._id)}
                        className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center font-semibold text-lg"
                      >
                        <PlusCircle size={20} className="mr-2" />
                        Accept this Delivery
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate OTP Modal */}
      {showOTPModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Generate Delivery OTP</h2>
            <p className="text-gray-600 mb-6">
              This OTP will be shown to the customer in their "My Orders" section when the order is out for delivery.
              The customer must provide this OTP back to you for delivery verification.
            </p>

            <div className="bg-blue-50 p-6 rounded-lg mb-6 text-center">
              <Key size={48} className="mx-auto mb-4 text-blue-600" />
              <p className="text-sm text-blue-800 mb-2">OTP for Order #{selectedOrder.orderNumber}</p>
              {generatedOTP ? (
                <div>
                  <p className="text-3xl font-bold text-blue-900 tracking-wider">{generatedOTP}</p>
                  <p className="text-sm text-blue-700 mt-2">Give this to the customer</p>
                </div>
              ) : (
                <p className="text-lg text-blue-700">Click "Generate OTP" below</p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowOTPModal(false);
                  setGeneratedOTP('');
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Close
              </button>
              <button
                onClick={() => generateOTP(selectedOrder._id)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {generatedOTP ? 'Regenerate OTP' : 'Generate OTP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Customer OTP Modal */}
      {showVerifyOTPModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verify Customer OTP</h2>
            <p className="text-gray-600 mb-6">
              Ask the customer for the OTP displayed in their "My Orders" section and enter it below to verify delivery.
            </p>

            <div className="flex justify-center space-x-2 mb-6">
              {otpInput.map((digit, index) => (
                <input
                  key={index}
                  id={`delivery-otp-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOTPChange(index, e.target.value)}
                  className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                />
              ))}
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-yellow-800 flex items-start">
                <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                The customer should see this OTP in their "My Orders" page under Order #{selectedOrder.orderNumber}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowVerifyOTPModal(false);
                  setOtpInput(['', '', '', '', '', '']);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => verifyCustomerOTP(selectedOrder._id)}
                disabled={otpInput.some(d => !d)}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Verify & Mark Delivered
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ 
  order, 
  getStatusColor, 
  updateOrderStatus, 
  generateOTP,
  setSelectedOrder,
  setShowOTPModal,
  setShowVerifyOTPModal,
  showActions 
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6">
        {/* Order Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-bold text-gray-900">
                Order #{order.orderNumber}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                {order.status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Assigned {new Date(order.assignedAt).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="text-right">
            {order.deliveryOTP ? (
              <div>
                <p className="text-sm text-gray-600">Delivery OTP</p>
                <p className="text-3xl font-bold text-green-600">{order.deliveryOTP}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600">Delivery OTP</p>
                <p className="text-lg font-semibold text-gray-400">Not generated</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer & Delivery Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <User size={18} className="mr-2 text-blue-600" />
              Customer Details
            </h4>
            <p className="font-medium text-gray-900">{order.deliveryAddress.name}</p>
            <p className="text-sm text-gray-600 mt-2 flex items-center">
              <Phone size={14} className="mr-2" />
              {order.deliveryAddress.phone}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <MapPin size={18} className="mr-2 text-blue-600" />
              Delivery Address
            </h4>
            <p className="text-gray-900">{order.deliveryAddress.street}</p>
            <p className="text-gray-600 text-sm">
              {order.deliveryAddress.city}, {order.deliveryAddress.state}
            </p>
            <p className="text-gray-600 text-sm">{order.deliveryAddress.pincode}</p>
          </div>
        </div>

        {/* Order Items */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Package size={18} className="mr-2 text-blue-600" />
            Items to Deliver ({order.items.length})
          </h4>
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-12 h-12 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.product.name}</p>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex flex-wrap gap-3">
            {order.status === 'confirmed' && (
              <button
                onClick={() => updateOrderStatus(order._id, 'out_for_delivery')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
              >
                <Truck size={18} className="mr-2" />
                Start Delivery
              </button>
            )}

            {order.status === 'out_for_delivery' && (
              <>
                {!order.deliveryOTP ? (
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowOTPModal(true);
                    }}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center"
                  >
                    <Key size={18} className="mr-2" />
                    Generate OTP
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowVerifyOTPModal(true);
                    }}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
                  >
                    <Lock size={18} className="mr-2" />
                    Verify OTP & Deliver
                  </button>
                )}
                <button
                  onClick={() => updateOrderStatus(order._id, 'near_location')}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center"
                >
                  <MapPin size={18} className="mr-2" />
                  Near Location
                </button>
              </>
            )}

            {order.status === 'near_location' && (
              <button
                onClick={() => {
                  setSelectedOrder(order);
                  setShowVerifyOTPModal(true);
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
              >
                <Lock size={18} className="mr-2" />
                Verify OTP & Deliver
              </button>
            )}

            {order.status === 'delivered' && (
              <div className="px-6 py-3 bg-green-100 text-green-800 rounded-lg flex items-center font-semibold">
                <CheckCircle size={18} className="mr-2" />
                Delivery Completed
              </div>
            )}

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.pincode}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center"
            >
              <Navigation size={18} className="mr-2" />
              Navigate
            </a>
          </div>
        )}

        {/* Important Notice */}
        {order.status !== 'delivered' && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 flex items-start">
              <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
              {order.deliveryOTP ? (
                <>Ask customer for OTP: <span className="font-bold mx-1">{order.deliveryOTP}</span> to complete delivery.</>
              ) : (
                <>Generate OTP when you start delivery. Customer will see it in their "My Orders" page.</>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}