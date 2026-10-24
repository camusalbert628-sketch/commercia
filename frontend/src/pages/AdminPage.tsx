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
  Search,
  ChevronRight,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  businesses: { id: string; name: string }[];
  plan: string;
  planName: string;
  status: string;
  isPro: boolean;
  endDate?: string | null;
  daysRemaining: number;
}

interface AdminPayment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
  verifiedAt?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  plan?: {
    name: string;
    displayName: string;
  };
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  createdAt: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export const AdminPage: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [paymentsList, setPaymentsList] = useState<AdminPayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'audit'>('users');
  const [subFilter, setSubFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Action Modal
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionTargetUser, setActionTargetUser] = useState<AdminUser | null>(null);
  const [targetPlan, setTargetPlan] = useState<'pro' | 'business' | 'free'>('pro');
  const [actionDays, setActionDays] = useState(30);
  const [actionMotif, setActionMotif] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, paymentsRes, auditRes] = await Promise.allSettled([
        api.get<any>('/admin/stats'),
        api.get<AdminUser[]>('/admin/users'),
        api.get<AdminPayment[]>('/admin/payments'),
        api.get<AuditLog[]>('/admin/audit-logs'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (usersRes.status === 'fulfilled') setUsersList(usersRes.value || []);
      if (paymentsRes.status === 'fulfilled') setPaymentsList(paymentsRes.value || []);
      if (auditRes.status === 'fulfilled') setAuditLogs(auditRes.value || []);
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchAdminData();
    }
  }, [user]);

  const handleExecuteAdminAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTargetUser) return;
    if (!actionMotif.trim()) {
      alert('Un motif écrit obligatoire est exigé pour toute action administrative sur un compte.');
      return;
    }

    try {
      setActionSubmitting(true);
      await api.put(`/admin/users/${actionTargetUser.id}/subscription`, {
        planName: targetPlan,
        days: targetPlan === 'free' ? 0 : actionDays,
        motif: actionMotif.trim(),
      });

      alert(`Abonnement mis à jour avec succès pour ${actionTargetUser.email}. Un journal d'audit immuable a été enregistré.`);
      setShowActionModal(false);
      setActionMotif('');
      await fetchAdminData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Erreur lors de la modification de l\'abonnement.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const exportPaymentsCsv = () => {
    const headers = 'Reference,Date,Client,Email,Plan,Montant,Devise,Operateur,Statut\n';
    const rows = paymentsList
      .map(p => `"${p.reference}","${p.createdAt}","${p.user?.firstName || ''} ${p.user?.lastName || ''}","${p.user?.email || ''}","${p.plan?.displayName || ''}",${p.amount},"${p.currency}","${p.provider}","${p.status}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `COMMERCIA_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user?.isAdmin) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ color: '#DC2626', fontSize: '2.5rem', marginBottom: '16px' }}>⛔</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Accès Réservé aux Administrateurs</h2>
        <p style={{ color: '#64748B' }}>Cette section requiert les droits d'administration de la plateforme COMMERCIA.</p>
      </div>
    );
  }

  const filteredUsers = usersList.filter(u => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.businesses.some(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (subFilter === 'all') return true;
    if (subFilter === 'pro') return u.isPro;
    if (subFilter === 'free') return !u.isPro && u.status !== 'expired';
    if (subFilter === 'expired') return u.status === 'expired';
    return true;
  });

  return (
    <div className="page-wrapper" style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#EFF6FF', color: '#0062FF', padding: '12px', borderRadius: '14px', display: 'flex' }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800 }}>Console d'Administration SaaS</h1>
            <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>
              Gestion des comptes Free vs Pro, supervision des abonnements et traçabilité d'audit
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchAdminData}>
            <RefreshCw size={16} />
            <span>Actualiser</span>
          </button>
          <button className="btn btn-primary" onClick={exportPaymentsCsv}>
            <Download size={16} />
            <span>Export Transactions (CSV)</span>
          </button>
        </div>
      </div>

      {/* GLOBAL SAAS METRICS */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '28px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div>
            <div className="stat-label">Revenu Récurrent Estimé (MRR)</div>
            <div className="stat-value" style={{ color: '#059669' }}>
              {(stats?.metrics?.estimatedMRR || 0).toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              Abonnements Pro & Business actifs
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #0062FF' }}>
          <div>
            <div className="stat-label">Comptes Pro Actifs</div>
            <div className="stat-value" style={{ color: '#0062FF' }}>
              {stats?.metrics?.activeSubscriptionsCount || usersList.filter(u => u.isPro).length}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              Avec droit d'accès illimité
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#EFF6FF', color: '#0062FF' }}>
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #64748B' }}>
          <div>
            <div className="stat-label">Comptes Gratuits (Free)</div>
            <div className="stat-value">
              {stats?.metrics?.freeUsersCount || usersList.filter(u => !u.isPro).length}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              Plafond 15 ventes/jour
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#F1F5F9', color: '#64748B' }}>
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #8B5CF6' }}>
          <div>
            <div className="stat-label">Transactions Validées</div>
            <div className="stat-value" style={{ color: '#8B5CF6' }}>
              {stats?.metrics?.completedPaymentsCount || paymentsList.filter(p => p.status === 'completed').length}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              Payées par Mobile Money / Carte
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>
            <CreditCard size={24} />
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'users' ? '3px solid #0062FF' : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'users' ? '#0062FF' : '#64748B',
            fontWeight: activeTab === 'users' ? 700 : 500,
            fontSize: '0.94rem',
            cursor: 'pointer',
            marginBottom: '-2px',
          }}
        >
          👥 Utilisateurs & Abonnements ({usersList.length})
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'payments' ? '3px solid #0062FF' : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'payments' ? '#0062FF' : '#64748B',
            fontWeight: activeTab === 'payments' ? 700 : 500,
            fontSize: '0.94rem',
            cursor: 'pointer',
            marginBottom: '-2px',
          }}
        >
          💳 Transactions Réelles ({paymentsList.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '3px solid #0062FF' : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'audit' ? '#0062FF' : '#64748B',
            fontWeight: activeTab === 'audit' ? 700 : 500,
            fontSize: '0.94rem',
            cursor: 'pointer',
            marginBottom: '-2px',
          }}
        >
          📜 Journal d'Audit ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: UTILISATEURS & ABONNEMENTS */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Search size={18} color="#94A3B8" />
              <input
                type="text"
                placeholder="Rechercher par nom, email ou boutique..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '8px 12px', width: '280px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { key: 'all', label: 'Tous' },
                { key: 'pro', label: 'Pro Actif' },
                { key: 'free', label: 'Gratuit (Free)' },
                { key: 'expired', label: 'Expiré' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setSubFilter(f.key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: '1px solid #CBD5E1',
                    background: subFilter === f.key ? '#0062FF' : '#FFFFFF',
                    color: subFilter === f.key ? '#FFFFFF' : '#475569',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Utilisateur & Commerce</th>
                  <th>Formule</th>
                  <th>Statut du Compte</th>
                  <th>Échéance</th>
                  <th>Jours Restants</th>
                  <th style={{ textAlign: 'right' }}>Action Manuelle (Auditée)</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                      Aucun utilisateur ne correspond aux critères
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>
                          {u.firstName} {u.lastName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          {u.email} {u.businesses.length > 0 && `• ${u.businesses[0].name}`}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: u.isPro ? '#0062FF' : '#64748B' }}>
                          {u.plan || (u.isPro ? 'Pro' : 'Gratuit')}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          background: u.isPro ? '#ECFDF5' : u.status === 'expired' ? '#FEF2F2' : '#F1F5F9',
                          color: u.isPro ? '#059669' : u.status === 'expired' ? '#DC2626' : '#64748B',
                        }}>
                          {u.isPro ? '● PRO ACTIF' : u.status === 'expired' ? '● EXPIRÉ' : '● VERSION GRATUITE'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {u.endDate ? new Date(u.endDate).toLocaleDateString('fr-FR') : (u.isAdmin ? 'Permanent' : 'Aucune')}
                      </td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {u.isAdmin ? 'Permanent' : u.isPro ? `${u.daysRemaining} jour(s)` : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => {
                            setActionTargetUser(u);
                            setTargetPlan(u.isPro ? 'free' : 'pro');
                            setShowActionModal(true);
                          }}
                        >
                          Modifier droits
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS RÉELLES */}
      {activeTab === 'payments' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
              Journal Financier des Paiements Mobile Money & Carte
            </h3>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Référence Unique</th>
                  <th>Utilisateur</th>
                  <th>Formule</th>
                  <th>Opérateur</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {paymentsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                      Aucune transaction financière
                    </td>
                  </tr>
                ) : (
                  paymentsList.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontSize: '0.82rem', color: '#64748B' }}>
                        {new Date(p.createdAt).toLocaleString('fr-FR')}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0062FF', fontSize: '0.85rem' }}>
                        {p.reference}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                          {p.user ? `${p.user.firstName} ${p.user.lastName}` : 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{p.user?.email}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.plan?.displayName || 'Plan Pro'}</td>
                      <td style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{p.provider}</td>
                      <td style={{ fontWeight: 800 }}>
                        {p.amount.toLocaleString('fr-FR')} {p.currency}
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          background: p.status === 'completed' ? '#ECFDF5' : p.status === 'pending' ? '#FEF3C7' : '#FEF2F2',
                          color: p.status === 'completed' ? '#059669' : p.status === 'pending' ? '#D97706' : '#DC2626',
                        }}>
                          {p.status === 'completed' ? 'Validé' : p.status === 'pending' ? 'En attente' : 'Échoué'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
              Journal d'Audit Immuable des Décisions Administratives
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Toute modification manuelle d'un abonnement ou validation dérogatoire est tracée de manière permanente.
            </p>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Date & Heure</th>
                  <th>Action</th>
                  <th>Auteur</th>
                  <th>Entité</th>
                  <th>Détails & Motif obligatoire</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                      Aucun journal d'audit disponible
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.82rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString('fr-FR')}
                      </td>
                      <td>
                        <span style={{
                          background: '#EFF6FF',
                          color: '#0062FF',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Système'}
                      </td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.entity}</td>
                      <td style={{ fontSize: '0.82rem', color: '#334155' }}>
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL ACTION ADMINISTRATIVE AVEC MOTIF OBLIGATOIRE */}
      {showActionModal && actionTargetUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Modifier l'abonnement du compte</h3>
              <button onClick={() => setShowActionModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>×</button>
            </div>
            <form onSubmit={handleExecuteAdminAction}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <strong>{actionTargetUser.firstName} {actionTargetUser.lastName}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{actionTargetUser.email}</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                    Statut actuel : <strong>{actionTargetUser.isPro ? 'Pro Actif' : 'Gratuit'}</strong>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '6px' }}>
                    Action à appliquer
                  </label>
                  <select
                    value={targetPlan}
                    onChange={e => setTargetPlan(e.target.value as any)}
                    style={{ width: '100%', padding: '10px' }}
                  >
                    <option value="pro">Accorder / Prolonger Formule Pro</option>
                    <option value="business">Accorder Formule Business</option>
                    <option value="free">Rétrograder en Version Gratuite (Free)</option>
                  </select>
                </div>

                {targetPlan !== 'free' && (
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '6px' }}>
                      Nombre de jours d'accès accordés
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={actionDays}
                      onChange={e => setActionDays(Number(e.target.value))}
                      required
                      style={{ width: '100%', padding: '10px' }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#DC2626', marginBottom: '6px' }}>
                    Motif obligatoire de la modification *
                  </label>
                  <textarea
                    rows={3}
                    value={actionMotif}
                    onChange={e => setActionMotif(e.target.value)}
                    required
                    placeholder="Ex: Geste commercial suite incident technique, ou encaissement direct en espèces..."
                    style={{ width: '100%', padding: '10px' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px' }}>
                    Règle de conformité : Ce motif sera gravé dans le journal d'audit administratif avec votre identité.
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowActionModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionSubmitting || !actionMotif.trim()}>
                  {actionSubmitting ? 'Enregistrement...' : 'Confirmer l\'opération'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
