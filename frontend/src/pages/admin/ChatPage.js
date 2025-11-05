import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Search, Filter, AlertCircle, Bug, Lightbulb, HelpCircle, Clock, CheckCircle, XCircle, Send, User, Tag, ArrowUpDown, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SupportAPI, ManagerAPI } from '../../services/api';

const ChatPage = () => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [admins, setAdmins] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState(false);

  useEffect(() => {
    loadTickets();
    loadStats();
    loadAdmins();
  }, [token, statusFilter, typeFilter, priorityFilter]);

  const loadStats = async () => {
    if (!token) return;
    try {
      const res = await SupportAPI.getStats(token);
      if (res.success) setStats(res.stats);
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  };

  const loadAdmins = async () => {
    if (!token) return;
    try {
      const res = await ManagerAPI.listStaff(token);
      if (res.success) {
        setAdmins((res.staff || []).filter(s => s.role === 'admin'));
      }
    } catch (e) {
      console.error('Failed to load admins', e);
    }
  };

  const loadTickets = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      
      const res = await SupportAPI.listTickets(params, token);
      if (res.success) {
        let filtered = res.tickets || [];
        if (priorityFilter !== 'all') {
          filtered = filtered.filter(t => t.priority === priorityFilter);
        }
        if (searchTerm) {
          filtered = filtered.filter(t => 
            t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.pharmacy_name?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        setTickets(filtered);
      }
    } catch (e) {
      setError(e.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, typeFilter, priorityFilter, searchTerm]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadTicketDetails = async (ticketId) => {
    try {
      const res = await SupportAPI.getTicket(ticketId, token);
      if (res.success) {
        setSelectedTicket(res);
      }
    } catch (e) {
      setError(e.message || 'Failed to load ticket details');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    try {
      setError('');
      const res = await SupportAPI.addMessage(selectedTicket.ticket.id, { message: newMessage }, token);
      if (res.success) {
        setNewMessage('');
        loadTicketDetails(selectedTicket.ticket.id);
        loadTickets();
      }
    } catch (e) {
      setError(e.message || 'Failed to send message');
    }
  };

  const handleUpdateTicket = async (updates) => {
    if (!selectedTicket) return;
    try {
      setUpdatingTicket(true);
      setError('');
      const res = await SupportAPI.updateTicket(selectedTicket.ticket.id, updates, token);
      if (res.success) {
        loadTicketDetails(selectedTicket.ticket.id);
        loadTickets();
        loadStats();
      }
    } catch (e) {
      setError(e.message || 'Failed to update ticket');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'bug_report': return <Bug className="w-4 h-4" />;
      case 'feature_request': return <Lightbulb className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'bug_report': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'feature_request': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: { icon: <Clock className="w-3 h-3" />, class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Open' },
      in_progress: { icon: <AlertCircle className="w-3 h-3" />, class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', label: 'In Progress' },
      resolved: { icon: <CheckCircle className="w-3 h-3" />, class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: 'Resolved' },
      closed: { icon: <XCircle className="w-3 h-3" />, class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Closed' },
    };
    const badge = badges[status] || badges.open;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.class}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-600 dark:text-gray-400',
      medium: 'text-blue-600 dark:text-blue-400',
      high: 'text-orange-600 dark:text-orange-400',
      urgent: 'text-red-600 dark:text-red-400 font-semibold',
    };
    return colors[priority] || colors.medium;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-7 lg:p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Support Tickets Management</h1>
        <p className="text-purple-100">Manage support requests, bug reports, and feature requests</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-800 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Open Tickets</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{stats.open_count || 0}</p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-950 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-800 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">In Progress</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{stats.in_progress_count || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-950 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-800 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Urgent</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{stats.urgent_count || 0}</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-950 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-800 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Total Tickets</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{stats.total_count || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-950 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tickets, pharmacy, or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
          >
            <option value="all">All Types</option>
            <option value="support">Support</option>
            <option value="bug_report">Bug Report</option>
            <option value="feature_request">Feature Request</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            <div className="bg-white dark:bg-slate-950 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-slate-800">
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-gray-600 dark:text-slate-400">Loading tickets...</p>
              </div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white dark:bg-slate-950 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-slate-800 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-slate-400">No tickets found</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => loadTicketDetails(ticket.id)}
                className={`bg-white dark:bg-slate-950 rounded-xl p-4 shadow-sm border cursor-pointer transition-all ${
                  selectedTicket?.ticket.id === ticket.id
                    ? 'border-purple-500 ring-2 ring-purple-200 dark:ring-purple-900 bg-purple-50/50 dark:bg-purple-900/10'
                    : 'border-gray-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${getTypeColor(ticket.type)}`}>
                        {getTypeIcon(ticket.type)}
                        {ticket.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1.5 flex items-center gap-1">
                        <span className="text-base">🏥</span>
                        {ticket.pharmacy_name || 'Unknown Pharmacy'}
                      </p>
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm line-clamp-2 mb-1.5 leading-snug">{ticket.subject}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mb-2">
                      <span className="font-mono">#{ticket.ticket_number}</span>
                      <span>•</span>
                      <span>{formatDate(ticket.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                      {ticket.message_count > 0 && (
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          {ticket.message_count} message{ticket.message_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col h-[calc(100vh-12rem)]">
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 bg-gradient-to-r from-purple-50 to-white dark:from-slate-900 dark:to-slate-950">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${getTypeColor(selectedTicket.ticket.type)}`}>
                        {getTypeIcon(selectedTicket.ticket.type)}
                        {selectedTicket.ticket.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      {getStatusBadge(selectedTicket.ticket.status)}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${getPriorityColor(selectedTicket.ticket.priority)}`}>
                        {selectedTicket.ticket.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1.5">
                        <span className="text-base">🏥</span>
                        {selectedTicket.ticket.pharmacy_name || 'Unknown Pharmacy'}
                      </p>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2 leading-tight">{selectedTicket.ticket.subject}</h2>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                      <span className="font-mono">#{selectedTicket.ticket.ticket_number}</span>
                      <span>•</span>
                      <span>Created {formatDate(selectedTicket.ticket.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Ticket Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Status</label>
                    <select
                      value={selectedTicket.ticket.status}
                      onChange={(e) => handleUpdateTicket({ status: e.target.value })}
                      disabled={updatingTicket}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200 shadow-sm"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Priority</label>
                    <select
                      value={selectedTicket.ticket.priority}
                      onChange={(e) => handleUpdateTicket({ priority: e.target.value })}
                      disabled={updatingTicket}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200 shadow-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Assign To</label>
                    <select
                      value={selectedTicket.ticket.assigned_to || ''}
                      onChange={(e) => handleUpdateTicket({ assigned_to: e.target.value || null })}
                      disabled={updatingTicket}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200 shadow-sm"
                    >
                      <option value="">Unassigned</option>
                      {admins.map(admin => (
                        <option key={admin.id} value={admin.id}>{admin.first_name} {admin.last_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Description & Ticket Info */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                {selectedTicket.ticket.description && (
                  <>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Description</h3>
                    <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed mb-3">{selectedTicket.ticket.description}</p>
                  </>
                )}
                <div className={`${selectedTicket.ticket.description ? 'pt-3 border-t border-gray-200 dark:border-slate-700' : ''}`}>
                  <p className="text-xs text-gray-600 dark:text-slate-400">
                    <strong>From:</strong> {selectedTicket.ticket.created_by_name || 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Messages - Scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">Conversation</h3>
                <div className="space-y-4">
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((msg) => (
                      <div key={msg.id} className={`flex gap-3 group ${msg.is_internal ? 'opacity-75' : ''}`}>
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-full flex items-center justify-center shadow-sm ring-2 ring-purple-100 dark:ring-purple-900/50">
                          <span className="text-white text-sm font-semibold">
                            {msg.user_name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1.5">
                            <span className="font-semibold text-sm text-gray-900 dark:text-slate-100">{msg.user_name || 'Unknown'}</span>
                            {msg.is_internal && (
                              <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded">Internal</span>
                            )}
                            <span className="text-xs text-gray-500 dark:text-slate-400">{formatDate(msg.created_at)}</span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 rounded-lg px-4 py-3 text-sm text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-800 shadow-sm group-hover:shadow transition-shadow">
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-slate-400">No messages yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Send Message */}
              {selectedTicket.ticket.status !== 'closed' && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your response..."
                        rows={3}
                        className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200 resize-none shadow-sm"
                      />
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="self-end bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-all shadow-sm hover:shadow disabled:shadow-none"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-950 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-slate-800 text-center flex items-center justify-center h-[calc(100vh-12rem)]">
              <div>
                <MessageSquare className="w-16 h-16 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-slate-400 font-medium">Select a ticket to view details</p>
                <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">Choose a ticket from the list to start managing</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
