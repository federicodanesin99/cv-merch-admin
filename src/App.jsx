import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [config, setConfig] = useState([]);
  const [products, setProducts] = useState(null);
  const [promoCodes, setPromoCodes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toOrderData, setToOrderData] = useState(null);
  const [batches, setBatches] = useState(null);
  const [productStats, setProductStats] = useState(null);
  const [statsDateRange, setStatsDateRange] = useState({ start: '', end: '' });
  const [comingSoonData, setComingSoonData] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setAdminToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'dashboard') {
        loadAnalytics();
        loadOrders();
      }
      if (activeTab === 'orders') loadOrders();
      if (activeTab === 'to-order') loadToOrder();
      if (activeTab === 'batches') loadBatches();
      if (activeTab === 'products') { 
        loadProducts(); 
        loadProductStats(); 
      }
      if (activeTab === 'coming-soon') loadComingSoonData(); // ✅ NUOVO
      if (activeTab === 'promo') loadPromoCodes();
      if (activeTab === 'config') loadConfig();
    }
  }, [activeTab, isAuthenticated]);

  const handleLogin = (token) => {
    setAdminToken(token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAdminToken('');
    setIsAuthenticated(false);
  };

  const fetchAPI = async (endpoint, options = {}) => {
    const maxRetries = 2;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const url = `${API_URL}${endpoint}`;
        console.log(`[${attempt}/${maxRetries}] Fetching: ${url}`);
        
        const controller = new AbortController();
        const timeout = attempt === 1 ? 30000 : 15000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const res = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        
        clearTimeout(timeoutId);

        if (res.status === 401) {
          handleLogout();
          throw new Error('Token scaduto');
        }

        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Server error: ${res.status}`);
        }

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `HTTP ${res.status}`);
        }

        return res.json();
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries && error.name !== 'AbortError') {
          console.log(`Retrying in 2s...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else if (error.name === 'AbortError') {
          break;
        }
      }
    }
    
    throw lastError;
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI('/api/admin/orders');
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI('/api/admin/analytics');
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI('/api/admin/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Errore nel caricamento prodotti: ' + error.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (productData) => {
    try {
      await fetchAPI('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(productData)
      });
      loadProducts();
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  };

  const updateProduct = async (id, productData) => {
    try {
      await fetchAPI(`/api/admin/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData)
      });
      loadProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id) => {
    try {
      await fetchAPI(`/api/admin/products/${id}`, {
        method: 'DELETE'
      });
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI('/api/admin/config');
      setConfig(data);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await fetchAPI(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ paymentStatus: status })
      });
      loadOrders();
      if (activeTab === 'dashboard') loadAnalytics();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      await fetchAPI(`/api/admin/orders/${orderId}`, {
        method: 'DELETE'
      });
      loadOrders();
      if (activeTab === 'dashboard') loadAnalytics();
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  };

  const updateConfig = async (key, value) => {
    try {
      await fetchAPI('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify({ key, value })
      });
      loadConfig();
    } catch (error) {
      console.error('Error updating config:', error);
    }
  };

  const loadPromoCodes = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI('/api/admin/promo-codes');
      setPromoCodes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading promo codes:', error);
      setPromoCodes([]);
    } finally {
      setLoading(false);
    }
  };

  const createPromoCode = async (promoData) => {
    try {
      await fetchAPI('/api/admin/promo-codes', {
        method: 'POST',
        body: JSON.stringify(promoData)
      });
      loadPromoCodes();
    } catch (error) {
      console.error('Error creating promo code:', error);
      throw error;
    }
  };

  const updatePromoCode = async (id, promoData) => {
    try {
      await fetchAPI(`/api/admin/promo-codes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(promoData)
      });
      loadPromoCodes();
    } catch (error) {
      console.error('Error updating promo code:', error);
      throw error;
    }
  };

  const deletePromoCode = async (id) => {
    try {
      await fetchAPI(`/api/admin/promo-codes/${id}`, {
        method: 'DELETE'
      });
      loadPromoCodes();
    } catch (error) {
      console.error('Error deleting promo code:', error);
      throw error;
    }
  };

  const loadToOrder = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI('/api/admin/orders/summary-to-order');
      setToOrderData(data);
    } catch (error) {
      console.error('Error loading to-order:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI('/api/admin/batches');
      setBatches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading batches:', error);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProductStats = async () => {
    try {
      const params = new URLSearchParams();
      if (statsDateRange.start) params.append('startDate', statsDateRange.start);
      if (statsDateRange.end) params.append('endDate', statsDateRange.end);
      
      const data = await fetchAPI(`/api/admin/products/stats?${params}`);
      setProductStats(data);
    } catch (error) {
      console.error('Error loading product stats:', error);
    }
  };

  const createBatch = async (orderIds, supplierInfo) => {
    try {
      await fetchAPI('/api/admin/batches', {
        method: 'POST',
        body: JSON.stringify({ orderIds, ...supplierInfo })
      });
      loadBatches();
      loadToOrder();
      loadOrders();
    } catch (error) {
      console.error('Error creating batch:', error);
      throw error;
    }
  };

  const updateBatch = async (id, data) => {
    try {
      await fetchAPI(`/api/admin/batches/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      loadBatches();
    } catch (error) {
      console.error('Error updating batch:', error);
      throw error;
    }
  };

  const createManualOrder = async (orderData) => {
    try {
      await fetchAPI('/api/admin/orders/manual', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
      loadOrders();
      loadAnalytics();
      alert('✅ Ordine creato con successo!');
    } catch (error) {
      console.error('Error creating manual order:', error);
      throw error;
    }
  };

  const loadComingSoonData = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI('/api/admin/products');
      setComingSoonData(data);
    } catch (error) {
      console.error('Error loading coming soon data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-bold">
                M
              </div>
              <div>
                <h1 className="text-xl font-bold">CLASSE VENETA Admin</h1>
                <p className="text-xs text-gray-500">Pannello di controllo</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded hover:bg-gray-100 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {['dashboard', 'orders', 'to-order', 'batches', 'products', 'coming-soon', 'promo', 'config'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'dashboard' && '📊 Dashboard'}
                {tab === 'orders' && '📦 Ordini'}
                {tab === 'to-order' && '🛒 Da Ordinare'}
                {tab === 'batches' && '📋 Lotti'}
                {tab === 'products' && '🛍️ Prodotti'}
                {tab === 'coming-soon' && '⏰ Coming Soon'}
                {tab === 'promo' && '🎟️ Codici'}
                {tab === 'config' && '⚙️ Config'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading && activeTab !== 'dashboard' ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <Dashboard analytics={analytics} orders={orders} onCreate={createManualOrder} />}
            {activeTab === 'orders' && <Orders orders={orders} updateStatus={updateOrderStatus} deleteOrder={deleteOrder} adminToken={adminToken} />}
            {activeTab === 'to-order' && <ToOrder data={toOrderData} onCreateBatch={createBatch} />}
            {activeTab === 'batches' && <Batches batches={batches} onUpdate={updateBatch} />}   
            {activeTab === 'products' && <Products products={products} stats={productStats} dateRange={statsDateRange} onDateRangeChange={setStatsDateRange} onRefreshStats={loadProductStats} onCreate={createProduct} onUpdate={updateProduct} onDelete={deleteProduct} />}
            {activeTab === 'coming-soon' && <ComingSoon products={products} />}
            {activeTab === 'promo' && <PromoCodes promoCodes={promoCodes} onCreate={createPromoCode} onUpdate={updatePromoCode} onDelete={deletePromoCode} />}
            {activeTab === 'config' && <Config config={config} updateConfig={updateConfig} />}
          </>
        )}
      </main>
    </div>
  );
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      try {
        await fetch(`${API_URL}/health`, { 
          signal: AbortSignal.timeout(5000) 
        });
      } catch (e) {
        console.log('Backend warming up...');
      }
      
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(30000)
      });

      const data = await res.json();
      
      if (res.ok && data.token) {
        localStorage.setItem('admin_token', data.token);
        onLogin(data.token);
      } else {
        setError(data.error || 'Login fallito');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Timeout: il server sta risvegliandosi. Riprova tra 30 secondi.');
      } else {
        setError('Errore di connessione. Riprova.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full px-4 py-2 border rounded"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Connessione in corso...</span>
              </>
            ) : (
              'Login'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ analytics, orders, onCreate }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    payments: true,
    chart: true,
    delivered: false
  });

  useEffect(() => {
    console.log('showCreateModal changed:', showCreateModal);
  }, [showCreateModal]);

  if (!analytics || !orders) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
        <p className="text-gray-500">Caricamento dashboard...</p>
      </div>
    );
  }

  const chartData = [
    { name: 'Tot', value: analytics.totalOrders },
    { name: 'Pagati', value: analytics.paidOrders + analytics.orderedOrders + analytics.deliveredOrders },
    { name: 'Ordinati', value: analytics.orderedOrders || 0 },
    { name: 'Consegnati', value: analytics.deliveredOrders || 0 },
    { name: 'Attesa', value: analytics.totalOrders - analytics.paidOrders - (analytics.deliveredOrders || 0) }
  ];

  const deliveredOrders = orders.filter(o => o.paymentStatus === 'DELIVERED');

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <button
          onClick={() => {
            console.log('Bottone crea ordine cliccato');
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition text-sm font-medium"
        >
          + Crea Ordine Manuale
        </button>
      </div>

      {/* Statistiche principali */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Ordini Totali</p>
          <p className="text-2xl md:text-3xl font-bold">{analytics.totalOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Ordini Pagati</p>
          <p className="text-2xl md:text-3xl font-bold text-green-600">
            {analytics.paidOrders + analytics.orderedOrders + analytics.deliveredOrders}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Ordinati</p>
          <p className="text-2xl md:text-3xl font-bold text-blue-600">{analytics.orderedOrders || 0}</p>
        </div>
        <div 
          className="bg-white rounded-lg shadow p-4 md:p-6 cursor-pointer hover:bg-gray-50 transition" 
          onClick={() => toggleSection('delivered')}
        >
          <p className="text-xs md:text-sm text-gray-600 mb-1">Consegnati 📦</p>
          <p className="text-2xl md:text-3xl font-bold text-purple-600">{analytics.deliveredOrders || 0}</p>
          <p className="text-xs text-purple-500 mt-1">Clicca per dettagli</p>
        </div>
      </div>

      {/* Sezione Pagamenti */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <button
          onClick={() => toggleSection('payments')}
          className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition"
        >
          <h3 className="text-lg font-semibold">💰 Dettaglio Pagamenti</h3>
          <span className="text-xl">{expandedSections.payments ? '▲' : '▼'}</span>
        </button>
        
        {expandedSections.payments && (
          <div className="p-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <p className="text-xs md:text-sm text-gray-600 mb-1">Fatturato</p>
              <p className="text-2xl md:text-3xl font-bold">€{analytics.revenue.toFixed(2)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">PayPal</h4>
                <span className="text-2xl">💳</span>
              </div>
              <p className="text-2xl font-bold mb-2">€{analytics.paypalRevenue.toFixed(2)}</p>
              <p className="text-sm text-gray-600">{analytics.paypalOrders} ordini pagati</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Revolut</h4>
                <span className="text-2xl">🔷</span>
              </div>
              <p className="text-2xl font-bold mb-2">€{analytics.revolutRevenue.toFixed(2)}</p>
              <p className="text-sm text-gray-600">{analytics.revolutOrders} ordini pagati</p>
            </div>
          </div>
        )}
      </div>

      {/* Sezione Grafico */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <button
          onClick={() => toggleSection('chart')}
          className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition"
        >
          <h3 className="text-lg font-semibold">📊 Statistiche Visive</h3>
          <span className="text-xl">{expandedSections.chart ? '▲' : '▼'}</span>
        </button>
        
        {expandedSections.chart && (
          <div className="p-4 border-t">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#000" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Sezione Ordini Consegnati */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <button
          onClick={() => toggleSection('delivered')}
          className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">📦 Ordini Consegnati</h3>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
              {deliveredOrders.length}
            </span>
          </div>
          <span className="text-xl">{expandedSections.delivered ? '▲' : '▼'}</span>
        </button>
        
        {expandedSections.delivered && (
          <div className="p-4 border-t">
            {deliveredOrders.length === 0 ? (
              <p className="text-center text-gray-500 py-6">Nessun ordine consegnato ancora</p>
            ) : (
              <div className="space-y-3">
                {deliveredOrders.map(order => (
                  <div key={order.id} className="bg-purple-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold">#{order.orderNumber.toString().padStart(4, '0')}</span>
                          {order.uniqueCode && (
                            <span className="px-2 py-0.5 bg-white text-xs font-mono rounded">
                              {order.uniqueCode}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{order.customerName}</p>
                        <p className="text-xs text-gray-600">{order.customerEmail}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">€{order.total.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-purple-200 pt-2 space-y-1">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {item.quantity}x {item.product.name} - {item.color} ({item.size})
                          </span>
                          <span className="font-medium">€{item.lineTotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateOrderModal
          onClose={() => setShowCreateModal(false)}
          onCreate={onCreate}
        />
      )}
    </div>
  );
}

function CreateOrderModal({ onClose, onCreate, products: productsProp }) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    paymentMethod: 'paypal',
    paymentStatus: 'PAID',
    items: [],
    customTotal: '',
    notes: ''
  });

  useEffect(() => {
    console.log('CreateOrderModal opened - loading products...');
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API_URL}/api/products`);
      const data = await res.json();
      console.log('Prodotti caricati:', data);
      // L'API ritorna { products: [...], ... } non direttamente l'array
      const productsArray = data.products || [];
      console.log('Numero prodotti:', productsArray.length);
      setProducts(productsArray);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        productId: '',
        color: '',
        size: '',
        quantity: 1,
        customPrice: ''
      }]
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const calculateTotal = () => {
    if (formData.customTotal) return parseFloat(formData.customTotal);
    
    if (!Array.isArray(products) || products.length === 0) return 0;
    
    return formData.items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return sum;
      
      const price = item.customPrice 
        ? parseFloat(item.customPrice) 
        : (product.launchPrice || product.basePrice);
      
      return sum + (price * item.quantity);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!formData.customerEmail || formData.items.length === 0) {
      alert('Compila email cliente e aggiungi almeno un prodotto');
      return;
    }

    for (const item of formData.items) {
      if (!item.productId || !item.color || !item.size) {
        alert('Completa tutti i campi dei prodotti');
        return;
      }
    }

    setLoading(true);
    try {
      const orderData = {
        ...formData,
        items: formData.items.map(item => ({
          ...item,
          quantity: parseInt(item.quantity),
          customPrice: item.customPrice ? parseFloat(item.customPrice) : null
        })),
        customTotal: formData.customTotal ? parseFloat(formData.customTotal) : null
      };

      await onCreate(orderData);
      onClose();
    } catch (error) {
      alert('Errore: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="p-6 sticky top-0 bg-white border-b z-10">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold">Crea Ordine Manuale</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Dati Cliente */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-3">👤 Dati Cliente</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                  placeholder="Mario Rossi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                  placeholder="mario@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefono</label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                  placeholder="+39 123 456 7890"
                />
              </div>
            </div>
          </div>

          {/* Dettagli Ordine */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-3">💳 Dettagli Pagamento</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Metodo</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="paypal">PayPal</option>
                  <option value="revolut">Revolut</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stato</label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => setFormData({...formData, paymentStatus: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="PENDING">In Attesa</option>
                  <option value="PAID">Pagato</option>
                  <option value="ORDERED">Ordinato</option>
                  <option value="DELIVERED">Consegnato</option>
                </select>
              </div>
            </div>
          </div>

          {/* Prodotti */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold">🛍️ Prodotti</h4>
              <button
                onClick={addItem}
                className="px-3 py-1 bg-black text-white rounded text-sm hover:bg-gray-800"
              >
                + Aggiungi
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => {
                const selectedProduct = products.find(p => p.id === item.productId);
                
                return (
                  <div key={index} className="bg-white rounded-lg p-3 border">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 md:col-span-4">
                        <label className="block text-xs font-medium mb-1">Prodotto</label>
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(index, 'productId', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                          disabled={loadingProducts}
                        >
                          <option value="">
                            {loadingProducts ? 'Caricamento...' : 'Seleziona...'}
                          </option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-6 md:col-span-2">
                        <label className="block text-xs font-medium mb-1">Colore</label>
                        <select
                          value={item.color}
                          onChange={(e) => updateItem(index, 'color', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                          disabled={!selectedProduct}
                        >
                          <option value="">-</option>
                          {selectedProduct?.colors.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-6 md:col-span-2">
                        <label className="block text-xs font-medium mb-1">Taglia</label>
                        <select
                          value={item.size}
                          onChange={(e) => updateItem(index, 'size', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                          disabled={!selectedProduct}
                        >
                          <option value="">-</option>
                          {selectedProduct?.sizes.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-4 md:col-span-1">
                        <label className="block text-xs font-medium mb-1">Qtà</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>

                      <div className="col-span-6 md:col-span-2">
                        <label className="block text-xs font-medium mb-1">Prezzo €</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.customPrice}
                          onChange={(e) => updateItem(index, 'customPrice', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                          placeholder={selectedProduct ? (selectedProduct.launchPrice || selectedProduct.basePrice).toFixed(2) : '0.00'}
                        />
                      </div>

                      <div className="col-span-2 md:col-span-1 flex items-end">
                        <button
                          onClick={() => removeItem(index)}
                          className="w-full px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {formData.items.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-4">Nessun prodotto aggiunto</p>
              )}
            </div>
          </div>

          {/* Totale */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">💰 Totale</h4>
              <p className="text-2xl font-bold">€{calculateTotal().toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Totale personalizzato (opzionale)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.customTotal}
                onChange={(e) => setFormData({...formData, customTotal: e.target.value})}
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder="Lascia vuoto per calcolo automatico"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium mb-1">📝 Note</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 border rounded text-sm"
              rows={2}
              placeholder="Note interne sull'ordine..."
            />
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            disabled={loading}
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Creazione...' : 'Crea Ordine'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Orders({ orders, updateStatus, deleteOrder, adminToken }) {
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [exportStatuses, setExportStatuses] = useState(['ALL']);
  const [isExporting, setIsExporting] = useState(false);
  const ordersPerPage = 15;

  const filteredOrders = orders.filter(o => {
    const matchesStatus = filter === 'ALL' || o.paymentStatus === filter;
    const matchesSearch = !searchTerm || 
      o.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      o.uniqueCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calcola statistiche per il filtro corrente
  const currentFilterStats = {
    totalOrders: filteredOrders.length,
    totalRevenue: filteredOrders.reduce((sum, o) => sum + o.total, 0),
    totalItems: filteredOrders.reduce((sum, o) => 
      sum + o.items.reduce((s, i) => s + i.quantity, 0), 0
    ),
    byProduct: {}
  };

  filteredOrders.forEach(order => {
    order.items.forEach(item => {
      const key = item.product.name;
      if (!currentFilterStats.byProduct[key]) {
        currentFilterStats.byProduct[key] = 0;
      }
      currentFilterStats.byProduct[key] += item.quantity;
    });
  });

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    ORDERED: 'bg-purple-100 text-purple-800',
    DELIVERED: 'bg-blue-100 text-blue-800',
    FAILED: 'bg-red-100 text-red-800'
  };

  const handleDelete = async (orderId, orderNumber) => {
    if (confirm(`Sei sicuro di voler eliminare l'ordine #${orderNumber}? Questa azione è irreversibile.`)) {
      try {
        await deleteOrder(orderId);
      } catch (error) {
        alert('Errore nell\'eliminazione: ' + error.message);
      }
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const statusParam = exportStatuses.includes('ALL') || exportStatuses.length === 0
        ? 'ALL' 
        : exportStatuses.join(',');
      const url = `${API_URL}/api/admin/orders/export?statuses=${statusParam}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore ${response.status}: ${errorText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `ordini-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Errore nella esportazione: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleExportStatus = (status) => {
    if (status === 'ALL') {
      setExportStatuses(['ALL']);
    } else {
      const newStatuses = exportStatuses.filter(s => s !== 'ALL');
      if (newStatuses.includes(status)) {
        const filtered = newStatuses.filter(s => s !== status);
        setExportStatuses(filtered.length === 0 ? ['ALL'] : filtered);
      } else {
        setExportStatuses([...newStatuses, status]);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-3 mb-3">
          <input
            type="text"
            placeholder="🔍 Cerca per email, nome, codice ordine..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg text-sm"
          />
        </div>
        
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 mb-2">Filtra visualizzazione:</p>
          <div className="flex gap-2 overflow-x-auto">
            {['ALL', 'PENDING', 'PAID', 'ORDERED', 'DELIVERED', 'FAILED'].map(status => (
              <button
                key={status}
                onClick={() => handleFilterChange(status)}
                className={`px-3 md:px-4 py-2 rounded font-medium text-xs md:text-sm transition whitespace-nowrap ${
                  filter === status
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {filter !== 'ALL' && filteredOrders.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <h4 className="font-semibold text-sm mb-2">📊 Riepilogo {filter}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-gray-600">Ordini</p>
                <p className="text-lg font-bold">{currentFilterStats.totalOrders}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Articoli</p>
                <p className="text-lg font-bold">{currentFilterStats.totalItems}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Fatturato</p>
                <p className="text-lg font-bold">€{currentFilterStats.totalRevenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Per Prodotto</p>
                <div className="text-xs">
                  {Object.entries(currentFilterStats.byProduct).map(([product, qty]) => (
                    <div key={product} className="flex justify-between">
                      <span className="truncate mr-2">{product}:</span>
                      <span className="font-medium">{qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600 mb-2">Esporta in Excel:</p>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportStatuses.includes('ALL')}
                    onChange={() => toggleExportStatus('ALL')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Tutti</span>
                </label>
                {['PENDING', 'PAID', 'ORDERED', 'DELIVERED', 'FAILED'].map(status => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportStatuses.includes(status)}
                      onChange={() => toggleExportStatus(status)}
                      disabled={exportStatuses.includes('ALL')}
                      className="w-4 h-4 disabled:opacity-50"
                    />
                    <span className="text-sm">{status}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Esportazione...</span>
                </>
              ) : (
                <>
                  <span>📊</span>
                  <span>Esporta Excel</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {paginatedOrders.map(order => (
          <div key={order.id} className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <h3 className="text-base md:text-lg font-bold">
                    #{order.orderNumber.toString().padStart(4, '0')}
                  </h3>
                  {order.uniqueCode && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                      {order.uniqueCode}
                    </span>
                  )}
                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.paymentStatus]}`}>
                    {order.paymentStatus}
                  </span>
                </div>
                
                <div className="space-y-1 text-sm">
                  {order.customerName && (
                    <p className="font-medium text-gray-900">👤 {order.customerName}</p>
                  )}
                  <p className="text-gray-600">📧 {order.customerEmail}</p>
                  {order.customerPhone && (
                    <p className="text-gray-600">📱 {order.customerPhone}</p>
                  )}
                  <p className="text-gray-600">
                    {order.paymentMethod === 'paypal' ? '💳' : '🔷'}{' '}
                    {order.paymentMethod === 'paypal' ? 'PayPal' : 'Revolut'}
                  </p>
                  <p className="text-xs text-gray-500">
                    📅 {new Date(order.createdAt).toLocaleString('it-IT')}
                  </p>
                </div>
              </div>
              
              <div className="text-left md:text-right">
                <p className="text-xl md:text-2xl font-bold">€{order.total.toFixed(2)}</p>
                {order.discount > 0 && (
                  <p className="text-xs text-green-600">
                    Sconto Bundle: -€{order.discount.toFixed(2)}
                  </p>
                )}
                {order.promoDiscount > 0 && (
                  <p className="text-xs text-green-600">
                    Codice {order.promoCode}: -€{order.promoDiscount.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t pt-3 md:pt-4 mb-3 md:mb-4">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs md:text-sm mb-1">
                  <span>
                    {item.quantity}x {item.product.name} - {item.color} ({item.size})
                  </span>
                  <span className="font-medium">€{item.lineTotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-2">
              {order.paymentStatus === 'PENDING' && (
                <>
                  <button
                    onClick={() => updateStatus(order.id, 'PAID')}
                    className="px-3 md:px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-xs md:text-sm font-medium transition"
                  >
                    ✓ Conferma Pagamento
                  </button>
                  <button
                    onClick={() => updateStatus(order.id, 'FAILED')}
                    className="px-3 md:px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-xs md:text-sm font-medium transition"
                  >
                    ✗ Segna come Fallito
                  </button>
                </>
              )}
              
              {order.paymentStatus === 'ORDERED' && (
                <button
                  onClick={() => updateStatus(order.id, 'DELIVERED')}
                  className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs md:text-sm font-medium transition"
                >
                  📦 Segna come Consegnato
                </button>
              )}
              
              {order.paymentStatus === 'PAID' && !order.batchId && (
                <p className="text-xs text-gray-500 italic py-2">
                  ℹ️ Vai su "Da Ordinare" per includere in un lotto
                </p>
              )}
              
              <button
                onClick={() => handleDelete(order.id, order.orderNumber)}
                className="px-3 md:px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-xs md:text-sm font-medium transition"
              >
                🗑️ Elimina Ordine
              </button>
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
            {searchTerm ? 'Nessun ordine trovato con questa ricerca' : 'Nessun ordine trovato'}
          </div>
        )}

        {totalPages > 1 && (
          <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Mostrando {startIndex + 1}-{Math.min(startIndex + ordersPerPage, filteredOrders.length)} di {filteredOrders.length} ordini
            </p>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                ««
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                ‹
              </button>
              
              <div className="flex items-center gap-1">
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
                      className={`px-3 py-2 rounded text-sm ${
                        currentPage === pageNum
                          ? 'bg-black text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Config({ config, updateConfig }) {
  const [editMode, setEditMode] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  const launchPricesConfig = config.find(c => c.key === 'launch_prices_active');
  const launchPricesActive = launchPricesConfig?.value?.active || false;
  const promoCodesConfig = config.find(c => c.key === 'promo_codes_visible');
  const promoCodesVisible = promoCodesConfig?.value?.visible !== false;

  const startEdit = (key, value) => {
    setEditMode(key);
    setEditValue(JSON.stringify(value, null, 2));
  };

  const saveEdit = (key) => {
    try {
      const parsed = JSON.parse(editValue);
      updateConfig(key, parsed);
      setEditMode(null);
    } catch (err) {
      alert('JSON non valido: ' + err.message);
    }
  };
  
  const toggleLaunchPrices = async () => {
    try {
      await updateConfig('launch_prices_active', { active: !launchPricesActive });
    } catch (err) {
      alert('Errore nell\'aggiornamento: ' + err.message);
    }
  };

  const togglePromoCodesVisible = async () => {
    try {
      await updateConfig('promo_codes_visible', { visible: !promoCodesVisible });
    } catch (err) {
      alert('Errore nell\'aggiornamento: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-base md:text-lg mb-1">Prezzi di Lancio</h4>
            <p className="text-sm text-gray-600">
              Attiva per mostrare i prezzi promozionali invece dei prezzi base
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={launchPricesActive}
              onChange={toggleLaunchPrices}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
        <div className="mt-3 text-sm">
          <span className={`px-3 py-1 rounded-full font-medium ${launchPricesActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {launchPricesActive ? '✓ Attivi' : '✗ Disattivi'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-base md:text-lg mb-1">Codici Promozionali</h4>
            <p className="text-sm text-gray-600">
              Mostra il campo per inserire codici promo nel checkout
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={promoCodesVisible}
              onChange={togglePromoCodesVisible}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
        <div className="mt-3 text-sm">
          <span className={`px-3 py-1 rounded-full font-medium ${promoCodesVisible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {promoCodesVisible ? '✓ Visibile ai clienti' : '✗ Nascosto ai clienti'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 md:p-6 border-b">
          <h3 className="text-base md:text-lg font-semibold">Altre Configurazioni</h3>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Configurazioni avanzate del sistema
          </p>
        </div>

        <div className="divide-y">
          {config.filter(item => item.key !== 'launch_prices_active' && item.key !== 'promo_codes_visible').map(item => (
            <div key={item.key} className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2 gap-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm md:text-base">{item.key}</h4>
                  {item.description && (
                    <p className="text-xs md:text-sm text-gray-600">{item.description}</p>
                  )}
                </div>
                {editMode === item.key ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(item.key)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-xs md:text-sm hover:bg-green-700 transition"
                    >
                      Salva
                    </button>
                    <button
                      onClick={() => setEditMode(null)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs md:text-sm hover:bg-gray-400 transition"
                    >
                      Annulla
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(item.key, item.value)}
                    className="px-3 py-1 bg-black text-white rounded text-xs md:text-sm hover:bg-gray-800 transition whitespace-nowrap"
                  >
                    Modifica
                  </button>
                )}
              </div>

              {editMode === item.key ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-3 border rounded font-mono text-xs md:text-sm"
                  rows={6}
                />
              ) : (
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(item.value, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 md:p-6 bg-gray-50 border-t">
          <button
            onClick={() => {
              const key = prompt('Chiave configurazione:');
              if (key) {
                updateConfig(key, {});
              }
            }}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition text-sm"
          >
            + Aggiungi
          </button>
        </div>
      </div>
    </div>
  );
}

// Sostituisci l'intera funzione Products in App.jsx con questa:

function Products({ products, stats, dateRange, onDateRangeChange, onRefreshStats, onCreate, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [existingCategories, setExistingCategories] = useState([]); // ✅ AGGIUNGI QUESTO
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: '', // ✅ AGGIUNGI QUESTO
    description: '',
    sizeGuide: '',
    basePrice: '',
    launchPrice: '',
    colors: [],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    images: [],
    isActive: true
  });
  const [newColor, setNewColor] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [selectedColorForImage, setSelectedColorForImage] = useState('');

  // ✅ AGGIUNGI QUESTO useEffect per estrarre le categorie
  useEffect(() => {
    if (products && products.length > 0) {
      const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
      setExistingCategories(categories);
    }
  }, [products]);

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      category: '',
      description: '',
      sizeGuide: '',
      basePrice: '',
      launchPrice: '',
      colors: [],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      images: [],
      isActive: true,
      isComingSoon: false  // ✅ AGGIUNGI QUESTO
    });
    setEditingProduct(null);
    setNewColor('');
    setNewSize('');
    setNewImageUrl('');
    setSelectedColorForImage('');
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      category: product.category || '',
      description: product.description || '',
      sizeGuide: product.sizeGuide || '',
      basePrice: product.basePrice.toString(),
      launchPrice: product.launchPrice ? product.launchPrice.toString() : '',
      colors: [...product.colors],
      sizes: [...product.sizes],
      images: product.images || [],
      isActive: product.isActive,
      isComingSoon: product.isComingSoon || false  // ✅ AGGIUNGI QUESTO
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      const data = {
        ...formData,
        basePrice: parseFloat(formData.basePrice),
        launchPrice: formData.launchPrice ? parseFloat(formData.launchPrice) : null
      };

      if (editingProduct) {
        await onUpdate(editingProduct.id, data);
      } else {
        await onCreate(data);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      alert('Errore nel salvataggio: ' + error.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (confirm(`Sei sicuro di voler eliminare "${name}"?`)) {
      try {
        await onDelete(id);
      } catch (error) {
        alert("Errore nell'eliminazione: " + error.message);
      }
    }
  };

  const addColor = () => {
    if (newColor.trim() && !formData.colors.includes(newColor.trim())) {
      setFormData({
        ...formData,
        colors: [...formData.colors, newColor.trim()]
      });
      setNewColor('');
    }
  };

  const removeColor = (color) => {
    setFormData({
      ...formData,
      colors: formData.colors.filter(c => c !== color),
      images: formData.images.filter(img => img.color !== color)
    });
  };

  const addSize = () => {
    if (newSize.trim() && !formData.sizes.includes(newSize.trim())) {
      setFormData({
        ...formData,
        sizes: [...formData.sizes, newSize.trim()]
      });
      setNewSize('');
    }
  };

  const removeSize = (size) => {
    setFormData({
      ...formData,
      sizes: formData.sizes.filter(s => s !== size)
    });
  };

  const addImage = () => {
    if (!newImageUrl.trim() || !selectedColorForImage) {
      alert('Seleziona un colore e inserisci un URL valido');
      return;
    }

    const existingColorImage = formData.images.find(img => img.color === selectedColorForImage);
    
    if (existingColorImage) {
      setFormData({
        ...formData,
        images: formData.images.map(img =>
          img.color === selectedColorForImage
            ? { ...img, urls: [...img.urls, newImageUrl.trim()] }
            : img
        )
      });
    } else {
      setFormData({
        ...formData,
        images: [...formData.images, { color: selectedColorForImage, urls: [newImageUrl.trim()] }]
      });
    }

    setNewImageUrl('');
  };

  const removeImage = (color, urlToRemove) => {
    setFormData({
      ...formData,
      images: formData.images.map(img =>
        img.color === color
          ? { ...img, urls: img.urls.filter(url => url !== urlToRemove) }
          : img
      ).filter(img => img.urls.length > 0)
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <h2 className="text-xl md:text-2xl font-bold">Gestione Prodotti</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm md:text-base"
          >
            {showStats ? '🛍️ Mostra Prodotti' : '📊 Mostra Statistiche'}
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition text-sm md:text-base"
          >
            + Aggiungi Prodotto
          </button>
        </div>
      </div>

      {showStats && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Filtro Periodo</h3>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1">Da</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => onDateRangeChange({...dateRange, start: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1">A</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => onDateRangeChange({...dateRange, end: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={onRefreshStats}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition whitespace-nowrap"
                >
                  🔄 Aggiorna
                </button>
              </div>
            </div>
          </div>

          {stats && stats.length > 0 ? (
            <div className="space-y-4">
              {stats.map(stat => (
                <div key={stat.product.id} className="bg-white rounded-lg shadow p-4 md:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">{stat.product.name}</h3>
                    <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-bold">
                      {stat.totalQuantity} pz
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-sm mb-3">🎨 Per Colore</h4>
                      <div className="space-y-2">
                        {Object.entries(stat.byColor)
                          .sort((a, b) => b[1] - a[1])
                          .map(([color, qty]) => (
                            <div key={color} className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span>{color}</span>
                                  <span className="font-medium">{qty} pz ({Math.round(qty / stat.totalQuantity * 100)}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${(qty / stat.totalQuantity) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-3">📏 Per Taglia</h4>
                      <div className="space-y-2">
                        {Object.entries(stat.bySize)
                          .sort((a, b) => b[1] - a[1])
                          .map(([size, qty]) => (
                            <div key={size} className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span>{size}</span>
                                  <span className="font-medium">{qty} pz ({Math.round(qty / stat.totalQuantity * 100)}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-green-600 h-2 rounded-full transition-all"
                                    style={{ width: `${(qty / stat.totalQuantity) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-semibold text-sm mb-3">🏆 Top Combinazioni</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {Object.values(stat.combinations)
                        .sort((a, b) => b.quantity - a.quantity)
                        .slice(0, 6)
                        .map((combo, i) => (
                          <div key={i} className="bg-gray-50 rounded p-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-700">{combo.color} - {combo.size}</span>
                              <span className="font-bold text-blue-600">{combo.quantity}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">Nessuna vendita nel periodo selezionato</p>
            </div>
          )}
        </div>
      )}

      {!showStats && (
        <>
          {!products || products.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500 mb-2 text-sm md:text-base">
                {products === null ? 'Caricamento...' : 'Nessun prodotto'}
              </p>
              {products !== null && (
                <button
                  onClick={openCreateModal}
                  className="mt-4 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition text-sm"
                >
                  Aggiungi il primo prodotto
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {products.map(product => {
                const firstImage = product.images && product.images.length > 0 
                  ? product.images[0].urls[0] 
                  : null;
                
                return (
                  <div key={product.id} className="bg-white rounded-lg shadow p-4 md:p-6">
                    {firstImage && (
                      <div className="mb-4">
                        <img 
                          src={firstImage} 
                          alt={product.name}
                          className="w-full h-40 md:h-48 object-cover rounded"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                    )}

                      <div className="flex justify-between items-start mb-3 md:mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base md:text-xl font-bold">{product.name}</h3>
                            {!product.isActive && (
                              <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded">
                                Off
                              </span>
                            )}
                            {product.isComingSoon && (
                              <span className="px-2 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-xs rounded font-semibold">
                                ⏰ Coming Soon
                              </span>
                            )}
                            {product.category && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded capitalize">
                                {product.category}
                              </span>
                            )}
                          </div>
                        <p className="text-xs md:text-sm text-gray-600 mb-2">/{product.slug}</p>
                        
                        <div className="space-y-1">
                          <p className="text-sm md:text-lg font-semibold">
                            €{product.basePrice.toFixed(2)}
                          </p>
                          {product.launchPrice && (
                            <p className="text-xs md:text-sm text-green-600">
                              Lancio: €{product.launchPrice.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs md:text-sm font-medium text-gray-700 mb-1">Colori:</p>
                      <div className="flex flex-wrap gap-1">
                        {product.colors.map((color, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-xs rounded">
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs md:text-sm font-medium text-gray-700 mb-1">Taglie:</p>
                      <div className="flex flex-wrap gap-1">
                        {product.sizes.map((size, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-xs rounded">
                            {size}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(product)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs md:text-sm transition"
                      >
                        ✏️ Modifica
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm transition"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {showModal && (
        <ProductModal
          editingProduct={editingProduct}
          formData={formData}
          setFormData={setFormData}
          existingCategories={existingCategories}
          newColor={newColor}
          setNewColor={setNewColor}
          newSize={newSize}
          setNewSize={setNewSize}
          newImageUrl={newImageUrl}
          setNewImageUrl={setNewImageUrl}
          selectedColorForImage={selectedColorForImage}
          setSelectedColorForImage={setSelectedColorForImage}
          addColor={addColor}
          removeColor={removeColor}
          addSize={addSize}
          removeSize={removeSize}
          addImage={addImage}
          removeImage={removeImage}
          handleSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// Sostituisci la funzione ProductModal in App.jsx con questa:

function ProductModal({
  editingProduct, formData, setFormData, existingCategories,
  newColor, setNewColor,
  newSize, setNewSize, newImageUrl, setNewImageUrl,
  selectedColorForImage, setSelectedColorForImage,
  addColor, removeColor, addSize, removeSize,
  addImage, removeImage, handleSubmit, onClose
}) {
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  // ✅ NUOVO: Funzione per aggiungere immagini senza colore
  const addImageWithoutColor = () => {
    if (!newImageUrl.trim()) {
      alert('Inserisci un URL valido');
      return;
    }

    const defaultColor = 'Standard';
    const existingColorImage = formData.images.find(img => img.color === defaultColor);
    
    if (existingColorImage) {
      setFormData({
        ...formData,
        images: formData.images.map(img =>
          img.color === defaultColor
            ? { ...img, urls: [...img.urls, newImageUrl.trim()] }
            : img
        )
      });
    } else {
      setFormData({
        ...formData,
        images: [...formData.images, { color: defaultColor, urls: [newImageUrl.trim()] }]
      });
    }

    setNewImageUrl('');
  };

  // ✅ NUOVO: Check se prodotto ha colori
  const hasColors = formData.colors && formData.colors.length > 0;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h3 className="text-lg md:text-2xl font-bold">
              {editingProduct ? 'Modifica' : 'Nuovo Prodotto'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>

          <div className="space-y-3 md:space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">Nome *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border rounded text-sm"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder="hoody-militare"
                required
                disabled={!!editingProduct}
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">Categoria</label>
              <div className="space-y-2">
                {!isCreatingNewCategory ? (
                  <div className="flex gap-2">
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="flex-1 px-3 py-2 border rounded text-sm capitalize"
                    >
                      <option value="">Nessuna categoria</option>
                      {existingCategories.map(cat => (
                        <option key={cat} value={cat} className="capitalize">{cat}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewCategory(true)}
                      className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm whitespace-nowrap"
                    >
                      + Nuova
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value.toLowerCase()})}
                      className="flex-1 px-3 py-2 border rounded text-sm"
                      placeholder="es. felpe, t-shirt, cd..."
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewCategory(false)}
                      className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                    >
                      Annulla
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Descrizione */}
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">Descrizione</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border rounded text-sm"
                rows={3}
                placeholder="Breve descrizione del prodotto..."
              />
            </div>

            {/* Guida Taglie */}
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">Guida alle Taglie</label>
              <textarea
                value={formData.sizeGuide}
                onChange={(e) => setFormData({...formData, sizeGuide: e.target.value})}
                className="w-full px-3 py-2 border rounded text-sm font-mono"
                rows={6}
                placeholder="S: 66-69 cm petto&#10;M: 71-74 cm petto&#10;..."
              />
            </div>

            {/* Prezzi */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium mb-1">Prezzo Base *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({...formData, basePrice: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium mb-1">Lancio</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.launchPrice}
                  onChange={(e) => setFormData({...formData, launchPrice: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
            </div>

            {/* ========== COLORI (opzionale) ========== */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs md:text-sm font-medium">
                  Colori <span className="text-gray-400 text-xs">(opzionale)</span>
                </label>
                <span className="text-xs text-gray-500 italic">
                  Lascia vuoto per prodotti senza varianti colore
                </span>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                  className="flex-1 px-3 py-2 border rounded text-sm"
                  placeholder="es. Nero, Bianco, Rosso..."
                />
                <button
                  type="button"
                  onClick={addColor}
                  className="px-3 md:px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm whitespace-nowrap"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.colors.map((color, i) => (
                  <span
                    key={i}
                    className="px-2 md:px-3 py-1 bg-blue-100 text-blue-800 rounded flex items-center gap-2 text-xs md:text-sm"
                  >
                    {color}
                    <button
                      type="button"
                      onClick={() => removeColor(color)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              {!hasColors && (
                <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded">
                  💡 Nessun colore aggiunto: le immagini saranno associate al prodotto senza varianti
                </p>
              )}
            </div>

            {/* ========== IMMAGINI (con supporto per prodotti senza colori) ========== */}
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">Immagini</label>
              
              {/* Se ci sono colori: selettore colore */}
              {hasColors ? (
                <div className="space-y-2 mb-2">
                  <select
                    value={selectedColorForImage}
                    onChange={(e) => setSelectedColorForImage(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                  >
                    <option value="">Seleziona colore...</option>
                    {formData.colors.map((color, i) => (
                      <option key={i} value={color}>{color}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded text-sm"
                      placeholder="URL immagine..."
                    />
                    <button
                      type="button"
                      onClick={addImage}
                      className="px-3 md:px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm whitespace-nowrap"
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : (
                /* Se NON ci sono colori: input diretto */
                <div className="space-y-2 mb-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImageWithoutColor())}
                      className="flex-1 px-3 py-2 border rounded text-sm"
                      placeholder="URL immagine..."
                    />
                    <button
                      type="button"
                      onClick={addImageWithoutColor}
                      className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm whitespace-nowrap"
                    >
                      + Aggiungi
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Le immagini saranno visibili senza selezione colore
                  </p>
                </div>
              )}

              {/* Lista immagini */}
              <div className="space-y-2 max-h-40 md:max-h-64 overflow-y-auto">
                {hasColors ? (
                  /* Con colori: raggruppa per colore */
                  formData.colors.map(color => {
                    const colorImages = formData.images.find(img => img.color === color);
                    if (!colorImages || colorImages.urls.length === 0) return null;

                    return (
                      <div key={color} className="border rounded p-2 bg-gray-50">
                        <p className="text-xs font-semibold mb-2">{color}</p>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                          {colorImages.urls.map((url, i) => (
                            <div key={i} className="relative group">
                              <img
                                src={url}
                                alt={`${color}-${i}`}
                                className="w-full h-16 md:h-20 object-cover rounded"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(color, url)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Senza colori: mostra tutte le immagini direttamente */
                  (() => {
                    const standardImages = formData.images.find(img => img.color === 'Standard');
                    if (!standardImages || standardImages.urls.length === 0) {
                      return (
                        <p className="text-center text-gray-400 text-sm py-4">
                          Nessuna immagine aggiunta
                        </p>
                      );
                    }

                    return (
                      <div className="border rounded p-2 bg-gray-50">
                        <p className="text-xs font-semibold mb-2">Immagini Prodotto</p>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                          {standardImages.urls.map((url, i) => (
                            <div key={i} className="relative group">
                              <img
                                src={url}
                                alt={`image-${i}`}
                                className="w-full h-16 md:h-20 object-cover rounded"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage('Standard', url)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
            
            {/* Taglie */}
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">Taglie</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
                  className="flex-1 px-3 py-2 border rounded text-sm"
                  placeholder="Aggiungi taglia..."
                />
                <button
                  type="button"
                  onClick={addSize}
                  className="px-3 md:px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm whitespace-nowrap"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.sizes.map((size, i) => (
                  <span
                    key={i}
                    className="px-2 md:px-3 py-1 bg-green-100 text-green-800 rounded flex items-center gap-2 text-xs md:text-sm"
                  >
                    {size}
                    <button
                      type="button"
                      onClick={() => removeSize(size)}
                      className="text-green-600 hover:text-green-800"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* ========== SEZIONE STATO PRODOTTO ========== */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-semibold text-sm">Stato Prodotto</h4>
              
              {/* Toggle Attivo */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                    Prodotto Attivo
                  </label>
                  <p className="text-xs text-gray-600">
                    Visibile nel catalogo pubblico
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {/* ✅ NUOVO: Toggle Coming Soon */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                <div>
                  <label htmlFor="isComingSoon" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <span>⏰</span>
                    <span>Coming Soon</span>
                  </label>
                  <p className="text-xs text-gray-600">
                    Non acquistabile, raccoglie solo interessi
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="isComingSoon"
                    checked={formData.isComingSoon || false}
                    onChange={(e) => setFormData({...formData, isComingSoon: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Warning se Coming Soon attivo */}
              {formData.isComingSoon && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-600 text-lg">⚠️</span>
                    <div className="text-xs text-yellow-800">
                      <p className="font-semibold mb-1">Modalità Coming Soon attiva</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Il prodotto sarà visibile ma non acquistabile</li>
                        <li>Gli utenti potranno registrare il loro interesse</li>
                        <li>Potrai notificarli quando sarà disponibile</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottoni Azione */}
            <div className="flex flex-col md:flex-row gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition text-sm"
              >
                {editingProduct ? 'Salva' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromoCodes({ promoCodes, onCreate, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    expiresAt: '',
    maxUsesPerUser: 1,
    isActive: true,
    allowedEmails: []
  });

  const resetForm = () => {
    setFormData({
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      expiresAt: '',
      maxUsesPerUser: 1,
      isActive: true,
      allowedEmails: []  // ✅ Array vuoto di default
    });
    setEditingPromo(null);
  };
  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (promo) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue.toString(),
      expiresAt: promo.expiresAt ? new Date(promo.expiresAt).toISOString().slice(0, 16) : '',
      maxUsesPerUser: promo.maxUsesPerUser,
      isActive: promo.isActive,
      allowedEmails: promo.allowedEmails || []  // ✅ IMPORTANTE: gestisci il caso null/undefined
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.code || !formData.discountValue) {
        alert('Compila tutti i campi obbligatori');
        return;
      }

      const data = {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        expiresAt: formData.expiresAt || null
      };

      if (editingPromo) {
        await onUpdate(editingPromo.id, data);
      } else {
        await onCreate(data);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      alert('Errore: ' + error.message);
    }
  };

  const handleDelete = async (id, code) => {
    if (confirm(`Eliminare il codice "${code}"?`)) {
      try {
        await onDelete(id);
      } catch (error) {
        alert('Errore: ' + error.message);
      }
    }
  };

  const isExpired = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <h2 className="text-xl md:text-2xl font-bold">Codici Promozionali</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition text-sm md:text-base"
        >
          + Nuovo Codice
        </button>
      </div>

      {!promoCodes || promoCodes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-2 text-sm md:text-base">
            {promoCodes === null ? 'Caricamento...' : 'Nessun codice promozionale'}
          </p>
          {promoCodes !== null && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition text-sm"
            >
              Crea il primo codice
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {promoCodes.map(promo => (
            <div key={promo.id} className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg md:text-xl font-bold font-mono">{promo.code}</h3>
                    {!promo.isActive && (
                      <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                        Disattivato
                      </span>
                    )}
                    {isExpired(promo.expiresAt) && (
                      <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded">
                        Scaduto
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <p className="text-xl font-semibold text-green-600">
                      {promo.discountType === 'PERCENTAGE' 
                        ? `-${promo.discountValue}%`
                        : `-€${promo.discountValue.toFixed(2)}`}
                    </p>
                    <p className="text-gray-600">
                      Tipo: {promo.discountType === 'PERCENTAGE' ? 'Percentuale' : 'Importo Fisso'}
                    </p>
                    {promo.expiresAt && (
                      <p className={`text-xs ${isExpired(promo.expiresAt) ? 'text-red-600' : 'text-gray-500'}`}>
                        Scade: {new Date(promo.expiresAt).toLocaleString('it-IT')}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Max {promo.maxUsesPerUser} {promo.maxUsesPerUser === 1 ? 'uso' : 'usi'} per utente
                    </p>
                    {promo._count && (
                      <p className="text-xs text-blue-600">
                        Utilizzato {promo._count.usedBy} {promo._count.usedBy === 1 ? 'volta' : 'volte'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(promo)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs md:text-sm transition"
                >
                  ✏️ Modifica
                </button>
                <button
                  onClick={() => handleDelete(promo.id, promo.code)}
                  className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm transition"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PromoModal
          editingPromo={editingPromo}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function PromoModal({ editingPromo, formData, setFormData, handleSubmit, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-md w-full my-8">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h3 className="text-lg md:text-2xl font-bold">
              {editingPromo ? 'Modifica Codice' : 'Nuovo Codice'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>

          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">Codice *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                className="w-full px-3 py-2 border rounded text-sm font-mono uppercase"
                placeholder="PROMO10"
                maxLength={20}
                required
                disabled={!!editingPromo}
              />
              {editingPromo && (
                <p className="text-xs text-gray-500 mt-1">Il codice non può essere modificato</p>
              )}
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">Tipo Sconto *</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({...formData, discountType: e.target.value})}
                className="w-full px-3 py-2 border rounded text-sm"
              >
                <option value="PERCENTAGE">Percentuale (%)</option>
                <option value="FIXED">Importo Fisso (€)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">
                Valore Sconto * {formData.discountType === 'PERCENTAGE' ? '(%)' : '(€)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={formData.discountType === 'PERCENTAGE' ? '100' : undefined}
                value={formData.discountValue}
                onChange={(e) => setFormData({...formData, discountValue: e.target.value})}
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder={formData.discountType === 'PERCENTAGE' ? '10' : '5.00'}
                required
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">Data Scadenza</label>
              <input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                className="w-full px-3 py-2 border rounded text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Lascia vuoto per nessuna scadenza</p>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">Max Usi per Utente</label>
              <input
                type="number"
                min="1"
                value={formData.maxUsesPerUser}
                onChange={(e) => setFormData({...formData, maxUsesPerUser: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium mb-1">
                Limita a Email Specifiche (opzionale)
              </label>
              <textarea
                value={Array.isArray(formData.allowedEmails) 
                  ? formData.allowedEmails.join('\n')  // ✅ Verifica che sia array
                  : ''}
                onChange={(e) => setFormData({
                  ...formData, 
                  allowedEmails: e.target.value
                    .split('\n')
                    .map(email => email.trim())  // ✅ Trim ogni email
                    .filter(email => email.length > 0)  // ✅ Rimuovi righe vuote
                })}
                className="w-full px-3 py-2 border rounded text-sm"
                rows={4}
                placeholder="mario@example.com&#10;luigi@example.com&#10;(una email per riga)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lascia vuoto per rendere il codice valido per tutti. Inserisci una email per riga.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-xs md:text-sm font-medium">
                Codice attivo
              </label>
            </div>

            <div className="flex flex-col md:flex-row gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition text-sm"
              >
                {editingPromo ? 'Salva' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToOrder({ data, onCreateBatch }) {
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [batchInfo, setBatchInfo] = useState({
    supplierName: '',
    supplierCost: '',
    expectedDelivery: '',
    notes: ''
  });

  if (!data) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
      </div>
    );
  }

  const toggleOrder = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAll = () => {
    if (selectedOrders.length === data.orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(data.orders.map(o => o.id));
    }
  };

  const openBatchModal = () => {
    if (selectedOrders.length === 0) {
      alert('Seleziona almeno un ordine');
      return;
    }
    setShowModal(true);
  };

  const handleCreateBatch = async () => {
    try {
      await onCreateBatch(selectedOrders, batchInfo);
      setShowModal(false);
      setSelectedOrders([]);
      setBatchInfo({ supplierName: '', supplierCost: '', expectedDelivery: '', notes: '' });
      alert('✅ Lotto creato con successo!');
    } catch (error) {
      alert('Errore nella creazione del lotto: ' + error.message);
    }
  };

  const generateCSV = () => {
    let csv = 'Prodotto,Colore,Taglia,Quantità\n';
    data.summary.forEach(product => {
      Object.entries(product.byColor).forEach(([color, colorData]) => {
        Object.entries(colorData.bySize).forEach(([size, qty]) => {
          csv += `${product.productName},${color},${size},${qty}\n`;
        });
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordine-fornitore-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const copyToClipboard = () => {
    let text = '📋 ORDINE FORNITORE\n\n';
    data.summary.forEach(product => {
      text += `${product.productName.toUpperCase()} - ${product.total} pz\n`;
      Object.entries(product.byColor).forEach(([color, colorData]) => {
        text += `\n  ${color}:\n`;
        Object.entries(colorData.bySize).forEach(([size, qty]) => {
          text += `  ├─ ${size}: ${qty} pz\n`;
        });
      });
      text += '\n';
    });
    text += `\nTOTALE: ${data.totalItems} pezzi in ${data.totalOrders} ordini`;
    
    navigator.clipboard.writeText(text).then(() => {
      alert('✅ Riepilogo copiato!');
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-2">Ordini da Ordinare</h2>
            <p className="text-sm text-gray-600">
              {data.totalOrders} ordini • {data.totalItems} articoli • {selectedOrders.length} selezionati
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm transition"
            >
              📋 Copia Riepilogo
            </button>
            <button
              onClick={generateCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition"
            >
              📊 Esporta CSV
            </button>
            <button
              onClick={openBatchModal}
              disabled={selectedOrders.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✅ Crea Lotto ({selectedOrders.length})
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-lg font-bold mb-4">📊 Riepilogo per Fornitore</h3>
        <div className="space-y-6">
          {data.summary.map((product, idx) => (
            <div key={idx} className="border-l-4 border-blue-500 pl-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-base md:text-lg font-bold">{product.productName}</h4>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  {product.total} pz
                </span>
              </div>
              
              {Object.entries(product.byColor).map(([color, colorData]) => (
                <div key={color} className="mb-3 ml-4">
                  <p className="font-semibold text-sm mb-2">{color} - {colorData.total} pz</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ml-4">
                    {Object.entries(colorData.bySize).map(([size, qty]) => (
                      <div key={size} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                        <span>{size}:</span>
                        <span className="font-medium">{qty} pz</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">📦 Ordini da Includere nel Lotto</h3>
          <button
            onClick={selectAll}
            className="text-sm text-blue-600 hover:underline"
          >
            {selectedOrders.length === data.orders.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
          </button>
        </div>

        <div className="space-y-3">
          {data.orders.map(order => (
            <div
              key={order.id}
              className={`border rounded-lg p-3 md:p-4 cursor-pointer transition ${
                selectedOrders.includes(order.id)
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => toggleOrder(order.id)}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedOrders.includes(order.id)}
                  onChange={() => toggleOrder(order.id)}
                  className="mt-1 w-5 h-5"
                  onClick={(e) => e.stopPropagation()}
                />
                
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">#{order.orderNumber.toString().padStart(4, '0')}</span>
                        {order.uniqueCode && (
                          <span className="px-2 py-0.5 bg-gray-100 text-xs font-mono rounded">
                            {order.uniqueCode}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{order.customerName}</p>
                      <p className="text-xs text-gray-500">{order.customerEmail}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="font-bold">€{order.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.paidAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {order.items.map((item, i) => (
                      <div key={i} className="text-xs bg-white p-2 rounded flex justify-between">
                        <span>{item.quantity}x {item.product.name} - {item.color} ({item.size})</span>
                        <span className="font-medium">€{item.lineTotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Crea Nuovo Lotto</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Nome Fornitore</label>
                <input
                  type="text"
                  value={batchInfo.supplierName}
                  onChange={(e) => setBatchInfo({...batchInfo, supplierName: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                  placeholder="es. Fornitore XYZ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Costo Totale (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={batchInfo.supplierCost}
                  onChange={(e) => setBatchInfo({...batchInfo, supplierCost: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Consegna Prevista</label>
                <input
                  type="date"
                  value={batchInfo.expectedDelivery}
                  onChange={(e) => setBatchInfo({...batchInfo, expectedDelivery: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Note</label>
                <textarea
                  value={batchInfo.notes}
                  onChange={(e) => setBatchInfo({...batchInfo, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                  rows={3}
                  placeholder="Note aggiuntive..."
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-sm font-semibold text-blue-800 mb-1">
                📦 Verranno inclusi {selectedOrders.length} ordini
              </p>
              <p className="text-xs text-blue-700">
                Gli ordini passeranno allo stato "ORDERED"
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateBatch}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Crea Lotto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Batches({ batches, onUpdate }) {
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [editForm, setEditForm] = useState({});

  if (!batches) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
      </div>
    );
  }

  const statusColors = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    ORDERED: 'bg-blue-100 text-blue-800',
    RECEIVED: 'bg-green-100 text-green-800'
  };

  const statusLabels = {
    DRAFT: 'Bozza',
    ORDERED: 'Ordinato',
    RECEIVED: 'Ricevuto'
  };

  const startEdit = (batch) => {
    setEditingBatch(batch.id);
    setEditForm({
      status: batch.status,
      supplierName: batch.supplierName || '',
      supplierOrderId: batch.supplierOrderId || '',
      supplierCost: batch.supplierCost || '',
      expectedDelivery: batch.expectedDelivery ? new Date(batch.expectedDelivery).toISOString().split('T')[0] : '',
      receivedAt: batch.receivedAt ? new Date(batch.receivedAt).toISOString().split('T')[0] : '',
      notes: batch.notes || ''
    });
  };

  const saveEdit = async () => {
    try {
      await onUpdate(editingBatch, editForm);
      setEditingBatch(null);
      alert('✅ Lotto aggiornato!');
    } catch (error) {
      alert('Errore: ' + error.message);
    }
  };

  const exportBatchCSV = (batch) => {
    const summary = {};
    
    batch.orders.forEach(order => {
      order.items.forEach(item => {
        const key = `${item.product.name}|${item.color}|${item.size}`;
        if (!summary[key]) {
          summary[key] = {
            product: item.product.name,
            color: item.color,
            size: item.size,
            quantity: 0
          };
        }
        summary[key].quantity += item.quantity;
      });
    });

    let csv = 'Prodotto,Colore,Taglia,Quantità\n';
    Object.values(summary).forEach(item => {
      csv += `${item.product},${item.color},${item.size},${item.quantity}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lotto-${batch.batchNumber}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold">Storico Lotti</h2>
        <p className="text-sm text-gray-600">{batches.length} lotti totali</p>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">Nessun lotto creato</p>
        </div>
      ) : (
        <div className="space-y-4">
          {batches.map(batch => {
            const totalItems = batch.orders.reduce((sum, o) => 
              sum + o.items.reduce((s, i) => s + i.quantity, 0), 0
            );
            const totalRevenue = batch.orders.reduce((sum, o) => sum + o.total, 0);

            return (
              <div key={batch.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg md:text-xl font-bold">
                          Lotto #{batch.batchNumber.toString().padStart(3, '0')}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[batch.status]}`}>
                          {statusLabels[batch.status]}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm">
                        <p className="text-gray-600">
                          📅 Creato: {new Date(batch.createdAt).toLocaleDateString('it-IT')}
                        </p>
                        {batch.orderedAt && (
                          <p className="text-gray-600">
                            📦 Ordinato: {new Date(batch.orderedAt).toLocaleDateString('it-IT')}
                          </p>
                        )}
                        {batch.expectedDelivery && (
                          <p className="text-gray-600">
                            🚚 Consegna prevista: {new Date(batch.expectedDelivery).toLocaleDateString('it-IT')}
                          </p>
                        )}
                        {batch.receivedAt && (
                          <p className="text-green-600 font-semibold">
                            ✅ Ricevuto: {new Date(batch.receivedAt).toLocaleDateString('it-IT')}
                          </p>
                        )}
                        {batch.supplierName && (
                          <p className="text-gray-600">🏭 {batch.supplierName}</p>
                        )}
                        {batch.supplierOrderId && (
                          <p className="text-gray-600 font-mono text-xs">ID: {batch.supplierOrderId}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-sm text-gray-600 mb-1">{batch.orders.length} ordini</p>
                      <p className="text-lg font-bold">{totalItems} pezzi</p>
                      <p className="text-sm text-gray-600">Fatturato: €{totalRevenue.toFixed(2)}</p>
                      {batch.supplierCost && (
                        <p className="text-sm text-blue-600">Costo: €{batch.supplierCost.toFixed(2)}</p>
                      )}
                    </div>
                  </div>

                  {batch.notes && (
                    <div className="bg-gray-50 rounded p-3 mb-4">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Note:</p>
                      <p className="text-sm text-gray-700">{batch.notes}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm transition"
                    >
                      {expandedBatch === batch.id ? '▲ Nascondi' : '▼ Dettagli'}
                    </button>
                    
                    <button
                      onClick={() => exportBatchCSV(batch)}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition"
                    >
                      📊 Esporta CSV
                    </button>

                    {batch.status !== 'RECEIVED' && (
                      <button
                        onClick={() => editingBatch === batch.id ? setEditingBatch(null) : startEdit(batch)}
                        className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm transition"
                      >
                        {editingBatch === batch.id ? '❌ Annulla' : '✏️ Modifica'}
                      </button>
                    )}
                  </div>
                </div>

                {editingBatch === batch.id && (
                  <div className="border-t p-4 md:p-6 bg-gray-50">
                    <h4 className="font-semibold mb-4">Modifica Lotto</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1">Stato</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                          className="w-full px-3 py-2 border rounded text-sm"
                        >
                          <option value="DRAFT">Bozza</option>
                          <option value="ORDERED">Ordinato</option>
                          <option value="RECEIVED">Ricevuto</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Nome Fornitore</label>
                        <input
                          type="text"
                          value={editForm.supplierName}
                          onChange={(e) => setEditForm({...editForm, supplierName: e.target.value})}
                          className="w-full px-3 py-2 border rounded text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">ID Ordine Fornitore</label>
                        <input
                          type="text"
                          value={editForm.supplierOrderId}
                          onChange={(e) => setEditForm({...editForm, supplierOrderId: e.target.value})}
                          className="w-full px-3 py-2 border rounded text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Costo (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.supplierCost}
                          onChange={(e) => setEditForm({...editForm, supplierCost: e.target.value})}
                          className="w-full px-3 py-2 border rounded text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Consegna Prevista</label>
                        <input
                          type="date"
                          value={editForm.expectedDelivery}
                          onChange={(e) => setEditForm({...editForm, expectedDelivery: e.target.value})}
                          className="w-full px-3 py-2 border rounded text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Data Ricezione</label>
                        <input
                          type="date"
                          value={editForm.receivedAt}
                          onChange={(e) => setEditForm({...editForm, receivedAt: e.target.value})}
                          className="w-full px-3 py-2 border rounded text-sm"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium mb-1">Note</label>
                        <textarea
                          value={editForm.notes}
                          onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                          className="w-full px-3 py-2 border rounded text-sm"
                          rows={3}
                        />
                      </div>
                    </div>

                    <button
                      onClick={saveEdit}
                      className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                    >
                      💾 Salva Modifiche
                    </button>
                  </div>
                )}

                {expandedBatch === batch.id && (
                  <div className="border-t p-4 md:p-6 bg-gray-50">
                    <h4 className="font-semibold mb-3">Ordini Inclusi</h4>
                    <div className="space-y-2">
                      {batch.orders.map(order => (
                        <div key={order.id} className="bg-white rounded p-3 text-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-bold">#{order.orderNumber.toString().padStart(4, '0')}</span>
                              {' - '}
                              <span className="text-gray-600">{order.customerName}</span>
                            </div>
                            <span className="font-medium">€{order.total.toFixed(2)}</span>
                          </div>
                          <div className="space-y-1 ml-4">
                            {order.items.map((item, i) => (
                              <div key={i} className="text-xs text-gray-600">
                                {item.quantity}x {item.product.name} - {item.color} ({item.size})
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ComingSoon({ products }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [interestedUsers, setInterestedUsers] = useState(null);
  const [stats, setStats] = useState(null);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState('');

  const comingSoonProducts = products?.filter(p => p.isComingSoon) || [];

  const loadInterestedUsers = async (productId) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/api/admin/products/${productId}/interested-users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      setInterestedUsers(data.interests);
      setStats(data.stats);
      setSelectedProduct(productId);
    } catch (error) {
      console.error('Error loading interested users:', error);
      alert('Errore nel caricamento utenti interessati');
    }
  };

  const handleNotifyUsers = async () => {
    if (!selectedProduct) return;
    
    const pending = stats?.pending || 0;
    if (pending === 0) {
      alert('Nessun utente da notificare');
      return;
    }

    if (!confirm(`Vuoi inviare ${pending} email di notifica?`)) return;

    setNotifyLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/api/admin/products/${selectedProduct}/notify-interested`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          discountCode: discountCode || undefined,
          onlyPending: true
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert(`✅ ${data.notified} email inviate con successo!`);
        loadInterestedUsers(selectedProduct); // Ricarica lista
        setDiscountCode('');
      } else {
        throw new Error(data.error || 'Errore invio email');
      }
    } catch (error) {
      console.error('Error notifying users:', error);
      alert('Errore durante l\'invio delle notifiche');
    } finally {
      setNotifyLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!interestedUsers || interestedUsers.length === 0) return;

    let csv = 'Email,Nome,Colore Preferito,Taglia Preferita,Data Registrazione,Notificato\n';
    interestedUsers.forEach(user => {
      csv += `${user.userEmail},${user.userName},${user.preferredColor || '-'},${user.preferredSize || '-'},${new Date(user.createdAt).toLocaleString('it-IT')},${user.notifiedAt ? 'Sì' : 'No'}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interessati-${selectedProduct}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">⏰ Prodotti Coming Soon</h2>
          <p className="text-sm text-gray-600 mt-1">
            {comingSoonProducts.length} prodotti in arrivo
          </p>
        </div>
      </div>

      {comingSoonProducts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-gray-500 text-lg">Nessun prodotto "Coming Soon" configurato</p>
          <p className="text-sm text-gray-400 mt-2">
            Vai su "Prodotti" e attiva il flag "Coming Soon" per un prodotto
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista Prodotti Coming Soon */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Prodotti</h3>
            {comingSoonProducts.map(product => (
              <div key={product.id} 
                   className={`bg-white rounded-lg shadow p-4 cursor-pointer transition hover:shadow-lg ${
                     selectedProduct === product.id ? 'ring-2 ring-purple-500' : ''
                   }`}
                   onClick={() => loadInterestedUsers(product.id)}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{product.name}</h4>
                    {product.category && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">
                        {product.category}
                      </span>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                    Coming Soon
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-3">
                  <span>👥 {/* Carica dinamicamente */} interessati</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      loadInterestedUsers(product.id);
                    }}
                    className="text-purple-600 hover:underline text-xs">
                    Vedi dettagli →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Dettaglio Utenti Interessati */}
          <div className="bg-white rounded-lg shadow p-6">
            {!selectedProduct ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-5xl mb-3">👈</div>
                <p>Seleziona un prodotto per vedere gli utenti interessati</p>
              </div>
            ) : interestedUsers === null ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg">Utenti Interessati</h3>
                  <button
                    onClick={exportToCSV}
                    className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                    📊 Esporta CSV
                  </button>
                </div>

                {/* Statistiche */}
                {stats && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                      <p className="text-xs text-gray-600">Totali</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{stats.pending}</p>
                      <p className="text-xs text-gray-600">Da Notificare</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-600">{stats.notified}</p>
                      <p className="text-xs text-gray-600">Notificati</p>
                    </div>
                  </div>
                )}

                {/* Preferenze Aggregate */}
                {stats && (Object.keys(stats.byColor).length > 0 || Object.keys(stats.bySize).length > 0) && (
                  <div className="bg-purple-50 rounded-lg p-4 mb-6">
                    <p className="font-semibold text-sm mb-2">📊 Preferenze più richieste</p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {Object.keys(stats.byColor).length > 0 && (
                        <div>
                          <p className="text-gray-600 mb-1">Colori:</p>
                          {Object.entries(stats.byColor)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([color, count]) => (
                              <div key={color} className="flex justify-between">
                                <span className="capitalize">{color}:</span>
                                <span className="font-bold">{count}</span>
                              </div>
                            ))}
                        </div>
                      )}
                      {Object.keys(stats.bySize).length > 0 && (
                        <div>
                          <p className="text-gray-600 mb-1">Taglie:</p>
                          {Object.entries(stats.bySize)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([size, count]) => (
                              <div key={size} className="flex justify-between">
                                <span>{size}:</span>
                                <span className="font-bold">{count}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Form Notifica */}
                {stats && stats.pending > 0 && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6">
                    <p className="font-semibold text-sm mb-3">📧 Invia Notifica Disponibilità</p>
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="Codice sconto (opzionale)"
                      className="w-full px-3 py-2 border rounded text-sm mb-3"
                    />
                    <button
                      onClick={handleNotifyUsers}
                      disabled={notifyLoading}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50">
                      {notifyLoading ? 'Invio in corso...' : `📨 Notifica ${stats.pending} utenti`}
                    </button>
                  </div>
                )}

                {/* Lista Utenti */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {interestedUsers.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">
                      Nessun utente ha ancora mostrato interesse
                    </p>
                  ) : (
                    interestedUsers.map(user => (
                      <div key={user.id} 
                           className={`border rounded p-3 text-sm ${
                             user.notifiedAt ? 'bg-gray-50' : 'bg-white'
                           }`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">{user.userName}</p>
                            <p className="text-xs text-gray-600">{user.userEmail}</p>
                          </div>
                          {user.notifiedAt && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                              ✓ Notificato
                            </span>
                          )}
                        </div>
                        
                        {(user.preferredColor || user.preferredSize) && (
                          <div className="flex gap-2 text-xs text-gray-600">
                            {user.preferredColor && (
                              <span className="bg-gray-100 px-2 py-0.5 rounded capitalize">
                                🎨 {user.preferredColor}
                              </span>
                            )}
                            {user.preferredSize && (
                              <span className="bg-gray-100 px-2 py-0.5 rounded">
                                📏 {user.preferredSize}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-400 mt-2">
                          Registrato: {new Date(user.createdAt).toLocaleDateString('it-IT')}
                          {user.notifiedAt && ` • Notificato: ${new Date(user.notifiedAt).toLocaleDateString('it-IT')}`}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;