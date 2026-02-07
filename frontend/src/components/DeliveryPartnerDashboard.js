import React, { useState, useEffect } from 'react';
import {
  Truck, Package, MapPin, CheckCircle, Navigation,
  Phone, Clock, AlertCircle, LogOut, RefreshCw,
  User, Home, Search, List, PlusCircle, Key, Lock,
  ChevronRight, ArrowLeft, MoreVertical, Edit, Download,
  Eye, EyeOff, Shield, RotateCcw, FileText, Check, X,
  ThumbsUp, ThumbsDown, Calendar, DollarSign, Loader2,
  ShieldCheck, Mail, MessageSquare, PhoneCall, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

export default function DeliveryPartnerDashboard() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-assignments');
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    completedToday: 0,
    pending: 0,
    returns: 0
  });
  const [showOTPConfirmModal, setShowOTPConfirmModal] = useState(false);
  const [showGenerateOTPModal, setShowGenerateOTPModal] = useState(false);
  const [showVerifyOTPModal, setShowVerifyOTPModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReturnDetailsModal, setShowReturnDetailsModal] = useState(false);
  const [showReturnActionModal, setShowReturnActionModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedReturnRequest, setSelectedReturnRequest] = useState(null);
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [otpSentTo, setOtpSentTo] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [returnAction, setReturnAction] = useState('approve');
  const [returnPickupDate, setReturnPickupDate] = useState('');
  const [returnPickupTime, setReturnPickupTime] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Token and user management
  const getToken = () => {
    return localStorage.getItem('token');
  };

  const getUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : {};
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return {};
    }
  };

  const token = getToken();
  const user = getUser();

  useEffect(() => {
    // Add token check on component mount
    if (!token || !user.role) {
      console.error('No token or user found, redirecting to login');
      handleLogout();
      return;
    }

    if (user.role !== 'delivery_partner') {
      console.error('User is not a delivery partner:', user.role);
      alert('Access denied. Delivery partners only.');
      handleLogout();
      return;
    }

    fetchAssignments();
    fetchPendingOrders();
    fetchStats();
    fetchReturnRequests();

    // Set up fetch interceptor
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const [url, options = {}] = args;
      
      // Only intercept API calls to our backend
      if (url && url.includes(API_URL)) {
        const currentToken = getToken();
        if (currentToken) {
          options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          };
        }
      }
      
      return originalFetch(url, options);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const currentToken = getToken();
      if (!currentToken) {
        handleLogout();
        return;
      }

      const response = await fetch(`${API_URL}/delivery/assignments`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error('Authentication error, logging out');
          handleLogout();
          return;
        }
        throw new Error('Failed to fetch assignments');
      }
      
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      alert('Failed to fetch assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const currentToken = getToken();
      if (!currentToken) {
        return;
      }

      const response = await fetch(`${API_URL}/delivery/pending-orders`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return;
        }
        throw new Error('Failed to fetch pending orders');
      }
      
      const data = await response.json();
      setPendingOrders(data);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const currentToken = getToken();
      if (!currentToken) {
        return;
      }

      const response = await fetch(`${API_URL}/delivery/stats`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return;
        }
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchReturnRequests = async () => {
    try {
      const currentToken = getToken();
      if (!currentToken) {
        return;
      }

      const response = await fetch(`${API_URL}/delivery/return-requests`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return;
        }
        throw new Error('Failed to fetch return requests');
      }
      
      const data = await response.json();
      setReturnRequests(data);
    } catch (error) {
      console.error('Error fetching return requests:', error);
    }
  };

  const selfAssignOrder = async (orderId) => {
    if (!window.confirm('Do you want to accept this delivery assignment?')) {
      return;
    }

    try {
      const currentToken = getToken();
      if (!currentToken) {
        alert('Session expired. Please login again.');
        handleLogout();
        return;
      }

      const response = await fetch(`${API_URL}/delivery/self-assign/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403) {
          alert('Access denied. Please login again.');
          handleLogout();
          return;
        }
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
      const currentToken = getToken();
      if (!currentToken) {
        alert('Session expired. Please login again.');
        handleLogout();
        return;
      }

      const response = await fetch(`${API_URL}/delivery/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error response:', data);
        if (response.status === 403) {
          alert('Access denied. Please login again.');
          handleLogout();
          return;
        }
        throw new Error(data.message || 'Failed to update status');
      }

      alert(`Order status updated to: ${newStatus.replace('_', ' ')}`);
      
      fetchAssignments();
      fetchStats();
      
      if (newStatus === 'near_location' && selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: 'near_location' }));
      }
    } catch (error) {
      console.error('Update status error:', error);
      if (error.message.includes('Invalid status transition')) {
        alert(`Cannot update status: ${error.message}\n\nPlease check the current order status and try the appropriate action.`);
      } else {
        alert(`Failed to update order status: ${error.message}`);
      }
    }
  };

  const generateOTPForOrder = async (orderId) => {
    try {
      const currentToken = getToken();
      const response = await fetch(`${API_URL}/delivery/orders/${orderId}/generate-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          console.error('Access denied. Token might be invalid or expired.');
          alert('Access denied. Please login again.');
          handleLogout();
          return;
        }
        console.error('Error response:', data);
        throw new Error(data.message || 'Failed to generate OTP');
      }

      // Store where OTP was sent (phone number)
      const phoneNumber = data.order?.deliveryAddress?.phone;
      setOtpSentTo(phoneNumber);
      
      // Update selected order to mark that OTP has been generated
      setSelectedOrder(prev => ({ 
        ...prev, 
        deliveryOTP: data.deliveryOTP,
        otpGenerated: true,
        otpSentTo: phoneNumber
      }));
      
      // Show success modal
      setShowOTPConfirmModal(true);
      setShowGenerateOTPModal(false);
      
      fetchAssignments();
      
    } catch (error) {
      console.error('Generate OTP error:', error);
      alert(`Failed to generate OTP: ${error.message}`);
    }
  };

  const verifyCustomerOTP = async (orderId) => {
    const enteredOTP = otpInput.join('');
    
    if (enteredOTP.length !== 6) {
      alert('Please enter a 6-digit OTP');
      return;
    }

    try {
      const currentToken = getToken();
      const response = await fetch(`${API_URL}/delivery/orders/${orderId}/verify-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ otp: enteredOTP })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          console.error('Access denied. Token might be invalid or expired.');
          alert('Access denied. Please login again.');
          handleLogout();
          return;
        }
        console.error('Error response:', data);
        throw new Error(data.message || 'OTP verification failed');
      }

      alert('Delivery verified successfully! Order marked as delivered.');
      setShowVerifyOTPModal(false);
      setOtpInput(['', '', '', '', '', '']);
      setOtpSentTo('');
      
      fetchAssignments();
      fetchStats();
      
      setSelectedOrder(prev => ({ ...prev, status: 'delivered', deliveryOTP: null }));
    } catch (error) {
      alert(error.message || 'Invalid OTP. Please ask customer for the correct OTP.');
    }
  };

  const handleProcessReturnRequest = async () => {
    if (!selectedReturnRequest) return;

    if (!returnAction) {
      alert('Please select an action (Approve or Reject)');
      return;
    }

    if (returnAction === 'approve' && !returnPickupDate) {
      alert('Please select a pickup date for approved returns');
      return;
    }

    try {
      setProcessingAction(true);
      const currentToken = getToken();
      
      const response = await fetch(`${API_URL}/delivery/orders/${selectedReturnRequest._id}/process-return`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: returnAction,
          pickupDate: returnPickupDate,
          pickupTime: returnPickupTime || '9:00 AM - 6:00 PM',
          notes: returnNotes
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to process return request');
      }

      alert(`Return request ${returnAction}ed successfully!`);
      setShowReturnActionModal(false);
      setReturnAction('approve');
      setReturnPickupDate('');
      setReturnPickupTime('');
      setReturnNotes('');
      setProcessingAction(false);
      
      // Refresh data
      fetchAssignments();
      fetchReturnRequests();
      fetchStats();
      
      // Update selected order if it's the same
      if (selectedOrder && selectedOrder._id === selectedReturnRequest._id) {
        setSelectedOrder(prev => ({
          ...prev,
          returnRequest: data.order?.returnRequest,
          status: data.order?.status
        }));
      }
      
    } catch (error) {
      console.error('Error processing return:', error);
      alert(`Failed to process return: ${error.message}`);
      setProcessingAction(false);
    }
  };

  const handleUpdateReturnStatus = async (orderId, status, notes = '') => {
    try {
      const currentToken = getToken();
      
      const response = await fetch(`${API_URL}/delivery/orders/${orderId}/return-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update return status');
      }

      alert(`Return status updated to ${status.replace('_', ' ')}`);
      
      // Refresh data
      fetchAssignments();
      fetchReturnRequests();
      fetchStats();
      
      // Update selected order if it's the same
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(prev => ({
          ...prev,
          returnRequest: data.order?.returnRequest,
          status: data.order?.status
        }));
      }
      
    } catch (error) {
      console.error('Error updating return status:', error);
      alert(`Failed to update return status: ${error.message}`);
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
      return_requested: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getReturnStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pickup_scheduled: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-purple-100 text-purple-800',
      in_transit: 'bg-indigo-100 text-indigo-800',
      received_at_warehouse: 'bg-teal-100 text-teal-800',
      refund_initiated: 'bg-orange-100 text-orange-800',
      refund_completed: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status) => {
    const statusText = status.replace(/_/g, ' ').toUpperCase();
    const colors = getStatusColor(status);
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors}`}>
        {statusText}
      </span>
    );
  };

  const getReturnStatusBadge = (status) => {
    const statusText = status.replace(/_/g, ' ').toUpperCase();
    const colors = getReturnStatusColor(status);
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors}`}>
        {statusText}
      </span>
    );
  };

  const getStatusSteps = (currentStatus) => {
    const steps = [
      { status: 'confirmed', label: 'Confirmed', icon: CheckCircle },
      { status: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
      { status: 'near_location', label: 'Near Location', icon: MapPin },
      { status: 'delivered', label: 'Delivered', icon: CheckCircle }
    ];
    
    return steps.map(step => {
      const isActive = step.status === currentStatus;
      const isCompleted = 
        steps.findIndex(s => s.status === currentStatus) > 
        steps.findIndex(s => s.status === step.status);
      
      return { ...step, isActive, isCompleted };
    });
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
    fetchReturnRequests();
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

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setViewMode('detail');
  };

  const viewReturnDetails = (request) => {
    setSelectedReturnRequest(request);
    setShowReturnDetailsModal(true);
  };

  const backToList = () => {
    setViewMode('list');
    setSelectedOrder(null);
    setOtpSentTo('');
    setOtpInput(['', '', '', '', '', '']);
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
                <p className="text-blue-100">Welcome back, {user.name || 'Delivery Partner'}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
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
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Returns</p>
                  <p className="text-3xl font-bold">{stats.returns || 0}</p>
                </div>
                <RotateCcw size={32} className="text-red-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {viewMode === 'list' ? (
          <>
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
                <button
                  onClick={() => setActiveTab('return-requests')}
                  className={`px-6 py-3 rounded-lg font-semibold transition flex items-center space-x-2 ${
                    activeTab === 'return-requests'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <RotateCcw size={18} />
                  <span>Return Requests ({returnRequests.length})</span>
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
                  <div className="grid gap-4">
                    {assignments.map((assignment) => (
                      <OrderCard
                        key={assignment._id}
                        order={assignment}
                        getStatusBadge={getStatusBadge}
                        viewOrderDetails={viewOrderDetails}
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
                                {getStatusBadge(order.status)}
                              </div>
                              <p className="text-sm text-gray-600">
                                Placed {formatDate(order.createdAt)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">Total Amount</p>
                              <p className="text-2xl font-bold text-blue-600">₹{order.totalAmount?.toLocaleString() || '0'}</p>
                            </div>
                          </div>

                          {/* Customer Info */}
                          <div className="grid md:grid-cols-2 gap-6 mb-6">
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <User size={18} className="mr-2 text-blue-600" />
                                Customer Details
                              </h4>
                              <p className="font-medium text-gray-900">{order.deliveryAddress?.name || 'N/A'}</p>
                              <p className="text-sm text-gray-600 mt-2 flex items-center">
                                <Phone size={14} className="mr-2" />
                                {order.deliveryAddress?.phone || 'N/A'}
                              </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <MapPin size={18} className="mr-2 text-blue-600" />
                                Delivery Address
                              </h4>
                              <p className="text-gray-900">{order.deliveryAddress?.street || 'N/A'}</p>
                              <p className="text-gray-600 text-sm">
                                {order.deliveryAddress?.city || 'N/A'}, {order.deliveryAddress?.state || 'N/A'}
                              </p>
                              <p className="text-gray-600 text-sm">{order.deliveryAddress?.pincode || 'N/A'}</p>
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

            {activeTab === 'return-requests' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Return Requests</h2>
                
                {returnRequests.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                    <RotateCcw size={64} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No return requests</h3>
                    <p className="text-gray-600">Customer return requests will appear here</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {returnRequests.map((request) => (
                      <div key={request._id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6">
                          {/* Request Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-bold text-gray-900">
                                  Order #{request.orderNumber}
                                </h3>
                                {request.returnRequest?.status && (
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getReturnStatusColor(request.returnRequest.status)}`}>
                                    {request.returnRequest.status.replace(/_/g, ' ').toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                Return requested {formatDate(request.returnRequest?.requestedAt)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">Refund Amount</p>
                              <p className="text-2xl font-bold text-red-600">₹{request.totalAmount?.toLocaleString() || '0'}</p>
                            </div>
                          </div>

                          {/* Return Details */}
                          <div className="grid md:grid-cols-2 gap-6 mb-6">
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <User size={18} className="mr-2 text-blue-600" />
                                Customer Details
                              </h4>
                              <p className="font-medium text-gray-900">{request.deliveryAddress?.name || 'N/A'}</p>
                              <p className="text-sm text-gray-600 mt-2 flex items-center">
                                <Phone size={14} className="mr-2" />
                                {request.deliveryAddress?.phone || 'N/A'}
                              </p>
                              <p className="text-sm text-gray-600 mt-2">
                                <strong>Reason:</strong> {request.returnRequest?.reason || 'N/A'}
                              </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <MapPin size={18} className="mr-2 text-blue-600" />
                                Pickup Address
                              </h4>
                              <p className="font-medium text-gray-900">{request.deliveryAddress?.street || 'N/A'}</p>
                              <p className="text-gray-600 text-sm">
                                {request.deliveryAddress?.city || 'N/A'}, {request.deliveryAddress?.state || 'N/A'}
                              </p>
                              <p className="text-gray-600 text-sm">{request.deliveryAddress?.pincode || 'N/A'}</p>
                            </div>
                          </div>

                          {/* Items to Return */}
                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-900 mb-3">Items to Return</h4>
                            <div className="space-y-3">
                              {request.items?.map((item, idx) => (
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
                                    <p className="font-medium text-gray-900">{item.product?.name || 'Product'}</p>
                                    <p className="text-sm text-gray-600">Quantity: {item.quantity || 0}</p>
                                    <p className="text-sm text-gray-600">Price: ₹{item.price?.toFixed(2) || '0.00'} each</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex space-x-3">
                            <button
                              onClick={() => viewReturnDetails(request)}
                              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                            >
                              <Eye size={18} className="mr-2" />
                              View Details & Process
                            </button>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                `${request.deliveryAddress?.street || ''}, ${request.deliveryAddress?.city || ''}, ${request.deliveryAddress?.state || ''} ${request.deliveryAddress?.pincode || ''}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center"
                            >
                              <Navigation size={18} className="mr-2" />
                              Navigate
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Order Detail View */
          <OrderDetailView
            order={selectedOrder}
            backToList={backToList}
            getStatusBadge={getStatusBadge}
            getStatusSteps={getStatusSteps}
            updateOrderStatus={updateOrderStatus}
            setSelectedOrder={setSelectedOrder}
            setShowGenerateOTPModal={setShowGenerateOTPModal}
            setShowVerifyOTPModal={setShowVerifyOTPModal}
            otpSentTo={otpSentTo}
            setShowReturnModal={setShowReturnModal}
            formatDate={formatDate}
          />
        )}
      </div>

      {/* Generate OTP Modal */}
      {showGenerateOTPModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Key size={32} className="text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Generate OTP for Delivery</h2>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-lg mb-6">
              <div className="flex items-center mb-4">
                <AlertCircle size={24} className="text-blue-600 mr-3" />
                <div>
                  <p className="font-semibold text-blue-800">Ready to Deliver?</p>
                  <p className="text-sm text-blue-700">
                    Generate an OTP for the customer. They will need to provide this OTP for verification.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded border border-blue-200">
                <p className="text-sm font-semibold text-gray-900 mb-2">Order Details:</p>
                <p className="text-sm text-gray-700">Order #{selectedOrder.orderNumber}</p>
                <p className="text-sm text-gray-700">Customer: {selectedOrder.deliveryAddress?.name || 'N/A'}</p>
                <p className="text-sm text-gray-700">Location: {selectedOrder.deliveryAddress?.city || 'N/A'}</p>
                <p className="text-sm text-gray-700">Phone: {selectedOrder.deliveryAddress?.phone || 'N/A'}</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowGenerateOTPModal(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => generateOTPForOrder(selectedOrder._id)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Generate OTP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Confirmation Modal */}
      {showOTPConfirmModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Shield size={32} className="text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">OTP Sent to Customer!</h2>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg mb-6">
              <div className="flex items-center justify-center mb-4">
                <Key size={48} className="text-green-600 mr-3" />
                <div>
                  <p className="font-semibold text-green-800 text-lg">OTP has been sent to:</p>
                  <p className="text-xl font-bold text-green-900">{otpSentTo || selectedOrder.deliveryAddress?.phone || 'N/A'}</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded border border-green-200">
                <p className="text-sm text-green-800 font-semibold mb-2">Next Steps:</p>
                <ol className="text-sm text-green-700 space-y-2">
                  <li className="flex items-start">
                    <span className="font-bold mr-2">1.</span>
                    <span>The customer has received the OTP on their phone</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">2.</span>
                    <span>Ask the customer to tell you the OTP they received</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">3.</span>
                    <span>Enter the OTP that the customer tells you</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">4.</span>
                    <span>Click "Verify OTP & Deliver" to complete the delivery</span>
                  </li>
                </ol>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowOTPConfirmModal(false);
                  fetchAssignments();
                }}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Got it, Continue Delivery
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
              Ask the customer for the OTP and enter it below for <strong>Order #{selectedOrder.orderNumber}</strong>.
            </p>

            <div className="flex justify-center space-x-2 mb-6">
              {otpInput.map((digit, index) => (
                <input
                  key={index}
                  id={`delivery-otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOTPChange(index, e.target.value)}
                  className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800 font-semibold">How to verify:</p>
                  <ul className="text-sm text-blue-700 mt-1 list-disc list-inside space-y-1">
                    <li>Customer should provide the 6-digit OTP you shared</li>
                    <li>Enter the OTP provided by customer</li>
                    <li>System will verify if OTP matches</li>
                    <li>Order will be marked as delivered upon successful verification</li>
                  </ul>
                </div>
              </div>
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
                Verify OTP & Complete Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Details Modal */}
      {showReturnDetailsModal && selectedReturnRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <RotateCcw size={32} className="text-purple-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Return Request Details</h2>
                  <p className="text-gray-600">Order #{selectedReturnRequest.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReturnDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Customer Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <User size={20} className="mr-2 text-blue-600" />
                  Customer Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">{selectedReturnRequest.deliveryAddress?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{selectedReturnRequest.deliveryAddress?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{selectedReturnRequest.customer?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Return Reason</p>
                    <p className="font-medium text-gray-900">{selectedReturnRequest.returnRequest?.reason || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Requested At</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedReturnRequest.returnRequest?.requestedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Pickup Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin size={20} className="mr-2 text-blue-600" />
                  Pickup Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium text-gray-900">{selectedReturnRequest.deliveryAddress?.street || 'N/A'}</p>
                    <p className="text-sm text-gray-600">
                      {selectedReturnRequest.deliveryAddress?.city || 'N/A'}, {selectedReturnRequest.deliveryAddress?.state || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">{selectedReturnRequest.deliveryAddress?.pincode || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Delivered On</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedReturnRequest.deliveredAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Days Since Delivery</p>
                    <p className="font-medium text-gray-900">
                      {selectedReturnRequest.deliveredAt ? 
                        Math.floor((new Date() - new Date(selectedReturnRequest.deliveredAt)) / (1000 * 60 * 60 * 24)) : 
                        'N/A'} days
                    </p>
                  </div>
                  {selectedReturnRequest.returnRequest?.pickupSchedule?.date && (
                    <div>
                      <p className="text-sm text-gray-600">Scheduled Pickup</p>
                      <p className="font-medium text-gray-900">
                        {selectedReturnRequest.returnRequest.pickupSchedule.date} at {selectedReturnRequest.returnRequest.pickupSchedule.time}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Information */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Items to Return</h3>
              <div className="space-y-3">
                {selectedReturnRequest.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.product?.image}
                        alt={item.product?.name}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/64x64?text=Product';
                        }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{item.product?.name || 'Product'}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity || 0}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Price</p>
                      <p className="font-semibold text-gray-900">₹{(item.price || 0).toFixed(2)} each</p>
                      <p className="font-bold text-gray-900">₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)} total</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                <p className="text-lg font-semibold text-gray-900">Total Refund Amount</p>
                <p className="text-2xl font-bold text-red-600">₹{selectedReturnRequest.totalAmount?.toFixed(2) || '0.00'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setSelectedReturnRequest(selectedReturnRequest);
                  setReturnAction('approve');
                  setShowReturnDetailsModal(false);
                  setShowReturnActionModal(true);
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
              >
                <ThumbsUp size={18} className="mr-2" />
                Approve Return
              </button>
              <button
                onClick={() => {
                  setSelectedReturnRequest(selectedReturnRequest);
                  setReturnAction('reject');
                  setShowReturnDetailsModal(false);
                  setShowReturnActionModal(true);
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center"
              >
                <ThumbsDown size={18} className="mr-2" />
                Reject Return
              </button>
              <a
                href={`tel:${selectedReturnRequest.deliveryAddress?.phone || ''}`}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
              >
                <PhoneCall size={18} className="mr-2" />
                Call Customer
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${selectedReturnRequest.deliveryAddress?.street || ''}, ${selectedReturnRequest.deliveryAddress?.city || ''}, ${selectedReturnRequest.deliveryAddress?.state || ''} ${selectedReturnRequest.deliveryAddress?.pincode || ''}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center"
              >
                <Navigation size={18} className="mr-2" />
                View on Map
              </a>
              <button
                onClick={() => setShowReturnDetailsModal(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Action Modal */}
      {showReturnActionModal && selectedReturnRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="flex items-center space-x-3 mb-6">
              {returnAction === 'approve' ? (
                <ThumbsUp size={32} className="text-green-600" />
              ) : (
                <ThumbsDown size={32} className="text-red-600" />
              )}
              <h2 className="text-2xl font-bold text-gray-900">
                {returnAction === 'approve' ? 'Approve' : 'Reject'} Return Request
              </h2>
            </div>

            <p className="text-gray-600 mb-6">
              You are about to <strong>{returnAction}</strong> the return request for Order #{selectedReturnRequest.orderNumber}.
            </p>

            {returnAction === 'approve' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Date *
                  </label>
                  <input
                    type="date"
                    value={returnPickupDate}
                    onChange={(e) => setReturnPickupDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Time
                  </label>
                  <input
                    type="time"
                    value={returnPickupTime}
                    onChange={(e) => setReturnPickupTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes {returnAction === 'reject' ? '* (Required for rejection)' : ''}
              </label>
              <textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder={returnAction === 'approve' ? 'Add any notes for the customer...' : 'Please provide a reason for rejection...'}
                required={returnAction === 'reject'}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowReturnActionModal(false);
                  setReturnAction('approve');
                  setReturnPickupDate('');
                  setReturnPickupTime('');
                  setReturnNotes('');
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                onClick={handleProcessReturnRequest}
                disabled={processingAction || (returnAction === 'approve' && !returnPickupDate) || (returnAction === 'reject' && !returnNotes.trim())}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {processingAction ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Processing...
                  </>
                ) : (
                  <>
                    {returnAction === 'approve' ? 'Approve' : 'Reject'} Return
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

function OrderCard({ order, getStatusBadge, viewOrderDetails }) {
  const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div 
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
      onClick={() => viewOrderDetails(order)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900">Order #{order.orderNumber}</h3>
              {getStatusBadge(order.status)}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="text-sm">
                <p className="text-gray-600">Customer</p>
                <p className="font-semibold text-gray-900">{order.deliveryAddress?.name || 'N/A'}</p>
              </div>
              <div className="text-sm">
                <p className="text-gray-600">Phone</p>
                <p className="font-semibold text-gray-900">{order.deliveryAddress?.phone || 'N/A'}</p>
              </div>
            </div>

            <div className="text-sm mb-3">
              <p className="text-gray-600">Delivery Address</p>
              <p className="font-semibold text-gray-900 line-clamp-1">
                {order.deliveryAddress?.street || 'N/A'}
              </p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div>
                  <p className="text-gray-600">Items</p>
                  <p className="font-semibold text-gray-900">{totalItems} items</p>
                </div>
                <div>
                  <p className="text-gray-600">Amount</p>
                  <p className="font-semibold text-blue-600">₹{order.totalAmount?.toLocaleString() || '0'}</p>
                </div>
              </div>
              
              <div className="flex items-center text-blue-600 font-semibold">
                <span>View Details</span>
                <ChevronRight size={16} className="ml-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderDetailView({ 
  order, 
  backToList, 
  getStatusBadge, 
  getStatusSteps, 
  updateOrderStatus,
  setSelectedOrder,
  setShowGenerateOTPModal,
  setShowVerifyOTPModal,
  otpSentTo,
  setShowReturnModal,
  formatDate
}) {
  const steps = getStatusSteps(order.status);
  const hasOTPGenerated = order.deliveryOTP || order.otpGenerated;
  const isReturnRequested = order.status === 'return_requested';
  const returnStatus = order.returnRequest?.status;

  const handleStartDelivery = () => {
    if (window.confirm('Are you ready to start delivery?')) {
      updateOrderStatus(order._id, 'out_for_delivery');
    }
  };

  const handleNearLocation = () => {
    if (window.confirm('Mark as "Near Location"? You will be able to generate OTP after this.')) {
      updateOrderStatus(order._id, 'near_location');
    }
  };

  const getAvailableActions = () => {
    const actions = [];
    
    if (order.status === 'confirmed') {
      actions.push({
        label: 'Start Delivery',
        onClick: handleStartDelivery,
        color: 'bg-blue-600 hover:bg-blue-700',
        icon: Truck,
        description: 'Begin delivery process'
      });
    }
    
    if (order.status === 'out_for_delivery') {
      actions.push({
        label: 'Near Location',
        onClick: handleNearLocation,
        color: 'bg-orange-600 hover:bg-orange-700',
        icon: MapPin,
        description: 'Update location status'
      });
    }
    
    if (order.status === 'near_location') {
      if (!hasOTPGenerated) {
        actions.push({
          label: 'Generate OTP',
          onClick: () => setShowGenerateOTPModal(true),
          color: 'bg-purple-600 hover:bg-purple-700',
          icon: Key,
          description: 'Generate OTP for customer verification'
        });
      }
      
      if (hasOTPGenerated) {
        actions.push({
          label: 'Verify OTP & Deliver',
          onClick: () => setShowVerifyOTPModal(true),
          color: 'bg-green-600 hover:bg-green-700',
          icon: Lock,
          description: 'Verify OTP to complete delivery'
        });
      }
    }

    return actions;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header with Back Button */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={backToList}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-bold">Order #{order.orderNumber}</h2>
              <p className="text-blue-100">
                {order.status === 'delivered' && order.deliveredAt 
                  ? `Delivered on ${formatDate(order.deliveredAt)}`
                  : order.assignedAt 
                  ? `Assigned on ${formatDate(order.assignedAt)}`
                  : `Placed on ${formatDate(order.createdAt)}`
                }
              </p>
            </div>
          </div>
          {getStatusBadge(order.status)}
        </div>
      </div>

      {/* Return Request Banner */}
      {isReturnRequested && order.returnRequest && (
        <div className="bg-red-50 p-4 border-b border-red-200">
          <div className="flex items-center">
            <RotateCcw size={20} className="text-red-600 mr-2" />
            <div>
              <p className="font-semibold text-red-800">RETURN REQUESTED</p>
              <p className="text-sm text-red-700">
                <strong>Reason:</strong> {order.returnRequest.reason || 'Not specified'} | 
                <strong> Status:</strong> {returnStatus || 'pending'}
                {order.returnRequest.pickupSchedule?.date && (
                  <> | <strong> Pickup:</strong> {order.returnRequest.pickupSchedule.date} {order.returnRequest.pickupSchedule.time}</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Timeline */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Delivery Status</h3>
        <div className="relative">
          {/* Connecting Line */}
          <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gray-200"></div>
          
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative flex items-center space-x-4 mb-8 last:mb-0">
                <div className={`z-10 w-16 h-16 rounded-full flex items-center justify-center ${
                  step.isCompleted 
                    ? 'bg-green-100 text-green-600' 
                    : step.isActive 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  <Icon size={24} />
                </div>
                <div>
                  <p className={`font-semibold ${
                    step.isCompleted || step.isActive 
                      ? 'text-gray-900' 
                      : 'text-gray-400'
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-sm text-gray-500">
                    {step.isActive ? 'Current Status' : step.isCompleted ? 'Completed' : 'Pending'}
                  </p>
                  {step.status === 'near_location' && step.isActive && hasOTPGenerated && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ OTP generated for customer verification
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer Information */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Customer Information</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <User size={20} className="text-blue-600" />
              <h4 className="font-semibold text-gray-900">Customer Details</h4>
            </div>
            <p className="font-medium text-gray-900">{order.deliveryAddress?.name || 'N/A'}</p>
            <p className="text-gray-600 text-sm mt-2 flex items-center">
              <Phone size={14} className="mr-2" />
              {order.deliveryAddress?.phone || 'N/A'}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <MapPin size={20} className="text-blue-600" />
              <h4 className="font-semibold text-gray-900">Delivery Address</h4>
            </div>
            <p className="font-medium text-gray-900">{order.deliveryAddress?.street || 'N/A'}</p>
            <p className="text-gray-600 text-sm">
              {order.deliveryAddress?.city || 'N/A'}, {order.deliveryAddress?.state || 'N/A'}
            </p>
            <p className="text-gray-600 text-sm">{order.deliveryAddress?.pincode || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* OTP Status Section */}
      {order.status === 'near_location' && (
        <div className="p-6 border-b border-gray-200 bg-purple-50">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Key size={20} className="mr-2 text-purple-600" />
            Delivery OTP Status
          </h3>
          
          {hasOTPGenerated ? (
            <div className="bg-white p-6 rounded-lg border border-purple-200">
              <div className="flex items-center justify-center mb-4">
                <Shield size={32} className="text-green-600 mr-3" />
                <div>
                  <p className="font-semibold text-green-800">OTP Sent to Customer</p>
                  <p className="text-sm text-green-700">Phone: <span className="font-bold">{otpSentTo || order.deliveryAddress?.phone || 'N/A'}</span></p>
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                <p className="text-sm text-yellow-800 font-semibold">Next Action Required:</p>
                <p className="text-sm text-yellow-700">
                  The OTP has been sent to the customer's phone. Ask the customer for the OTP they received.
                  Then click "Verify OTP & Deliver" and enter the OTP to complete the delivery.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
              <div className="flex items-center">
                <AlertCircle size={24} className="text-yellow-600 mr-3" />
                <div>
                  <p className="font-semibold text-yellow-800">OTP Not Generated Yet</p>
                  <p className="text-sm text-yellow-700">
                    Click "Generate OTP" to send an OTP to the customer's phone.
                    This is required before completing delivery.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Order Items */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Items to Deliver ({order.items?.length || 0})</h3>
        <div className="space-y-3">
          {order.items?.map((item, idx) => (
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
                <p className="font-medium text-gray-900">{item.product?.name || 'Product'}</p>
                <p className="text-sm text-gray-600">Quantity: {item.quantity || 0}</p>
                <p className="text-sm text-gray-600">Price: ₹{item.price?.toFixed(2) || '0.00'} each</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
          <p className="font-semibold text-gray-900">Total Amount</p>
          <p className="text-2xl font-bold text-blue-600">₹{order.totalAmount?.toLocaleString() || '0'}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Delivery Actions</h3>
        
        <div className="flex flex-wrap gap-3 mb-4">
          {getAvailableActions().map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`px-6 py-3 text-white rounded-lg transition flex items-center ${action.color}`}
              >
                <Icon size={18} className="mr-2" />
                {action.label}
              </button>
            );
          })}

          {/* Navigation Button */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${order.deliveryAddress?.street || ''}, ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''} ${order.deliveryAddress?.pincode || ''}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center"
          >
            <Navigation size={18} className="mr-2" />
            Navigate to Address
          </a>
        </div>

        {/* Important Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800 font-semibold mb-2">Delivery Instructions:</p>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            {order.status === 'confirmed' && (
              <li>Click "Start Delivery" to begin the delivery process</li>
            )}
            {order.status === 'out_for_delivery' && (
              <li>When you are near the delivery location, click "Near Location"</li>
            )}
            {order.status === 'near_location' && !hasOTPGenerated && (
              <>
                <li>You are near the delivery location</li>
                <li>Click "Generate OTP" to send a verification OTP to the customer</li>
                <li>The OTP will be sent to: {order.deliveryAddress?.phone || 'N/A'}</li>
                <li>Ask the customer for the OTP they received</li>
              </>
            )}
            {order.status === 'near_location' && hasOTPGenerated && (
              <>
                <li>OTP has been sent to customer's phone: <strong>{otpSentTo || order.deliveryAddress?.phone || 'N/A'}</strong></li>
                <li>Ask the customer: "What is the OTP you received?"</li>
                <li>Enter the OTP that the customer tells you</li>
                <li>Click "Verify OTP & Deliver" to complete the delivery</li>
                <li>System will verify if the OTP matches before completing delivery</li>
              </>
            )}
            {order.status === 'delivered' && (
              <>
                <li>This order has been delivered successfully</li>
                <li>Customer can request returns within 14 days of delivery</li>
              </>
            )}
            {isReturnRequested && (
              <>
                <li>Return has been requested for this order</li>
                <li>Check the return status above for details</li>
                <li>Contact customer for pickup scheduling if approved</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}