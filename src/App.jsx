import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = 'https://cv-merch-backend.onrender.com';
const ADMIN_TOKEN = localStorage.getItem('admin_token') || ''; // Gestito con login

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'dashboard') loadAnalytics();
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'config') loadConfig();
  }, [activeTab]);

  const fetchAPI = async (endpoint, options = {}) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return res.json();
  };

  const loadOrders = async () => {
    setLoading(true);
    const data = await fetchAPI('/api/admin/orders');
    setOrders(data.orders || []);
    setLoading(false);
  };

  const loadAnalytics = async () => {
    setLoading(true);
    const data = await fetchAPI('/api/admin/analytics');
    setAnalytics(data);
    setLoading(false);
  };

  const loadConfig = async () => {
    setLoading(true);
    const data = await fetchAPI('/api/admin/config');
    setConfig(data);
    setLoading(false);
  };

  const updateOrderStatus = async (orderId, status) => {
    await fetchAPI(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ paymentStatus: status })
    });
    loadOrders();
  };

  const updateConfig = async (key, value) => {
    await fetchAPI('/api/admin/config', {
      method: 'PUT',
      body: JSON.stringify({ key, value })
    });
    loadConfig();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-bold">
                M
              </div>
              <div>
                <h1 className="text-xl font-bold">MIDA Admin</h1>
                <p className="text-xs text-gray-500">Pannello di controllo</p>
              </div>
            </div>
            <button className="text-sm text-gray-600 hover:text-gray-900">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {['dashboard', 'orders', 'config'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                  activeTab === tab
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'dashboard' && '📊 Dashboard'}
                {tab === 'orders' && '📦 Ordini'}
                {tab === 'config' && '⚙️ Configurazione'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <Dashboard analytics={analytics} />}
            {activeTab === 'orders' && <Orders orders={orders} updateStatus={updateOrderStatus} />}
            {activeTab === 'config' && <Config config={config} updateConfig={updateConfig} />}
          </>
        )}
      </main>
    </div>
  );
}

function Dashboard({ analytics }) {
  if (!analytics) return null;

  const chartData = [
    { name: 'Ordini Totali', value: analytics.totalOrders },
    { name: 'Ordini Pagati', value: analytics.paidOrders },
    { name: 'In Attesa', value: analytics.totalOrders - analytics.paidOrders }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Ordini Totali</p>
          <p className="text-3xl font-bold">{analytics.totalOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Ordini Pagati</p>
          <p className="text-3xl font-bold text-green-600">{analytics.paidOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Fatturato</p>
          <p className="text-3xl font-bold">€{analytics.revenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Statistiche Ordini</h3>
        <ResponsiveContainer width="100%" height={300}>
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

function Orders({ orders, updateStatus }) {
  const [filter, setFilter] = useState('ALL');

  const filteredOrders = filter === 'ALL' 
    ? orders 
    : orders.filter(o => o.paymentStatus === filter);

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-2">
        {['ALL', 'PENDING', 'PAID', 'FAILED'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded font-medium text-sm transition ${
              filter === status
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold">Ordine #{order.orderNumber.toString().padStart(4, '0')}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.paymentStatus]}`}>
                    {order.paymentStatus}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{order.customerEmail}</p>
                <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString('it-IT')}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">€{order.total.toFixed(2)}</p>
                {order.discount > 0 && (
                  <p className="text-xs text-green-600">Sconto: -€{order.discount.toFixed(2)}</p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="border-t pt-4 mb-4">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm mb-1">
                  <span>{item.quantity}x {item.product.name} - {item.color} ({item.size})</span>
                  <span className="font-medium">€{item.lineTotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            {order.paymentStatus === 'PENDING' && (
              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus(order.id, 'PAID')}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                >
                  ✓ Conferma Pagamento
                </button>
                <button
                  onClick={() => updateStatus(order.id, 'FAILED')}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                >
                  ✗ Segna come Fallito
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nessun ordine trovato
          </div>
        )}
      </div>
    </div>
  );
}

function Config({ config, updateConfig }) {
  const [editMode, setEditMode] = useState(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (key, value) => {
    setEditMode(key);
    setEditValue(JSON.stringify(value));
  };

  const saveEdit = (key) => {
    try {
      const parsed = JSON.parse(editValue);
      updateConfig(key, parsed);
      setEditMode(null);
    } catch (err) {
      alert('JSON non valido');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Configurazione Sistema</h3>
        <p className="text-sm text-gray-600 mt-1">Gestisci prezzi, sconti e impostazioni</p>
      </div>

      <div className="divide-y">
        {config.map(item => (
          <div key={item.key} className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold">{item.key}</h4>
                {item.description && (
                  <p className="text-sm text-gray-600">{item.description}</p>
                )}
              </div>
              {editMode === item.key ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(item.key)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                  >
                    Salva
                  </button>
                  <button
                    onClick={() => setEditMode(null)}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
                  >
                    Annulla
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(item.key, item.value)}
                  className="px-3 py-1 bg-black text-white rounded text-sm"
                >
                  Modifica
                </button>
              )}
            </div>

            {editMode === item.key ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full p-2 border rounded font-mono text-sm"
                rows={4}
              />
            ) : (
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(item.value, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>

      <div className="p-6 bg-gray-50 border-t">
        <button
          onClick={() => {
            const key = prompt('Chiave configurazione:');
            if (key) {
              updateConfig(key, {});
            }
          }}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          + Aggiungi Configurazione
        </button>
      </div>
    </div>
  );
}

export default App;