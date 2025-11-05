

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  TrendingUp, Brain, Target, BarChart3, RefreshCw, Play, Pause, AlertCircle,
  Activity, Zap, Layers, BarChart, LineChart, PieChart, Settings,
  Maximize2, Minimize2, Download, Share2, Filter, Search, Eye, EyeOff, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ManagerAPI } from '../../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  zoomPlugin
);

const Forecasting = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [accuracy, setAccuracy] = useState(null);
  const [forecasts, setForecasts] = useState(null); // { values: number[], dates: string[], accuracy?: number, confidence?: number[][] }
  
  // UI states
  const [selectedType, setSelectedType] = useState('product'); // product only
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [forecastDays, setForecastDays] = useState(30);
  const [forecastType, setForecastType] = useState('daily');
  const [training, setTraining] = useState(false);
  
  // Bulk forecasting states
  const [bulkForecasting, setBulkForecasting] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [bulkResults, setBulkResults] = useState(null);
  const [showBulkResults, setShowBulkResults] = useState(false);
  
  // Filter states
  const [sortBy, setSortBy] = useState('name'); // name, sales, accuracy
  const [searchQuery, setSearchQuery] = useState('');
  
  // Auto-forecast states
  const [autoForecast, setAutoForecast] = useState(true);
  const [forecastInterval, setForecastInterval] = useState(30000); // 30 seconds
  
  // Advanced chart states
  const [timeframe, setTimeframe] = useState('1D'); // 1H, 4H, 1D, 7D, 1M, 3M, 1Y
  
  // Chart refs
  const chartRef = useRef(null);
  const volumeRef = useRef(null);
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Fullscreen functions
  const openFullscreen = () => {
    setIsFullscreen(true);
  };
  
  const closeFullscreen = () => {
    setIsFullscreen(false);
  };
  
  // Reset zoom function
  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };
  
  // Chart data states
  const [chartData, setChartData] = useState(null);
  const [volumeData, setVolumeData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [technicalData, setTechnicalData] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [productSearch, setProductSearch] = useState('');

  // Parse YYYY-MM-DD as a local Date (prevents timezone shifts)
  const parseLocalISODate = (s) => {
    if (!s || typeof s !== 'string') return new Date(s);
    const parts = s.split('-');
    if (parts.length !== 3) return new Date(s);
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    const d = Number(parts[2]);
    return new Date(y, m, d);
  };
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  
  // Chart analyzer state
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  
  // Category analysis state
  const [showCategoryAnalysis, setShowCategoryAnalysis] = useState(false);
  

  // Historical true series cache: key = `${type}:${id}:${timeframe}` -> [{date, quantity}]
  const [historicalCache, setHistoricalCache] = useState({});
  const [historicalLoading, setHistoricalLoading] = useState(false);

  const historicalKey = useCallback((target, tf) => {
    if (!target) return '';
    return `${selectedType}:${target.id}:${tf}`;
  }, [selectedType]);

  const fetchHistorical = useCallback(async (target, tf) => {
    if (!target || !token) return;
    const key = historicalKey(target, tf);
    if (historicalCache[key]) return; // already cached
    try {
      setHistoricalLoading(true);
      const res = await ManagerAPI.getHistoricalSeries({
        model_type: selectedType,
        target_id: target.id,
        timeframe: tf
      }, token);
      if (res && res.success) {
        setHistoricalCache(prev => ({ ...prev, [key]: res.data || [] }));
      }
    } catch (e) {
      // Non-fatal: fall back to generated data
    } finally {
      setHistoricalLoading(false);
    }
  }, [token, selectedType, historicalCache, historicalKey]);

  // When timeframe changes, force a refresh by clearing the cached entry for the current target+tf
  useEffect(() => {
    if (!selectedTarget) return;
    const key = historicalKey(selectedTarget, timeframe);
    setHistoricalCache(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    fetchHistorical(selectedTarget, timeframe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const [productsRes, categoriesRes, modelsRes, accuracyRes] = await Promise.all([
        ManagerAPI.getForecastableProducts(token),
        ManagerAPI.getForecastableCategories(token),
        ManagerAPI.getForecastingModels(token),
        ManagerAPI.getForecastingAccuracy(token)
      ]);
      
      if (productsRes.success) setProducts(productsRes.products);
      if (categoriesRes.success) setCategories(categoriesRes.categories);
      if (modelsRes.success) setModels(modelsRes.models);
      if (accuracyRes.success) setAccuracy(accuracyRes);
      
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  // Auto-forecast effect - only refresh forecasts, not retrain models
  useEffect(() => {
    if (autoForecast && selectedTarget && token) {
      const interval = setInterval(() => {
        // Only generate new forecasts, don't retrain models
        generateForecasts();
      }, Math.max(forecastInterval, 30000)); // Minimum 30 seconds to prevent rapid updates
      
      return () => clearInterval(interval);
    }
  }, [autoForecast, selectedTarget, forecastInterval, token]);

  // Auto-select first item when data loads
  useEffect(() => {
    if (products.length > 0 && !selectedTarget) {
      setSelectedTarget(products[0]);
    }
  }, [products, selectedTarget]);

  // Trigger an initial forecast automatically when a target becomes available
  useEffect(() => {
    if (selectedTarget && token) {
      // Generate immediately so users see predictions without waiting for the interval or clicking
      generateForecasts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTarget, token]);

  // Fetch accuracy when target changes
  useEffect(() => {
    if (selectedTarget && token) {
      fetchAccuracy();
    }
  }, [selectedTarget, token]);

  // Fetch accuracy data
  const fetchAccuracy = async () => {
    if (!selectedTarget) return;
    
    try {
      const response = await ManagerAPI.getForecastingAccuracy(token);
      if (response.success) {
        // Get accuracy for the selected target
        let targetAccuracy = 0;
        
        if (response.models && response.models.length > 0) {
          const targetModel = response.models.find(m => 
            m.target_id === selectedTarget.id && m.model_type === selectedType
          );
          if (targetModel) {
            targetAccuracy = targetModel.accuracy_percentage;
          }
        }
        
        // Use overall accuracy if no specific model found
        if (targetAccuracy === 0 && response.accuracy_percentage) {
          targetAccuracy = response.accuracy_percentage;
        }
        
        setAccuracy(prev => ({
          ...prev,
          accuracy_percentage: targetAccuracy
        }));
      }
    } catch (e) {
      // Non-fatal error, use default accuracy
      console.log('Could not fetch accuracy:', e.message);
      setAccuracy(prev => ({
        ...prev,
        accuracy_percentage: 0
      }));
    }
  };

  // Generate chart data when target, chart mode, timeframe, or chart type changes
  useEffect(() => {
    if (selectedTarget) {
      // Prime historical data for accuracy
      fetchHistorical(selectedTarget, timeframe);
      const chartData = generateChartData(selectedTarget);
      setChartData(chartData);
      setVolumeData(chartData?.volume);
      setTechnicalData(chartData?.indicators);
      
      
      // Set initial price
      const basePrice = Number(selectedTarget.avg_daily_sales || 10);
      setCurrentPrice(basePrice);
      setPriceChange(2.34); // Default change
    }
  }, [selectedTarget, timeframe, fetchHistorical]);

  // Refetch historical when timeframe or target changes
  useEffect(() => {
    if (selectedTarget) {
      fetchHistorical(selectedTarget, timeframe);
    }
  }, [selectedTarget, timeframe, fetchHistorical]);

  // ESC key handler for fullscreen
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFullscreen) {
        closeFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Real-time price updates
  useEffect(() => {
    if (selectedTarget && autoForecast) {
      const interval = setInterval(() => {
        const basePrice = Number(selectedTarget.avg_daily_sales || 10);
        const change = (Math.random() - 0.5) * 0.1; // ±5% change
        const newPrice = basePrice * (1 + change);
        const changePercent = change * 100;
        
        setCurrentPrice(newPrice);
        setPriceChange(changePercent);
      }, 2000); // Update every 2 seconds
      
      return () => clearInterval(interval);
    }
  }, [selectedTarget, autoForecast]);

  // Train model
  const trainModel = async () => {
    if (!selectedTarget) {
      setError('Please select a product or category to train');
      return;
    }

    try {
      setTraining(true);
      setError('');
      
      const response = await ManagerAPI.trainForecastingModel({
        target_id: selectedTarget.id,
        target_name: selectedTarget.name,
        model_type: selectedType || 'product'
      }, token);
      
      if (response && response.message) {
        setSuccess(response.message);
        if (typeof response.accuracy === 'number') {
          setAccuracy(prev => ({ ...prev, accuracy_percentage: response.accuracy }));
        }
        await loadData();
      }
    } catch (e) {
      setError(e.message || 'Failed to train model');
    } finally {
      setTraining(false);
    }
  };

  // Model performance monitoring (automatic retraining when needed)
  const checkModelPerformance = async () => {
    if (!selectedTarget) return;
    
    try {
      // Only retrain if accuracy is very low or no model exists
      if (!accuracy || Number(accuracy.accuracy_percentage) === 0 || Number(accuracy.accuracy_percentage) < 50) {
        setSuccess('No trained model found or accuracy too low. Training new model...');
        // Trigger automatic retraining
        await trainModel();
        
        // Refresh accuracy after training
        setTimeout(() => {
          fetchAccuracy();
        }, 2000);
      }
    } catch (e) {
      console.warn('Model performance check failed:', e);
    }
  };

  // Periodic model monitoring - reduced frequency to prevent rapid retraining
  useEffect(() => {
    const interval = setInterval(() => {
      checkModelPerformance();
    }, 300000); // Check every 5 minutes instead of 30 seconds
    
    return () => clearInterval(interval);
  }, [accuracy, selectedTarget]);

  // Generate forecasts
  const generateForecasts = async () => {
    if (!selectedTarget) {
      setError('Please select a product or category to forecast');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const params = {
        target_id: selectedTarget.id,
        target_name: selectedTarget.name,
        model_type: selectedType || 'product',
        forecast_days: forecastDays,
        forecast_type: forecastType
      };
      let response;
      try {
        response = await ManagerAPI.getForecasts(params, token);
      } catch (err1) {
        try { await trainModel(); } catch (_) {}
        try {
          response = await ManagerAPI.getForecasts(params, token);
        } catch (err2) {
          const fallback = buildSyntheticForecast(selectedTarget, forecastDays);
          setForecasts({ values: fallback.values, dates: fallback.dates });
          setSuccess('Showing baseline forecast (backend unavailable)');
          return;
        }
      }

      // Normalize both legacy and blueprint shapes
      let next = null;
      if (response && response.forecast) {
        // Blueprint shape
        const fc = response.forecast;
        next = {
          values: Array.isArray(fc.values) ? fc.values : (Array.isArray(fc.forecasts) ? fc.forecasts : []),
          dates: Array.isArray(fc.dates) ? fc.dates : [],
          accuracy: typeof response.accuracy === 'number' ? response.accuracy : undefined,
          confidence: Array.isArray(fc.confidence_lower) && Array.isArray(fc.confidence_upper)
            ? [fc.confidence_lower, fc.confidence_upper]
            : undefined,
        };
      } else if (response && (Array.isArray(response.forecasts) || Array.isArray(response.dates))) {
        // Legacy shape
        next = {
          values: Array.isArray(response.forecasts) ? response.forecasts : [],
          dates: Array.isArray(response.dates) ? response.dates : [],
          accuracy: typeof response.accuracy === 'number' ? response.accuracy : undefined,
          confidence: Array.isArray(response.confidence) ? response.confidence : undefined,
        };
      }

      if (!next) {
        const fallback = buildSyntheticForecast(selectedTarget, forecastDays);
        next = { values: fallback.values, dates: fallback.dates };
      }
      setForecasts(next);
      setSuccess('Forecasts generated successfully');
      if ((!accuracy || accuracy.accuracy_percentage === 0) && typeof next.accuracy === 'number') {
        setAccuracy(prev => ({ ...prev, accuracy_percentage: next.accuracy }));
      }
    } catch (e) {
      setError(e.message || 'Failed to generate forecasts');
    } finally {
      setLoading(false);
    }
  };

  // Bulk forecast for all products
  const generateBulkProductForecasts = async () => {
    try {
      setBulkForecasting(true);
      setError('');
      
      const results = {
        products: [],
        totalRevenue: 0,
        totalProfit: 0,
        fastMoving: 0,
        slowMoving: 0,
        highProfit: 0,
        lowProfit: 0
      };
      
      // Process each product
      for (const product of products) {
        if (Number(product.avg_daily_sales) > 0) {
          const salesData = generateSalesForecastData(product, timeframe);
          const avgSales = salesData.reduce((sum, day) => sum + day.sales, 0) / salesData.length;
          const avgRevenue = salesData.reduce((sum, day) => sum + day.revenue, 0) / salesData.length;
          const avgProfit = salesData.reduce((sum, day) => sum + day.profit, 0) / salesData.length;
          const profitMargin = avgRevenue > 0 ? (avgProfit / avgRevenue) * 100 : 0;
          
          const productResult = {
            id: product.id,
            name: product.name,
            category: product.category_name,
            avgDailySales: avgSales,
            avgDailyRevenue: avgRevenue,
            avgDailyProfit: avgProfit,
            profitMargin: profitMargin,
            demandLevel: avgSales >= 15 ? 'Fast' : avgSales >= 8 ? 'Medium' : 'Slow',
            profitLevel: profitMargin > 30 ? 'High' : 'Low'
          };
          
          results.products.push(productResult);
          results.totalRevenue += avgRevenue;
          results.totalProfit += avgProfit;
          
          if (avgSales >= 15) results.fastMoving++;
          if (avgSales < 8) results.slowMoving++;
          if (profitMargin > 30) results.highProfit++;
          if (profitMargin <= 30) results.lowProfit++;
        }
      }
      
      setBulkResults(results);
      setShowBulkResults(true);
      setSuccess(`Generated forecasts for ${results.products.length} products`);
      
    } catch (e) {
      setError(e.message || 'Failed to generate bulk forecasts');
    } finally {
      setBulkForecasting(false);
    }
  };

  // Bulk forecast for all categories
  const generateBulkCategoryForecasts = async () => {
    try {
      setBulkForecasting(true);
      setError('');
      
      const results = {
        categories: [],
        totalRevenue: 0,
        totalProfit: 0,
        totalProducts: 0
      };
      
      // Process each category
      for (const category of categories) {
        const categoryProducts = products.filter(p => p.category_name === category.name);
        if (categoryProducts.length > 0) {
          let categorySales = 0;
          let categoryRevenue = 0;
          let categoryProfit = 0;
          
          categoryProducts.forEach(product => {
            if (Number(product.avg_daily_sales) > 0) {
              const salesData = generateSalesForecastData(product, timeframe);
              categorySales += salesData.reduce((sum, day) => sum + day.sales, 0) / salesData.length;
              categoryRevenue += salesData.reduce((sum, day) => sum + day.revenue, 0) / salesData.length;
              categoryProfit += salesData.reduce((sum, day) => sum + day.profit, 0) / salesData.length;
            }
          });
          
          const categoryResult = {
            id: category.id,
            name: category.name,
            productCount: categoryProducts.length,
            avgDailySales: categorySales,
            avgDailyRevenue: categoryRevenue,
            avgDailyProfit: categoryProfit,
            profitMargin: categoryRevenue > 0 ? (categoryProfit / categoryRevenue) * 100 : 0
          };
          
          results.categories.push(categoryResult);
          results.totalRevenue += categoryRevenue;
          results.totalProfit += categoryProfit;
          results.totalProducts += categoryProducts.length;
        }
      }
      
      setBulkResults(results);
      setShowBulkResults(true);
      setSuccess(`Generated forecasts for ${results.categories.length} categories`);
      
    } catch (e) {
      setError(e.message || 'Failed to generate category forecasts');
    } finally {
      setBulkForecasting(false);
    }
  };

  // Generate default data for products with no historical sales
  const generateDefaultData = (baseSales, basePrice, baseCost, timeframe) => {
    const data = [];
    const startDate = new Date();
    
    // Calculate period based on timeframe
    let days;
    let intervalDays;
    switch (timeframe) {
      case '1H': days = 7; intervalDays = 0.04; break;
      case '4H': days = 14; intervalDays = 0.17; break;
      case '1D': days = 30; intervalDays = 1; break;
      case '7D': days = 90; intervalDays = 1; break;
      case '1M': days = 90; intervalDays = 1; break;
      case '3M': days = 180; intervalDays = 1; break;
      case '1Y': days = 365; intervalDays = 1; break;
      default: days = 30; intervalDays = 1;
    }
    
    startDate.setDate(startDate.getDate() - days);
    
    for (let i = 0; i < Math.ceil(days / intervalDays); i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + (i * intervalDays));
      
      // Generate minimal variation for default data
      const dailySales = Math.max(1, Math.round(baseSales * (0.8 + Math.random() * 0.4)));
      const revenue = dailySales * basePrice;
      const cost = dailySales * baseCost;
      const profit = revenue - cost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      data.push({
        date: date,
        timestamp: date.getTime(),
        sales: dailySales,
        revenue: Math.round(revenue * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
        unitPrice: basePrice,
        unitCost: baseCost,
        demandLevel: dailySales > 5 ? 'High' : dailySales > 2 ? 'Medium' : 'Low',
        profitLevel: profitMargin > 30 ? 'High' : profitMargin > 15 ? 'Medium' : 'Low',
        salesChange: 0,
        profitChange: 0
      });
    }
    
    return data;
  };


  // Compute timeframe-aware metrics for a target based on real data
  const computeTargetMetrics = (target) => {
    // Get real sales data from the target
    const dailySales = Number(target.avg_daily_sales || 0);
    const unitPrice = Number(target.unit_price || 0);
    const costPrice = Number(target.cost_price || 0);
    
    // Calculate timeframe multiplier based on selected timeframe
    let timeframeMultiplier = 1;
    switch (timeframe) {
      case '1H': timeframeMultiplier = 1/24; break; // Hourly = daily/24
      case '4H': timeframeMultiplier = 4/24; break; // 4 hours = daily/6
      case '1D': timeframeMultiplier = 1; break; // Daily = daily
      case '7D': timeframeMultiplier = 7; break; // Weekly = daily * 7
      case '1M': timeframeMultiplier = 30; break; // Monthly = daily * 30
      case '3M': timeframeMultiplier = 90; break; // 3 months = daily * 90
      case '1Y': timeframeMultiplier = 365; break; // Yearly = daily * 365
      default: timeframeMultiplier = 1;
    }
    
    // Calculate real metrics based on timeframe
    const avgSales = dailySales * timeframeMultiplier;
    const avgRevenue = avgSales * unitPrice;
    const avgProfit = avgSales * (unitPrice - costPrice);
    
    return { avgSales, avgRevenue, avgProfit };
  };

  // Get available targets based on type and filters (timeframe-aware)
  const getAvailableTargets = () => {
    let targets = products;

    // Enrich with metrics for products
    const enriched = targets.map(t => {
      const m = computeTargetMetrics(t);
      return { ...t, _metrics: m };
    });

    // Apply search filter
    let filtered = enriched;
    if (searchQuery.trim()) {
      filtered = filtered.filter(target => 
        target.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        target.generic_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting based on timeframe-aware data
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'sales':
          const sa = a._metrics ? a._metrics.avgSales : 0;
          const sb = b._metrics ? b._metrics.avgSales : 0;
          return sb - sa;
        case 'revenue':
          const ra = a._metrics ? a._metrics.avgRevenue : 0;
          const rb = b._metrics ? b._metrics.avgRevenue : 0;
          return rb - ra;
        case 'profit':
          const pa = a._metrics ? a._metrics.avgProfit : 0;
          const pb = b._metrics ? b._metrics.avgProfit : 0;
          return pb - pa;
        case 'accuracy':
          return (Number(b.accuracy_percentage) || 0) - (Number(a.accuracy_percentage) || 0);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  };

  // Chart analyzer function
  const analyzeChart = useCallback((target) => {
    if (!target) return null;
    
    const salesData = generateSalesForecastData(target, timeframe);
    if (!salesData || salesData.length === 0) return null;
    
    // Calculate trends and patterns based on timeframe
    const recentSales = salesData.slice(-7).map(d => d.sales);
    const avgSales = recentSales.reduce((a, b) => a + b, 0) / recentSales.length;
    const salesTrend = recentSales[recentSales.length - 1] > recentSales[0] ? 'increasing' : 'decreasing';
    const volatility = Math.max(...recentSales) - Math.min(...recentSales);
    
    // Get timeframe-specific context
    const getTimeframeContext = (timeframe) => {
      switch (timeframe) {
        case '1H':
          return {
            period: 'hourly',
            unit: 'per hour',
            description: 'This chart shows sales data for each hour of the day',
            analysis: 'Hourly patterns help identify peak shopping times and staffing needs'
          };
        case '4H':
          return {
            period: '4-hour intervals',
            unit: 'per 4 hours',
            description: 'This chart shows sales data in 4-hour blocks',
            analysis: '4-hour intervals reveal daily patterns and help with shift planning'
          };
        case '1D':
          return {
            period: 'daily',
            unit: 'per day',
            description: 'This chart shows daily sales performance',
            analysis: 'Daily trends help track overall product performance and demand'
          };
        case '7D':
          return {
            period: 'weekly',
            unit: 'per week',
            description: 'This chart shows weekly sales patterns',
            analysis: 'Weekly patterns help identify seasonal trends and weekly cycles'
          };
        case '1M':
          return {
            period: 'monthly',
            unit: 'per month',
            description: 'This chart shows monthly sales performance',
            analysis: 'Monthly trends help with inventory planning and seasonal adjustments'
          };
        case '3M':
          return {
            period: 'quarterly',
            unit: 'per quarter',
            description: 'This chart shows quarterly sales performance',
            analysis: 'Quarterly trends help with long-term planning and seasonal analysis'
          };
        case '1Y':
          return {
            period: 'yearly',
            unit: 'per year',
            description: 'This chart shows yearly sales performance',
            analysis: 'Yearly trends help with annual planning and long-term strategy'
          };
        default:
          return {
            period: 'daily',
            unit: 'per day',
            description: 'This chart shows sales performance',
            analysis: 'Track performance trends over time'
          };
      }
    };
    
    const timeframeContext = getTimeframeContext(timeframe);
    
    // Determine demand level based on timeframe
    let demandLevel = 'Low';
    let demandExplanation = '';
    
    // Timeframe-specific demand thresholds and explanations
    switch (timeframe) {
      case '1H':
        if (avgSales >= 3) {
          demandLevel = 'High';
          demandExplanation = 'High hourly demand - this is a peak hour product. Consider extra staffing during these hours.';
        } else if (avgSales >= 1) {
          demandLevel = 'Medium';
          demandExplanation = 'Moderate hourly demand - normal business hours performance.';
        } else {
          demandExplanation = 'Low hourly demand - consider promotional campaigns during off-peak hours.';
        }
        break;
      case '4H':
        if (avgSales >= 12) {
          demandLevel = 'High';
          demandExplanation = 'High demand during 4-hour blocks - this product sells well in shifts. Plan inventory accordingly.';
        } else if (avgSales >= 4) {
          demandLevel = 'Medium';
          demandExplanation = 'Steady demand across 4-hour periods - consistent performance.';
        } else {
          demandExplanation = 'Low demand in 4-hour blocks - review timing and marketing strategy.';
        }
        break;
      case '1D':
        if (avgSales >= 15) {
          demandLevel = 'High';
          demandExplanation = 'High daily demand - fast-moving product. Consider increasing inventory levels.';
        } else if (avgSales >= 8) {
          demandLevel = 'Medium';
          demandExplanation = 'Moderate daily demand - monitor for trends and seasonal changes.';
        } else {
          demandExplanation = 'Low daily demand - needs marketing attention and promotional campaigns.';
        }
        break;
      case '7D':
        if (avgSales >= 105) {
          demandLevel = 'High';
          demandExplanation = 'High weekly demand - excellent weekly performance. Plan for consistent weekly restocking.';
        } else if (avgSales >= 56) {
          demandLevel = 'Medium';
          demandExplanation = 'Moderate weekly demand - monitor weekly patterns for optimization.';
        } else {
          demandExplanation = 'Low weekly demand - review weekly marketing and promotional strategies.';
        }
        break;
      case '1M':
        if (avgSales >= 450) {
          demandLevel = 'High';
          demandExplanation = 'High monthly demand - strong monthly performance. Plan monthly inventory cycles.';
        } else if (avgSales >= 240) {
          demandLevel = 'Medium';
          demandExplanation = 'Moderate monthly demand - track monthly trends for seasonal adjustments.';
        } else {
          demandExplanation = 'Low monthly demand - needs monthly marketing strategy review.';
        }
        break;
      case '3M':
        if (avgSales >= 1350) {
          demandLevel = 'High';
          demandExplanation = 'High quarterly demand - excellent quarterly performance. Plan quarterly business reviews.';
        } else if (avgSales >= 720) {
          demandLevel = 'Medium';
          demandExplanation = 'Moderate quarterly demand - monitor quarterly trends for strategic planning.';
        } else {
          demandExplanation = 'Low quarterly demand - requires quarterly strategy overhaul.';
        }
        break;
      case '1Y':
        if (avgSales >= 5400) {
          demandLevel = 'High';
          demandExplanation = 'High annual demand - outstanding yearly performance. Plan annual growth strategies.';
        } else if (avgSales >= 2880) {
          demandLevel = 'Medium';
          demandExplanation = 'Moderate annual demand - track yearly trends for long-term planning.';
        } else {
          demandExplanation = 'Low annual demand - needs annual strategy review and market analysis.';
        }
        break;
      default:
        if (avgSales >= 15) {
          demandLevel = 'High';
          demandExplanation = 'High demand product - consider increasing inventory.';
        } else if (avgSales >= 8) {
          demandLevel = 'Medium';
          demandExplanation = 'Moderate demand - monitor closely for trends.';
        } else {
          demandExplanation = 'Low demand - needs marketing attention.';
        }
    }
    
    // Analyze forecast accuracy
    let accuracyExplanation = '';
    if (accuracy && accuracy.accuracy_percentage) {
      const acc = Number(accuracy.accuracy_percentage);
      if (acc >= 90) {
        accuracyExplanation = 'Excellent! Our predictions are very reliable for this product.';
      } else if (acc >= 75) {
        accuracyExplanation = 'Good predictions. The forecast is reasonably accurate.';
      } else if (acc >= 50) {
        accuracyExplanation = 'Fair predictions. Consider reviewing the data or model.';
      } else {
        accuracyExplanation = 'Poor predictions. The forecast may not be reliable.';
      }
    }
    
    // Analyze profit potential
    const profitMargin = ((Number(target.unit_price || 0) - Number(target.cost_price || 0)) / Number(target.unit_price || 1)) * 100;
    let profitExplanation = '';
    if (profitMargin > 30) {
      profitExplanation = 'High profit margin. This product is very profitable.';
    } else if (profitMargin > 15) {
      profitExplanation = 'Good profit margin. This product is profitable.';
    } else {
      profitExplanation = 'Low profit margin. Consider reviewing pricing strategy.';
    }
    
    // Generate timeframe-specific recommendations
    const recommendations = [];
    
    // Timeframe-specific recommendations
    switch (timeframe) {
      case '1H':
        if (demandLevel === 'High') {
          recommendations.push('Schedule extra staff during peak hours');
          recommendations.push('Ensure adequate inventory for high-demand hours');
          recommendations.push('Consider promotional pricing during off-peak hours');
        } else if (demandLevel === 'Low') {
          recommendations.push('Implement hourly promotions during slow periods');
          recommendations.push('Review product placement and visibility');
          recommendations.push('Consider bundling with popular items');
        }
        break;
      case '4H':
        if (demandLevel === 'High') {
          recommendations.push('Plan shift-based inventory management');
          recommendations.push('Optimize staff scheduling for high-demand periods');
          recommendations.push('Consider bulk pricing for shift-based sales');
        } else if (demandLevel === 'Low') {
          recommendations.push('Implement 4-hour promotional campaigns');
          recommendations.push('Review shift-based marketing strategies');
          recommendations.push('Consider time-limited offers');
        }
        break;
      case '1D':
        if (demandLevel === 'High') {
          recommendations.push('Increase daily inventory levels');
          recommendations.push('Implement daily restocking procedures');
          recommendations.push('Consider daily promotional campaigns');
        } else if (demandLevel === 'Low') {
          recommendations.push('Launch daily promotional campaigns');
          recommendations.push('Review daily marketing strategies');
          recommendations.push('Consider daily bundle offers');
        }
        break;
      case '7D':
        if (demandLevel === 'High') {
          recommendations.push('Plan weekly inventory cycles');
          recommendations.push('Implement weekly promotional strategies');
          recommendations.push('Schedule weekly performance reviews');
        } else if (demandLevel === 'Low') {
          recommendations.push('Launch weekly promotional campaigns');
          recommendations.push('Review weekly marketing calendar');
          recommendations.push('Consider weekly loyalty programs');
        }
        break;
      case '1M':
        if (demandLevel === 'High') {
          recommendations.push('Plan monthly inventory procurement');
          recommendations.push('Implement monthly promotional calendars');
          recommendations.push('Schedule monthly business reviews');
        } else if (demandLevel === 'Low') {
          recommendations.push('Develop monthly marketing campaigns');
          recommendations.push('Review monthly pricing strategies');
          recommendations.push('Consider monthly subscription models');
        }
        break;
      case '3M':
        if (demandLevel === 'High') {
          recommendations.push('Plan quarterly inventory strategies');
          recommendations.push('Implement quarterly promotional campaigns');
          recommendations.push('Schedule quarterly business planning');
        } else if (demandLevel === 'Low') {
          recommendations.push('Develop quarterly marketing strategies');
          recommendations.push('Review quarterly pricing models');
          recommendations.push('Consider quarterly market analysis');
        }
        break;
      case '1Y':
        if (demandLevel === 'High') {
          recommendations.push('Plan annual growth strategies');
          recommendations.push('Implement yearly promotional calendars');
          recommendations.push('Schedule annual business planning');
        } else if (demandLevel === 'Low') {
          recommendations.push('Develop annual marketing strategies');
          recommendations.push('Review yearly pricing models');
          recommendations.push('Consider annual market repositioning');
        }
        break;
    }
    
    // Profit-based recommendations
    if (profitMargin > 20) {
      recommendations.push('High profit margin - consider expanding this product line');
    } else if (profitMargin < 15) {
      recommendations.push('Low profit margin - review cost structure and pricing');
      recommendations.push('Consider negotiating better supplier terms');
    }
    
    // Trend-based recommendations
    if (salesTrend === 'decreasing') {
      recommendations.push('Sales are declining - investigate market conditions');
      recommendations.push('Consider promotional campaigns to reverse the trend');
    } else if (salesTrend === 'increasing') {
      recommendations.push('Sales are growing - maintain current strategy');
      recommendations.push('Consider expanding inventory to meet growing demand');
    }
    
    return {
      demandLevel,
      demandExplanation,
      accuracyExplanation,
      profitExplanation,
      recommendations,
      timeframeContext,
      keyMetrics: {
        averageSales: Math.round(avgSales),
        salesTrend,
        volatility: Math.round(volatility),
        profitMargin: Math.round(profitMargin)
      }
    };
  }, [timeframe, accuracy]);
  
  // Update analysis when target or timeframe changes
  useEffect(() => {
    if (selectedTarget) {
      const analysis = analyzeChart(selectedTarget);
      setAnalysisData(analysis);
    }
  }, [selectedTarget, timeframe, analyzeChart]);
  
  // Generate realistic sales and demand data for pharmacy forecasting
  const generateSalesForecastData = (target, timeframe = '1M') => {
    if (!target) return [];
    // If true historical exists for timeframe, use it directly for accuracy
    const key = historicalKey(target, timeframe);
    const hist = historicalCache[key];
    if (Array.isArray(hist) && hist.length > 0) {
      const fallbackPrice = Number(target.unit_price) || 0;
      const fallbackCost = Number(target.cost_price) || 0;
      const mapped = hist.map(item => {
        const dateObj = parseLocalISODate(item.date);
        const qty = Number(item.quantity) || 0;
        const revenue = item.revenue != null ? Number(item.revenue) : qty * fallbackPrice;
        const cost = item.cost != null ? Number(item.cost) : qty * fallbackCost;
        const profit = revenue - cost;
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
        return {
          date: dateObj,
          timestamp: dateObj.getTime(),
          sales: qty,
          revenue: Math.round(revenue * 100) / 100,
          cost: Math.round(cost * 100) / 100,
          profit: Math.round(profit * 100) / 100,
          profitMargin: Math.round(profitMargin * 100) / 100,
          unitPrice: fallbackPrice,
          unitCost: fallbackCost,
          demandLevel: qty > 15 ? 'High' : qty >= 8 ? 'Medium' : 'Low',
          profitLevel: profitMargin > 30 ? 'High' : profitMargin > 15 ? 'Medium' : 'Low',
          salesChange: 0,
          profitChange: 0
        };
      });
      // Ensure strictly ascending order by date
      mapped.sort((a, b) => a.timestamp - b.timestamp);
      return mapped;
    }

    // Use aggregated real features when no per-day history returned
    const baseSales = Number(target.avg_daily_sales) || 0;
    const basePrice = Number(target.unit_price) || 0;
    const baseCost = Number(target.cost_price) || 0;
    
    // If no real data, use minimal defaults based on product type
    if (baseSales === 0) {
      // Use a small default based on product name patterns
      const name = target.name.toLowerCase();
      if (name.includes('tablet') || name.includes('capsule')) {
        return generateDefaultData(5, basePrice || 50, baseCost || 30, timeframe);
      } else if (name.includes('syrup') || name.includes('suspension')) {
        return generateDefaultData(3, basePrice || 80, baseCost || 50, timeframe);
      } else {
        return generateDefaultData(2, basePrice || 100, baseCost || 70, timeframe);
      }
    }
    
    const data = [];
    const startDate = new Date();
    
    // Calculate period based on timeframe
    let days;
    let intervalDays;
    switch (timeframe) {
      case '1H':
        days = 7;
        intervalDays = 0.04; // ~1 hour
        break;
      case '4H':
        days = 14;
        intervalDays = 0.17; // ~4 hours
        break;
      case '1D':
        days = 30;
        intervalDays = 1;
        break;
      case '7D':
        days = 90;
        intervalDays = 1;
        break;
      case '1M':
        days = 90;
        intervalDays = 1;
        break;
      case '3M':
        days = 180;
        intervalDays = 1;
        break;
      case '1Y':
        days = 365;
        intervalDays = 1;
        break;
      default:
        days = 30;
        intervalDays = 1;
    }
    
    startDate.setDate(startDate.getDate() - days);
    
    // Generate realistic pharmacy sales patterns based on actual data
    const generateSalesPattern = (i, totalDays) => {
      const dayOfWeek = i % 7;
      const weekOfMonth = Math.floor(i / 7) % 4;
      const monthOfYear = Math.floor(i / 30) % 12;
      
      // Weekend effect (lower sales on weekends) - realistic for pharmacy
      const weekendEffect = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.8 : 1.0;
      
      // Monthly pattern (slight variation) - based on real pharmacy patterns
      const monthlyEffect = 1 + 0.05 * Math.sin((weekOfMonth - 1) * Math.PI / 2);
      
      // Seasonal effect (flu season, winter boost) - realistic for pharmacy
      const seasonalEffect = 1 + 0.1 * Math.sin((monthOfYear - 2) * Math.PI / 6);
      
      // Trend effect (very gradual growth) - realistic business growth
      const trendEffect = 1 + (i / totalDays) * 0.05;
      
      // Minimal random variation (pharmacy sales are stable)
      const randomEffect = 0.98 + Math.random() * 0.04; // Only ±2% variation
      
      // Heavy smoothing for realistic pharmacy data
      const smoothingFactor = 0.8;
      const basePattern = weekendEffect * monthlyEffect * seasonalEffect * trendEffect;
      const smoothedPattern = basePattern * smoothingFactor + (basePattern * randomEffect) * (1 - smoothingFactor);
      
      return smoothedPattern;
    };
    
    const totalDays = Math.ceil(days / intervalDays);
    
    // Generate raw sales data first
    const rawSalesData = [];
    for (let i = 0; i < totalDays; i++) {
      const pattern = generateSalesPattern(i, totalDays);
      const dailySales = Math.max(0, Math.round(baseSales * pattern));
      rawSalesData.push(dailySales);
    }
    
    // Apply moving average smoothing to reduce volatility
    const smoothedSalesData = [];
    const windowSize = Math.min(3, Math.floor(totalDays / 10)); // Adaptive window size
    
    for (let i = 0; i < totalDays; i++) {
      let sum = 0;
      let count = 0;
      
      // Calculate moving average
      for (let j = Math.max(0, i - windowSize); j <= Math.min(totalDays - 1, i + windowSize); j++) {
        sum += rawSalesData[j];
        count++;
      }
      
      const smoothedSales = Math.round(sum / count);
      smoothedSalesData.push(smoothedSales);
    }
    
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + (i * intervalDays));
      
      // Use smoothed sales data
      const dailySales = smoothedSalesData[i];
      // Prices are stable in pharmacy - minimal variation
      const unitPrice = basePrice; // Keep prices stable
      const unitCost = baseCost; // Keep costs stable
      
      const revenue = dailySales * unitPrice;
      const cost = dailySales * unitCost;
      const profit = revenue - cost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      // Generate demand indicators
      const demandLevel = dailySales > baseSales * 1.2 ? 'High' : 
                         dailySales > baseSales * 0.8 ? 'Medium' : 'Low';
      
      const profitLevel = profitMargin > 30 ? 'High' : 
                         profitMargin > 15 ? 'Medium' : 'Low';
      
      data.push({
        date: date,
        timestamp: date.getTime(),
        sales: dailySales,
        revenue: Math.round(revenue * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
        unitPrice: Math.round(unitPrice * 100) / 100,
        unitCost: Math.round(unitCost * 100) / 100,
        demandLevel,
        profitLevel,
        // For comparison with previous periods (smoothed)
        salesChange: i > 7 && data[i-7] ? Math.max(-50, Math.min(50, ((dailySales - data[i-7].sales) / data[i-7].sales) * 100)) : 0,
        profitChange: i > 7 && data[i-7] ? Math.max(-50, Math.min(50, ((profit - data[i-7].profit) / data[i-7].profit) * 100)) : 0
      });
    }
    
    return data;
  };

  // Calculate comprehensive technical indicators
  const calculateIndicators = (data) => {
    if (!data || data.length === 0) return {};
    
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const timestamps = data.map(d => d.timestamp);
    
    // Simple Moving Average
    const sma = (period) => {
      const result = [];
      for (let i = period - 1; i < closes.length; i++) {
        const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push({
          value: sum / period,
          timestamp: timestamps[i]
        });
      }
      return result;
    };
    
    // Exponential Moving Average
    const ema = (period) => {
      const result = [];
      const multiplier = 2 / (period + 1);
      result[0] = { value: closes[0], timestamp: timestamps[0] };
      for (let i = 1; i < closes.length; i++) {
        const value = (closes[i] * multiplier) + (result[i - 1].value * (1 - multiplier));
        result.push({ value, timestamp: timestamps[i] });
      }
      return result;
    };
    
    // RSI
    const rsi = (period = 14) => {
      const gains = [];
      const losses = [];
      
      for (let i = 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
      }
      
      const result = [];
      for (let i = period - 1; i < gains.length; i++) {
        const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const rs = avgGain / (avgLoss || 0.001);
        const rsiValue = 100 - (100 / (1 + rs));
        result.push({ value: rsiValue, timestamp: timestamps[i] });
      }
      
      return result;
    };
    
    // MACD
    const macd = () => {
      const ema12 = ema(12).map(d => d.value);
      const ema26 = ema(26).map(d => d.value);
      const result = [];
      
      for (let i = 25; i < closes.length; i++) {
        const macdLine = ema12[i] - ema26[i];
        result.push({ value: macdLine, timestamp: timestamps[i] });
      }
      
      return result;
    };
    
    return {
      sma20: sma(20),
      ema12: ema(12),
      ema26: ema(26),
      rsi14: rsi(14),
      macd: macd(),
      volume: volumes.map((v, i) => ({ value: v, timestamp: timestamps[i] }))
    };
  };

  // Generate candlestick data
  const generateCandlestickData = (timeSeriesData) => {
    return timeSeriesData.map(d => ({
      x: d.date,
      o: d.open,
      h: d.high,
      l: d.low,
      c: d.close
    }));
  };

  // Generate multi-axis chart data for sales forecasting
  const generateMultiAxisData = (target) => {
    if (!target) return null;
    
    const salesData = generateSalesForecastData(target, timeframe);
    
    // Debug: Check if we have data
    console.log('Sales data for chart:', salesData);
    
    if (!salesData || salesData.length === 0) {
      console.log('No sales data available, generating sample data');
      // Generate sample data for testing
      const sampleData = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        sampleData.push({
          date: date,
          sales: Math.floor(Math.random() * 20) + 5,
          revenue: Math.floor(Math.random() * 200) + 50,
          profit: Math.floor(Math.random() * 100) + 20
        });
      }
      const sampleLabels = sampleData.map(d => d.date);
      const sampleSales = sampleData.map(d => d.sales);
      const sampleRevenue = sampleData.map(d => d.revenue);
      const sampleProfit = sampleData.map(d => d.profit);
      
      return {
        labels: sampleLabels,
        datasets: [
          {
            label: 'Daily Sales (Units)',
            type: 'line',
            data: sampleSales,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1,
            pointRadius: 2,
            yAxisID: 'y'
          },
          {
            label: 'Revenue (₱)',
            type: 'bar',
            data: sampleRevenue,
            backgroundColor: 'rgba(16, 185, 129, 0.6)',
            borderColor: '#10B981',
            borderWidth: 1,
            yAxisID: 'y1'
          },
          {
            label: 'Profit (₱)',
            type: 'line',
            data: sampleProfit,
            borderColor: '#F59E0B',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            yAxisID: 'y1'
          }
        ]
      };
    }
    
    // Ensure labels are ascending by timestamp
    const labels = salesData.map(d => d.date);
    const sales = salesData.map(d => d.sales);
    const revenue = salesData.map(d => d.revenue);
    const profit = salesData.map(d => d.profit);
    const profitMargin = salesData.map(d => d.profitMargin);
    const salesChange = salesData.map(d => d.salesChange);

    // Prepare forecast overlay if available
    let extendedLabels = labels;
    let forecastValues = [];
    const hasForecastValues = forecasts && Array.isArray(forecasts.values) && forecasts.values.length > 0;
    const hasMatchingDates = hasForecastValues && Array.isArray(forecasts.dates) && forecasts.dates.length === forecasts.values.length;
    if (hasForecastValues) {
      // If dates are provided and match length, use them. Otherwise synthesize future dates.
      if (hasMatchingDates) {
        const forecastDatesAsDate = forecasts.dates.map(ds => parseLocalISODate(ds));
        extendedLabels = labels.concat(forecastDatesAsDate);
      } else {
        // Synthesize forecast dates continuing from the last historical label
        const lastLabel = labels[labels.length - 1] instanceof Date ? labels[labels.length - 1] : parseLocalISODate(labels[labels.length - 1]);
        const syntheticDates = [];
        const startDate = !isNaN(lastLabel?.getTime()) ? new Date(lastLabel) : new Date();
        for (let i = 1; i <= forecasts.values.length; i++) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          syntheticDates.push(d);
        }
        extendedLabels = labels.concat(syntheticDates);
      }
      forecastValues = forecasts.values.slice();
    }
    
    // Simple SMA for Sales Trend (period 7 by default)
    const smaPeriod = 7;
    const salesSMA = sales.map((_, i) => {
      if (i < smaPeriod - 1) return null;
      const window = sales.slice(i - smaPeriod + 1, i + 1);
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      return Math.round(avg);
    });
    
    // Build comprehensive forecasting datasets
    // Helper to pad arrays with nulls to align with extendedLabels
    const padWithNulls = (arr, padCount) => arr.concat(Array(padCount).fill(null));

    const historicalPadCount = hasForecastValues ? (forecasts.values.length) : 0;
    const datasets = [
      {
        label: 'Daily Sales (Units)',
        type: 'line',
        data: hasForecastValues ? padWithNulls(sales, historicalPadCount) : sales,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 2,
        yAxisID: 'y'
      },
      {
        label: 'SMA(7)',
        type: 'line',
        data: hasForecastValues ? padWithNulls(salesSMA, historicalPadCount) : salesSMA,
        borderColor: '#60A5FA',
        backgroundColor: 'transparent',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        yAxisID: 'y'
      },
      {
        label: 'Profit (₱)',
        type: 'line',
        data: hasForecastValues ? padWithNulls(profit, historicalPadCount) : profit,
        borderColor: '#F59E0B',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: 'y1'
      },
      {
        label: 'Revenue (₱)',
        type: 'bar',
        data: hasForecastValues ? padWithNulls(revenue, historicalPadCount) : revenue,
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: '#10B981',
        borderWidth: 1,
        yAxisID: 'y1'
      }
    ];

    // Append forecast dataset as a dashed line on the future segment
    if (hasForecastValues) {
      const forecastDataArray = Array(labels.length).fill(null).concat(forecastValues);
      datasets.push({
        label: 'Forecast (Units)',
        type: 'line',
        data: forecastDataArray,
        borderColor: '#A855F7',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 6],
        pointRadius: 0,
        yAxisID: 'y'
      });
    }
    
    return { labels: hasForecastValues ? extendedLabels : labels, datasets };
  };

  // Generate Chart.js data for sales forecasting analysis
  const generateChartData = (target) => {
    if (!target) return null;
    
    const salesData = generateSalesForecastData(target, timeframe);
    const indicators = calculateIndicators(salesData);
    
    const labels = salesData.map(d => d.date);
    const sales = salesData.map(d => d.sales);
    const revenue = salesData.map(d => d.revenue);
    const profit = salesData.map(d => d.profit);
    const profitMargin = salesData.map(d => d.profitMargin);
    
    // Main sales chart data
    const salesChartData = {
      labels: labels,
      datasets: [
        {
          label: 'Daily Sales (Units)',
          data: sales,
          borderColor: false ? '#3B82F6' : '#2563EB',
          backgroundColor: false ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: false ? '#3B82F6' : '#2563EB',
          pointBorderColor: false ? '#3B82F6' : '#2563EB',
          yAxisID: 'y'
        },
        {
          label: 'Profit (₱)',
          data: profit,
          borderColor: false ? '#F59E0B' : '#D97706',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: 'y1'
        },
        {
          label: 'Revenue (₱)',
          data: revenue,
          borderColor: false ? '#10B981' : '#059669',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          yAxisID: 'y1'
        }
      ]
    };
    
    // Add technical indicators if enabled
    if (indicators.sma20 && indicators.sma20.length > 0) {
      const smaLabels = indicators.sma20.map(d => new Date(d.timestamp));
      const smaData = indicators.sma20.map(d => d.value);
      
      salesChartData.datasets.push({
        label: 'SMA (20)',
        data: smaData,
        borderColor: '#3B82F6',
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 2,
        borderDash: [5, 5],
        yAxisID: 'y'
      });
    }
    
    if (indicators.ema12 && indicators.ema12.length > 0) {
      const emaLabels = indicators.ema12.map(d => new Date(d.timestamp));
      const emaData = indicators.ema12.map(d => d.value);
      
      salesChartData.datasets.push({
        label: 'EMA (12)',
        data: emaData,
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 2,
        yAxisID: 'y'
      });
    }
    
    // Volume chart data
    const volumeChartData = {
      labels: labels,
      datasets: [
        {
          label: 'Volume (Units)',
          data: salesData.map(d => Number(d.sales) || 0),
          backgroundColor: false ? 'rgba(139, 92, 246, 0.6)' : 'rgba(139, 92, 246, 0.4)',
          borderColor: false ? '#8B5CF6' : '#7C3AED',
          borderWidth: 1
        }
      ]
    };
    
    
    
    return {
      sales: salesChartData,
      volume: volumeChartData,
      indicators: indicators
    };
  };

  // Generate sample forecast data for demonstration
  const generateSampleForecast = (target) => {
    if (!target) {
      return {
        forecasts: [],
        accuracy: 0,
        message: 'No target selected'
      };
    }
    
    const baseValue = Number(target.avg_daily_sales) || 10;
    const forecasts = [];
    
    for (let i = 0; i < 30; i++) {
      // Add some realistic variation
      const trend = Math.sin(i * 0.2) * 0.3;
      const random = (Math.random() - 0.5) * 0.4;
      const value = Math.max(1, Math.round(baseValue * (1 + trend + random)));
      forecasts.push(value);
    }
    
    return {
      forecasts: forecasts || [],
      accuracy: Number(accuracy?.accuracy_percentage) || (85 + Math.random() * 10), // Use real accuracy or fallback
      message: `Sample forecast for ${target.name}`
    };
  };

  // Build a simple baseline forecast from product metrics when backend is unavailable
  const buildSyntheticForecast = (target, days) => {
    const base = Math.max(1, Math.round(Number(target?.avg_daily_sales || 0)));
    const values = [];
    for (let i = 0; i < days; i++) {
      const season = 1 + 0.05 * Math.sin((2 * Math.PI * i) / 7);
      const noise = 0.95 + Math.random() * 0.1;
      values.push(Math.max(0, Math.round(base * season * noise)));
    }
    const start = new Date();
    const dates = Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i + 1);
      return d.toISOString().slice(0, 10);
    });
    return { values, dates };
  };

  return (
    <div className={`${false ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Pharmacy Business Intelligence Header */}
      <div className={`${false ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-4 flex-wrap gap-3 min-w-0">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className={`text-xl font-bold truncate ${false ? 'text-white' : 'text-gray-900'}`}>
                    Pharmacy Demand Analysis
                  </h1>
                  <p className={`text-sm truncate ${false ? 'text-gray-400' : 'text-gray-600'}`}>
                    Sales Forecasting & Inventory Intelligence
                  </p>
                </div>
              </div>
              
              {/* Product Search + Target Selector */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {selectedType === 'product' && (
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search product..."
                    className={`px-3 py-2 rounded-lg border w-full sm:w-56 ${
                      false
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500`}
                  />
                )}
                <select
                  value={selectedTarget?.id || ''}
                  onChange={(e) => {
                    const target = getAvailableTargets().find(t => t.id == e.target.value);
                    setSelectedTarget(target);
                  }}
                  className={`px-3 py-2 rounded-lg border w-full sm:w-72 max-w-full ${
                    false 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">
                    Select Product
                  </option>
                  {getAvailableTargets()
                    .filter(t => productSearch.trim() === '' || (t.name || '').toLowerCase().includes(productSearch.toLowerCase()))
                    .map(target => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                      {target.category_name && ` (${target.category_name})`}
                      {` - ${Math.round(Number(target.avg_daily_sales) || 0)} daily sales`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Chart Controls */}
            {/* Removed dark mode toggle to declutter */}
          </div>
        </div>
      </div>

      {/* Medicine Analysis Header */}
      {selectedTarget && (
        <div className={`${false ? 'bg-gray-800' : 'bg-white'} border-b border-gray-200`}>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Medicine Info */}
              <div className="flex items-center space-x-6">
                <div className="flex items-center gap-3">
                  <h2 className={`text-2xl font-bold ${false ? 'text-white' : 'text-gray-900'}`}>
                    {selectedTarget.name}
                  </h2>
                  <p className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedTarget.category_name || 'Medicine'} • {timeframe} Analysis
                  </p>
                  {/* Actual unit price chip */}
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${false ? 'bg-gray-700 text-green-300' : 'bg-green-100 text-green-700'}`}>
                    Unit Price: ₱{Number(selectedTarget.unit_price || 0).toFixed(2)}
                  </span>
                </div>
                
                {/* Sales Performance Metrics */}
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${false ? 'text-white' : 'text-gray-900'}`}>
                      {Math.round(Number(selectedTarget.avg_daily_sales || 10))}
                    </div>
                    <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Daily Sales</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${false ? 'text-green-400' : 'text-green-500'}`}>
                      ₱{(Number(selectedTarget.avg_daily_sales || 0) * Number(selectedTarget.unit_price || 0)).toFixed(2)}
                    </div>
                    <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Daily Revenue</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${false ? 'text-blue-400' : 'text-blue-500'}`}>
                      ₱{(Number(selectedTarget.avg_daily_sales || 0) * (Number(selectedTarget.unit_price || 0) - Number(selectedTarget.cost_price || 0))).toFixed(2)}
                    </div>
                    <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Daily Profit</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      Number(selectedTarget.avg_daily_sales || 10) > 15 ? (false ? 'text-green-400' : 'text-green-500') : 
                      Number(selectedTarget.avg_daily_sales || 10) > 8 ? (false ? 'text-yellow-400' : 'text-yellow-500') : (false ? 'text-red-400' : 'text-red-500')
                    }`}>
                      {Number(selectedTarget.avg_daily_sales || 10) > 15 ? 'Fast' : 
                       Number(selectedTarget.avg_daily_sales || 10) > 8 ? 'Medium' : 'Slow'}
                    </div>
                    <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Moving</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      (Number(accuracy?.accuracy_percentage) || 0) >= 90 ? (false ? 'text-green-400' : 'text-green-500') :
                      (Number(accuracy?.accuracy_percentage) || 0) >= 80 ? (false ? 'text-yellow-400' : 'text-yellow-500') :
                      (Number(accuracy?.accuracy_percentage) || 0) >= 70 ? (false ? 'text-orange-400' : 'text-orange-500') : (false ? 'text-red-400' : 'text-red-500')
                    }`}>
                      {accuracy?.accuracy_percentage ? `${Number(accuracy.accuracy_percentage).toFixed(0)}%` : '0%'}
                    </div>
                    <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Accuracy</div>
                  </div>
                </div>
              </div>
              
              {/* Analysis Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAnalyzer(!showAnalyzer)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                  title="Chart Analyzer"
                >
                  📊 {showAnalyzer ? 'Hide' : 'Show'} Analyzer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chart Interface */}
      <div className={`${false ? 'bg-gray-900' : 'bg-white'}`}>
        {/* Analysis Toolbar */}
        <div className={`${false ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 py-3`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Time Period Selector */}
            <div className="flex items-center space-x-1 flex-wrap gap-2">
              {[
                { value: '1D', label: '1 Day', desc: 'Daily' },
                { value: '7D', label: '7 Days', desc: 'Weekly' },
                { value: '1M', label: '1 Month', desc: 'Monthly' },
                { value: '3M', label: '3 Months', desc: 'Quarterly' },
                { value: '1Y', label: '1 Year', desc: 'Yearly' },
                { value: 'MAX', label: 'Max', desc: 'All Data' }
              ].map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    timeframe === tf.value
                      ? 'bg-blue-600 text-white shadow-lg'
                      : false
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700 hover:shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 hover:shadow-md'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
            
            {/* Chart Type Selector removed - using single optimized chart */}
            
            {/* Analysis Indicators removed - not functional for forecasting */}
          </div>
        </div>
        
        {/* Main Chart Area */}
        <div className={`${false ? 'bg-gray-900' : 'bg-white'} relative`}>
          {selectedTarget ? (
            <div className="space-y-4">
              {/* Forecast Chart Container */}
              <div className={`h-[500px] ${false ? 'bg-gray-900' : 'bg-white'} border border-gray-200 rounded-lg relative`}>
                {/* Fullscreen Button */}
                <button
                  onClick={openFullscreen}
                  className={`absolute top-2 right-2 z-10 px-3 py-1 text-xs rounded-lg ${false ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  title="Fullscreen"
                >
                  ⛶ Fullscreen
                </button>
                <div className="h-full p-4">
                  <Line
                    ref={chartRef}
                    data={generateMultiAxisData(selectedTarget) || { labels: [], datasets: [] }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: {
                          padding: {
                            top: 10,
                            bottom: 10,
                            left: 10,
                            right: 10
                          }
                        },
                        interaction: {
                          intersect: false,
                          mode: 'index'
                        },
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                            labels: {
                              color: false ? '#ffffff' : '#374151',
                              usePointStyle: true,
                              padding: 20
                            }
                          },
                          zoom: {
                            zoom: {
                              wheel: {
                                enabled: false,
                              },
                              pinch: {
                                enabled: false
                              },
                              mode: 'x',
                              drag: {
                                enabled: true,
                                backgroundColor: 'rgba(54, 162, 235, 0.3)',
                                borderColor: 'rgba(54, 162, 235, 0.8)',
                                borderWidth: 1,
                              }
                            },
                            pan: {
                              enabled: false,
                              mode: 'x',
                            }
                          },
                          tooltip: {
                            backgroundColor: false ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                            titleColor: false ? '#ffffff' : '#374151',
                            bodyColor: false ? '#ffffff' : '#374151',
                            borderColor: false ? '#374151' : '#e5e7eb',
                            borderWidth: 1,
                            callbacks: {
                              title: (context) => {
                                const raw = context?.[0]?.label;
                                const date = raw instanceof Date ? raw : parseLocalISODate(raw);
                                if (isNaN(date.getTime())) return '';
                                const opts = (timeframe === 'MAX' || timeframe === '1Y')
                                  ? { year: 'numeric', month: 'short', day: 'numeric' }
                                  : { month: 'short', day: 'numeric' };
                                return date.toLocaleDateString('en-US', opts);
                              },
                              label: (context) => {
                                const y = context?.parsed?.y;
                                if (y === null || y === undefined || Number.isNaN(y)) return '';
                                const label = context.dataset.label || '';
                                if (label === 'Daily Sales (Units)' || label === 'Forecast (Units)') {
                                  return `Sales: ${Number(y).toFixed(0)} units`;
                                } else if (label === 'Revenue (₱)') {
                                  return `Revenue: ₱${Number(y).toFixed(2)}`;
                                } else if (label === 'Profit (₱)') {
                                  return `Profit: ₱${Number(y).toFixed(2)}`;
                                } else if (label === 'Sales Change (%)') {
                                  return `Change: ${Number(y).toFixed(1)}%`;
                                }
                                return `${label}: ${Number(y).toFixed(2)}`;
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            type: 'category',
                            grid: {
                              color: false ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                              drawBorder: false
                            },
                            ticks: {
                              color: false ? '#9ca3af' : '#6b7280',
                              maxTicksLimit: 8,
                              callback: function(value, index) {
                                const lbl = (this && this.chart && this.chart.data && this.chart.data.labels) ? this.chart.data.labels[index] : null;
                                const date = lbl instanceof Date ? lbl : parseLocalISODate(lbl || Date.now());
                                if (timeframe === '1H') {
                                  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                } else if (timeframe === '4H') {
                                  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                } else {
                                  const opts = (timeframe === 'MAX' || timeframe === '1Y')
                                    ? { year: 'numeric', month: 'short', day: 'numeric' }
                                    : { month: 'short', day: 'numeric' };
                                  return date.toLocaleDateString('en-US', opts);
                                }
                              }
                            }
                          },
                          y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            grid: {
                              color: false ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                              drawBorder: false
                            },
                            ticks: {
                              color: false ? '#9ca3af' : '#6b7280',
                              callback: function(value) {
                                return '₱' + value.toFixed(2);
                              }
                            }
                          },
                          y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                              drawOnChartArea: false,
                            },
                            ticks: {
                              color: false ? '#9ca3af' : '#6b7280',
                              callback: function(value) {
                                return value > 1000 ? (value/1000).toFixed(1) + 'K' : value;
                              }
                            }
                          },
                        },
                        elements: {
                          point: {
                            radius: 0,
                            hoverRadius: 6
                          }
                        }
                      }}
                    />
                </div>
              </div>
              
              {/* Volume Chart Container */}
              <div className={`h-[120px] ${false ? 'bg-gray-900' : 'bg-white'} border border-gray-200 rounded-lg`}>
                <div className="h-full p-4">
                  {volumeData && volumeData.labels && volumeData.labels.length > 0 ? (
                    <Bar
                      ref={volumeRef}
                      data={volumeData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false
                          },
                          tooltip: {
                            backgroundColor: false ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                            titleColor: false ? '#ffffff' : '#374151',
                            bodyColor: false ? '#ffffff' : '#374151',
                            callbacks: {
                              title: (context) => {
                                const date = new Date(context[0].label);
                                return date.toLocaleDateString();
                              },
                              label: (context) => {
                                return `Volume: ${context.parsed.y.toLocaleString()}`;
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            type: 'category',
                            grid: {
                              display: false
                            },
                            ticks: {
                              display: true,
                              color: false ? '#9ca3af' : '#6b7280',
                              font: {
                                size: 10
                              },
                              maxTicksLimit: 8,
                              callback: function(value, index) {
                                const salesData = generateSalesForecastData(selectedTarget, timeframe);
                                const date = new Date(salesData[index]?.date || new Date());
                                if (timeframe === '1H') {
                                  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                } else if (timeframe === '4H') {
                                  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                } else {
                                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                }
                              }
                            }
                          },
                          y: {
                            grid: {
                              display: true,
                              color: false ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                              drawBorder: false
                            },
                            ticks: {
                              color: false ? '#9ca3af' : '#6b7280',
                              font: {
                                size: 10
                              },
                              callback: function(value) {
                                return value > 1000 ? (value/1000).toFixed(1) + 'K' : value;
                              }
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className={`h-full flex items-center justify-center text-sm ${false ? 'text-gray-400' : 'text-gray-500'}`}>
                      📊 Volume data loading...
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : selectedTarget ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className={`w-16 h-16 mx-auto mb-4 animate-spin ${false ? 'text-gray-600' : 'text-gray-400'}`} />
                <div className={`text-xl font-semibold ${false ? 'text-white' : 'text-gray-900'}`}>
                  Generating Chart Data...
                </div>
                <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>
                  Please wait while we prepare the time series analysis
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className={`w-16 h-16 mx-auto mb-4 ${false ? 'text-gray-600' : 'text-gray-400'}`} />
                <div className={`text-xl font-semibold ${false ? 'text-white' : 'text-gray-900'}`}>
                  Select a Product to View Chart
                </div>
                <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>
                  Choose from the dropdown above to start analyzing
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Technical Indicators Panel */}
      {selectedTarget && technicalData && (
        <div className={`${false ? 'bg-gray-800' : 'bg-white'} border-t border-gray-200 mt-4`}>
          <div className="px-6 py-4">
            <div className="mb-4">
              <h3 className={`text-xl font-bold ${false ? 'text-white' : 'text-gray-900'}`}>
                📊 Technical Analysis
              </h3>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* RSI Chart */}
              <div className="w-full">
                <h4 className={`text-base font-semibold mb-4 ${false ? 'text-gray-200' : 'text-gray-700'}`}>
                  📈 RSI (14) - Relative Strength Index
                </h4>
                <div className={`h-72 rounded-lg p-3 border ${false ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  {technicalData.rsi14 && technicalData.rsi14.length > 0 ? (
                    <Line
                      data={{
                        labels: technicalData.rsi14.map(d => new Date(d.timestamp)),
                        datasets: [
                          {
                            label: 'RSI',
                            data: technicalData.rsi14.map(d => d.value),
                            borderColor: '#8B5CF6',
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.1,
                            pointRadius: 0
                          },
                          {
                            label: 'Overbought (70)',
                            data: Array(technicalData.rsi14.length).fill(70),
                            borderColor: '#EF4444',
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderDash: [5, 5],
                            pointRadius: 0
                          },
                          {
                            label: 'Oversold (30)',
                            data: Array(technicalData.rsi14.length).fill(30),
                            borderColor: '#10B981',
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderDash: [5, 5],
                            pointRadius: 0
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        aspectRatio: 3,
                        plugins: {
                          legend: {
                            display: false
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                return `RSI: ${context.parsed.y.toFixed(2)}`;
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            type: 'category',
                            display: false
                          },
                          y: {
                            min: 0,
                            max: 100,
                            grid: {
                              color: false ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                              color: false ? '#9ca3af' : '#6b7280'
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className={`h-full flex items-center justify-center text-lg ${false ? 'text-gray-400' : 'text-gray-500'}`}>
                      📊 No RSI data available
                    </div>
                  )}
                </div>
              </div>
              
              {/* MACD Chart */}
              <div className="w-full">
                <h4 className={`text-base font-semibold mb-4 ${false ? 'text-gray-200' : 'text-gray-700'}`}>
                  📊 MACD - Moving Average Convergence Divergence
                </h4>
                <div className={`h-72 rounded-lg p-3 border ${false ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  {technicalData.macd && technicalData.macd.length > 0 ? (
                    <Line
                      data={{
                        labels: technicalData.macd.map(d => new Date(d.timestamp)),
                        datasets: [
                          {
                            label: 'MACD',
                            data: technicalData.macd.map(d => d.value),
                            borderColor: '#10B981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.1,
                            pointRadius: 0
                          },
                          {
                            label: 'Zero Line',
                            data: Array(technicalData.macd.length).fill(0),
                            borderColor: '#6B7280',
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderDash: [5, 5],
                            pointRadius: 0
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        aspectRatio: 3,
                        plugins: {
                          legend: {
                            display: false
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                return `MACD: ${context.parsed.y.toFixed(4)}`;
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            type: 'category',
                            display: false
                          },
                          y: {
                            grid: {
                              color: false ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                              color: false ? '#9ca3af' : '#6b7280'
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className={`h-full flex items-center justify-center text-lg ${false ? 'text-gray-400' : 'text-gray-500'}`}>
                      📈 No MACD data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sales Analysis Panel */}
      {selectedTarget && (
        <div className={`${false ? 'bg-gray-800' : 'bg-white'} border-t border-gray-200`}>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales Statistics */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${false ? 'text-white' : 'text-gray-900'}`}>
                  Sales Performance
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-3 rounded-lg ${false ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Daily Sales</div>
                    <div className={`text-xl font-bold ${false ? 'text-white' : 'text-gray-900'}`}>
                      {Math.round(Number(selectedTarget.avg_daily_sales || 10))} units
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${false ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Weekly Change</div>
                    <div className={`text-xl font-bold ${false ? 'text-green-400' : 'text-green-500'}`}>+12.5%</div>
                  </div>
                  <div className={`p-3 rounded-lg ${false ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Monthly Revenue</div>
                    <div className={`text-lg font-semibold ${false ? 'text-white' : 'text-gray-900'}`}>
                      ₱{(Number(selectedTarget.avg_daily_sales || 0) * Number(selectedTarget.unit_price || 0) * 30).toFixed(2)}
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${false ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Monthly Profit</div>
                    <div className={`text-lg font-semibold ${false ? 'text-white' : 'text-gray-900'}`}>
                      ₱{(Number(selectedTarget.avg_daily_sales || 0) * (Number(selectedTarget.unit_price || 0) - Number(selectedTarget.cost_price || 0)) * 30).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Demand Analysis */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${false ? 'text-white' : 'text-gray-900'}`}>
                  Demand Analysis
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Demand Level</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      Number(selectedTarget.avg_daily_sales || 10) > 15 
                        ? (false ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700')
                        : Number(selectedTarget.avg_daily_sales || 10) > 8 
                        ? (false ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700')
                        : (false ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700')
                    }`}>
                      {Number(selectedTarget.avg_daily_sales || 10) > 15 ? 'High' : Number(selectedTarget.avg_daily_sales || 10) > 8 ? 'Medium' : 'Low'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Profit Margin</span>
                    <span className={`text-sm font-medium ${
                      ((Number(selectedTarget.unit_price || 15) - Number(selectedTarget.cost_price || 8)) / Number(selectedTarget.unit_price || 15)) * 100 > 30
                        ? (false ? 'text-green-400' : 'text-green-500') : (false ? 'text-yellow-400' : 'text-yellow-500')
                    }`}>
                      {(((Number(selectedTarget.unit_price || 15) - Number(selectedTarget.cost_price || 8)) / Number(selectedTarget.unit_price || 15)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Sales Trend</span>
                    <span className={`text-sm font-medium ${false ? 'text-green-400' : 'text-green-500'}`}>↗ Growing</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Inventory Turnover</span>
                    <span className={`text-sm font-medium ${false ? 'text-white' : 'text-gray-900'}`}>
                      {Math.round(Number(selectedTarget.avg_daily_sales || 10) * 30)}/month
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Sales Forecast */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${false ? 'text-white' : 'text-gray-900'}`}>
                  Sales Forecast
                </h3>
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${false ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Next 7 Days</span>
                      <span className={`text-xs ${false ? 'text-green-400' : 'text-green-500'}`}>↑ Growing</span>
                    </div>
                    <div className={`text-lg font-bold ${false ? 'text-white' : 'text-gray-900'}`}>
                      {Math.round(Number(selectedTarget.avg_daily_sales || 10) * 1.08)} units/day
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${false ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Next 30 Days</span>
                      <span className={`text-xs ${false ? 'text-green-400' : 'text-green-500'}`}>↑ Growing</span>
                    </div>
                    <div className={`text-lg font-bold ${false ? 'text-white' : 'text-gray-900'}`}>
                      {Math.round(Number(selectedTarget.avg_daily_sales || 10) * 1.15)} units/day
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${false ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Forecast Accuracy</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        (Number(accuracy?.accuracy_percentage) || 0) >= 90 ? (false ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700') :
                        (Number(accuracy?.accuracy_percentage) || 0) >= 80 ? (false ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700') :
                        (Number(accuracy?.accuracy_percentage) || 0) >= 70 ? (false ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-700') :
                        (false ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700')
                      }`}>
                        {(Number(accuracy?.accuracy_percentage) || 0) >= 90 ? 'Excellent' :
                         (Number(accuracy?.accuracy_percentage) || 0) >= 80 ? 'Good' :
                         (Number(accuracy?.accuracy_percentage) || 0) >= 70 ? 'Fair' : 'Poor'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${
                        (Number(accuracy?.accuracy_percentage) || 0) >= 90 ? 'bg-green-500' :
                        (Number(accuracy?.accuracy_percentage) || 0) >= 80 ? 'bg-yellow-500' :
                        (Number(accuracy?.accuracy_percentage) || 0) >= 70 ? 'bg-orange-500' : 'bg-red-500'
                      }`} style={{width: `${Math.min(100, Math.max(0, Number(accuracy?.accuracy_percentage) || 0))}%`}} />
                    </div>
                    <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>
                      {accuracy?.accuracy_percentage ? `${Number(accuracy.accuracy_percentage).toFixed(1)}%` : '0%'} Accuracy
                      {accuracy?.accuracy_percentage && (
                        <span className={`ml-2 text-xs ${
                          (Number(accuracy.accuracy_percentage) || 0) >= 90 ? (false ? 'text-green-400' : 'text-green-500') :
                          (Number(accuracy.accuracy_percentage) || 0) >= 80 ? (false ? 'text-yellow-400' : 'text-yellow-500') :
                          (Number(accuracy.accuracy_percentage) || 0) >= 70 ? (false ? 'text-orange-400' : 'text-orange-500') : (false ? 'text-red-400' : 'text-red-500')
                        }`}>
                          ({(Number(accuracy.accuracy_percentage) || 0) >= 90 ? 'Excellent' :
                            (Number(accuracy.accuracy_percentage) || 0) >= 80 ? 'Good' :
                            (Number(accuracy.accuracy_percentage) || 0) >= 70 ? 'Fair' : 'Needs Improvement'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Analyzer Modal */}
      {showAnalyzer && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  📊 Chart Analysis - {selectedTarget?.name || 'Selected Product'}
                </h3>
                <button
                  onClick={() => setShowAnalyzer(false)}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {selectedTarget ? (
                <>
                  {/* Current Chart Condition */}
                  <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                    <h4 className="text-xl font-bold text-blue-900 mb-4">📊 Current Chart Analysis - {timeframe} View</h4>
                    
                    {/* Timeframe Context */}
                    <div className="mb-4 bg-white rounded-lg p-4 border-l-4 border-blue-400">
                      <h5 className="font-semibold text-blue-900 mb-2">📈 Chart Overview</h5>
                      <p className="text-gray-700 text-sm mb-2">
                        <strong>{analysisData?.timeframeContext?.description || 'This chart shows sales performance'}</strong>
                      </p>
                      <p className="text-gray-600 text-xs">
                        {analysisData?.timeframeContext?.analysis || 'Track performance trends over time'}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 mb-2">Sales Performance ({analysisData?.timeframeContext?.period || 'daily'})</h5>
                        <p className="text-gray-700 text-sm">
                          Your product is selling <strong>{analysisData?.keyMetrics?.averageSales || Math.round(Number(selectedTarget.avg_daily_sales || 0))} units {analysisData?.timeframeContext?.unit || 'per day'}</strong> on average.
                          The trend is <strong className={(analysisData?.keyMetrics?.salesTrend || 'increasing') === 'increasing' ? 'text-green-600' : 'text-red-600'}>
                            {(analysisData?.keyMetrics?.salesTrend || 'increasing') === 'increasing' ? '📈 growing' : '📉 declining'}
                          </strong>.
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 mb-2">Demand Level</h5>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            (analysisData?.demandLevel || 'Medium') === 'High' ? 'bg-green-100 text-green-700' :
                            (analysisData?.demandLevel || 'Medium') === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {analysisData?.demandLevel || 'Medium'} Demand
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm">{analysisData?.demandExplanation || 'This product has moderate demand. Monitor closely for trends.'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Profit/Loss Analysis */}
                  <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                    <h4 className="text-xl font-bold text-green-900 mb-4">💰 Profit/Loss Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 text-center">
                        <h5 className="font-semibold text-gray-900 mb-2">Profit Margin</h5>
                        <div className={`text-3xl font-bold ${(analysisData?.keyMetrics?.profitMargin || 0) > 20 ? 'text-green-600' : (analysisData?.keyMetrics?.profitMargin || 0) > 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {analysisData?.keyMetrics?.profitMargin || Math.round(((Number(selectedTarget.unit_price || 0) - Number(selectedTarget.cost_price || 0)) / Number(selectedTarget.unit_price || 1)) * 100)}%
                        </div>
                        <p className="text-gray-600 text-sm mt-2">{analysisData?.profitExplanation || 'Review profit margin for this product.'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <h5 className="font-semibold text-gray-900 mb-2">{timeframe === '1H' ? 'Hourly' : timeframe === '4H' ? '4-Hour' : timeframe === '1D' ? 'Daily' : timeframe === '7D' ? 'Weekly' : timeframe === '1M' ? 'Monthly' : timeframe === '3M' ? 'Quarterly' : timeframe === '1Y' ? 'Yearly' : 'Daily'} Revenue</h5>
                        <div className="text-2xl font-bold text-blue-600">
                          ₱{(() => {
                            // Use real data from selectedTarget
                            const dailySales = Number(selectedTarget.avg_daily_sales || 0);
                            const unitPrice = Number(selectedTarget.unit_price || 0);
                            let timeframeMultiplier = 1;
                            
                            // Calculate timeframe-specific multiplier
                            switch (timeframe) {
                              case '1H': timeframeMultiplier = 1/24; break; // Hourly = daily/24
                              case '4H': timeframeMultiplier = 4/24; break; // 4 hours = daily/6
                              case '1D': timeframeMultiplier = 1; break; // Daily = daily
                              case '7D': timeframeMultiplier = 7; break; // Weekly = daily * 7
                              case '1M': timeframeMultiplier = 30; break; // Monthly = daily * 30
                              case '3M': timeframeMultiplier = 90; break; // 3 months = daily * 90
                              case '1Y': timeframeMultiplier = 365; break; // Yearly = daily * 365
                              default: timeframeMultiplier = 1;
                            }
                            
                            const salesForTimeframe = dailySales * timeframeMultiplier;
                            return (salesForTimeframe * unitPrice).toFixed(2);
                          })()}
                        </div>
                        <p className="text-gray-600 text-sm mt-2">Estimated {analysisData?.timeframeContext?.period || 'daily'} income</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <h5 className="font-semibold text-gray-900 mb-2">{timeframe === '1H' ? 'Hourly' : timeframe === '4H' ? '4-Hour' : timeframe === '1D' ? 'Daily' : timeframe === '7D' ? 'Weekly' : timeframe === '1M' ? 'Monthly' : timeframe === '3M' ? 'Quarterly' : timeframe === '1Y' ? 'Yearly' : 'Daily'} Profit</h5>
                        <div className="text-2xl font-bold text-green-600">
                          ₱{(() => {
                            // Use real data from selectedTarget
                            const dailySales = Number(selectedTarget.avg_daily_sales || 0);
                            const unitPrice = Number(selectedTarget.unit_price || 0);
                            const costPrice = Number(selectedTarget.cost_price || 0);
                            let timeframeMultiplier = 1;
                            
                            // Calculate timeframe-specific multiplier
                            switch (timeframe) {
                              case '1H': timeframeMultiplier = 1/24; break; // Hourly = daily/24
                              case '4H': timeframeMultiplier = 4/24; break; // 4 hours = daily/6
                              case '1D': timeframeMultiplier = 1; break; // Daily = daily
                              case '7D': timeframeMultiplier = 7; break; // Weekly = daily * 7
                              case '1M': timeframeMultiplier = 30; break; // Monthly = daily * 30
                              case '3M': timeframeMultiplier = 90; break; // 3 months = daily * 90
                              case '1Y': timeframeMultiplier = 365; break; // Yearly = daily * 365
                              default: timeframeMultiplier = 1;
                            }
                            
                            const salesForTimeframe = dailySales * timeframeMultiplier;
                            const profitPerUnit = unitPrice - costPrice;
                            return (salesForTimeframe * profitPerUnit).toFixed(2);
                          })()}
                        </div>
                        <p className="text-gray-600 text-sm mt-2">Estimated {analysisData?.timeframeContext?.period || 'daily'} profit</p>
                      </div>
                    </div>
                  </div>

                  {/* Technical Indicators Analysis */}
                  <div className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6 border border-indigo-200">
                    <h4 className="text-xl font-bold text-indigo-900 mb-4">📈 Technical Indicators Analysis</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Volume Analysis */}
                      <div className="bg-white rounded-lg p-4 border border-indigo-100">
                        <h5 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                          📊 Volume Analysis
                        </h5>
                        <div className="space-y-2">
                          <div className="text-sm text-gray-700">
                            <strong>What it shows:</strong> Total sales volume over time
                          </div>
                          <div className="text-sm text-gray-600">
                            <strong>Current trend:</strong> {(() => {
                              const avgSales = Number(selectedTarget.avg_daily_sales || 0);
                              if (avgSales >= 15) return 'High volume - Strong demand';
                              if (avgSales >= 8) return 'Medium volume - Steady demand';
                              return 'Low volume - Monitor closely';
                            })()}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            <strong>How to read:</strong> Higher volume indicates stronger customer interest and demand for this product.
                          </div>
                        </div>
                      </div>

                      {/* RSI Analysis */}
                      <div className="bg-white rounded-lg p-4 border border-indigo-100">
                        <h5 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                          📈 RSI (Relative Strength Index)
                        </h5>
                        <div className="space-y-2">
                          <div className="text-sm text-gray-700">
                            <strong>What it shows:</strong> Momentum indicator (0-100 scale)
                          </div>
                          <div className="text-sm text-gray-600">
                            <strong>Current signal:</strong> {(() => {
                              const avgSales = Number(selectedTarget.avg_daily_sales || 0);
                              const cv = 0.187; // Average CV from our analysis
                              if (avgSales >= 15 && cv <= 0.2) return 'Strong momentum - Overbought (&gt;70)';
                              if (avgSales >= 8 && cv <= 0.3) return 'Good momentum - Neutral (30-70)';
                              return 'Weak momentum - Oversold (&lt;30)';
                            })()}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            <strong>How to read:</strong> RSI &gt; 70 = Overbought (may decline), RSI &lt; 30 = Oversold (may rise), 30-70 = Normal range.
                          </div>
                        </div>
                      </div>

                      {/* MACD Analysis */}
                      <div className="bg-white rounded-lg p-4 border border-indigo-100">
                        <h5 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                          📊 MACD (Moving Average Convergence Divergence)
                        </h5>
                        <div className="space-y-2">
                          <div className="text-sm text-gray-700">
                            <strong>What it shows:</strong> Trend following momentum indicator
                          </div>
                          <div className="text-sm text-gray-600">
                            <strong>Current signal:</strong> {(() => {
                              const avgSales = Number(selectedTarget.avg_daily_sales || 0);
                              const trend = (analysisData?.keyMetrics?.salesTrend || 'increasing') === 'increasing';
                              if (trend && avgSales >= 10) return 'Bullish signal - MACD above signal line';
                              if (!trend && avgSales < 8) return 'Bearish signal - MACD below signal line';
                              return 'Neutral signal - MACD crossing signal line';
                            })()}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            <strong>How to read:</strong> MACD above signal line = Bullish (rising trend), below = Bearish (falling trend).
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Combined Analysis */}
                    <div className="mt-4 bg-white rounded-lg p-4 border-l-4 border-indigo-400">
                      <h5 className="font-semibold text-indigo-900 mb-2">🔍 Combined Technical Analysis</h5>
                      <p className="text-gray-700 text-sm">
                        {(() => {
                          const avgSales = Number(selectedTarget.avg_daily_sales || 0);
                          const trend = (analysisData?.keyMetrics?.salesTrend || 'increasing') === 'increasing';
                          const profitMargin = (analysisData?.keyMetrics?.profitMargin || Math.round(((Number(selectedTarget.unit_price || 0) - Number(selectedTarget.cost_price || 0)) / Number(selectedTarget.unit_price || 1)) * 100));
                          
                          if (avgSales >= 15 && trend && profitMargin > 20) {
                            return 'All indicators show strong positive signals. This product is performing excellently with high volume, positive momentum, and good profitability. Consider increasing inventory.';
                          } else if (avgSales >= 8 && trend && profitMargin > 10) {
                            return 'Technical indicators show steady performance. The product has good momentum and stable demand. Monitor for any changes in trend.';
                          } else if (avgSales < 8 || !trend || profitMargin < 10) {
                            return 'Technical indicators suggest caution. Low volume, declining momentum, or poor profitability detected. Review pricing, marketing, or consider discontinuing.';
                          } else {
                            return 'Mixed signals from technical indicators. Some positive aspects but also areas of concern. Monitor closely and consider adjustments.';
                          }
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Forecast Reliability */}
                  <div className="mb-6 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-6 border border-purple-200">
                    <h4 className="text-xl font-bold text-purple-900 mb-4">🎯 Forecast Reliability</h4>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-gray-700">{analysisData?.accuracyExplanation || 'Forecast accuracy information will be available after generating forecasts.'}</p>
                      {accuracy && accuracy.accuracy_percentage && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Prediction Accuracy</span>
                            <span className="text-sm font-bold text-purple-600">{Number(accuracy.accuracy_percentage).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${Number(accuracy.accuracy_percentage) >= 80 ? 'bg-green-500' : Number(accuracy.accuracy_percentage) >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{width: `${Math.min(Number(accuracy.accuracy_percentage), 100)}%`}}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Best Strategy Recommendations */}
                  <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-6 border border-orange-200">
                    <h4 className="text-xl font-bold text-orange-900 mb-4">🚀 Best Strategy Recommendations</h4>
                    <div className="space-y-4">
                      {analysisData?.recommendations && analysisData.recommendations.length > 0 ? (
                        analysisData.recommendations.map((rec, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 border-l-4 border-orange-400">
                            <div className="flex items-start gap-3">
                              <span className="text-orange-500 text-xl">💡</span>
                              <div>
                                <h5 className="font-semibold text-gray-900 mb-1">Strategy {index + 1}</h5>
                                <p className="text-gray-700 text-sm">{rec}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-gray-700 text-sm">No specific recommendations available. Continue monitoring current performance.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Items */}
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-6 border border-gray-200">
                    <h4 className="text-xl font-bold text-gray-900 mb-4">📋 Immediate Action Items</h4>
                    <div className="space-y-3">
                      {(analysisData?.demandLevel || 'Medium') === 'Low' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h5 className="font-semibold text-yellow-800 mb-2">⚠️ Low Demand Alert</h5>
                          <ul className="text-yellow-700 text-sm space-y-1">
                            <li>• Consider promotional campaigns</li>
                            <li>• Review pricing strategy</li>
                            <li>• Check market competition</li>
                          </ul>
                        </div>
                      )}
                      {(analysisData?.keyMetrics?.profitMargin || 0) < 15 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h5 className="font-semibold text-red-800 mb-2">⚠️ Low Profit Alert</h5>
                          <ul className="text-red-700 text-sm space-y-1">
                            <li>• Review cost structure</li>
                            <li>• Consider price adjustment</li>
                            <li>• Negotiate with suppliers</li>
                          </ul>
                        </div>
                      )}
                      {(analysisData?.keyMetrics?.salesTrend || 'increasing') === 'decreasing' && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <h5 className="font-semibold text-orange-800 mb-2">⚠️ Declining Sales Alert</h5>
                          <ul className="text-orange-700 text-sm space-y-1">
                            <li>• Investigate market conditions</li>
                            <li>• Check product quality</li>
                            <li>• Consider marketing boost</li>
                          </ul>
                        </div>
                      )}
                      {(analysisData?.demandLevel || 'Medium') === 'High' && (analysisData?.keyMetrics?.profitMargin || 0) > 20 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h5 className="font-semibold text-green-800 mb-2">✅ Excellent Performance</h5>
                          <ul className="text-green-700 text-sm space-y-1">
                            <li>• Consider increasing inventory</li>
                            <li>• Maintain current strategy</li>
                            <li>• Look for expansion opportunities</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">No Chart Data Available</h4>
                  <p className="text-gray-600 mb-4">Please select a product and generate a forecast to see the analysis.</p>
                  <button
                    onClick={() => setShowAnalyzer(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Analysis Modal */}
      {showCategoryAnalysis && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  📊 Category Performance Analysis
                </h3>
                <button
                  onClick={() => setShowCategoryAnalysis(false)}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Most Profitable Categories */}
              <div className="mb-8">
                <h4 className="text-xl font-bold text-green-900 mb-4">💰 Most Profitable Categories</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    const categoryProfits = categories.map(category => {
                      const categoryProducts = products.filter(p => p.category_name === category.name);
                      const totalProfit = categoryProducts.reduce((sum, product) => {
                        const dailySales = Number(product.avg_daily_sales || 0);
                        const profitPerUnit = Number(product.unit_price || 0) - Number(product.cost_price || 0);
                        return sum + (dailySales * profitPerUnit);
                      }, 0);
                      return { ...category, totalProfit, productCount: categoryProducts.length };
                    }).sort((a, b) => b.totalProfit - a.totalProfit);
                    
                    return categoryProfits.slice(0, 6).map((category, index) => (
                      <div key={category.id} className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-green-900">{category.name}</h5>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          ₱{category.totalProfit.toFixed(2)}
                        </div>
                        <div className="text-sm text-green-700">
                          Daily profit • {category.productCount} products
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Most In-Demand Categories */}
              <div className="mb-8">
                <h4 className="text-xl font-bold text-blue-900 mb-4">🔥 Most In-Demand Categories</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    const categoryDemand = categories.map(category => {
                      const categoryProducts = products.filter(p => p.category_name === category.name);
                      const totalSales = categoryProducts.reduce((sum, product) => {
                        return sum + Number(product.avg_daily_sales || 0);
                      }, 0);
                      return { ...category, totalSales, productCount: categoryProducts.length };
                    }).sort((a, b) => b.totalSales - a.totalSales);
                    
                    return categoryDemand.slice(0, 6).map((category, index) => (
                      <div key={category.id} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-blue-900">{category.name}</h5>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round(category.totalSales)} units
                        </div>
                        <div className="text-sm text-blue-700">
                          Daily sales • {category.productCount} products
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Top 3 Products Per Category */}
              <div>
                <h4 className="text-xl font-bold text-purple-900 mb-4">🏆 Top 3 Products Per Category</h4>
                <div className="space-y-6">
                  {categories.map(category => {
                    const categoryProducts = products
                      .filter(p => p.category_name === category.name)
                      .map(product => ({
                        ...product,
                        dailyProfit: Number(product.avg_daily_sales || 0) * (Number(product.unit_price || 0) - Number(product.cost_price || 0))
                      }))
                      .sort((a, b) => b.dailyProfit - a.dailyProfit)
                      .slice(0, 3);
                    
                    if (categoryProducts.length === 0) return null;
                    
                    return (
                      <div key={category.id} className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          📦 {category.name}
                          <span className="text-sm text-gray-500">({categoryProducts.length} products)</span>
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {categoryProducts.map((product, index) => (
                            <div key={product.id} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <h6 className="font-medium text-gray-900 text-sm truncate">{product.name}</h6>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                  #{index + 1}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Daily Sales:</span>
                                  <span className="font-medium">{Math.round(Number(product.avg_daily_sales || 0))} units</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Daily Profit:</span>
                                  <span className="font-medium text-green-600">₱{product.dailyProfit.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Profit Margin:</span>
                                  <span className="font-medium">
                                    {Math.round(((Number(product.unit_price || 0) - Number(product.cost_price || 0)) / Number(product.unit_price || 1)) * 100)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filters Panel */}
      <div className={`${false ? 'bg-gray-800' : 'bg-white'} border-t border-gray-200`}>
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h3 className={`text-xl font-bold ${false ? 'text-white' : 'text-gray-900'}`}>
              Advanced Filters & Analysis
            </h3>
            <div className="flex items-center space-x-3">
              {/* Chart control buttons removed - not needed for forecasting */}
            </div>
          </div>
          
          {/* Optimized Filter Controls */}
          <div className={`bg-gradient-to-r ${false ? 'from-gray-800 to-gray-700' : 'from-blue-50 to-indigo-50'} rounded-xl p-6 mb-6 border ${false ? 'border-gray-600' : 'border-blue-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${false ? 'text-white' : 'text-gray-900'}`}>
                🔍 Smart Filters
              </h3>
              <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-500'}`}>
                {getAvailableTargets().length} products found
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Search */}
              <div className="space-y-2">
                <label className={`block text-sm font-semibold ${false ? 'text-gray-300' : 'text-gray-700'}`}>
                  🔍 Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedTarget(null);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  placeholder="Search products..."
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                    false
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
              </div>
              
              
              {/* Sort By */}
              <div className="space-y-2">
                <label className={`block text-sm font-semibold ${false ? 'text-gray-300' : 'text-gray-700'}`}>
                  📈 Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                    false
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="sales">Daily Sales (High-Low)</option>
                  <option value="revenue">Daily Revenue (High-Low)</option>
                  <option value="profit">Profit (High-Low)</option>
                  <option value="accuracy">Model Accuracy (High-Low)</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Analysis Mode Explanation */}
          <div className={`mb-6 p-4 rounded-lg ${false ? 'bg-gray-700 border-l-blue-400' : 'bg-blue-50 border-l-blue-500'} border-l-4`}>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${false ? 'bg-blue-400' : 'bg-blue-500'}`}>
                  <span className="text-white text-sm font-bold">i</span>
                </div>
              </div>
              <div>
                <h4 className={`text-sm font-semibold ${false ? 'text-white' : 'text-blue-900'}`}>
                  Product Analysis
                </h4>
                <p className={`text-sm mt-1 ${false ? 'text-gray-300' : 'text-blue-700'}`}>
                  Analyze individual medicines and their sales performance. Choose specific products to view detailed forecasting charts and performance analysis.
                </p>
                {searchQuery && (
                  <p className={`text-xs mt-2 ${false ? 'text-gray-400' : 'text-blue-600'}`}>
                    🔍 Active filters: 
                    <span className="font-semibold"> Search: "{searchQuery}"</span>
                    • {getAvailableTargets().length} products found
                  </p>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Medicine Performance Comparison */}
      <div className={`${false ? 'bg-gray-800' : 'bg-white'} border-t border-gray-200`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${false ? 'text-white' : 'text-gray-900'}`}>
              Medicine Performance Comparison
            </h3>
            <div className="flex items-center space-x-2 text-sm">
              <span className={`px-2 py-1 rounded-full text-xs ${false ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`}>
                Fast Moving: {products.filter(p => Number(p.avg_daily_sales || 0) > 15).length}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs ${false ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700'}`}>
                Medium: {products.filter(p => Number(p.avg_daily_sales || 0) >= 8 && Number(p.avg_daily_sales || 0) <= 15).length}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs ${false ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'}`}>
                Slow Moving: {products.filter(p => Number(p.avg_daily_sales || 0) < 8).length}
              </span>
            </div>
          </div>
          
          {/* Comparison Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {(() => {
              const targets = getAvailableTargets();
              const startIndex = (currentPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              return targets.slice(startIndex, endIndex).map(target => (
              <div
                key={target.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedTarget?.id === target.id
                    ? 'border-purple-500 bg-purple-50'
                    : false
                    ? 'border-gray-600 bg-gray-700 hover:border-purple-400'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedTarget(target)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`font-medium truncate ${false ? 'text-white' : 'text-gray-900'}`}>
                    {target.name}
                  </h4>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    Number(target.avg_daily_sales || 0) >= 15 
                      ? (false ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700')
                      : Number(target.avg_daily_sales || 0) >= 8 
                      ? (false ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700')
                      : (false ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700')
                  }`}>
                    {Number(target.avg_daily_sales || 0) >= 15 ? 'Fast' : Number(target.avg_daily_sales || 0) >= 8 ? 'Medium' : 'Slow'}
                  </span>
                </div>
                
                {/* Performance Metrics */}
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className={`${false ? 'text-gray-400' : 'text-gray-600'}`}>Daily Sales:</span>
                    <span className={`font-medium ${false ? 'text-white' : 'text-gray-900'}`}>
                      {Math.round(Number(target.avg_daily_sales || 0))} units
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={`${false ? 'text-gray-400' : 'text-gray-600'}`}>Profit Margin:</span>
                    <span className={`font-medium ${
                      ((Number(target.unit_price || 0) - Number(target.cost_price || 0)) / Number(target.unit_price || 1)) > 0.3 
                        ? (false ? 'text-green-400' : 'text-green-500') : (false ? 'text-orange-400' : 'text-orange-500')
                    }`}>
                      {(((Number(target.unit_price || 0) - Number(target.cost_price || 0)) / Number(target.unit_price || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={`${false ? 'text-gray-400' : 'text-gray-600'}`}>Daily Revenue:</span>
                    <span className={`font-medium ${false ? 'text-blue-400' : 'text-blue-500'}`}>
                      ₱{(Number(target.avg_daily_sales || 0) * Number(target.unit_price || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {/* Mini Sales Trend Chart */}
                <div className={`h-12 rounded flex items-end space-x-1 mb-3 ${false ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {(() => {
                    const data = generateSalesForecastData(target, '7D');
                    return data.slice(-7).map((item, index) => (
                      <div
                        key={index}
                        className={`flex-1 rounded-sm ${
                          item.sales >= (Number(target.avg_daily_sales || 10)) ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{
                          height: `${Math.max(2, (item.sales / 20) * 100)}%`
                        }}
                      />
                    ));
                  })()}
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className={`${false ? 'text-gray-400' : 'text-gray-500'}`}>
                    {target.category_name || 'Medicine'}
                  </span>
                  <span className={`text-xs ${
                    Number(target.avg_daily_sales || 0) >= 15 ? (false ? 'text-green-400' : 'text-green-500') : 
                    Number(target.avg_daily_sales || 0) >= 8 ? (false ? 'text-yellow-400' : 'text-yellow-500') : (false ? 'text-red-400' : 'text-red-500')
                  }`}>
                    {Number(target.avg_daily_sales || 0) >= 15 ? 'High Demand' : 
                     Number(target.avg_daily_sales || 0) >= 8 ? 'Medium Demand' : 'Low Demand'}
                  </span>
                </div>
              </div>
            ));
            })()}
          </div>
          
          {/* Pagination */}
          {(() => {
            const targets = getAvailableTargets();
            const totalPages = Math.ceil(targets.length / itemsPerPage);
            
            if (totalPages <= 1) return null;
            
            return (
              <div className="flex items-center justify-between mt-6">
                <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, targets.length)} of {targets.length} products
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : false
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title="First Page"
                  >
                    ⟪
                  </button>
                  
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : false
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : false
                              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : false
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Next
                  </button>
                  
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : false
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title="Last Page"
                  >
                    ⟫
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Pharmacy Business Intelligence Panel */}
      <div className={`${false ? 'bg-gray-800' : 'bg-white'} border-t border-gray-200`}>
        <div className="px-6 py-4">
          
          {/* Analysis Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Demand Analysis Panel */}
            <div className="lg:col-span-2">
              <div className={`${false ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                <h3 className={`text-lg font-semibold mb-4 ${false ? 'text-white' : 'text-gray-900'}`}>
                  Medicine Performance Analysis
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className={`p-3 rounded-lg ${false ? 'bg-gray-600' : 'bg-white'}`}>
                    <div className={`text-sm ${false ? 'text-gray-300' : 'text-gray-600'}`}>Fast Moving Medicines</div>
                    <div className={`text-2xl font-bold ${false ? 'text-green-400' : 'text-green-500'}`}>
                      {products.filter(p => Number(p.avg_daily_sales || 0) > 15).length}
                    </div>
                    <div className={`text-xs ${false ? 'text-gray-400' : 'text-gray-500'}`}>
                      High demand products
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${false ? 'bg-gray-600' : 'bg-white'}`}>
                    <div className={`text-sm ${false ? 'text-gray-300' : 'text-gray-600'}`}>Slow Moving Medicines</div>
                    <div className={`text-2xl font-bold ${false ? 'text-red-400' : 'text-red-500'}`}>
                      {products.filter(p => Number(p.avg_daily_sales || 0) < 8).length}
                    </div>
                    <div className={`text-xs ${false ? 'text-gray-400' : 'text-gray-500'}`}>
                      Need attention
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${false ? 'bg-gray-600' : 'bg-white'}`}>
                    <div className={`text-sm ${false ? 'text-gray-300' : 'text-gray-600'}`}>High Profit Margin</div>
                    <div className={`text-2xl font-bold ${false ? 'text-blue-400' : 'text-blue-500'}`}>
                      {products.filter(p => ((Number(p.unit_price || 0) - Number(p.cost_price || 0)) / Number(p.unit_price || 1)) > 0.3).length}
                    </div>
                    <div className={`text-xs ${false ? 'text-gray-400' : 'text-gray-500'}`}>
                      Profitable products
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${false ? 'bg-gray-600' : 'bg-white'}`}>
                    <div className={`text-sm ${false ? 'text-gray-300' : 'text-gray-600'}`}>Low Profit Margin</div>
                    <div className={`text-2xl font-bold ${false ? 'text-orange-400' : 'text-orange-500'}`}>
                      {products.filter(p => ((Number(p.unit_price || 0) - Number(p.cost_price || 0)) / Number(p.unit_price || 1)) <= 0.3).length}
                    </div>
                    <div className={`text-xs ${false ? 'text-gray-400' : 'text-gray-500'}`}>
                      Review pricing
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Forecast Controls */}
            <div className="space-y-4">
              <div className={`${false ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                <h3 className={`text-lg font-semibold mb-4 ${false ? 'text-white' : 'text-gray-900'}`}>
                  Forecasting Controls
                </h3>
                
                <div className="space-y-3">
                  <button
                    onClick={generateForecasts}
                    disabled={!selectedTarget || loading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                    {loading ? 'Generating...' : 'Generate Forecast'}
                  </button>
                  
                  {autoForecast && (
                    <select
                      value={forecastInterval}
                      onChange={(e) => setForecastInterval(parseInt(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm bg-white text-gray-900"
                    >
                      <option value={30000}>Interval: 30 Seconds</option>
                      <option value={60000}>Interval: 1 Minute</option>
                      <option value={300000}>Interval: 5 Minutes</option>
                      <option value={600000}>Interval: 10 Minutes</option>
                    </select>
                  )}
                  
                  <button
                    onClick={() => setShowCategoryAnalysis(true)}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                  >
                    📊 Category Analysis
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Analysis Summary */}
          <div className="flex items-center justify-between mt-4">
            <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>
              Last updated: {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit'
              })} • Auto-refresh: {autoForecast ? 'ON' : 'OFF'}
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span className={`${false ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Products: {products.length}
              </span>
              <span className={`${false ? 'text-gray-400' : 'text-gray-600'}`}>
                Categories: {categories.length}
              </span>
              <span className={`${false ? 'text-gray-400' : 'text-gray-600'}`}>
                Models: {models.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Forecasting Results */}
      {showBulkResults && bulkResults && (
        <div className={`${false ? 'bg-gray-800' : 'bg-white'} border-t border-gray-200`}>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${false ? 'text-white' : 'text-gray-900'}`}>
                {bulkResults.products ? 'All Products Forecast' : 'All Categories Forecast'}
              </h3>
              <button
                onClick={() => setShowBulkResults(false)}
                className={`p-2 rounded-lg ${false ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} hover:bg-opacity-80`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className={`p-4 rounded-lg ${false ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>
                  {bulkResults.products ? 'Total Products' : 'Total Categories'}
                </div>
                <div className={`text-2xl font-bold ${false ? 'text-white' : 'text-gray-900'}`}>
                  {bulkResults.products ? bulkResults.products.length : bulkResults.categories.length}
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${false ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Total Daily Revenue</div>
                <div className={`text-2xl font-bold ${false ? 'text-green-400' : 'text-green-500'}`}>
                  ₱{bulkResults.totalRevenue.toFixed(2)}
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${false ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Total Daily Profit</div>
                <div className={`text-2xl font-bold ${false ? 'text-blue-400' : 'text-blue-500'}`}>
                  ₱{bulkResults.totalProfit.toFixed(2)}
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${false ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Overall Profit Margin</div>
                <div className={`text-2xl font-bold ${
                  (bulkResults.totalProfit / bulkResults.totalRevenue) * 100 > 30 ? (false ? 'text-green-400' : 'text-green-500') : (false ? 'text-orange-400' : 'text-orange-500')
                }`}>
                  {((bulkResults.totalProfit / bulkResults.totalRevenue) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            
            {/* Product/Category Performance Breakdown */}
            {bulkResults.products && (
              <div className="space-y-4">
                <h4 className={`text-lg font-semibold ${false ? 'text-white' : 'text-gray-900'}`}>
                  Product Performance Breakdown
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className={`p-3 rounded-lg ${false ? 'bg-green-900' : 'bg-green-50'}`}>
                    <div className={`text-sm ${false ? 'text-green-300' : 'text-green-700'}`}>Fast Moving</div>
                    <div className={`text-xl font-bold ${false ? 'text-green-100' : 'text-green-800'}`}>
                      {bulkResults.fastMoving} products
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${false ? 'bg-red-900' : 'bg-red-50'}`}>
                    <div className={`text-sm ${false ? 'text-red-300' : 'text-red-700'}`}>Slow Moving</div>
                    <div className={`text-xl font-bold ${false ? 'text-red-100' : 'text-red-800'}`}>
                      {bulkResults.slowMoving} products
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${false ? 'bg-blue-900' : 'bg-blue-50'}`}>
                    <div className={`text-sm ${false ? 'text-blue-300' : 'text-blue-700'}`}>High Profit</div>
                    <div className={`text-xl font-bold ${false ? 'text-blue-100' : 'text-blue-800'}`}>
                      {bulkResults.highProfit} products
                    </div>
                  </div>
                </div>
                
                {/* Product List */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${false ? 'border-gray-600' : 'border-gray-200'}`}>
                        <th className={`text-left py-3 px-4 ${false ? 'text-gray-300' : 'text-gray-600'}`}>Product</th>
                        <th className={`text-left py-3 px-4 ${false ? 'text-gray-300' : 'text-gray-600'}`}>Category</th>
                        <th className={`text-right py-3 px-4 ${false ? 'text-gray-300' : 'text-gray-600'}`}>Daily Sales</th>
                        <th className={`text-right py-3 px-4 ${false ? 'text-gray-300' : 'text-gray-600'}`}>Daily Revenue</th>
                        <th className={`text-right py-3 px-4 ${false ? 'text-gray-300' : 'text-gray-600'}`}>Profit Margin</th>
                        <th className={`text-center py-3 px-4 ${false ? 'text-gray-300' : 'text-gray-600'}`}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkResults.products.slice(0, 10).map((product, index) => (
                        <tr key={product.id} className={`border-b ${false ? 'border-gray-700' : 'border-gray-100'}`}>
                          <td className={`py-3 px-4 ${false ? 'text-white' : 'text-gray-900'}`}>
                            {product.name}
                          </td>
                          <td className={`py-3 px-4 ${false ? 'text-gray-300' : 'text-gray-600'}`}>
                            {product.category}
                          </td>
                          <td className={`py-3 px-4 text-right ${false ? 'text-white' : 'text-gray-900'}`}>
                            {product.avgDailySales.toFixed(0)} units
                          </td>
                          <td className={`py-3 px-4 text-right ${false ? 'text-white' : 'text-gray-900'}`}>
                            ₱{product.avgDailyRevenue.toFixed(2)}
                          </td>
                          <td className={`py-3 px-4 text-right ${
                            product.profitMargin > 30 ? (false ? 'text-green-400' : 'text-green-500') : (false ? 'text-orange-400' : 'text-orange-500')
                          }`}>
                            {product.profitMargin.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              product.demandLevel === 'Fast' ? (false ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700') :
                              product.demandLevel === 'Medium' ? (false ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700') :
                              (false ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700')
                            }`}>
                              {product.demandLevel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Category Results */}
            {bulkResults.categories && (
              <div className="space-y-4">
                <h4 className={`text-lg font-semibold ${false ? 'text-white' : 'text-gray-900'}`}>
                  Category Performance Breakdown
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bulkResults.categories.map((category, index) => (
                    <div key={category.id} className={`p-4 rounded-lg border-2 ${
                      false ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className={`font-semibold ${false ? 'text-white' : 'text-gray-900'}`}>
                          {category.name}
                        </h5>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          false ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {category.productCount} products
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Daily Sales:</span>
                          <span className={`font-medium ${false ? 'text-white' : 'text-gray-900'}`}>
                            {category.avgDailySales.toFixed(0)} units
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Daily Revenue:</span>
                          <span className={`font-medium ${false ? 'text-green-400' : 'text-green-500'}`}>
                            ₱{category.avgDailyRevenue.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Daily Profit:</span>
                          <span className={`font-medium ${false ? 'text-blue-400' : 'text-blue-500'}`}>
                            ₱{category.avgDailyProfit.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`text-sm ${false ? 'text-gray-400' : 'text-gray-600'}`}>Profit Margin:</span>
                          <span className={`font-medium ${
                            category.profitMargin > 30 ? (false ? 'text-green-400' : 'text-green-500') : (false ? 'text-orange-400' : 'text-orange-500')
                          }`}>
                            {category.profitMargin.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className={`${false ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg px-4 py-3 flex items-center gap-2 mx-6 mt-4`}>
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className={`${false ? 'text-red-300' : 'text-red-700'}`}>{error}</span>
        </div>
      )}
      
      {success && (
        <div className={`${false ? 'bg-green-900 border-green-700' : 'bg-green-50 border-green-200'} border rounded-lg px-4 py-3 flex items-center gap-2 mx-6 mt-4`}>
          <Target className="w-5 h-5 text-green-500" />
          <span className={`${false ? 'text-green-300' : 'text-green-700'}`}>{success}</span>
        </div>
      )}
      
      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
          <div className="w-full h-full p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Forecast Chart - Fullscreen
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeFullscreen}
                  className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700"
                >
                  Close (ESC)
                </button>
              </div>
            </div>
            
            <div className="w-full h-[calc(100vh-120px)]">
              <Line
                ref={chartRef}
                data={generateMultiAxisData(selectedTarget) || { labels: [], datasets: [] }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      labels: {
                        color: '#374151',
                        usePointStyle: true,
                        padding: 20
                      }
                    },
                    zoom: {
                      zoom: {
                        wheel: {
                          enabled: false,
                        },
                        pinch: {
                          enabled: false
                        },
                        mode: 'x',
                        drag: {
                          enabled: true,
                          backgroundColor: 'rgba(54, 162, 235, 0.3)',
                          borderColor: 'rgba(54, 162, 235, 0.8)',
                          borderWidth: 1,
                        }
                      },
                      pan: {
                        enabled: false,
                        mode: 'x',
                      }
                    }
                  },
                  scales: {
                    x: {
                      type: 'category',
                      grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                      },
                      ticks: {
                        color: '#6b7280',
                        maxTicksLimit: 8,
                        callback: function(value, index) {
                          const salesData = generateSalesForecastData(selectedTarget, timeframe);
                          const date = new Date(salesData[index]?.date || new Date());
                          if (timeframe === '1H') {
                            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                          } else if (timeframe === '4H') {
                            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                          } else {
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          }
                        }
                      }
                    },
                    y: {
                      grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                      },
                      ticks: {
                        color: '#6b7280',
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forecasting;
