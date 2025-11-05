import React, { useState, useEffect } from 'react';
import { Building2, Users, CreditCard, MessageSquare, TrendingUp, CheckCircle2, Clock, AlertCircle, Bell, Package, DollarSign, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AdminAPI, SupportAPI, AnnouncementsAPI } from '../../services/api';

const AdminDashboard = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    totalPharmacies: 0,
    activePharmacies: 0,
    totalUsers: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    openTickets: 0,
    pendingTickets: 0,
    totalAnnouncements: 0,
  });
  
  // Recent items
  const [recentSubscriptions, setRecentSubscriptions] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Load all data in parallel
      const [pharmaciesRes, usersRes, subscriptionsRes, ticketsRes, ticketsStatsRes, announcementsRes] = await Promise.all([
        AdminAPI.listPharmacies(token),
        AdminAPI.listUsers(token),
        AdminAPI.listSubscriptions(token),
        SupportAPI.listTickets({ status: 'all' }, token),
        SupportAPI.getStats(token),
        AnnouncementsAPI.list({ page: 1, per_page: 5 }, token),
      ]);
      
      // Calculate pharmacy stats
      const pharmacies = pharmaciesRes.success ? pharmaciesRes.pharmacies || [] : [];
      const activePharmacies = pharmacies.filter(p => p.is_active).length;
      
      // Calculate user stats
      const users = usersRes.success ? usersRes.users || [] : [];
      const activeUsers = users.filter(u => u.is_active).length;
      
      // Calculate subscription stats
      const subscriptions = subscriptionsRes.success ? subscriptionsRes.subscriptions || [] : [];
      const activeSubscriptions = subscriptions.filter(s => (s.status || '').toLowerCase() === 'active').length;
      
      // Calculate Monthly Recurring Revenue (MRR)
      const monthlyRevenue = subscriptions.reduce((sum, sub) => {
        const status = (sub.status || '').toLowerCase();
        if (status === 'active') {
          const price = parseFloat(sub.price || 0);
          const billingMonths = parseInt(sub.billing_cycle_months || 1);
          const monthlyEquivalent = price / billingMonths;
          return sum + monthlyEquivalent;
        }
        return sum;
      }, 0);
      
      // Calculate total revenue
      const totalRevenue = subscriptions.reduce((sum, sub) => {
        const status = (sub.status || '').toLowerCase();
        if (status === 'active') {
          return sum + parseFloat(sub.price || 0);
        }
        return sum;
      }, 0);
      
      // Get ticket stats
      const tickets = ticketsRes.success ? ticketsRes.tickets || [] : [];
      const openTickets = tickets.filter(t => (t.status || '').toLowerCase() === 'open').length;
      const pendingTickets = tickets.filter(t => (t.status || '').toLowerCase() === 'pending').length;
      
      // Get announcements
      const announcements = announcementsRes.success ? announcementsRes.announcements || [] : [];
      
      // Update stats
      setStats({
        totalPharmacies: pharmacies.length,
        activePharmacies,
        totalUsers: users.length,
        totalSubscriptions: subscriptions.length,
        activeSubscriptions,
        monthlyRevenue,
        totalRevenue,
        openTickets,
        pendingTickets,
        totalAnnouncements: announcements.length,
      });
      
      // Set recent items (limit to 5)
      setRecentSubscriptions(subscriptions.slice(0, 5));
      setRecentTickets(tickets.slice(0, 5));
      setRecentAnnouncements(announcements.slice(0, 5));
      
    } catch (e) {
      setError(e.message || 'Failed to load dashboard data');
      console.error('Error loading dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const statusLower = (status || '').toLowerCase();
    const badges = {
      active: { class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: 'Active' },
      deactivated: { class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Deactivated' },
      open: { class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', label: 'Open' },
      pending: { class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Pending' },
      resolved: { class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: 'Resolved' },
      closed: { class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Closed' },
    };
    const badge = badges[statusLower] || badges.active;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${badge.class}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-7 lg:p-8 text-white">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Overview</h1>
          <p className="text-purple-100">Welcome back! Here's what's happening with your system.</p>
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
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Total Pharmacies</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{stats.totalPharmacies}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{stats.activePharmacies} Active</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-800 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{stats.totalUsers}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Active users</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-800 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Monthly Revenue</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(stats.monthlyRevenue)}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{stats.activeSubscriptions} Active Subs</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-800 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Open Tickets</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{stats.openTickets}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{stats.pendingTickets} Pending</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <MessageSquare className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Subscriptions */}
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
            <div className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Recent Subscriptions
            </div>
            <a href="/admin/subscriptions" className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="p-5">
            {recentSubscriptions.length > 0 ? (
              <div className="space-y-3">
                {recentSubscriptions.map((sub) => (
                  <div key={sub.id} className="flex items-start justify-between pb-3 border-b border-gray-100 dark:border-slate-800 last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                        {sub.pharmacy_name || 'Unknown Pharmacy'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-slate-400">{sub.plan} Plan</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">{formatCurrency(sub.price)}</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      {getStatusBadge(sub.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">No subscriptions yet</p>
            )}
          </div>
        </div>

        {/* Recent Support Tickets */}
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
            <div className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-600" />
              Recent Support Tickets
            </div>
            <a href="/admin/chat" className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="p-5">
            {recentTickets.length > 0 ? (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-start justify-between pb-3 border-b border-gray-100 dark:border-slate-800 last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                        {ticket.subject || 'No subject'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-slate-400">{ticket.pharmacy_name || 'Unknown Pharmacy'}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">{formatDate(ticket.created_at)}</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      {getStatusBadge(ticket.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">No tickets yet</p>
            )}
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
            <div className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-600" />
              Recent Announcements
            </div>
            <a href="/admin/announcements" className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="p-5">
            {recentAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {recentAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="pb-3 border-b border-gray-100 dark:border-slate-800 last:border-0 last:pb-0">
                    <div className="flex items-start gap-2">
                      {announcement.is_pinned && (
                        <span className="text-yellow-500 text-xs mt-0.5">📌</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                          {announcement.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {announcement.content}
                        </p>
                        <span className="text-xs text-gray-400 mt-1 block">{formatDate(announcement.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">No announcements yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
