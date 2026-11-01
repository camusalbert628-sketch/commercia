import React, { useState } from 'react';
import {
  TrendingDown,
  X,
  Check,
  Calendar,
  User,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/formatters';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseCreated: () => void;
}

interface CategoryDef {
  id: string;
  name: string;
  icon: string;
  pocket: 'poche1' | 'poche2' | 'poche3';
  pocketTag: string;
  pocketBadgeColor: string;
  pocketBadgeBg: string;
  hint: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: 'marchandise',
    name: 'Marchandise & Stock',
    icon: '🏬',
    pocket: 'poche1',
    pocketTag: 'Poche 1 : Stock',
    pocketBadgeColor: '#0284C7',
    pocketBadgeBg: '#E0F2FE',
    hint: 'Achat pour revente',
  },
  {
    id: 'transport',
    name: 'Transport & Moto-taxi',
    icon: '🛵',
    pocket: 'poche2',
    pocketTag: 'Poche 2 : Charges',
    pocketBadgeColor: '#D97706',
    pocketBadgeBg: '#FEF3C7',
    hint: 'Courses, livraisons, carburant',
  },
  {
    id: 'loyer',
    name: 'Loyer boutique & Local',
    icon: '🏠',
    pocket: 'poche2',
    pocketTag: 'Poche 2 : Charges',
    pocketBadgeColor: '#7C3AED',
    pocketBadgeBg: '#EDE9FE',
    hint: 'Loyer mensuel magasin/dépôt',
  },
  {
    id: 'electricite',
    name: 'Électricité & Eau',
    icon: '💡',
    pocket: 'poche2',
    pocketTag: 'Poche 2 : Charges',
    pocketBadgeColor: '#CA8A04',
    pocketBadgeBg: '#FEF9C3',
    hint: 'CIE, Sodeci, Eneo, énergie',
  },
  {
    id: 'telephone',
    name: 'Téléphone & Internet',
    icon: '📱',
    pocket: 'poche2',
    pocketTag: 'Poche 2 : Charges',
    pocketBadgeColor: '#2563EB',
    pocketBadgeBg: '#DBEAFE',
    hint: 'Pass WhatsApp, forfaits data',
  },
  {
    id: 'emballages',
    name: 'Emballages & Plastiques',
    icon: '📦',
    pocket: 'poche2',
    pocketTag: 'Poche 2 : Charges',
    pocketBadgeColor: '#EA580C',
    pocketBadgeBg: '#FFEDD5',
    hint: 'Sacs boutique, scotch, cartons',
  },
  {
    id: 'salaires',
    name: 'Salaires & Aides',
    icon: '👥',
    pocket: 'poche2',
    pocketTag: 'Poche 2 : Charges',
    pocketBadgeColor: '#059669',
    pocketBadgeBg: '#D1FAE5',
    hint: 'Paye vendeuse, coursier, aide',
  },
  {
    id: 'ration',
    name: 'Prélèvement / Ration',
    icon: '🍲',
    pocket: 'poche3',
    pocketTag: 'Poche 3 : Perso',
    pocketBadgeColor: '#DB2777',
    pocketBadgeBg: '#FCE7F3',
    hint: 'Dépense personnelle / maison',
  },
  {
    id: 'autre',
    name: 'Autre dépense...',
    icon: '📋',
    pocket: 'poche2',
    pocketTag: 'Poche 2 : Divers',
    pocketBadgeColor: '#475569',
    pocketBadgeBg: '#F1F5F9',
    hint: 'Dépannage, imprévu...',
  },
];

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 25000, 50000];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onExpenseCreated }) => {
  const { user, activeBusinessId } = useAuthStore();
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];
  const currency = activeBusiness?.currency || 'FCFA';

  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<string>('marchandise');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'virement'>('cash');
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [expenseDate, setExpenseDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const currentCategoryObj = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

  const handleQuickAdd = (preset: number) => {
    setAmount(prev => (typeof prev === 'number' ? prev + preset : preset));
  };

  const handleClearAmount = () => {
    setAmount('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }

    if (category === 'autre' && !customCategoryName.trim()) {
      setError('Veuillez préciser l\'intitulé ou motif exact de votre dépense.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const finalCategory =
        category === 'autre' && customCategoryName.trim()
          ? `Autre: ${customCategoryName.trim()}`
          : currentCategoryObj.name;

      let finalDescription = description.trim();
      const metaInfo: string[] = [];
      if (beneficiary.trim()) {
        metaInfo.push(`Bénéficiaire: ${beneficiary.trim()}`);
      }
      const payLabel =
        paymentMethod === 'cash'
          ? 'Espèces (Caisse)'
          : paymentMethod === 'mobile_money'
          ? 'Mobile Money (Wave/OM)'
          : 'Virement bancaire';
      metaInfo.push(`Paiement: ${payLabel}`);

      if (metaInfo.length > 0) {
        finalDescription = metaInfo.join(' • ') + (finalDescription ? ' — ' + finalDescription : '');
      }

      const res = await api.post<{ message: string }>('/expenses', {
        amount: Number(amount),
        category: finalCategory,
        description: finalDescription || undefined,
        paymentMethod,
        beneficiary: beneficiary.trim() || undefined,
        expenseDate: isCustomDate && expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString(),
      });

      setSuccessMsg(res.message || 'Dépense enregistrée avec succès !');
      setTimeout(() => {
        onExpenseCreated();
        onClose();
        setAmount('');
        setDescription('');
        setBeneficiary('');
        setCustomCategoryName('');
        setIsCustomDate(false);
        setSuccessMsg('');
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement de la dépense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '840px',
          width: '96%',
          maxHeight: '94vh',
          borderRadius: '20px',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#FFF1F2',
                border: '1px solid #FECDD3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#E11D48',
              }}
            >
              <TrendingDown size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Nouvelle Dépense
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '20px',
                    background: '#FEE2E2',
                    color: '#BE123C',
                  }}
                >
                  Sortie de caisse
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
                Enregistrez chaque sortie d'argent pour calculer votre vrai bénéfice net et équilibrer votre caisse
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              color: '#64748B',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#FEF2F2',
                  border: '1px solid #FECDD3',
                  color: '#B91C1C',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  padding: '12px 14px',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#065F46',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Check size={18} color="#059669" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* TOP ROW: MONTANT (LEFT) + REGLEMENT (RIGHT) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px', alignItems: 'stretch' }}>
              {/* 1. MONTANT CARD */}
              <div
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF5F5 100%)',
                  border: '1.5px solid #FECDD3',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Montant de la dépense *
                  </label>
                  {amount && Number(amount) > 0 ? (
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#E11D48' }}>
                      -{formatCurrency(Number(amount), currency)}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>Précisez le montant exact</span>
                  )}
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="0"
                    min="50"
                    step="50"
                    value={amount}
                    onChange={e => setAmount(parseFloat(e.target.value) || '')}
                    className="currency-input-hero"
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      height: '48px',
                      fontSize: '1.75rem',
                      fontWeight: 800,
                      color: '#DC2626',
                      background: '#FFFFFF',
                      border: '2px solid #FCA5A5',
                      borderRadius: '10px',
                      padding: '0 75px 0 14px',
                      outline: 'none',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: '#FEE2E2',
                      color: '#991B1B',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      pointerEvents: 'none',
                    }}
                  >
                    {currency}
                  </div>
                </div>

                {/* Quick Pills */}
                <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>
                    Rapide :
                  </span>
                  {PRESET_AMOUNTS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuickAdd(preset)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#334155',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#E11D48';
                        e.currentTarget.style.color = '#E11D48';
                        e.currentTarget.style.background = '#FFF1F2';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#E2E8F0';
                        e.currentTarget.style.color = '#334155';
                        e.currentTarget.style.background = '#FFFFFF';
                      }}
                    >
                      +{preset >= 1000 ? `${preset / 1000}k` : preset}
                    </button>
                  ))}
                  {amount && Number(amount) > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAmount}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#64748B',
                        cursor: 'pointer',
                        marginLeft: 'auto',
                      }}
                    >
                      Effacer
                    </button>
                  )}
                </div>
              </div>

              {/* 2. REGLEMENT CARD */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Mode de règlement (D'où sort l'argent ?) *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        padding: '10px 6px',
                        borderRadius: '10px',
                        border: paymentMethod === 'cash' ? '2px solid #059669' : '1px solid #E2E8F0',
                        background: paymentMethod === 'cash' ? '#ECFDF5' : '#FAFAFA',
                        color: paymentMethod === 'cash' ? '#065F46' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.15rem' }}>💵</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Espèces</span>
                      <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Tiroir-caisse</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mobile_money')}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        padding: '10px 6px',
                        borderRadius: '10px',
                        border: paymentMethod === 'mobile_money' ? '2px solid #0284C7' : '1px solid #E2E8F0',
                        background: paymentMethod === 'mobile_money' ? '#F0F9FF' : '#FAFAFA',
                        color: paymentMethod === 'mobile_money' ? '#0369A1' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.15rem' }}>📲</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Mobile Money</span>
                      <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Wave / OM</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('virement')}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        padding: '10px 6px',
                        borderRadius: '10px',
                        border: paymentMethod === 'virement' ? '2px solid #7C3AED' : '1px solid #E2E8F0',
                        background: paymentMethod === 'virement' ? '#F5F3FF' : '#FAFAFA',
                        color: paymentMethod === 'virement' ? '#6D28D9' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.15rem' }}>🏦</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Banque</span>
                      <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Virement / Carte</span>
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '8px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    background: paymentMethod === 'cash' ? '#F0FDF4' : paymentMethod === 'mobile_money' ? '#F0F9FF' : '#F8FAFC',
                    color: paymentMethod === 'cash' ? '#15803D' : paymentMethod === 'mobile_money' ? '#0284C7' : '#475569',
                    border: '1px solid',
                    borderColor: paymentMethod === 'cash' ? '#BBF7D0' : paymentMethod === 'mobile_money' ? '#BAE6FD' : '#E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>💡</span>
                  <span>
                    {paymentMethod === 'cash' && 'Déduit en direct du tiroir-caisse pour que votre clôture du soir soit exacte.'}
                    {paymentMethod === 'mobile_money' && 'Sortie de vos liquidités Wave/OM. Votre caisse physique ne bouge pas.'}
                    {paymentMethod === 'virement' && 'Sortie enregistrée sur votre compte bancaire d\'entreprise.'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. CATEGORIES IN 3 COLUMNS */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1E293B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Catégorie de la dépense *
                </label>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: currentCategoryObj.pocketBadgeBg,
                    color: currentCategoryObj.pocketBadgeColor,
                  }}
                >
                  {currentCategoryObj.pocketTag}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '7px' }}>
                {CATEGORIES.map(c => {
                  const isSelected = category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: isSelected ? `2px solid ${c.pocketBadgeColor}` : '1px solid #E2E8F0',
                        background: isSelected ? c.pocketBadgeBg : '#FFFFFF',
                        color: isSelected ? c.pocketBadgeColor : '#334155',
                        boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.15rem', flexShrink: 0 }}>{c.icon}</span>
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {c.name}
                        </div>
                        <div
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 600,
                            color: isSelected ? c.pocketBadgeColor : '#94A3B8',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.hint}
                        </div>
                      </div>
                      {isSelected && (
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: c.pocketBadgeColor,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* EXPANDABLE CUSTOM MOTIF FOR "AUTRE DÉPENSE" */}
            {category === 'autre' && (
              <div
                style={{
                  background: '#FFF8F4',
                  border: '1.5px solid #FFD9C2',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  animation: 'modalPop 0.2s ease',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#C2410C', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📋</span>
                  <span>Précisez l'intitulé de cette dépense sur-mesure *</span>
                </div>
                <input
                  type="text"
                  placeholder="Ex: Réparation climatiseur, Achat étagères métalliques, Douane..."
                  value={customCategoryName}
                  onChange={e => setCustomCategoryName(e.target.value)}
                  required
                  autoFocus
                  style={{
                    background: '#FFFFFF',
                    borderColor: '#FFBD9B',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            )}

            {/* 4. BENEFICIARY, DATE & DESCRIPTION ROW (3 COLUMNS) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Bénéficiaire / Prestataire (facultatif)
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Ex: Bailleur, Chauffeur Jean..."
                    value={beneficiary}
                    onChange={e => setBeneficiary(e.target.value)}
                    style={{ paddingLeft: '30px', borderRadius: '8px', height: '36px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                    Date de la dépense
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomDate(!isCustomDate)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isCustomDate ? '#DC2626' : '#2563EB',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {isCustomDate ? 'Aujourd\'hui' : 'Changer'}
                  </button>
                </div>
                {isCustomDate ? (
                  <div style={{ position: 'relative' }}>
                    <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={e => setExpenseDate(e.target.value)}
                      style={{ paddingLeft: '30px', borderRadius: '8px', height: '36px', fontSize: '0.82rem' }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      gap: '6px',
                      fontSize: '0.8rem',
                      color: '#475569',
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }}></span>
                    <span>Aujourd'hui (en direct)</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  N° Reçu, facture ou note (facultatif)
                </label>
                <div style={{ position: 'relative' }}>
                  <FileText size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Ex: Facture #742..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    style={{ paddingLeft: '30px', borderRadius: '8px', height: '36px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>
            </div>

            {/* 5. COMPACT LIVE FINANCIAL IMPACT BANNER */}
            <div
              style={{
                borderRadius: '10px',
                padding: '10px 14px',
                background: Number(amount) > 0 ? '#FEF2F2' : '#F8FAFC',
                border: '1px solid',
                borderColor: Number(amount) > 0 ? '#FECDD3' : '#E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: Number(amount) > 0 ? '#FEE2E2' : '#E2E8F0',
                  color: Number(amount) > 0 ? '#DC2626' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={15} />
              </div>
              <div style={{ fontSize: '0.78rem', lineHeight: '1.3', flex: 1 }}>
                {Number(amount) > 0 ? (
                  <span>
                    <strong style={{ color: '#991B1B' }}>📉 Impact : -{formatCurrency(Number(amount), currency)}</strong>{' '}
                    sur le bénéfice net du jour • Affecté à <strong>{currentCategoryObj.pocketTag}</strong> • Source :{' '}
                    <strong>
                      {paymentMethod === 'cash'
                        ? 'Caisse physique (Espèces)'
                        : paymentMethod === 'mobile_money'
                        ? 'Liquidités Mobile Money (Wave/OM)'
                        : 'Compte bancaire'}
                    </strong>
                  </span>
                ) : (
                  <span style={{ color: '#64748B' }}>
                    <strong>Règle des 3 Poches :</strong> Saisissez le montant pour visualiser la déduction instantanée sur votre trésorerie et votre bénéfice net.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div
            style={{
              padding: '12px 24px',
              background: '#F8FAFC',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{
                height: '40px',
                padding: '0 18px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !amount || Number(amount) <= 0}
              style={{
                height: '40px',
                padding: '0 22px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.88rem',
                color: '#FFFFFF',
                background:
                  !amount || Number(amount) <= 0
                    ? '#94A3B8'
                    : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                border: 'none',
                cursor: !amount || Number(amount) <= 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow:
                  !amount || Number(amount) <= 0
                    ? 'none'
                    : '0 2px 8px rgba(220, 38, 38, 0.25)',
                transition: 'all 0.2s ease',
              }}
            >
              <TrendingDown size={16} />
              <span>
                {loading
                  ? 'Enregistrement...'
                  : Number(amount) > 0
                  ? `Valider la Dépense (-${formatCurrency(Number(amount), currency)})`
                  : 'Enregistrer la Dépense'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
