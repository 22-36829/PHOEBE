import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Plus, Search, Filter, AlertCircle, Bug, Lightbulb, HelpCircle, Clock, CheckCircle, XCircle, Send, Trash2, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SupportAPI } from '../../services/api';

const SupportTickets = () => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Create ticket form
  const [newTicket, setNewTicket] = useState({
    type: 'support',
    subject: '',
    description: '',
    priority: 'medium'
  });
  const [newMessage, setNewMessage] = useState('');

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
        if (searchTerm) {
          filtered = filtered.filter(t => 
            t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        setTickets(filtered);
      }
    } catch (e) {
      setError(e.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, typeFilter, searchTerm]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.subject.trim()) {
      setError('Subject is required');
      return;
    }
    try {
      setError('');
      const res = await SupportAPI.createTicket(newTicket, token);
      if (res.success) {
        setShowCreateModal(false);
        setNewTicket({ type: 'support', subject: '', description: '', priority: 'medium' });
        loadTickets();
      }
    } catch (e) {
      setError(e.message || 'Failed to create ticket');
    }
  };

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
      }
    } catch (e) {
      setError(e.message || 'Failed to send message');
    }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ticket #${selectedTicket.ticket.ticket_number}?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      setError('');
      const res = await SupportAPI.deleteTicket(selectedTicket.ticket.id, token);
      if (res.success) {
        setSelectedTicket(null);
        loadTickets();
      }
    } catch (e) {
      setError(e.message || 'Failed to delete ticket');
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    
    if (selectedTicket.ticket.status === 'closed') {
      setError('Ticket is already closed');
      return;
    }
    
    const confirmed = window.confirm(
      `Are you sure you want to close ticket #${selectedTicket.ticket.ticket_number}?\n\nYou can still view it, but no new messages can be added.`
    );
    
    if (!confirmed) return;
    
    try {
      setError('');
      const res = await SupportAPI.updateTicket(selectedTicket.ticket.id, { status: 'closed' }, token);
      if (res.success) {
        loadTicketDetails(selectedTicket.ticket.id);
        loadTickets();
      }
    } catch (e) {
      setError(e.message || 'Failed to close ticket');
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
      case 'bug_report': return 'bg-red-100 text-red-700';
      case 'feature_request': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: { icon: <Clock className="w-3 h-3" />, class: 'bg-yellow-100 text-yellow-700', label: 'Open' },
      in_progress: { icon: <AlertCircle className="w-3 h-3" />, class: 'bg-blue-100 text-blue-700', label: 'In Progress' },
      resolved: { icon: <CheckCircle className="w-3 h-3" />, class: 'bg-green-100 text-green-700', label: 'Resolved' },
      closed: { icon: <XCircle className="w-3 h-3" />, class: 'bg-gray-100 text-gray-700', label: 'Closed' },
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
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600 font-semibold',
    };
    return colors[priority] || colors.medium;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-7 lg:p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Support Tickets</h1>
            <p className="text-blue-100">Get help, report bugs, or request features</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
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
            className="px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
          >
            <option value="all">All Types</option>
            <option value="support">Support</option>
            <option value="bug_report">Bug Report</option>
            <option value="feature_request">Feature Request</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-950 rounded-2xl p-12 shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-slate-400">Loading tickets...</p>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white dark:bg-slate-950 rounded-2xl p-12 shadow-sm border border-gray-200 dark:border-slate-800 text-center">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">No tickets found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first ticket
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white dark:bg-slate-950 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-800 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => loadTicketDetails(ticket.id)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getTypeColor(ticket.type)}`}>
                      {getTypeIcon(ticket.type)}
                      {ticket.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    {getStatusBadge(ticket.status)}
                    <span className={`text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-1">{ticket.subject}</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    #{ticket.ticket_number} • {formatDate(ticket.created_at)}
                    {ticket.message_count > 0 && ` • ${ticket.message_count} message${ticket.message_count > 1 ? 's' : ''}`}
                  </p>
                </div>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const confirmed = window.confirm(
                      `Are you sure you want to delete ticket #${ticket.ticket_number}?\n\nThis action cannot be undone.`
                    );
                    if (confirmed) {
                      try {
                        setError('');
                        const res = await SupportAPI.deleteTicket(ticket.id, token);
                        if (res.success) {
                          loadTickets();
                          if (selectedTicket?.ticket.id === ticket.id) {
                            setSelectedTicket(null);
                          }
                        }
                      } catch (err) {
                        setError(err.message || 'Failed to delete ticket');
                      }
                    }
                  }}
                  className="ml-3 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete ticket"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-slate-100">Create New Ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Type</label>
                <select
                  value={newTicket.type}
                  onChange={(e) => setNewTicket({ ...newTicket, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                >
                  <option value="support">Support</option>
                  <option value="bug_report">Bug Report</option>
                  <option value="feature_request">Feature Request</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Subject *</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Create Ticket
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-slate-800">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 bg-gradient-to-r from-gray-50 to-white dark:from-slate-900 dark:to-slate-950">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${getTypeColor(selectedTicket.ticket.type)}`}>
                      {getTypeIcon(selectedTicket.ticket.type)}
                      {selectedTicket.ticket.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    {getStatusBadge(selectedTicket.ticket.status)}
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${getPriorityColor(selectedTicket.ticket.priority)}`}>
                      {selectedTicket.ticket.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2 leading-tight">{selectedTicket.ticket.subject}</h2>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                    <span className="font-mono">#{selectedTicket.ticket.ticket_number}</span>
                    <span>•</span>
                    <span>Created {formatDate(selectedTicket.ticket.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-slate-800">
                {selectedTicket.ticket.status !== 'closed' && (
                  <button
                    onClick={handleCloseTicket}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-700 dark:text-orange-300 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all shadow-sm hover:shadow"
                  >
                    <Lock className="w-4 h-4" />
                    Close Ticket
                  </button>
                )}
                <button
                  onClick={handleDeleteTicket}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 border border-red-600 dark:border-red-700 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-all shadow-sm hover:shadow"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>

            {/* Description */}
            {selectedTicket.ticket.description && (
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Description</h3>
                <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedTicket.ticket.description}</p>
              </div>
            )}

            {/* Messages - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">Conversation</h3>
              <div className="space-y-4">
                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                  selectedTicket.messages.map((msg) => (
                    <div key={msg.id} className="flex gap-3 group">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-full flex items-center justify-center shadow-sm ring-2 ring-blue-100 dark:ring-blue-900/50">
                        <span className="text-white text-sm font-semibold">
                          {msg.user_name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <span className="font-semibold text-sm text-gray-900 dark:text-slate-100">{msg.user_name || 'Unknown'}</span>
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
            {selectedTicket.ticket.status !== 'closed' && selectedTicket.ticket.status !== 'resolved' && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      rows={3}
                      className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200 resize-none shadow-sm"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="self-end bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-all shadow-sm hover:shadow disabled:shadow-none"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTickets;

