import React, { useEffect, useState } from 'react';
import { Users, Building2, Mail, User as UserIcon, Shield, UserCheck, Search, Plus, X, CheckCircle2, XCircle, Calendar, Filter, Trash2, Power, PowerOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AdminAPI } from '../../services/api';

const AccountsPage = () => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals
  const [showCreatePharmacyModal, setShowCreatePharmacyModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pharmacyFilter, setPharmacyFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: '', end: '' });
  
  // Form states
  const [pharmacyForm, setPharmacyForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    license_number: '',
    owner_name: '',
    is_active: true,
  });
  
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    username: '',
    first_name: '',
    last_name: '',
    role: 'staff',
    pharmacy_id: '',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const [usersRes, pharmaciesRes] = await Promise.all([
        AdminAPI.listUsers(token),
        AdminAPI.listPharmacies(token)
      ]);
      
      if (usersRes.success) {
        setUsers(usersRes.users || []);
      }
      if (pharmaciesRes.success) {
        setPharmacies(pharmaciesRes.pharmacies || []);
      }
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePharmacy = async (e) => {
    e.preventDefault();
    if (!token) return;
    
    try {
      setError('');
      const res = await AdminAPI.createPharmacy(pharmacyForm, token);
      if (res.success) {
        setShowCreatePharmacyModal(false);
        setPharmacyForm({
          name: '',
          address: '',
          phone: '',
          email: '',
          license_number: '',
          owner_name: '',
          is_active: true,
        });
        await loadData();
      }
    } catch (e) {
      setError(e.message || 'Failed to create pharmacy');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!token) return;
    
    try {
      setError('');
      const res = await AdminAPI.createUser(userForm, token);
      if (res.success) {
        setShowCreateUserModal(false);
        setUserForm({
          email: '',
          password: '',
          username: '',
          first_name: '',
          last_name: '',
          role: 'staff',
          pharmacy_id: '',
          is_active: true,
        });
        await loadData();
      }
    } catch (e) {
      setError(e.message || 'Failed to create user');
    }
  };

  const handleToggleUserStatus = async (user) => {
    if (!token) return;
    if (user.id === currentUser?.id) {
      setError('Cannot deactivate your own account');
      return;
    }
    
    const newStatus = !user.is_active;
    const confirmMessage = newStatus 
      ? `Are you sure you want to activate ${user.email}?`
      : `Are you sure you want to deactivate ${user.email}?`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      setError('');
      const res = await AdminAPI.updateUserStatus(user.id, newStatus, token);
      if (res.success) {
        await loadData();
      }
    } catch (e) {
      setError(e.message || 'Failed to update user status');
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { icon: <Shield className="w-3 h-3" />, class: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', label: 'Admin' },
      manager: { icon: <UserCheck className="w-3 h-3" />, class: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', label: 'Manager' },
      staff: { icon: <UserIcon className="w-3 h-3" />, class: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', label: 'Staff' },
    };
    const badge = badges[role] || badges.staff;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.class}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.pharmacy_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);
    
    const matchesPharmacy = pharmacyFilter === 'all' || user.pharmacy_id?.toString() === pharmacyFilter;
    
    const matchesDateRange = !dateRangeFilter.start || !dateRangeFilter.end || (() => {
      const userDate = new Date(user.created_at);
      const start = new Date(dateRangeFilter.start);
      const end = new Date(dateRangeFilter.end);
      end.setHours(23, 59, 59, 999); // Include end date
      return userDate >= start && userDate <= end;
    })();
    
    return matchesSearch && matchesRole && matchesStatus && matchesPharmacy && matchesDateRange;
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-7 lg:p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">User Accounts</h1>
            <p className="text-purple-100">Manage all user accounts and pharmacies</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreatePharmacyModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Pharmacy
            </button>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Advanced Filters */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Advanced Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Pharmacy
            </label>
            <select
              value={pharmacyFilter}
              onChange={(e) => setPharmacyFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
            >
              <option value="all">All Pharmacies</option>
              {pharmacies.map(ph => (
                <option key={ph.id} value={ph.id.toString()}>{ph.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Date Range Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Created From
            </label>
            <input
              type="date"
              value={dateRangeFilter.start}
              onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
            />
          </div>
      <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Created To
            </label>
            <input
              type="date"
              value={dateRangeFilter.end}
              onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
            />
          </div>
        </div>
        
        {/* Clear Filters */}
        {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all' || pharmacyFilter !== 'all' || dateRangeFilter.start || dateRangeFilter.end) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('all');
                setStatusFilter('all');
                setPharmacyFilter('all');
                setDateRangeFilter({ start: '', end: '' });
              }}
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="bg-white dark:bg-slate-950 rounded-2xl p-12 shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-600 dark:text-slate-400">Loading users...</p>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-slate-950 rounded-2xl p-12 shadow-sm border border-gray-200 dark:border-slate-800 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">No users found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    🏥 Pharmacy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-950 divide-y divide-gray-200 dark:divide-slate-800">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-900">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 dark:text-purple-300 text-sm font-medium">
                            {user.first_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                            {user.first_name || user.last_name 
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                              : user.username || 'No name'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {user.pharmacy_name || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        disabled={user.id === currentUser?.id}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          user.is_active
                            ? 'text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-300 dark:bg-red-900/20 dark:hover:bg-red-900/30'
                            : 'text-green-700 bg-green-50 hover:bg-green-100 dark:text-green-300 dark:bg-green-900/20 dark:hover:bg-green-900/30'
                        } ${user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={user.id === currentUser?.id ? 'Cannot deactivate your own account' : (user.is_active ? 'Deactivate user' : 'Activate user')}
                      >
                        {user.is_active ? (
                          <>
                            <PowerOff className="w-3 h-3" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Power className="w-3 h-3" />
                            Activate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 dark:bg-slate-900 px-6 py-3 border-t border-gray-200 dark:border-slate-800">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>
        </div>
      )}

      {/* Create Pharmacy Modal */}
      {showCreatePharmacyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-slate-800">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Create New Pharmacy</h2>
              <button
                onClick={() => setShowCreatePharmacyModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePharmacy} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Pharmacy Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pharmacyForm.name}
                    onChange={(e) => setPharmacyForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={pharmacyForm.license_number}
                    onChange={(e) => setPharmacyForm(prev => ({ ...prev, license_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    value={pharmacyForm.owner_name}
                    onChange={(e) => setPharmacyForm(prev => ({ ...prev, owner_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={pharmacyForm.phone}
                    onChange={(e) => setPharmacyForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={pharmacyForm.email}
                    onChange={(e) => setPharmacyForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Address
                  </label>
                  <textarea
                    value={pharmacyForm.address}
                    onChange={(e) => setPharmacyForm(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pharmacyForm.is_active}
                      onChange={(e) => setPharmacyForm(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreatePharmacyModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  Create Pharmacy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-slate-800">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Create New User</h2>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={userForm.password}
                    onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.first_name}
                    onChange={(e) => setUserForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.last_name}
                    onChange={(e) => setUserForm(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Auto-generated from email if empty"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  />
                </div>
      <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={userForm.role}
                    onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Pharmacy <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={userForm.pharmacy_id}
                    onChange={(e) => setUserForm(prev => ({ ...prev, pharmacy_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  >
                    <option value="">Select a pharmacy</option>
                    {pharmacies.map(ph => (
                      <option key={ph.id} value={ph.id}>{ph.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={userForm.is_active}
                      onChange={(e) => setUserForm(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
      </div>
      )}
    </div>
  );
};

export default AccountsPage;
