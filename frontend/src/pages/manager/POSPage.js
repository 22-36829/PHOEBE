import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Printer,
  X,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  User,
  Receipt,
  History
} from 'lucide-react';
import { POSAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const POSPage = () => {
  const { token, user } = useAuth() || {};
  // State management
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [discountType, setDiscountType] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState(null);
  const [editQuantityValue, setEditQuantityValue] = useState('');
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('');
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnItems, setReturnItems] = useState([]);
  const [processingReturn, setProcessingReturn] = useState(false);
  const [returnMeta, setReturnMeta] = useState({ lastEditedBy: null, lastEditedAt: null });

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unit_price)), 0);
  
  // Calculate discount based on type
  const calculateDiscount = () => {
    if (!discountType) return 0;
    const discountRates = {
      'senior_citizen': 0.20,
      'pwd': 0.20,
      'special': 0.05
    };
    return subtotal * (discountRates[discountType] || 0);
  };
  
  const discountAmount = calculateDiscount();
  const totalAmount = subtotal - discountAmount;

  // Fetch products and categories
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await POSAPI.getProducts();
      if (data.success) {
        setProducts(data.products);
        setFilteredProducts(data.products);
      } else {
        setError('Failed to load products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to connect to server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await POSAPI.getCategories();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoadingTransactions(true);
      console.log('Fetching transactions with token:', token ? 'present' : 'missing');
      const data = await POSAPI.getTransactions(token);
      console.log('Transactions response:', data);
      if (data.success) {
        setTransactions(data.transactions);
        console.log('Set transactions:', data.transactions);
      } else {
        console.error('Failed to fetch transactions:', data.error);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  }, [token]);

  // Filter products based on search and category
  const filterProducts = useCallback(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category_name === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchTerm]);

  // Effects
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  useEffect(() => {
    filterProducts();
  }, [filterProducts]);

  // Cart operations
  const addToCart = (product) => {
    if (!product.in_stock) {
      setError('Product is out of stock');
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product_id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * parseFloat(item.unit_price) }
            : item
        );
      } else {
        return [...prevCart, {
          product_id: product.id,
          name: product.name,
          unit_price: parseFloat(product.unit_price),
          quantity: 1,
          total_price: parseFloat(product.unit_price)
        }];
      }
    });
    setSuccess('Product added to cart');
    setTimeout(() => setSuccess(''), 2000);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.product_id === productId
          ? { ...item, quantity: newQuantity, total_price: newQuantity * parseFloat(item.unit_price) }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.product_id !== productId));
  };

  const startEditQuantity = (productId, currentQuantity) => {
    setEditingQuantity(productId);
    setEditQuantityValue(currentQuantity.toString());
  };

  const saveEditQuantity = (productId) => {
    const newQuantity = parseInt(editQuantityValue);
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
    setEditingQuantity(null);
    setEditQuantityValue('');
  };

  const cancelEditQuantity = () => {
    setEditingQuantity(null);
    setEditQuantityValue('');
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setDiscountType('');
    setSuccess('Cart cleared');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const saleData = {
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        customer_name: customerName || null,
        payment_method: paymentMethod,
        discount_type: discountType || '',
        discount_amount: parseFloat(discountAmount) || 0,
        user_id: user?.id,
        pharmacy_id: user?.pharmacy_id,
        tax_rate: 0
      };

      const response = await POSAPI.processSale(saleData, token);
      
      if (response.success) {
        const sale = response.receipt || response.sale;
        const normalized = sale ? {
          sale_number: sale.sale_number,
          subtotal: sale.subtotal,
          discount_amount: sale.discount_amount || 0,
          total_amount: sale.total_amount,
          payment_method: sale.payment_method,
          created_at: sale.created_at,
          customer_name: customerName || null,
          items: (sale.items || []).map(i => ({
            name: i.name || i.product_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            total_price: i.total_price
          }))
        } : null;
        if (normalized) setReceipt(normalized);
        setCart([]);
        setCustomerName('');
        setDiscountType('');
        setShowPaymentModal(false);
        setSuccess('Payment processed successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Print receipt
  const printReceipt = () => {
    if (!receipt) return;

    const printWindow = window.open('', '_blank');
    const htmlContent = '<html><head><title>Receipt - ' + receipt.sale_number + '</title><style>body { font-family: monospace; font-size: 12px; margin: 0; padding: 20px; } .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; } .item { display: flex; justify-content: space-between; margin-bottom: 5px; } .total { border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; font-weight: bold; } .footer { text-align: center; margin-top: 20px; font-size: 10px; }</style></head><body><div class="header"><h2>PHOEBE DRUGSTORE</h2><p>Receipt #: ' + receipt.sale_number + '</p><p>Date: ' + new Date(receipt.created_at).toLocaleString() + '</p>' + (receipt.customer_name ? '<p>Customer: ' + receipt.customer_name + '</p>' : '') + '</div><div class="items">' + receipt.items.map(item => '<div class="item"><span>' + (item.name || '') + ' x' + item.quantity + '</span><span>₱' + parseFloat(item.total_price).toFixed(2) + '</span></div>').join('') + '</div><div class="total"><div class="item"><span>Subtotal:</span><span>₱' + parseFloat(receipt.subtotal).toFixed(2) + '</span></div>' + (receipt.discount_amount > 0 ? '<div class="item"><span>Discount:</span><span>-₱' + parseFloat(receipt.discount_amount).toFixed(2) + '</span></div>' : '') + '<div class="item"><span>TOTAL:</span><span>₱' + parseFloat(receipt.total_amount).toFixed(2) + '</span></div><div class="item"><span>Payment: ' + String(receipt.payment_method || '').toUpperCase() + '</span><span></span></div></div><div class="footer"><p>Thank you for your purchase!</p><p>Visit us again soon!</p></div></body></html>';
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Return item functions
  const openReturnModal = async (transaction) => {
    setSelectedTransaction(transaction);
    setReturnItems(transaction.items?.map(item => ({
      ...item,
      return_quantity: 0,
      max_return: item.quantity
    })) || []);
    setReturnReason('');
    setReturnMeta({ lastEditedBy: null, lastEditedAt: null });
    
    // If transaction has returns, load existing return data
    if (transaction.has_returns) {
      try {
        const returnData = await POSAPI.getReturnDetails(transaction.id, token);
        if (returnData.success && returnData.returns.length > 0) {
          const latestReturn = returnData.returns[0]; // Get the latest return
          setReturnReason(latestReturn.reason);
          setReturnMeta({
            lastEditedBy: latestReturn.processed_by_name || latestReturn.staff_name || latestReturn.user_name || latestReturn.user_full_name || latestReturn.username || (latestReturn.user && latestReturn.user.name) || null,
            lastEditedAt: latestReturn.updated_at || latestReturn.created_at || null
          });
          
          // Update return quantities based on existing returns
          setReturnItems(prev => prev.map(item => {
            const existingReturn = latestReturn.items?.find(ri => ri.product_id === item.product_id);
            return {
              ...item,
              return_quantity: existingReturn ? existingReturn.quantity : 0,
              max_return: item.quantity - (existingReturn ? existingReturn.quantity : 0)
            };
          }));
        }
      } catch (error) {
        console.error('Error loading return details:', error);
      }
    }
    
    setShowReturnModal(true);
  };

  const updateReturnQuantity = (itemId, quantity) => {
    setReturnItems(prev => prev.map(item => 
      item.product_id === itemId 
        ? { ...item, return_quantity: Math.max(0, Math.min(quantity, item.max_return)) }
        : item
    ));
  };

  const processReturn = async () => {
    if (!selectedTransaction || !returnReason.trim()) {
      setError('Please provide a return reason');
      return;
    }

    const itemsToReturn = returnItems.filter(item => item.return_quantity > 0);
    if (itemsToReturn.length === 0) {
      setError('Please select items to return');
      return;
    }

    try {
      setProcessingReturn(true);
      setError('');

      const returnData = {
        sale_id: selectedTransaction.id,
        reason: returnReason.trim(),
        items: itemsToReturn.map(item => ({
          product_id: item.product_id,
          quantity: item.return_quantity,
          unit_price: item.unit_price
        })),
        user_id: user?.id,
        pharmacy_id: user?.pharmacy_id,
        is_edit: selectedTransaction.has_returns // Flag to indicate this is an edit
      };

      const response = await POSAPI.processReturn(returnData, token);
      
      if (response.success) {
        setShowReturnModal(false);
        setSuccess(selectedTransaction.has_returns ? 'Return updated successfully!' : 'Items returned successfully!');
        setTimeout(() => setSuccess(''), 3000);
        // Refresh transactions
        await fetchTransactions();
      } else {
        setError(response.error || 'Return failed');
      }
    } catch (error) {
      setError(`Return failed: ${error.message || 'Please try again.'}`);
    } finally {
      setProcessingReturn(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 h-full">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 h-full">
        {/* Colorful Header + Filters (Sticky Container) */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 rounded-2xl shadow-2xl p-6 mb-6 text-white sticky top-14 z-30 ring-1 ring-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Point of Sale</h1>
                <p className="text-blue-100 text-lg">Phoebe Drugstore - Sales Management</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">{new Date().toLocaleTimeString()}</div>
              <div className="text-blue-100">{new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {/* Embedded Filters Toolbar */}
          <div className="mt-4 bg-white text-gray-800 rounded-xl p-4 shadow-md ring-1 ring-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Categories */}
              <div className="md:col-span-4 min-w-0">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-2 shadow-lg">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">Categories</h3>
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm bg-white text-sm"
                >
                  <option value="all">All Products ({products.length})</option>
                  {categories.map(category => {
                    const categoryName = typeof category === 'string' ? category : category.name;
                    const categoryCount = products.filter(p => p.category_name === categoryName).length;
                    return (
                      <option key={categoryName} value={categoryName}>
                        {categoryName} ({categoryCount})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Search */}
              <div className="md:col-span-5 min-w-0">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-2 shadow-lg">
                    <Search className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">Search</h3>
                </div>
                <div className="relative min-w-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm bg-white text-sm truncate"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="md:col-span-3 flex justify-end gap-2">
                <button
                  onClick={() => {
                    fetchTransactions();
                    setShowTransactionHistory(true);
                  }}
                  className="px-3 lg:px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all flex-shrink-0 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/60"
                  aria-label="View transaction history"
                >
                  <History className="w-5 h-5 mr-2" />
                  <span className="hidden lg:inline">History</span>
                </button>
                <button
                  onClick={() => setShowCart(prev => !prev)}
                  className="relative px-3 lg:px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all flex-shrink-0 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/60"
                  aria-label="Toggle cart"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  <span className="hidden lg:inline">Cart</span>
                  <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-xs font-bold rounded-full px-2 py-0.5 border border-orange-200">{cart.length}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-r-lg flex items-center shadow-sm">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-100 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-r-lg flex items-center shadow-sm">
            <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}



        {/* Products */}
        <div className="flex flex-col gap-6 relative z-0">
          {/* Products Section */}
          <div className="flex-1">
            <div className="mb-6">
              {/* Products Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedCategory === 'all' ? 'All Products' : selectedCategory}
                  </h2>
                </div>
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-2 rounded-full border border-indigo-200">
                  <span className="text-sm text-indigo-700 font-semibold">
                    {filteredProducts.length} products
                  </span>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading products...</p>
                </div>
              )}

              {/* Products Grid */}
              {!loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-7 gap-3">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={`w-full p-3 border rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between min-h-[140px] ${
                        product.in_stock
                          ? 'border-gray-200 hover:border-indigo-400 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50 bg-white shadow'
                          : 'border-rose-200 bg-rose-50 opacity-75 cursor-not-allowed'
                      }`}
                    >
                      {/* Product Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md">
                          <Package className="w-4 h-4 text-white" />
                        </div>
                        {!product.in_stock && (
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 flex flex-col justify-center min-h-0">
                        <h3 className="font-semibold text-gray-900 text-sm mb-2 leading-snug whitespace-normal break-words">
                          {product.name}
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">{product.category_name}</p>
                        
                        {/* Price */}
                        <div className="text-base font-bold text-indigo-600 mb-2">
                          ₱{parseFloat(product.unit_price).toFixed(2)}
                        </div>
                      </div>
                      
                      {/* Stock Status */}
                      <div className="flex items-center justify-between mt-auto">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.current_stock > 10 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                            : product.current_stock > 0 
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}>
                          {product.current_stock} in stock
                        </span>
                        {product.current_stock <= product.min_stock_level && (
                          <span className="text-red-500 text-base">⚠️</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cart Drawer */}
        {showCart && (
          <div className="fixed top-24 right-4 z-40 w-96 max-w-[92vw]">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
                    <ShoppingCart className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">Shopping Cart</h3>
                </div>
                <button onClick={() => setShowCart(false)} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Cart is Empty</p>
                  <p className="text-xs text-gray-500">Click products to add them to your cart</p>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {cart.map(item => (
                    <div key={item.product_id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-xs text-gray-900 line-clamp-1 flex-1 mr-2">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className="p-1 rounded-lg hover:bg-red-100 text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        {editingQuantity === item.product_id ? (
                          <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border shadow-sm">
                            <input
                              type="number"
                              value={editQuantityValue}
                              onChange={(e) => setEditQuantityValue(e.target.value)}
                              className="w-12 text-center text-xs font-bold text-gray-900 border-0 focus:outline-none"
                              min="1"
                              autoFocus
                            />
                            <button
                              onClick={() => saveEditQuantity(item.product_id)}
                              className="w-6 h-6 rounded-lg hover:bg-green-100 flex items-center justify-center transition-colors text-green-600"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </button>
                            <button
                              onClick={cancelEditQuantity}
                              className="w-6 h-6 rounded-lg hover:bg-red-100 flex items-center justify-center transition-colors text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border shadow-sm">
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                              className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span 
                              className="w-6 text-center font-bold text-gray-900 text-xs cursor-pointer hover:bg-gray-100 rounded"
                              onClick={() => startEditQuantity(item.product_id, item.quantity)}
                              title="Click to edit quantity"
                            >
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                              className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="text-right">
                          <div className="font-bold text-blue-600 text-sm">
                            ₱{parseFloat(item.total_price).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ₱{parseFloat(item.unit_price).toFixed(2)} each
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals Section */}
              {cart.length > 0 && (
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 border border-gray-200 shadow-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span className="font-medium">Subtotal:</span>
                      <span className="font-semibold">₱{parseFloat(subtotal).toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-xs text-green-600">
                        <span className="font-medium">Discount ({discountType === 'senior_citizen' ? 'Senior Citizen' : discountType === 'pwd' ? 'PWD' : 'Special'}):</span>
                        <span className="font-semibold">-₱{parseFloat(discountAmount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-300 pt-2">
                      <div className="flex justify-between text-lg font-bold text-blue-600">
                        <span>Total:</span>
                        <span>₱{parseFloat(totalAmount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={clearCart}
                      className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-200 text-xs font-semibold shadow-lg hover:shadow-xl"
                    >
                      Clear Cart
                    </button>
                    <button
                      onClick={() => { setShowCart(false); setShowPaymentModal(true); }}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-3 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl text-xs"
                    >
                      Process Payment
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl">💳</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Process Payment</h3>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-base font-semibold text-gray-800 mb-3">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-800 mb-3">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'cash', label: 'Cash', emoji: '💵' },
                      { value: 'digital_wallet', label: 'Digital Wallet', emoji: '📱' }
                    ].map(method => (
                      <button
                        key={method.value}
                        onClick={() => setPaymentMethod(method.value)}
                        className={`p-4 border-2 rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 ${
                          paymentMethod === method.value
                            ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-lg transform scale-105'
                            : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-2xl">{method.emoji}</span>
                        <span className="font-semibold text-sm">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-800 mb-3">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
                  >
                    <option value="">No Discount</option>
                    <option value="senior_citizen">Senior Citizen (20%)</option>
                    <option value="pwd">PWD (20%)</option>
                    <option value="special">Special Discount (5%)</option>
                  </select>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 shadow-lg">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 mb-2">
                      ₱{parseFloat(totalAmount).toFixed(2)}
                    </p>
                    <p className="text-base text-gray-600 font-semibold">Total Amount</p>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-base shadow-lg hover:shadow-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={processPayment}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 font-bold text-base shadow-lg hover:shadow-xl"
                  >
                    {loading ? 'Processing...' : 'Confirm Payment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Modal */}
        {Boolean(receipt) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
              <div className="text-center mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
                <p className="text-gray-600">Receipt #: {receipt.sale_number}</p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-bold">₱{parseFloat(receipt.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-bold">{receipt.payment_method.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span className="font-bold">{new Date(receipt.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setReceipt(null)}
                  className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={printReceipt}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Receipt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction History Modal */}
        {showTransactionHistory && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                      <History className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">Transaction History</h3>
                  </div>
                  <button
                    onClick={() => setShowTransactionHistory(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
                
                {/* Search */}
                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search transactions by receipt number, customer name, or date..."
                      value={transactionSearchTerm}
                      onChange={(e) => setTransactionSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {console.log('Rendering transactions modal, count:', transactions.length, 'transactions:', transactions)}
                {loadingTransactions ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Receipt className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 text-lg font-semibold mb-2">No Transactions Found</p>
                    <p className="text-gray-500">Start making sales to see transaction history here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions
                      .filter(transaction => 
                        transaction.sale_number.toLowerCase().includes(transactionSearchTerm.toLowerCase()) ||
                        (transaction.customer_name && transaction.customer_name.toLowerCase().includes(transactionSearchTerm.toLowerCase())) ||
                        new Date(transaction.created_at).toLocaleDateString().includes(transactionSearchTerm)
                      )
                      .map(transaction => (
                        <div key={transaction.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
                                <Receipt className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900">Receipt #{transaction.sale_number}</h4>
                                <p className="text-sm text-gray-600">
                                  {new Date(transaction.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-green-600">₱{parseFloat(transaction.total_amount).toFixed(2)}</p>
                              <p className="text-sm text-gray-600 capitalize">{transaction.payment_method}</p>
                            </div>
                          </div>
                          
                          {transaction.customer_name && (
                            <div className="mb-3">
                              <span className="text-sm text-gray-600">Customer: </span>
                              <span className="font-semibold text-gray-900">{transaction.customer_name}</span>
                            </div>
                          )}
                          
                          {/* Staff who made the transaction (handles multiple possible field names) */}
                          {(transaction.staff_name || transaction.user_name || transaction.user_full_name || transaction.username || (transaction.user && transaction.user.name)) && (
                            <div className="mb-3">
                              <span className="text-sm text-gray-600">Staff: </span>
                              <span className="font-semibold text-gray-900">{transaction.staff_name || transaction.user_name || transaction.user_full_name || transaction.username || (transaction.user && transaction.user.name)}</span>
                            </div>
                          )}

                          {/* Last editor for return, if available on transaction */}
                          {transaction.has_returns && (transaction.last_returned_by_name || transaction.last_edited_by || transaction.last_modified_by_name || transaction.returned_by_name) && (
                            <div className="mb-3">
                              <span className="text-sm text-gray-600">Last Edited By: </span>
                              <span className="font-semibold text-gray-900">
                                {transaction.last_returned_by_name || transaction.last_edited_by || transaction.last_modified_by_name || transaction.returned_by_name}
                              </span>
                            </div>
                          )}

                          {transaction.discount_amount > 0 && (
                            <div className="mb-3">
                              <span className="text-sm text-gray-600">Discount: </span>
                              <span className="font-semibold text-green-600">
                                {transaction.discount_type === 'senior_citizen' ? 'Senior Citizen' : 
                                 transaction.discount_type === 'pwd' ? 'PWD' : 'Special'} 
                                (-₱{parseFloat(transaction.discount_amount).toFixed(2)})
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                              {transaction.items?.length || 0} items
                              {transaction.has_returns && (
                                <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                                  {transaction.return_count} return{transaction.return_count > 1 ? 's' : ''} (₱{transaction.total_returned_amount.toFixed(2)})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openReturnModal(transaction)}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold flex items-center space-x-2"
                              >
                                <Package className="w-4 h-4" />
                                <span>{transaction.has_returns ? 'Edit Return' : 'Return'}</span>
                              </button>
                              <button
                                onClick={() => {
                                  // Print individual receipt
                                  const printWindow = window.open('', '_blank');
                                  const htmlContent = '<html><head><title>Receipt - ' + transaction.sale_number + '</title><style>body { font-family: monospace; font-size: 12px; margin: 0; padding: 20px; } .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; } .item { display: flex; justify-content: space-between; margin-bottom: 5px; } .total { border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; font-weight: bold; } .footer { text-align: center; margin-top: 20px; font-size: 10px; }</style></head><body><div class="header"><h2>PHOEBE DRUGSTORE</h2><p>Receipt #: ' + transaction.sale_number + '</p><p>Date: ' + new Date(transaction.created_at).toLocaleString() + '</p>' + (transaction.customer_name ? '<p>Customer: ' + transaction.customer_name + '</p>' : '') + '</div><div class="items">' + (transaction.items?.map(item => '<div class="item"><span>' + (item.name || '') + ' x' + item.quantity + '</span><span>₱' + parseFloat(item.total_price).toFixed(2) + '</span></div>').join('') || '') + '</div><div class="total"><div class="item"><span>Subtotal:</span><span>₱' + parseFloat(transaction.subtotal).toFixed(2) + '</span></div>' + (transaction.discount_amount > 0 ? '<div class="item"><span>Discount:</span><span>-₱' + parseFloat(transaction.discount_amount).toFixed(2) + '</span></div>' : '') + '<div class="item"><span>TOTAL:</span><span>₱' + parseFloat(transaction.total_amount).toFixed(2) + '</span></div><div class="item"><span>Payment: ' + String(transaction.payment_method || '').toUpperCase() + '</span><span></span></div></div><div class="footer"><p>Thank you for your purchase!</p><p>Visit us again soon!</p></div></body></html>';
                                  printWindow.document.write(htmlContent);
                                  printWindow.document.close();
                                  printWindow.print();
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center space-x-2"
                              >
                                <Printer className="w-4 h-4" />
                                <span>Print</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Return Items Modal */}
        {showReturnModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800">
                        {selectedTransaction.has_returns ? 'Edit Return' : 'Return Items'}
                      </h3>
                      <p className="text-gray-600">Receipt #{selectedTransaction.sale_number}</p>
                      {/* Return last editor info from fetched return details */}
                      {selectedTransaction.has_returns && returnMeta.lastEditedBy && (
                        <p className="text-sm text-gray-600">
                          Last edited by {returnMeta.lastEditedBy}
                          {returnMeta.lastEditedAt && (
                            <span> on {new Date(returnMeta.lastEditedAt).toLocaleString()}</span>
                          )}
                        </p>
                      )}
                      {selectedTransaction.has_returns && (
                        <p className="text-sm text-orange-600">
                          This transaction already has {selectedTransaction.return_count} return{selectedTransaction.return_count > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowReturnModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-6">
                  {/* Return Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Return Reason *
                    </label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                    >
                      <option value="">Select a reason</option>
                      <option value="defective">Defective Product</option>
                      <option value="wrong_item">Wrong Item</option>
                      <option value="expired">Expired Product</option>
                      <option value="damaged">Damaged Packaging</option>
                      <option value="customer_request">Customer Request</option>
                      <option value="overstock">Overstock Return</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Items to Return */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Select Items to Return</h4>
                    <div className="space-y-3">
                      {returnItems.map(item => (
                        <div key={item.product_id} className="bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl p-4 border border-orange-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-900">{item.name}</h5>
                              <p className="text-sm text-gray-600">
                                Original Qty: {item.quantity} | Price: ₱{parseFloat(item.unit_price).toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => updateReturnQuantity(item.product_id, item.return_quantity - 1)}
                                  disabled={item.return_quantity <= 0}
                                  className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max={item.max_return}
                                  value={item.return_quantity}
                                  onChange={(e) => updateReturnQuantity(item.product_id, parseInt(e.target.value) || 0)}
                                  className="w-16 text-center border border-gray-300 rounded-lg px-2 py-1"
                                />
                                <button
                                  onClick={() => updateReturnQuantity(item.product_id, item.return_quantity + 1)}
                                  disabled={item.return_quantity >= item.max_return}
                                  className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                              {item.return_quantity > 0 && (
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-orange-600">
                                    ₱{(item.return_quantity * parseFloat(item.unit_price)).toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-500">Refund Amount</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Refund */}
                  {returnItems.some(item => item.return_quantity > 0) && (
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">Total Refund:</span>
                        <span className="text-2xl font-bold text-orange-600">
                          ₱{returnItems.reduce((sum, item) => sum + (item.return_quantity * parseFloat(item.unit_price)), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={processReturn}
                  disabled={processingReturn || !returnReason.trim() || !returnItems.some(item => item.return_quantity > 0)}
                  className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center space-x-2"
                >
                  {processingReturn && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                  <span>{processingReturn ? 'Processing...' : (selectedTransaction.has_returns ? 'Update Return' : 'Process Return')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default POSPage;