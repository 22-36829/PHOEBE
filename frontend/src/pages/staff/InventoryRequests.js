import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Search, Layers, Loader2, ChevronDown } from 'lucide-react';
import { InventoryAPI, POSAPI, ManagerAPI, StaffAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const InventoryRequests = () => {
  const { token, user } = useAuth();
  // Requests
  const [requests, setRequests] = useState([]);
  const [requestsSearch, setRequestsSearch] = useState('');
  const [requestsDateFrom, setRequestsDateFrom] = useState('');
  const [requestsDateTo, setRequestsDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [reqPage, setReqPage] = useState(1);
  const [reqPageSize, setReqPageSize] = useState(10);
  const [reqTotal, setReqTotal] = useState(0);
  const [editModal, setEditModal] = useState(null); // {id, quantity_change, reason}
  const [error, setError] = useState('');

  // Products (for deliveries access only)
  const [products, setProducts] = useState([]);
  const [prodQuery, setProdQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [pageInput, setPageInput] = useState('');
  const prodSearchRef = useRef(null);

  // Deliveries modal state (copied from manager, limited to add/edit only)
  const [deliveriesOpen, setDeliveriesOpen] = useState(false);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryForm, setDeliveryForm] = useState({ quantity: '', expiration_date: '', delivery_date: '', supplier_name: '', cost_price: '' });
  const [deliveryTarget, setDeliveryTarget] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [deliverySearch, setDeliverySearch] = useState('');
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryPageSize, setDeliveryPageSize] = useState(10);
  const [deliveryPageInput, setDeliveryPageInput] = useState('');
  const [inlineEditing, setInlineEditing] = useState(null);
  const [inlineEditValues, setInlineEditValues] = useState({});
  const [deliveryError, setDeliveryError] = useState('');
  const deliverySearchRef = useRef(null);
  const [requestSuccess, setRequestSuccess] = useState('');

  // Load requests
  const loadRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const baseParams = { page: reqPage, page_size: reqPageSize };
      if (statusFilter) baseParams.status = statusFilter;
      // Staff can see all requests list; backend can scope by role
      const res = await InventoryAPI.listRequests(baseParams, token);
      setRequests(res.requests || []);
      if (typeof res?.total === 'number') setReqTotal(res.total);
    } catch (e) {
      setError(e.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  // Load products for deliveries access
  const loadProducts = async () => {
    try {
      const data = await POSAPI.getProducts();
      if (data.success) setProducts(data.products);
    } catch {}
  };

  useEffect(() => { if (token) { loadRequests(); loadProducts(); } /* eslint-disable-next-line */ }, [token, statusFilter, reqPage, reqPageSize]);

  // Requests filtering like manager (general fields only)
  const filteredRequests = useMemo(() => {
    const kw = requestsSearch.trim().toLowerCase();
    return requests.filter(r => {
      const matchesKw = !kw || [r.product_name, r.requested_by_email, r.trans_type, r.status].filter(Boolean).some(v => String(v).toLowerCase().includes(kw));
      const matchesStatus = !statusFilter || r.status === statusFilter;
      const created = r.created_at ? new Date(r.created_at) : null;
      const fromOk = !requestsDateFrom || (created && created >= new Date(requestsDateFrom));
      const toOk = !requestsDateTo || (created && created <= new Date(requestsDateTo + 'T23:59:59'));
      return matchesKw && matchesStatus && fromOk && toOk;
    });
  }, [requests, requestsSearch, statusFilter, requestsDateFrom, requestsDateTo]);

  // Product list filtering for deliveries
  const filteredProducts = useMemo(() => {
    const q = prodQuery.trim().toLowerCase();
    return products.filter(p => !q || [p.name, p.category_name, p.location].filter(Boolean).some(v => String(v).toLowerCase().includes(q)));
  }, [products, prodQuery]);

  // Pagination for products
  const total = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const startIndex = (current - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const pagedProducts = filteredProducts.slice(startIndex, endIndex);
  useEffect(() => { setPage(1); setPageInput(''); }, [prodQuery, products]);

  // Deliveries logic (copy minimal from manager)
  const loadSuppliers = async () => {
    try {
      const res = await ManagerAPI.listSuppliers(token);
      if (res && res.success) setSuppliers(res.suppliers || []);
    } catch (e) {
      // Staff may not have access to suppliers; ignore Forbidden
      const msg = (e && (e.error || e.message)) || '';
      if (String(msg).toLowerCase().includes('forbidden')) return;
      // Silently ignore other supplier errors for view-only context
    }
  };

  const openDeliveries = async (product) => {
    setDeliveryTarget(product);
    setDeliveriesOpen(true);
    setDeliveryForm({ quantity: '', expiration_date: '', delivery_date: '', supplier_name: '', cost_price: '' });
    setDeliverySearch('');
    setEditingDelivery(null);
    setDeliveryError('');
    setDeliveryPage(1);
    try {
      setDeliveriesLoading(true);
      const res = user && (user.role === 'manager' || user.role === 'admin')
        ? await ManagerAPI.listBatches(product.id, token)
        : await StaffAPI.listBatches(product.id, token);
      if (res && res.success) setDeliveries(res.batches || []);
      else {
        setDeliveries([]);
        const msg = (res && res.error) ? String(res.error).toLowerCase() : '';
        if (!msg.includes('forbidden')) setDeliveryError(res?.error || 'Unable to load deliveries');
      }
      if (user && (user.role === 'manager' || user.role === 'admin')) {
        await loadSuppliers();
      }
    } catch (e) {
      const msg = (e && (e.error || e.message)) ? String(e.error || e.message).toLowerCase() : '';
      if (!msg.includes('forbidden')) setDeliveryError(e.message || 'Failed to load deliveries');
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const submitDelivery = async (e) => {
    e.preventDefault();
    if (!deliveryTarget) return;
    try {
      setDeliveriesLoading(true);
      setDeliveryError('');

      const newQty = Number(deliveryForm.quantity || 0);
      if (!newQty || Number.isNaN(newQty)) throw new Error('Enter a valid quantity');

      // Compute change: for edits, delta from original; for new, full qty
      const delta = editingDelivery ? (newQty - Number(editingDelivery.quantity || 0)) : newQty;

      const reasonParts = [
        editingDelivery ? 'Proposed edit to existing delivery' : 'Proposed new delivery',
      ];
      if (deliveryForm.supplier_name) reasonParts.push(`Supplier: ${deliveryForm.supplier_name}`);
      if (deliveryForm.delivery_date) reasonParts.push(`Delivery date: ${deliveryForm.delivery_date}`);
      if (deliveryForm.expiration_date) reasonParts.push(`Expiry: ${deliveryForm.expiration_date}`);
      if (deliveryForm.cost_price) reasonParts.push(`Cost: ₱${Number(deliveryForm.cost_price).toFixed(2)}`);
      const reason = reasonParts.join(' • ');

      // Create inventory request for manager approval
      let res = await InventoryAPI.createRequest({
        product_id: Number(deliveryTarget.id),
        quantity_change: delta,
        reason,
      }, token);
      // If server fails with 500 (no JSON), res may be undefined; try a blind retry once
      if (!res || res.success === false) {
        const errMsg = (res && res.error ? String(res.error).toLowerCase() : '');
        if (!res || errMsg.includes('trans_type') || errMsg.includes('500')) {
          res = await InventoryAPI.createRequest({ product_id: Number(deliveryTarget.id), quantity_change: delta, reason }, token);
        }
      }
      if (res && res.success === false) throw new Error(res.error || 'Failed to submit request');

      // Refresh requests and close modal
      // Optimistically show in the table immediately
      setRequests(prev => [
        {
          id: res?.request?.id || `temp_${Date.now()}`,
          product_id: Number(deliveryTarget.id),
          product_name: deliveryTarget.name,
          quantity_change: delta,
          reason,
          status: 'pending',
          requested_by_email: user?.email || undefined,
          requested_by_first_name: user?.first_name || undefined,
          requested_by_last_name: user?.last_name || undefined,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setRequestSuccess('Delivery request submitted');
      setTimeout(()=>setRequestSuccess(''), 1500);
      await loadRequests();
      setDeliveriesOpen(false);
      setDeliveryForm({ quantity: '', expiration_date: '', delivery_date: '', supplier_name: '', cost_price: '' });
      setEditingDelivery(null);
    } catch (e) {
      setDeliveryError(e.message || 'Failed to submit request');
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const startEditProposal = (delivery) => {
    setEditingDelivery(delivery);
    setDeliveryForm({
      quantity: String(delivery.quantity ?? ''),
      expiration_date: delivery.expiration_date || '',
      delivery_date: delivery.delivery_date || '',
      supplier_name: delivery.supplier_name || '',
      cost_price: delivery.cost_price ? String(delivery.cost_price) : '',
    });
  };

  const filteredDeliveries = useMemo(() => {
    if (!deliverySearch.trim()) return deliveries;
    const search = deliverySearch.toLowerCase();
    return deliveries.filter(delivery => 
      delivery.supplier_name?.toLowerCase().includes(search) ||
      delivery.expiration_date?.includes(search) ||
      delivery.delivery_date?.includes(search) ||
      String(delivery.quantity).includes(search) ||
      String(delivery.cost_price || '').includes(search)
    );
  }, [deliveries, deliverySearch]);

  const deliveryTotal = filteredDeliveries.length;
  const deliveryTotalPages = Math.max(1, Math.ceil(deliveryTotal / deliveryPageSize));
  const deliveryCurrentPage = Math.min(deliveryPage, deliveryTotalPages);
  const deliveryStartIndex = (deliveryCurrentPage - 1) * deliveryPageSize;
  const deliveryEndIndex = Math.min(deliveryStartIndex + deliveryPageSize, deliveryTotal);
  const paginatedDeliveries = filteredDeliveries.slice(deliveryStartIndex, deliveryEndIndex);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Inventory Requests</h2>
            <p className="text-sm text-gray-500">View requests and manage deliveries</p>
          </div>
        </div>
      </div>

      {/* Requests (read-only, general fields) */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        {requestSuccess && (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 text-sm">{requestSuccess}</div>
        )}
        <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input value={requestsSearch} onChange={(e)=>setRequestsSearch(e.target.value)} placeholder="Search keyword" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
          </div>
          <input type="date" value={requestsDateFrom} onChange={(e)=>setRequestsDateFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
          <input type="date" value={requestsDateTo} onChange={(e)=>setRequestsDateTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
          <div className="relative">
            <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button onClick={loadRequests} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Refresh</button>
          <button onClick={()=>{setRequestsSearch(''); setRequestsDateFrom(''); setRequestsDateTo(''); setStatusFilter('');}} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Clear</button>
        </div>
        {loading ? (
          <div className="text-center py-10 text-gray-500"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2"/> Loading requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No requests found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Qty Change</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Requested By</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(r => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="py-3 pr-4 font-medium text-gray-900">{r.product_name}</td>
                    <td className={`py-3 pr-4 ${r.quantity_change < 0 ? 'text-rose-600' : 'text-emerald-700'} font-semibold`}>{r.quantity_change}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{r.status}</span>
                    </td>
                    <td className="py-3 pr-4">{(r.requested_by_first_name || r.requested_by_last_name) ? `${r.requested_by_first_name||''} ${r.requested_by_last_name||''}`.trim() : (r.requested_by_email || r.requested_by)}</td>
                    <td className="py-3 pr-4">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right">
                      {(r.status === 'pending' || r.status === 'rejected') && user && String(r.requested_by) === String(user.id) && (
                        <div className="flex items-center justify-end gap-2">
                          {r.status === 'pending' && (
                            <button onClick={()=>setEditModal({ id: r.id, quantity_change: r.quantity_change, reason: r.reason||'' })} className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-xs">Edit</button>
                          )}
                          <button onClick={async()=>{ if(!window.confirm('Delete this request?')) return; await InventoryAPI.deleteRequest(r.id, token); await loadRequests(); }} className="px-3 py-1.5 border border-rose-300 text-rose-600 rounded hover:bg-rose-50 text-xs">Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-3">
              <div className="text-sm text-gray-600">Total Requests: <span className="font-semibold">{reqTotal}</span></div>
              <div className="flex items-center gap-2">
                <select value={reqPageSize} onChange={(e)=>{setReqPageSize(Number(e.target.value)); setReqPage(1);}} className="px-2 py-1 border border-gray-300 rounded text-sm">
                  {[10,25,50,100].map(s=> <option key={s} value={s}>{s}/page</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <button onClick={()=>setReqPage(p=>Math.max(1,p-1))} disabled={reqPage===1} className={`px-2 py-1 rounded ${reqPage===1?'opacity-40 cursor-not-allowed text-gray-400':'border border-gray-300 hover:bg-gray-50'}`}>‹</button>
                  <span className="text-sm">Page {reqPage} of {Math.max(1, Math.ceil(reqTotal/reqPageSize))}</span>
                  <button onClick={()=>setReqPage(p=>Math.min(Math.max(1, Math.ceil(reqTotal/reqPageSize)), p+1))} disabled={reqPage>=Math.ceil(reqTotal/reqPageSize)} className={`px-2 py-1 rounded ${reqPage>=Math.ceil(reqTotal/reqPageSize)?'opacity-40 cursor-not-allowed text-gray-400':'border border-gray-300 hover:bg-gray-50'}`}>›</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products (Deliveries access only) */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Deliveries</h3>
            <p className="text-xs text-gray-500">Open a product to add a delivery request</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input value={prodQuery} onChange={(e)=>setProdQuery(e.target.value)} placeholder="Search products" className="w-64 pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" ref={prodSearchRef} />
            </div>
            <div className="relative">
              <select value={pageSize} onChange={(e)=>setPageSize(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {[10,12,20,50].map(s=> <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Current Stock</th>
                <th className="py-2 pr-0 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedProducts.map(p => (
                <tr key={p.id} className="border-top border-gray-100 hover:bg-indigo-50/40 transition-colors">
                  <td className="py-2 pr-3 font-medium text-gray-900">{p.name}</td>
                  <td className="py-2 pr-3">{p.category_name || '—'}</td>
                  <td className="py-2 pr-3">{p.current_stock}</td>
                  <td className="py-2 pr-0 text-right">
                    <button onClick={() => openDeliveries(p)} className="inline-flex items-center gap-1 px-3 py-1.5 border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50">
                      <Layers className="w-4 h-4" /> Deliveries
                    </button>
                  </td>
                </tr>
              ))}
              {pagedProducts.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-gray-500">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-700">Total Items: <span className="font-semibold">{total}</span></div>
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={current===1} className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-sm ${current===1?'opacity-40 cursor-not-allowed text-gray-400':'hover:bg-gray-50 text-gray-700'}`}>‹</button>
              {Array.from({length: Math.min(5, totalPages)}, (_,i)=> Math.max(1, current-2)+i).map(num => (
                <button key={num} onClick={()=>setPage(num)} className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-sm font-medium ${num===current?'bg-indigo-600 text-white shadow-sm':'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{num}</button>
              ))}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={current===totalPages} className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-sm ${current===totalPages?'opacity-40 cursor-not-allowed text-gray-400':'hover:bg-gray-50 text-gray-700'}`}>›</button>
            </div>
            <form onSubmit={(e)=>{e.preventDefault(); const n=parseInt(pageInput,10); if(!Number.isNaN(n)){ const c=Math.max(1, Math.min(totalPages, n)); setPage(c);} setPageInput('');}} className="flex items-center gap-2 text-sm text-gray-700">
              <span>Go to page:</span>
              <input type="number" min="1" max={totalPages} value={pageInput} onChange={(e)=>setPageInput(e.target.value)} placeholder={`${current}`} className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center" />
              <span className="text-sm text-gray-600">of {totalPages}</span>
              <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-xs font-medium">Go</button>
            </form>
          </div>
        )}
      </div>

      {/* Deliveries Modal (add/edit only) */}
      {deliveriesOpen && deliveryTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-7xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5"/>
                Deliveries — {deliveryTarget.name}
              </div>
              <button onClick={() => setDeliveriesOpen(false)} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
            </div>

            {deliveryError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 flex items-start justify-between gap-4">
                <div className="text-sm"><strong className="font-semibold">Error:</strong> {deliveryError}</div>
                <button onClick={() => setDeliveryError('')} className="text-sm font-medium text-red-700 hover:underline">Dismiss</button>
              </div>
            )}

            <div className="mb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                <input type="text" value={deliverySearch} onChange={(e)=>setDeliverySearch(e.target.value)} placeholder="Search deliveries by supplier, date, quantity, or cost..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" ref={deliverySearchRef} />
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">{editingDelivery ? 'Edit Delivery Request' : 'Add New Delivery Request'}</h3>
              <form onSubmit={submitDelivery} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                  <input type="number" min={1} value={deliveryForm.quantity} onChange={(e)=>setDeliveryForm(f=>({...f,quantity:e.target.value}))} placeholder="Enter quantity" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Expiration Date</label>
                  <input type="date" value={deliveryForm.expiration_date} onChange={(e)=>setDeliveryForm(f=>({...f,expiration_date:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Date</label>
                  <input type="date" value={deliveryForm.delivery_date} onChange={(e)=>setDeliveryForm(f=>({...f,delivery_date:e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Supplier Name</label>
                  <input type="text" value={deliveryForm.supplier_name} onChange={(e)=>setDeliveryForm(f=>({...f,supplier_name:e.target.value}))} placeholder="Enter supplier name" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cost Price</label>
                  <input type="number" min={0} step="0.01" value={deliveryForm.cost_price} onChange={(e)=>setDeliveryForm(f=>({...f,cost_price:e.target.value}))} placeholder="₱0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </form>
              <div className="flex items-center gap-2 mt-4">
                <button type="submit" onClick={submitDelivery} disabled={deliveriesLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                  {deliveriesLoading && <Loader2 className="w-4 h-4 animate-spin"/>}
                  {editingDelivery ? 'Update Delivery Request' : 'Add Delivery Request'}
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">{deliveryTotal} delivery{deliveryTotal !== 1 ? 'ies' : ''} found</span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Per page:</label>
                    <select value={deliveryPageSize} onChange={(e)=>{setDeliveryPageSize(Number(e.target.value)); setDeliveryPage(1);}} className="text-xs px-2 py-1 border border-gray-300 rounded">
                      {[5,10,20,50].map(size => (<option key={size} value={size}>{size}</option>))}
                    </select>
                  </div>
                </div>
                {deliverySearch && (
                  <button onClick={() => setDeliverySearch('')} className="text-xs text-indigo-600 hover:text-indigo-800">Clear search</button>
                )}
              </div>
              <>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600 bg-gray-50">
                        <th className="py-3 px-4">Quantity</th>
                        <th className="py-3 px-4">Expiration Date</th>
                        <th className="py-3 px-4">Delivery Date</th>
                        <th className="py-3 px-4">Supplier</th>
                        <th className="py-3 px-4">Cost Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDeliveries.map((delivery) => (
                        <tr key={delivery.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{delivery.quantity}</td>
                          <td className="py-3 px-4">{delivery.expiration_date ? new Date(delivery.expiration_date).toLocaleDateString() : '—'}</td>
                          <td className="py-3 px-4">{delivery.delivery_date ? new Date(delivery.delivery_date).toLocaleDateString() : '—'}</td>
                          <td className="py-3 px-4">{delivery.supplier_name || '—'}</td>
                          <td className="py-3 px-4">{delivery.cost_price ? `₱${Number(delivery.cost_price).toFixed(2)}` : '—'}</td>
                        </tr>
                      ))}
                      {(!paginatedDeliveries || paginatedDeliveries.length === 0) && (
                        <tr>
                          <td className="py-8 px-4 text-center text-gray-500" colSpan={5}>
                            {deliveriesLoading ? 'Loading deliveries…' : deliverySearch ? 'No deliveries match your search' : 'No deliveries recorded yet'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {deliveryTotal > deliveryPageSize && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-600">Showing <span className="font-semibold">{deliveryStartIndex + 1}-{deliveryEndIndex}</span> of <span className="font-semibold">{deliveryTotal}</span> deliveries</div>
                      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
                        <button onClick={() => setDeliveryPage(p => Math.max(1, p - 1))} disabled={deliveryCurrentPage === 1} className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-sm ${deliveryCurrentPage === 1 ? 'opacity-40 cursor-not-allowed text-gray-400' : 'hover:bg-gray-50 text-gray-700'}`}>‹</button>
                        {Array.from({ length: Math.min(5, deliveryTotalPages) }, (_, i) => { const start = Math.max(1, deliveryCurrentPage - 2); return Math.min(deliveryTotalPages, start + i); }).map((pageNum) => (
                          <button key={pageNum} onClick={() => setDeliveryPage(pageNum)} className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-sm font-medium ${deliveryCurrentPage === pageNum ? 'bg-indigo-600 text-white shadow-sm' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{pageNum}</button>
                        ))}
                        <button onClick={() => setDeliveryPage(p => Math.min(deliveryTotalPages, p + 1))} disabled={deliveryCurrentPage === deliveryTotalPages} className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-sm ${deliveryCurrentPage === deliveryTotalPages ? 'opacity-40 cursor-not-allowed text-gray-400' : 'hover:bg-gray-50 text-gray-700'}`}>›</button>
                        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 text-sm text-gray-700">
                          <span>Go to page:</span>
                          <form onSubmit={(e)=>{e.preventDefault(); const n=parseInt(deliveryPageInput,10); if(!Number.isNaN(n)){ const c=Math.max(1, Math.min(deliveryTotalPages, n)); setDeliveryPage(c);} setDeliveryPageInput('');}} className="flex items-center gap-2">
                            <input type="number" min="1" max={deliveryTotalPages} value={deliveryPageInput} onChange={(e)=>setDeliveryPageInput(e.target.value)} placeholder={`${deliveryCurrentPage}`} className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center" />
                            <span className="text-sm text-gray-600">of {deliveryTotalPages}</span>
                            <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-xs font-medium">Go</button>
                          </form>
                        </div>
                      </div>
                    </div>
                  )}
                </>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="text-lg font-semibold text-gray-900 mb-4">Edit Delivery Request</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Change</label>
                <input type="number" value={editModal.quantity_change} onChange={(e)=>setEditModal(m=>({...m, quantity_change: Number(e.target.value)}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea rows={3} value={editModal.reason} onChange={(e)=>setEditModal(m=>({...m, reason: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={()=>setEditModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={async()=>{ await InventoryAPI.updateRequest(editModal.id, { quantity_change: editModal.quantity_change, reason: editModal.reason }, token); setEditModal(null); await loadRequests(); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryRequests;


