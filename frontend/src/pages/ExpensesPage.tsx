import React, { useState, useEffect } from 'react';
import { TrendingDown, Plus, Trash2, Tag, Calendar, Search, Download } from 'lucide-react';
import { api } from '../services/api';
import { Expense } from '../types';
import { useModals } from '../context/ModalContext';
import { useAuthStore } from '../store/authStore';
import { PageGuideBanner } from '../components/common/PageGuideBanner';
import { formatCurrency, downloadCSVWithBOM, formatLocalDateTime } from '../utils/formatters';

const ITEMS_PER_PAGE = 15;

interface ExpensesPageProps {
  onOpenExpenseModal?: () => void;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({ onOpenExpenseModal: propOpenExpense }) => {
  const { openExpenseModal, refreshKey } = useModals();
  const onOpenExpenseModal = propOpenExpense || openExpenseModal;
  const { user, activeBusinessId } = useAuthStore();
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];
  const currency = activeBusiness?.currency || 'FCFA';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/expenses?limit=500');
      const list = Array.isArray(res) ? res : (res?.expenses || []);
      setExpenses(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [refreshKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Voulez-vous supprimer cette dépense ?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la suppression.');
    }
  };

  const categories = Array.from(new Set(expenses.map(e => e.category)));

  const filtered = expenses.filter(e => {
    const matchCat = selectedCategory === '' || e.category === selectedCategory;
    const q = search.trim().toLowerCase();
    const matchSearch = !q || (
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.category && e.category.toLowerCase().includes(q))
    );
    return matchCat && matchSearch;
  });

  const totalFiltered = filtered.reduce((sum, e) => sum + e.amount, 0);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedExpenses = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert('Aucune dépense à exporter.');
      return;
    }
    const headers = ['Date', 'Catégorie', 'Mode de paiement', 'Bénéficiaire', 'Description / Motif', `Montant (${currency})`];
    const rows = filtered.map(e => [
      formatLocalDateTime(e.expenseDate),
      e.category,
      e.paymentMethod === 'mobile_money' ? 'Mobile Money' : e.paymentMethod === 'virement' ? 'Virement bancaire' : 'Espèces (Caisse)',
      e.beneficiary || '',
      e.description || '',
      e.amount,
    ]);
    downloadCSVWithBOM(`commercia_depenses_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="page-wrapper" style={{ width: '100%', maxWidth: '100%' }}>
      <PageGuideBanner
        pageId="expenses"
        title="Dépenses & Charges d'Exploitation"
        subtitle="Enregistrez chaque sortie d'argent pour calculer votre vrai bénéfice net et éviter la faillite silencieuse."
        autoDomino={[
          "Chaque dépense déduit immédiatement le bénéfice net de la journée sur le tableau de bord.",
          "Si payée en espèces au comptoir, la sortie d'argent est déduite en direct du solde théorique de la Caisse Journalière.",
          "Le Copilote IA intègre ces charges réelles dans le calcul d'autonomie financière à J+30.",
        ]}
        manualActions={[
          "Enregistrer la dépense au moment où vous donnez les billets (ne pas attendre la fin de semaine).",
          "Sélectionner la bonne catégorie (Loyer, Marchandise, Transport, Salaires) pour repérer les fuites.",
          "Conserver le reçu ou la facture papier comme justificatif.",
        ]}
        concreteExample="Vous payez 15 000 de carburant pour le coursier et 5 000 pour l'électricité. Dès la validation, la caisse physique affiche -20 000 et le bénéfice net du jour est immédiatement recalculé sans erreur."
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 4px 0' }}>Gestion des Dépenses</h1>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
            {filtered.length} dépense(s) — Total : <strong style={{ color: '#DC2626' }}>-{formatCurrency(totalFiltered, currency)}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCSV}
            title="Exporter les dépenses au format Excel (CSV)"
          >
            <Download size={16} />
            <span>Exporter CSV</span>
          </button>
          <button className="btn btn-primary btn-lg" style={{ background: '#DC2626' }} onClick={onOpenExpenseModal}>
            <Plus size={18} />
            <span>- Nouvelle Dépense</span>
          </button>
        </div>
      </div>

      {/* Search & Category Pills Filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Rechercher une dépense ou motif..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px', height: '40px', borderRadius: '10px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', flex: '1 1 auto' }}>
          <button
            onClick={() => setSelectedCategory('')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: selectedCategory === '' ? '#0F172A' : '#FFFFFF',
              color: selectedCategory === '' ? '#FFFFFF' : '#475569',
              border: '1px solid #E2E8F0',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            Toutes ({expenses.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: selectedCategory === cat ? '#D97706' : '#FFFFFF',
                color: selectedCategory === cat ? '#FFFFFF' : '#475569',
                border: '1px solid #E2E8F0',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Catégorie</th>
                <th>Règlement</th>
                <th>Description / Bénéficiaire</th>
                <th>Montant</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedExpenses.map(e => (
                <tr key={e.id}>
                  <td style={{ fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 600 }}>{new Date(e.expenseDate).toLocaleDateString('fr-FR')}</div>
                    <div style={{ color: '#64748B', fontSize: '0.78rem' }}>
                      {new Date(e.expenseDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: '#FEF3C7',
                        color: '#92400E',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        display: 'inline-block',
                      }}
                    >
                      {e.category}
                    </span>
                  </td>
                  <td>
                    {e.paymentMethod === 'mobile_money' ? (
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: '#F0F9FF',
                          color: '#0369A1',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>📲</span>
                        <span>Mobile Money</span>
                      </span>
                    ) : e.paymentMethod === 'virement' ? (
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: '#F5F3FF',
                          color: '#6D28D9',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>🏦</span>
                        <span>Banque</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: '#ECFDF5',
                          color: '#065F46',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>💵</span>
                        <span>Espèces</span>
                      </span>
                    )}
                  </td>
                  <td style={{ color: e.description ? '#0F172A' : '#94A3B8' }}>
                    <div>{e.description || 'Sans note particulière'}</div>
                    {e.beneficiary && (
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
                        👤 {e.beneficiary}
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: 800, fontSize: '1rem', color: '#DC2626' }}>
                    -{formatCurrency(e.amount, currency)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(e.id)}
                      title="Supprimer la dépense"
                      style={{ padding: '6px 10px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    Aucune dépense enregistrée correspondant aux critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
            <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
              Page <strong>{currentPage}</strong> sur <strong>{totalPages}</strong> ({filtered.length} dépenses)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '6px 14px', fontSize: '0.84rem' }}
              >
                Précédent
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '6px 14px', fontSize: '0.84rem' }}
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
