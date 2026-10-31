import React, { useState, useEffect } from 'react';
import { TrendingDown, Plus, Trash2, Tag, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { Expense } from '../types';
import { useModals } from '../context/ModalContext';
import { useAuthStore } from '../store/authStore';
import { PageGuideBanner } from '../components/common/PageGuideBanner';

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

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/expenses?limit=50');
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
    return selectedCategory === '' || e.category === selectedCategory;
  });

  const totalFiltered = filtered.reduce((sum, e) => sum + e.amount, 0);

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
        concreteExample="Vous payez 15 000 F de carburant pour le coursier et 5 000 F pour l'électricité. Dès la validation, la caisse physique affiche -20 000 F et le bénéfice net du jour est immédiatement recalculé sans erreur."
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 4px 0' }}>Gestion des Dépenses</h1>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
            {filtered.length} dépense(s) — Total : <strong style={{ color: '#DC2626' }}>-{totalFiltered.toLocaleString('fr-FR')} {currency}</strong>
          </p>
        </div>
        <button className="btn btn-primary btn-lg" style={{ background: '#DC2626' }} onClick={onOpenExpenseModal}>
          <Plus size={18} />
          <span>- Nouvelle Dépense</span>
        </button>
      </div>

      {/* Category Pills Filter */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
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
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Catégorie</th>
                <th>Description</th>
                <th>Montant</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
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
                      }}
                    >
                      {e.category}
                    </span>
                  </td>
                  <td style={{ color: e.description ? '#0F172A' : '#94A3B8' }}>
                    {e.description || 'Sans description particulière'}
                  </td>
                  <td style={{ fontWeight: 800, fontSize: '1rem', color: '#DC2626' }}>
                    -{e.amount.toLocaleString('fr-FR')} {currency}
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
                    Aucune dépense enregistrée dans cette catégorie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
