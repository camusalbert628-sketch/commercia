import React, { useState } from 'react';
import {
  TrendingDown,
  X,
  Check,
  Wallet,
  Smartphone,
  Building2,
  Calendar,
  User,
  FileText,
  AlertCircle,
  HelpCircle,
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
    name: 'Marchandise & Ravitaillement',
    icon: '🏬',
    pocket: 'poche1',
    pocketTag: 'Poche 1 : Stock & Capital',
    pocketBadgeColor: '#0284C7',
    pocketBadgeBg: '#E0F2FE',
    hint: 'Achat de marchandises destinées à la vente',
  },
  {
    id: 'transport',
    name: 'Transport & Moto-taxi',
    icon: '🛵',
    pocket: 'poche2',
    pocketTag: 'Poche 2 : Charges d\'Exploitation',
    pocketBadgeColor: '#D97706',
    pocketBadgeBg: '#FEF3C7',
    hint: 'Livraisons clients, courses marché, carburant',
  },
  {
    id: 'loyer',
    name: 'Loyer boutique & Local',
    icon: '🏠',
    pocket: 'poche2',
    pocketTag: 'Poche 2 : Charges d\'Exploitation',
    pocketBadgeColor: '#7C3AED',
    pocketBadgeBg: '#EDE9FE',
    hint: 'Loyer mensuel magasin, showroom ou entrepôt',
  },
  {
    id: 'electricite',
    name: 'Électricité & Eau',
    icon: '💡',
    pocket: 'poche2',
    pocketTag: 'Poche 2 : Charges d\'Exploitation',
    pocketBadgeColor: '#CA8A04',
    pocketBadgeBg: '#FEF9C3',
    hint: 'Factures énergie, climatisation, eau, recharge',
  },
  {
    id: 'telephone',
    name: 'Téléphone & Internet / Data',
    icon: '📱',
    pocket: 'poche2',
    pocketTag: 'Poche 2 : Charges d\'Exploitation',
    pocketBadgeColor: '#2563EB',
    pocketBadgeBg: '#DBEAFE',
    hint: 'Pass WhatsApp Business, forfaits data, appels',
  },
  {
    id: 'emballages',
    name: 'Emballages & Plastiques',
    icon: '📦',
    pocket: 'poche2',
    pocketTag: 'Poche 2 : Charges d\'Exploitation',
    pocketBadgeColor: '#EA580C',
    pocketBadgeBg: '#FFEDD5',
    hint: 'Sacs boutique, ruban adhésif, cartons, sachets',
  },
  {
    id: 'salaires',
    name: 'Salaires & Aides journalières',
    icon: '👥',
    pocket: 'poche2',
    pocketTag: 'Poche 2 : Charges d\'Exploitation',
    pocketBadgeColor: '#059669',
    pocketBadgeBg: '#D1FAE5',
    hint: 'Rémunération vendeuse, aide ponctuelle, coursier',
  },
  {
    id: 'ration',
    name: 'Prélèvement / Ration maison',
    icon: '🍲',
    pocket: 'poche3',
    pocketTag: 'Poche 3 : Retrait Personnel',
    pocketBadgeColor: '#DB2777',
    pocketBadgeBg: '#FCE7F3',
    hint: 'Argent retiré pour les besoins personnels ou famille',
  },
  {
    id: 'autre',
    name: 'Autre dépense sur-mesure',
    icon: '📋',
    pocket: 'poche2',
    pocketTag: 'Poche 2 : Charges Diverses',
    pocketBadgeColor: '#475569',
    pocketBadgeBg: '#F1F5F9',
    hint: 'Frais exceptionnels, dépannage, réparation...',
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
      }, 1000);
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
          maxWidth: '560px',
          width: '95%',
          maxHeight: '92vh',
          borderRadius: '20px',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #FFF1F2 0%, #FEE2E2 100%)',
                border: '1px solid #FECDD3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#E11D48',
                boxShadow: '0 2px 6px rgba(225, 29, 72, 0.12)',
              }}
            >
              <TrendingDown size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
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
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '3px 0 0 0' }}>
                Enregistrez chaque sortie d'argent pour un bénéfice réel sans erreur
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
              transition: 'all 0.2s ease',
            }}
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#FEF2F2',
                  border: '1px solid #FECDD3',
                  color: '#B91C1C',
                  borderRadius: '12px',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  padding: '14px 16px',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#065F46',
                  borderRadius: '12px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Check size={20} color="#059669" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 1. HERO AMOUNT CARD */}
            <div
              style={{
                background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF5F5 100%)',
                border: '1.5px solid #FECDD3',
                borderRadius: '16px',
                padding: '18px 20px',
                boxShadow: '0 4px 12px rgba(225, 29, 72, 0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Montant de la dépense *
                </label>
                {amount && Number(amount) > 0 ? (
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#E11D48' }}>
                    -{formatCurrency(Number(amount), currency)}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Précisez le montant exact</span>
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
                    height: '56px',
                    fontSize: '1.9rem',
                    fontWeight: 800,
                    color: '#DC2626',
                    background: '#FFFFFF',
                    border: '2px solid #FCA5A5',
                    borderRadius: '12px',
                    padding: '0 80px 0 16px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: '#FEE2E2',
                    color: '#991B1B',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    pointerEvents: 'none',
                    letterSpacing: '0.02em',
                  }}
                >
                  {currency}
                </div>
              </div>

              {/* Quick Amount Pills */}
              <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginRight: '4px' }}>
                  Rapide :
                </span>
                {PRESET_AMOUNTS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickAdd(preset)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.78rem',
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
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#64748B',
                      cursor: 'pointer',
                      marginLeft: 'auto',
                    }}
                  >
                    Effacer (C)
                  </button>
                )}
              </div>
            </div>

            {/* 2. UNIVERSAL PAYMENT SOURCE SELECTOR */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E293B', display: 'block', marginBottom: '8px' }}>
                Mode de règlement (D'où sort l'argent ?) *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {/* Cash */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '12px 8px',
                    borderRadius: '12px',
                    border: paymentMethod === 'cash' ? '2px solid #059669' : '1px solid #E2E8F0',
                    background: paymentMethod === 'cash' ? '#ECFDF5' : '#FFFFFF',
                    color: paymentMethod === 'cash' ? '#065F46' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>💵</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Espèces</span>
                  <span style={{ fontSize: '0.68rem', color: '#64748B' }}>Tiroir-caisse</span>
                </button>

                {/* Mobile Money */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mobile_money')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '12px 8px',
                    borderRadius: '12px',
                    border: paymentMethod === 'mobile_money' ? '2px solid #0284C7' : '1px solid #E2E8F0',
                    background: paymentMethod === 'mobile_money' ? '#F0F9FF' : '#FFFFFF',
                    color: paymentMethod === 'mobile_money' ? '#0369A1' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>📲</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Mobile Money</span>
                  <span style={{ fontSize: '0.68rem', color: '#64748B' }}>Wave / OM / MoMo</span>
                </button>

                {/* Virement */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('virement')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '12px 8px',
                    borderRadius: '12px',
                    border: paymentMethod === 'virement' ? '2px solid #7C3AED' : '1px solid #E2E8F0',
                    background: paymentMethod === 'virement' ? '#F5F3FF' : '#FFFFFF',
                    color: paymentMethod === 'virement' ? '#6D28D9' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>🏦</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Banque</span>
                  <span style={{ fontSize: '0.68rem', color: '#64748B' }}>Virement / Carte</span>
                </button>
              </div>

              {/* Contextual operational hint */}
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
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
                  {paymentMethod === 'cash' && 'Déduit en direct de votre caisse physique pour une clôture de journée exacte.'}
                  {paymentMethod === 'mobile_money' && 'Sortie de vos liquidités Mobile Money (Wave / Orange). Votre caisse physique ne bouge pas.'}
                  {paymentMethod === 'virement' && 'Sortie enregistrée sur votre compte bancaire d\'entreprise.'}
                </span>
              </div>
            </div>

            {/* 3. CATEGORY SELECTION */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
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
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: isSelected ? `2px solid ${c.pocketBadgeColor}` : '1px solid #E2E8F0',
                        background: isSelected ? c.pocketBadgeBg : '#FFFFFF',
                        color: isSelected ? c.pocketBadgeColor : '#334155',
                        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{c.icon}</span>
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.name}
                        </div>
                        <div
                          style={{
                            fontSize: '0.68rem',
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
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: c.pocketBadgeColor,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. EXPANDABLE CUSTOM MOTIF FOR "AUTRE DÉPENSE" */}
            {category === 'autre' && (
              <div
                style={{
                  background: '#FFF8F4',
                  border: '1.5px solid #FFD9C2',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  animation: 'modalPop 0.2s ease',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#C2410C', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📋</span>
                  <span>Précisez l'intitulé de cette dépense sur-mesure</span>
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
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '0.88rem',
                  }}
                />
              </div>
            )}

            {/* 5. BENEFICIARY & DATE ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Bénéficiaire / Fournisseur (facultatif)
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Ex: Bailleur, Chauffeur Jean..."
                    value={beneficiary}
                    onChange={e => setBeneficiary(e.target.value)}
                    style={{ paddingLeft: '34px', borderRadius: '10px', height: '40px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                    Date de la dépense
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomDate(!isCustomDate)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isCustomDate ? '#DC2626' : '#2563EB',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {isCustomDate ? 'Aujourd\'hui' : 'Changer date'}
                  </button>
                </div>
                {isCustomDate ? (
                  <div style={{ position: 'relative' }}>
                    <Calendar size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={e => setExpenseDate(e.target.value)}
                      style={{ paddingLeft: '34px', borderRadius: '10px', height: '40px', fontSize: '0.85rem' }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      height: '40px',
                      borderRadius: '10px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px',
                      gap: '6px',
                      fontSize: '0.82rem',
                      color: '#475569',
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
                    <span>Aujourd'hui (en direct)</span>
                  </div>
                )}
              </div>
            </div>

            {/* 6. DESCRIPTION / NOTE */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Note, justificatif ou n° de reçu (facultatif) :
              </label>
              <div style={{ position: 'relative' }}>
                <FileText size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Ex: Facture #742, payé pour livraison urgente client..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{ paddingLeft: '34px', borderRadius: '10px', height: '40px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* 7. LIVE FINANCIAL IMPACT BANNER */}
            <div
              style={{
                borderRadius: '14px',
                padding: '14px 16px',
                background: Number(amount) > 0 ? '#FEF2F2' : '#F8FAFC',
                border: '1.5px solid',
                borderColor: Number(amount) > 0 ? '#FECDD3' : '#E2E8F0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: Number(amount) > 0 ? '#FEE2E2' : '#E2E8F0',
                  color: Number(amount) > 0 ? '#DC2626' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={18} />
              </div>
              <div style={{ fontSize: '0.82rem', lineHeight: '1.4' }}>
                {Number(amount) > 0 ? (
                  <>
                    <div style={{ fontWeight: 800, color: '#991B1B', marginBottom: '2px' }}>
                      📉 Impact : -{formatCurrency(Number(amount), currency)}
                    </div>
                    <div style={{ color: '#475569' }}>
                      Cette sortie est affectée à <strong>{currentCategoryObj.pocketTag}</strong>. Elle réduira
                      immédiatement votre marge nette de la journée.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                      Règle des 3 Poches COMMERCIA
                    </div>
                    <div style={{ color: '#64748B' }}>
                      Saisissez le montant pour voir l'impact en temps réel sur votre bénéfice net et votre caisse.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div
            style={{
              padding: '16px 24px',
              background: '#F8FAFC',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{
                height: '44px',
                padding: '0 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !amount || Number(amount) <= 0}
              style={{
                height: '44px',
                padding: '0 24px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.92rem',
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
                    : '0 4px 14px rgba(220, 38, 38, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              <TrendingDown size={18} />
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
