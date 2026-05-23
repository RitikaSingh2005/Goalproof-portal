import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import EmployeeDashboard from './pages/dashboards/EmployeeDashboard';
import ManagerDashboard from './pages/dashboards/ManagerDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-t-2 border-brand-500 animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-r-2 border-fuchsia-500 animate-spin animation-delay-500"></div>
        <div className="absolute inset-4 rounded-full border-b-2 border-cyan-500 animate-spin animation-delay-1000"></div>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} />;
  }

  return children;
};

function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Router>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          className: 'bg-dark-800 text-white border border-dark-700 shadow-2xl backdrop-blur-xl',
          style: { background: '#18181b', color: '#fff', border: '1px solid #27272a' }
        }} 
      />
      <Routes>
        <Route path="/login" element={user ? <Navigate to={`/${user.role}`} /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={`/${user.role}`} /> : <Register />} />
        
        <Route path="/" element={<Navigate to={user ? `/${user.role}` : "/login"} />} />

        <Route path="/employee" element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeDashboard />
          </ProtectedRoute>
        } />
        <Route path="/manager" element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
