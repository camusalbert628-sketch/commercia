import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Wallet,
  RefreshCw,
  Info,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export const MobileMoneyPage: React.FC = () => {
  const { user, activeBusinessId } = useAuthStore();
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];
  const currency = activeBusiness?.currency || 'XAF';

  const [operations, setOperations] = useState<any[]>([]);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [showOpModal, setShowOpModal] = useState<boolean>(false);

  // Formulaire opération
  const [opOperator, setOpOperator] = useState<string>('orange_money');
  const [opType, setOpType] = useState<string>('depot');
  const [opClientAmount, setOpClientAmount] = useState<number>(25000);
  const [opCommission, setOpCommission] = useState<number>(300);
  const [opCustomerPhone, setOpCustomerPhone] = useState<string>('');
  const [opCustomerName, setOpCustomerName] = useState<string>('');
  const [opRef, setOpRef] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [opsRes, recRes]: any = await Promise.all([
        api.get('/mobile-money/operations'),
        api.get('/mobile-money/reconciliation'),
      ]);
      setOperations(opsRes?.operations || []);
      setReconciliation(recRes || null);
    } catch (err: any) {
      console.error('Erreur chargement Mobile Money:', err);
      setError(err.message || 'Erreur lors du chargement des opérations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeBusinessId]);

  // Estimation de commission automatique recommandée selon barème usuel
  const updateCommissionEstimate = (amount: number, type: string) => {
    if (amount <= 5000) return 100;
    if (amount <= 20000) return 200;
    if (amount <= 50000) return 350;
    if (amount <= 100000) return 600;
    return Math.round(amount * 0.007); // ~0.7%
  };

  const handleAmountChange = (amount: number) => {
    setOpClientAmount(amount);
    setOpCommission(updateCommissionEstimate(amount, opType));
  };

  const handleCreateOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/mobile-money/operations', {
        operator: opOperator,
        type: opType,
        clientAmount: Number(opClientAmount),
        commissionEarned: Number(opCommission),
        customerPhone: opCustomerPhone.trim() || undefined,
        customerName: opCustomerName.trim() || undefined,
        reference: opRef.trim() || undefined,
      });

      setShowOpModal(false);
      setSuccess(`Opération validée ! Commission de ${opCommission.toLocaleString('fr-FR')} ${currency} acquise.`);
      setOpCustomerPhone('');
      setOpCustomerName('');
      setOpRef('');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur enregistrement transaction.');
    }
  };

  const filteredOps = operations.filter((op) => {
    return operatorFilter === 'all' || op.operator === operatorFilter;
  });

  return (
    <div className="page-container" style={{ padding: '24px 16px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255, 107, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B00' }}>
            <Smartphone size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Agence Mobile Money & Flotte
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
              Dépôts, retraits, rapprochement caisse physique vs flotte virtuelle et commissions réelles.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setOpCommission(updateCommissionEstimate(opClientAmount, opType));
            setShowOpModal(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            background: '#FF6B00',
            color: '#FFFFFF',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(255, 107, 0, 0.25)',
          }}
        >
          <Plus size={18} />
          Nouvelle opération MoMo
        </button>
      </div>

      {/* Notice comptable essentielle (Section 13) */}
      <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ShieldCheck size={22} color="#0062FF" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
          <strong>Règle comptable stricte :</strong> Les fonds transitant pour les clients (dépôts / retraits) <strong>ne constituent pas votre chiffre d’affaires</strong>. Seules les <strong>commissions acquises</strong> sont comptabilisées comme revenu d’agence.
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#047857', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* KPI Cards */}
      {reconciliation && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>COMMISSIONS DU JOUR</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>
              {(reconciliation.totalCommissionsEarned || 0).toLocaleString('fr-FR')} {currency}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#10B981', marginTop: '4px' }}>
              Vrai CA net de l'agent
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>FLUX CLIENTS TRAITÉS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>
              {((reconciliation.totalTransitIn || 0) + (reconciliation.totalTransitOut || 0)).toLocaleString('fr-FR')} {currency}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>
              {reconciliation.operationsCount || 0} opérations
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>IMPACT CAISSE ESPÈCES</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: (reconciliation.netPhysicalCashImpact || 0) >= 0 ? '#0284C7' : '#EA580C', marginTop: '4px' }}>
              {(reconciliation.netPhysicalCashImpact || 0).toLocaleString('fr-FR')} {currency}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>
              Dépôts reçus - Retraits servis
            </div>
          </div>
        </div>
      )}

      {/* Operator Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'Tous les opérateurs' },
          { id: 'orange_money', label: 'Orange Money' },
          { id: 'mtn_momo', label: 'MTN Mobile Money' },
          { id: 'wave', label: 'Wave' },
          { id: 'moov', label: 'Moov Money' },
        ].map((op) => (
          <button
            key={op.id}
            onClick={() => setOperatorFilter(op.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: operatorFilter === op.id ? '#FF6B00' : '#E2E8F0',
              background: operatorFilter === op.id ? '#FFF7ED' : '#FFFFFF',
              color: operatorFilter === op.id ? '#EA580C' : '#64748B',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            {op.label}
          </button>
        ))}
      </div>

      {/* Operations List */}
      {filteredOps.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
          <Smartphone size={40} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
            Aucune transaction Mobile Money
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.88rem', maxWidth: '420px', margin: '8px auto 16px auto' }}>
            Enregistrez vos dépôts et retraits pour assurer un pointage rigoureux de vos caisses.
          </p>
          <button
            onClick={() => setShowOpModal(true)}
            style={{ padding: '10px 20px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >
            + Enregistrer une opération
          </button>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px' }}>Date / Heure</th>
                  <th style={{ padding: '12px 16px' }}>Opérateur</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Fonds Client</th>
                  <th style={{ padding: '12px 16px' }}>Commission Acquise</th>
                  <th style={{ padding: '12px 16px' }}>Client / Référence</th>
                </tr>
              </thead>
              <tbody>
                {filteredOps.map((op) => {
                  const isDepot = op.type === 'depot';
                  return (
                    <tr key={op.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>
                        {new Date(op.operationDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          background: op.operator === 'orange_money' ? '#FFF7ED' : op.operator === 'mtn_momo' ? '#FEFCE8' : '#EFF6FF',
                          color: op.operator === 'orange_money' ? '#EA580C' : op.operator === 'mtn_momo' ? '#CA8A04' : '#0284C7',
                        }}>
                          {op.operator.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: isDepot ? '#059669' : '#DC2626' }}>
                          {isDepot ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          <span>{op.type === 'depot' ? 'DÉPÔT' : op.type === 'retrait' ? 'RETRAIT' : op.type.toUpperCase()}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0F172A' }}>
                        {op.clientAmount.toLocaleString('fr-FR')} {currency}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#10B981' }}>
                        +{op.commissionEarned.toLocaleString('fr-FR')} {currency}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {op.customerPhone || op.customerName || op.reference || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nouvelle Opération */}
      {showOpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              Nouvelle opération Mobile Money
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', marginBottom: '16px' }}>
              Enregistrez le flux et la commission acquise.
            </p>

            <form onSubmit={handleCreateOperation}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                    Opérateur :
                  </label>
                  <select
                    value={opOperator}
                    onChange={(e) => setOpOperator(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  >
                    <option value="orange_money">Orange Money</option>
                    <option value="mtn_momo">MTN Mobile Money</option>
                    <option value="wave">Wave</option>
                    <option value="moov">Moov Money</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                    Type d'opération :
                  </label>
                  <select
                    value={opType}
                    onChange={(e) => {
                      setOpType(e.target.value);
                      setOpCommission(updateCommissionEstimate(opClientAmount, e.target.value));
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  >
                    <option value="depot">📥 Dépôt (Cash in)</option>
                    <option value="retrait">📤 Retrait (Cash out)</option>
                    <option value="transfert">🔄 Transfert direct</option>
                    <option value="credit_telephonique">📲 Crédit d'appel</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                  Montant manipulé ({currency}) :
                </label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={opClientAmount}
                  onChange={(e) => handleAmountChange(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '1.1rem', fontWeight: 800 }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                  Commission nette acquise ({currency}) :
                </label>
                <input
                  type="number"
                  min="0"
                  value={opCommission}
                  onChange={(e) => setOpCommission(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '1rem', fontWeight: 800, color: '#10B981' }}
                  required
                />
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Seul ce montant est enregistré comme bénéfice réel.
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                  Numéro client / Réf transaction (facultatif) :
                </label>
                <input
                  type="text"
                  placeholder="ex: +237 6... ou ID Trans"
                  value={opCustomerPhone}
                  onChange={(e) => setOpCustomerPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowOpModal(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#FF6B00', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
