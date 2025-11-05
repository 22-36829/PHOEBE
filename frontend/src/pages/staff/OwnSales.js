import React, { useEffect, useMemo, useState } from 'react';
import { Receipt, RefreshCcw, Search, Printer } from 'lucide-react';
import { POSAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const OwnSales = () => {
  const { token, user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await POSAPI.getTransactions(token);
      const list = Array.isArray(res?.transactions) ? res.transactions : [];
      const uid = user?.id ? Number(user.id) : null;
      const filtered = uid ? list.filter(s => Number(s.user_id) === uid) : list;
      setSales(filtered);
    } catch (e) {
      setError(e?.message || 'Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token, user?.id]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return sales.filter(s => {
      const created = s.created_at ? new Date(s.created_at) : null;
      const fromOk = !dateFrom || (created && created >= new Date(dateFrom));
      const toOk = !dateTo || (created && created <= new Date(dateTo + 'T23:59:59'));
      const matchesKw = !kw || [
        String(s.id || s.sale_number || ''),
        ...(Array.isArray(s.items) ? s.items.map(i => i.name) : [])
      ].some(v => String(v).toLowerCase().includes(kw));
      return fromOk && toOk && matchesKw;
    });
  }, [sales, search, dateFrom, dateTo]);

  // Pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paged = filtered.slice(start, end);

  useEffect(() => { setPage(1); }, [search, dateFrom, dateTo, pageSize]);

  const handlePrint = () => {
    const rows = filtered.map(s => `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;">${s.id || s.sale_number}</td>
        <td style="border:1px solid #ddd;padding:8px;">${Array.isArray(s.items) ? s.items.map(i => `${i.name} x${i.quantity}`).join(', ') : (s.items_count||'—')}</td>
        <td style="border:1px solid #ddd;padding:8px;">${typeof s.total_amount === 'number' ? s.total_amount.toFixed(2) : (s.total_amount||'—')}</td>
        <td style="border:1px solid #ddd;padding:8px;">${new Date(s.created_at).toLocaleString()}</td>
      </tr>
    `).join('');
    const filters = `Search: ${search||'—'} | ${dateFrom||'—'} to ${dateTo||'—'}`;
    const html = `
      <html><head><title>My Sales</title>
      <style>body{font-family:Arial;margin:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background:#f5f5f5}</style>
      </head><body>
      <h2>My Sales</h2>
      <p>${filters}</p>
      <table><thead><tr><th>Sale ID</th><th>Items</th><th>Total</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html); w.document.close(); w.print();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Receipt className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">My Sales</h2>
            <p className="text-sm text-gray-500">Transactions you processed</p>
          </div>
          <button onClick={load} disabled={loading} className="ml-auto inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm overflow-x-auto">
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {/* Filters */}
        <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search sale # or item name" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
          </div>
          <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
          <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
          <button onClick={()=>{setSearch(''); setDateFrom(''); setDateTo('');}} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Clear</button>
          <button onClick={handlePrint} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"><Printer className="w-4 h-4"/> Print</button>
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">Sale ID</th>
              <th className="py-2 pr-4">Items</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-500">No sales found</td>
              </tr>
            )}
            {paged.map((s) => (
              <tr key={s.id || s.sale_id} className="border-t text-gray-800">
                <td className="py-2 pr-4">{s.id || s.sale_id}</td>
                <td className="py-2 pr-4">{Array.isArray(s.items) ? s.items.map(i => `${i.name} x${i.quantity}`).join(', ') : s.items_count || '—'}</td>
                <td className="py-2 pr-4">{typeof s.total_amount === 'number' ? s.total_amount.toFixed(2) : s.total_amount || s.amount || '—'}</td>
                <td className="py-2 pr-4">{new Date(s.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination (always visible) */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">Total Sales: <span className="font-semibold">{total}</span></div>
          <div className="flex items-center gap-2">
            <select value={pageSize} onChange={(e)=>{setPageSize(Number(e.target.value)); setPage(1);}} className="px-2 py-1 border border-gray-300 rounded text-sm">
              {[10,20,50,100].map(s=> <option key={s} value={s}>{s}/page</option>)}
            </select>
            <div className="flex items-center gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={current===1} className={`px-2 py-1 rounded ${current===1?'opacity-40 cursor-not-allowed text-gray-400':'border border-gray-300 hover:bg-gray-50'}`}>‹</button>
              <span className="text-sm">Page {current} of {totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={current===totalPages} className={`px-2 py-1 rounded ${current===totalPages?'opacity-40 cursor-not-allowed text-gray-400':'border border-gray-300 hover:bg-gray-50'}`}>›</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnSales;


