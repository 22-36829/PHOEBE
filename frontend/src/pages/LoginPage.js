import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, Shield, BarChart3, Brain } from 'lucide-react';
import { AuthAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await AuthAPI.login(formData.email, formData.password);
      login(res); // Use AuthContext login function
      
      // Navigate based on role
      const role = (res.user?.role || '').toLowerCase();
      const roleToPath = { 
        admin: '/admin', 
        manager: '/manager', 
        staff: '/staff' 
      };
      
      const redirectPath = roleToPath[role] || '/';
      console.log('Login successful, redirecting to:', redirectPath, 'for role:', role);
      navigate(redirectPath);
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Background accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-purple-200/30 blur-3xl"></div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 md:grid-cols-2 gap-8 px-4 sm:px-6 lg:px-8">
        {/* Left brand/marketing panel */}
        <div className="hidden md:flex flex-col justify-center p-8 md:p-12 lg:p-16 bg-gradient-to-br from-blue-600 to-purple-700 text-white rounded-3xl md:rounded-none">
          <Link to="/" className="inline-flex items-center text-white/90 hover:text-white mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-4">
            Welcome back to Phoebe Drugstore
          </h1>
          <p className="text-white/80 text-lg mb-10 max-w-md">
            Manage sales, inventory, and forecasts with an AI-powered platform designed for modern pharmacies.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5" />
              <span className="text-white/90">Bank-level security and privacy</span>
            </div>
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-5 h-5" />
              <span className="text-white/90">Real-time analytics dashboard</span>
            </div>
            <div className="flex items-center space-x-3">
              <Brain className="w-5 h-5" />
              <span className="text-white/90">AI recommendations and forecasting</span>
            </div>
          </div>
        </div>

        {/* Right form card */}
        <div className="flex items-center justify-center p-4 sm:p-8 md:p-10">
          <div className="w-full max-w-md md:max-w-md">
            <div className="mb-8 text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Sign in to your account
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Or{' '}
                <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                  create a new account
                </Link>
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="input-field pl-10 bg-white/80 backdrop-blur-sm py-3.5"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="input-field pl-10 pr-10 bg-white/80 backdrop-blur-sm py-3.5"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <button type="button" className="font-medium text-primary-600 hover:text-primary-500">
                    Forgot your password?
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>
            </form>

            {/* Demo Accounts */}
            <div className="mt-8 p-4 bg-white/70 backdrop-blur rounded-xl border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Demo Accounts</h3>
              <div className="space-y-1 text-xs text-gray-700">
                <p><strong>Admin:</strong> admin@phoebe.com / admin123</p>
                <p><strong>Manager:</strong> manager@phoebe.com / manager123</p>
                <p><strong>Staff:</strong> staff@phoebe.com / staff123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
