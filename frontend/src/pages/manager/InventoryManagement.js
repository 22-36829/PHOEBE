import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Package, AlertTriangle, CheckCircle, Clock, Plus, ChevronDown, Loader2, Trash2, Pencil, Layers, Building2, Search, Printer, FileText, Users, BarChart3, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { InventoryAPI, POSAPI, ManagerAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const InventoryManagement = () => {
  const { token, user } = useAuth();

  // Products and requests
  const [products, setProducts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  // Requests filters
  const [requestsSearch, setRequestsSearch] = useState('');
  const [requestsStaff, setRequestsStaff] = useState('');
  const [requestsDateFrom, setRequestsDateFrom] = useState('');
  const [requestsDateTo, setRequestsDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Modal-scoped errors
  const [deliveryError, setDeliveryError] = useState('');
  const [reportError, setReportError] = useState('');

  const [prodQuery, setProdQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]); // [{id, name}]
  const [statusView, setStatusView] = useState('active'); // active | inactive | all

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', unit_price: '', cost_price: '', category_name: '', location: '' });
  const [newCategoryName, setNewCategoryName] = useState('');

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [editValues, setEditValues] = useState({ name: '', unit_price: '', cost_price: '', category_name: '', location: '' });
  const [editNewCategoryName, setEditNewCategoryName] = useState('');

  // Tabs
  const [tab, setTab] = useState('inventory'); // inventory | reorder | requests | returns

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [pageInput, setPageInput] = useState('');

  // Returns data
  const [returnedItems, setReturnedItems] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  // Returns filters
  const [returnsSearch, setReturnsSearch] = useState('');
  const [returnsStaff, setReturnsStaff] = useState('');
  const [returnsDateFrom, setReturnsDateFrom] = useState('');
  const [returnsDateTo, setReturnsDateTo] = useState('');

  // Delivery batches modal state
  const [deliveriesOpen, setDeliveriesOpen] = useState(false);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryForm, setDeliveryForm] = useState({ quantity: '', expiration_date: '', delivery_date: '', supplier_name: '', cost_price: '' });
  const [deliveryTarget, setDeliveryTarget] = useState(null); // product
  const [suppliers, setSuppliers] = useState([]);
  const [deliverySearch, setDeliverySearch] = useState('');
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryPageSize, setDeliveryPageSize] = useState(10);
  const [deliveryPageInput, setDeliveryPageInput] = useState('');
  const [inlineEditing, setInlineEditing] = useState(null); // Track which row is being edited inline
  const [inlineEditValues, setInlineEditValues] = useState({});

  // Reporting states
  const [reportsOpen, setReportsOpen] = useState(false);
  const [reportType, setReportType] = useState('stock'); // stock, expired, sales_staff, sales_period
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [reportStaffId, setReportStaffId] = useState('');
  const [reportPeriod, setReportPeriod] = useState('day'); // day, week, month
  const [reportExpiredStatus, setReportExpiredStatus] = useState('all'); // expired | expiring | all
  const [reportCategoryId, setReportCategoryId] = useState('');
  const [reportStockStatus, setReportStockStatus] = useState('all'); // all | in_stock | low_stock | out_of_stock
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(10);
  const [reportPageInput, setReportPageInput] = useState('');

  // Reorder Planner state
  const [reorderQuery, setReorderQuery] = useState('');
  const [reorderCategory, setReorderCategory] = useState('');
  const [reorderOnlyLow, setReorderOnlyLow] = useState(true);
  const [reorderPlan, setReorderPlan] = useState({}); // { [productId]: number }

  const isManager = user && (user.role === 'manager' || user.role === 'admin');
  const requestsRef = useRef(null);

  // Refs for keyboard shortcuts
  const prodSearchRef = useRef(null);
  const deliverySearchRef = useRef(null);

  // Keyboard shortcuts - global (Escape, Ctrl+K, Ctrl+P)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (deliveriesOpen) {
          if (inlineEditing) {
            e.preventDefault();
            cancelInlineEdit();
            return;
          }
          e.preventDefault();
          setDeliveriesOpen(false);
          return;
        }
        if (reportsOpen) {
          e.preventDefault();
          setReportsOpen(false);
          return;
        }
      }
      // Ctrl+K focus main inventory search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        prodSearchRef.current?.focus();
        return;
      }
      // Ctrl+P open Reports
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setReportsOpen(true);
        return;
      }
      // Ctrl+F focus deliveries search when modal open
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        if (deliveriesOpen) {
          e.preventDefault();
          deliverySearchRef.current?.focus();
          return;
        }
      }
      // Ctrl+Enter to save inline edit when editing a delivery row
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (deliveriesOpen && inlineEditing) {
          e.preventDefault();
          const row = deliveries.find(d => d.id === inlineEditing);
          if (row) saveInlineEdit(row);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deliveriesOpen, reportsOpen, inlineEditing, deliveries]);

  const loadProducts = async () => {
    try {
      // Use POS for active/all view; for inactive we use manager list
      if (statusView === 'inactive' || statusView === 'all') {
        const data = await ManagerAPI.listProductsByStatus(statusView, token);
        if (data.success) setProducts(data.products);
      } else {
        const data = await POSAPI.getProducts();
        if (data.success) setProducts(data.products);
      }
    } catch {}
  };
  const loadCategories = async () => {
    try {
      const data = await POSAPI.getCategories();
      if (data.success) setCategories(data.categories || []);
    } catch {}
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await InventoryAPI.listRequests(statusFilter ? { status: statusFilter } : {}, token);
      setRequests(data.requests || []);
    } catch (e) {
      setError(e.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const loadReturns = async () => {
    try {
      setLoadingReturns(true);
      setError('');
      const data = await ManagerAPI.getReturnedItems(token);
      if (data.success) {
        setReturnedItems(data.returns || []);
      }
    } catch (e) {
      setError(e.message || 'Failed to load returns');
    } finally {
      setLoadingReturns(false);
    }
  };

  const deleteReturn = async (returnId) => {
    if (!window.confirm('Delete this return record? This action cannot be undone.')) return;
    try {
      setError('');
      // Attempt manager delete endpoint if available
      if (ManagerAPI.deleteReturn) {
        await ManagerAPI.deleteReturn(returnId, token);
      } else if (InventoryAPI.deleteReturn) {
        await InventoryAPI.deleteReturn(returnId, token);
      } else {
        throw new Error('Delete return API not available');
      }
      await loadReturns();
      setSuccess('Return deleted');
      setTimeout(()=>setSuccess(''),1500);
    } catch (e) {
      setError(e.message || 'Failed to delete return');
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await ManagerAPI.listSuppliers(token);
      if (res && res.success) setSuppliers(res.suppliers || []);
    } catch (e) {
      setError(e.message || 'Failed to load suppliers');
    }
  };

  const loadStaff = async () => {
    try {
      const res = await ManagerAPI.listStaff(token);
      if (res && res.success) setStaffList(res.staff || []);
    } catch (e) {
      setError(e.message || 'Failed to load staff');
    }
  };

  const generateReport = async () => {
    try {
      setReportLoading(true);
      setReportError('');
      
      // Validate required fields for sales_period report
      if (reportType === 'sales_period' && !reportStaffId) {
        setReportError('Please select a staff member for the sales period report');
        setReportLoading(false);
        return;
      }
      
      let endpoint = '';
      let params = {};
      
      switch (reportType) {
        case 'stock':
          endpoint = '/api/manager/reports/stock';
          params = { status: reportStockStatus, category_id: reportCategoryId || undefined };
          break;
        case 'expired':
          endpoint = '/api/manager/reports/expired';
          params = { status: reportExpiredStatus };
          if (reportCategoryId) params.category_id = reportCategoryId;
          break;
        case 'sales_staff':
          endpoint = '/api/manager/reports/sales-staff';
          params = { staff_id: reportStaffId, date_from: reportDateFrom, date_to: reportDateTo };
          break;
        case 'sales_period':
          endpoint = '/api/manager/reports/sales-period';
          params = { staff_id: reportStaffId, period: reportPeriod, date_from: reportDateFrom, date_to: reportDateTo };
          break;
        default:
          throw new Error('Invalid report type');
      }
      
      const res = await ManagerAPI.generateReport(endpoint, params, token);
      if (res && res.success) {
        setReportData(res.data || []);
        setSuccess('Report generated successfully');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setReportError(res?.error || 'Failed to generate report');
      }
    } catch (e) {
      setReportError(e.message || 'Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
      const reportTitle = {
        'stock': 'Current Stock Report',
        'expired': 'Expired Products Report',
        'sales_staff': 'Sales Report by Staff',
        'sales_period': 'Sales Report by Period'
      }[reportType];
    
    const staffName = reportStaffId ? staffList.find(s => s.id === parseInt(reportStaffId))?.name || 'All Staff' : 'All Staff';
    const requestedBy = user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : 'Manager';
    const dateRange = reportDateFrom && reportDateTo ? `${reportDateFrom} to ${reportDateTo}` : 'All Time';
    const paginationInfo = reportTotal > reportPageSize ? 
      ` (Page ${reportCurrentPage} of ${reportTotalPages} - Showing records ${reportStartIndex + 1} to ${reportEndIndex} of ${reportTotal})` : 
      ` (All ${reportTotal} records)`;
    
    let tableContent = '';
    
    if (reportType === 'sales_period') {
      // Special print layout for sales_period report
      tableContent = `
        <div style="margin-top: 20px;">
          ${paginatedReportData.map((periodData, index) => `
            <div style="margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #f0f8ff; padding: 15px; border-bottom: 1px solid #ddd;">
                <h3 style="margin: 0; color: #333;">
                  ${reportPeriod === 'day' ? new Date(periodData.period_date).toLocaleDateString() :
                   reportPeriod === 'week' ? `Week of ${new Date(periodData.period_date).toLocaleDateString()}` :
                   new Date(periodData.period_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <p style="margin: 5px 0 0 0; color: #666;">
                  ${(periodData.period_summary?.total_sales || 0)} sales • ₱${Number(periodData.period_summary?.period_revenue || 0).toFixed(2)} revenue
                </p>
                <p style="margin: 5px 0 0 0; color: #666;">
                  ${(periodData.period_summary?.total_items_sold || 0)} items sold • ${(periodData.period_summary?.total_quantity || 0)} total quantity
                </p>
              </div>
              
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f5f5f5;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Sale #</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Time</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Medicine</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Category</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Quantity</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Unit Price</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${(periodData.medicines || []).map(medicine => `
                    <tr>
                      <td style="border: 1px solid #ddd; padding: 8px;">${medicine.sale_number}</td>
                      <td style="border: 1px solid #ddd; padding: 8px;">${new Date(medicine.sale_time).toLocaleTimeString()}</td>
                      <td style="border: 1px solid #ddd; padding: 8px; font-weight: 500;">${medicine.product_name}</td>
                      <td style="border: 1px solid #ddd; padding: 8px;">${medicine.category_name || 'N/A'}</td>
                      <td style="border: 1px solid #ddd; padding: 8px;">${medicine.quantity}</td>
                      <td style="border: 1px solid #ddd; padding: 8px;">₱${Number(medicine.unit_price || 0).toFixed(2)}</td>
                      <td style="border: 1px solid #ddd; padding: 8px; font-weight: 600;">₱${Number(medicine.total_price || 0).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}
        </div>
      `;
    } else if (reportType === 'sales_staff') {
      // Special print layout for sales_staff report
      tableContent = `
        <div style="margin-top: 20px;">
          ${paginatedReportData.map((row, index) => `
            <div style="margin-bottom: 25px; border: 1px solid #ddd; border-radius: 8px; padding: 20px; background-color: #fafafa;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                <div style="display: flex; align-items: center;">
                  <div style="width: 40px; height: 40px; background-color: #dbeafe; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                    <span style="color: #2563eb; font-weight: bold;">👤</span>
                  </div>
                  <div>
                    <h3 style="margin: 0; font-size: 18px; font-weight: bold; color: #111827;">${row.staff_name || '—'}</h3>
                    <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 14px;">${row.days_worked || 0} days worked</p>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 24px; font-weight: bold; color: #059669;">₱${Number(row.total_revenue || 0).toFixed(2)}</div>
                  <div style="font-size: 12px; color: #6b7280;">Total Revenue</div>
                </div>
              </div>
              
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; text-align: center;">
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Total Sales</div>
                  <div style="font-size: 18px; font-weight: bold; color: #111827;">${row.total_sales || 0}</div>
                </div>
                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; text-align: center;">
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Avg Sale Value</div>
                  <div style="font-size: 18px; font-weight: bold; color: #111827;">₱${Number(row.avg_sale_amount || 0).toFixed(2)}</div>
                </div>
                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; text-align: center;">
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Daily Performance</div>
                  <div style="font-size: 16px; font-weight: bold; color: #111827;">${Number(row.sales_per_day || 0).toFixed(1)} sales</div>
                  <div style="font-size: 12px; color: #6b7280;">₱${Number(row.avg_daily_revenue || 0).toFixed(2)}/day</div>
                </div>
                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; text-align: center;">
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Last Activity</div>
                  <div style="font-size: 14px; font-weight: bold; color: #111827;">
                    ${row.last_sale ? new Date(row.last_sale).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (reportType === 'expired') {
      // Special layout for expired report
      tableContent = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">PRODUCT</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">CATEGORY</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">SUPPLIERS</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">LOCATION</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">EXPIRATION RANGE</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">QTY</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">ESTIMATED LOSS (₱)</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">STATUS</th>
            </tr>
          </thead>
          <tbody>
            ${paginatedReportData.map(row => {
              // Use the expiration_status from backend instead of calculating
              const status = row.expiration_status || 'No Expiry';
              let statusColor = '#6b7280';
              if (status === 'Expired') { statusColor = '#dc2626'; }
              else if (status === 'Expiring Soon') { statusColor = '#d97706'; }
              else if (status === 'Good') { statusColor = '#059669'; }
              
              const estimatedLoss = Number(row.estimated_loss || 0);
              const hasPriced = typeof row.priced_deliveries === 'number' ? row.priced_deliveries > 0 : (row.estimated_loss > 0);
              
              // Format expiration range
              const formatExpirationRange = () => {
                if (row.earliest_expiration && row.latest_expiration) {
                  const earliest = new Date(row.earliest_expiration).toLocaleDateString('en-CA');
                  const latest = new Date(row.latest_expiration).toLocaleDateString('en-CA');
                  return earliest === latest ? earliest : `${earliest} - ${latest}`;
                }
                return '—';
              };
              
              return `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px; font-weight: 500;">${row.product_name || '—'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${row.category_name || '—'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${row.supplier_names || '—'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${row.location || '—'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${formatExpirationRange()}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${row.expired_quantity || 0}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${hasPriced ? `₱${Number(estimatedLoss).toFixed(2)}` : '—'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; color: ${statusColor}; font-weight: 600;">${status}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } else {
      // Regular table layout for other reports
      tableContent = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              ${Object.keys(reportData[0] || {}).map(key => `<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">${key.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${paginatedReportData.map(row => `
              <tr>
                ${Object.values(row).map(value => `<td style="border: 1px solid #ddd; padding: 8px;">${typeof value === 'object' ? JSON.stringify(value) : value}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    
    const periodInfo = reportType === 'sales_period' ? `<p>Period Type: ${reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)}</p>` : '';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle} - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .header h1 { margin: 0; color: #333; }
            .header p { margin: 5px 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
            .pagination-info { margin: 10px 0; font-style: italic; color: #666; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportTitle}</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Requested by: ${requestedBy}</p>
            ${periodInfo}
            <p>Date Range: ${dateRange}</p>
            <div class="pagination-info">${paginationInfo}</div>
          </div>
          ${tableContent}
          <div class="footer">
            <p>Report generated by Phoebe Pharmacy Management System</p>
            <p>Note: This report shows the current page view. Use the system to generate complete reports.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
      const res = await ManagerAPI.listBatches(product.id, token);
      if (res && res.success) setDeliveries(res.batches || []);
      await loadSuppliers();
    } catch (e) {
      setDeliveryError(e.message || 'Failed to load deliveries');
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
      
      // Find or create supplier
      let supplier_id = null;
      if (deliveryForm.supplier_name.trim()) {
        const existingSupplier = suppliers.find(s => s.name.toLowerCase() === deliveryForm.supplier_name.toLowerCase());
        if (existingSupplier) {
          supplier_id = existingSupplier.id;
        } else {
          // Create new supplier
          const newSupplier = await ManagerAPI.createSupplier({
            name: deliveryForm.supplier_name.trim(),
            contact_name: null,
            email: null,
            phone: null,
            address: null,
            lead_time_days: 7,
          }, token);
          if (newSupplier && newSupplier.success) {
            supplier_id = newSupplier.supplier.id;
            await loadSuppliers(); // Refresh suppliers list
          }
        }
      }
      
      const payload = {
        batch_number: `DEL-${Date.now()}`, // Temporary batch number for backend compatibility
        quantity: Number(deliveryForm.quantity),
        expiration_date: deliveryForm.expiration_date || null,
        delivery_date: deliveryForm.delivery_date || null,
        supplier_id: supplier_id,
        cost_price: deliveryForm.cost_price ? Number(deliveryForm.cost_price) : null,
      };
      
      if (editingDelivery) {
        // Update existing delivery
        await ManagerAPI.updateBatch(editingDelivery.id, payload, token);
        setSuccess('Delivery updated');
      } else {
        // Create new delivery
        await ManagerAPI.createBatch(deliveryTarget.id, payload, token);
        setSuccess('Delivery recorded');
      }
      
      const res = await ManagerAPI.listBatches(deliveryTarget.id, token);
      if (res && res.success) setDeliveries(res.batches || []);
      await loadProducts();
      setDeliveryForm({ quantity: '', expiration_date: '', delivery_date: '', supplier_name: '', cost_price: '' });
      setEditingDelivery(null);
      setTimeout(() => setSuccess(''), 1500);
    } catch (e) {
      setDeliveryError(e.message || 'Failed to record delivery');
    } finally {
      setDeliveriesLoading(false);
    }
  };


  const cancelEdit = () => {
    setEditingDelivery(null);
    setDeliveryForm({ quantity: '', expiration_date: '', delivery_date: '', supplier_name: '', cost_price: '' });
  };

  const startInlineEdit = (delivery) => {
    setInlineEditing(delivery.id);
    setInlineEditValues({
      quantity: String(delivery.quantity),
      expiration_date: delivery.expiration_date || '',
      delivery_date: delivery.delivery_date || '',
      supplier_name: delivery.supplier_name || '',
      cost_price: delivery.cost_price ? String(delivery.cost_price) : '',
    });
  };

  const cancelInlineEdit = () => {
    setInlineEditing(null);
    setInlineEditValues({});
  };

  const saveInlineEdit = async (delivery) => {
    if (!deliveryTarget) return;
    try {
      setDeliveriesLoading(true);
      setDeliveryError('');
      
      // Find or create supplier
      let supplier_id = null;
      if (inlineEditValues.supplier_name.trim()) {
        const existingSupplier = suppliers.find(s => s.name.toLowerCase() === inlineEditValues.supplier_name.toLowerCase());
        if (existingSupplier) {
          supplier_id = existingSupplier.id;
        } else {
          // Create new supplier
          const newSupplier = await ManagerAPI.createSupplier({
            name: inlineEditValues.supplier_name.trim(),
            contact_name: null,
            email: null,
            phone: null,
            address: null,
            lead_time_days: 7,
          }, token);
          if (newSupplier && newSupplier.success) {
            supplier_id = newSupplier.supplier.id;
            await loadSuppliers(); // Refresh suppliers list
          }
        }
      }
      
      const payload = {
        batch_number: delivery.batch_number, // Keep existing batch number
        quantity: Number(inlineEditValues.quantity),
        expiration_date: inlineEditValues.expiration_date || null,
        delivery_date: inlineEditValues.delivery_date || null,
        supplier_id: supplier_id,
        cost_price: inlineEditValues.cost_price ? Number(inlineEditValues.cost_price) : null,
      };
      
      await ManagerAPI.updateBatch(delivery.id, payload, token);
      
      const res = await ManagerAPI.listBatches(deliveryTarget.id, token);
      if (res && res.success) setDeliveries(res.batches || []);
      await loadProducts();
      setSuccess('Delivery updated');
      setInlineEditing(null);
      setInlineEditValues({});
      setTimeout(() => setSuccess(''), 1500);
    } catch (e) {
      setDeliveryError(e.message || 'Failed to update delivery');
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const removeDelivery = async (batchId) => {
    if (!deliveryTarget) return;
    if (!window.confirm('Are you sure you want to delete this delivery?')) return;
    try {
      setDeliveriesLoading(true);
      setDeliveryError('');
      await ManagerAPI.deleteBatch(batchId, token);
      const res = await ManagerAPI.listBatches(deliveryTarget.id, token);
      if (res && res.success) setDeliveries(res.batches || []);
      await loadProducts();
      setSuccess('Delivery deleted');
      setTimeout(() => setSuccess(''), 1500);
    } catch (e) {
      setDeliveryError(e.message || 'Failed to remove delivery');
    } finally {
      setDeliveriesLoading(false);
    }
  };

  // Filter deliveries based on search
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

  // Paginated deliveries
  const deliveryTotal = filteredDeliveries.length;
  const deliveryTotalPages = Math.max(1, Math.ceil(deliveryTotal / deliveryPageSize));
  const deliveryCurrentPage = Math.min(deliveryPage, deliveryTotalPages);
  const deliveryStartIndex = (deliveryCurrentPage - 1) * deliveryPageSize;
  const deliveryEndIndex = Math.min(deliveryStartIndex + deliveryPageSize, deliveryTotal);
  const paginatedDeliveries = filteredDeliveries.slice(deliveryStartIndex, deliveryEndIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setDeliveryPage(1);
  }, [deliverySearch]);

  // Pagination for reports
  const reportTotal = reportData.length;
  const reportTotalPages = Math.max(1, Math.ceil(reportTotal / reportPageSize));
  const reportCurrentPage = Math.min(reportPage, reportTotalPages);
  const reportStartIndex = (reportCurrentPage - 1) * reportPageSize;
  const reportEndIndex = Math.min(reportStartIndex + reportPageSize, reportTotal);
  const paginatedReportData = reportData.slice(reportStartIndex, reportEndIndex);
  const getCompactRangeReport = (currentPage, totalPageCount) => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPageCount, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  // Reset report page and clear data when report type changes
  useEffect(() => {
    setReportPage(1);
    setReportData([]); // Clear previous report data
  }, [reportType]);

  // Handle keyboard shortcuts for inline editing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && inlineEditing) {
        cancelInlineEdit();
      }
      if (e.key === 'Enter' && e.ctrlKey && inlineEditing) {
        const delivery = deliveries.find(d => d.id === inlineEditing);
        if (delivery) {
          saveInlineEdit(delivery);
        }
      }
    };

    if (deliveriesOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [inlineEditing, deliveries, deliveriesOpen]);

  useEffect(() => { loadProducts(); loadCategories(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusView]);
  useEffect(() => { if (token) loadRequests(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token, statusFilter]);
  useEffect(() => { if (token) loadReturns(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);
  useEffect(() => { if (token) loadStaff(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  // Reset to first page when filters/search change or products change
  useEffect(() => { setPage(1); setPageInput(''); }, [prodQuery, categoryFilter, products]);

  const openEdit = (p) => {
    setEditProduct(p);
    setEditValues({ name: p.name, unit_price: String(p.unit_price), cost_price: String(p.cost_price), category_name: p.category_name || '', location: p.location || '' });
    setEditNewCategoryName('');
    setEditOpen(true);
  };

  async function resolveCategoryIdByNameOrCreate(name) {
    if (!name) return null;
    const existing = categories.find(c => (c.name || c) === name);
    if (existing && existing.id) return existing.id;
    // Create via manager endpoint
    const created = await ManagerAPI.createCategory(name, token);
    if (created && created.category) {
      // Refresh categories list
      await loadCategories();
      return created.category.id;
    }
    return null;
  }

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editProduct) return;
    try {
      setError('');
      // Confirm before saving edits (including name changes)
      const confirmed = window.confirm('Are you sure you want to save these changes?');
      if (!confirmed) return;
      const categoryName = editNewCategoryName.trim() ? editNewCategoryName.trim() : editValues.category_name;
      const category_id = await resolveCategoryIdByNameOrCreate(categoryName);
      const payload = {
        name: editValues.name,
        unit_price: Number(editValues.unit_price),
        cost_price: Number(editValues.cost_price),
        location: editValues.location,
      };
      if (category_id) payload.category_id = Number(category_id);
      await ManagerAPI.updateProduct(editProduct.id, payload, token);
      setEditOpen(false);
      setEditProduct(null);
      await loadProducts();
      setSuccess('Product updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (e) {
      setError(e.message || 'Failed to update product');
    }
  };

  const createProduct = async (e) => {
    e.preventDefault();
    const chosenName = newCategoryName.trim() ? newCategoryName.trim() : newProduct.category_name;
    if (!newProduct.name || newProduct.unit_price === '' || newProduct.cost_price === '' || !chosenName) return;
    try {
      setCreatingProduct(true);
      setError('');
      const category_id = await resolveCategoryIdByNameOrCreate(chosenName);
      await ManagerAPI.createProduct({
        name: newProduct.name,
        unit_price: Number(newProduct.unit_price),
        cost_price: Number(newProduct.cost_price),
        category_id: Number(category_id),
        location: newProduct.location || null,
      }, token);
      setShowAddProduct(false);
      setNewProduct({ name: '', unit_price: '', cost_price: '', category_name: '', location: '' });
      setNewCategoryName('');
      await loadProducts();
      setSuccess('Product created');
      setTimeout(() => setSuccess(''), 2000);
    } catch (e) {
      setError(e.message || 'Failed to create product');
    } finally {
      setCreatingProduct(false);
    }
  };

  const deactivateProduct = async (id) => {
    try {
      setError('');
      await ManagerAPI.deactivateProduct(id, token);
      await loadProducts();
      setSuccess('Product deactivated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (e) {
      setError(e.message || 'Failed to deactivate product');
    }
  };

  const categoryNames = useMemo(() => (categories || []).map(c => c.name || c), [categories]);

  const filteredProducts = useMemo(() => {
    const q = prodQuery.trim().toLowerCase();
    return products.filter(p => {
      const matchesQuery = !q || [p.name, p.category_name, p.location].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
      const matchesCat = !categoryFilter || p.category_name === categoryFilter;
      return matchesQuery && matchesCat;
    });
  }, [prodQuery, categoryFilter, products]);

  // Pagination calculations
  const total = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const startIndex = (current - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const pagedProducts = filteredProducts.slice(startIndex, endIndex);
  const showFirstLast = totalPages > 7;

  // Clear page input when page changes externally
  useEffect(() => { setPageInput(''); }, [page]);


  const pendingCount = useMemo(() => requests.filter(r => r.status === 'pending').length, [requests]);

  // Low stock + reorder computed list
  const lowStockList = useMemo(() => {
    const q = reorderQuery.trim().toLowerCase();
    return filteredProducts
      .filter(p => {
        const matchesQ = !q || [p.name, p.category_name, p.location].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
        const matchesCat = !reorderCategory || p.category_name === reorderCategory;
        const current = Number(p.current_stock ?? 0);
        const reorderPoint = Number(p.reorder_point ?? 10);
        const isLow = current <= reorderPoint || current <= 5;
        return matchesQ && matchesCat && (!reorderOnlyLow || isLow);
      })
      .map(p => {
        const current = Number(p.current_stock ?? 0);
        const reorderPoint = Number(p.reorder_point ?? 10);
        const suggested = Math.max(0, reorderPoint * 2 - current);
        return { ...p, reorder_point: reorderPoint, suggested };
      });
  }, [filteredProducts, reorderQuery, reorderCategory, reorderOnlyLow]);

  const downloadCSV = (filename, rows) => {
    const processValue = (v) => {
      const s = String(v ?? '');
      if (s.search(/[",\n]/) >= 0) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const csv = rows.map(r => r.map(processValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    const kw = requestsSearch.trim().toLowerCase();
    return requests.filter(r => {
      const matchesKw = !kw || [r.product_name, r.requested_by_email, r.trans_type, r.status].filter(Boolean).some(v => String(v).toLowerCase().includes(kw));
      const matchesStaff = !requestsStaff || String(r.requested_by) === String(requestsStaff) || String(r.requested_by_id) === String(requestsStaff);
      const matchesStatus = !statusFilter || r.status === statusFilter;
      const created = r.created_at ? new Date(r.created_at) : null;
      const fromOk = !requestsDateFrom || (created && created >= new Date(requestsDateFrom));
      const toOk = !requestsDateTo || (created && created <= new Date(requestsDateTo + 'T23:59:59'));
      return matchesKw && matchesStaff && matchesStatus && fromOk && toOk;
    });
  }, [requests, requestsSearch, requestsStaff, requestsDateFrom, requestsDateTo]);

  // Filtered Returns
  const filteredReturns = useMemo(() => {
    const kw = returnsSearch.trim().toLowerCase();
    return returnedItems.filter(ret => {
      const matchesKw = !kw || [ret.return_number, ret.sale_number, ret.reason].filter(Boolean).some(v => String(v).toLowerCase().includes(kw)) || (ret.items || []).some(i => String(i.product_name).toLowerCase().includes(kw));
      const matchesStaff = !returnsStaff || String(ret.user_id) === String(returnsStaff) || String(ret.user_email) === String(returnsStaff);
      const created = ret.created_at ? new Date(ret.created_at) : null;
      const fromOk = !returnsDateFrom || (created && created >= new Date(returnsDateFrom));
      const toOk = !returnsDateTo || (created && created <= new Date(returnsDateTo + 'T23:59:59'));
      return matchesKw && matchesStaff && fromOk && toOk;
    });
  }, [returnedItems, returnsSearch, returnsStaff, returnsDateFrom, returnsDateTo]);

  const goToPending = () => {
    setTab('requests');
    setStatusFilter('pending');
    setTimeout(() => {
      if (requestsRef.current) requestsRef.current.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  const goToPage = (pageNum) => {
    const clamped = Math.max(1, Math.min(totalPages, Number(pageNum)));
    if (!Number.isNaN(clamped)) setPage(clamped);
  };

  const handlePageInputChange = (e) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput, 10);
    if (!Number.isNaN(pageNum)) {
      const clamped = Math.max(1, Math.min(totalPages, pageNum));
      setPage(clamped);
    }
    setPageInput('');
  };

  // Common pagination range generator (with ellipses)
  const getPaginationRange = (currentPage, totalPageCount, siblingCount = 1) => {
    const totalPageNumbers = siblingCount * 2 + 5; // first, last, current, 2 ellipses
    if (totalPageNumbers >= totalPageCount) {
      return Array.from({ length: totalPageCount }, (_, i) => i + 1);
    }
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPageCount);
    const showLeftEllipsis = leftSiblingIndex > 2;
    const showRightEllipsis = rightSiblingIndex < totalPageCount - 1;

    const firstPageIndex = 1;
    const lastPageIndex = totalPageCount;

    const range = [];
    if (!showLeftEllipsis && showRightEllipsis) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      range.push(...leftRange, '…', lastPageIndex);
    } else if (showLeftEllipsis && !showRightEllipsis) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from({ length: rightItemCount }, (_, i) => lastPageIndex - rightItemCount + 1 + i);
      range.push(firstPageIndex, '…', ...rightRange);
    } else {
      const middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
      range.push(firstPageIndex, '…', ...middleRange, '…', lastPageIndex);
    }
    return range;
  };

  // Simple compact range: show up to 5 pages around current
  const getCompactRange = (currentPage, totalPageCount) => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPageCount, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Inventory Hub</h1>
              <p className="text-indigo-100">Smart inventory management for your pharmacy</p>
            </div>
          </div>
          
          {/* Date and Time Display */}
          <div className="text-right">
            <div className="text-lg font-semibold">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <div className="text-sm text-indigo-100">
              {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit',
                hour12: true 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Compact KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {/* Total Products Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          {/* Low Stock Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-amber-600">{products.filter(p => p.current_stock <= 5).length}</p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
          
          {/* Pending Requests Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>
          
          {/* Returns Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Returns</p>
                <p className="text-2xl font-bold text-red-600">{returnedItems.length}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && !deliveriesOpen && !reportsOpen && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Compact Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-3">
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setTab('inventory')} 
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                    tab === 'inventory' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Inventory
                </button>
                
                <button 
                  onClick={() => setTab('reorder')} 
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                    tab === 'reorder' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Low Stock / Reorder
                </button>
                
                <button 
                  onClick={() => setTab('requests')} 
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                    tab === 'requests' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Requests
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center text-xs font-bold bg-amber-500 text-white rounded-full px-2 py-0.5 min-w-[20px] h-5">
                      {pendingCount}
                    </span>
                  )}
                </button>
                
                <button 
                  onClick={() => setTab('returns')} 
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                    tab === 'returns' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  Returns
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                {tab === 'inventory' && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setStatusView('active')} 
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        statusView === 'active' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Active
                    </button>
                    <button 
                      onClick={() => setStatusView('inactive')} 
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        statusView === 'inactive' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Inactive
                    </button>
                    <button 
                      onClick={() => setStatusView('all')} 
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        statusView === 'all' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      All
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Inventory Tab */}
      {tab === 'inventory' && (
        <>
          {/* Compact Inventory Controls */}
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 mb-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Products</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    value={prodQuery} 
                    onChange={(e) => setProdQuery(e.target.value)} 
                    placeholder="Search inventory..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    ref={prodSearchRef} 
                  />
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <div className="relative">
                  <select 
                    value={categoryFilter} 
                    onChange={(e) => setCategoryFilter(e.target.value)} 
                    className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">All Categories</option>
                    {categoryNames.filter(Boolean).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Items per page</label>
                <div className="relative">
                  <select 
                    value={pageSize} 
                    onChange={(e) => setPageSize(Number(e.target.value))} 
                    className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Compact Inventory List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Product Inventory</h2>
                <p className="text-sm text-gray-600">Manage your pharmacy products and stock levels</p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setReportsOpen(true)}
                  aria-label="Open Reports (Ctrl+P)"
                  className={`relative px-3 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${reportsOpen ? 'bg-indigo-700 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Reports
                  {/* Keyboard hint */}
                  <span className="hidden sm:inline-flex items-center ml-1 px-1.5 py-0.5 text-[10px] leading-none rounded bg-indigo-800/70 text-white/90">Ctrl+P</span>
                  {/* Result count badge when data exists */}
                  {reportData.length > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center text-[10px] font-bold bg-amber-500 text-white rounded-full min-w-[18px] h-[18px] px-1">
                      {reportData.length > 99 ? '99+' : reportData.length}
                    </span>
                  )}
                </button>
                {isManager && (
                  <button 
                    onClick={() => setShowAddProduct(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Product
                  </button>
                )}
              </div>
            </div>
            <div className="p-4">
              {pagedProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No products found</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-2 pr-3">Product</th>
                          <th className="py-2 pr-3">Category</th>
                          <th className="py-2 pr-3">Location</th>
                          <th className="py-2 pr-3">Unit Price</th>
                          <th className="py-2 pr-3">Current Stock</th>
                          {isManager && <th className="py-2 pr-3 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {pagedProducts.map(p => (
                          <tr key={p.id} className="border-top border-gray-100 hover:bg-indigo-50/40 transition-colors">
                            <td className="py-2 pr-3">
                              <button 
                                onClick={() => openDeliveries(p)} 
                                className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline text-left"
                              >
                                {p.name}
                              </button>
                            </td>
                            <td className="py-2 pr-3">{p.category_name || '—'}</td>
                            <td className="py-2 pr-3">{p.location || '—'}</td>
                            <td className="py-2 pr-3">₱{parseFloat(p.unit_price).toFixed(2)}</td>
                            <td className="py-2 pr-3">
                              <span className="font-semibold">{p.current_stock}</span>
                              {p.current_stock <= 5 && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Low</span>
                              )}
                            </td>
                            {isManager && (
                              <td className="py-2 pr-0">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => openDeliveries(p)} className="px-2 py-1 border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50 flex items-center gap-1 text-xs"><Layers className="w-3 h-3" />Deliveries</button>
                                  {statusView !== 'inactive' ? (
                                    <>
                                      <button onClick={() => openEdit(p)} className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1 text-xs"><Pencil className="w-3 h-3" />Edit</button>
                                      <button onClick={() => deactivateProduct(p.id)} className="px-2 py-1 border border-rose-300 text-rose-600 rounded hover:bg-rose-50 flex items-center gap-1 text-xs"><Trash2 className="w-3 h-3" />Deactivate</button>
                                    </>
                                  ) : (
                                    <>
                                      <button onClick={() => ManagerAPI.reactivateProduct(p.id, token).then(()=>{setSuccess('Reactivated'); setTimeout(()=>setSuccess(''),1500); loadProducts();}).catch(e=>setError(e.message||'Failed to reactivate'))} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Reactivate</button>
                                      <button onClick={() => ManagerAPI.hardDeleteProduct(p.id, token).then(()=>{setSuccess('Deleted'); setTimeout(()=>setSuccess(''),1500); loadProducts();}).catch(e=>setError(e.message||'Failed to delete'))} className="px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700">Delete</button>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between mt-4">
                    {/* Left: Total */}
                    <div className="text-sm text-gray-700">Total Items: <span className="font-semibold">{total}</span></div>
                    {/* Center: Compact paginator */}
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
                      <button
                        aria-label="Previous page"
                        onClick={() => goToPage(current - 1)}
                        disabled={current === 1}
                        className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-sm ${current === 1 ? 'opacity-40 cursor-not-allowed text-gray-400' : 'hover:bg-gray-50 text-gray-700'}`}
                        title="Previous"
                      >
                        ‹
                      </button>
                      {getCompactRange(current, totalPages).map((num) => (
                        <button
                          key={num}
                          onClick={() => goToPage(num)}
                          className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-sm font-medium ${
                            num === current ? 'bg-indigo-600 text-white shadow-sm' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        aria-label="Next page"
                        onClick={() => goToPage(current + 1)}
                        disabled={current === totalPages}
                        className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-sm ${current === totalPages ? 'opacity-40 cursor-not-allowed text-gray-400' : 'hover:bg-gray-50 text-gray-700'}`}
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
                          max={totalPages}
                          value={pageInput}
                          onChange={handlePageInputChange}
                          placeholder={`${current}`}
                          className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center"
                        />
                        <span className="text-sm text-gray-600">of {totalPages}</span>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-xs font-medium"
                        >
                          Go
                        </button>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Reorder Tab */}
      {tab === 'reorder' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Low Stock & Reorder Planner</h2>
            <div className="text-sm text-gray-600">Items: {lowStockList.length}</div>
          </div>
          <div className="p-4">
            {/* Filters */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <input value={reorderQuery} onChange={(e)=>setReorderQuery(e.target.value)} placeholder="Search products" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                <div className="relative">
                  <select value={reorderCategory} onChange={(e)=>setReorderCategory(e.target.value)} className="w-full appearance-none px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-8">
                    <option value="">All Categories</option>
                    {categoryNames.filter(Boolean).map(c => (<option key={c} value={c}>{c}</option>))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <label className="inline-flex items-center gap-2 px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white">
                  <input type="checkbox" checked={reorderOnlyLow} onChange={(e)=>setReorderOnlyLow(e.target.checked)} />
                  Only low stock
                </label>
                <div className="flex gap-2 col-span-1 sm:col-span-2 lg:col-span-2 justify-end">
                  <button onClick={()=>{setReorderQuery(''); setReorderCategory(''); setReorderOnlyLow(true); setReorderPlan({});}} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Clear</button>
                  <button onClick={()=>{
                    const today = new Date().toLocaleString();
                    const list = lowStockList;
                    const printWindow = window.open('', '_blank');
                    const rows = list.map(p => `<tr>
                      <td>${p.name||''}</td>
                      <td>${p.category_name||''}</td>
                      <td style='text-align:right;'>${p.current_stock??0}</td>
                      <td style='text-align:right;'>${reorderPlan[p.id] ?? p.suggested}</td>
                    </tr>`).join('');
                    const html = `<html><head><title>Reorder Planner</title><style>body{font-family:Arial;margin:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px} th{background:#f5f5f5}</style></head><body><h2>Low Stock & Reorder Planner</h2><p>Generated: ${today}</p><table><thead><tr><th>Product</th><th>Category</th><th>Current Stock</th><th>Order Qty</th></tr></thead><tbody>${rows||'<tr><td colspan=4 style="text-align:center;color:#666;">No items</td></tr>'}</tbody></table></body></html>`;
                    printWindow.document.write(html); printWindow.document.close(); printWindow.print();
                  }} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Print</button>
                  <button onClick={()=>{
                    const header = ['Product','Category','Current Stock','Order Qty'];
                    const body = lowStockList.map(p => [p.name||'', p.category_name||'', p.current_stock??0, (reorderPlan[p.id] ?? p.suggested)]);
                    downloadCSV(`reorder_${new Date().toISOString().slice(0,10)}.csv`, [header, ...body]);
                  }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Export CSV</button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 bg-gray-50">
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Current Stock</th>
                    <th className="py-2 px-3">Order Qty</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockList.map(p => (
                    <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-900">{p.name}</td>
                      <td className="py-2 px-3 text-gray-700">{p.category_name||'—'}</td>
                      <td className="py-2 px-3 text-gray-900">{p.current_stock??0}</td>
                      <td className="py-2 px-3">
                        <input type="number" min={0} value={reorderPlan[p.id] ?? p.suggested} onChange={(e)=>setReorderPlan(plan=>({...plan,[p.id]: Number(e.target.value)}))} className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm" />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button onClick={()=>setReorderPlan(plan=>{ const cp={...plan}; delete cp[p.id]; return cp; })} className="px-2 py-1 border border-rose-300 text-rose-600 rounded-md hover:bg-rose-50 text-xs">Remove</button>
                      </td>
                    </tr>
                  ))}
                  {lowStockList.length===0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">No items match your filters</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Requests Tab */}
      {tab === 'requests' && (
        <div ref={requestsRef} className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Inventory Requests</h2>
          </div>
          <div className="p-6">
            {/* Responsive Filters */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <input value={requestsSearch} onChange={(e)=>setRequestsSearch(e.target.value)} placeholder="Search keyword" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                <div className="relative">
                  <select value={requestsStaff} onChange={(e)=>setRequestsStaff(e.target.value)} className="w-full appearance-none px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-8">
                    <option value="">All Staff</option>
                    {staffList.map(s=> (<option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <input type="date" value={requestsDateFrom} onChange={(e)=>setRequestsDateFrom(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                <input type="date" value={requestsDateTo} onChange={(e)=>setRequestsDateTo(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                <div className="relative">
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full appearance-none px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-8">
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>{setRequestsSearch(''); setRequestsStaff(''); setRequestsDateFrom(''); setRequestsDateTo(''); setStatusFilter('');}} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Clear</button>
                  <button onClick={()=>{
                    const printWindow = window.open('', '_blank');
                    const filters = `Keyword: ${requestsSearch||'—'} | Staff: ${requestsStaff? (staffList.find(s=>String(s.id)===String(requestsStaff))?.first_name+' '+staffList.find(s=>String(s.id)===String(requestsStaff))?.last_name):'All'} | ${requestsDateFrom||'—'} to ${requestsDateTo||'—'} | Status: ${statusFilter||'All'}`;
                    const rows = (filteredRequests.length?filteredRequests:requests).map(r=>{
                      const name = ((r.requested_by_first_name||'') + ' ' + (r.requested_by_last_name||'')).trim() || (r.requested_by_email||r.requested_by||'');
                      return `<tr><td>${r.product_name||''}</td><td>${r.quantity_change||''}</td><td>${r.status||''}</td><td>${name}</td><td>${r.created_at?new Date(r.created_at).toLocaleString():''}</td></tr>`;
                    }).join('');
                    const html = `<html><head><title>Requests</title><style>body{font-family:Arial;margin:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background:#f5f5f5}</style></head><body><h2>Inventory Requests</h2><p>${filters}</p><table><thead><tr><th>Product</th><th>Qty Change</th><th>Status</th><th>Requested By</th><th>Created</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
                    printWindow.document.write(html); printWindow.document.close(); printWindow.print();
                  }} className="w-full px-2 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Print</button>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading requests...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                No requests found
              </div>
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
                        <td className="py-3 pr-0">
                          <div className="flex items-center justify-end gap-2">
                            {(user && (user.role === 'manager' || user.role === 'admin') && r.status === 'pending') && (
                              <>
                                <button onClick={() => InventoryAPI.approveRequest(r.id, token).then(() => { setSuccess('Approved'); setTimeout(() => setSuccess(''), 1500); loadRequests(); loadProducts(); }).catch(e => setError(e.message || 'Failed to approve'))} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">Approve</button>
                                <button onClick={() => InventoryAPI.rejectRequest(r.id, token).then(() => { setSuccess('Rejected'); setTimeout(() => setSuccess(''), 1500); loadRequests(); }).catch(e => setError(e.message || 'Failed to reject'))} className="px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors">Reject</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <div className="text-lg font-semibold text-gray-900 mb-4">Create Product</div>
            <form onSubmit={createProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={newProduct.name} onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                  <input type="number" min={0} step="0.01" value={newProduct.unit_price} onChange={(e) => setNewProduct(p => ({ ...p, unit_price: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                  <input type="number" min={0} step="0.01" value={newProduct.cost_price} onChange={(e) => setNewProduct(p => ({ ...p, cost_price: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <select
                      value={newProduct.category_name}
                      onChange={(e) => setNewProduct(p => ({ ...p, category_name: e.target.value }))}
                      className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      {categoryNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <p className="text-xs text-gray-500 mt-1">Choose an existing category</p>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Or add new category"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">If filled, a new category will be created</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input value={newProduct.location} onChange={(e) => setNewProduct(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Aisle 3, Shelf B" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddProduct(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={creatingProduct} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                  {creatingProduct && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editOpen && editProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <div className="text-lg font-semibold text-gray-900 mb-4">Edit Product</div>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={editValues.name} onChange={(e) => setEditValues(v => ({ ...v, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                  <input type="number" min={0} step="0.01" value={editValues.unit_price} onChange={(e) => setEditValues(v => ({ ...v, unit_price: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                  <input type="number" min={0} step="0.01" value={editValues.cost_price} onChange={(e) => setEditValues(v => ({ ...v, cost_price: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <div className="relative">
                  <select value={editValues.category_name} onChange={(e) => setEditValues(v => ({ ...v, category_name: e.target.value }))} className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required>
                    <option value="">Select category</option>
                    {categoryNames.filter(Boolean).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    <option value="">Add New Category</option>
                  </select>
                  {editValues.category_name === "" && (
                    <input
                      type="text"
                      value={editNewCategoryName}
                      onChange={(e) => setEditNewCategoryName(e.target.value)}
                      placeholder="Enter new category name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500 mt-1">We can switch to a category dropdown once category IDs are available from an endpoint.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input value={editValues.location} onChange={(e) => setEditValues(v => ({ ...v, location: e.target.value }))} placeholder="e.g. Aisle 3, Shelf B" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setEditOpen(false); setEditProduct(null); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Returns Tab */}
      {tab === 'returns' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Returned Items</h2>
            <div className="text-sm text-gray-600">
              Total: {returnedItems.length} returns • 
              Refunded: ₱{returnedItems.reduce((sum, ret) => sum + ret.total_refund_amount, 0).toFixed(2)}
            </div>
          </div>
          <div className="p-6">
            {/* Returns Filters - always visible */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <input value={returnsSearch} onChange={(e)=>setReturnsSearch(e.target.value)} placeholder="Search keyword" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                <div className="relative">
                  <select value={returnsStaff} onChange={(e)=>setReturnsStaff(e.target.value)} className="w-full appearance-none px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-8">
                    <option value="">All Staff</option>
                    {staffList.map(s=> (<option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <input type="date" value={returnsDateFrom} onChange={(e)=>setReturnsDateFrom(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                <input type="date" value={returnsDateTo} onChange={(e)=>setReturnsDateTo(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                <button onClick={()=>{setReturnsSearch(''); setReturnsStaff(''); setReturnsDateFrom(''); setReturnsDateTo('');}} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Clear</button>
                <button onClick={()=>{
                  const list = filteredReturns;
                  const printWindow = window.open('', '_blank');
                  const filters = `Keyword: ${returnsSearch||'—'} | Staff: ${returnsStaff? (staffList.find(s=>String(s.id)===String(returnsStaff))?.first_name+' '+staffList.find(s=>String(s.id)===String(returnsStaff))?.last_name):'All'} | ${returnsDateFrom||'—'} to ${returnsDateTo||'—'}`;
                  const rows = list.map(ret=>`<tr><td>${ret.return_number}</td><td>${ret.sale_number}</td><td>${ret.item_count||0}</td><td>₱${(ret.total_refund_amount||0).toFixed? ret.total_refund_amount.toFixed(2) : Number(ret.total_refund_amount||0).toFixed(2)}</td><td>${ret.reason||''}</td><td>${ret.created_at?new Date(ret.created_at).toLocaleString():''}</td></tr>`).join('');
                  const html = `<html><head><title>Returns</title><style>body{font-family:Arial;margin:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background:#f5f5f5}</style></head><body><h2>Returned Items</h2><p>${filters}</p><table><thead><tr><th>Return #</th><th>Sale #</th><th>Items</th><th>Total Refund</th><th>Reason</th><th>Created</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
                  printWindow.document.write(html); printWindow.document.close(); printWindow.print();
                }} className="w-full px-2 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Print</button>
              </div>
            </div>
            {loadingReturns ? (
              <div className="text-center py-12 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading returns...
              </div>
            ) : (filteredReturns.length === 0) ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                No returns found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReturns.map(returnItem => (
                  <div key={returnItem.id} className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{returnItem.return_number}</h4>
                          <p className="text-sm text-gray-600">
                            Sale: {returnItem.sale_number} • {returnItem.item_count} items
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-xl font-bold text-orange-600">₱{returnItem.total_refund_amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-600 capitalize">{returnItem.reason.replace('_', ' ')}</p>
                        {returnItem.processed_by_name && (
                          <p className="text-xs text-gray-500">Processed by: <span className="font-medium text-gray-700">{returnItem.processed_by_name}</span>{returnItem.updated_at ? ` • ${new Date(returnItem.updated_at).toLocaleString()}` : ''}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <span className="text-sm text-gray-600">Returned on: </span>
                      <span className="font-semibold text-gray-900">{new Date(returnItem.created_at).toLocaleString()}</span>
                    </div>
                    
                    {returnItem.items && returnItem.items.length > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-orange-200">
                        <h5 className="font-medium text-gray-900 mb-2">Returned Items:</h5>
                        <div className="space-y-2">
                          {returnItem.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <div>
                                <span className="font-medium">{item.product_name}</span>
                                <span className="text-gray-500 ml-2">x{item.quantity}</span>
                              </div>
                              <div className="text-orange-600 font-semibold">
                                ₱{item.total_refund.toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-end gap-2">
                      {(user && (user.role === 'manager' || user.role === 'admin')) && (
                        <button onClick={()=>deleteReturn(returnItem.id)} className="px-3 py-1.5 bg-rose-600 text-white rounded-md hover:bg-rose-700 text-sm">Delete Return</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deliveries Modal */}
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
                <div className="text-sm">
                  <strong className="font-semibold">Error:</strong> {deliveryError}
                </div>
                <button onClick={() => setDeliveryError('')} className="text-sm font-medium text-red-700 hover:underline">Dismiss</button>
              </div>
            )}

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                <input 
                  type="text"
                  value={deliverySearch}
                  onChange={(e) => setDeliverySearch(e.target.value)}
                  placeholder="Search deliveries by supplier, date, quantity, or cost..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  ref={deliverySearchRef}
                />
              </div>
            </div>

            {/* Add/Edit Delivery Form */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                {editingDelivery ? 'Edit Delivery' : 'Add New Delivery'}
              </h3>
              <form onSubmit={submitDelivery} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                  <input 
                    type="number" 
                    min={1} 
                    value={deliveryForm.quantity} 
                    onChange={(e)=>setDeliveryForm(f=>({...f,quantity:e.target.value}))} 
                    placeholder="Enter quantity" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Expiration Date</label>
                  <input 
                    type="date" 
                    value={deliveryForm.expiration_date} 
                    onChange={(e)=>setDeliveryForm(f=>({...f,expiration_date:e.target.value}))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Date</label>
                  <input 
                    type="date" 
                    value={deliveryForm.delivery_date} 
                    onChange={(e)=>setDeliveryForm(f=>({...f,delivery_date:e.target.value}))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Supplier Name</label>
                  <input 
                    type="text"
                    value={deliveryForm.supplier_name} 
                    onChange={(e)=>setDeliveryForm(f=>({...f,supplier_name:e.target.value}))} 
                    placeholder="Enter supplier name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Will create new supplier if not found</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cost Price</label>
                  <input 
                    type="number" 
                    min={0} 
                    step="0.01" 
                    value={deliveryForm.cost_price} 
                    onChange={(e)=>setDeliveryForm(f=>({...f,cost_price:e.target.value}))} 
                    placeholder="₱0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  />
                </div>
              </form>
              <div className="flex items-center gap-2 mt-4">
                <button 
                  type="submit" 
                  onClick={submitDelivery}
                  disabled={deliveriesLoading} 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  {deliveriesLoading && <Loader2 className="w-4 h-4 animate-spin"/>}
                  {editingDelivery ? 'Update Delivery' : 'Add Delivery'}
                </button>
                {editingDelivery && (
                  <button 
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {/* Deliveries Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">
                    {deliveryTotal} delivery{deliveryTotal !== 1 ? 'ies' : ''} found
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Per page:</label>
                    <select 
                      value={deliveryPageSize} 
                      onChange={(e) => {
                        setDeliveryPageSize(Number(e.target.value));
                        setDeliveryPage(1);
                      }}
                      className="text-xs px-2 py-1 border border-gray-300 rounded"
                    >
                      {[5, 10, 20, 50].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-gray-500">
                    💡 <strong>Tip:</strong> Click Edit to modify directly in table • <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Esc</kbd> to cancel • <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+Enter</kbd> to save
                  </div>
                </div>
                {deliverySearch && (
                  <button 
                    onClick={() => setDeliverySearch('')}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    Clear search
                  </button>
                )}
              </div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 bg-gray-50">
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Expiration Date</th>
                    <th className="py-3 px-4">Delivery Date</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Cost Price</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDeliveries.map(delivery => {
                    const isEditing = inlineEditing === delivery.id;
                    
                    return (
                      <tr key={delivery.id} className={`border-t border-gray-100 hover:bg-gray-50 ${isEditing ? 'bg-blue-50' : ''}`}>
                        {/* Quantity */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input 
                              type="number" 
                              min={1}
                              value={inlineEditValues.quantity} 
                              onChange={(e) => setInlineEditValues(v => ({...v, quantity: e.target.value}))}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          ) : (
                            <span className="font-medium">{delivery.quantity}</span>
                          )}
                        </td>
                        
                        {/* Expiration Date */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input 
                              type="date" 
                              value={inlineEditValues.expiration_date} 
                              onChange={(e) => setInlineEditValues(v => ({...v, expiration_date: e.target.value}))}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          ) : (
                            delivery.expiration_date ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                new Date(delivery.expiration_date) < new Date() 
                                  ? 'bg-red-100 text-red-700' 
                                  : new Date(delivery.expiration_date) < new Date(Date.now() + 30*24*60*60*1000)
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {new Date(delivery.expiration_date).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )
                          )}
                        </td>
                        
                        {/* Delivery Date */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input 
                              type="date" 
                              value={inlineEditValues.delivery_date} 
                              onChange={(e) => setInlineEditValues(v => ({...v, delivery_date: e.target.value}))}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          ) : (
                            delivery.delivery_date ? new Date(delivery.delivery_date).toLocaleDateString() : '—'
                          )}
                        </td>
                        
                        {/* Supplier */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input 
                              type="text"
                              value={inlineEditValues.supplier_name} 
                              onChange={(e) => setInlineEditValues(v => ({...v, supplier_name: e.target.value}))}
                              placeholder="Supplier name"
                              className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          ) : (
                            delivery.supplier_name ? (
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-gray-400"/>
                                {delivery.supplier_name}
                              </div>
                            ) : '—'
                          )}
                        </td>
                        
                        {/* Cost Price */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input 
                              type="number" 
                              min={0} 
                              step="0.01"
                              value={inlineEditValues.cost_price} 
                              onChange={(e) => setInlineEditValues(v => ({...v, cost_price: e.target.value}))}
                              placeholder="₱0.00"
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          ) : (
                            delivery.cost_price ? `₱${Number(delivery.cost_price).toFixed(2)}` : '—'
                          )}
                        </td>
                        
                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <button 
                                  onClick={() => saveInlineEdit(delivery)} 
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                                  disabled={deliveriesLoading}
                                >
                                  <CheckCircle className="w-3 h-3"/>
                                  Save
                                </button>
                                <button 
                                  onClick={cancelInlineEdit}
                                  className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => startInlineEdit(delivery)} 
                                  className="px-3 py-1.5 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 flex items-center gap-1"
                                >
                                  <Pencil className="w-3 h-3"/>
                                  Edit
                                </button>
                                <button 
                                  onClick={() => removeDelivery(delivery.id)} 
                                  className="px-3 py-1.5 border border-rose-300 text-rose-600 rounded-lg hover:bg-rose-50 flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3"/>
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {(!paginatedDeliveries || paginatedDeliveries.length === 0) && (
                    <tr>
                      <td className="py-8 px-4 text-center text-gray-500" colSpan={6}>
                        {deliveriesLoading ? 'Loading deliveries…' : 
                         deliverySearch ? 'No deliveries match your search' : 'No deliveries recorded yet'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {/* Pagination Controls */}
              {deliveryTotal > deliveryPageSize && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">Showing <span className="font-semibold">{deliveryStartIndex + 1}-{deliveryEndIndex}</span> of <span className="font-semibold">{deliveryTotal}</span> deliveries</div>
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
                    <button
                      aria-label="Previous page"
                      onClick={() => setDeliveryPage(p => Math.max(1, p - 1))}
                      disabled={deliveryCurrentPage === 1}
                      className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-sm ${deliveryCurrentPage === 1 ? 'opacity-40 cursor-not-allowed text-gray-400' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      ‹
                    </button>
                    {Array.from({ length: Math.min(5, deliveryTotalPages) }, (_, i) => {
                      const start = Math.max(1, deliveryCurrentPage - 2);
                      const pageNum = Math.min(deliveryTotalPages, start + i);
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setDeliveryPage(pageNum)}
                          className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-sm font-medium ${deliveryCurrentPage === pageNum ? 'bg-indigo-600 text-white shadow-sm' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      aria-label="Next page"
                      onClick={() => setDeliveryPage(p => Math.min(deliveryTotalPages, p + 1))}
                      disabled={deliveryCurrentPage === deliveryTotalPages}
                      className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-sm ${deliveryCurrentPage === deliveryTotalPages ? 'opacity-40 cursor-not-allowed text-gray-400' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      ›
                    </button>
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
            </div>
          </div>
        </div>
      )}

      {/* Reports Modal */}
      {reportsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5"/>
                Inventory Reports
              </div>
              <button 
                onClick={() => setReportsOpen(false)} 
                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            {reportError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 flex items-start justify-between gap-4">
                <div className="text-sm">
                  <strong className="font-semibold">Error:</strong> {reportError}
                </div>
                <button onClick={() => setReportError('')} className="text-sm font-medium text-red-700 hover:underline">Dismiss</button>
              </div>
            )}

            {/* Report Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => setReportType('stock')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  reportType === 'stock' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    reportType === 'stock' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Package className={`w-5 h-5 ${reportType === 'stock' ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Current Stock</h3>
                    <p className="text-sm text-gray-600">All products with quantities</p>
                  </div>
                </div>
              </button>


              <button
                onClick={() => setReportType('expired')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  reportType === 'expired' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    reportType === 'expired' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <AlertCircle className={`w-5 h-5 ${reportType === 'expired' ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Expired Products</h3>
                    <p className="text-sm text-gray-600">Items past expiration date</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setReportType('sales_staff')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  reportType === 'sales_staff' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    reportType === 'sales_staff' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Users className={`w-5 h-5 ${reportType === 'sales_staff' ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Sales by Staff</h3>
                    <p className="text-sm text-gray-600">Performance per employee</p>
                  </div>
                </div>
              </button>



              <button
                onClick={() => setReportType('sales_period')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  reportType === 'sales_period' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    reportType === 'sales_period' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <BarChart3 className={`w-5 h-5 ${reportType === 'sales_period' ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Sales by Period</h3>
                    <p className="text-sm text-gray-600">Daily/Weekly/Monthly sales with all medicines</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Report Parameters */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Report Parameters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(reportType === 'sales_staff' || reportType === 'sales_period') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                    <select 
                      value={reportStaffId} 
                      onChange={(e) => setReportStaffId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={reportType === 'sales_period'}
                    >
                      <option value="">{reportType === 'sales_period' ? 'Select Staff Member' : 'All Staff'}</option>
                      {staffList.map(staff => (
                        <option key={staff.id} value={staff.id}>{staff.first_name} {staff.last_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {reportType === 'sales_period' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                    <select 
                      value={reportPeriod} 
                      onChange={(e) => setReportPeriod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="day">Daily</option>
                      <option value="week">Weekly</option>
                      <option value="month">Monthly</option>
                    </select>
                  </div>
                )}
                
                {(reportType === 'sales_staff' || reportType === 'sales_period') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                      <input 
                        type="date" 
                        value={reportDateFrom} 
                        onChange={(e) => setReportDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                      <input 
                        type="date" 
                        value={reportDateTo} 
                        onChange={(e) => setReportDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}
                {reportType === 'expired' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select 
                        value={reportExpiredStatus} 
                        onChange={(e) => setReportExpiredStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">Expired + Expiring Soon</option>
                        <option value="expired">Expired Only</option>
                        <option value="expiring">Expiring Soon Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select 
                        value={reportCategoryId}
                        onChange={(e) => setReportCategoryId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All Categories</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                
                {reportType === 'stock' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
                      <select 
                        value={reportStockStatus} 
                        onChange={(e) => setReportStockStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Stock Levels</option>
                        <option value="in_stock">In Stock</option>
                        <option value="low_stock">Low Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select 
                        value={reportCategoryId}
                        onChange={(e) => setReportCategoryId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All Categories</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                
              </div>
              
              <div className="flex items-center gap-3 mt-4">
                <button 
                  onClick={generateReport}
                  disabled={reportLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {reportLoading && <Loader2 className="w-4 h-4 animate-spin"/>}
                  <FileText className="w-4 h-4"/>
                  Generate Report
                </button>
                
                {reportData.length > 0 && (
                  <button 
                    onClick={printReport}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4"/>
                    Print Report
                  </button>
                )}
              </div>
            </div>

            {/* Report Results */}
            {reportData.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div>
                      <h3 className="font-semibold text-gray-900">
                        {reportType === 'stock' && 'Current Stock Report'}
                        {reportType === 'expired' && 'Expired Products Report'}
                        {reportType === 'sales_staff' && 'Sales Report by Staff'}
                        {reportType === 'sales_period' && 'Sales Report by Period'}
                      </h3>
                    <p className="text-sm text-gray-600">{reportTotal} records found</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Per page:</label>
                    <select 
                      value={reportPageSize} 
                      onChange={(e) => {
                        setReportPageSize(Number(e.target.value));
                        setReportPage(1);
                      }}
                      className="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {[5, 10, 20, 50, 100].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {reportType === 'sales_period' ? (
                  // Special layout for sales_period report
                  <div className="space-y-6 p-4">
                    {paginatedReportData.map((periodData, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Period Header */}
                        <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {reportPeriod === 'day' ? new Date(periodData.period_date).toLocaleDateString() :
                                 reportPeriod === 'week' ? `Week of ${new Date(periodData.period_date).toLocaleDateString()}` :
                                 new Date(periodData.period_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {(periodData.period_summary?.total_sales || 0)} sales • ₱{Number(periodData.period_summary?.period_revenue || 0).toFixed(2)} revenue
                              </p>
                            </div>
                            <div className="text-right text-sm text-gray-600">
                              <div>{(periodData.period_summary?.total_items_sold || 0)} items sold</div>
                              <div>{(periodData.period_summary?.total_quantity || 0)} total quantity</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Medicines Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale #</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicine</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(periodData.medicines || []).map((medicine, medIndex) => (
                                <tr key={medIndex} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm text-gray-900">{medicine.sale_number}</td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {new Date(medicine.sale_time).toLocaleTimeString()}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{medicine.product_name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-600">{medicine.category_name || 'N/A'}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{medicine.quantity}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">₱{Number(medicine.unit_price || 0).toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">₱{Number(medicine.total_price || 0).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Regular table layout for other reports
                  <div className="overflow-x-auto">
                    {reportType === 'expired' ? (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600 bg-gray-50">
                            <th className="py-3 px-4 font-semibold">PRODUCT</th>
                            <th className="py-3 px-4 font-semibold">CATEGORY</th>
                            <th className="py-3 px-4 font-semibold">SUPPLIERS</th>
                            <th className="py-3 px-4 font-semibold">LOCATION</th>
                            <th className="py-3 px-4 font-semibold">EXPIRATION RANGE</th>
                            <th className="py-3 px-4 font-semibold">QTY</th>
                            <th className="py-3 px-4 font-semibold">ESTIMATED LOSS (₱)</th>
                            <th className="py-3 px-4 font-semibold">STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedReportData.map((row, index) => {
                            // Use the expiration_status from backend instead of calculating
                            const status = row.expiration_status || 'No Expiry';
                            let badgeClass = 'bg-slate-100 text-slate-700';
                            if (status === 'Expired') { badgeClass = 'bg-rose-50 text-rose-700 border border-rose-200'; }
                            else if (status === 'Expiring Soon') { badgeClass = 'bg-amber-50 text-amber-700 border border-amber-200'; }
                            else if (status === 'Good') { badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200'; }
                            
                            const estimatedLoss = Number(row.estimated_loss || 0);
                            const hasPriced = typeof row.priced_deliveries === 'number' ? row.priced_deliveries > 0 : (row.estimated_loss > 0);
                            
                            // Format expiration range
                            const formatExpirationRange = () => {
                              if (row.earliest_expiration && row.latest_expiration) {
                                const earliest = new Date(row.earliest_expiration).toLocaleDateString('en-CA');
                                const latest = new Date(row.latest_expiration).toLocaleDateString('en-CA');
                                return earliest === latest ? earliest : `${earliest} - ${latest}`;
                              }
                              return '—';
                            };
                            
                            return (
                              <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium text-gray-900">{row.product_name || row.name || '—'}</td>
                                <td className="py-3 px-4 text-gray-700">{row.category_name || row.category || '—'}</td>
                                <td className="py-3 px-4 text-gray-700">{row.supplier_names || '—'}</td>
                                <td className="py-3 px-4 text-gray-700">{row.location || '—'}</td>
                                <td className="py-3 px-4 text-gray-700">{formatExpirationRange()}</td>
                                <td className="py-3 px-4 text-gray-900">{row.expired_quantity ?? row.quantity ?? 0}</td>
                                <td className="py-3 px-4 text-gray-900">{hasPriced ? `₱${Number(estimatedLoss).toFixed(2)}` : '—'}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                                    {status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : reportType === 'stock' ? (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600 bg-gray-50">
                            <th className="py-3 px-4 font-semibold">PRODUCT</th>
                            <th className="py-3 px-4 font-semibold">CATEGORY</th>
                            <th className="py-3 px-4 font-semibold">CURRENT STOCK</th>
                            <th className="py-3 px-4 font-semibold">REORDER POINT</th>
                            <th className="py-3 px-4 font-semibold">UNIT PRICE</th>
                            <th className="py-3 px-4 font-semibold">LOCATION</th>
                            <th className="py-3 px-4 font-semibold">STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedReportData.map((row, index) => {
                            const status = row.stock_status || 'In Stock';
                            let badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                            if (status === 'Out of Stock') { badgeClass = 'bg-rose-50 text-rose-700 border border-rose-200'; }
                            else if (status === 'Low Stock') { badgeClass = 'bg-amber-50 text-amber-700 border border-amber-200'; }
                            
                            return (
                              <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium text-gray-900">{row.product_name || '—'}</td>
                                <td className="py-3 px-4 text-gray-700">{row.category_name || '—'}</td>
                                <td className="py-3 px-4 text-gray-900">{row.current_stock || 0}</td>
                                <td className="py-3 px-4 text-gray-700">{row.reorder_point || 10}</td>
                                <td className="py-3 px-4 text-gray-900">₱{Number(row.unit_price || 0).toFixed(2)}</td>
                                <td className="py-3 px-4 text-gray-700">{row.location || '—'}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                                    {status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : reportType === 'sales_staff' ? (
                      <div className="space-y-4">
                        {paginatedReportData.map((row, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Users className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">{row.staff_name || '—'}</h3>
                                  <p className="text-sm text-gray-600">{row.days_worked || 0} days worked</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-green-600">₱{Number(row.total_revenue || 0).toFixed(2)}</div>
                                <div className="text-sm text-gray-600">Total Revenue</div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-sm text-gray-600">Total Sales</div>
                                <div className="text-xl font-semibold text-gray-900">{row.total_sales || 0}</div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-sm text-gray-600">Avg Sale Value</div>
                                <div className="text-xl font-semibold text-gray-900">₱{Number(row.avg_sale_amount || 0).toFixed(2)}</div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-sm text-gray-600">Daily Performance</div>
                                <div className="text-xl font-semibold text-gray-900">{Number(row.sales_per_day || 0).toFixed(1)} sales</div>
                                <div className="text-sm text-gray-600">₱{Number(row.avg_daily_revenue || 0).toFixed(2)}/day</div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-sm text-gray-600">Last Activity</div>
                                <div className="text-sm font-medium text-gray-900">
                                  {row.last_sale ? new Date(row.last_sale).toLocaleDateString() : '—'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600 bg-gray-50">
                            {Object.keys(reportData[0] || {}).map(key => (
                              <th key={key} className="py-3 px-4 font-semibold">
                                {key.replace(/_/g, ' ').toUpperCase()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedReportData.map((row, index) => (
                            <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                              {Object.values(row).map((value, cellIndex) => (
                                <td key={cellIndex} className="py-3 px-4">
                                  {typeof value === 'object' ? JSON.stringify(value) : value}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Report Pagination */}
                {reportTotal > reportPageSize && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">Showing <span className="font-semibold">{reportStartIndex + 1}-{reportEndIndex}</span> of <span className="font-semibold">{reportTotal}</span> records</div>
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
                      <button
                        aria-label="Previous page"
                        onClick={() => setReportPage(p => Math.max(1, p - 1))}
                        disabled={reportCurrentPage === 1}
                        className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-sm ${reportCurrentPage === 1 ? 'opacity-40 cursor-not-allowed text-gray-400' : 'hover:bg-gray-50 text-gray-700'}`}
                      >
                        ‹
                      </button>
                      {getCompactRangeReport(reportCurrentPage, reportTotalPages).map((num) => (
                        <button
                          key={num}
                          onClick={() => setReportPage(num)}
                          className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-sm font-medium ${reportCurrentPage === num ? 'bg-indigo-600 text-white shadow-sm' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        aria-label="Next page"
                        onClick={() => setReportPage(p => Math.min(reportTotalPages, p + 1))}
                        disabled={reportCurrentPage === reportTotalPages}
                        className={`w-8 h-8 inline-flex items-center justify-center rounded-full text-sm ${reportCurrentPage === reportTotalPages ? 'opacity-40 cursor-not-allowed text-gray-400' : 'hover:bg-gray-50 text-gray-700'}`}
                      >
                        ›
                      </button>
                      <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 text-sm text-gray-700">
                        <span>Go to page:</span>
                        <form onSubmit={(e)=>{e.preventDefault(); const n=parseInt(reportPageInput,10); if(!Number.isNaN(n)){ const c=Math.max(1, Math.min(reportTotalPages, n)); setReportPage(c);} setReportPageInput('');}} className="flex items-center gap-2">
                          <input type="number" min="1" max={reportTotalPages} value={reportPageInput} onChange={(e)=>setReportPageInput(e.target.value)} placeholder={`${reportCurrentPage}`} className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center" />
                          <span className="text-sm text-gray-600">of {reportTotalPages}</span>
                          <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-xs font-medium">Go</button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default InventoryManagement;
