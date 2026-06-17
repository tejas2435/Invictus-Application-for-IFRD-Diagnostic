import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DiagnosticForm from './components/DiagnosticForm';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SupervisorLogin from './pages/SupervisorLogin';
import SupervisorDashboard from './pages/SupervisorDashboard';
import SupervisorForgotPassword from './pages/SupervisorForgotPassword';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/:signupToken/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/diagnostic" element={<DiagnosticForm />} />
        
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />

        <Route path="/supervisor/login" element={<SupervisorLogin />} />
        <Route path="/supervisor" element={<SupervisorDashboard />} />
        <Route path="/supervisor/forgot-password" element={<SupervisorForgotPassword />} />
      </Routes>
    </Router>
  );
}

export default App;
