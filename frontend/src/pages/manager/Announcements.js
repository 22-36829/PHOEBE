import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Info, AlertCircle, AlertTriangle, Calendar, Pin, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AnnouncementsAPI } from '../../services/api';

const Announcements = () => {
  const { token } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, per_page: 10, total: 0, total_pages: 0 });
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    pinned: 'all',
    page: 1,
    per_page: 10,
  });

  const loadAnnouncements = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const params = {
        page: filters.page,
        per_page: filters.per_page,
        ...(filters.search && { search: filters.search }),
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.pinned !== 'all' && { pinned: filters.pinned }),
      };
      const res = await AnnouncementsAPI.list(params, token);
      if (res.success) {
        setAnnouncements(res.announcements || []);
        setPagination(res.pagination || { page: 1, per_page: 10, total: 0, total_pages: 0 });
      }
    } catch (e) {
      setError(e.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 })); // Reset to page 1 on filter change
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'urgent': return <AlertCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'update': return <Bell className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'warning': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'update': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-7 lg:p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Announcements</h1>
        <p className="text-emerald-100">Stay updated with the latest news and updates from admin</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-950 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500"
            />
          </div>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
          >
            <option value="all">All Types</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="urgent">Urgent</option>
            <option value="update">Update</option>
          </select>
          <select
            value={filters.pinned}
            onChange={(e) => handleFilterChange('pinned', e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
          >
            <option value="all">All</option>
            <option value="pinned">Pinned</option>
            <option value="unpinned">Unpinned</option>
          </select>
        </div>
      </div>

      <div className="text-sm text-gray-600 dark:text-slate-400">
        Showing {announcements.length} of {pagination.total} announcement{pagination.total !== 1 ? 's' : ''}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-950 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
            <p className="text-gray-600 dark:text-slate-400">Loading announcements...</p>
          </div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white dark:bg-slate-950 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-slate-800 text-center">
          <Bell className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-slate-400">No announcements available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`bg-white dark:bg-slate-950 rounded-xl p-6 shadow-sm border ${
                announcement.is_pinned 
                  ? 'border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-100 dark:ring-emerald-900/50' 
                  : 'border-gray-200 dark:border-slate-800'
              } hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center border-2 ${getTypeColor(announcement.type)}`}>
                  {getTypeIcon(announcement.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {announcement.is_pinned && (
                      <Pin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${getTypeColor(announcement.type)}`}>
                      {announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">{announcement.title}</h3>
                  <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed mb-3">
                    {announcement.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                    <span>{formatDate(announcement.created_at)}</span>
                    {announcement.expires_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Expires {formatDate(announcement.expires_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="bg-white dark:bg-slate-950 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-slate-400">
              Page {pagination.page} of {pagination.total_pages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
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
                      className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                        pagination.page === pageNum
                          ? 'bg-emerald-600 text-white'
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
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;

