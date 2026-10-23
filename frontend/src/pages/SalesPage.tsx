import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, User, Eye, Download } from 'lucide-react';
import { api } from '../services/api';
import { Sale } from '../types';
import { useModals } from '../context/ModalContext';
import { ReceiptModal } from '../components/modals/ReceiptModal';

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

  const exportToCSV = () => {
    if (filtered.length === 0) {
      alert('Aucune vente à exporter.');
      return;
    }

    const headers = ['ID Vente', 'Date', 'Heure', 'Client', 'Articles', 'Mode de Règlement', 'Montant Total (FCFA)'];
    const rows = filtered.map(s => {
      const d = new Date(s.saleDate);
      const dateStr = d.toLocaleDateString('fr-FR');
      const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const clientStr = s.customer?.name || 'Comptoir';
      const articlesStr = s.items.map(i => `${i.quantity}x ${i.name}`).join(' | ');
      const methodStr = s.paymentMethod === 'mobile_money' ? 'Mobile Money' : s.paymentMethod === 'credit' ? 'Crédit' : 'Espèces';
      return [
        `#${s.id.slice(0, 8)}`,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${clientStr}"`,
        `"${articlesStr.replace(/"/g, '""')}"`,
        `"${methodStr}"`,
        s.totalAmount,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `COMMERCIA_Ventes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 4px 0' }}>Historique des Ventes</h1>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
            {filtered.length} vente(s) — Total : <strong style={{ color: '#059669' }}>{totalFiltered.toLocaleString('fr-FR')} FCFA</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={exportToCSV} title="Exporter les ventes en fichier CSV / Excel">
            <Download size={16} />
            <span>Exporter CSV</span>
          </button>
          <button className="btn btn-primary btn-lg" onClick={onOpenSaleModal}>
            <Plus size={18} />
            <span>+ Nouvelle Vente</span>
          </button>
        </div>
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
      <ReceiptModal
        sale={selectedSale}
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </div>
  );
};
