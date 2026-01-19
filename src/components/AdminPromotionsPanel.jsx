import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function AdminPromotionsPanel() {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    type: 'PERCENTAGE',
    isActive: true,
    priority: 0,
    discountValue: '',
    discountTiers: null,
    conditions: {
      minQuantity: '',
      maxQuantity: '',
      minCartValue: '',
      maxCartValue: '',
      categories: [],
      products: [],
      attributes: {}
    },
    bogoConfig: null,
    giftProductId: '',
    startDate: '',
    endDate: '',
    badgeText: '',
    badgeColor: '#FF0000',
    showProgressBar: false,
    progressBarText: '',
    showPopup: false,
    popupText: '',
    maxUsesTotal: '',
    maxUsesPerUser: '',
    combinesWith: []
  });
  const [activeTab, setActiveTab] = useState('list');

  useEffect(() => {
    loadPromotions();
    loadProducts();
  }, []);

  const loadPromotions = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/api/admin/promotions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPromotions(data);
    } catch (error) {
      console.error('Error loading promotions:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/api/admin/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const openCreateModal = () => {
    setEditingPromo(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      type: 'PERCENTAGE',
      isActive: true,
      priority: 0,
      discountValue: '',
      discountTiers: null,
      conditions: {
        minQuantity: '',
        maxQuantity: '',
        minCartValue: '',
        maxCartValue: '',
        categories: [],
        products: [],
        attributes: {}
      },
      bogoConfig: null,
      giftProductId: '',
      startDate: '',
      endDate: '',
      badgeText: '',
      badgeColor: '#FF0000',
      showProgressBar: false,
      progressBarText: '',
      showPopup: false,
      popupText: '',
      maxUsesTotal: '',
      maxUsesPerUser: '',
      combinesWith: []
    });
    setShowModal(true);
  };

  const openEditModal = (promo) => {
    setEditingPromo(promo);
    setFormData({
      name: promo.name,
      slug: promo.slug,
      description: promo.description || '',
      type: promo.type,
      isActive: promo.isActive,
      priority: promo.priority,
      discountValue: promo.discountValue?.toString() || '',
      discountTiers: promo.discountTiers,
      conditions: promo.conditions || {},
      bogoConfig: promo.bogoConfig,
      giftProductId: promo.giftProductId || '',
      startDate: promo.startDate ? new Date(promo.startDate).toISOString().slice(0, 16) : '',
      endDate: promo.endDate ? new Date(promo.endDate).toISOString().slice(0, 16) : '',
      badgeText: promo.badgeText || '',
      badgeColor: promo.badgeColor || '#FF0000',
      showProgressBar: promo.showProgressBar,
      progressBarText: promo.progressBarText || '',
      showPopup: promo.showPopup,
      popupText: promo.popupText || '',
      maxUsesTotal: promo.maxUsesTotal?.toString() || '',
      maxUsesPerUser: promo.maxUsesPerUser?.toString() || '',
      combinesWith: promo.combinesWith || []
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const url = editingPromo 
        ? `${API_URL}/api/admin/promotions/${editingPromo.id}`
        : `${API_URL}/api/admin/promotions`;
      
      const res = await fetch(url, {
        method: editingPromo ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowModal(false);
        loadPromotions();
        alert('✅ Promozione salvata!');
      } else {
        const error = await res.json();
        alert('Errore: ' + error.error);
      }
    } catch (error) {
      console.error('Error saving promotion:', error);
      alert('Errore nel salvataggio');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Eliminare "${name}"?`)) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`${API_URL}/api/admin/promotions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      loadPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      alert('Errore nell\'eliminazione');
    }
  };

  const handleToggle = async (id) => {
    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`${API_URL}/api/admin/promotions/${id}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      loadPromotions();
    } catch (error) {
      console.error('Error toggling promotion:', error);
    }
  };

  const typeLabels = {
    PERCENTAGE: '% Percentuale',
    FIXED: '€ Sconto Fisso',
    PRICE_FIXED: '€ Prezzo Fisso',
    FREE_SHIPPING: '📦 Spedizione Gratis',
    FREE_GIFT: '🎁 Regalo Omaggio',
    BOGO: '🎯 Buy X Get Y',
    TIERED: '📊 Sconto Progressivo/Cumulativo'
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">🎁 Gestione Promozioni</h1>
          <p className="text-gray-600 mt-1">{promotions.length} promozioni totali</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold">
          + Nuova Promozione
        </button>
      </div>

      {/* Lista Promozioni */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {promotions.map(promo => (
          <div key={promo.id} className="bg-white rounded-lg shadow-lg p-6 border-l-4" 
               style={{ borderColor: promo.badgeColor }}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold">{promo.name}</h3>
                  {!promo.isActive && (
                    <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                      Disattivata
                    </span>
                  )}
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-mono">
                    P: {promo.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{promo.description}</p>
                <p className="text-xs text-gray-500">/{promo.slug}</p>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <span 
                  className="px-4 py-2 rounded text-white font-bold text-sm whitespace-nowrap"
                  style={{ backgroundColor: promo.badgeColor }}>
                  {promo.badgeText || typeLabels[promo.type]}
                </span>
                <span className="text-xs text-gray-500">
                  {promo._count?.usages || 0} utilizzi
                </span>
              </div>
            </div>

            {/* Tipo e Valore */}
            <div className="bg-gray-50 rounded p-3 mb-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">Tipo Sconto:</p>
              <p className="text-sm font-medium">{typeLabels[promo.type]}</p>
              {promo.discountValue && (
                <p className="text-lg font-bold text-green-600 mt-1">
                  {promo.type === 'PERCENTAGE' ? `-${promo.discountValue}%` : `-€${promo.discountValue}`}
                </p>
              )}
            </div>

            {/* Condizioni */}
            <div className="bg-blue-50 rounded p-3 mb-4">
              <p className="text-xs font-semibold text-blue-800 mb-2">📋 Condizioni:</p>
              <div className="text-xs space-y-1">
                {promo.conditions?.minQuantity && (
                  <p>✓ Min {promo.conditions.minQuantity} prodotti</p>
                )}
                {promo.conditions?.minCartValue && (
                  <p>✓ Carrello min €{promo.conditions.minCartValue}</p>
                )}
                {promo.conditions?.categories?.length > 0 && (
                  <p>✓ Categorie: {promo.conditions.categories.join(', ')}</p>
                )}
                {promo.conditions?.attributes?.sameTaglia && (
                  <p>✓ Stessa taglia richiesta</p>
                )}
              </div>
            </div>

            {/* Display */}
            <div className="flex gap-2 text-xs mb-4">
              {promo.showProgressBar && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                  📊 Progress Bar
                </span>
              )}
              {promo.showPopup && (
                <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded">
                  🎉 Popup
                </span>
              )}
            </div>

            {/* Validità */}
            {promo.endDate && (
              <p className="text-xs text-red-600 mb-4">
                ⏰ Scade: {new Date(promo.endDate).toLocaleDateString('it-IT')}
              </p>
            )}

            {/* Azioni */}
            <div className="flex gap-2">
              <button
                onClick={() => handleToggle(promo.id)}
                className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                  promo.isActive
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}>
                {promo.isActive ? '⏸️ Disattiva' : '▶️ Attiva'}
              </button>
              <button
                onClick={() => openEditModal(promo)}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                ✏️ Modifica
              </button>
              <button
                onClick={() => handleDelete(promo.id, promo.name)}
                className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {promotions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">🎁</div>
          <p className="text-gray-500 text-lg mb-4">Nessuna promozione configurata</p>
          <button
            onClick={openCreateModal}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
            Crea la Prima Promozione
          </button>
        </div>
      )}

      {/* Modal Crea/Modifica */}
      {showModal && (
        <PromotionModal
          formData={formData}
          setFormData={setFormData}
          products={products}
          editingPromo={editingPromo}
          onSave={handleSubmit}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function PromotionModal({ formData, setFormData, products, editingPromo, onSave, onClose }) {
  const [activeSection, setActiveSection] = useState('basic');

  const typeOptions = [
    { value: 'PERCENTAGE', label: '% Percentuale', emoji: '💯' },
    { value: 'FIXED', label: '€ Sconto Fisso', emoji: '💰' },
    { value: 'PRICE_FIXED', label: '€ Prezzo Fisso', emoji: '🏷️' },
    { value: 'FREE_SHIPPING', label: 'Spedizione Gratis', emoji: '📦' },
    { value: 'FREE_GIFT', label: 'Regalo Omaggio', emoji: '🎁' },
    { value: 'BOGO', label: 'Buy X Get Y', emoji: '🎯' },
    { value: 'TIERED', label: 'Sconto Progressivo', emoji: '📊' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {editingPromo ? '✏️ Modifica Promozione' : '✨ Nuova Promozione'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {['basic', 'conditions', 'display', 'limits'].map(section => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-4 py-2 rounded whitespace-nowrap text-sm font-medium ${
                  activeSection === section
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {section === 'basic' && '🎨 Base'}
                {section === 'conditions' && '📋 Condizioni'}
                {section === 'display' && '🎪 Display'}
                {section === 'limits' && '⚙️ Limiti'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {activeSection === 'basic' && (
            <>
              {/* Nome & Slug */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Black Friday -20%"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slug *</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="black-friday-2024"
                    disabled={!!editingPromo}
                  />
                </div>
              </div>

              {/* Descrizione */}
              <div>
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                  placeholder="Sconto del 20% su tutti gli ordini superiori a 100€"
                />
              </div>

              {/* Tipo Sconto */}
              <div>
                <label className="block text-sm font-medium mb-2">Tipo Sconto *</label>
                <div className="grid grid-cols-2 gap-3">
                  {typeOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({...formData, type: opt.value})}
                      className={`p-3 rounded border-2 text-left ${
                        formData.type === opt.value
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="font-medium text-sm">{opt.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Valore Sconto (se non TIERED/BOGO/FREE_*) */}
              {!['TIERED', 'BOGO', 'FREE_SHIPPING', 'FREE_GIFT'].includes(formData.type) && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Valore Sconto * {formData.type === 'PERCENTAGE' ? '(%)' : '(€)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({...formData, discountValue: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    placeholder={formData.type === 'PERCENTAGE' ? '20' : '10.00'}
                  />
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Priorità (più alto = applicata prima)
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              {/* Stato Attivo */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  Promozione Attiva
                </label>
              </div>
            </>
          )}

          {activeSection === 'conditions' && (
            <>
              {/* Quantità */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min Quantità Prodotti</label>
                  <input
                    type="number"
                    value={formData.conditions?.minQuantity || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      conditions: {...formData.conditions, minQuantity: e.target.value ? parseInt(e.target.value) : null}
                    })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="es. 2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Quantità Prodotti</label>
                  <input
                    type="number"
                    value={formData.conditions?.maxQuantity || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      conditions: {...formData.conditions, maxQuantity: e.target.value ? parseInt(e.target.value) : null}
                    })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Lascia vuoto per nessun limite"
                  />
                </div>
              </div>

              {/* Valore Carrello */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min Valore Carrello (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.conditions?.minCartValue || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      conditions: {...formData.conditions, minCartValue: e.target.value ? parseFloat(e.target.value) : null}
                    })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="es. 50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Valore Carrello (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.conditions?.maxCartValue || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      conditions: {...formData.conditions, maxCartValue: e.target.value ? parseFloat(e.target.value) : null}
                    })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>

              {/* Attributi */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Attributi Richiesti</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.conditions?.attributes?.sameTaglia || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          attributes: {...formData.conditions?.attributes, sameTaglia: e.target.checked}
                        }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Stessa Taglia</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.conditions?.attributes?.sameColor || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          attributes: {...formData.conditions?.attributes, sameColor: e.target.checked}
                        }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Stesso Colore</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.conditions?.attributes?.sameProduct || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          attributes: {...formData.conditions?.attributes, sameProduct: e.target.checked}
                        }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Stesso Prodotto</span>
                  </label>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                <p className="font-semibold text-blue-800 mb-1">💡 Suggerimento</p>
                <p className="text-blue-700">
                  Lascia i campi vuoti per non applicare restrizioni. Le condizioni attive si sommeranno (AND logico).
                </p>
              </div>
            </>
          )}

          {activeSection === 'display' && (
            <>
              {/* Badge */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Testo Badge</label>
                  <input
                    type="text"
                    value={formData.badgeText}
                    onChange={(e) => setFormData({...formData, badgeText: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="es. -20% o 2+1 GRATIS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Colore Badge</label>
                  <input
                    type="color"
                    value={formData.badgeColor}
                    onChange={(e) => setFormData({...formData, badgeColor: e.target.value})}
                    className="w-full h-10 border rounded"
                  />
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.showProgressBar}
                    onChange={(e) => setFormData({...formData, showProgressBar: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Mostra Progress Bar nel Carrello</span>
                </label>
                {formData.showProgressBar && (
                  <input
                    type="text"
                    value={formData.progressBarText}
                    onChange={(e) => setFormData({...formData, progressBarText: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Aggiungi {remaining} prodotti per -15%!"
                  />
                )}
              </div>

              {/* Popup */}
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.showPopup}
                    onChange={(e) => setFormData({...formData, showPopup: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Mostra Popup quando Attivata</span>
                </label>
                {formData.showPopup && (
                  <input
                    type="text"
                    value={formData.popupText}
                    onChange={(e) => setFormData({...formData, popupText: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Congratulazioni! Hai sbloccato -20% 🎉"
                  />
                )}
              </div>

              {/* Preview Badge */}
              <div className="bg-gray-50 rounded p-4">
                <p className="text-sm font-medium mb-3">👁️ Anteprima Badge:</p>
                <div 
                  className="inline-block px-4 py-2 rounded text-white font-bold shadow-lg"
                  style={{ backgroundColor: formData.badgeColor }}>
                  {formData.badgeText || 'Testo Badge'}
                </div>
              </div>
            </>
          )}

          {activeSection === 'limits' && (
            <>
              {/* Validità Temporale */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Data Inizio</label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Data Fine</label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>

              {/* Limiti Utilizzo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Max Utilizzi Totali</label>
                  <input
                    type="number"
                    value={formData.maxUsesTotal}
                    onChange={(e) => setFormData({...formData, maxUsesTotal: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Lascia vuoto per illimitati"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Utilizzi per Utente</label>
                  <input
                    type="number"
                    value={formData.maxUsesPerUser}
                    onChange={(e) => setFormData({...formData, maxUsesPerUser: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="es. 1"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                <p className="font-semibold text-yellow-800 mb-1">⚠️ Attenzione</p>
                <p className="text-yellow-700">
                  I limiti di utilizzo aiutano a controllare i costi delle promozioni. Imposta sempre valori ragionevoli.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium">
            Annulla
          </button>
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded hover:from-purple-700 hover:to-pink-700 font-semibold">
            {editingPromo ? '💾 Salva Modifiche' : '✨ Crea Promozione'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminPromotionsPanel;