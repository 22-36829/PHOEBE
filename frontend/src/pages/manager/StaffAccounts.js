import React, { useEffect, useMemo, useState } from 'react';
import { Users, Plus, Search, Filter, Mail, Shield, Trash2, Loader2, X, Edit3, RotateCcw } from 'lucide-react';
import { ManagerAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const StaffAccounts = () => {
  const { token, user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' });
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', phone: '', address: '' });
  const [resettingId, setResettingId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(s =>
      [s.email, s.username, s.first_name, s.last_name, s.role]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    );
  }, [query, staff]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await ManagerAPI.listStaff(token);
      setStaff(data.staff || []);
    } catch (e) {
      setError(e.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.first_name || !form.last_name) return;
    try {
      setCreating(true);
      setError('');
      await ManagerAPI.createStaff(form, token);
      setShowAdd(false);
      setForm({ first_name: '', last_name: '', email: '', password: '' });
      await load();
    } catch (e) {
      setError(e.message || 'Failed to create staff');
    } finally {
      setCreating(false);
    }
  };

  const makeRole = async (target, role) => {
    try {
      setError('');
      await ManagerAPI.updateStaff(target.id, { role }, token);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to update role');
    }
  };

  const removeStaff = async (target) => {
    try {
      setError('');
      await ManagerAPI.deleteStaff(target.id, token);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to remove staff');
    }
  };

  const isSelf = (row) => user && row.id === user.id;

  const openEdit = (row) => {
    setEditing(row);
    setEditForm({
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      email: row.email || '',
      phone: row.phone || row.mobile || '',
      address: row.address || '',
    });
    setEditOpen(true);
  };

  const saveEdit = async (e) => {
    e?.preventDefault?.();
    if (!editing) return;
    try {
      setEditSaving(true);
      setError('');
      await ManagerAPI.updateStaff(editing.id, editForm, token);
      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to update staff');
    } finally {
      setEditSaving(false);
    }
  };

  const resetPassword = async (row) => {
    if (!row || isSelf(row)) return;
    const ok = window.confirm(`Reset password for ${row.email} to default (staff123)?`);
    if (!ok) return;
    try {
      setResettingId(row.id);
      setError('');
      await ManagerAPI.updateStaff(row.id, { password: 'staff123' }, token);
    } catch (e) {
      setError(e.message || 'Failed to reset password');
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Staff Management</h1>
        <p className="text-indigo-100">Manage staff accounts and permissions for your pharmacy</p>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-4 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search staff..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4 mr-2 inline" />
              Filter
            </button>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </button>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Staff Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Staff Members</h2>
          {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
        </div>
        <div className="p-6">
          {filtered.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members</h3>
              <p className="text-gray-500 mb-4">Add your first staff member to get started</p>
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Add Staff Member
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="py-3 pr-4 font-medium text-gray-900">{row.first_name || row.last_name ? `${row.first_name || ''} ${row.last_name || ''}`.trim() : row.username}</td>
                      <td className="py-3 pr-4 text-gray-700 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{row.email}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${row.role === 'manager' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {row.role}
                        </span>
                      </td>
                      <td className="py-3 pr-0">
                        <div className="flex items-center justify-end gap-2">
                          {/* Only allow actions on staff and not self */}
                          {!isSelf(row) && (
                            <>
                              <button
                                onClick={() => openEdit(row)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Edit Info"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => resetPassword(row)}
                                className="px-3 py-1.5 border border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                                title="Reset Password"
                                disabled={resettingId === row.id}
                              >
                                {resettingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                              </button>
                              {row.role === 'staff' && (
                                <>
                                  <button
                                    onClick={() => makeRole(row, 'manager')}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    title="Make Manager"
                                  >
                                    <Shield className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => removeStaff(row)}
                                    className="px-3 py-1.5 border border-rose-300 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                    title="Remove"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          {row.role === 'manager' && !isSelf(row) && (
                            <button
                              onClick={() => makeRole(row, 'staff')}
                              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                              title="Make Staff"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add Staff Member</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
              </div>
              <div className="flex items-center gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button disabled={creating} type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Edit Staff</h3>
              <button onClick={() => { setEditOpen(false); setEditing(null); }} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input value={editForm.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setEditOpen(false); setEditing(null); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button disabled={editSaving} type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                  {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffAccounts;
