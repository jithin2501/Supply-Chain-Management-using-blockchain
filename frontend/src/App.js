import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainWebsite from './components/MainWebsite';
import CustomerProductsPage from './components/CustomerProductsPage';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import SupplierDashboard from './components/SupplierDashboard';
import ManufacturerDashboard from './components/ManufacturerDashboard';
import ProductsDashboard from './components/ProductsDashboard';

// Private Route Component for role-based access
const PrivateRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectMap = {
      admin: '/admin/dashboard',
      suppliers: '/supplier/dashboard',
      manufacturers: '/manufacturer/dashboard',
      customers: '/main'
    };
    return <Navigate to={redirectMap[user.role] || '/login'} />;
  }

  return children;
};

// Main website route - only for customers
const MainWebsiteRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (user.role !== 'customers') {
    const redirectMap = {
      admin: '/admin/dashboard',
      suppliers: '/supplier/dashboard',
      manufacturers: '/manufacturer/dashboard'
    };
    return <Navigate to={redirectMap[user.role] || '/login'} />;
  }

  return children;
};

// Route for all authenticated users (any role)
const AuthenticatedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" />;
  }

  return children;
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Customer Routes */}
        <Route 
          path="/main" 
          element={
            <MainWebsiteRoute>
              <MainWebsite />
            </MainWebsiteRoute>
          } 
        />
        
        <Route 
          path="/customer/products" 
          element={
            <PrivateRoute allowedRoles={['customers']}>
              <CustomerProductsPage />
            </PrivateRoute>
          } 
        />
        
        {/* Admin Routes */}
        <Route 
          path="/admin/dashboard" 
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } 
        />

        {/* Supplier Routes */}
        <Route 
          path="/supplier/dashboard" 
          element={
            <PrivateRoute allowedRoles={['suppliers']}>
              <SupplierDashboard />
            </PrivateRoute>
          } 
        />

        {/* Manufacturer Routes */}
        <Route 
          path="/manufacturer/dashboard" 
          element={
            <PrivateRoute allowedRoles={['manufacturers']}>
              <ManufacturerDashboard />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/manufacturer/products" 
          element={
            <PrivateRoute allowedRoles={['manufacturers']}>
              <ProductsDashboard />
            </PrivateRoute>
          } 
        />

        {/* Fallback Routes */}
        <Route path="/dashboard" element={
          <AuthenticatedRoute>
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Select Dashboard</h2>
                <p className="text-gray-600 mb-6">Choose the appropriate dashboard for your role.</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => window.location.href = '/admin/dashboard'}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Admin Dashboard
                  </button>
                  <button 
                    onClick={() => window.location.href = '/supplier/dashboard'}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Supplier Dashboard
                  </button>
                  <button 
                    onClick={() => window.location.href = '/manufacturer/dashboard'}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Manufacturer Dashboard
                  </button>
                  <button 
                    onClick={() => window.location.href = '/main'}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Customer Main Website
                  </button>
                </div>
              </div>
            </div>
          </AuthenticatedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;