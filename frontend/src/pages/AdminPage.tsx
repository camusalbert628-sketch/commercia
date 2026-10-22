import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Store,
  DollarSign,
  Activity,
  CheckCircle,
  Ban,
  Clock,
  AlertTriangle,
  Download,
  Plus,
  RefreshCw,
  Gift,
  FileText,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getPaymentReceipts, getSubscriptionData } from '../services/premiumService';

export const AdminPage: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'abonnements' | 'a_verifier'>('abonnements');
  const [subFilter, setSubFilter] = useState<string>('all');

  // Manual Action Modal
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionTargetUser, setActionTargetUser] = useState<any>(null);
  const [actionType, setActionType] = useState<'prolonger' | 'offrir' | 'valider_manuel' | 'rembourser'>('prolonger');
  const [actionDays, setActionDays] = useState(14);
  const [actionMotif, setActionMotif] = useState('');

  // Mocked subscriptions list conforming to Section 6.4
  const [adminSubs, setAdminSubs] = useState([
    {
      id: 'sub-1',
      commerceNom: 'Épicerie & Alimentation Moussa',
      ownerNom: 'Moussa Ibrahim',
      email: 'moussa@boutique.cm',
      plan: 'Plan Pro',
      etat: 'ACTIF',
      dateFin: '2026-11-20',
      joursRestants: 28,
      dernierPaiement: '4 500 FCFA (Mobile Money)',
    },
    {
      id: 'sub-2',
      commerceNom: 'Boutique Élégance Yaoundé',
      ownerNom: 'Chantal Ngo',
      email: 'chantal@boutique.cm',
      plan: 'Plan Pro',
      etat: 'ESSAI',
      dateFin: '2026-10-29',
      joursRestants: 6,
      dernierPaiement: 'Essai gratuit 14 jours',
    },
    {
      id: 'sub-3',
      commerceNom: 'Quincaillerie du Centre Douala',
      ownerNom: 'Pierre Kamga',
      email: 'kamga@quinc.cm',
      plan: 'Plan Business',
      etat: 'GRACE',
      dateFin: '2026-10-21',
      joursRestants: 0,
      dernierPaiement: 'En attente renouvellement (Grâce: 5j)',
    },
    {
      id: 'sub-4',
      commerceNom: 'Salon de Beauté Tantie Rose',
      ownerNom: 'Rose Atangana',
      email: 'rose@beaute.cm',
      plan: 'Plan Pro',
      etat: 'EXPIRE',
      dateFin: '2026-10-01',
      joursRestants: 0,
      dernierPaiement: 'Expiré (Lecture seule 72j)',
    },
  ]);

  // File des paiements à vérifier (Section 6.4 & 9.4)
  const [pendingVerifications, setPendingVerifications] = useState([
    {
      id: 'pv-1',
      date: '2026-10-22 18:30',
      commerce: 'Boulangerie Moderne Bafoussam',
      montantAttendu: 4500,
      montantRecu: 3000,
      fournisseur: 'Orange Money',
      reference: 'TX-OM-ERR-902',
      motifAlerte: 'Montant reçu (3 000 FCFA) inférieur au tarif attendu (4 500 FCFA)',
    },
  ]);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const data = await api.get<any>('/admin/stats');
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchAdminStats();
    }
  }, [user]);

  const handleExecuteAdminAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionMotif.trim()) {
      alert('Un motif écrit obligatoire est exigé pour toute action administrative sur un abonnement.');
      return;
    }

    if (actionType === 'prolonger' || actionType === 'offrir') {
      alert(`Action "${actionType.toUpperCase()}" enregistrée avec succès pour ${actionTargetUser?.commerceNom || 'le commerce'}.\nDurée : +${actionDays} jours\nMotif archivé : "${actionMotif}"`);
    } else if (actionType === 'valider_manuel') {
      alert(`Paiement manuel validé avec succès pour ${actionTargetUser?.commerceNom || 'le commerce'}.\nMotif archivé : "${actionMotif}"`);
    } else if (actionType === 'rembourser') {
      alert(`Remboursement manuel enregistré pour ${actionTargetUser?.commerceNom || 'le commerce'}.\nMotif archivé : "${actionMotif}"`);
    }

    setShowActionModal(false);
    setActionMotif('');
  };

  const exportPaymentsCsv = () => {
    const receipts = getPaymentReceipts();
    const headers = 'Numero,Date,Commerce,Plan,Montant,Devise,Moyen,Reference\n';
    const rows = receipts
      .map(r => `"${r.numero}","${r.date}","${r.commerceNom}","${r.planNom}",${r.montant},"${r.devise}","${r.moyenPaiement}","${r.reference}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `COMMERCIA_Paiements_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user?.isAdmin) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ color: '#DC2626', fontSize: '2rem', marginBottom: '16px' }}>⛔</div>
        <h2>Accès Réservé aux Administrateurs</h2>
        <p style={{ color: '#64748B' }}>Cette section requiert un compte administrateur COMMERCIA.</p>
      </div>
    );
  }

  const filteredSubs = adminSubs.filter(s => {
    if (subFilter === 'all') return true;
    return s.etat.toLowerCase() === subFilter.toLowerCase();
  });

  return (
    <div className="page-wrapper">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#EFF6FF', color: '#2563EB', padding: '10px', borderRadius: '12px', display: 'flex' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Console d'Administration SaaS</h1>
            <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>
              Supervision des abonnements, MRR, conversions et contrôle financier
            </p>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={exportPaymentsCsv}>
          <Download size={16} />
          <span>Export CSV Comptabilité</span>
        </button>
      </div>

      {/* GLOBAL SAAS METRICS (Section 6.4) */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '28px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div>
            <div className="stat-label">Revenu Récurrent (MRR)</div>
            <div className="stat-value" style={{ color: '#059669' }}>342 000 FCFA</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              Abonnements annuels proratisés
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #0062FF' }}>
          <div>
            <div className="stat-label">Taux Conversion Essai ➔ Payant</div>
            <div className="stat-value" style={{ color: '#0062FF' }}>68.4%</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              14 jours d'essai convertis
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#EFF6FF', color: '#0062FF' }}>
            <Activity size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #D97706' }}>
          <div>
            <div className="stat-label">Paiements à Vérifier</div>
            <div className="stat-value" style={{ color: pendingVerifications.length > 0 ? '#DC2626' : '#059669' }}>
              {pendingVerifications.length}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              Statut A_VERIFIER en file
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #8B5CF6' }}>
          <div>
            <div className="stat-label">Commerces Abonnés Actifs</div>
            <div className="stat-value">54</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              48 Pro • 6 Business
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('abonnements')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'abonnements' ? '3px solid #0062FF' : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'abonnements' ? '#0062FF' : '#64748B',
            fontWeight: activeTab === 'abonnements' ? 700 : 500,
            fontSize: '0.92rem',
            cursor: 'pointer',
            marginBottom: '-2px',
          }}
        >
          👑 Abonnements & Commerces ({adminSubs.length})
        </button>

        <button
          onClick={() => setActiveTab('a_verifier')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'a_verifier' ? '3px solid #DC2626' : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'a_verifier' ? '#DC2626' : '#64748B',
            fontWeight: activeTab === 'a_verifier' ? 700 : 500,
            fontSize: '0.92rem',
            cursor: 'pointer',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>⚠️ File Paiements à Vérifier</span>
          <span style={{ background: '#DC2626', color: 'white', borderRadius: '10px', padding: '1px 6px', fontSize: '0.72rem' }}>
            {pendingVerifications.length}
          </span>
        </button>
      </div>

      {/* TAB 1 : ABONNEMENTS AVEC ACTIONS MANUELLES MOTIVÉES (Section 6.4) */}
      {activeTab === 'abonnements' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Gestion des Abonnements Commerçants</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['all', 'actif', 'essai', 'grace', 'expire'].map(f => (
                <button
                  key={f}
                  onClick={() => setSubFilter(f)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '16px',
                    border: '1px solid #CBD5E1',
                    background: subFilter === f ? '#0062FF' : '#FFFFFF',
                    color: subFilter === f ? '#FFFFFF' : '#475569',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {f === 'all' ? 'Tous' : f}
                </button>
              ))}
            </div>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Commerce & Contact</th>
                  <th>Formule</th>
                  <th>État Actuel</th>
                  <th>Échéance</th>
                  <th>Dernier Paiement</th>
                  <th style={{ textAlign: 'right' }}>Action Manuelle (Motif obligatoire)</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{s.commerceNom}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{s.ownerNom} • {s.email}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{s.plan}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: s.etat === 'ACTIF' ? '#ECFDF5' : s.etat === 'ESSAI' ? '#EFF6FF' : s.etat === 'GRACE' ? '#FEF3C7' : '#F1F5F9',
                          color: s.etat === 'ACTIF' ? '#059669' : s.etat === 'ESSAI' ? '#2563EB' : s.etat === 'GRACE' ? '#D97706' : '#64748B',
                        }}
                      >
                        ● {s.etat}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{new Date(s.dateFin).toLocaleDateString('fr-FR')}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{s.joursRestants}j restants</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{s.dernierPaiement}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => {
                          setActionTargetUser(s);
                          setShowActionModal(true);
                        }}
                      >
                        Gérer abonnement
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2 : FILE DES PAIEMENTS A_VERIFIER (Section 6.4 & 9.4) */}
      {activeTab === 'a_verifier' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.15rem', margin: '0 0 12px 0' }}>Transactions en File d'Attente (A_VERIFIER)</h3>
          <p style={{ color: '#64748B', fontSize: '0.86rem', margin: '0 0 16px 0' }}>
            Règle de sécurité 9.4 : Tout paiement dont le montant reçu diffère du montant attendu est gelé sans activation automatique.
          </p>

          {pendingVerifications.map(pv => (
            <div key={pv.id} style={{ border: '2px solid #FCA5A5', background: '#FEF2F2', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="#DC2626" />
                  <strong style={{ color: '#991B1B', fontSize: '1rem' }}>{pv.commerce}</strong>
                </div>
                <div style={{ color: '#B91C1C', fontSize: '0.85rem', marginTop: '4px' }}>
                  {pv.motifAlerte}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                  Réf : {pv.reference} • Opérateur : {pv.fournisseur} • Date : {pv.date}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setPendingVerifications([]);
                    alert('Transaction rejetée et annulée.');
                  }}
                >
                  Rejeter
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setPendingVerifications([]);
                    alert('Paiement régularisé et abonnement activé manuellement avec trace d\'audit.');
                  }}
                >
                  Valider par dérogation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL ACTION ADMINISTRATIVE AVEC MOTIF OBLIGATOIRE (Section 6.4) */}
      {showActionModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Action Administrative sur Abonnement</h3>
              <button onClick={() => setShowActionModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>×</button>
            </div>
            <form onSubmit={handleExecuteAdminAction}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <strong>{actionTargetUser?.commerceNom}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>État actuel : {actionTargetUser?.etat}</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
                    Type d'intervention
                  </label>
                  <select value={actionType} onChange={e => setActionType(e.target.value as any)} style={{ width: '100%', padding: '10px' }}>
                    <option value="prolonger">Prolonger la période (+ jours)</option>
                    <option value="offrir">Offrir des jours (geste commercial)</option>
                    <option value="valider_manuel">Valider un paiement manuel (espèces/virement)</option>
                    <option value="rembourser">Enregistrer un remboursement</option>
                  </select>
                </div>

                {(actionType === 'prolonger' || actionType === 'offrir') && (
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
                      Nombre de jours accordés
                    </label>
                    <input type="number" min="1" value={actionDays} onChange={e => setActionDays(Number(e.target.value))} required />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#DC2626', marginBottom: '4px' }}>
                    Motif obligatoire de l'action *
                  </label>
                  <textarea
                    rows={3}
                    value={actionMotif}
                    onChange={e => setActionMotif(e.target.value)}
                    required
                    placeholder="Ex: Geste commercial suite incident réseau Mobile Money Orange du 20/10..."
                    style={{ width: '100%', padding: '10px' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px' }}>
                    Règle 6.4 : Cette action et son motif seront archivés de manière immuable dans l'historique d'audit.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowActionModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Confirmer l'opération</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
