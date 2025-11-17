import { useState } from 'react';

function Login({ onLogin }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Test token con chiamata API
      const res = await fetch('https://cv-merch-backend.onrender.com/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        localStorage.setItem('admin_token', token);
        onLogin(token);
      } else {
        setError('Token non valido');
      }
    } catch (err) {
      setError('Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="flex items-center justify-center mb-8">
          <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center text-white font-bold text-2xl">
            M
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2">MIDA Admin</h1>
        <p className="text-gray-600 text-center mb-8">Inserisci il token amministratore</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Inserisci il token..."
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50"
          >
            {loading ? 'Verifica...' : 'Accedi'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            💡 <strong>Come ottenere il token:</strong><br/>
            Il token è stato generato durante il setup backend su Render.<br/>
            Controlla Environment Variables → ADMIN_TOKEN
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
