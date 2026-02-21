import React, { useState, useEffect } from 'react';
import {
  Truck, Package, MapPin, CheckCircle, Navigation,
  Phone, Clock, AlertCircle, LogOut, RefreshCw,
  User, Home, Search, List, PlusCircle, Key, Lock,
  ChevronRight, ArrowLeft, MoreVertical, Edit, Download,
  Eye, EyeOff, Shield, RotateCcw, FileText, Check, X,
  ThumbsUp, ThumbsDown, Calendar, DollarSign, Loader2,
  ShieldCheck, Mail, MessageSquare, PhoneCall, ExternalLink,
  DollarSign as DollarSignIcon, Key as KeyIcon, Lock as LockIcon, XCircle,
  CreditCard, Banknote, Wallet, CheckSquare, AlertTriangle
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
    returns: 0,
    returnPickups: 0
  });
  const [showOTPConfirmModal, setShowOTPConfirmModal] = useState(false);
  const [showGenerateOTPModal, setShowGenerateOTPModal] = useState(false);
  const [showVerifyOTPModal, setShowVerifyOTPModal] = useState(false);
  const [showPickupOTPModal, setShowPickupOTPModal] = useState(false);
  const [showVerifyPickupOTPModal, setShowVerifyPickupOTPModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReturnDetailsModal, setShowReturnDetailsModal] = useState(false);
  const [showReturnActionModal, setShowReturnActionModal] = useState(false);
  const [showRefundRequestModal, setShowRefundRequestModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedReturnRequest, setSelectedReturnRequest] = useState(null);
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [pickupOTPInput, setPickupOTPInput] = useState(['', '', '', '', '', '']);
  const [otpSentTo, setOtpSentTo] = useState('');
  const [pickupOTPSentTo, setPickupOTPSentTo] = useState('');
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

      // Special handling for return pickup status updates
      if (['out_for_pickup', 'pickup_near_location', 'pickup_completed', 'refund_requested'].includes(newStatus)) {
        // For return pickup flows, use the return-status endpoint instead
        const response = await fetch(`${API_URL}/delivery/orders/${orderId}/return-status`, {
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
          throw new Error(data.message || 'Failed to update return status');
        }

        alert(`Return status updated to: ${newStatus.replace(/_/g, ' ')}`);
        
        fetchAssignments();
        fetchReturnRequests();
        fetchStats();
        
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(prev => ({ 
            ...prev, 
            status: newStatus,
            returnRequest: {
              ...prev.returnRequest,
              status: newStatus
            }
          }));
        }
        return;
      }

      // For regular delivery status updates, use the original endpoint
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

      alert(`Order status updated to: ${newStatus.replace(/_/g, ' ')}`);
      
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

  const generatePickupOTPForOrder = async (orderId) => {
    try {
      const currentToken = getToken();
      const response = await fetch(`${API_URL}/delivery/orders/${orderId}/generate-pickup-otp`, {
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
        throw new Error(data.message || 'Failed to generate pickup OTP');
      }

      const phoneNumber = selectedOrder?.deliveryAddress?.phone;
      setPickupOTPSentTo(phoneNumber);
      
      // Update status without storing OTP in frontend
      setSelectedOrder(prev => ({ 
        ...prev, 
        returnRequest: {
          ...prev.returnRequest,
          status: 'pickup_otp_generated'
        },
        status: 'pickup_otp_generated'
      }));
      
      // Show confirmation modal (without showing OTP)
      setShowPickupOTPModal(true);
      
    } catch (error) {
      console.error('Generate pickup OTP error:', error);
      alert(`Failed to generate pickup OTP: ${error.message}`);
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

  const verifyPickupOTP = async (orderId) => {
    const enteredOTP = pickupOTPInput.join('');
    
    if (enteredOTP.length !== 6) {
      alert('Please enter a 6-digit OTP');
      return;
    }

    try {
      const currentToken = getToken();
      const response = await fetch(`${API_URL}/delivery/orders/${orderId}/verify-pickup-otp`, {
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
        throw new Error(data.message || 'Pickup OTP verification failed');
      }

      alert('Pickup verified successfully! Item collected from customer.');
      setShowVerifyPickupOTPModal(false);
      setPickupOTPInput(['', '', '', '', '', '']);
      setPickupOTPSentTo('');
      
      fetchAssignments();
      fetchReturnRequests();
      fetchStats();
      
      setSelectedOrder(prev => ({ 
        ...prev, 
        returnRequest: {
          ...prev.returnRequest,
          status: 'pickup_completed'
        },
        status: 'pickup_completed'
      }));
    } catch (error) {
      alert(error.message || 'Invalid pickup OTP. Please ask customer for the correct OTP.');
    }
  };

  const requestRefundFromManufacturer = async (orderId) => {
    try {
      const currentToken = getToken();
      const response = await fetch(`${API_URL}/delivery/orders/${orderId}/return-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: 'refund_requested',
          notes: 'Refund requested to manufacturer after successful pickup'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to request refund');
      }

      alert('Refund requested successfully to manufacturer!');
      setShowRefundRequestModal(false);
      
      fetchAssignments();
      fetchReturnRequests();
      fetchStats();
      
      setSelectedOrder(prev => ({ 
        ...prev, 
        returnRequest: {
          ...prev.returnRequest,
          status: 'refund_requested'
        },
        status: 'refund_requested'
      }));
    } catch (error) {
      alert(`Failed to request refund: ${error.message}`);
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

      alert(`Return status updated to ${status.replace(/_/g, ' ')}`);
      
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

  // NEW FUNCTION: Manually refresh return/refund status
  const refreshOrderRefundStatus = async (orderId) => {
    try {
      const currentToken = getToken();
      const response = await fetch(`${API_URL}/delivery/orders/${orderId}/refund-status`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch refund status');
      }

      // Update the selected order with fresh refund status
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(prev => ({
          ...prev,
          refundStatus: data.refundStatus,
          returnRequest: {
            ...prev.returnRequest,
            refundStatus: data.refundStatus,
            refundDetails: data.refundDetails
          }
        }));
      }

      // Also update in assignments list
      setAssignments(prev => prev.map(order => 
        order._id === orderId ? {
          ...order,
          refundStatus: data.refundStatus,
          returnRequest: {
            ...order.returnRequest,
            refundStatus: data.refundStatus,
            refundDetails: data.refundDetails
          }
        } : order
      ));

      // Update in return requests list
      setReturnRequests(prev => prev.map(order => 
        order._id === orderId ? {
          ...order,
          refundStatus: data.refundStatus,
          returnRequest: {
            ...order.returnRequest,
            refundStatus: data.refundStatus,
            refundDetails: data.refundDetails
          }
        } : order
      ));

      return data;
    } catch (error) {
      console.error('Error fetching refund status:', error);
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
      out_for_pickup: 'bg-blue-100 text-blue-800',
      pickup_near_location: 'bg-orange-100 text-orange-800',
      pickup_otp_generated: 'bg-purple-100 text-purple-800',
      pickup_completed: 'bg-green-100 text-green-800',
      refund_requested: 'bg-blue-100 text-blue-800',
      refund_processing: 'bg-indigo-100 text-indigo-800',
      refund_completed: 'bg-green-100 text-green-800',
      refund_rejected: 'bg-red-100 text-red-800',
      refund_failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getReturnStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      out_for_pickup: 'bg-blue-100 text-blue-800',
      pickup_near_location: 'bg-orange-100 text-orange-800',
      pickup_otp_generated: 'bg-purple-100 text-purple-800',
      pickup_completed: 'bg-green-100 text-green-800',
      refund_requested: 'bg-blue-100 text-blue-800',
      refund_processing: 'bg-indigo-100 text-indigo-800',
      refund_completed: 'bg-green-100 text-green-800',
      refund_rejected: 'bg-red-100 text-red-800',
      refund_failed: 'bg-red-100 text-red-800'
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

  const getStatusSteps = (currentStatus, isReturn = false, order = null) => {
    if (isReturn) {
      const steps = [
        { status: 'return_requested', label: 'Return Requested', icon: RotateCcw },
        { status: 'approved', label: 'Approved', icon: CheckCircle },
        { status: 'out_for_pickup', label: 'Out for Pickup', icon: Truck },
        { status: 'pickup_near_location', label: 'Near Location', icon: MapPin },
        { status: 'pickup_otp_generated', label: 'OTP Generated', icon: Key },
        { status: 'pickup_completed', label: 'Pickup Completed', icon: CheckCircle },
        { status: 'refund_requested', label: 'Refund Requested', icon: DollarSignIcon }
      ];
      
      // Add refund status steps if refund exists
      const refundStatus = order?.refundStatus || order?.returnRequest?.refundStatus;
      
      if (refundStatus) {
        // Add refund tracking steps
        steps.push({ 
          status: 'refund_pending', 
          label: 'Refund Pending', 
          icon: Clock,
          refundStep: true 
        });
        
        if (['processing', 'completed', 'rejected', 'failed'].includes(refundStatus)) {
          steps.push({ 
            status: `refund_${refundStatus}`, 
            label: `Refund ${refundStatus.charAt(0).toUpperCase() + refundStatus.slice(1)}`, 
            icon: refundStatus === 'completed' ? CheckSquare : 
                  refundStatus === 'processing' ? Loader2 : 
                  refundStatus === 'rejected' ? XCircle :
                  AlertTriangle,
            refundStep: true 
          });
        }
      }
      
      return steps.map((step, index) => {
        // Handle refund-specific steps
        if (step.refundStep) {
          const isActive = step.status === `refund_${refundStatus}`;
          const isCompleted = false; // Refund steps show current status, not completion
          
          return { ...step, isActive, isCompleted };
        }
        
        // Regular status steps
        const isActive = step.status === currentStatus;
        const currentIndex = steps.findIndex(s => s.status === currentStatus);
        const stepIndex = steps.findIndex(s => s.status === step.status);
        const isCompleted = currentIndex > stepIndex;
        
        return { ...step, isActive, isCompleted };
      });
    } else {
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
    }
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

  const handlePickupOTPChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOTP = [...pickupOTPInput];
      newOTP[index] = value;
      setPickupOTPInput(newOTP);

      if (value && index < 5) {
        document.getElementById(`pickup-otp-${index + 1}`).focus();
      }
    }
  };

  const viewOrderDetails = async (order) => {
    setSelectedOrder(order);
    setViewMode('detail');
    
    // Also fetch the latest refund status when viewing details
    if (order._id && (order.returnRequest?.status === 'refund_requested' || order.returnRequest?.refundStatus === 'processing')) {
      await refreshOrderRefundStatus(order._id);
    }
  };

  const viewReturnDetails = async (request) => {
    setSelectedReturnRequest(request);
    // Fetch latest refund status when viewing return details
    if (request._id) {
      await refreshOrderRefundStatus(request._id);
    }
    setShowReturnDetailsModal(true);
  };

  const backToList = () => {
    setViewMode('list');
    setSelectedOrder(null);
    setOtpSentTo('');
    setOtpInput(['', '', '', '', '', '']);
    setPickupOTPSentTo('');
    setPickupOTPInput(['', '', '', '', '', '']);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-8">
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
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Pickups</p>
                  <p className="text-3xl font-bold">{stats.returnPickups || 0}</p>
                </div>
                <Truck size={32} className="text-purple-300" />
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
                        refreshOrderRefundStatus={refreshOrderRefundStatus}
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
                    {returnRequests.map((request) => {
                      const refundStatus = request.refundStatus || request.returnRequest?.refundStatus;
                      return (
                      <div key={request._id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6">
                          {/* Request Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-bold text-gray-900">
                                  Order #{request.orderNumber}
                                </h3>
                                {refundStatus ? (
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    refundStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                    refundStatus === 'processing' ? 'bg-indigo-100 text-indigo-800' :
                                    refundStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                    refundStatus === 'failed' ? 'bg-red-100 text-red-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    REFUND {refundStatus.toUpperCase()}
                                  </span>
                                ) : request.returnRequest?.status && (
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
                              {refundStatus === 'completed' && request.returnRequest?.refundDetails?.processedAt && (
                                <p className="text-xs text-green-600">
                                  Completed: {new Date(request.returnRequest.refundDetails.processedAt).toLocaleDateString()}
                                </p>
                              )}
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
                              {refundStatus && (
                                <div className={`mt-3 p-2 rounded-lg ${
                                  refundStatus === 'completed' ? 'bg-green-50 border border-green-200' :
                                  refundStatus === 'processing' ? 'bg-blue-50 border border-blue-200' :
                                  refundStatus === 'rejected' ? 'bg-red-50 border border-red-200' :
                                  'bg-yellow-50 border border-yellow-200'
                                }`}>
                                  <p className="text-xs font-semibold">
                                    Refund Status: <span className={
                                      refundStatus === 'completed' ? 'text-green-700' :
                                      refundStatus === 'processing' ? 'text-blue-700' :
                                      refundStatus === 'rejected' ? 'text-red-700' :
                                      'text-yellow-700'
                                    }>{refundStatus.toUpperCase()}</span>
                                  </p>
                                  {request.returnRequest?.refundDetails?.transactionId && (
                                    <p className="text-xs mt-1">Transaction: {request.returnRequest.refundDetails.transactionId.slice(0, 10)}...</p>
                                  )}
                                  {/* Refresh Button for Refund Status */}
                                  {refundStatus && refundStatus !== 'completed' && (
                                    <button
                                      onClick={() => refreshOrderRefundStatus(request._id)}
                                      className="mt-2 text-xs px-2 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded flex items-center"
                                    >
                                      <RefreshCw size={10} className="mr-1" />
                                      Check Status
                                    </button>
                                  )}
                                </div>
                              )}
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
                              View Details
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
                            {refundStatus === 'completed' && (
                              <button
                                className="px-6 py-3 bg-green-600 text-white rounded-lg flex items-center"
                                disabled
                              >
                                <CheckSquare size={18} className="mr-2" />
                                Refund Completed
                              </button>
                            )}
                            {refundStatus && refundStatus !== 'completed' && (
                              <button
                                onClick={() => refreshOrderRefundStatus(request._id)}
                                className="px-4 py-3 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded-lg transition flex items-center text-sm"
                              >
                                <RefreshCw size={14} className="mr-2" />
                                Refresh Status
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )})}
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
            generatePickupOTPForOrder={generatePickupOTPForOrder}
            setShowPickupOTPModal={setShowPickupOTPModal}
            setShowVerifyPickupOTPModal={setShowVerifyPickupOTPModal}
            setShowRefundRequestModal={setShowRefundRequestModal}
            otpSentTo={otpSentTo}
            setShowReturnModal={setShowReturnModal}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            refreshOrderRefundStatus={refreshOrderRefundStatus}
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

      {/* Pickup OTP Modal - UPDATED */}
      {showPickupOTPModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Key size={32} className="text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Pickup OTP Generated!</h2>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg mb-6">
              <div className="flex items-center justify-center mb-4">
                <ShieldCheck size={48} className="text-purple-600 mr-3" />
                <div>
                  <p className="font-semibold text-purple-800 text-lg">Pickup OTP sent to customer:</p>
                  <p className="text-xl font-bold text-purple-900">{selectedOrder.deliveryAddress?.phone || 'N/A'}</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded border border-purple-200">
                <p className="text-sm text-purple-800 font-semibold mb-2">Important Security Note:</p>
                <p className="text-sm text-purple-700">
                  <strong>The OTP is only visible to the customer on their phone.</strong><br/>
                  Ask the customer to tell you the 6-digit OTP they received.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowPickupOTPModal(false);
                setShowVerifyPickupOTPModal(true);
              }}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Got it, Verify Pickup OTP
            </button>
          </div>
        </div>
      )}

      {/* Verify Pickup OTP Modal */}
      {showVerifyPickupOTPModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verify Pickup OTP</h2>
            <p className="text-gray-600 mb-6">
              Ask the customer for the pickup OTP and enter it below for <strong>Order #{selectedOrder.orderNumber}</strong>.
            </p>

            <div className="flex justify-center space-x-2 mb-6">
              {pickupOTPInput.map((digit, index) => (
                <input
                  key={index}
                  id={`pickup-otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handlePickupOTPChange(index, e.target.value)}
                  className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:ring-2 focus:ring-purple-200"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <div className="bg-purple-50 p-4 rounded-lg mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle size={20} className="text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-purple-800 font-semibold">How to verify:</p>
                  <ul className="text-sm text-purple-700 mt-1 list-disc list-inside space-y-1">
                    <li>Customer should provide the 6-digit OTP they received</li>
                    <li>Enter the OTP provided by customer</li>
                    <li>System will verify if OTP matches</li>
                    <li>Pickup will be marked as completed upon successful verification</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowVerifyPickupOTPModal(false);
                  setPickupOTPInput(['', '', '', '', '', '']);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => verifyPickupOTP(selectedOrder._id)}
                disabled={pickupOTPInput.some(d => !d)}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Verify Pickup OTP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Request Modal */}
      {showRefundRequestModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="flex items-center space-x-3 mb-4">
              <DollarSign size={32} className="text-red-600" />
              <h2 className="text-2xl font-bold text-gray-900">Request Refund from Manufacturer</h2>
            </div>
            
            <div className="bg-red-50 p-6 rounded-lg mb-6">
              <div className="flex items-start">
                <AlertCircle size={18} className="text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-800">
                    <strong>Refund Request:</strong> You are about to request a refund from the manufacturer for Order #{selectedOrder.orderNumber}.
                  </p>
                  <p className="text-sm text-red-700 mt-2">
                    Amount: <strong>₹{selectedOrder.totalAmount?.toFixed(2) || '0.00'}</strong>
                  </p>
                  <p className="text-sm text-red-700 mt-2">
                    This will notify the manufacturer to process the refund to the customer.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowRefundRequestModal(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => requestRefundFromManufacturer(selectedOrder._id)}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Request Refund
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

            {/* Refund Status Section */}
            {selectedReturnRequest.returnRequest?.refundStatus && (
              <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <DollarSign size={20} className="mr-2 text-blue-600" />
                  Refund Status
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white/60 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 mb-1">Status</p>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        selectedReturnRequest.returnRequest.refundStatus === 'completed' ? 'bg-green-500 animate-pulse' :
                        selectedReturnRequest.returnRequest.refundStatus === 'processing' ? 'bg-blue-500 animate-pulse' :
                        selectedReturnRequest.returnRequest.refundStatus === 'rejected' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`}></div>
                      <p className={`font-semibold ${
                        selectedReturnRequest.returnRequest.refundStatus === 'completed' ? 'text-green-700' :
                        selectedReturnRequest.returnRequest.refundStatus === 'processing' ? 'text-blue-700' :
                        selectedReturnRequest.returnRequest.refundStatus === 'rejected' ? 'text-red-700' :
                        'text-yellow-700'
                      }`}>
                        {selectedReturnRequest.returnRequest.refundStatus.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  {selectedReturnRequest.returnRequest.refundDetails?.amount && (
                    <div className="bg-white/60 p-4 rounded-lg">
                      <p className="text-sm text-blue-800 mb-1">Refund Amount</p>
                      <p className="text-xl font-bold text-blue-900">
                        ₹{selectedReturnRequest.returnRequest.refundDetails.amount.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedReturnRequest.returnRequest.refundDetails?.transactionId && (
                    <div className="bg-white/60 p-4 rounded-lg col-span-2">
                      <p className="text-sm text-blue-800 mb-1">Transaction ID</p>
                      <p className="text-sm font-mono text-blue-900 break-all">
                        {selectedReturnRequest.returnRequest.refundDetails.transactionId}
                      </p>
                    </div>
                  )}
                  {selectedReturnRequest.returnRequest.refundDetails?.processedAt && (
                    <div className="bg-white/60 p-4 rounded-lg">
                      <p className="text-sm text-blue-800 mb-1">Processed On</p>
                      <p className="text-sm font-semibold text-blue-900">
                        {formatDate(selectedReturnRequest.returnRequest.refundDetails.processedAt)}
                      </p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <button
                      onClick={() => {
                        refreshOrderRefundStatus(selectedReturnRequest._id);
                        setShowReturnDetailsModal(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center text-sm"
                    >
                      <RefreshCw size={14} className="mr-2" />
                      Refresh Refund Status
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {!selectedReturnRequest.returnRequest?.refundStatus && (
                <>
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
                </>
              )}
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
              {selectedReturnRequest.returnRequest?.refundStatus && selectedReturnRequest.returnRequest.refundStatus !== 'completed' && (
                <button
                  onClick={() => refreshOrderRefundStatus(selectedReturnRequest._id)}
                  className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition flex items-center"
                >
                  <RefreshCw size={18} className="mr-2" />
                  Check Refund Status
                </button>
              )}
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

function OrderCard({ order, getStatusBadge, viewOrderDetails, refreshOrderRefundStatus }) {
  const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const isReturnFlow = order.status === 'return_requested' || 
                      order.returnRequest?.status === 'approved' ||
                      ['out_for_pickup', 'pickup_near_location', 'pickup_otp_generated', 'pickup_completed', 'refund_requested'].includes(order.status);
  const refundStatus = order.refundStatus || order.returnRequest?.refundStatus;

  const handleViewDetails = async () => {
    viewOrderDetails(order);
    // Also refresh refund status if it's in progress
    if (refundStatus && refundStatus !== 'completed') {
      await refreshOrderRefundStatus(order._id);
    }
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
      onClick={handleViewDetails}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900">Order #{order.orderNumber}</h3>
              <div className="flex items-center space-x-2">
                {refundStatus && (
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    refundStatus === 'completed' ? 'bg-green-100 text-green-800' :
                    refundStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {refundStatus.toUpperCase()}
                  </span>
                )}
                {getStatusBadge(order.status)}
              </div>
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
  generatePickupOTPForOrder,
  setShowPickupOTPModal,
  setShowVerifyPickupOTPModal,
  setShowRefundRequestModal,
  otpSentTo,
  setShowReturnModal,
  formatDate,
  formatCurrency,
  refreshOrderRefundStatus
}) {
  const isReturnFlow = order.status === 'return_requested' || 
                      order.returnRequest?.status === 'approved' ||
                      ['out_for_pickup', 'pickup_near_location', 'pickup_otp_generated', 'pickup_completed', 'refund_requested'].includes(order.status);
  
  const steps = getStatusSteps(isReturnFlow ? order.returnRequest?.status || order.status : order.status, isReturnFlow, order);
  const hasOTPGenerated = order.deliveryOTP || order.otpGenerated;
  const hasPickupOTPGenerated = order.returnRequest?.pickupOTP || order.pickupOTP;
  const isReturnRequested = order.status === 'return_requested';
  const returnStatus = order.returnRequest?.status;
  const refundStatus = order.refundStatus || order.returnRequest?.refundStatus;
  const refundDetails = order.returnRequest?.refundDetails;

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

  const handleRefreshRefundStatus = async () => {
    if (!order._id) return;
    
    const data = await refreshOrderRefundStatus(order._id);
    if (data) {
      alert(`Refund status refreshed: ${data.refundStatus || 'No update'}`);
    }
  };

  const getAvailableActions = () => {
    const actions = [];
    
    // Delivery Actions
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

    // Return Pickup Actions - FIXED
    // Check if return request is approved (not order status)
    if (order.returnRequest?.status === 'approved' && order.returnRequest?.requested === true) {
      actions.push({
        label: 'Out for Pickup',
        onClick: () => updateOrderStatus(order._id, 'out_for_pickup'),
        color: 'bg-blue-600 hover:bg-blue-700',
        icon: Truck,
        description: 'Start pickup process'
      });
    }
    
    if (order.returnRequest?.status === 'out_for_pickup' || order.status === 'out_for_pickup') {
      actions.push({
        label: 'Near Pickup Location',
        onClick: () => updateOrderStatus(order._id, 'pickup_near_location'),
        color: 'bg-orange-600 hover:bg-orange-700',
        icon: MapPin,
        description: 'Update pickup location status'
      });
    }
    
    if (order.returnRequest?.status === 'pickup_near_location' || order.status === 'pickup_near_location') {
      if (!hasPickupOTPGenerated) {
        actions.push({
          label: 'Generate Pickup OTP',
          onClick: () => generatePickupOTPForOrder(order._id),
          color: 'bg-purple-600 hover:bg-purple-700',
          icon: Key,
          description: 'Generate OTP for pickup verification'
        });
      }
      
      if (hasPickupOTPGenerated) {
        actions.push({
          label: 'Verify Pickup OTP',
          onClick: () => setShowVerifyPickupOTPModal(true),
          color: 'bg-green-600 hover:bg-green-700',
          icon: Lock,
          description: 'Verify pickup OTP'
        });
      }
    }
    
    if (order.returnRequest?.status === 'pickup_completed' || order.status === 'pickup_completed') {
      actions.push({
        label: 'Request Refund',
        onClick: () => setShowRefundRequestModal(true),
        color: 'bg-red-600 hover:bg-red-700',
        icon: DollarSign,
        description: 'Request refund from manufacturer'
      });
    }

    // Refund Status Check Action
    if (refundStatus && refundStatus !== 'completed') {
      actions.push({
        label: 'Check Refund Status',
        onClick: handleRefreshRefundStatus,
        color: 'bg-yellow-600 hover:bg-yellow-700',
        icon: RefreshCw,
        description: 'Refresh refund status from manufacturer'
      });
    }

    return actions;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header with Back Button */}
      <div className={`p-6 ${isReturnFlow ? 'bg-gradient-to-r from-purple-600 to-pink-700' : 'bg-gradient-to-r from-blue-600 to-indigo-700'} text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={backToList}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-bold">
                {isReturnFlow ? 'Return Pickup' : 'Delivery'} - Order #{order.orderNumber}
              </h2>
              <p className={`${isReturnFlow ? 'text-purple-100' : 'text-blue-100'}`}>
                {order.status === 'delivered' && order.deliveredAt 
                  ? `Delivered on ${formatDate(order.deliveredAt)}`
                  : order.assignedAt 
                  ? `Assigned on ${formatDate(order.assignedAt)}`
                  : `Placed on ${formatDate(order.createdAt)}`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {refundStatus && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                refundStatus === 'completed' ? 'bg-green-100 text-green-800' :
                refundStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                refundStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                REFUND {refundStatus.toUpperCase()}
              </span>
            )}
            {getStatusBadge(order.status)}
          </div>
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

      {/* Refund Completed Banner */}
      {refundStatus === 'completed' && refundDetails && (
        <div className="p-6 border-b border-gray-200">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckSquare size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-green-900 mb-2 flex items-center">
                  Refund Successfully Completed!
                </h3>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-sm text-green-800 mb-1">Refund Amount</p>
                    <p className="text-2xl font-bold text-green-900">
                      ₹{refundDetails.amount?.toLocaleString() || order.totalAmount?.toLocaleString() || '0'}
                    </p>
                  </div>
                  {refundDetails.transactionId && (
                    <div className="bg-white/60 p-3 rounded-lg">
                      <p className="text-sm text-green-800 mb-1">Transaction ID</p>
                      <p className="text-sm font-mono font-semibold text-green-900 break-all">
                        {refundDetails.transactionId}
                      </p>
                    </div>
                  )}
                  {refundDetails.processedAt && (
                    <div className="bg-white/60 p-3 rounded-lg">
                      <p className="text-sm text-green-800 mb-1">Processed On</p>
                      <p className="text-sm font-semibold text-green-900">
                        {formatDate(refundDetails.processedAt)}
                      </p>
                    </div>
                  )}
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-sm text-green-800 mb-1">Status</p>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      <p className="text-sm font-semibold text-green-900">Completed</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                  <p className="text-xs text-green-800 flex items-start">
                    <CheckCircle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                    <span>
                      The refund has been successfully processed by the manufacturer. 
                      The amount will reflect in the customer account within 5-7 business days 
                      depending on their bank processing time.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Processing Banner */}
      {refundStatus === 'processing' && (
        <div className="p-6 border-b border-gray-200">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Loader2 size={28} className="text-white animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-blue-900 mb-2 flex items-center">
                  Refund Processing
                </h3>
                <p className="text-blue-700">
                  The manufacturer is processing your refund of {formatCurrency(order.totalAmount || 0)}.
                  This usually takes 3-5 business days.
                </p>
                {refundDetails?.transactionId && (
                  <div className="mt-3 bg-white/60 p-3 rounded-lg">
                    <p className="text-sm text-blue-800 mb-1">Transaction ID</p>
                    <p className="text-xs font-mono text-blue-900 break-all">
                      {refundDetails.transactionId}
                    </p>
                  </div>
                )}
                <div className="mt-4">
                  <button
                    onClick={handleRefreshRefundStatus}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center text-sm"
                  >
                    <RefreshCw size={14} className="mr-2" />
                    Check Refund Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Timeline */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          {isReturnFlow ? 'Return Pickup Status' : 'Delivery Status'}
        </h3>
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
                    ? `${isReturnFlow ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}` 
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
                  {(step.status === 'near_location' || step.status === 'pickup_near_location') && step.isActive && (hasOTPGenerated || hasPickupOTPGenerated) && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ OTP generated for customer verification
                    </p>
                  )}
                  {step.status === 'pickup_completed' && step.isActive && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Item collected successfully
                    </p>
                  )}
                  {step.status === 'refund_requested' && step.isActive && (
                    <p className="text-sm text-red-600 mt-1">
                      ✓ Refund requested to manufacturer
                    </p>
                  )}
                  {/* Refund Status Details */}
                  {step.refundStep && step.isActive && (
                    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg max-w-md">
                      <p className="text-sm font-semibold text-orange-900 mb-1">Refund Status:</p>
                      {order.returnRequest?.refundDetails?.amount && (
                        <p className="text-sm text-orange-800">
                          <strong>Amount:</strong> ₹{order.returnRequest.refundDetails.amount.toLocaleString()}
                        </p>
                      )}
                      {order.returnRequest?.refundDetails?.transactionId && (
                        <p className="text-sm text-orange-800">
                          <strong>Transaction ID:</strong> {order.returnRequest.refundDetails.transactionId}
                        </p>
                      )}
                      {order.returnRequest?.refundDetails?.processedAt && (
                        <p className="text-sm text-orange-800">
                          <strong>Processed:</strong> {formatDate(order.returnRequest.refundDetails.processedAt)}
                        </p>
                      )}
                      {step.status === 'refund_pending' && (
                        <p className="text-xs text-orange-700 mt-2">
                          <Clock size={12} className="inline mr-1" />
                          Manufacturer is reviewing the refund request
                        </p>
                      )}
                      {step.status === 'refund_processing' && (
                        <p className="text-xs text-orange-700 mt-2">
                          <Loader2 size={12} className="inline mr-1 animate-spin" />
                          Refund is being processed. Expected within 5-7 business days
                        </p>
                      )}
                      {step.status === 'refund_completed' && (
                        <p className="text-xs text-green-700 mt-2 font-semibold">
                          <CheckSquare size={12} className="inline mr-1" />
                          Refund has been successfully processed!
                        </p>
                      )}
                      {(step.status === 'refund_rejected' || step.status === 'refund_failed') && (
                        <p className="text-xs text-red-700 mt-2 font-semibold">
                          <XCircle size={12} className="inline mr-1" />
                          Refund {step.status === 'refund_rejected' ? 'was rejected' : 'failed'}. Please contact support.
                        </p>
                      )}
                    </div>
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
              <h4 className="font-semibold text-gray-900">
                {isReturnFlow ? 'Pickup Address' : 'Delivery Address'}
              </h4>
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
      {(order.status === 'near_location' || order.status === 'pickup_near_location') && (
        <div className="p-6 border-b border-gray-200 bg-purple-50">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Key size={20} className="mr-2 text-purple-600" />
            {isReturnFlow ? 'Pickup OTP Status' : 'Delivery OTP Status'}
          </h3>
          
          {(isReturnFlow ? hasPickupOTPGenerated : hasOTPGenerated) ? (
            <div className="bg-white p-6 rounded-lg border border-purple-200">
              <div className="flex items-center justify-center mb-4">
                <Shield size={32} className="text-green-600 mr-3" />
                <div>
                  <p className="font-semibold text-green-800">OTP Sent to Customer</p>
                  <p className="text-sm text-green-700">
                    Phone: <span className="font-bold">{otpSentTo || order.deliveryAddress?.phone || 'N/A'}</span>
                  </p>
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                <p className="text-sm text-yellow-800 font-semibold">Next Action Required:</p>
                <p className="text-sm text-yellow-700">
                  The OTP has been sent to the customer's phone. Ask the customer for the OTP they received.
                  Then click "Verify OTP" and enter the OTP to {isReturnFlow ? 'complete the pickup' : 'complete the delivery'}.
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
                    This is required before {isReturnFlow ? 'completing pickup' : 'completing delivery'}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items Section */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {isReturnFlow ? 'Items to Pickup' : 'Items to Deliver'} ({order.items?.length || 0})
        </h3>
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
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {isReturnFlow ? 'Pickup Actions' : 'Delivery Actions'}
        </h3>
        
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

          {/* Manual Refresh for Refund Status */}
          {refundStatus && refundStatus !== 'completed' && (
            <button
              onClick={handleRefreshRefundStatus}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition flex items-center"
            >
              <RefreshCw size={18} className="mr-2" />
              Refresh Refund Status
            </button>
          )}
        </div>

        {/* Important Instructions */}
        <div className={`p-4 rounded-lg border ${isReturnFlow ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'}`}>
          <p className={`text-sm ${isReturnFlow ? 'text-purple-800' : 'text-blue-800'} font-semibold mb-2`}>
            {isReturnFlow ? 'Pickup Instructions:' : 'Delivery Instructions:'}
          </p>
          <ul className={`text-sm ${isReturnFlow ? 'text-purple-700' : 'text-blue-700'} space-y-1 list-disc list-inside`}>
            {!isReturnFlow && order.status === 'confirmed' && (
              <li>Click "Start Delivery" to begin the delivery process</li>
            )}
            {!isReturnFlow && order.status === 'out_for_delivery' && (
              <li>When you are near the delivery location, click "Near Location"</li>
            )}
            {!isReturnFlow && order.status === 'near_location' && !hasOTPGenerated && (
              <>
                <li>You are near the delivery location</li>
                <li>Click "Generate OTP" to send a verification OTP to the customer</li>
                <li>The OTP will be sent to: {order.deliveryAddress?.phone || 'N/A'}</li>
                <li>Ask the customer for the OTP they received</li>
              </>
            )}
            {!isReturnFlow && order.status === 'near_location' && hasOTPGenerated && (
              <>
                <li>OTP has been sent to customer's phone: <strong>{otpSentTo || order.deliveryAddress?.phone || 'N/A'}</strong></li>
                <li>Ask the customer: "What is the OTP you received?"</li>
                <li>Enter the OTP that the customer tells you</li>
                <li>Click "Verify OTP & Deliver" to complete the delivery</li>
                <li>System will verify if the OTP matches before completing delivery</li>
              </>
            )}
            {isReturnFlow && order.status === 'return_requested' && (
              <li>This return request is pending approval. Please wait for customer approval or contact them.</li>
            )}
            {isReturnFlow && order.returnRequest?.status === 'approved' && (
              <li>Click "Out for Pickup" to begin the pickup process</li>
            )}
            {isReturnFlow && (order.returnRequest?.status === 'out_for_pickup' || order.status === 'out_for_pickup') && (
              <li>When you are near the pickup location, click "Near Pickup Location"</li>
            )}
            {isReturnFlow && (order.returnRequest?.status === 'pickup_near_location' || order.status === 'pickup_near_location') && !hasPickupOTPGenerated && (
              <>
                <li>You are near the pickup location</li>
                <li>Click "Generate Pickup OTP" to send a verification OTP to the customer</li>
                <li>The OTP will be sent to: {order.deliveryAddress?.phone || 'N/A'}</li>
                <li>Ask the customer for the pickup OTP they received</li>
              </>
            )}
            {isReturnFlow && (order.returnRequest?.status === 'pickup_near_location' || order.status === 'pickup_near_location') && hasPickupOTPGenerated && (
              <>
                <li><strong>Pickup OTP has been sent to customer's phone: {order.deliveryAddress?.phone || 'N/A'}</strong></li>
                <li><strong>Important:</strong> The OTP is only visible to the customer</li>
                <li>Ask the customer: <strong>"What is the pickup OTP you received?"</strong></li>
                <li>Enter the OTP that the customer tells you</li>
                <li>Click "Verify Pickup OTP" to complete the pickup</li>
              </>
            )}
            {isReturnFlow && (order.returnRequest?.status === 'pickup_completed' || order.status === 'pickup_completed') && (
              <>
                <li>Item has been successfully collected from the customer</li>
                <li>Click "Request Refund" to notify the manufacturer to process the refund</li>
              </>
            )}
            {isReturnFlow && (order.returnRequest?.status === 'refund_requested' || order.status === 'refund_requested') && (
              <>
                <li>Refund has been requested to the manufacturer</li>
                <li>Manufacturer will process the refund within 5-7 business days</li>
                <li>Click "Check Refund Status" to see the latest update</li>
              </>
            )}
            {refundStatus === 'processing' && (
              <>
                <li><strong>Refund is being processed by manufacturer</strong></li>
                <li>Estimated completion: 3-5 business days</li>
                <li>Click "Refresh Refund Status" to check for updates</li>
              </>
            )}
            {refundStatus === 'completed' && (
              <>
                <li><strong>Refund has been successfully processed!</strong></li>
                <li>Amount: {formatCurrency(refundDetails?.amount || order.totalAmount || 0)}</li>
                <li>Transaction ID: {refundDetails?.transactionId || 'N/A'}</li>
                <li>Processed on: {refundDetails?.processedAt ? formatDate(refundDetails.processedAt) : 'N/A'}</li>
              </>
            )}
            {!isReturnFlow && order.status === 'delivered' && (
              <>
                <li>This order has been delivered successfully</li>
                <li>Customer can request returns within 14 days of delivery</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}