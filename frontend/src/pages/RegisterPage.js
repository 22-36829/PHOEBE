import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Building, ArrowLeft, Shield, Brain, BarChart3 } from 'lucide-react';
import { AuthAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    pharmacyName: '',
    role: 'manager'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverMsg, setServerMsg] = useState('');
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
    setServerMsg('');

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      if (!formData.pharmacyName || !formData.pharmacyName.trim()) {
        throw new Error('Pharmacy name is required');
      }
      const payload = {
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        pharmacy_name: formData.pharmacyName,
        role: 'manager'
      };
      const res = await AuthAPI.register(payload);
      if (res && res.pending_approval) {
        setSubmitted(true);
        setServerMsg(res.message || 'Signup request submitted. We will notify you once approved.');
        return;
      }
      // Fallback: if backend still returns token
      if (res && res.access_token) {
        login(res);
        navigate('/manager');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setServerMsg(error.message || 'Registration failed');
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
            Create your pharmacy account
          </h1>
          <p className="text-white/80 text-lg mb-10 max-w-md">
            Start your 14-day free trial. No credit card required.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5" />
              <span className="text-white/90">Secure and compliant</span>
            </div>
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-5 h-5" />
              <span className="text-white/90">Insights and dashboards</span>
            </div>
            <div className="flex items-center space-x-3">
              <Brain className="w-5 h-5" />
              <span className="text-white/90">AI-powered recommendations</span>
            </div>
          </div>
        </div>

        {/* Right form card */}
        <div className="flex items-center justify-center p-4 sm:p-8 md:p-10">
          <div className="w-full max-w-md md:max-w-md">
            <div className="mb-8 text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Create your pharmacy account
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Or{' '}
                <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                  sign in to existing account
                </Link>
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {submitted && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
                  <p className="font-semibold">Request submitted</p>
                  <p className="mt-1">{serverMsg}</p>
                </div>
              )}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={handleChange}
                        className="input-field pl-10 bg-white/80 backdrop-blur-sm py-3.5"
                        placeholder="First name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="input-field bg-white/80 backdrop-blur-sm py-3.5"
                      placeholder="Last name"
                    />
                  </div>
                </div>

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
                  <label htmlFor="pharmacyName" className="block text-sm font-medium text-gray-700">
                    Pharmacy Name
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="pharmacyName"
                      name="pharmacyName"
                      type="text"
                      required
                      value={formData.pharmacyName}
                      onChange={handleChange}
                      className="input-field pl-10 bg-white/80 backdrop-blur-sm py-3.5"
                      placeholder="Your pharmacy name"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">We'll create your pharmacy and start a 14-day Free Trial.</p>
                </div>

                {/* Role is auto-set to manager. Admin accounts cannot be self-registered. */}
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="input-field pr-10 bg-white/80 backdrop-blur-sm py-3.5"
                      placeholder="Create a password"
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

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="input-field pr-10 bg-white/80 backdrop-blur-sm py-3.5"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                  I agree to the{' '}
                  <button type="button" className="text-primary-600 hover:text-primary-500">
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button type="button" className="text-primary-600 hover:text-primary-500">
                    Privacy Policy
                  </button>
                </label>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || submitted}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    submitted ? 'Request Submitted' : 'Create your pharmacy account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
