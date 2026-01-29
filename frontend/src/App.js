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
      customers: '/customer/dashboard'
    };
    return <Navigate to={redirectMap[user.role] || '/'} />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainWebsite />} />
        <Route path="/login" element={<LoginPage />} />
        
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

        {/* Default Redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;