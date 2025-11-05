import React, { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Camera, Shield, Edit3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const StaffProfile = () => {
  const { user, updateUserDisplay } = useAuth();
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', address: '' });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || prev.email,
        phone: user.phone || user.mobile || prev.phone || '',
        address: user.address || prev.address || '',
      }));
    }
  }, [user]);

  const saveDisplay = () => {
    const fullName = `${(formData.firstName || '').trim()} ${(formData.lastName || '').trim()}`.trim();
    updateUserDisplay({
      first_name: formData.firstName,
      last_name: formData.lastName,
      phone: formData.phone,
      address: formData.address,
      name: fullName || user?.name || user?.full_name,
      full_name: fullName || user?.full_name || user?.name,
    });
    setShowProfileModal(false);
    setSavedMsg('Display info updated. Official records remain unchanged.');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-blue-100">Manage your staff account</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4">
                  {((user?.first_name || formData.firstName || 'S').charAt(0))}{((user?.last_name || formData.lastName || 'T').charAt(0))}
                </div>
                <button className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors" title="Change avatar">
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{user?.first_name || formData.firstName} {user?.last_name || formData.lastName}</h2>
              <p className="text-gray-500">Staff</p>
            </div>
            <div className="mt-6 space-y-2 text-left">
              <div className="flex items-center text-gray-700"><Mail className="w-4 h-4 mr-2 text-gray-400" /> {user?.email || formData.email}</div>
              <div className="flex items-center text-gray-700"><Phone className="w-4 h-4 mr-2 text-gray-400" /> {user?.phone || user?.mobile || formData.phone || '—'}</div>
              <div className="flex items-start text-gray-700"><MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400" /> <span>{user?.address || formData.address || '—'}</span></div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-2">
              <button onClick={() => setShowProfileModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"><Edit3 className="w-4 h-4" /> Edit Profile</button>
              <button onClick={() => setShowPasswordModal(true)} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2"><Shield className="w-4 h-4" /> Change Password</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Contact your manager to update official profile records. You can still edit your display info.</p>
            {savedMsg && <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{savedMsg}</div>}
          </div>
        </div>
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input name="firstName" value={formData.firstName} onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input name="lastName" value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input name="phone" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea name="address" value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowProfileModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
                <button onClick={saveDisplay} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <input type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowPasswordModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
                <button onClick={() => setShowPasswordModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Update</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffProfile;


