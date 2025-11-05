import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { POSAPI, StaffAPI } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';

const StaffDashboard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [expiryRisk, setExpiryRisk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [range, setRange] = useState('7'); // days: '7' | '14' | '30'
  const [scope, setScope] = useState('all'); // 'all' | 'mine'

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError('');
        const [txns, risk] = await Promise.all([
          POSAPI.getTransactions(token).catch(() => null),
          StaffAPI.getExpiryRisk({ soon_days: Number(range) }, token).catch(() => null),
        ]);
        if (cancelled) return;
        const txList = (txns?.transactions ?? txns?.data ?? (Array.isArray(txns) ? txns : []));
        setTransactions(Array.isArray(txList) ? txList : []);
        setExpiryRisk(risk);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load overview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token, range]);

  const todaySalesCount = useMemo(() => {
    const localDateKey = (d) => {
      const x = new Date(d);
      const yyyy = x.getFullYear();
      const mm = String(x.getMonth() + 1).padStart(2, '0');
      const dd = String(x.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    const todayKey = localDateKey(new Date());
    const safeTx = Array.isArray(transactions) ? transactions : [];
    const mine = (t) => {
      if (!user) return false;
      const uid = user.id || user.user_id;
      const email = (user.email || '').toLowerCase();
      const name = (user.name || user.full_name || '').toLowerCase();
      return (
        t.staff_id === uid || t.user_id === uid ||
        (t.staff_email && String(t.staff_email).toLowerCase() === email) ||
        (t.user_email && String(t.user_email).toLowerCase() === email) ||
        (t.staff_name && String(t.staff_name).toLowerCase() === name)
      );
    };
    return safeTx
      .filter(t => {
        const raw = t.date || t.created_at || t.timestamp || t.time;
        if (!raw) return false;
        const key = localDateKey(raw);
        if (key !== todayKey) return false;
        return scope === 'mine' ? mine(t) : true;
      })
      .length;
  }, [transactions, user, scope]);

  const expirySummary = useMemo(() => {
    const sum = expiryRisk?.summary || {};
    let expSoon = Number(sum.expiring_soon_count || 0);
    let expired = Number(sum.expired_count || 0);
    if ((!expSoon && !expired) && expiryRisk) {
      const lists = [
        ...(expiryRisk.critical_risk || []),
        ...(expiryRisk.high_risk || []),
        ...(expiryRisk.medium_risk || []),
        ...(expiryRisk.low_risk || []),
      ];
      const toState = (i) => String(i.expiry_state || '').toLowerCase();
      const isSoon = (s) => s === 'expiring' || s === 'soon' || s === 'near_expiry';
      expSoon = lists.filter(i => isSoon(toState(i))).length;
      expired = lists.filter(i => toState(i) === 'expired').length;
    }
    return { expiringSoon: expSoon, expired };
  }, [expiryRisk]);

  const rangeLabel = useMemo(() => {
    const d = Number(range);
    if (d === 7) return 'Last 7 days';
    if (d === 14) return 'Last 14 days';
    return 'Last 30 days';
  }, [range]);

  const salesByDate = useMemo(() => {
    const days = Number(range);
    const safeTx = Array.isArray(transactions) ? transactions : [];
    const byDate = new Map();
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      byDate.set(key, 0);
    }
    const mine = (t) => {
      if (!user) return false;
      const uid = user.id || user.user_id;
      const email = (user.email || '').toLowerCase();
      const name = (user.name || user.full_name || '').toLowerCase();
      return (
        t.staff_id === uid || t.user_id === uid ||
        (t.staff_email && String(t.staff_email).toLowerCase() === email) ||
        (t.user_email && String(t.user_email).toLowerCase() === email) ||
        (t.staff_name && String(t.staff_name).toLowerCase() === name)
      );
    };
    safeTx.forEach(t => {
      if (scope === 'mine' && !mine(t)) return;
      const raw = t.date || t.created_at || t.timestamp || t.time;
      if (!raw) return;
      const d = new Date(raw);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const amount = Number(t.total || t.amount || t.grand_total || 0);
      if (byDate.has(dateKey)) byDate.set(dateKey, (byDate.get(dateKey) || 0) + amount);
    });
    return Array.from(byDate.entries()).map(([date, total]) => ({ date, total }));
  }, [transactions, range, scope, user]);

  const maxSales = useMemo(() => Math.max(1, ...salesByDate.map(x => x.total)), [salesByDate]);
  const totalSales = useMemo(() => salesByDate.reduce((a,b)=>a+b.total,0), [salesByDate]);

  const [hoverBar, setHoverBar] = useState(null);
  const [txQuery, setTxQuery] = useState('');
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(5);

  const txWithinRange = useMemo(() => {
    const days = Number(range);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    const isoCut = cutoff.toISOString().slice(0,10);
    const safeTx = Array.isArray(transactions) ? transactions : [];
    return safeTx.filter(t => (t.date || t.created_at || t.timestamp || '').slice(0,10) >= isoCut);
  }, [transactions, range]);

  const filteredTx = useMemo(() => {
    const q = txQuery.trim().toLowerCase();
    if (!q) return txWithinRange;
    return txWithinRange.filter(t => {
      const fields = [t.id, t.customer_name, t.staff_name, t.reference, t.note]
        .map(x => (x ?? '').toString().toLowerCase());
      return fields.some(f => f.includes(q));
    });
  }, [txWithinRange, txQuery]);

  const txTotalPages = useMemo(() => Math.max(1, Math.ceil((filteredTx.length || 0) / txPageSize)), [filteredTx, txPageSize]);
  useEffect(() => { setTxPage(1); }, [txQuery, txPageSize, range]);
  const txPageItems = useMemo(() => {
    const start = (txPage - 1) * txPageSize;
    return filteredTx.slice(start, start + txPageSize);
  }, [filteredTx, txPage, txPageSize]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Overview</h1>
            <p className="text-blue-100">Welcome {user?.name || user?.full_name || 'Staff'}</p>
          </div>
          <div className="ml-auto">
            <label className="text-xs text-blue-100 mr-2">Range</label>
            <select
              value={range}
              onChange={(e)=>setRange(e.target.value)}
              className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </select>
            <label className="text-xs text-blue-100 ml-4 mr-2">Scope</label>
            <select
              value={scope}
              onChange={(e)=>setScope(e.target.value)}
              className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="mine">My sales</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <button
          type="button"
          onClick={() => navigate('/staff/pos')}
          className="text-left bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow transition"
        >
          <p className="text-sm text-gray-500">Quick Actions</p>
          <ul className="mt-3 text-sm text-gray-700 list-disc list-inside space-y-1">
            <li>Open POS to process a sale</li>
            <li>Create inventory change request</li>
            <li>Check expiry alerts</li>
          </ul>
        </button>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">Recent Updates</p>
          {error ? (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          ) : (
            <div className="mt-3 text-gray-700 text-sm space-y-1">
              <p>Sales processed today: <span className="font-semibold">{todaySalesCount}</span></p>
              <p>Expiring soon items: <span className="font-semibold">{expirySummary.expiringSoon}</span></p>
              <p>Expired items: <span className="font-semibold">{expirySummary.expired}</span></p>
              {loading && <p className="text-gray-500">Loading…</p>}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">Tips</p>
          <p className="mt-3 text-gray-700 text-sm">Use AI Assistant to locate products faster.</p>
        </div>
      </div>

      {/* Interactive Sales mini chart */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Sales ({rangeLabel})</p>
          <p className="text-sm text-gray-500">Total: {(totalSales||0).toLocaleString('en-PH',{style:'currency',currency:'PHP'})}</p>
        </div>
        <div className="relative h-44 flex items-end gap-2">
          {salesByDate.map((d, idx) => {
            const height = Math.max(4, Math.round((d.total / maxSales) * 160));
            const active = hoverBar === idx;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full ${active ? 'bg-blue-700' : 'bg-blue-600'} rounded-t-md transition-colors`}
                  style={{ height }}
                  onMouseEnter={() => setHoverBar(idx)}
                  onMouseLeave={() => setHoverBar(null)}
                />
                <div className="mt-1 text-[10px] text-gray-500">{d.date.slice(5)}</div>
              </div>
            );
          })}
          {hoverBar != null && (
            <div className="absolute -top-2 left-0 right-0 pointer-events-none">
              <div className="w-max mx-auto px-2 py-1 rounded bg-gray-900 text-white text-xs shadow">
                {salesByDate[hoverBar]?.date}: {(salesByDate[hoverBar]?.total||0).toLocaleString('en-PH',{style:'currency',currency:'PHP'})}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expiry risk breakdown */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Expiry Risk Overview</p>
          <div className="text-sm text-gray-500">Window: {rangeLabel}</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button type="button" onClick={()=>navigate('/staff/waste-expiry')} className="text-left bg-gray-50 hover:bg-gray-100 rounded-lg p-4 border border-gray-200 transition">
            <div className="text-xs text-gray-500">Expiring Soon</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{expirySummary.expiringSoon}</div>
            <div className="text-xs text-blue-600 mt-1">View details →</div>
          </button>
          <button type="button" onClick={()=>navigate('/staff/waste-expiry')} className="text-left bg-gray-50 hover:bg-gray-100 rounded-lg p-4 border border-gray-200 transition">
            <div className="text-xs text-gray-500">Expired</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{expirySummary.expired}</div>
            <div className="text-xs text-blue-600 mt-1">Resolve now →</div>
          </button>
          <button type="button" onClick={()=>navigate('/staff/inventory-requests')} className="text-left bg-gray-50 hover:bg-gray-100 rounded-lg p-4 border border-gray-200 transition">
            <div className="text-xs text-gray-500">Create Inventory Request</div>
            <div className="text-sm text-gray-700 mt-1">Adjust stock, report issues</div>
            <div className="text-xs text-blue-600 mt-1">Open form →</div>
          </button>
        </div>
        {Array.isArray(expiryRisk?.critical_risk) && expiryRisk.critical_risk.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">Critical risk items ({expiryRisk.critical_risk.length})</summary>
            <div className="mt-2 max-h-52 overflow-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Item</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Days left</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Value at risk</th>
                  </tr>
                </thead>
                <tbody>
                  {expiryRisk.critical_risk.slice(0, 50).map((it, i) => (
                    <tr key={`${it.id||it.name}-${i}`} className="odd:bg-white even:bg-gray-50">
                      <td className="px-3 py-1.5 text-gray-800 truncate" title={it.name}>{it.name}</td>
                      <td className="px-3 py-1.5 text-gray-800">{it.days_left ?? '—'}</td>
                      <td className="px-3 py-1.5 text-gray-800">{Number(it.value_at_risk||0).toLocaleString('en-PH',{style:'currency',currency:'PHP'})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Recent Transactions ({rangeLabel})</p>
            <p className="text-xs text-gray-500">Showing {txPageItems.length} of {filteredTx.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={txQuery}
              onChange={(e)=>setTxQuery(e.target.value)}
              placeholder="Search id, customer, staff…"
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-800 w-56"
            />
            <select
              value={txPageSize}
              onChange={(e)=>setTxPageSize(Number(e.target.value))}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-800"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
            </select>
            <button
              type="button"
              onClick={()=>navigate('/staff/own-sales')}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              View My Sales
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-6 gap-px bg-gray-200">
            <div className="bg-gray-50 p-2 text-[11px] font-medium text-gray-600">ID</div>
            <div className="bg-gray-50 p-2 text-[11px] font-medium text-gray-600">Date</div>
            <div className="bg-gray-50 p-2 text-[11px] font-medium text-gray-600">Customer</div>
            <div className="bg-gray-50 p-2 text-[11px] font-medium text-gray-600">Staff</div>
            <div className="bg-gray-50 p-2 text-[11px] font-medium text-gray-600">Items</div>
            <div className="bg-gray-50 p-2 text-[11px] font-medium text-gray-600">Total</div>
            {txPageItems.map((t) => (
              <React.Fragment key={t.id || t.reference || (t.date+Math.random())}>
                <div className="bg-white p-2 text-[12px] text-gray-800 truncate" title={t.id}>{t.id || t.reference || '—'}</div>
                <div className="bg-white p-2 text-[12px] text-gray-800">{(t.date || t.created_at || '').slice(0,16).replace('T',' ')}</div>
                <div className="bg-white p-2 text-[12px] text-gray-800 truncate" title={t.customer_name}>{t.customer_name || 'Walk-in'}</div>
                <div className="bg-white p-2 text-[12px] text-gray-800 truncate" title={t.staff_name}>{t.staff_name || '—'}</div>
                <div className="bg-white p-2 text-[12px] text-gray-800">{Array.isArray(t.items)? t.items.length : (t.item_count ?? '—')}</div>
                <div className="bg-white p-2 text-[12px] text-gray-800">{Number(t.total || t.amount || t.grand_total || 0).toLocaleString('en-PH',{style:'currency',currency:'PHP'})}</div>
              </React.Fragment>
            ))}
            {txPageItems.length === 0 && (
              <div className="bg-white p-3 text-xs text-gray-500 col-span-6">No transactions found.</div>
            )}
          </div>
        </div>
        {filteredTx.length > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
            <div>Page {txPage} of {txTotalPages}</div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setTxPage(1)} disabled={txPage===1} className={`px-2 py-1 rounded border ${txPage===1 ? 'border-transparent opacity-40' : 'border-gray-300 hover:bg-gray-50'}`}>First</button>
              <button onClick={()=>setTxPage(p=>Math.max(1,p-1))} disabled={txPage===1} className={`px-2 py-1 rounded border ${txPage===1 ? 'border-transparent opacity-40' : 'border-gray-300 hover:bg-gray-50'}`}>Prev</button>
              <button onClick={()=>setTxPage(p=>Math.min(txTotalPages,p+1))} disabled={txPage===txTotalPages} className={`px-2 py-1 rounded border ${txPage===txTotalPages ? 'border-transparent opacity-40' : 'border-gray-300 hover:bg-gray-50'}`}>Next</button>
              <button onClick={()=>setTxPage(txTotalPages)} disabled={txPage===txTotalPages} className={`px-2 py-1 rounded border ${txPage===txTotalPages ? 'border-transparent opacity-40' : 'border-gray-300 hover:bg-gray-50'}`}>Last</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;


