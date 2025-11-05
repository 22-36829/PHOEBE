import React, { useEffect, useMemo, useState } from 'react';
import { Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ManagerAPI, POSAPI, InventoryAPI } from '../../services/api';

const ManagerDashboard = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [pharmacy, setPharmacy] = useState(null);
  const [staff, setStaff] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [sustainability, setSustainability] = useState(null);
  const [expiryRisk, setExpiryRisk] = useState(null);
  const [abcved, setABCVED] = useState(null);
  const [showABCHelp, setShowABCHelp] = useState(false);
  const [selectedCell, setSelectedCell] = useState('A-V');
  const [simpleMode, setSimpleMode] = useState(true);
  
  const [cellSort, setCellSort] = useState('value_desc');
  const [cellQuery, setCellQuery] = useState('');
  
  const [cellPage, setCellPage] = useState(1);
  const [cellPageSize, setCellPageSize] = useState(10);

  // ABC-VED derived insights (coverage + priorities)
  const abcCoverage = useMemo(() => {
    const items = Array.isArray(abcved?.items) ? abcved.items : [];
    const total = items.reduce((a, r) => a + Number(r.consumption_value || 0), 0);
    const by = { A: 0, B: 0, C: 0 };
    items.forEach(r => { by[r.abc_class] = (by[r.abc_class] || 0) + Number(r.consumption_value || 0); });
    const pct = (v) => total > 0 ? Math.round((v / total) * 100) : 0;
    return { total, by, pctA: pct(by.A), pctB: pct(by.B), pctC: pct(by.C) };
  }, [abcved]);

  const getTopByCell = (abc, ved, limit = 5) => {
    const items = Array.isArray(abcved?.items) ? abcved.items : [];
    return items
      .filter(r => r.abc_class === abc && r.ved_class === ved)
      .sort((a, b) => Number(b.consumption_value || 0) - Number(a.consumption_value || 0))
      .slice(0, limit);
  };

  // Removed priority shortlists to keep panel concise

  const selectedAllItems = useMemo(() => {
    if (!selectedCell) return [];
    const [a, v] = selectedCell.split('-');
    const base = (Array.isArray(abcved?.items) ? abcved.items : [])
      .filter(r => r.abc_class === a && r.ved_class === v);
    const filtered = cellQuery
      ? base.filter(r => (r.name || '').toLowerCase().includes(cellQuery.toLowerCase()))
      : base;
    const sorted = [...filtered].sort((x, y) => {
      const valX = Number(x.consumption_value || 0);
      const valY = Number(y.consumption_value || 0);
      const qtyX = Number(x.total_qty || 0);
      const qtyY = Number(y.total_qty || 0);
      if (cellSort === 'value_desc') return valY - valX;
      if (cellSort === 'value_asc') return valX - valY;
      if (cellSort === 'qty_desc') return qtyY - qtyX;
      if (cellSort === 'qty_asc') return qtyX - qtyY;
      const nx = (x.name || '').toLowerCase();
      const ny = (y.name || '').toLowerCase();
      return nx.localeCompare(ny);
    });
    return sorted;
  }, [selectedCell, abcved, cellQuery, cellSort]);

  const itemsForSelected = useMemo(() => {
    const start = (cellPage - 1) * cellPageSize;
    return selectedAllItems.slice(start, start + cellPageSize);
  }, [selectedAllItems, cellPage, cellPageSize]);

  useEffect(() => { setCellPage(1); }, [selectedCell, cellQuery, cellSort, cellPageSize]);

  // Heatmap intensity based on counts
  const cellMax = useMemo(() => {
    const mc = abcved?.matrix_counts || {};
    return Object.values(mc).reduce((m, v) => Math.max(m, Number(v || 0)), 0) || 1;
  }, [abcved]);

  // Pagination model for numbered buttons with ellipsis
  const pagination = useMemo(() => {
    const totalItems = selectedAllItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / cellPageSize));
    const pages = [];
    const add = (n) => { if (n>=1 && n<=totalPages) pages.push(n); };
    add(1);
    for (let i = cellPage - 1; i <= cellPage + 1; i++) add(i);
    add(totalPages);
    const unique = [...new Set(pages)].sort((a,b)=>a-b);
    const withEllipsis = [];
    for (let i=0;i<unique.length;i++){
      withEllipsis.push(unique[i]);
      if (i<unique.length-1 && unique[i+1] - unique[i] > 1) withEllipsis.push('...');
    }
    return { totalPages, withEllipsis, totalItems };
  }, [selectedAllItems.length, cellPage, cellPageSize]);

  // Threshold controls removed per request

  const downloadSelectedCSV = () => {
    const headers = ['name', 'category_name', 'abc_class', 'ved_class', 'total_qty', 'cost_price', 'consumption_value'];
    const csv = [headers.join(',')]
      .concat(itemsForSelected.map(it => headers.map(h => `${(it[h] ?? '').toString().replace(/"/g, '""')}`)
      .map(x => /[",\n]/.test(x) ? `"${x}"` : x).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abcved_${selectedCell}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const actionText = (cell) => {
    switch (cell) {
      case 'A-V': return 'Review weekly • strict min-max • vendor priority';
      case 'A-E': return 'Review bi-weekly • maintain safety stock';
      case 'B-V': return 'Review bi-weekly • protect from stock-outs';
      case 'B-E': return 'Monthly review • balance cost and availability';
      case 'C-V': return 'Monthly review • ensure basic continuity';
      default: return 'Quarterly review • minimal controls';
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError('');
        const [ov, pharm, staffList, pendingReqs, txns, sust, risk, av] = await Promise.all([
          ManagerAPI.getAnalyticsOverview({}, token).catch(() => null),
          ManagerAPI.getPharmacy(token).catch(() => null),
          ManagerAPI.listStaff(token).catch(() => null),
          InventoryAPI.listRequests({ status: 'pending' }, token).catch(() => null),
          POSAPI.getTransactions(token).catch(() => null),
          ManagerAPI.getSustainabilityDashboard({}, token).catch(() => null),
          ManagerAPI.getExpiryRisk({ soon_days: 30 }, token).catch(() => null),
          ManagerAPI.getABCVED({}, token).catch(() => null),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setPharmacy(pharm?.pharmacy || pharm);
        setStaff(Array.isArray(staffList) ? staffList : (staffList?.staff || []));
        setPendingApprovals(pendingReqs?.total ?? (Array.isArray(pendingReqs?.items) ? pendingReqs.items.length : 0));
        const txList = (txns?.transactions ?? txns?.data ?? (Array.isArray(txns) ? txns : []));
        setTransactions(Array.isArray(txList) ? txList : []);
        setSustainability(sust);
        setExpiryRisk(risk);
        setABCVED(av);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load dashboard metrics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token]);

  const formatCurrency = (value) => (value ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

  // No generic stat grid; focus on requested KPIs only

  // Aggregate sales for last 7 days
  const salesLast7 = useMemo(() => {
    const safeTx = Array.isArray(transactions) ? transactions : [];
    const byDate = new Map();
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0,10);
      byDate.set(key, 0);
    }
    safeTx.forEach(t => {
      const dateKey = (t.date || t.created_at || t.timestamp || '').slice(0,10);
      const amount = Number(t.total || t.amount || t.grand_total || 0);
      if (byDate.has(dateKey)) byDate.set(dateKey, (byDate.get(dateKey) || 0) + amount);
    });
    return Array.from(byDate.entries()).map(([date, total]) => ({ date, total }));
  }, [transactions]);

  // Waste analysis split (expired, expiring soon, safe)
  const wasteSplit = useMemo(() => {
    const s = sustainability || overview?.sustainability;
    // Prefer explicit dashboard summary if present
    let expired = s?.expired_value ?? 0;
    let expiring = s?.expiring_soon_value ?? 0;
    let totalValue = s?.total_value ?? overview?.inventory?.total_value ?? 0;

    // Fallback: compute from expiryRisk lists if summary missing
    if ((!expired && !expiring) && expiryRisk) {
      const sumBy = (arr, key) => (Array.isArray(arr) ? arr.reduce((acc, it) => acc + Number(it[key] ?? 0), 0) : 0);
      // Prefer summary if provided by API
      expired = expiryRisk?.summary?.expired_value ?? 0;
      expiring = expiryRisk?.summary?.expiring_soon_value ?? 0;
      if (!expired || !expiring) {
        // Derive from item lists as value_at_risk (or total_value fallback)
        const lists = [
          ...(expiryRisk?.critical_risk || []),
          ...(expiryRisk?.high_risk || []),
          ...(expiryRisk?.medium_risk || []),
          ...(expiryRisk?.low_risk || []),
        ];
        // Classify by expiry_state when available
        const expiredSum = lists.filter(i => (i.expiry_state || '').toLowerCase() === 'expired')
          .reduce((a,i)=> a + Number(i.value_at_risk ?? i.total_value ?? 0), 0);
        const expSoonSum = lists.filter(i => (i.expiry_state || '').toLowerCase() === 'expiring')
          .reduce((a,i)=> a + Number(i.value_at_risk ?? i.total_value ?? 0), 0);
        if (expired === 0) expired = expiredSum;
        if (expiring === 0) expiring = expSoonSum;
        if (!totalValue) totalValue = sumBy(lists, 'total_value');
      }
    }

    const safe = (s?.safe_value != null) ? s.safe_value : Math.max(totalValue - expired - expiring, 0);
    const total = Math.max(expired + expiring + safe, 1);
    return {
      expired, expiring, safe,
      pExpired: (expired / total) * 100,
      pExpiring: (expiring / total) * 100,
      pSafe: (safe / total) * 100,
      total
    };
  }, [sustainability, overview, expiryRisk]);

  // Donut chart segments from values
  const wasteDonut = useMemo(() => {
    const segments = [
      { label: 'Expired', value: wasteSplit.expired, color: '#ef4444' },
      { label: 'Expiring', value: wasteSplit.expiring, color: '#f59e0b' },
      { label: 'Healthy', value: wasteSplit.safe, color: '#059669' },
    ];
    const total = Math.max(segments.reduce((a, s) => a + (s.value || 0), 0), 1);
    let cumulative = 0;
    return segments.map((s) => {
      const start = cumulative / total;
      const delta = (s.value || 0) / total;
      cumulative += delta;
      return { ...s, start, end: start + delta, pct: Math.round(delta * 100) };
    });
  }, [wasteSplit]);

  const recentActivities = useMemo(() => {
    const items = overview?.recent_activities || [];
    return items.slice(0, 0); // intentionally hidden in simplified dashboard
  }, [overview]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-7 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome {user?.name || user?.full_name || 'Manager'}</h1>
        <p className="text-blue-100">{pharmacy?.name || 'Your Pharmacy'}</p>
      </div>

      

      {/* Approval and staff quick KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-950 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
                  <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Active Staff</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">{staff.filter(s => s.active !== false).length}</p>
                  </div>
            <Users className="w-7 h-7 text-gray-500 dark:text-slate-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-950 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-300">Approval Requests</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">{pendingApprovals}</p>
                </div>
            <AlertTriangle className="w-7 h-7 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Waste analysis and Sales chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waste analysis donut chart */}
        <div className="bg-white dark:bg-slate-950 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Waste Analysis</h2>
          <div className="flex items-center gap-6">
            <svg width="160" height="160" viewBox="0 0 32 32" className="flex-shrink-0">
              <defs>
                <mask id="donut-hole"><rect x="0" y="0" width="32" height="32" fill="white" /><circle cx="16" cy="16" r="8" fill="black" /></mask>
              </defs>
              <g mask="url(#donut-hole)">
                {wasteDonut.map((seg, idx) => {
                  const startAngle = 2 * Math.PI * seg.start - Math.PI / 2;
                  const endAngle = 2 * Math.PI * seg.end - Math.PI / 2;
                  const x1 = 16 + 14 * Math.cos(startAngle);
                  const y1 = 16 + 14 * Math.sin(startAngle);
                  const x2 = 16 + 14 * Math.cos(endAngle);
                  const y2 = 16 + 14 * Math.sin(endAngle);
                  const largeArc = seg.end - seg.start > 0.5 ? 1 : 0;
                  const d = `M 16 16 L ${x1} ${y1} A 14 14 0 ${largeArc} 1 ${x2} ${y2} Z`;
                  return <path key={idx} d={d} fill={seg.color} />;
                })}
              </g>
              <circle cx="16" cy="16" r="9" fill="transparent" />
              <text x="16" y="16" textAnchor="middle" dominantBaseline="central" fontSize="3" fill="#64748b">{Math.round(wasteSplit.pExpired + wasteSplit.pExpiring)}% risk</text>
            </svg>
            <div className="grid grid-cols-1 gap-2 text-sm">
              {wasteDonut.map((seg) => (
                <div key={seg.label} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: seg.color }} />
                  <span className="text-gray-700 dark:text-slate-300">{seg.label}: {formatCurrency(wasteSplit[seg.label.toLowerCase()] || seg.value)} ({seg.pct}%)</span>
                </div>
              ))}
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">Total inventory considered: {formatCurrency(wasteSplit.total)}</div>
            </div>
          </div>
        </div>

        {/* Sales mini bar chart */}
        <div className="bg-white dark:bg-slate-950 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Sales (Last 7 days)</h2>
          <div className="h-40 flex items-end gap-2">
            {salesLast7.map((d) => {
              const max = Math.max(1, ...salesLast7.map(x => x.total));
              const height = Math.max(4, Math.round((d.total / max) * 140));
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-blue-600 rounded-t-md" style={{ height }} />
                  <div className="mt-1 text-[10px] text-gray-500 dark:text-slate-400">{d.date.slice(5)}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-sm text-gray-700 dark:text-slate-300">Total: {formatCurrency(salesLast7.reduce((a,b)=>a+b.total,0))}</div>
        </div>
      </div>

      {/* ABC-VED Matrix (compact panel) */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">ABC–VED</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={()=>setSimpleMode(v=>!v)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-950 hover:bg-gray-50 dark:hover:bg-slate-900"
            >
              {simpleMode ? 'Switch to Advanced' : 'Switch to Simple'}
            </button>
            <div className="text-sm text-gray-500 dark:text-slate-400">{abcved?.from?.slice(0,10)} – {abcved?.to?.slice(0,10)}</div>
          </div>
        </div>

        {/* Simple view for managers */}
        {simpleMode && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 dark:text-slate-300">Quick guide: Buy first the items in Priority Now. Keep Watchlist items from running out. Low Priority can wait.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Priority Now: A–V + A–E */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Priority Now</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">{(abcved?.matrix_counts?.['A-V']||0)+(abcved?.matrix_counts?.['A-E']||0)}</div>
                <ul className="text-sm text-gray-700 dark:text-slate-300 space-y-1">
                  {(() => {
                    const items = (abcved?.items||[]).filter(i => (i.abc_class==='A' && (i.ved_class==='V'||i.ved_class==='E')))
                      .sort((a,b)=>Number(b.consumption_value||0)-Number(a.consumption_value||0))
                      .slice(0,3);
                    return items.length? items.map(it => <li key={it.id||it.name} className="truncate" title={it.name}>{it.name}</li>) : <li className="text-xs text-gray-500 dark:text-slate-400">No items</li>;
                  })()}
                </ul>
                <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">Action: Reorder and keep safety stock.</div>
              </div>
              {/* Watchlist: B–V */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Watchlist</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">{abcved?.matrix_counts?.['B-V']||0}</div>
                <ul className="text-sm text-gray-700 dark:text-slate-300 space-y-1">
                  {(() => {
                    const items = (abcved?.items||[]).filter(i => (i.abc_class==='B' && i.ved_class==='V'))
                      .sort((a,b)=>Number(b.consumption_value||0)-Number(a.consumption_value||0))
                      .slice(0,3);
                    return items.length? items.map(it => <li key={it.id||it.name} className="truncate" title={it.name}>{it.name}</li>) : <li className="text-xs text-gray-500 dark:text-slate-400">No items</li>;
                  })()}
                </ul>
                <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">Action: Monitor weekly, avoid stock-outs.</div>
              </div>
              {/* Low Priority: C–D */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Low Priority</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">{abcved?.matrix_counts?.['C-D']||0}</div>
                <div className="text-sm text-gray-700 dark:text-slate-300">Action: Order only when needed.</div>
              </div>
            </div>
          </div>
        )}
        {/* Advanced controls removed per request */}
        {!simpleMode && abcved?.matrix_counts ? (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="grid grid-cols-4 gap-px bg-gray-200 dark:bg-slate-800 rounded-lg overflow-hidden">
                <div className="bg-gray-50 dark:bg-slate-900 p-3 text-xs font-medium text-gray-600 dark:text-slate-300"></div>
                {['V','E','D'].map(h => (
                  <div key={h} className="bg-gray-50 dark:bg-slate-900 p-3 text-xs font-medium text-gray-600 dark:text-slate-300 text-center">{h}</div>
                ))}
                {['A','B','C'].map(row => (
                  <React.Fragment key={row}>
                    <div className="bg-gray-50 dark:bg-slate-900 p-3 text-xs font-medium text-gray-700 dark:text-slate-200">{row}</div>
                    {['V','E','D'].map(col => {
                      const key = `${row}-${col}`;
                      const val = abcved.matrix_counts[key] ?? 0;
                      const tone = (() => {
                        const mc = abcved?.matrix_counts || {};
                        const count = Number(mc[key] || 0);
                        const intensity = Math.min(1, count / Math.max(1, cellMax));
                        if (row === 'A') return `bg-blue-50 dark:bg-blue-950/30`;
                        if (row === 'B') return `bg-purple-50 dark:bg-purple-950/30`;
                        return `bg-slate-50 dark:bg-slate-900`;
                      })();
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedCell(key)}
                          className={`${tone} p-3 text-center text-sm text-gray-900 dark:text-slate-100 hover:bg-opacity-70 focus:outline-none ${selectedCell===key ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''}`}
                          title={`Show items for ${key}`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ) : (!simpleMode ? (
          <div className="text-sm text-gray-500 dark:text-slate-400">No ABC–VED data available.</div>
        ) : null)}
        {/* Explainer toggle */}
        <div className="mt-3">
          <button type="button" onClick={() => setShowABCHelp(v => !v)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            {showABCHelp ? 'Hide' : 'What is ABC–VED?'}
          </button>
          {showABCHelp && (
            <div className="mt-2 text-sm text-gray-700 dark:text-slate-300 space-y-1">
              <p><span className="font-semibold">ABC</span> ranks items by money impact (usage × cost): A = highest value share, B = medium, C = lowest.</p>
              <p><span className="font-semibold">VED</span> ranks items by importance to care: V = vital (must-have), E = essential, D = desirable.</p>
              <p>The grid combines both to guide ordering: prioritize A–V, then A–E and B–V. Thresholds default to 70% (A) and 90% (B) but can be tuned.</p>
            </div>
          )}
        </div>
        {/* Friendly legend and guidance */}
        <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-slate-300">
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2"><span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-200 text-xs">A</span> High value</span>
            <span className="inline-flex items-center gap-2"><span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-200 text-xs">B</span> Medium value</span>
            <span className="inline-flex items-center gap-2"><span className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs">C</span> Low value</span>
            <span className="inline-flex items-center gap-2"><span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-xs">V</span> Vital (must-have)</span>
            <span className="inline-flex items-center gap-2"><span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-xs">E</span> Essential</span>
            <span className="inline-flex items-center gap-2"><span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-xs">D</span> Desirable</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400">Tip: Focus first on A–V items (high value + vital) to avoid costly stock-outs. Then A–E and B–V. C–D items need the least attention.</p>
          {/* Coverage chips (concise) */}
          {abcved?.items && (
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-200">A {abcCoverage.pctA}%</span>
              <span className="text-xs px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-200">B {abcCoverage.pctB}%</span>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200">C {abcCoverage.pctC}%</span>
            </div>
          )}
          {/* Selected cell detail */}
          {selectedCell && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Items in {selectedCell}</div>
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                <input
                  type="text"
                  value={cellQuery}
                  onChange={(e)=>setCellQuery(e.target.value)}
                  placeholder="Search item name…"
                  className="px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-gray-800 dark:text-slate-200 w-full md:w-64"
                />
                <select
                  value={cellSort}
                  onChange={(e)=>setCellSort(e.target.value)}
                  className="px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-gray-800 dark:text-slate-200 w-full md:w-56"
                >
                  <option value="value_desc">Sort by Value (high → low)</option>
                  <option value="value_asc">Sort by Value (low → high)</option>
                  <option value="qty_desc">Sort by Qty (high → low)</option>
                  <option value="qty_asc">Sort by Qty (low → high)</option>
                  <option value="name_asc">Sort by Name (A → Z)</option>
                </select>
                <select
                  value={cellPageSize}
                  onChange={(e)=>setCellPageSize(Number(e.target.value))}
                  className="px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-gray-800 dark:text-slate-200 w-full md:w-28"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
                <button
                  type="button"
                  onClick={downloadSelectedCSV}
                  className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Export CSV
                </button>
              </div>
              {/* Pagination bar */}
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-slate-300 mb-2">
                <div>Showing {itemsForSelected.length} of {selectedAllItems.length} items</div>
                {selectedAllItems.length > 0 && (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const totalPages = Math.max(1, Math.ceil(selectedAllItems.length / cellPageSize));
                      const canPrev = cellPage > 1;
                      const canNext = cellPage < totalPages;
                      return (
                        <>
                          <button onClick={()=>setCellPage(1)} disabled={!canPrev} className={`px-2 py-1 rounded border ${canPrev ? 'border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-900' : 'border-transparent opacity-40'}`}>First</button>
                          <button onClick={()=>setCellPage(p=>Math.max(1,p-1))} disabled={!canPrev} className={`px-2 py-1 rounded border ${canPrev ? 'border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-900' : 'border-transparent opacity-40'}`}>Prev</button>
                          <span>Page {cellPage} of {totalPages}</span>
                          <button onClick={()=>setCellPage(p=>Math.min(totalPages,p+1))} disabled={!canNext} className={`px-2 py-1 rounded border ${canNext ? 'border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-900' : 'border-transparent opacity-40'}`}>Next</button>
                          <button onClick={()=>setCellPage(Math.max(1, Math.ceil(selectedAllItems.length / cellPageSize)))} disabled={!canNext} className={`px-2 py-1 rounded border ${canNext ? 'border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-900' : 'border-transparent opacity-40'}`}>Last</button>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden">
                <div className="grid grid-cols-6 gap-px bg-gray-200 dark:bg-slate-800">
                  <div className="bg-gray-50 dark:bg-slate-900 p-2 text-[11px] font-medium text-gray-600 dark:text-slate-300 col-span-3">Item</div>
                  <div className="bg-gray-50 dark:bg-slate-900 p-2 text-[11px] font-medium text-gray-600 dark:text-slate-300">Qty used</div>
                  <div className="bg-gray-50 dark:bg-slate-900 p-2 text-[11px] font-medium text-gray-600 dark:text-slate-300">Cost</div>
                  <div className="bg-gray-50 dark:bg-slate-900 p-2 text-[11px] font-medium text-gray-600 dark:text-slate-300">Value</div>
                  {itemsForSelected.map(it => (
                    <React.Fragment key={it.id || it.name}>
                      <div className="bg-white dark:bg-slate-950 p-2 text-[12px] text-gray-800 dark:text-slate-200 col-span-3 truncate" title={it.name}>{it.name}</div>
                      <div className="bg-white dark:bg-slate-950 p-2 text-[12px] text-gray-800 dark:text-slate-200">{Number(it.total_qty||0)}</div>
                      <div className="bg-white dark:bg-slate-950 p-2 text-[12px] text-gray-800 dark:text-slate-200">{Number(it.cost_price||0).toLocaleString('en-PH',{style:'currency',currency:'PHP'})}</div>
                      <div className="bg-white dark:bg-slate-950 p-2 text-[12px] text-gray-800 dark:text-slate-200">{Number(it.consumption_value||0).toLocaleString('en-PH',{style:'currency',currency:'PHP'})}</div>
                    </React.Fragment>
                  ))}
                  {itemsForSelected.length === 0 && (
                    <div className="bg-white dark:bg-slate-950 p-3 text-xs text-gray-500 dark:text-slate-400 col-span-6">No items in this cell for the selected period.</div>
                  )}
                </div>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">Suggested action: {actionText(selectedCell)}</div>
              <div className="text-[11px] text-gray-500 dark:text-slate-400">Computed from completed sales × cost within the shown date range.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
