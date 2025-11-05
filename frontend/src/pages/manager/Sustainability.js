import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, Target, Shield, Printer, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ManagerAPI, POSAPI, StaffAPI } from '../../services/api';

const Sustainability = () => {
  const { token, user } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [expiryRisk, setExpiryRisk] = useState(null);
  const [categories, setCategories] = useState([]);
  const [expiryFilters, setExpiryFilters] = useState({ status: 'all', expiryState: 'all', search: '', categoryId: '', soonDays: 30 });
  const [expirySearchInput, setExpirySearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pageInput, setPageInput] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      setLoading(true);
      const expiryParams = {};
      if (expiryFilters.status && expiryFilters.status !== 'all') expiryParams.status = expiryFilters.status;
      if (expiryFilters.expiryState && expiryFilters.expiryState !== 'all') expiryParams.expiry_state = expiryFilters.expiryState;
      if (expiryFilters.search) expiryParams.search = expiryFilters.search;
      if (expiryFilters.soonDays) expiryParams.soon_days = expiryFilters.soonDays;
      if (expiryFilters.categoryId) expiryParams.category_id = expiryFilters.categoryId;

      const ExpiryAPI = (user?.role === 'staff') ? StaffAPI : ManagerAPI;
      const risk = await ExpiryAPI.getExpiryRisk(expiryParams, token);
      if (risk.success) setExpiryRisk(risk);
    } catch (e) {
      setError(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [token, expiryFilters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await POSAPI.getCategories();
        if (res?.success) setCategories(res.categories || []);
      } catch (_) {
        // optional
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    setExpirySearchInput(expiryFilters.search || '');
  }, [expiryFilters.search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = (expirySearchInput || '').trim();
      setExpiryFilters((prev) => {
        const next = { ...prev };
        let shouldUpdate = false;

        if ((prev.search || '') !== trimmed) {
          next.search = trimmed;
          shouldUpdate = true;
        }

        const lowered = trimmed.toLowerCase();
        let inferredState = prev.expiryState;
        if (!trimmed) {
          inferredState = 'all';
        } else if (prev.expiryState === 'all') {
          if (['expired', 'expired items', 'expired products'].includes(lowered)) {
            inferredState = 'expired';
          } else if (lowered.includes('expiring')) {
            inferredState = 'expiring';
          }
        }

        if (inferredState !== prev.expiryState) {
          next.expiryState = inferredState;
          shouldUpdate = true;
        }

        return shouldUpdate ? next : prev;
      });
    }, 400);
    return () => clearTimeout(handler);
  }, [expirySearchInput]);

  // Reset to first page when filters or data change
  useEffect(() => {
    setPage(1);
  }, [expiryFilters, expiryRisk]);

  const formatCurrency = useCallback((value) => (value ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }), []);

  const expiryStatusOptions = useMemo(() => ([
    { value: 'all', label: 'All risk levels' },
    { value: 'critical', label: 'Critical (expired / ≤7 days)' },
    { value: 'high', label: 'High (≤30 days)' },
    { value: 'medium', label: 'Medium (≤90 days)' },
    { value: 'low', label: 'Low risk' },
  ]), []);

  const expiryStateOptions = useMemo(() => ([
    { value: 'all', label: 'All batches' },
    { value: 'expired', label: 'Expired' },
    { value: 'expiring', label: 'Expiring ≤30 days' },
    { value: 'healthy', label: 'Beyond 30 days' },
  ]), []);

  const handleExpiryFilterChange = (key, value) => {
    setExpiryFilters((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  };

  const clearExpiryFilters = () => {
    setExpiryFilters({ status: 'all', expiryState: 'all', search: '', categoryId: '', soonDays: 30 });
    setExpirySearchInput('');
  };

  const describeExpiry = (item) => {
    if (item.days_to_expiry === null) return 'No upcoming batches';
    if (item.days_to_expiry < 0) return `Expired ${Math.abs(item.days_to_expiry)} day(s) ago`;
    if (item.days_to_expiry === 0) return 'Expires today';
    return `${item.days_to_expiry} day(s) left`;
  };

  const combinedExpiryData = useMemo(() => {
    if (!expiryRisk) return [];
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const entries = [
      ...(expiryRisk.critical_risk || []),
      ...(expiryRisk.high_risk || []),
      ...(expiryRisk.medium_risk || []),
      ...(expiryRisk.low_risk || []),
    ];
    return entries.sort((a, b) => {
      const riskDiff = (severityOrder[a.risk_level] ?? 4) - (severityOrder[b.risk_level] ?? 4);
      if (riskDiff !== 0) return riskDiff;
      const da = a.days_to_expiry ?? Number.MAX_SAFE_INTEGER;
      const db = b.days_to_expiry ?? Number.MAX_SAFE_INTEGER;
      return da - db;
    });
  }, [expiryRisk]);

  // Pagination helpers
  const pagination = useMemo(() => {
    const total = combinedExpiryData.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, totalPages);
    const start = (current - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    const items = combinedExpiryData.slice(start, end);
    return { items, total, totalPages, start: start + 1, end, current };
  }, [combinedExpiryData, page, pageSize]);

  const goToPage = (p) => {
    setPage((prev) => {
      const totalPages = Math.max(1, Math.ceil((combinedExpiryData.length || 0) / pageSize));
      const next = Math.min(Math.max(1, p), totalPages);
      return next === prev ? prev : next;
    });
  };

  const getCompactRange = (currentPage, totalPageCount) => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPageCount, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const handlePageInputChange = (e) => setPageInput(e.target.value);
  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const n = parseInt(pageInput, 10);
    if (!Number.isNaN(n)) {
      const totalPages = Math.max(1, Math.ceil((combinedExpiryData.length || 0) / pageSize));
      const clamped = Math.max(1, Math.min(totalPages, n));
      setPage(clamped);
    }
    setPageInput('');
  };

  const handlePrintExpiry = () => {
    if (!combinedExpiryData.length) {
      window.alert('No expiry-risk data to print.');
      return;
    }
    const statusLabel = expiryStatusOptions.find((opt) => opt.value === expiryFilters.status)?.label || 'All risk levels';
    const stateLabel = expiryStateOptions.find((opt) => opt.value === expiryFilters.expiryState)?.label || 'All batches';
    const categoryLabel = expiryFilters.categoryId ? (categories.find(c => String(c.id) === String(expiryFilters.categoryId))?.name || 'Selected category') : 'All categories';
    const filterSummary = `Status: ${statusLabel} | Batches: ${stateLabel} | Category: ${categoryLabel} | Expiring within: ${expiryFilters.soonDays} days | Search: ${expiryFilters.search || 'All products'}`;
    const rowsHtml = combinedExpiryData.map((item, idx) => `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;">${idx + 1}</td>
        <td style="border:1px solid #ddd;padding:8px;">${item.name}</td>
        <td style="border:1px solid #ddd;padding:8px;">${item.category_name || '—'}</td>
        <td style="border:1px solid #ddd;padding:8px;">${item.risk_level}</td>
        <td style="border:1px solid #ddd;padding:8px;">${(item.expiry_state || '').toUpperCase() || '—'}</td>
        <td style="border:1px solid #ddd;padding:8px;">${describeExpiry(item)}</td>
        <td style="border:1px solid #ddd;padding:8px;">${formatCurrency(item.total_value)}</td>
        <td style="border:1px solid #ddd;padding:8px;">${formatCurrency(item.value_at_risk)}</td>
        <td style="border:1px solid #ddd;padding:8px;">${item.expired_quantity}</td>
        <td style="border:1px solid #ddd;padding:8px;">${item.expiring_soon_quantity}</td>
      </tr>
    `).join('');

    const printHtml = `
      <html>
        <head>
          <title>Expiry Risk Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
            h1 { margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f3f4f6; text-align: left; border: 1px solid #ddd; padding: 8px; }
            td { border: 1px solid #ddd; padding: 8px; }
          </style>
        </head>
        <body>
          <h1>Expiry Risk Report</h1>
          <p>${filterSummary}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Category</th>
                <th>Risk</th>
                <th>Expiry Window</th>
                <th>Expiry Status</th>
                <th>Total Value</th>
                <th>Value at Risk</th>
                <th>Expired Qty</th>
                <th>Expiring Soon Qty</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadExpiry = () => {
    if (!combinedExpiryData.length) {
      window.alert('No expiry-risk data to download.');
      return;
    }
    const headers = [
      'Product','Category','Risk','Expiry Window','Expiry Status','Next Expiry','Days To Expiry','Total Value','Value At Risk','Expired Qty','Expiring Soon Qty'
    ];
    const rows = combinedExpiryData.map(item => [
      item.name,
      item.category_name || '',
      item.risk_level || 'low',
      (item.expiry_state || '').toUpperCase(),
      describeExpiry(item),
      item.next_expiration ? item.next_expiration.slice(0,10) : '',
      item.days_to_expiry ?? '',
      (item.total_value ?? 0),
      (item.value_at_risk ?? 0),
      (item.expired_quantity ?? 0),
      (item.expiring_soon_quantity ?? 0),
    ]);
    const csv = [headers, ...rows]
      .map(row => row
        .map(field => {
          const value = String(field ?? '');
          return /[",\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
        })
        .join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expiry-risk-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const riskBadgeMap = useMemo(() => ({
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-emerald-100 text-emerald-700',
  }), []);

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-emerald-600 to-lime-600 rounded-2xl p-7 lg:p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Sustainability Analytics</h1>
        <p className="text-emerald-100">Focus on waste reduction from expired and expiring products</p>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg px-4 py-3">{error}</div>}

      {loading && (
        <div className="bg-white dark:bg-slate-950 rounded-2xl p-12 shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
            <p className="text-gray-600 dark:text-slate-400">Loading expiry risk data...</p>
          </div>
        </div>
      )}

      {!loading && expiryRisk && (
        <section className="space-y-5">          

      <div className="bg-white dark:bg-slate-950 rounded-2xl p-7 lg:p-8 shadow-sm border border-gray-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1">Expiry Risk Analysis</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">See products nearing or past expiry. Use quick filters or search to focus your list.</p>

            <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 mb-7">
              {/* Quick filters */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">Quick filters:</span>
                <button
                  onClick={() => setExpiryFilters(prev => ({ ...prev, status: 'all', expiryState: 'all' }))}
                  className={`px-2.5 py-1.5 text-xs rounded-md border ${expiryFilters.status === 'all' && expiryFilters.expiryState === 'all' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                >All</button>
                <button
                  onClick={() => setExpiryFilters(prev => ({ ...prev, expiryState: 'expiring', status: 'all' }))}
                  className={`px-2.5 py-1.5 text-xs rounded-md border ${expiryFilters.expiryState === 'expiring' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                >Expiring soon</button>
                <button
                  onClick={() => setExpiryFilters(prev => ({ ...prev, expiryState: 'expired', status: 'critical' }))}
                  className={`px-2.5 py-1.5 text-xs rounded-md border ${expiryFilters.expiryState === 'expired' ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                >Expired</button>
            </div>
              
              {/* Main filters */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1 uppercase tracking-wide">Search</label>
            <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={expirySearchInput}
                      onChange={(e) => setExpirySearchInput(e.target.value)}
                      placeholder="Search product or category"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500"
                    />
        </div>
      </div>

                <div className="lg:col-span-3">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1 uppercase tracking-wide">Category</label>
                  <div className="relative">
                    <select
                      value={expiryFilters.categoryId}
                      onChange={(e) => handleExpiryFilterChange('categoryId', e.target.value)}
                      className="w-full appearance-none px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                    >
                      <option value="">All categories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1 uppercase tracking-wide">Expiring within</label>
                  <div className="relative">
                    <select
                      value={expiryFilters.soonDays}
                      onChange={(e) => handleExpiryFilterChange('soonDays', Number(e.target.value))}
                      className="w-full appearance-none px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                    >
                      {[7,14,21,30,45,60].map(d => (
                        <option key={d} value={d}>{d} days</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
          </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1 uppercase tracking-wide">Items per page</label>
                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                      className="w-full appearance-none px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
                    >
                      {[10, 25, 50, 100].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="lg:col-span-12 flex flex-wrap items-end justify-start gap-2 pt-1">
                <button 
                    onClick={clearExpiryFilters}
                    className="px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-900"
                  >
                    Reset
                </button>
                <button 
                    onClick={handlePrintExpiry}
                    className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium"
                  >
                    <Printer className="w-4 h-4" /> Print
                </button>
                <button 
                    onClick={handleDownloadExpiry}
                    className="px-3 py-2 bg-white dark:bg-slate-950 text-emerald-700 dark:text-emerald-300 border border-emerald-600/80 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2 text-sm font-medium"
                  >
                    Download CSV
                </button>
              </div>
            </div>
            </div>
            
            {expiryRisk.summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-7">
                {[
                  {
                    label: 'Critical Risk',
                    value: expiryRisk.summary.critical_count ?? 0,
                    detail: `${formatCurrency(expiryRisk.summary.expired_value ?? 0)} expired stock`,
                    icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
                    bg: 'bg-red-50',
                  },
                  {
                    label: 'High Risk',
                    value: expiryRisk.summary.high_count ?? 0,
                    detail: `${formatCurrency(expiryRisk.summary.expiring_soon_value ?? 0)} expiring soon`,
                    icon: <Clock className="w-5 h-5 text-orange-600" />,
                    bg: 'bg-orange-50',
                  },
                  {
                    label: 'Medium Risk',
                    value: expiryRisk.summary.medium_count ?? 0,
                    detail: '31-90 days runway',
                    icon: <Target className="w-5 h-5 text-yellow-600" />,
                    bg: 'bg-yellow-50',
                  },
                  {
                    label: 'Healthy Coverage',
                    value: `${(((expiryRisk.summary.safe_value ?? 0) / Math.max(expiryRisk.summary.total_value ?? 0, 1)) * 100).toFixed(1)}%`,
                    detail: `${formatCurrency(expiryRisk.summary.safe_value ?? 0)} stable inventory`,
                    icon: <Shield className="w-5 h-5 text-emerald-600" />,
                    bg: 'bg-emerald-50',
                  },
                ].map((card, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-950 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-slate-300">{card.label}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">{card.value}</p>
                      {card.detail && <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-1">{card.detail}</p>}
            </div>
                    <div className={`w-11 h-11 ${card.bg} dark:bg-slate-900 rounded-lg flex items-center justify-center`}>
                      {card.icon}
        </div>
              </div>
                ))}
        </div>
      )}

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Risk Index</span>
                <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{expiryRisk.summary?.risk_index ?? 0}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${Math.min(expiryRisk.summary?.risk_index ?? 0, 100)}%` }}
                ></div>
          </div>
              </div>
            
            <div className="overflow-x-auto mt-8">
              {combinedExpiryData.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500 dark:text-slate-400">No products match the selected filters.</div>
              ) : (
                <>
                  <table className="min-w-full text-sm text-gray-700 dark:text-slate-300">
                    <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 uppercase tracking-wide text-xs">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-left">Risk</th>
                        <th className="px-3 py-2 text-left">Window</th>
                        <th className="px-3 py-2 text-left">Next Expiry</th>
                        <th className="px-3 py-2 text-left">Expiry Status</th>
                        <th className="px-3 py-2 text-right">Total Value</th>
                        <th className="px-3 py-2 text-right">Value at Risk</th>
                        <th className="px-3 py-2 text-right">Expired Qty</th>
                        <th className="px-3 py-2 text-right">Expiring Qty</th>
                    </tr>
                  </thead>
                    <tbody className="bg-white dark:bg-slate-950 divide-y divide-gray-200 dark:divide-slate-800">
                      {pagination.items.map((item) => {
                        const badgeClass = riskBadgeMap[item.risk_level] || 'bg-gray-100 text-gray-600';
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-900">
                            <td className="px-3 py-2 font-medium text-gray-900 dark:text-slate-100">{item.name}</td>
                            <td className="px-3 py-2">{item.category_name || '—'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
                                {item.risk_level || 'low'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-slate-400 capitalize">{item.expiry_state || '—'}</td>
                            <td className="px-3 py-2">{item.next_expiration ? item.next_expiration.slice(0, 10) : '—'}</td>
                            <td className="px-3 py-2 text-gray-600 dark:text-slate-400">{describeExpiry(item)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.total_value)}</td>
                            <td className="px-3 py-2 text-right text-red-600 dark:text-red-400 font-semibold">{formatCurrency(item.value_at_risk)}</td>
                            <td className="px-3 py-2 text-right">{item.expired_quantity}</td>
                            <td className="px-3 py-2 text-right">{item.expiring_soon_quantity}</td>
                      </tr>
                        );
                      })}
                  </tbody>
                </table>

                  {/* Pagination Controls */}
                  {pagination.total > pageSize && (
                    <div className="flex items-center justify-between mt-4">
                      {/* Left: Total */}
                      <div className="text-sm text-gray-700">Total Items: <span className="font-semibold">{pagination.total}</span></div>
                      {/* Center: Compact paginator */}
                      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
                        <button
                          aria-label="Previous page"
                          onClick={() => goToPage(pagination.current - 1)}
                          disabled={pagination.current === 1}
                          className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-sm ${pagination.current === 1 ? 'opacity-40 cursor-not-allowed text-gray-400' : 'hover:bg-gray-50 text-gray-700'}`}
                          title="Previous"
                        >
                          ‹
                        </button>
                        {getCompactRange(pagination.current, pagination.totalPages).map((num) => (
                          <button
                            key={num}
                            onClick={() => goToPage(num)}
                            className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-sm font-medium ${
                              num === pagination.current ? 'bg-emerald-600 text-white shadow-sm' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          aria-label="Next page"
                          onClick={() => goToPage(pagination.current + 1)}
                          disabled={pagination.current === pagination.totalPages}
                          className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-sm ${pagination.current === pagination.totalPages ? 'opacity-40 cursor-not-allowed text-gray-400' : 'hover:bg-gray-50 text-gray-700'}`}
                          title="Next"
                        >
                          ›
                        </button>
                      </div>
                      {/* Right: Go to page */}
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span>Go to page:</span>
                        <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                          <input
                            aria-label="Go to page number"
                            type="number"
                            min="1"
                            max={pagination.totalPages}
                            value={pageInput}
                            onChange={handlePageInputChange}
                            placeholder={`${pagination.current}`}
                            className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center"
                          />
                          <span className="text-sm text-gray-600">of {pagination.totalPages}</span>
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-xs font-medium"
                          >
                            Go
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </>
                            )}
                          </div>
            </div>
        </section>
      )}
    </div>
  );
};

export default Sustainability;
