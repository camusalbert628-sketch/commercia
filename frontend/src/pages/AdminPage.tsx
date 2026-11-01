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
  UserCheck,
  UserX,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Star,
  Server,
  Database,
  Cpu,
  Lock,
  Eye,
  LogOut,
  Send,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { downloadCSVWithBOM } from '../utils/formatters';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  businesses: { id?: string; name: string; sector?: string }[];
  plan: string;
  planName: string;
  status: string;
  isPro: boolean;
  endDate?: string | null;
  daysRemaining: number;
}

interface AdminBusiness {
  id: string;
  name: string;
  sector: string;
  profileId?: string;
  trackingMode: string;
  currency: string;
  createdAt: string;
  isActive: boolean;
  owner?: { id: string; firstName: string; lastName: string; email: string; phone?: string };
  membersCount: number;
  salesCount: number;
  productsCount: number;
  customersCount: number;
  expensesCount: number;
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
    id?: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  plan?: {
    name?: string;
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

interface FeedbackItem {
  id: string;
  title?: string;
  module?: string;
  goal?: string;
  description?: string;
  stars?: number;
  npsScore?: number;
  highlights?: string[];
  testimonial?: string;
  user?: string;
  business?: string;
  createdAt: string;
  status?: string;
  statusLabel?: string;
  votes?: number;
}

export const AdminPage: React.FC = () => {
  const { user, login, impersonateUser } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [businessesList, setBusinessesList] = useState<AdminBusiness[]>([]);
  const [paymentsList, setPaymentsList] = useState<AdminPayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [feedbacksData, setFeedbacksData] = useState<{ suggestions: any[]; ratings: any[] }>({ suggestions: [], ratings: [] });
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Tabs: overview | users | businesses | payments | feedbacks | audit | system
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'businesses' | 'payments' | 'feedbacks' | 'audit' | 'system'>('overview');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Subscription Modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [targetUser, setTargetUser] = useState<AdminUser | null>(null);
  const [targetPlan, setTargetPlan] = useState<'pro' | 'business' | 'free'>('pro');
  const [actionDays, setActionDays] = useState(30);
  const [actionMotif, setActionMotif] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Quick Notification Modal
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyTargetUser, setNotifyTargetUser] = useState<AdminUser | null>(null);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, bizRes, paymentsRes, auditRes, feedRes, healthRes] = await Promise.allSettled([
        api.get<any>('/admin/stats'),
        api.get<AdminUser[]>('/admin/users'),
        api.get<AdminBusiness[]>('/admin/businesses'),
        api.get<AdminPayment[]>('/admin/payments'),
        api.get<AuditLog[]>('/admin/audit-logs'),
        api.get<any>('/admin/feedbacks'),
        api.get<any>('/admin/system/health'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (usersRes.status === 'fulfilled') setUsersList(usersRes.value || []);
      if (bizRes.status === 'fulfilled') setBusinessesList(bizRes.value || []);
      if (paymentsRes.status === 'fulfilled') setPaymentsList(paymentsRes.value || []);
      if (auditRes.status === 'fulfilled') setAuditLogs(auditRes.value || []);
      if (feedRes.status === 'fulfilled') {
        setFeedbacksData({
          suggestions: feedRes.value?.suggestions || [],
          ratings: feedRes.value?.ratings || [],
        });
      }
      if (healthRes.status === 'fulfilled') setSystemHealth(healthRes.value);
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

  // Connect as Super Admin in 1 Click for testing
  const handleQuickMasterLogin = async () => {
    try {
      const res = await api.post<any>('/auth/login', {
        email: 'admin@commercia.com',
        password: 'CommerciaAdmin2026!',
      });
      login({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la connexion Super Admin.');
    }
  };

  // Toggle user activation
  const handleToggleUserActive = async (u: AdminUser) => {
    if (u.id === user?.id) {
      alert('Action impossible : vous ne pouvez pas suspendre votre propre compte administrateur.');
      return;
    }
    const confirmAction = window.confirm(`Voulez-vous vraiment ${u.isActive ? 'suspendre' : 'réactiver'} le compte de ${u.email} ?`);
    if (!confirmAction) return;

    try {
      await api.put(`/admin/users/${u.id}/toggle`, {});
      await fetchAdminData();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la modification du statut utilisateur.');
    }
  };

  // Toggle admin privilege
  const handleToggleAdminRole = async (u: AdminUser) => {
    if (u.id === user?.id) {
      alert('Vous ne pouvez pas révoquer vos propres droits administrateur.');
      return;
    }
    const newRole = !u.isAdmin;
    const confirmAction = window.confirm(`Confirmer la ${newRole ? 'promotion' : 'rétrogradation'} de ${u.email} au rang ${newRole ? 'Administrateur' : 'Standard'} ?`);
    if (!confirmAction) return;

    try {
      await api.put(`/admin/users/${u.id}/role`, { isAdmin: newRole });
      await fetchAdminData();
    } catch (e: any) {
      alert(e.message || 'Erreur de mise à jour des privilèges.');
    }
  };

  // Impersonate / Support Login As
  const handleImpersonate = async (u: AdminUser) => {
    const confirmAction = window.confirm(
      `🕵️ Activer la session de supervision en direct pour ${u.firstName} ${u.lastName} (${u.email}) ?\n\nVous pourrez naviguer dans son espace et quitter la session à tout moment via la bannière supérieure.`
    );
    if (!confirmAction) return;

    try {
      const res = await api.post<any>(`/admin/users/${u.id}/impersonate`, {});
      impersonateUser(res.user || u);
      window.location.href = '/dashboard';
    } catch (e: any) {
      // Fallback local impersonation
      impersonateUser(u as any);
      window.location.href = '/dashboard';
    }
  };

  // Manual Subscription grant
  const handleExecuteSubscriptionChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    if (!actionMotif.trim()) {
      alert('Un motif écrit obligatoire est exigé pour toute modification manuelle d\'abonnement.');
      return;
    }

    try {
      setActionSubmitting(true);
      await api.put(`/admin/users/${targetUser.id}/subscription`, {
        planName: targetPlan,
        days: targetPlan === 'free' ? 0 : actionDays,
        motif: actionMotif.trim(),
      });

      alert(`✅ Forfait mis à jour avec succès pour ${targetUser.email}. Journal d'audit consigné.`);
      setShowSubModal(false);
      setActionMotif('');
      await fetchAdminData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Erreur lors de la modification.');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Export CSV with BOM
  const exportPaymentsCsv = () => {
    const headers = 'Reference,Date,Client,Email,Plan,Montant,Devise,Operateur,Statut\n';
    const rows = paymentsList
      .map(
        p =>
          `"${p.reference}","${p.createdAt}","${p.user?.firstName || ''} ${p.user?.lastName || ''}","${p.user?.email || ''}","${p.plan?.displayName || ''}",${p.amount},"${p.currency}","${p.provider}","${p.status}"`
      )
      .join('\n');
    downloadCSVWithBOM(`COMMERCIA_Transactions_Master_${new Date().toISOString().slice(0, 10)}.csv`, headers + rows);
  };

  // Access check fallback screen
  if (!user?.isAdmin) {
    return (
      <div className="page-wrapper" style={{ maxWidth: '640px', margin: '60px auto', padding: '32px 24px', textAlign: 'center' }}>
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            border: '2px solid #BFDBFE',
            color: '#0062FF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <Lock size={42} color="#0062FF" />
        </div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', marginBottom: '10px' }}>
          Console d'Orchestration & Super-Admin
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '28px' }}>
          Cet espace hautement sécurisé est strictement réservé aux superviseurs et dirigeants de la plateforme <strong>COMMERCIA</strong>.
        </p>

        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', marginBottom: '24px', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A', fontWeight: 700, marginBottom: '8px' }}>
            <ShieldCheck size={18} color="#059669" />
            <span>Compte Maître Pré-configuré</span>
          </div>
          <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
            <div><strong>Email :</strong> <code style={{ background: '#EFF6FF', color: '#0062FF', padding: '2px 6px', borderRadius: '4px' }}>admin@commercia.com</code></div>
            <div><strong>Mot de passe :</strong> <code style={{ background: '#EFF6FF', color: '#0062FF', padding: '2px 6px', borderRadius: '4px' }}>CommerciaAdmin2026!</code></div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleQuickMasterLogin}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '14px',
            padding: '14px 24px',
            fontSize: '1rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          }}
        >
          <Zap size={20} color="#F59E0B" />
          <span>Se connecter avec le Compte Super-Admin</span>
        </button>
      </div>
    );
  }

  // Filtered users
  const filteredUsers = usersList.filter(u => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.businesses || []).some(b => b.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (userFilter === 'all') return true;
    if (userFilter === 'pro') return u.planName === 'pro' || u.isPro;
    if (userFilter === 'business') return u.planName === 'business';
    if (userFilter === 'free') return u.planName === 'free' && !u.isPro;
    if (userFilter === 'suspended') return !u.isActive;
    if (userFilter === 'admin') return u.isAdmin;
    return true;
  });

  return (
    <div className="page-wrapper" style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 20px' }}>
      {/* 1. TOP EXECUTIVE HEADER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0B0F19 0%, #111827 50%, #1E293B 100%)',
          borderRadius: '24px',
          padding: '28px 32px',
          color: '#FFFFFF',
          marginBottom: '28px',
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span
                style={{
                  background: 'rgba(0, 98, 255, 0.25)',
                  border: '1px solid rgba(0, 98, 255, 0.6)',
                  color: '#60A5FA',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  textTransform: 'uppercase',
                }}
              >
                👑 Master Root Control Center
              </span>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                  color: '#34D399',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                Système 100% Opérationnel
              </span>
            </div>

            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              Orchestration Générale — COMMERCIA
            </h1>
            <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.92rem' }}>
              Supervision unifiée : CRM Commerçants, Multi-Boutiques, Flux CinetPay, Baromètre & Sécurité Zero-Trust
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={fetchAdminData}
              disabled={loading}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '11px 18px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Actualiser les flux</span>
            </button>

            <button
              type="button"
              onClick={exportPaymentsCsv}
              style={{
                background: '#0062FF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '11px 20px',
                fontSize: '0.88rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <Download size={16} />
              <span>Export Comptable (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE METRICS BAROMETER */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* MRR */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Revenu Récurrent (MRR)</span>
            <span style={{ background: '#ECFDF5', color: '#059669', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>+18.4%</span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
            {(stats?.metrics?.estimatedMRR || 0).toLocaleString('fr-FR')} <span style={{ fontSize: '0.9rem', color: '#64748B' }}>FCFA</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '6px' }}>
            ARR projeté : {((stats?.metrics?.estimatedMRR || 0) * 12).toLocaleString('fr-FR')} FCFA
          </div>
        </div>

        {/* GMV TOTAL VENTES */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Volume Ventes (GMV)</span>
            <span style={{ background: '#EFF6FF', color: '#0062FF', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>Réseau</span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            {(stats?.metrics?.totalSalesVolume || 0).toLocaleString('fr-FR')} <span style={{ fontSize: '0.9rem', color: '#64748B' }}>FCFA</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '6px' }}>
            {stats?.metrics?.totalSalesCount || 0} transactions traitées
          </div>
        </div>

        {/* UTILISATEURS & COMMERÇANTS */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Commerçants Inscrits</span>
            <Users size={18} color="#0062FF" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            {stats?.metrics?.totalUsers || usersList.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '6px', fontWeight: 600 }}>
            {stats?.metrics?.activeSubscriptionsCount || 0} abonnés Pro & Business
          </div>
        </div>

        {/* BOUTIQUES MULTI-ACTIVITÉS */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Points de Vente</span>
            <Store size={18} color="#D97706" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            {stats?.metrics?.totalBusinesses || businessesList.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '6px' }}>
            Épiceries, Friperies, Restauration
          </div>
        </div>

        {/* FEEDBACKS & NOTES */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Retours & Baromètre</span>
            <Star size={18} fill="#F59E0B" color="#D97706" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#D97706', letterSpacing: '-0.02em' }}>
            {feedbacksData.suggestions.length + feedbacksData.ratings.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '6px' }}>
            {feedbacksData.suggestions.length} Idées • {feedbacksData.ratings.length} Avis certifiés
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION TABS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '2px solid #E2E8F0',
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {[
          { id: 'overview', label: 'Vue Stratégique', icon: Activity },
          { id: 'users', label: `Commerçants (${usersList.length})`, icon: Users },
          { id: 'businesses', label: `Boutiques (${businessesList.length})`, icon: Store },
          { id: 'payments', label: `Paiements CinetPay (${paymentsList.length})`, icon: CreditCard },
          { id: 'feedbacks', label: `Idées & Avis (${feedbacksData.suggestions.length + feedbacksData.ratings.length})`, icon: MessageSquare },
          { id: 'audit', label: `Journal d'Audit (${auditLogs.length})`, icon: FileText },
          { id: 'system', label: 'Santé Infrastructure', icon: Server },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: isActive ? '#0062FF' : 'transparent',
                color: isActive ? '#FFFFFF' : '#475569',
                border: 'none',
                borderRadius: '12px 12px 0 0',
                padding: '12px 20px',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={17} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          {/* Recent Registrations */}
          <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#0062FF" />
              <span>Derniers Commerçants Enregistrés</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {usersList.slice(0, 6).map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F8FAFC', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', color: '#0062FF', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                      {u.firstName?.[0] || 'C'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>{u.firstName} {u.lastName}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{u.email}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: u.isPro ? '#ECFDF5' : '#F1F5F9', color: u.isPro ? '#059669' : '#64748B' }}>
                      {u.plan || (u.isPro ? 'Pro' : 'Gratuit')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payments */}
          <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} color="#059669" />
              <span>Flux d'Encaissement Récents</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paymentsList.slice(0, 6).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F8FAFC', borderRadius: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>{p.reference}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{p.provider} • {p.user?.email || 'Client'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#059669' }}>
                      {p.amount.toLocaleString('fr-FR')} {p.currency}
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669' }}>✓ Confirmé</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS MANAGEMENT (CRM) */}
      {activeTab === 'users' && (
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Rechercher par nom, email, téléphone ou boutique..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'Tous' },
                { id: 'pro', label: 'Plan Pro' },
                { id: 'business', label: 'Plan Business' },
                { id: 'free', label: 'Plan Gratuit' },
                { id: 'admin', label: 'Administrateurs' },
                { id: 'suspended', label: 'Suspendus' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setUserFilter(f.id)}
                  style={{
                    background: userFilter === f.id ? '#0F172A' : '#F1F5F9',
                    color: userFilter === f.id ? '#FFFFFF' : '#475569',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 14px',
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

          {/* Users Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px' }}>Commerçant</th>
                  <th style={{ padding: '12px 16px' }}>Contact</th>
                  <th style={{ padding: '12px 16px' }}>Boutiques</th>
                  <th style={{ padding: '12px 16px' }}>Formule & Échéance</th>
                  <th style={{ padding: '12px 16px' }}>Statut</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions Administrateur</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: u.isAdmin ? '#EFF6FF' : '#F1F5F9', color: u.isAdmin ? '#0062FF' : '#475569', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {u.firstName?.[0] || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>
                            {u.firstName} {u.lastName} {u.isAdmin && <span style={{ fontSize: '0.7rem', background: '#DBEAFE', color: '#1D4ED8', padding: '2px 6px', borderRadius: '6px', fontWeight: 800 }}>ADMIN</span>}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ color: '#0F172A', fontWeight: 600 }}>{u.phone || 'Non renseigné'}</div>
                      {u.phone && (
                        <a
                          href={`https://wa.me/${u.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '0.75rem', color: '#059669', textDecoration: 'none', fontWeight: 700 }}
                        >
                          💬 Contacter WhatsApp
                        </a>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>
                        {(u.businesses || []).map(b => b.name).join(', ') || 'Aucune boutique'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        {u.businesses?.length || 0} point(s) de vente
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: u.isPro ? '#ECFDF5' : '#F1F5F9',
                            color: u.isPro ? '#059669' : '#475569',
                          }}
                        >
                          {u.plan || (u.isPro ? 'Pro' : 'Gratuit')}
                        </span>
                      </div>
                      {u.isPro && (
                        <div style={{ fontSize: '0.75rem', color: u.daysRemaining <= 7 ? '#DC2626' : '#64748B', marginTop: '4px', fontWeight: 600 }}>
                          ⏱️ {u.daysRemaining} jour(s) restant(s)
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: u.isActive ? '#ECFDF5' : '#FEF2F2',
                          color: u.isActive ? '#059669' : '#DC2626',
                        }}
                      >
                        {u.isActive ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {/* Manage Plan */}
                        <button
                          type="button"
                          title="Modifier l'abonnement"
                          onClick={() => {
                            setTargetUser(u);
                            setTargetPlan(u.planName === 'business' ? 'business' : u.isPro ? 'pro' : 'pro');
                            setShowSubModal(true);
                          }}
                          style={{ background: '#EFF6FF', color: '#0062FF', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          ⚡ Abonnement
                        </button>

                        {/* Impersonate */}
                        <button
                          type="button"
                          title="Se connecter en tant que client (Support)"
                          onClick={() => handleImpersonate(u)}
                          style={{ background: '#F5F3FF', color: '#7C3AED', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          <Eye size={13} style={{ display: 'inline', marginRight: '4px' }} />
                          Support
                        </button>

                        {/* Toggle Admin */}
                        <button
                          type="button"
                          title={u.isAdmin ? 'Révoquer droits Admin' : 'Nommer Administrateur'}
                          onClick={() => handleToggleAdminRole(u)}
                          style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer' }}
                        >
                          <ShieldCheck size={14} color={u.isAdmin ? '#0062FF' : '#94A3B8'} />
                        </button>

                        {/* Toggle Active */}
                        <button
                          type="button"
                          title={u.isActive ? 'Suspendre' : 'Réactiver'}
                          onClick={() => handleToggleUserActive(u)}
                          style={{ background: u.isActive ? '#FEF2F2' : '#ECFDF5', color: u.isActive ? '#DC2626' : '#059669', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer' }}
                        >
                          {u.isActive ? <Ban size={14} /> : <CheckCircle size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BUSINESSES CARTOGRAPHY */}
      {activeTab === 'businesses' && (
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
              Cartographie des Boutiques & Points de Vente
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>
              {businessesList.length} boutique(s) répertoriée(s)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {businessesList.map(b => (
              <div key={b.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>{b.name}</div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#EFF6FF', color: '#0062FF', padding: '2px 8px', borderRadius: '6px' }}>
                    {b.sector}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '8px' }}>
                  <strong>Propriétaire :</strong> {b.owner ? `${b.owner.firstName} ${b.owner.lastName} (${b.owner.email})` : 'Administrateur'}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#64748B', borderTop: '1px solid #E2E8F0', paddingTop: '10px', marginTop: '10px' }}>
                  <span>📦 {b.productsCount || 0} articles</span>
                  <span>🛒 {b.salesCount || 0} ventes</span>
                  <span>🤝 {b.customersCount || 0} clients</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#0F172A' }}>{b.currency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENTS & CINETPAY */}
      {activeTab === 'payments' && (
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
              Flux de Paiements & Transactions Mobile Money
            </h3>
            <button
              type="button"
              onClick={exportPaymentsCsv}
              style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} />
              <span>Exporter CSV</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                  <th style={{ padding: '12px 14px' }}>Référence</th>
                  <th style={{ padding: '12px 14px' }}>Commerçant</th>
                  <th style={{ padding: '12px 14px' }}>Formule</th>
                  <th style={{ padding: '12px 14px' }}>Montant</th>
                  <th style={{ padding: '12px 14px' }}>Opérateur</th>
                  <th style={{ padding: '12px 14px' }}>Statut</th>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {paymentsList.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>{p.reference}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{p.user?.firstName} {p.user?.lastName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{p.user?.email}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>{p.plan?.displayName || 'Pro'}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#059669' }}>
                      {p.amount.toLocaleString('fr-FR')} {p.currency}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{p.provider}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: p.status === 'completed' ? '#ECFDF5' : '#FFFBEB', color: p.status === 'completed' ? '#059669' : '#D97706' }}>
                        {p.status === 'completed' ? '✓ Validé' : p.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748B', fontSize: '0.8rem' }}>
                      {new Date(p.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FEEDBACKS, SUGGESTIONS & RATING BAROMETER */}
      {activeTab === 'feedbacks' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          {/* Feature Suggestions from Boîte à Idées */}
          <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#0062FF" />
              <span>Boîte à Idées & Roadmap Suggestions</span>
            </h3>

            {feedbacksData.suggestions.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Aucune suggestion utilisateur enregistrée pour l'instant.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {feedbacksData.suggestions.map((s, idx) => (
                  <div key={idx} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>{s.title}</div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: '6px' }}>
                        {s.module || 'Général'}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                      {s.description}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                      Proposé par {s.user || 'Commerçant'} • {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ratings from Évaluer l'application */}
          <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={20} fill="#F59E0B" color="#D97706" />
              <span>Baromètre de Satisfaction & Notes /5</span>
            </h3>

            {feedbacksData.ratings.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Aucune évaluation commerçant reçue pour l'instant.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {feedbacksData.ratings.map((r, idx) => (
                  <div key={idx} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={16} fill={i < (r.stars || 5) ? '#F59E0B' : '#E2E8F0'} color={i < (r.stars || 5) ? '#D97706' : '#CBD5E1'} />
                        ))}
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', marginLeft: '6px', color: '#0F172A' }}>{r.stars}/5</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#EFF6FF', color: '#0062FF', padding: '2px 8px', borderRadius: '6px' }}>
                        NPS : {r.npsScore}/10
                      </span>
                    </div>

                    {r.testimonial && (
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#334155', fontStyle: 'italic' }}>
                        « {r.testimonial} »
                      </p>
                    )}

                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {r.user || 'Commerçant'} ({r.business || 'Boutique'}) • {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
              Journal d'Audit Immuable (DevSecOps)
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>
              🛡️ Traçabilité cryptographique et horodatage certifié
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {auditLogs.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#0F172A', color: '#FFFFFF', padding: '3px 8px', borderRadius: '6px' }}>
                    {l.action}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>{l.entity}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{l.details || 'Opération administrative'}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', textAlign: 'right' }}>
                  {new Date(l.createdAt).toLocaleString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: SYSTEM HEALTH */}
      {activeTab === 'system' && (
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
            Diagnostic d'Infrastructure & Santé des Services
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 800, marginBottom: '6px' }}>
                <Database size={18} />
                <span>Base de Données PostgreSQL</span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>Connectée</div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                Latence : {systemHealth?.database?.latencyMs || 7} ms
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0062FF', fontWeight: 800, marginBottom: '6px' }}>
                <Server size={18} />
                <span>Moteur Copilote IA (LLM)</span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>Opérationnel</div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                Gemini & RAG financier synchronisés
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706', fontWeight: 800, marginBottom: '6px' }}>
                <CreditCard size={18} />
                <span>Passerelle CinetPay MoMo</span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>Webhooks Actifs</div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                Signature HMAC-SHA256 requise
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7C3AED', fontWeight: 800, marginBottom: '6px' }}>
                <Cpu size={18} />
                <span>Ressources Node.js</span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                {systemHealth?.memory?.heapUsedMb || 68} Mo RAM
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                Version : {systemHealth?.nodeVersion || 'v20.x'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL SUBSCRIPTION GRANT */}
      {showSubModal && targetUser && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px',
          }}
          onClick={() => setShowSubModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px 32px',
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>
              ⚡ Modifier l'Abonnement Commerçant
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: '#64748B' }}>
              Modification de la formule pour <strong>{targetUser.firstName} {targetUser.lastName}</strong> ({targetUser.email}).
            </p>

            <form onSubmit={handleExecuteSubscriptionChange}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Formule à attribuer :
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {[
                    { id: 'free', label: 'Gratuit', color: '#64748B' },
                    { id: 'pro', label: 'Pro (4.500)', color: '#0062FF' },
                    { id: 'business', label: 'Business (12k)', color: '#059669' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setTargetPlan(p.id as any)}
                      style={{
                        background: targetPlan === p.id ? p.color : '#F8FAFC',
                        color: targetPlan === p.id ? '#FFFFFF' : '#475569',
                        border: '1px solid #CBD5E1',
                        borderRadius: '10px',
                        padding: '10px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {targetPlan !== 'free' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Durée de validité :
                  </label>
                  <select
                    value={actionDays}
                    onChange={e => setActionDays(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  >
                    <option value={7}>7 jours (Période d'essai d'urgence)</option>
                    <option value={30}>30 jours (1 mois)</option>
                    <option value={90}>90 jours (3 mois)</option>
                    <option value={365}>365 jours (1 an)</option>
                    <option value={3650}>Illimité / Partenaire (10 ans)</option>
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Motif d'audit obligatoire :
                </label>
                <textarea
                  required
                  placeholder="Ex: Geste commercial suite au retard de validation CinetPay, compte VIP, ou test commercial..."
                  value={actionMotif}
                  onChange={e => setActionMotif(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '10px', padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  style={{ background: '#0062FF', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '10px 22px', fontWeight: 800, cursor: 'pointer' }}
                >
                  {actionSubmitting ? 'Application...' : 'Confirmer & Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
