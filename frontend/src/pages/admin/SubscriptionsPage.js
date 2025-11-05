import React, { useState, useEffect } from 'react';
import { CreditCard, Building, Calendar, DollarSign, TrendingUp, CheckCircle2, Clock, XCircle, Eye, MoreVertical, Package, Database, Loader2, BarChart3, Plus, X, AlertCircle, Edit2, Save, Trash2, Power, Play, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AdminAPI } from '../../services/api';

const SubscriptionsPage = () => {
  const { token } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters and pagination
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    plan: 'all',
    pharmacy_id: 'all',
    page: 1,
    per_page: 10,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
  });
  const [selected, setSelected] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [priceOverride, setPriceOverride] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planEditForm, setPlanEditForm] = useState({
    monthly_price: '',
    quarterly_price: '',
    semi_annual_price: '',
    annual_price: '',
  });
  const [planCreateForm, setPlanCreateForm] = useState({
    plan_name: '',
    monthly_price: '',
    quarterly_price: '',
    semi_annual_price: '',
    annual_price: '',
  });
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    price: '',
    status: 'active',
    end_date: '',
    payment_method: 'xendit',
    xendit_payment_id: '',
    gcash_payment_id: '',
  });
  
  // Form state
  const [subscriptionForm, setSubscriptionForm] = useState({
    pharmacy_id: '',
    plan: '',
    price: '',
    billing_cycle_months: 1,
    status: 'active',
    start_date: '',
    end_date: '',
    payment_method: 'xendit',
    xendit_payment_id: '',
    gcash_payment_id: '',
  });

  useEffect(() => {
    loadData();
  }, [token, filters]);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      
      // Prepare params for subscriptions API
      const subscriptionParams = {
        page: filters.page,
        per_page: filters.per_page,
        ...(filters.search && { search: filters.search }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.plan !== 'all' && { plan: filters.plan }),
        ...(filters.pharmacy_id !== 'all' && { pharmacy_id: filters.pharmacy_id }),
      };
      
      const [subscriptionsRes, pharmaciesRes, plansRes] = await Promise.all([
        AdminAPI.listSubscriptions(subscriptionParams, token),
        AdminAPI.listPharmacies(token),
        AdminAPI.getSubscriptionPlans(token)
      ]);
      
      if (subscriptionsRes.success) {
        setSubscriptions(subscriptionsRes.subscriptions || []);
        if (subscriptionsRes.pagination) {
          setPagination(subscriptionsRes.pagination);
        }
      }
      if (pharmaciesRes.success) {
        setPharmacies(pharmaciesRes.pharmacies || []);
      }
      if (plansRes.success) {
        setSubscriptionPlans(plansRes.plans || []);
        // Set default plan if available
        if (plansRes.plans && plansRes.plans.length > 0 && !subscriptionForm.plan) {
          setSubscriptionForm(prev => ({ ...prev, plan: plansRes.plans[1]?.plan_name || plansRes.plans[0]?.plan_name || '' }));
        }
      }
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 })); // Reset to page 1 when filter changes
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Auto-calculate price when plan or billing cycle changes
  useEffect(() => {
    if (!priceOverride && subscriptionForm.plan && subscriptionForm.billing_cycle_months) {
      const selectedPlan = subscriptionPlans.find(p => p.plan_name === subscriptionForm.plan);
      if (selectedPlan) {
        let calculatedPrice = 0;
        const months = subscriptionForm.billing_cycle_months;
        
        // Convert prices to numbers (they might come as strings from the database)
        const monthlyPrice = parseFloat(selectedPlan.monthly_price) || 0;
        const quarterlyPrice = selectedPlan.quarterly_price ? parseFloat(selectedPlan.quarterly_price) : null;
        const semiAnnualPrice = selectedPlan.semi_annual_price ? parseFloat(selectedPlan.semi_annual_price) : null;
        const annualPrice = selectedPlan.annual_price ? parseFloat(selectedPlan.annual_price) : null;
        
        if (months === 1) {
          calculatedPrice = monthlyPrice;
        } else if (months === 3) {
          calculatedPrice = quarterlyPrice !== null ? quarterlyPrice : monthlyPrice * 3;
        } else if (months === 6) {
          calculatedPrice = semiAnnualPrice !== null ? semiAnnualPrice : monthlyPrice * 6;
        } else if (months === 12) {
          calculatedPrice = annualPrice !== null ? annualPrice : monthlyPrice * 12;
        } else {
          calculatedPrice = monthlyPrice * months;
        }
        
        // Ensure calculatedPrice is a valid number before calling toFixed
        if (typeof calculatedPrice === 'number' && !isNaN(calculatedPrice)) {
          setSubscriptionForm(prev => ({ ...prev, price: calculatedPrice.toFixed(2) }));
        }
      }
    }
  }, [subscriptionForm.plan, subscriptionForm.billing_cycle_months, subscriptionPlans, priceOverride]);

  const openEditPlanModal = (plan) => {
    setEditingPlan(plan);
    setPlanEditForm({
      monthly_price: parseFloat(plan.monthly_price || 0).toFixed(2),
      quarterly_price: plan.quarterly_price ? parseFloat(plan.quarterly_price).toFixed(2) : '',
      semi_annual_price: plan.semi_annual_price ? parseFloat(plan.semi_annual_price).toFixed(2) : '',
      annual_price: plan.annual_price ? parseFloat(plan.annual_price).toFixed(2) : '',
    });
    setShowEditPlanModal(true);
  };

  const closeEditPlanModal = () => {
    setShowEditPlanModal(false);
    setEditingPlan(null);
    setPlanEditForm({
      monthly_price: '',
      quarterly_price: '',
      semi_annual_price: '',
      annual_price: '',
    });
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    if (!token || !editingPlan) return;
    
    try {
      setError('');
      const payload = {};
      
      if (planEditForm.monthly_price) {
        payload.monthly_price = parseFloat(planEditForm.monthly_price);
      }
      
      if (planEditForm.quarterly_price) {
        payload.quarterly_price = parseFloat(planEditForm.quarterly_price);
      }
      
      if (planEditForm.semi_annual_price) {
        payload.semi_annual_price = parseFloat(planEditForm.semi_annual_price);
      }
      
      if (planEditForm.annual_price) {
        payload.annual_price = parseFloat(planEditForm.annual_price);
      }
      
      if (Object.keys(payload).length === 0) {
        setError('Please update at least one price');
        return;
      }
      
      const res = await AdminAPI.updateSubscriptionPlan(editingPlan.id, payload, token);
      if (res.success) {
        closeEditPlanModal();
        await loadData();
      } else {
        setError(res.error || 'Failed to update plan prices');
      }
    } catch (e) {
      setError(e.message || 'Failed to update plan prices');
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!token) return;
    
    try {
      setError('');
      const payload = {
        plan_name: planCreateForm.plan_name,
        monthly_price: parseFloat(planCreateForm.monthly_price),
      };
      
      if (planCreateForm.quarterly_price) {
        payload.quarterly_price = parseFloat(planCreateForm.quarterly_price);
      }
      
      if (planCreateForm.semi_annual_price) {
        payload.semi_annual_price = parseFloat(planCreateForm.semi_annual_price);
      }
      
      if (planCreateForm.annual_price) {
        payload.annual_price = parseFloat(planCreateForm.annual_price);
      }
      
      const res = await AdminAPI.createSubscriptionPlan(payload, token);
      if (res.success) {
        setShowCreatePlanModal(false);
        setPlanCreateForm({
          plan_name: '',
          monthly_price: '',
          quarterly_price: '',
          semi_annual_price: '',
          annual_price: '',
        });
        await loadData();
      } else {
        setError(res.error || 'Failed to create plan');
      }
    } catch (e) {
      setError(e.message || 'Failed to create plan');
    }
  };

  const handleDeletePlan = async (planId, planName) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to delete the "${planName}" plan? This will deactivate the plan and it will no longer be available for new subscriptions.`)) {
      return;
    }
    
    try {
      setError('');
      const res = await AdminAPI.deleteSubscriptionPlan(planId, token);
      if (res.success) {
        await loadData();
      } else {
        setError(res.error || 'Failed to delete plan');
      }
    } catch (e) {
      setError(e.message || 'Failed to delete plan');
    }
  };

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    if (!token) return;
    
    try {
      setError('');
      
      // Validate required fields
      if (!subscriptionForm.pharmacy_id) {
        setError('Please select a pharmacy');
        return;
      }
      if (!subscriptionForm.plan) {
        setError('Please select a plan');
        return;
      }
      
      // Prepare payload - ensure pharmacy_id is an integer
      const payload = {
        pharmacy_id: parseInt(subscriptionForm.pharmacy_id),
        plan: subscriptionForm.plan,
        billing_cycle_months: parseInt(subscriptionForm.billing_cycle_months) || 1,
        status: subscriptionForm.status || 'active',
      };
      
      // Only include price if override is enabled
      if (priceOverride && subscriptionForm.price) {
        payload.price = parseFloat(subscriptionForm.price);
      }
      
      // Include optional fields
      if (subscriptionForm.start_date) {
        payload.start_date = subscriptionForm.start_date;
      }
      if (subscriptionForm.end_date) {
        payload.end_date = subscriptionForm.end_date;
      }
      if (subscriptionForm.payment_method) {
        payload.payment_method = subscriptionForm.payment_method;
      }
      if (subscriptionForm.payment_method === 'xendit' && subscriptionForm.xendit_payment_id) {
        payload.xendit_payment_id = subscriptionForm.xendit_payment_id;
      }
      if (subscriptionForm.payment_method === 'gcash' && subscriptionForm.gcash_payment_id) {
        payload.gcash_payment_id = subscriptionForm.gcash_payment_id;
      }
      
      const res = await AdminAPI.createSubscription(payload, token);
      if (res && res.success) {
        setShowCreateModal(false);
        setPriceOverride(false);
        setError(''); // Clear any previous errors
        setSubscriptionForm({
          pharmacy_id: '',
          plan: subscriptionPlans[1]?.plan_name || subscriptionPlans[0]?.plan_name || '',
          price: '',
          billing_cycle_months: 1,
          status: 'active',
          start_date: '',
          end_date: '',
          payment_method: 'xendit',
          xendit_payment_id: '',
          gcash_payment_id: '',
        });
        await loadData();
      } else {
        // Display error message from backend
        setError(res?.error || 'Failed to create subscription');
      }
    } catch (e) {
      // Handle network errors or other exceptions
      const errorMessage = e.message || 'Failed to create subscription. Please check your connection and try again.';
      setError(errorMessage);
      console.error('Error creating subscription:', e);
    }
  };

  const openEditModal = (sub) => {
    setEditingSubscription(sub);
    setEditForm({
      price: parseFloat(sub.price || 0).toFixed(2),
      status: sub.status || 'active',
      end_date: sub.end_date ? new Date(sub.end_date).toISOString().slice(0, 16) : '',
      payment_method: sub.payment_method || 'xendit',
      xendit_payment_id: sub.xendit_payment_id || '',
      gcash_payment_id: sub.gcash_payment_id || '',
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingSubscription(null);
    setEditForm({
      price: '',
      status: 'active',
      end_date: '',
      payment_method: 'xendit',
      xendit_payment_id: '',
      gcash_payment_id: '',
    });
  };

  const handleActivateSubscription = async (subscriptionId, pharmacyName) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to activate the subscription for "${pharmacyName}"? The subscription will be activated and billing will resume.`)) {
      return;
    }
    
    try {
      setError('');
      const res = await AdminAPI.updateSubscription(subscriptionId, { status: 'active' }, token);
      if (res && res.success) {
        // Close details modal if it's open for this subscription
        if (selected && selected.id === subscriptionId) {
          closeDetails();
        }
        await loadData();
      } else {
        setError(res?.error || 'Failed to activate subscription');
      }
    } catch (e) {
      setError(e.message || 'Failed to activate subscription');
    }
  };

  const handleDeactivateSubscription = async (subscriptionId, pharmacyName) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to deactivate the subscription for "${pharmacyName}"? The subscription will be deactivated but can be reactivated later.`)) {
      return;
    }
    
    try {
      setError('');
      const res = await AdminAPI.updateSubscription(subscriptionId, { status: 'deactivated' }, token);
      if (res && res.success) {
        // Close details modal if it's open for this subscription
        if (selected && selected.id === subscriptionId) {
          closeDetails();
        }
        await loadData();
      } else {
        setError(res?.error || 'Failed to deactivate subscription');
      }
    } catch (e) {
      setError(e.message || 'Failed to deactivate subscription');
    }
  };

  const handleDeleteSubscription = async (subscriptionId, pharmacyName) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to delete the subscription for "${pharmacyName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setError('');
      const res = await AdminAPI.deleteSubscription(subscriptionId, token);
      if (res.success) {
        // Close details modal if it's open for this subscription
        if (selected && selected.id === subscriptionId) {
          closeDetails();
        }
        await loadData();
      } else {
        setError(res.error || 'Failed to delete subscription');
      }
    } catch (e) {
      setError(e.message || 'Failed to delete subscription');
    }
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    if (!token || !editingSubscription) return;
    
    try {
      setError('');
      const payload = {};
      
      if (editForm.price) {
        payload.price = parseFloat(editForm.price);
      }
      
      if (editForm.status) {
        payload.status = editForm.status;
      }
      
      if (editForm.end_date !== undefined) {
        payload.end_date = editForm.end_date || null;
      }
      
      if (editForm.payment_method) {
        payload.payment_method = editForm.payment_method;
      }
      
      if (editForm.payment_method === 'xendit' && editForm.xendit_payment_id !== undefined) {
        payload.xendit_payment_id = editForm.xendit_payment_id;
      }
      
      if (editForm.payment_method === 'gcash' && editForm.gcash_payment_id !== undefined) {
        payload.gcash_payment_id = editForm.gcash_payment_id;
      }
      
      const res = await AdminAPI.updateSubscription(editingSubscription.id, payload, token);
      if (res.success) {
        closeEditModal();
        await loadData();
        // If we're viewing details, update the selected subscription
        if (selected && selected.id === editingSubscription.id) {
          setSelected(res.subscription);
        }
      }
    } catch (e) {
      setError(e.message || 'Failed to update subscription');
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₱0.00';
    return `₱${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getBillingCycleLabel = (months) => {
    if (months === 1) return 'Monthly';
    if (months === 3) return 'Quarterly';
    if (months === 6) return 'Semi-Annual';
    if (months === 12) return 'Annual';
    return `${months} Month${months > 1 ? 's' : ''}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: {
        icon: <CheckCircle2 className="w-4 h-4" />,
        class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
        label: 'Active',
      },
      deactivated: {
        icon: <XCircle className="w-4 h-4" />,
        class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
        label: 'Deactivated',
      },
      cancelled: {
        icon: <XCircle className="w-4 h-4" />,
        class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
        label: 'Cancelled',
      },
      expired: {
        icon: <XCircle className="w-4 h-4" />,
        class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
        label: 'Expired',
      },
    };
    const badge = badges[status] || badges.deactivated;
  return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border ${badge.class}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const loadStorage = async (pharmacyId) => {
    if (!token) return;
    setLoadingStorage(true);
    setStorageError('');
    try {
      const res = await AdminAPI.getPharmacyStorage(pharmacyId, token);
      if (res.success) {
        setStorageData(res);
      } else {
        setStorageError(res.error || 'Failed to load storage data');
      }
    } catch (e) {
      setStorageError(e.message || 'Failed to load storage data');
    } finally {
      setLoadingStorage(false);
    }
  };

  const openDetails = (sub) => {
    setSelected(sub);
    setShowDetails(true);
    setStorageData(null);
    loadStorage(sub.pharmacy_id);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelected(null);
    setStorageData(null);
    setStorageError('');
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Calculate stats
  const totalCount = subscriptions.length;
  const activeCount = subscriptions.filter(sub => (sub.status || '').toLowerCase() === 'active').length;
  const deactivatedCount = subscriptions.filter(sub => (sub.status || '').toLowerCase() === 'deactivated').length;
  const cancelledCount = subscriptions.filter(sub => (sub.status || '').toLowerCase() === 'cancelled').length;
  
  // Calculate Monthly Recurring Revenue (MRR) - sum of active subscriptions divided by their billing cycle
  const monthlyRevenue = subscriptions.reduce((sum, sub) => {
    const status = (sub.status || '').toLowerCase();
    if (status === 'active') {
      const price = parseFloat(sub.price || 0);
      const billingMonths = parseInt(sub.billing_cycle_months || 1);
      // Convert to monthly equivalent
      const monthlyEquivalent = price / billingMonths;
      return sum + monthlyEquivalent;
    }
    return sum;
  }, 0);
  
  // Calculate total revenue (sum of all active subscription prices)
  const totalRevenue = subscriptions.reduce((sum, sub) => {
    const status = (sub.status || '').toLowerCase();
    if (status === 'active') {
      return sum + parseFloat(sub.price || 0);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-7 lg:p-8 text-white">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold mb-2">Subscriptions</h1>
            <p className="text-purple-100">Manage pharmacy subscriptions and billing</p>
        </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Subscription
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-950 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-800 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
        <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Total Subscriptions</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{totalCount}</p>
        </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
      </div>
    </div>
        <div className="bg-white dark:bg-slate-950 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-800 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Active</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{activeCount}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-950 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-800 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Monthly Recurring Revenue</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(monthlyRevenue)}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Total: {formatCurrency(totalRevenue)}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-950 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-800 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Deactivated</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{deactivatedCount}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{cancelledCount} Cancelled</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Plans Management */}
      {!loading && (
        <div className="mb-8 bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Subscription Plans
            </h3>
            <button
              onClick={() => setShowCreatePlanModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Plan
            </button>
          </div>
          {subscriptionPlans.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-slate-400">No subscription plans found</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subscriptionPlans.map(plan => (
              <div key={plan.id} className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-lg border border-purple-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-slate-100">{plan.plan_name}</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditPlanModal(plan)}
                      className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="Edit Prices"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id, plan.plan_name)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Monthly:</span>
                    <span className="font-semibold text-gray-900 dark:text-slate-100">₱{parseFloat(plan.monthly_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {plan.quarterly_price && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Quarterly:</span>
                      <span className="font-semibold text-gray-900 dark:text-slate-100">₱{parseFloat(plan.quarterly_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {plan.semi_annual_price && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Semi-Annual:</span>
                      <span className="font-semibold text-gray-900 dark:text-slate-100">₱{parseFloat(plan.semi_annual_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {plan.annual_price && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Annual:</span>
                      <span className="font-semibold text-gray-900 dark:text-slate-100">₱{parseFloat(plan.annual_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-800">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Create New Plan</h2>
              <button
                onClick={() => setShowCreatePlanModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePlan} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Plan Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={planCreateForm.plan_name}
                  onChange={(e) => setPlanCreateForm(prev => ({ ...prev, plan_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  placeholder="e.g., Starter, Professional, Enterprise"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Monthly Price (₱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={planCreateForm.monthly_price}
                  onChange={(e) => setPlanCreateForm(prev => ({ ...prev, monthly_price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Quarterly Price (₱) (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={planCreateForm.quarterly_price}
                  onChange={(e) => setPlanCreateForm(prev => ({ ...prev, quarterly_price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  placeholder="Leave empty if not applicable"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Semi-Annual Price (₱) (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={planCreateForm.semi_annual_price}
                  onChange={(e) => setPlanCreateForm(prev => ({ ...prev, semi_annual_price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  placeholder="Leave empty if not applicable"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Annual Price (₱) (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={planCreateForm.annual_price}
                  onChange={(e) => setPlanCreateForm(prev => ({ ...prev, annual_price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  placeholder="Leave empty if not applicable"
                />
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Plan Prices Modal */}
      {showEditPlanModal && editingPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-800">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Edit Plan Prices</h2>
              <button
                onClick={closeEditPlanModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdatePlan} className="p-6 space-y-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">{editingPlan.plan_name} Plan</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Update pricing for this subscription plan</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Monthly Price (₱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={planEditForm.monthly_price}
                  onChange={(e) => setPlanEditForm(prev => ({ ...prev, monthly_price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Quarterly Price (₱) (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={planEditForm.quarterly_price}
                  onChange={(e) => setPlanEditForm(prev => ({ ...prev, quarterly_price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  placeholder="Leave empty if not applicable"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Semi-Annual Price (₱) (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={planEditForm.semi_annual_price}
                  onChange={(e) => setPlanEditForm(prev => ({ ...prev, semi_annual_price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  placeholder="Leave empty if not applicable"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Annual Price (₱) (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={planEditForm.annual_price}
                  onChange={(e) => setPlanEditForm(prev => ({ ...prev, annual_price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  placeholder="Leave empty if not applicable"
                />
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeEditPlanModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Update Prices
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscriptions List */}
      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">All Subscriptions</h2>
            {pagination.total > 0 && (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Showing {((pagination.page - 1) * pagination.per_page) + 1} to {Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total} subscriptions
              </p>
            )}
          </div>
          
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by pharmacy or plan..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="deactivated">Deactivated</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            
            {/* Plan Filter */}
            <div>
              <select
                value={filters.plan}
                onChange={(e) => handleFilterChange('plan', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
              >
                <option value="all">All Plans</option>
                {subscriptionPlans.map(plan => (
                  <option key={plan.id} value={plan.plan_name}>{plan.plan_name}</option>
                ))}
              </select>
            </div>
            
            {/* Pharmacy Filter */}
            <div>
              <select
                value={filters.pharmacy_id}
                onChange={(e) => handleFilterChange('pharmacy_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
              >
                <option value="all">All Pharmacies</option>
                {pharmacies.filter(p => p.is_active).map(pharmacy => (
                  <option key={pharmacy.id} value={pharmacy.id}>{pharmacy.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-slate-400">Loading subscriptions...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-slate-400">No subscriptions found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-800">
            {subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-sm">
                      <Building className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{subscription.pharmacy_name || 'Unknown Pharmacy'}</h3>
                        {getStatusBadge(subscription.status)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                          <Package className="w-4 h-4" />
                          <span className="font-medium">{subscription.plan} Plan</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-medium">{formatCurrency(subscription.price)} / {getBillingCycleLabel(subscription.billing_cycle_months).toLowerCase()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                        <span>Started: {formatDate(subscription.start_date)}</span>
                        <span>•</span>
                        <span>ID: #{subscription.pharmacy_id}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openDetails(subscription)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    {(subscription.status || '').toLowerCase() === 'active' && (
                      <button
                        onClick={() => handleDeactivateSubscription(subscription.id, subscription.pharmacy_name || 'Unknown Pharmacy')}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                        title="Deactivate Subscription"
                      >
                        <Power className="w-4 h-4" />
                        Deactivate
                      </button>
                    )}
                    {(subscription.status || '').toLowerCase() === 'deactivated' && (
                      <button
                        onClick={() => handleActivateSubscription(subscription.id, subscription.pharmacy_name || 'Unknown Pharmacy')}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        title="Activate Subscription"
                      >
                        <Play className="w-4 h-4" />
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteSubscription(subscription.id, subscription.pharmacy_name || 'Unknown Pharmacy')}
                      className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete Subscription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-slate-400">
              Page {pagination.page} of {pagination.total_pages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                  let pageNum;
                  if (pagination.total_pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.total_pages - 2) {
                    pageNum = pagination.total_pages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        pagination.page === pageNum
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.total_pages}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Subscription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-slate-800">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Create New Subscription</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError(''); // Clear error when closing modal
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubscription} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 flex items-start gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Error creating subscription</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError('')}
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Pharmacy <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={subscriptionForm.pharmacy_id}
                    onChange={(e) => setSubscriptionForm(prev => ({ ...prev, pharmacy_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  >
                    <option value="">Select a pharmacy</option>
                    {pharmacies.filter(ph => ph.is_active).map(ph => {
                      // Check if pharmacy already has an active subscription
                      const hasActiveSub = subscriptions.some(
                        sub => sub.pharmacy_id === ph.id && ((sub.status || '').toLowerCase() === 'active' || (sub.status || '').toLowerCase() === 'deactivated')
                      );
                      return (
                        <option key={ph.id} value={ph.id}>
                          {ph.name} {hasActiveSub ? '(Has Active Subscription)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Plan <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={subscriptionForm.plan}
                    onChange={(e) => {
                      setSubscriptionForm(prev => ({ ...prev, plan: e.target.value }));
                      setPriceOverride(false);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  >
                    <option value="">Select a plan</option>
                    {subscriptionPlans.map(plan => {
                      // Check if selected pharmacy already has this plan
                      const pharmacyHasThisPlan = subscriptionForm.pharmacy_id && subscriptions.some(
                        sub => sub.pharmacy_id === parseInt(subscriptionForm.pharmacy_id) && 
                               sub.plan.toLowerCase() === plan.plan_name.toLowerCase() && 
                               ((sub.status || '').toLowerCase() === 'active' || (sub.status || '').toLowerCase() === 'deactivated')
                      );
                      return (
                        <option 
                          key={plan.id} 
                          value={plan.plan_name}
                          disabled={pharmacyHasThisPlan}
                        >
                          {plan.plan_name} {pharmacyHasThisPlan ? '(Already Active)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {subscriptionForm.pharmacy_id && subscriptionPlans.some(plan => {
                    const pharmacyHasThisPlan = subscriptions.some(
                      sub => sub.pharmacy_id === parseInt(subscriptionForm.pharmacy_id) && 
                             sub.plan.toLowerCase() === plan.plan_name.toLowerCase() && 
                             ((sub.status || '').toLowerCase() === 'active' || (sub.status || '').toLowerCase() === 'deactivated')
                    );
                    return pharmacyHasThisPlan;
                  }) && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      This pharmacy already has an active or deactivated subscription. Please cancel or expire the existing subscription first.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={subscriptionForm.status}
                    onChange={(e) => setSubscriptionForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  >
                    <option value="active">Active</option>
                    <option value="deactivated">Deactivated</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Billing Cycle (Months) <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={subscriptionForm.billing_cycle_months}
                    onChange={(e) => {
                      setSubscriptionForm(prev => ({ ...prev, billing_cycle_months: parseInt(e.target.value) }));
                      setPriceOverride(false);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  >
                    <option value={1}>1 Month (Monthly)</option>
                    <option value={3}>3 Months (Quarterly)</option>
                    <option value={6}>6 Months (Semi-Annual)</option>
                    <option value={12}>12 Months (Annual)</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                      Price (₱) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPriceOverride(!priceOverride)}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                    >
                      {priceOverride ? 'Use Auto Price' : 'Override Price'}
                    </button>
                  </div>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={subscriptionForm.price}
                    onChange={(e) => {
                      setSubscriptionForm(prev => ({ ...prev, price: e.target.value }));
                      setPriceOverride(true);
                    }}
                    readOnly={!priceOverride}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200 ${
                      !priceOverride ? 'bg-gray-50 dark:bg-slate-800 cursor-not-allowed' : ''
                    }`}
                    placeholder="Auto-calculated"
                  />
                  {!priceOverride && subscriptionForm.plan && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      Price automatically calculated based on plan and billing cycle
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={subscriptionForm.start_date}
                    onChange={(e) => setSubscriptionForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={subscriptionForm.end_date}
                    onChange={(e) => setSubscriptionForm(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={subscriptionForm.payment_method}
                    onChange={(e) => setSubscriptionForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  >
                    <option value="xendit">💳 Xendit</option>
                    <option value="gcash">📱 GCash</option>
                  </select>
                </div>
                {subscriptionForm.payment_method === 'xendit' ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Xendit Payment ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={subscriptionForm.xendit_payment_id}
                      onChange={(e) => setSubscriptionForm(prev => ({ ...prev, xendit_payment_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                      placeholder="Xendit payment reference ID"
                    />
                  </div>
                ) : (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      GCash Payment Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={subscriptionForm.gcash_payment_id}
                      onChange={(e) => setSubscriptionForm(prev => ({ ...prev, gcash_payment_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                      placeholder="GCash transaction reference or mobile number"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      Enter GCash transaction reference number or mobile number used for payment
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  Create Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {showEditModal && editingSubscription && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-slate-800">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Edit Subscription</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{editingSubscription.pharmacy_name || 'Unknown Pharmacy'}</p>
              </div>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSubscription} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Current Plan
                  </label>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100">
                    {editingSubscription.plan}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Price (₱) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={editForm.price}
                    onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                </div>
        <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  >
                    <option value="active">Active</option>
                    <option value="deactivated">Deactivated</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={editForm.payment_method}
                    onChange={(e) => setEditForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  >
                    <option value="xendit">💳 Xendit</option>
                    <option value="gcash">📱 GCash</option>
                  </select>
                </div>
                {editForm.payment_method === 'xendit' ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Xendit Payment ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={editForm.xendit_payment_id}
                      onChange={(e) => setEditForm(prev => ({ ...prev, xendit_payment_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                      placeholder="Xendit payment reference ID"
                    />
                  </div>
                ) : (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      GCash Payment Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={editForm.gcash_payment_id}
                      onChange={(e) => setEditForm(prev => ({ ...prev, gcash_payment_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                      placeholder="GCash transaction reference or mobile number"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      Enter GCash transaction reference number or mobile number used for payment
                    </p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.end_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Leave empty to keep current end date
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Update Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-slate-800">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 bg-gradient-to-r from-purple-50 to-white dark:from-slate-900 dark:to-slate-950">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-sm">
                      <Building className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 leading-tight">{selected.pharmacy_name || 'Unknown Pharmacy'}</h2>
                    {getStatusBadge(selected.status)}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Subscription ID: #{selected.id} • Pharmacy ID: #{selected.pharmacy_id}</p>
                </div>
                <button
                  onClick={closeDetails}
                  className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
              {/* Subscription Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">Plan</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    <Package className="w-4 h-4" /> {selected.plan}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">Price</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> {formatCurrency(selected.price)} / {getBillingCycleLabel(selected.billing_cycle_months).toLowerCase()}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">Payment Method</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    {selected.payment_method === 'gcash' ? '📱' : '💳'} {selected.payment_method === 'gcash' ? 'GCash' : (selected.payment_method === 'xendit' ? 'Xendit' : 'N/A')}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">Payment Reference</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {selected.payment_method === 'gcash' 
                      ? (selected.gcash_payment_id || '—') 
                      : (selected.xendit_payment_id || '—')}
                  </p>
                </div>
              </div>

              {/* Storage/Usage Section */}
              <div className="border-t border-gray-200 dark:border-slate-800 pt-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Storage & Data Usage
                </h3>

                {loadingStorage ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-slate-400">Loading storage data...</p>
                  </div>
                ) : storageError ? (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 text-sm">
                    {storageError}
                  </div>
                ) : storageData ? (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                        <p className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">Total Storage Used</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{storageData.summary.total_size_pretty}</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/40 rounded-xl border border-purple-200 dark:border-purple-800 p-4">
                        <p className="text-xs uppercase tracking-wide text-purple-600 dark:text-purple-400 mb-1">Storage Limit</p>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{storageData.summary.storage_limit_gb} GB</p>
                      </div>
                    </div>

                    {/* Storage Usage Progress Bar */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Storage Usage</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {storageData.summary.usage_percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            storageData.summary.usage_percentage >= 80
                              ? 'bg-gradient-to-r from-red-500 to-red-600'
                              : storageData.summary.usage_percentage >= 60
                              ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600'
                          }`}
                          style={{ width: `${Math.min(storageData.summary.usage_percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Storage Breakdown Chart */}
                    {storageData.storage_breakdown && storageData.storage_breakdown.length > 0 ? (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Storage Breakdown by Category
                        </h4>
                        <div className="space-y-3">
                          {storageData.storage_breakdown.map((item, index) => {
                            const maxSize = Math.max(...storageData.storage_breakdown.map(i => i.size_bytes || 0));
                            const percentage = maxSize > 0 ? ((item.size_bytes || 0) / maxSize) * 100 : 0;
                            const colors = [
                              'from-purple-500 to-purple-600',
                              'from-blue-500 to-blue-600',
                              'from-emerald-500 to-emerald-600',
                              'from-orange-500 to-orange-600',
                              'from-pink-500 to-pink-600',
                            ];
                            const color = colors[index % colors.length];
                            
                            return (
                              <div key={item.category_name} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-semibold text-gray-900 dark:text-slate-100 capitalize">
                                    {item.category_name}
                                  </span>
                                  <span className="font-semibold text-gray-900 dark:text-slate-100">{item.total_size}</span>
        </div>
                                <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                                  <div
                                    className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                                    style={{ width: `${percentage}%` }}
                                  >
                                    <span className="text-[10px] font-semibold text-white">
                                      {percentage.toFixed(1)}%
                                    </span>
        </div>
      </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-500 dark:text-slate-400">
                        No storage data available
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete the subscription for "${selected.pharmacy_name || 'Unknown Pharmacy'}"? This action cannot be undone.`)) {
                      handleDeleteSubscription(selected.id, selected.pharmacy_name || 'Unknown Pharmacy');
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Subscription
                </button>
                {(selected.status || '').toLowerCase() === 'active' && (
                  <button
                    onClick={() => {
                      handleDeactivateSubscription(selected.id, selected.pharmacy_name || 'Unknown Pharmacy');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                  >
                    <Power className="w-4 h-4" />
                    Deactivate Subscription
                  </button>
                )}
                {(selected.status || '').toLowerCase() === 'deactivated' && (
                  <button
                    onClick={() => {
                      handleActivateSubscription(selected.id, selected.pharmacy_name || 'Unknown Pharmacy');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Activate Subscription
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    closeDetails();
                    openEditModal(selected);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Subscription
                </button>
                <button
                  onClick={closeDetails}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;
