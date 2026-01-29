
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainWebsite from './components/MainWebsite';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import SupplierDashboard from './components/SupplierDashboard';
import ManufacturerDashboard from './components/ManufacturerDashboard';

function PrivateRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If user role doesn't match, send them back to their specific dashboard
    const redirectMap = {
      admin: '/admin/dashboard',
      suppliers: '/supplier/dashboard',
      manufacturers: '/manufacturer/dashboard',
      customers: '/main' // Customers go to main website
    };
    return <Navigate to={redirectMap[user.role] || '/login'} />;
  }

  return children;
}

// Special route for main website - only accessible to logged-in customers
function MainWebsiteRoute({ children }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // If no token, go to login
  if (!token) {
    return <Navigate to="/login" />;
  }

  // If logged in but NOT a customer, redirect to appropriate dashboard
  if (user.role !== 'customers') {
    const redirectMap = {
      admin: '/admin/dashboard',
      suppliers: '/supplier/dashboard',
      manufacturers: '/manufacturer/dashboard'
    };
    return <Navigate to={redirectMap[user.role] || '/login'} />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route redirects to login */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* Login page is the first thing users see */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Main website - only for logged-in customers */}
        <Route 
          path="/main" 
          element={
            <MainWebsiteRoute>
              <MainWebsite />
            </MainWebsiteRoute>
          } 
        />
        
        {/* Admin Route */}
        <Route 
          path="/admin/dashboard" 
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } 
        />

        {/* Supplier Route */}
        <Route 
          path="/supplier/dashboard" 
          element={
            <PrivateRoute allowedRoles={['suppliers']}>
              <SupplierDashboard />
            </PrivateRoute>
          } 
        />

        {/* Manufacturer Route */}
        <Route 
          path="/manufacturer/dashboard" 
          element={
            <PrivateRoute allowedRoles={['manufacturers']}>
              <ManufacturerDashboard />
            </PrivateRoute>
          } 
        />

        {/* Default redirect for any other route */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
