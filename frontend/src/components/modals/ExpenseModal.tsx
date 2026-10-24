import React, { useState } from 'react';
import { X, TrendingDown } from 'lucide-react';
import { api } from '../../services/api';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseCreated: () => void;
}

const DEFAULT_CATEGORIES = [
  { id: 'marchandise', name: 'Marchandise & Ravitaillement', icon: '🏬' },
  { id: 'transport', name: 'Transport & Moto-taxi', icon: '🛵' },
  { id: 'loyer', name: 'Loyer boutique', icon: '🏠' },
  { id: 'electricite', name: 'Électricité & Eau', icon: '💡' },
  { id: 'telephone', name: 'Téléphone & Internet', icon: '📱' },
  { id: 'emballages', name: 'Emballages & Plastiques', icon: '📦' },
  { id: 'salaires', name: 'Salaires & Aides', icon: '👥' },
  { id: 'autre', name: 'Autre dépense', icon: '📋' },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onExpenseCreated }) => {
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState('marchandise');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customBeneficiary, setCustomBeneficiary] = useState('');
  const [customPaymentMethod, setCustomPaymentMethod] = useState<'cash' | 'mobile_money' | 'virement'>('cash');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Veuillez saisir un montant valide.');
      return;
    }

    if (category === 'autre' && !customCategoryName.trim()) {
      setError('Veuillez préciser le nom de votre catégorie de dépense.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const selectedCategoryObj = DEFAULT_CATEGORIES.find(c => c.id === category);
      const finalCategory = category === 'autre' && customCategoryName.trim()
        ? `Autre: ${customCategoryName.trim()}`
        : (selectedCategoryObj?.name || category);

      let finalDescription = description.trim();
      if (customBeneficiary.trim()) {
        finalDescription = `Bénéficiaire: ${customBeneficiary.trim()}${finalDescription ? ' • ' + finalDescription : ''}`;
      }

      const res = await api.post<{ message: string }>('/expenses', {
        amount: Number(amount),
        category: finalCategory,
        description: finalDescription || undefined,
        paymentMethod: customPaymentMethod,
      });

      setSuccessMsg(res.message);
      setTimeout(() => {
        onExpenseCreated();
        onClose();
        setAmount('');
        setDescription('');
        setCustomCategoryName('');
        setCustomBeneficiary('');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement de la dépense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                background: '#FFF4ED',
                color: '#FF6B00',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
              }}
            >
              <TrendingDown size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Nouvelle Dépense</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Enregistrez une sortie d'argent pour calculer votre bénéfice réel
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#94A3B8' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {error && (
              <div style={{ padding: '10px 14px', background: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '0.88rem' }}>
                {error}
              </div>
            )}
            {successMsg && (
              <div style={{ padding: '12px 14px', background: '#DCFCE7', color: '#16A34A', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, whiteSpace: 'pre-line' }}>
                {successMsg}
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Montant de la dépense (FCFA) *
              </label>
              <input
                type="number"
                placeholder="Ex: 5000"
                min="50"
                step="50"
                value={amount}
                onChange={e => setAmount(parseFloat(e.target.value) || '')}
                style={{ fontSize: '1.25rem', fontWeight: 700, color: '#DC2626' }}
                required
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                Catégorie de la dépense
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {DEFAULT_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      textAlign: 'left',
                      border: category === c.id ? '2px solid #FF6B00' : '1px solid #E2E8F0',
                      background: category === c.id ? '#FFF4ED' : '#FFFFFF',
                      color: category === c.id ? '#FF6B00' : '#334155',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{c.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* EXPANDABLE FIELDS SPECIFICALLY FOR "AUTRE DÉPENSE" */}
            {category === 'autre' && (
              <div
                style={{
                  background: '#FFF8F4',
                  border: '1.5px solid #FFD9C2',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#C2410C', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📋</span>
                  <span>Détails de cette dépense personnalisée</span>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Intitulé ou motif exact de la dépense <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Frais de douane, Réparation congélateur, Achat matériel..."
                    value={customCategoryName}
                    onChange={e => setCustomCategoryName(e.target.value)}
                    required
                    autoFocus
                    style={{ background: '#FFFFFF', borderColor: '#FFBD9B' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Bénéficiaire / Prestataire / Prestataire
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Technicien froid, Transitaire..."
                      value={customBeneficiary}
                      onChange={e => setCustomBeneficiary(e.target.value)}
                      style={{ background: '#FFFFFF' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Moyen de paiement
                    </label>
                    <select
                      value={customPaymentMethod}
                      onChange={e => setCustomPaymentMethod(e.target.value as any)}
                      style={{ background: '#FFFFFF', cursor: 'pointer' }}
                    >
                      <option value="cash">💵 Espèces (Cash)</option>
                      <option value="mobile_money">📲 Mobile Money</option>
                      <option value="virement">🏦 Virement bancaire</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Description ou note complémentaire (facultatif) :
              </label>
              <input
                type="text"
                placeholder="Ex: Facture #890, payé avec la caisse du matin..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn" style={{ background: '#DC2626', color: 'white' }} disabled={loading || !amount}>
              {loading ? 'Enregistrement...' : `Enregistrer la Dépense (-${Number(amount || 0).toLocaleString('fr-FR')} FCFA)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
