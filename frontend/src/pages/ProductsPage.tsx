import React, { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Search, ArrowUp, X, Crown, Globe, Truck, Calculator } from 'lucide-react';
import { api } from '../services/api';
import { Product } from '../types';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modal New Product
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [logisticsFees, setLogisticsFees] = useState<number | ''>('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('unité');
  const [lowStockAlert, setLowStockAlert] = useState(5);
  const [isOnlineShop, setIsOnlineShop] = useState(false);

  // Auto-calculate cost price (Prix d'achat + Frais annexes)
  useEffect(() => {
    const pPrice = Number(purchasePrice) || 0;
    const lFees = Number(logisticsFees) || 0;
    if (purchasePrice !== '' || logisticsFees !== '') {
      setCostPrice(pPrice + lFees);
    }
  }, [purchasePrice, logisticsFees]);

  // Modal Adjust Stock
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustQty, setAdjustQty] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('Réapprovisionnement fournisseur');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = onlyLowStock ? '/products?lowStock=true' : '/products';
      const data = await api.get<Product[]>(url);
      setProducts(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [onlyLowStock]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sellingPrice) return;

    try {
      const pPrice = Number(purchasePrice) || Number(costPrice) || 0;
      const lFees = Number(logisticsFees) || 0;
      const realCostPrice = Number(costPrice) || (pPrice + lFees);

      await api.post('/products', {
        name,
        purchasePrice: pPrice,
        logisticsFees: lFees,
        costPrice: realCostPrice,
        sellingPrice: Number(sellingPrice),
        quantity: Number(quantity) || 0,
        unit,
        lowStockAlert: Number(lowStockAlert) || 5,
        isOnlineShop: Boolean(isOnlineShop),
      });

      setShowAddModal(false);
      setName('');
      setPurchasePrice('');
      setLogisticsFees('');
      setCostPrice('');
      setSellingPrice('');
      setQuantity('');
      setIsOnlineShop(false);
      fetchProducts();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la création du produit.');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQty || adjustQty <= 0) return;

    try {
      await api.post(`/products/${selectedProduct.id}/adjust`, {
        type: adjustType,
        quantity: Number(adjustQty),
        reason: adjustReason,
      });

      setShowAdjustModal(false);
      setSelectedProduct(null);
      setAdjustQty('');
      fetchProducts();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la mise à jour du stock.');
    }
  };

  const filtered = products.filter(p =>
    search === '' || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalStockValue = products.reduce((sum, p) => sum + p.costPrice * p.quantity, 0);
  const totalPotentialRevenue = products.reduce((sum, p) => sum + p.sellingPrice * p.quantity, 0);

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 4px 0' }}>Gestion de Stock & Articles</h1>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
            Valeur du stock (Coût d'achat) : <strong style={{ color: '#059669' }}>{totalStockValue.toLocaleString('fr-FR')} FCFA</strong>
            {' — '}Potentiel de vente : <strong>{totalPotentialRevenue.toLocaleString('fr-FR')} FCFA</strong>
          </p>
        </div>

        <button className="btn btn-primary btn-lg" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          <span>+ Ajouter un Article</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <button
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={`btn ${onlyLowStock ? 'btn-danger' : 'btn-outline'}`}
          style={{ padding: '10px 16px', fontSize: '0.88rem' }}
        >
          <AlertTriangle size={16} />
          <span>Alertes Rupture ({products.filter(p => p.quantity <= p.lowStockAlert).length})</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Désignation Article</th>
                <th>Coût d'Achat & Frais</th>
                <th>Prix de Revient</th>
                <th>Prix de Vente</th>
                <th>Marge Réelle</th>
                <th>En Stock</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const pPurchase = p.purchasePrice ?? p.costPrice;
                const pFees = p.logisticsFees ?? 0;
                const pCost = p.costPrice || (pPurchase + pFees);
                const margin = p.sellingPrice - pCost;
                const marginPercent = pCost > 0 ? Math.round((margin / pCost) * 100) : 100;
                const isLow = p.quantity <= p.lowStockAlert;
                const isOut = p.quantity === 0;

                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.name}</div>
                        {(p as any).isOnlineShop && (
                          <span
                            style={{
                              background: '#EFF6FF',
                              color: '#0062FF',
                              border: '1px solid #BFDBFE',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                            title="Disponible sur la boutique en ligne"
                          >
                            <Globe size={11} />
                            <span>En Ligne</span>
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Unité : {p.unit}</div>
                    </td>
                    <td style={{ color: '#64748B', fontSize: '0.88rem' }}>
                      <div>Achat : <strong>{pPurchase.toLocaleString('fr-FR')} FCFA</strong></div>
                      {pFees > 0 ? (
                        <div style={{ fontSize: '0.76rem', color: '#0284C7' }}>+ Frais/Fret : {pFees.toLocaleString('fr-FR')} FCFA</div>
                      ) : (
                        <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>0 FCFA de frais</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0F172A' }}>
                        {pCost.toLocaleString('fr-FR')} FCFA
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Prix de revient net</div>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0062FF' }}>
                      {p.sellingPrice.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td>
                      <span
                        style={{
                          background: margin > 0 ? '#ECFDF5' : '#FEF3C7',
                          color: margin > 0 ? '#059669' : '#D97706',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'inline-block',
                        }}
                      >
                        +{margin.toLocaleString('fr-FR')} FCFA ({marginPercent}%)
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '1.05rem',
                            color: isOut ? '#DC2626' : isLow ? '#D97706' : '#059669',
                          }}
                        >
                          {p.quantity} {p.unit}
                        </span>
                        {isLow && (
                          <span
                            style={{
                              background: isOut ? '#FEE2E2' : '#FEF3C7',
                              color: isOut ? '#DC2626' : '#92400E',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {isOut ? 'ÉPUISÉ' : 'CRITIQUE'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedProduct(p);
                          setAdjustType('in');
                          setAdjustQty(10);
                          setShowAdjustModal(true);
                        }}
                        style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                      >
                        <ArrowUp size={14} color="#059669" />
                        <span>Réapprovisionner</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    Aucun article trouvé. Cliquez sur "+ Ajouter un Article".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Nouvel Article & Tarification</h3>
                <span
                  style={{
                    background: '#FEF3C7',
                    color: '#B45309',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Crown size={12} />
                  <span>PLAN PRO</span>
                </span>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Nom de l'article *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Robe Soirée Satinée, Riz Parfumé 5kg, iPhone 13..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {/* PRO FEATURE: Cost Breakdown */}
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '12px',
                    padding: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calculator size={14} color="#0062FF" />
                      Structure de Coût (Prix d'Achat + Frais)
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                      Calcul automatique
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        1. Prix d'achat (FCFA)
                      </label>
                      <input
                        type="number"
                        placeholder="Ex: 5000"
                        min="0"
                        value={purchasePrice}
                        onChange={e => setPurchasePrice(parseFloat(e.target.value) || '')}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        2. Frais annexes / Fret (FCFA)
                      </label>
                      <input
                        type="number"
                        placeholder="Ex: 500 (Transport/Colis)"
                        min="0"
                        value={logisticsFees}
                        onChange={e => setLogisticsFees(parseFloat(e.target.value) || '')}
                      />
                    </div>
                  </div>

                  {/* Calculated Cost Price Display */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
                      = Prix de Revient Calculé :
                    </span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                      {Number(costPrice || 0).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>

                {/* Selling Price & Unit Margin Preview */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0062FF', display: 'block', marginBottom: '6px' }}>
                      Prix de vente client (FCFA) *
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 8000"
                      min="0"
                      value={sellingPrice}
                      onChange={e => setSellingPrice(parseFloat(e.target.value) || '')}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Marge nette unitaire
                    </label>
                    <div
                      style={{
                        height: '42px',
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        color: Number(sellingPrice || 0) - Number(costPrice || 0) >= 0 ? '#16A34A' : '#DC2626',
                        fontSize: '0.92rem',
                      }}
                    >
                      {sellingPrice !== '' && costPrice !== ''
                        ? `+${(Number(sellingPrice) - Number(costPrice)).toLocaleString('fr-FR')} FCFA`
                        : '0 FCFA'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Quantité initiale en stock
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={quantity}
                      onChange={e => setQuantity(parseInt(e.target.value) || '')}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Unité (pièce, sac, boîte, carton)
                    </label>
                    <input
                      type="text"
                      placeholder="unité"
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                    />
                  </div>
                </div>

                {/* Online Shop / WhatsApp Catalog Option */}
                <div
                  style={{
                    background: isOnlineShop ? '#EFF6FF' : '#F8FAFC',
                    border: `1px solid ${isOnlineShop ? '#93C5FD' : '#E2E8F0'}`,
                    borderRadius: '10px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setIsOnlineShop(!isOnlineShop)}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isOnlineShop}
                      onChange={e => setIsOnlineShop(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#0062FF' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Globe size={15} color="#0062FF" />
                        Activer sur la Boutique en ligne & Catalogue WhatsApp
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                        Permet de commander cet article directement à distance via votre lien commerçant.
                      </div>
                    </div>
                  </label>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Seuil d'alerte stock bas
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lowStockAlert}
                    onChange={e => setLowStockAlert(parseInt(e.target.value) || 5)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Créer l'article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Mouvement de Stock</h3>
              <button onClick={() => setShowAdjustModal(false)} style={{ background: 'transparent', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdjustStock}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontWeight: 700 }}>{selectedProduct.name}</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                    Actuellement en stock : <strong>{selectedProduct.quantity} {selectedProduct.unit}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAdjustType('in')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      border: adjustType === 'in' ? '2px solid #059669' : '1px solid #CBD5E1',
                      background: adjustType === 'in' ? '#ECFDF5' : '#FFFFFF',
                      color: adjustType === 'in' ? '#059669' : '#475569',
                    }}
                  >
                    + Entrée (Achat / Ravitaillement)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('out')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      border: adjustType === 'out' ? '2px solid #DC2626' : '1px solid #CBD5E1',
                      background: adjustType === 'out' ? '#FEE2E2' : '#FFFFFF',
                      color: adjustType === 'out' ? '#DC2626' : '#475569',
                    }}
                  >
                    - Sortie (Perte / Casse)
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Quantité {adjustType === 'in' ? 'reçue' : 'retirée'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={adjustQty}
                    onChange={e => setAdjustQty(parseInt(e.target.value) || '')}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Motif / Raison
                  </label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Valider le mouvement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
