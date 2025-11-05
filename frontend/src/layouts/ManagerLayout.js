import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  Package, 
  FileText, 
  TrendingUp, 
  Leaf, 
  Bot, 
  ShoppingCart, 
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
  ChevronLeft,
  MessageSquare,
  Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ManagerLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('phoebe_theme');
    return stored ? stored === 'dark' : false;
  });

  useEffect(() => {
    localStorage.setItem('phoebe_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const userInitials = useMemo(() => {
    const source = user?.name || user?.full_name || '';
    const parts = String(source).split(/[\s@._-]+/).filter(Boolean);
    const initials = parts.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
    return initials || 'MP';
  }, [user]);

  const navigation = [
    { name: 'Overview', href: '/manager', icon: BarChart3 },
    { name: 'Profile', href: '/manager/profile', icon: Settings },
    { name: 'Staff Accounts', href: '/manager/staff', icon: Users },
    { name: 'Inventory', href: '/manager/inventory', icon: Package },
    { name: 'POS System', href: '/manager/pos', icon: ShoppingCart },
    { name: 'Forecasting', href: '/manager/forecasting', icon: TrendingUp },
    { name: 'Sustainability', href: '/manager/sustainability', icon: Leaf },
    { name: 'AI Assistant', href: '/manager/ai', icon: Bot },
    { name: 'Announcements', href: '/manager/announcements', icon: Bell },
    { name: 'Support', href: '/manager/support', icon: MessageSquare },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={isDark ? 'dark' : ''}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-950 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center font-semibold text-sm">MP</div>
              <div className="leading-snug">
                <p className="text-base font-semibold text-gray-900 dark:text-slate-100">Manager Portal</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Phoebe</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-3 text-[15px] font-medium rounded-xl transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500 dark:bg-slate-800 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <item.icon className="w-6 h-6 mr-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Mobile bottom utilities */}
          <div className="border-t border-gray-200 dark:border-slate-800 p-3">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setIsDark(v => !v)}
                className={`relative inline-flex items-center w-20 h-9 rounded-full border transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} shadow-sm`}
                aria-label="Toggle theme"
              >
                <span className={`absolute left-1 top-1 h-7 w-7 rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-9' : 'translate-x-0'}`} />
                <Sun className={`w-5 h-5 ml-2 ${isDark ? 'text-slate-500' : 'text-yellow-500'}`} />
                <Moon className={`w-5 h-5 mr-2 ml-auto ${isDark ? 'text-blue-300' : 'text-slate-400'}`} />
              </button>
              <button
                onClick={() => { setSidebarOpen(false); handleLogout(); }}
                className="flex items-center px-4 py-2.5 text-[15px] font-medium text-red-500 bg-white dark:bg-slate-950 border border-red-200 dark:border-red-500/20 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                <LogOut className="w-6 h-6 mr-2" /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex ${sidebarCollapsed ? 'lg:w-24' : 'lg:w-72'} lg:flex-col transition-all`}>
        <div className="flex flex-col flex-grow bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between h-18 px-4 border-b border-gray-200 dark:border-slate-800">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center w-full' : 'space-x-4'}`}>
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center font-semibold text-sm">
                MP
              </div>
              {!sidebarCollapsed && (
                <div className="leading-snug">
                  <p className="text-base font-semibold text-gray-900 dark:text-slate-100">Manager Portal</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Phoebe</p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="absolute top-4 right-[-12px] z-10 p-1.5 rounded-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 shadow"
              title="Expand sidebar"
            >
              <ChevronLeft className="w-4 h-4 rotate-180 text-gray-600 dark:text-slate-300" />
            </button>
          )}

          <nav className="flex-1 px-3 py-5 space-y-1.5">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''} px-3 py-3 text-[15px] font-medium rounded-xl transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500 dark:bg-slate-800 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <item.icon className={`w-6 h-6 ${sidebarCollapsed ? '' : 'mr-4'}`} />
                  {!sidebarCollapsed && item.name}
                </Link>
              );
            })}
          </nav>

          {/* Bottom utilities: theme toggle + logout */}
          <div className="mt-auto border-t border-gray-200 dark:border-slate-800 p-3">
            <div className={`flex ${sidebarCollapsed ? 'flex-col space-y-3 items-center' : 'items-center justify-between'} gap-3`}>
              <button
                onClick={() => setIsDark(v => !v)}
                className={`relative inline-flex items-center ${sidebarCollapsed ? 'w-14' : 'w-20'} h-9 rounded-full border transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} shadow-sm`}
                aria-label="Toggle theme"
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                <span className={`absolute left-1 top-1 h-7 w-7 rounded-full bg-white shadow transition-transform ${isDark ? (sidebarCollapsed ? 'translate-x-6' : 'translate-x-9') : 'translate-x-0'}`} />
                {!sidebarCollapsed && <Sun className={`w-5 h-5 ml-2 ${isDark ? 'text-slate-500' : 'text-yellow-500'}`} />}
                {!sidebarCollapsed && <Moon className={`w-5 h-5 mr-2 ml-auto ${isDark ? 'text-blue-300' : 'text-slate-400'}`} />}
              </button>
              <button
                onClick={handleLogout}
                title="Logout"
                className={`flex items-center ${sidebarCollapsed ? 'justify-center w-full' : ''} px-4 py-2.5 text-[15px] font-medium text-red-300 bg-white dark:bg-slate-950 border border-red-200 dark:border-red-500/20 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors`}
              >
                <LogOut className={`w-6 h-6 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                {!sidebarCollapsed && 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`${sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72'}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-white lg:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="ml-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {navigation.find(item => item.href === location.pathname)?.name || 'Manager Dashboard'}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Manager Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* User chip (no email) */}
              <div className="hidden sm:flex items-center rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 shadow-sm">
                <span className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm font-semibold flex items-center justify-center mr-2">
                  {userInitials}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white max-w-[10rem] truncate">{user?.name || user?.full_name || 'Manager'}</span>
              </div>
              {/* Keep top bar clean: controls moved to sidebar */}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
    </div>
  );
};

export default ManagerLayout;
