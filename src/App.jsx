import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = 'https://cv-merch-backend.onrender.com';

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

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setAdminToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'dashboard') loadAnalytics();
      if (activeTab === 'orders') loadOrders();
      if (activeTab === 'products') loadProducts();
      if (activeTab === 'config') loadConfig();
      if (activeTab === 'promo') loadPromoCodes();
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
        const timeout = attempt === 1 ? 30000 : 15000; // 30s first try, 15s retry
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
          // Don't retry on timeout, just fail
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
      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts([]);
      }
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
      if (Array.isArray(data)) {
        setPromoCodes(data);
      } else {
        setPromoCodes([]);
      }
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
            {['dashboard', 'orders', 'products', 'promo', 'config'].map(tab => (
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
                {tab === 'products' && '🛍️ Prodotti'}
                {tab === 'promo' && '🎟️ Codici'}
                {tab === 'config' && '⚙️ Config'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <Dashboard analytics={analytics} />}
            {activeTab === 'orders' && <Orders orders={orders} updateStatus={updateOrderStatus} deleteOrder={deleteOrder} />}
            {activeTab === 'products' && <Products products={products} onCreate={createProduct} onUpdate={updateProduct} onDelete={deleteProduct} />}
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
      // Pre-warm se il backend è dormiente
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
        signal: AbortSignal.timeout(30000) // 30s timeout
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

function Dashboard({ analytics }) {
  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Caricamento analytics...</p>
      </div>
    );
  }

  const chartData = [
    { name: 'Tot', value: analytics.totalOrders },
    { name: 'Pagati', value: analytics.paidOrders + (analytics.deliveredOrders || 0) },
    { name: 'Consegnati', value: analytics.deliveredOrders || 0 },
    { name: 'Attesa', value: analytics.totalOrders - analytics.paidOrders - (analytics.deliveredOrders || 0) }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Ordini Totali</p>
          <p className="text-2xl md:text-3xl font-bold">{analytics.totalOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Ordini Pagati</p>
          <p className="text-2xl md:text-3xl font-bold text-green-600">{analytics.paidOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Consegnati</p>
          <p className="text-2xl md:text-3xl font-bold text-blue-600">{analytics.deliveredOrders || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <p className="text-xs md:text-sm text-gray-600 mb-1">Fatturato</p>
          <p className="text-2xl md:text-3xl font-bold">€{analytics.revenue.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-4">Statistiche</h3>
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
    </div>
  );
}

function Orders({ orders, updateStatus, deleteOrder }) {
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = orders.filter(o => {
    const matchesStatus = filter === 'ALL' || o.paymentStatus === filter;
    const matchesSearch = !searchTerm || 
      o.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
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

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-3 mb-3">
          <input
            type="text"
            placeholder="🔍 Cerca per email o nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['ALL', 'PENDING', 'PAID', 'DELIVERED', 'FAILED'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
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

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <h3 className="text-base md:text-lg font-bold">
                    #{order.orderNumber.toString().padStart(4, '0')}
                  </h3>
                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.paymentStatus]}`}>
                    {order.paymentStatus}
                  </span>
                </div>
                
                {/* Customer Info */}
                <div className="space-y-1 text-sm">
                  {order.customerName && (
                    <p className="font-medium text-gray-900">👤 {order.customerName}</p>
                  )}
                  <p className="text-gray-600">📧 {order.customerEmail}</p>
                  {order.customerPhone && (
                    <p className="text-gray-600">📱 {order.customerPhone}</p>
                  )}
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

            {/* Items */}
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

            {/* Actions */}
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
              
              {order.paymentStatus === 'PAID' && (
                <button
                  onClick={() => updateStatus(order.id, 'DELIVERED')}
                  className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs md:text-sm font-medium transition"
                >
                  📦 Segna come Consegnato
                </button>
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
      </div>
    </div>
  );
}

function Config({ config, updateConfig }) {
  const [editMode, setEditMode] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  // Trova launch_prices_active config
  const launchPricesConfig = config.find(c => c.key === 'launch_prices_active');
  const launchPricesActive = launchPricesConfig?.value?.active || false;

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

  return (
    <div className="space-y-4">
      {/* Launch Prices Toggle */}
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

      {/* Other Configs */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 md:p-6 border-b">
          <h3 className="text-base md:text-lg font-semibold">Altre Configurazioni</h3>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Configurazioni avanzate del sistema
          </p>
        </div>

        <div className="divide-y">
          {config.filter(item => item.key !== 'launch_prices_active').map(item => (
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

function Products({ products, onCreate, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
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

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      sizeGuide: '',
      basePrice: '',
      launchPrice: '',
      colors: [],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      images: [],
      isActive: true
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
      description: product.description || '',
      sizeGuide: product.sizeGuide || '',
      basePrice: product.basePrice.toString(),
      launchPrice: product.launchPrice ? product.launchPrice.toString() : '',
      colors: [...product.colors],
      sizes: [...product.sizes],
      images: product.images || [],
      isActive: product.isActive
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
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition text-sm md:text-base"
        >
          + Aggiungi Prodotto
        </button>
      </div>

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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-lg md:text-2xl font-bold">
                  {editingProduct ? 'Modifica' : 'Nuovo Prodotto'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 md:space-y-4">
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

                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1">Guida alle Taglie</label>
                  <textarea
                    value={formData.sizeGuide}
                    onChange={(e) => setFormData({...formData, sizeGuide: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-sm font-mono"
                    rows={6}
                    placeholder="S: 66-69 cm petto&#10;M: 71-74 cm petto&#10;..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supporta HTML semplice: usa &lt;br&gt; per andare a capo
                  </p>
                </div>

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

                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1">Colori</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                      className="flex-1 px-3 py-2 border rounded text-sm"
                      placeholder="Aggiungi colore..."
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
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1">Immagini</label>
                  <div className="space-y-2 mb-2">
                    <select
                      value={selectedColorForImage}
                      onChange={(e) => setSelectedColorForImage(e.target.value)}
                      className="w-full px-3 py-2 border rounded text-sm"
                      disabled={formData.colors.length === 0}
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

                  <div className="space-y-2 max-h-40 md:max-h-64 overflow-y-auto">
                    {formData.colors.map(color => {
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
                    })}
                  </div>
                </div>

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

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isActive" className="text-xs md:text-sm font-medium">
                    Prodotto attivo
                  </label>
                </div>

                <div className="flex flex-col md:flex-row gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
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
      )}
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
      allowedEmails: []
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
      allowedEmails: promo.allowedEmails || []
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full my-8">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-lg md:text-2xl font-bold">
                  {editingPromo ? 'Modifica Codice' : 'Nuovo Codice'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
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
                  <input
                    type="text"
                    value={formData.allowedEmails.join('\n')}
                    onChange={(e) => setFormData({
                      ...formData, 
                      allowedEmails: e.target.value.split('\n').filter(e => e.trim())
                    })}
                    className="w-full px-3 py-2 border rounded text-sm"
                    rows={4}
                    placeholder="mario@example.com&#10;luigi@example.com&#10;(una email per riga)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lascia vuoto per rendere il codice valido per tutti.
                    Inserisci una email per riga per limitare l'uso.
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
                    onClick={() => setShowModal(false)}
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
      )}
    </div>
  );
}

export default App;
