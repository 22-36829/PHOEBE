import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLayout from './layouts/AdminLayout';
import ManagerLayout from './layouts/ManagerLayout';
import { AdminDashboard, SubscriptionsPage, AccountsPage, AnnouncementsPage, ChatPage } from './pages/admin';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerProfile from './pages/manager/ManagerProfile';
import StaffAccounts from './pages/manager/StaffAccounts';
import InventoryManagement from './pages/manager/InventoryManagement';
import POSPage from './pages/manager/POSPage';
import Sustainability from './pages/manager/Sustainability';
import Forecasting from './pages/manager/Forecasting';
import AIAssistant from './pages/manager/AIAssistant';
import SupportTickets from './pages/manager/SupportTickets';
import Announcements from './pages/manager/Announcements';
import StaffLayout from './layouts/StaffLayout';
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffProfile from './pages/staff/StaffProfile';
import InventoryRequests from './pages/staff/InventoryRequests';
import StaffPOS from './pages/staff/POSPage';
import OwnSales from './pages/staff/OwnSales';
import WasteExpiry from './pages/staff/WasteExpiry';
import AIRecommendations from './pages/staff/AIRecommendations';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const RequireAuth = ({ roles, children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <LoginPage />;
  }
  
  // Check role permissions
  if (roles && user && !roles.includes(user.role)) {
    console.log('Insufficient permissions. User role:', user.role, 'Required roles:', roles);
    return <LandingPage />;
  }
  
  console.log('Access granted for user:', user?.email, 'with role:', user?.role);
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-white">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin" element={<RequireAuth roles={["admin"]}><AdminLayout /></RequireAuth>}>
              <Route index element={<AdminDashboard />} />
              <Route path="subscriptions" element={<SubscriptionsPage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="chat" element={<ChatPage />} />
            </Route>
            <Route path="/manager" element={<RequireAuth roles={["manager","admin"]}><ManagerLayout /></RequireAuth>}>
              <Route index element={<ManagerDashboard />} />
              <Route path="profile" element={<ManagerProfile />} />
              <Route path="staff" element={<StaffAccounts />} />
              <Route path="inventory" element={<InventoryManagement />} />
              <Route path="pos" element={<POSPage />} />
            <Route path="sustainability" element={<Sustainability />} />
            <Route path="forecasting" element={<Forecasting />} />
            <Route path="ai" element={<AIAssistant />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="support" element={<SupportTickets />} />
          </Route>
            <Route path="/staff" element={<RequireAuth roles={["staff","manager","admin"]}><StaffLayout /></RequireAuth>}>
              <Route index element={<StaffDashboard />} />
              <Route path="profile" element={<StaffProfile />} />
              <Route path="inventory-requests" element={<InventoryRequests />} />
              <Route path="pos" element={<StaffPOS />} />
              <Route path="own-sales" element={<OwnSales />} />
              <Route path="waste-expiry" element={<WasteExpiry />} />
              <Route path="ai" element={<AIRecommendations />} />
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
