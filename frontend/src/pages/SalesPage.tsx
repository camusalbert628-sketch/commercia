import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, User, Eye, Download, AlertCircle, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';
import { Sale } from '../types';
import { useModals } from '../context/ModalContext';
import { ReceiptModal } from '../components/modals/ReceiptModal';
import { useAuthStore } from '../store/authStore';
import { PageGuideBanner } from '../components/common/PageGuideBanner';

interface SalesPageProps {
  onOpenSaleModal?: () => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({ onOpenSaleModal: propOpenSale }) => {
  const { openSaleModal, refreshKey } = useModals();
  const onOpenSaleModal = propOpenSale || openSaleModal;
  const { user, activeBusinessId } = useAuthStore();
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];
  const currency = activeBusiness?.currency || 'FCFA';
  const isPro = Boolean(user?.isAdmin || (user?.subscription?.isPro && user?.subscription?.status === 'active'));

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

  // Free plan daily quota calculation
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySalesCount = sales.filter(s => s.saleDate && s.saleDate.slice(0, 10) === todayStr).length;

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
    <div className="page-wrapper fade-in">
      {/* Free Plan Quota Warning Banner */}
      {!isPro && (
        <div
          style={{
            background: todaySalesCount >= 15 ? '#FEF2F2' : '#EFF6FF',
            border: todaySalesCount >= 15 ? '1.5px solid #FCA5A5' : '1px solid #BFDBFE',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>{todaySalesCount >= 15 ? '🛑' : '📊'}</span>
            <div>
              <strong style={{ fontSize: '0.90rem', color: todaySalesCount >= 15 ? '#DC2626' : '#1E40AF', display: 'block' }}>
                {todaySalesCount >= 15
                  ? 'Plafond journalier atteint : 15 / 15 ventes utilisées aujourd\'hui'
                  : `Quota Plan Gratuit : ${todaySalesCount} / 15 ventes enregistrées aujourd'hui`}
              </strong>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                {todaySalesCount >= 15
                  ? 'Votre limite quotidienne de ventes gratuites est atteinte. Débloquez les ventes illimitées avec le Plan Pro.'
                  : `Il vous reste ${Math.max(0, 15 - todaySalesCount)} vente(s) disponible(s) aujourd'hui. Vos ventes au comptoir et en mobile money sont prises en compte.`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '90px', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, (todaySalesCount / 15) * 100)}%`,
                  height: '100%',
                  background: todaySalesCount >= 15 ? '#DC2626' : '#0062FF',
                  borderRadius: '4px',
                }}
              />
            </div>
            <Link
              to="/subscription"
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: todaySalesCount >= 15 ? '#DC2626' : '#0062FF',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '8px',
                border: todaySalesCount >= 15 ? '1px solid #FCA5A5' : '1px solid #BFDBFE',
              }}
            >
              <span>{todaySalesCount >= 15 ? 'Passer à l\'illimité (Pro)' : 'Ventes illimitées Pro'}</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 4px 0' }}>Historique des Ventes</h1>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
            {filtered.length} vente(s) — Total : <strong style={{ color: '#059669' }}>{totalFiltered.toLocaleString('fr-FR')} {currency}</strong>
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

      <PageGuideBanner
        pageId="sales"
        title="Point de Vente & Enregistrement des Ventes"
        subtitle="Enregistrez une vente en moins de 10 secondes et déclenchez l'effet domino automatique"
        autoDomino={[
          "Décrémentation immédiate du stock de l'article ou de l'item du lot vendu.",
          "Si paiement Espèces : le solde théorique de la Caisse Journalière augmente instantanément.",
          "Si paiement Crédit : la dette est automatiquement ajoutée au carnet du client.",
          "Si paiement Mobile Money : la commission d'agent est calculée automatiquement.",
          "Génération automatique d'un reçu numérique partageable directement sur WhatsApp ou imprimable."
        ]}
        manualActions={[
          "Sélectionner les articles ou le lot concerné dans la liste déroulante.",
          "Choisir le mode de paiement réel donné par le client (Espèces, Wave, Orange Money, ou Crédit).",
          "Sélectionner ou créer le client si la vente est à crédit ou pour son suivi fidélité."
        ]}
        concreteExample="Un client achète 2 polos à 6 000 FCFA chacun et paie par Wave. Vous sélectionnez 'Polo', quantité 2, mode 'Mobile Money (Wave)'. En un clic : 2 polos sont décomptés du stock, votre compte Wave est crédité de 12 000 FCFA, et un reçu propre avec lien WhatsApp est prêt à envoyer au client."
        guideSectionId="sales"
      />

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
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={6} style={{ padding: '10px 16px' }}>
                      <div className="skeleton-shimmer" style={{ height: '32px', borderRadius: '8px', width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🧾</div>
                    <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.95rem' }}>Aucune vente trouvée</div>
                    <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '4px' }}>
                      Cliquez sur "+ Nouvelle Vente" pour enregistrer votre premier encaissement.
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(s => (
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
                    +{s.totalAmount.toLocaleString('fr-FR')} {currency}
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
              )))}
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
