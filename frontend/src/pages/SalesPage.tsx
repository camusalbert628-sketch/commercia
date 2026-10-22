import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Search, Trash2, Calendar, CreditCard, User, Eye, X } from 'lucide-react';
import { api } from '../services/api';
import { Sale } from '../types';
import { useModals } from '../context/ModalContext';

interface SalesPageProps {
  onOpenSaleModal?: () => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({ onOpenSaleModal: propOpenSale }) => {
  const { openSaleModal, refreshKey } = useModals();
  const onOpenSaleModal = propOpenSale || openSaleModal;

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/sales?limit=50');
      const list = Array.isArray(res) ? res : (res?.sales || []);
      setSales(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [refreshKey]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment annuler cette vente ? Le stock sera restauré.')) return;
    try {
      await api.delete(`/sales/${id}`);
      fetchSales();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la suppression.');
    }
  };

  const filtered = sales.filter(s => {
    const matchesSearch =
      search === '' ||
      s.items.some(i => i.name.toLowerCase().includes(search.toLowerCase())) ||
      (s.customer && s.customer.name.toLowerCase().includes(search.toLowerCase()));

    const matchesMethod = filterMethod === '' || s.paymentMethod === filterMethod;
    return matchesSearch && matchesMethod;
  });

  const totalFiltered = filtered.reduce((sum, s) => sum + s.totalAmount, 0);

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 4px 0' }}>Historique des Ventes</h1>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
            {filtered.length} vente(s) — Total : <strong style={{ color: '#059669' }}>{totalFiltered.toLocaleString('fr-FR')} FCFA</strong>
          </p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onOpenSaleModal}>
          <Plus size={18} />
          <span>+ Nouvelle Vente</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Rechercher par article ou client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <select
          value={filterMethod}
          onChange={e => setFilterMethod(e.target.value)}
          style={{ width: 'auto', minWidth: '180px' }}
        >
          <option value="">Tous les règlements</option>
          <option value="cash">💵 Espèces (Cash)</option>
          <option value="mobile_money">📱 Mobile Money</option>
          <option value="credit">⏳ À Crédit</option>
        </select>
      </div>

      {/* Sales Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Date & Heure</th>
                <th>Articles & Panier</th>
                <th>Client</th>
                <th>Mode</th>
                <th>Total Vente</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td style={{ fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 600 }}>{new Date(s.saleDate).toLocaleDateString('fr-FR')}</div>
                    <div style={{ color: '#64748B', fontSize: '0.78rem' }}>
                      {new Date(s.saleDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                      {s.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      {s.items.length} article(s) distinct(s)
                    </div>
                  </td>
                  <td>
                    {s.customer ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0F172A', fontWeight: 600 }}>
                        <User size={14} color="#059669" />
                        {s.customer.name}
                      </span>
                    ) : (
                      <span style={{ color: '#94A3B8' }}>Comptoir</span>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background:
                          s.paymentMethod === 'mobile_money'
                            ? '#EFF6FF'
                            : s.paymentMethod === 'credit'
                            ? '#FEE2E2'
                            : '#F1F5F9',
                        color:
                          s.paymentMethod === 'mobile_money'
                            ? '#2563EB'
                            : s.paymentMethod === 'credit'
                            ? '#DC2626'
                            : '#334155',
                      }}
                    >
                      {s.paymentMethod === 'mobile_money'
                        ? '📱 Mobile Money'
                        : s.paymentMethod === 'credit'
                        ? '⏳ Crédit'
                        : '💵 Espèces'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 800, fontSize: '1rem', color: '#059669' }}>
                    +{s.totalAmount.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedSale(s)}
                        title="Voir le reçu"
                        style={{ padding: '6px 10px' }}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(s.id)}
                        title="Supprimer la vente"
                        style={{ padding: '6px 10px' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    Aucune vente ne correspond à vos critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail / Receipt Modal */}
      {selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem' }}>Ticket de Vente</h3>
              <button onClick={() => setSelectedSale(null)} style={{ background: 'transparent', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', paddingBottom: '16px', borderBottom: '1px dashed #CBD5E1' }}>
                <img
                  src="/commercia-logo.png"
                  alt="COMMERCIA"
                  style={{
                    width: '48px',
                    height: '48px',
                    objectFit: 'contain',
                    margin: '0 auto 8px',
                    display: 'block',
                  }}
                />
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#08162B' }}>
                  COMMERC<span style={{ color: '#FF7A00' }}>IA</span> TICKET
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Date : {new Date(selectedSale.saleDate).toLocaleString('fr-FR')}
                </div>
                {selectedSale.customer && (
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>
                    Client : {selectedSale.customer.name}
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 0', borderBottom: '1px dashed #CBD5E1' }}>
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.9rem' }}>
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span style={{ fontWeight: 600 }}>{(item.quantity * item.unitPrice).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                ))}
              </div>

              <div style={{ paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>TOTAL :</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0062FF' }}>
                  {selectedSale.totalAmount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedSale(null)}>
                Fermer
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  window.print();
                }}
              >
                Imprimer le ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
