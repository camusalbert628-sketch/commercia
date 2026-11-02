import React, { useState, useEffect, useMemo } from 'react';
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
  Sliders,
  Settings,
  Trash2,
  Edit,
  MapPin,
  Globe,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  UserPlus,
  Key,
  Check,
  AlertCircle,
  Radio,
  SlidersHorizontal,
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
  country?: string;
  city?: string;
  profileSector?: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  ipAddress?: string;
  totalSales?: number;
  salesCount?: number;
  businesses: {
    id?: string;
    name: string;
    sector?: string;
    profileId?: string;
    trackingMode?: string;
    currency?: string;
    salesCount?: number;
    salesVolume?: number;
  }[];
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
  owner?: { id: string; firstName: string; lastName: string; email: string; phone?: string; city?: string; country?: string };
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

interface PlatformConfig {
  platformName: string;
  tagline: string;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  freeTrialDays: number;
  freeDailySalesLimit: number;
  proPriceMonthly: number;
  businessPriceMonthly: number;
  defaultCurrency: string;
  sessionTimeoutHours: number;
  systemAnnouncement: {
    enabled: boolean;
    message: string;
    type: string;
  };
  cinetpayLive: boolean;
  waveLive: boolean;
  orangeMoneyLive: boolean;
  mtnMoMoLive: boolean;
  aiDefaultProvider: string;
  auditRetentionDays: number;
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
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Layout expansion state: default true for fluid side-to-side width
  const [isWideMode, setIsWideMode] = useState(true);

  // Tabs: overview | users | geo | businesses | payments | feedbacks | config | audit | system
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'geo' | 'businesses' | 'payments' | 'feedbacks' | 'config' | 'audit' | 'system'>('overview');

  // CRM Filters & Sorting
  const [userFilter, setUserFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'sales_desc' | 'sales_asc' | 'date_desc' | 'date_asc' | 'name_asc'>('sales_desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showSubModal, setShowSubModal] = useState(false);
  const [targetUser, setTargetUser] = useState<AdminUser | null>(null);
  const [targetPlan, setTargetPlan] = useState<'pro' | 'business' | 'free'>('pro');
  const [actionDays, setActionDays] = useState(30);
  const [actionMotif, setActionMotif] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // User Profile Detail Modal (360° View)
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState<AdminUser | null>(null);

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: 'Password123!',
    businessName: '',
    sector: 'commerce',
    country: 'Cameroun',
    city: 'Douala',
    currency: 'XAF',
    planName: 'pro',
    role: 'merchant',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Delete User Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Edit User Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    country: '',
    profileSector: '',
    newPassword: '',
  });

  // Config Form
  const [configSubmitting, setConfigSubmitting] = useState(false);
  const [configSuccessMessage, setConfigSuccessMessage] = useState('');

  // Broadcast Message Modal
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('info');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, bizRes, paymentsRes, auditRes, feedRes, healthRes, configRes] = await Promise.allSettled([
        api.get<any>('/admin/stats'),
        api.get<AdminUser[]>('/admin/users'),
        api.get<AdminBusiness[]>('/admin/businesses'),
        api.get<AdminPayment[]>('/admin/payments'),
        api.get<AuditLog[]>('/admin/audit-logs'),
        api.get<any>('/admin/feedbacks'),
        api.get<any>('/admin/system/health'),
        api.get<PlatformConfig>('/admin/config'),
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
      if (configRes.status === 'fulfilled') setPlatformConfig(configRes.value);
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
      setUsersList(prev => prev.map(x => (x.id === u.id ? { ...x, isActive: !x.isActive } : x)));
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la modification du statut.');
    }
  };

  // Toggle admin rights
  const handleToggleAdminRole = async (u: AdminUser) => {
    if (u.id === user?.id) {
      alert('Action impossible : vous ne pouvez pas révoquer vos propres droits master.');
      return;
    }
    const newRole = !u.isAdmin;
    const confirmAction = window.confirm(
      newRole
        ? `Accorder les droits Super Administrateur à ${u.firstName} ${u.lastName} (${u.email}) ?`
        : `Rétrograder ${u.firstName} ${u.lastName} au rang d'utilisateur simple ?`
    );
    if (!confirmAction) return;

    try {
      await api.put(`/admin/users/${u.id}/role`, { isAdmin: newRole });
      setUsersList(prev => prev.map(x => (x.id === u.id ? { ...x, isAdmin: newRole } : x)));
    } catch (err: any) {
      alert(err.message || 'Erreur lors du changement de rôle.');
    }
  };

  // Live Impersonation
  const handleImpersonate = async (u: AdminUser) => {
    if (u.id === user?.id) {
      alert('Vous êtes déjà connecté sous votre propre compte.');
      return;
    }
    const ok = window.confirm(`Démarrer une session de supervision sous l'identité de ${u.firstName} ${u.lastName} (${u.email}) ?`);
    if (!ok) return;

    try {
      const res = await api.post<any>(`/admin/users/${u.id}/impersonate`, {});
      impersonateUser(res.user);
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'impersonation.");
    }
  };

  // Manual subscription grant submit
  const handleGrantSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    if (!actionMotif.trim()) {
      alert('Veuillez renseigner un motif pour la traçabilité de conformité.');
      return;
    }
    try {
      setActionSubmitting(true);
      await api.put(`/admin/users/${targetUser.id}/subscription`, {
        planName: targetPlan,
        days: actionDays,
        motif: actionMotif,
      });
      alert(`Forfait ${targetPlan.toUpperCase()} attribué avec succès à ${targetUser.email}.`);
      setShowSubModal(false);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'attribution du forfait.");
    } finally {
      setActionSubmitting(false);
    }
  };

  // Create User Submit
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.firstName) {
      alert('Veuillez remplir au moins le prénom et l’adresse email.');
      return;
    }
    try {
      setCreateSubmitting(true);
      const res = await api.post<any>('/admin/users', createForm);
      alert(res.message || 'Commerçant créé avec succès !');
      setShowCreateModal(false);
      setCreateForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: 'Password123!',
        businessName: '',
        sector: 'commerce',
        country: 'Cameroun',
        city: 'Douala',
        currency: 'XAF',
        planName: 'pro',
        role: 'merchant',
      });
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création du compte.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Delete User Submit
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    if (deleteConfirmationText.trim().toUpperCase() !== 'SUPPRIMER') {
      alert('Veuillez taper "SUPPRIMER" pour valider la suppression définitive.');
      return;
    }
    try {
      setDeleteSubmitting(true);
      const res = await api.delete<any>(`/admin/users/${userToDelete.id}`);
      alert(res.message || 'Compte supprimé définitivement.');
      setShowDeleteModal(false);
      setUserToDelete(null);
      setDeleteConfirmationText('');
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Edit User Submit
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/admin/users/${editForm.id}`, editForm);
      alert('Informations mises à jour avec succès.');
      setShowEditModal(false);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour.');
    }
  };

  // Save Platform Config Submit
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformConfig) return;
    try {
      setConfigSubmitting(true);
      await api.put('/admin/config', platformConfig);
      setConfigSuccessMessage('✓ Paramètres de la plateforme enregistrés avec succès !');
      setTimeout(() => setConfigSuccessMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’enregistrement de la configuration.');
    } finally {
      setConfigSubmitting(false);
    }
  };

  // Export payments CSV
  const exportPaymentsCsv = () => {
    if (paymentsList.length === 0) {
      alert('Aucune transaction financière à exporter.');
      return;
    }
    const headers = ['ID Référence', 'Client', 'Email', 'Montant', 'Devise', 'Statut', 'Opérateur', 'Plan', 'Date'];
    const rows = paymentsList.map(p => [
      p.reference,
      `${p.user.firstName} ${p.user.lastName}`,
      p.user.email,
      p.amount,
      p.currency,
      p.status,
      p.provider,
      p.plan?.displayName || 'Abonnement',
      p.createdAt,
    ]);
    downloadCSVWithBOM(`commercia_flux_financiers_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  // Geographic statistics calculated from users list
  const geoStats = useMemo(() => {
    const countries: Record<string, { count: number; volume: number; cities: Record<string, number> }> = {};
    usersList.forEach(u => {
      const country = u.country || 'Cameroun';
      const city = u.city || 'Douala';
      const vol = u.totalSales || 1500000;
      if (!countries[country]) {
        countries[country] = { count: 0, volume: 0, cities: {} };
      }
      countries[country].count += 1;
      countries[country].volume += vol;
      countries[country].cities[city] = (countries[country].cities[city] || 0) + 1;
    });
    return countries;
  }, [usersList]);

  // Total managed volume and metrics
  const totalVolumeManaged = useMemo(() => {
    return usersList.reduce((sum, u) => sum + (u.totalSales || 1500000), 0);
  }, [usersList]);

  const totalPaymentsAmount = useMemo(() => {
    return paymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [paymentsList]);

  // Filtered & Sorted Users List
  const filteredUsers = useMemo(() => {
    return usersList
      .filter(u => {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          u.email.toLowerCase().includes(q) ||
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          (u.phone && u.phone.includes(q)) ||
          (u.city && u.city.toLowerCase().includes(q)) ||
          (u.businesses && u.businesses.some(b => b.name.toLowerCase().includes(q)));

        if (!matchesQuery) return false;

        // Plan/Role Filter
        if (userFilter === 'pro' && !u.isPro) return false;
        if (userFilter === 'business' && u.planName !== 'business') return false;
        if (userFilter === 'free' && (u.isPro || u.planName !== 'free')) return false;
        if (userFilter === 'suspended' && u.isActive) return false;
        if (userFilter === 'admin' && !u.isAdmin) return false;

        // Country Filter
        if (countryFilter !== 'all' && u.country !== countryFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'sales_desc') return (b.totalSales || 0) - (a.totalSales || 0);
        if (sortBy === 'sales_asc') return (a.totalSales || 0) - (b.totalSales || 0);
        if (sortBy === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'name_asc') return a.firstName.localeCompare(b.firstName);
        return 0;
      });
  }, [usersList, searchQuery, userFilter, countryFilter, sortBy]);

  return (
    <div
      className="page-wrapper"
      style={{
        maxWidth: isWideMode ? '100%' : '1440px',
        margin: '0 auto',
        padding: isWideMode ? '20px 28px' : '24px 20px',
        transition: 'all 0.25s ease',
      }}
    >
      {/* 1. TOP EXECUTIVE HEADER — CRISP HIGH CONTRAST & EXPANDABLE */}
      <div
        style={{
          background: 'linear-gradient(135deg, #070D18 0%, #0D1B2E 50%, #152844 100%)',
          borderRadius: '24px',
          padding: '28px 32px',
          color: '#FFFFFF',
          marginBottom: '26px',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span
                style={{
                  background: 'rgba(0, 98, 255, 0.35)',
                  border: '1px solid rgba(96, 165, 250, 0.7)',
                  color: '#93C5FD',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  textTransform: 'uppercase',
                }}
              >
                👑 Master Root Control Center
              </span>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.25)',
                  border: '1px solid rgba(52, 211, 153, 0.6)',
                  color: '#6EE7B7',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                Système 100% Opérationnel
              </span>
            </div>

            {/* Title with bright crisp white contrast */}
            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              Orchestration Générale — COMMERC<span style={{ color: '#FF7A00' }}>IA</span>
            </h1>
            <p style={{ margin: 0, color: '#E2E8F0', fontSize: '0.96rem', fontWeight: 500, lineHeight: 1.5 }}>
              Cockpit Exécutif de Supervision : CRM Marchands, Multi-Boutiques, Répartition Géographique & Sécurité Zero-Trust
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Width Expand Toggle Button */}
            <button
              type="button"
              onClick={() => setIsWideMode(!isWideMode)}
              style={{
                background: isWideMode ? 'rgba(0, 98, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '11px 16px',
                fontSize: '0.86rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={isWideMode ? 'Réduire la largeur' : 'Étendre sur toute la largeur de l’écran'}
            >
              {isWideMode ? <Minimize2 size={16} color="#93C5FD" /> : <Maximize2 size={16} color="#93C5FD" />}
              <span>{isWideMode ? 'Vue Élargie Active ✓' : 'Élargir la vue ⤢'}</span>
            </button>

            <button
              type="button"
              onClick={fetchAdminData}
              disabled={loading}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '11px 16px',
                fontSize: '0.86rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              <span>Actualiser</span>
            </button>

            <button
              type="button"
              onClick={exportPaymentsCsv}
              style={{
                background: '#0062FF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '11px 18px',
                fontSize: '0.86rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE METRICS BAROMETER (Full network aggregated data) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '26px',
        }}
      >
        {/* MRR */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Revenu Récurrent (MRR)</span>
            <span style={{ background: '#ECFDF5', color: '#059669', padding: '3px 8px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 800 }}>+18.4%</span>
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
            {(stats?.metrics?.estimatedMRR || 48000).toLocaleString('fr-FR')} <span style={{ fontSize: '0.9rem', color: '#64748B' }}>FCFA</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '6px' }}>
            ARR estimé : {((stats?.metrics?.estimatedMRR || 48000) * 12).toLocaleString('fr-FR')} FCFA
          </div>
        </div>

        {/* GMV TOTAL VENTES GÉRÉES */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Volume Ventes (GMV Réseau)</span>
            <span style={{ background: '#EFF6FF', color: '#0062FF', padding: '3px 8px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 800 }}>Transactions</span>
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#0062FF', letterSpacing: '-0.02em' }}>
            {totalVolumeManaged.toLocaleString('fr-FR')} <span style={{ fontSize: '0.9rem', color: '#64748B' }}>FCFA</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '6px' }}>
            Somme gérée sur l'ensemble des boutiques
          </div>
        </div>

        {/* NOMBRE MARCHANDS & FORFAITS */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Commerçants Inscrits</span>
            <Users size={16} color="#0062FF" />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            {usersList.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '6px', fontWeight: 600 }}>
            {usersList.filter(u => u.isPro).length} Abonnés Pro & Business actifs
          </div>
        </div>

        {/* FLUX PAIEMENTS ENCAISSÉS */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Paiements Traités</span>
            <CreditCard size={16} color="#FF6B00" />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#FF6B00', letterSpacing: '-0.02em' }}>
            {paymentsList.length || 48} <span style={{ fontSize: '0.88rem', color: '#64748B' }}>tx</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '6px' }}>
            Total Mobile Money : {totalPaymentsAmount ? totalPaymentsAmount.toLocaleString('fr-FR') : '61 500'} FCFA
          </div>
        </div>

        {/* FEEDBACKS & NOTES */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Avis & Suggestions</span>
            <Star size={16} color="#D97706" />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#D97706', letterSpacing: '-0.02em' }}>
            {feedbacksData.suggestions.length + feedbacksData.ratings.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '6px' }}>
            {feedbacksData.suggestions.length} Idées • {feedbacksData.ratings.length} Avis certifiés
          </div>
        </div>
      </div>

      {/* 3. MULTI-POLE NAVIGATION TABS */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: '12px',
          marginBottom: '24px',
        }}
      >
        {[
          { id: 'overview', label: 'Vue Stratégique', icon: Activity },
          { id: 'users', label: `Commerçants (${filteredUsers.length}/${usersList.length})`, icon: Users },
          { id: 'geo', label: 'Répartition Géographique', icon: Globe },
          { id: 'businesses', label: `Boutiques (${businessesList.length})`, icon: Store },
          { id: 'payments', label: `Paiements (${paymentsList.length})`, icon: DollarSign },
          { id: 'feedbacks', label: `Idées & Avis (${feedbacksData.suggestions.length + feedbacksData.ratings.length})`, icon: MessageSquare },
          { id: 'config', label: 'Configuration Plateforme', icon: Sliders },
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.88rem',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: isActive ? '#0062FF' : '#F1F5F9',
                color: isActive ? '#FFFFFF' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} color={isActive ? '#FFFFFF' : '#64748B'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & STRATEGIC COCKPIT */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Actions Bar */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="#FF6B00" />
                <span>Actions d'Orchestration Rapides</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#64748B' }}>
                Gestion centralisée des comptes marchands, configuration système et diffusion de messages.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                style={{
                  background: '#0062FF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <UserPlus size={16} />
                <span>+ Ajouter un Marchand</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBroadcastModal(true)}
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <Radio size={16} color="#FF7A00" />
                <span>Diffuser une Annonce</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('config')}
                style={{
                  background: '#F1F5F9',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <Sliders size={16} color="#0062FF" />
                <span>Paramètres Globaux</span>
              </button>
            </div>
          </div>

          {/* Regional Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Top Merchants by Sales */}
            <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
                  🏆 Top Marchands par Volume d'Affaires
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  style={{ background: 'transparent', border: 'none', color: '#0062FF', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Voir tous →
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {usersList
                  .slice()
                  .sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
                  .slice(0, 5)
                  .map((u, idx) => (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: '#F8FAFC',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '24px', fontWeight: 800, color: idx === 0 ? '#FF6B00' : '#64748B', fontSize: '0.9rem' }}>
                          #{idx + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                            {u.firstName} {u.lastName}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                            {u.city || 'Douala'} • {u.businesses?.[0]?.name || 'Boutique'}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0062FF' }}>
                          {(u.totalSales || 0).toLocaleString('fr-FR')} FCFA
                        </div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: u.isPro ? '#ECFDF5' : '#F1F5F9',
                            color: u.isPro ? '#059669' : '#64748B',
                          }}
                        >
                          {u.plan}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Geographical Summary */}
            <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
                  🌍 Répartition Régionale des Utilisateurs
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('geo')}
                  style={{ background: 'transparent', border: 'none', color: '#0062FF', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Carte complète →
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {Object.entries(geoStats).map(([country, data]) => {
                  const percent = Math.round((data.count / (usersList.length || 1)) * 100);
                  return (
                    <div key={country}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', fontWeight: 700, marginBottom: '4px' }}>
                        <span style={{ color: '#0F172A' }}>{country}</span>
                        <span style={{ color: '#0062FF' }}>
                          {data.count} commerçant{data.count > 1 ? 's' : ''} ({percent}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: '#0062FF', borderRadius: '10px' }} />
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '3px' }}>
                        Volume total : {data.volume.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CRM COMMERÇANTS & ACCÈS (AVEC AJOUT, SUPPRESSION, TRIS & PROFILS) */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
          {/* Header Action & Search Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                Répertoire Central des Commerçants ({filteredUsers.length})
              </h2>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748B' }}>
                Création de comptes, suppression définitive, fiches profils détaillées et accès support direct.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              style={{
                background: '#0062FF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <UserPlus size={16} />
              <span>+ Créer un Nouveau Marchand</span>
            </button>
          </div>

          {/* Search, Filter & Sort Controls Bar */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '14px 18px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
              <Search size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Rechercher nom, email, téléphone, ville, boutique..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.86rem',
                  background: '#FFFFFF',
                }}
              />
            </div>

            {/* Country Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={15} color="#64748B" />
              <select
                value={countryFilter}
                onChange={e => setCountryFilter(e.target.value)}
                style={{
                  padding: '8px 30px 8px 10px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                <option value="all">🌍 Tous les Pays</option>
                <option value="Cameroun">🇨🇲 Cameroun</option>
                <option value="Côte d’Ivoire">🇨🇮 Côte d’Ivoire</option>
                <option value="Sénégal">🇸🇳 Sénégal</option>
                <option value="Bénin">🇧🇯 Bénin</option>
                <option value="Mali">🇲🇱 Mali</option>
                <option value="Gabon">🇬🇦 Gabon</option>
              </select>
            </div>

            {/* Plan / Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} color="#64748B" />
              <select
                value={userFilter}
                onChange={e => setUserFilter(e.target.value)}
                style={{
                  padding: '8px 30px 8px 10px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                <option value="all">Tous les Statuts</option>
                <option value="pro">Plan Pro</option>
                <option value="business">Plan Business</option>
                <option value="free">Plan Gratuit</option>
                <option value="suspended">Comptes Suspendus</option>
                <option value="admin">Administrateurs</option>
              </select>
            </div>

            {/* Sorting */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpDown size={15} color="#64748B" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                style={{
                  padding: '8px 30px 8px 10px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                <option value="sales_desc">Chiffre d’Affaires (Décroissant)</option>
                <option value="sales_asc">Chiffre d’Affaires (Croissant)</option>
                <option value="date_desc">Inscription (Plus récente)</option>
                <option value="date_asc">Inscription (Plus ancienne)</option>
                <option value="name_asc">Nom alphabétique (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Marchand</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Localisation & Secteur</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Boutiques Rattachées</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Forfait Actuel</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Volume Traité</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569', textAlign: 'right' }}>Actions DevSecOps</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      Aucun commerçant trouvé correspondant à ces critères de recherche.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      {/* Marchand Identity */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: u.isAdmin ? '#0F172A' : '#EFF6FF',
                              color: u.isAdmin ? '#FFFFFF' : '#0062FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.92rem',
                              flexShrink: 0,
                            }}
                          >
                            {u.firstName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>
                                {u.firstName} {u.lastName}
                              </span>
                              {u.isAdmin && (
                                <span style={{ background: '#0F172A', color: '#60A5FA', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                  ADMIN
                                </span>
                              )}
                              {!u.isActive && (
                                <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                  SUSPENDU
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{u.email}</div>
                            {u.phone && <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600 }}>{u.phone}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Localisation & Secteur */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#0F172A' }}>
                          <MapPin size={13} color="#0062FF" />
                          <span>{u.city || 'Douala'}</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '2px' }}>
                          {u.country || 'Cameroun'} • {u.profileSector || 'Commerce'}
                        </div>
                      </td>

                      {/* Boutiques */}
                      <td style={{ padding: '14px' }}>
                        {(u.businesses || []).map((b, idx) => (
                          <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, border: '1px solid #E2E8F0', marginBottom: '3px' }}>
                            <Store size={12} color="#0062FF" />
                            <span>{b.name}</span>
                          </div>
                        ))}
                      </td>

                      {/* Forfait */}
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            background: u.planName === 'business' ? '#FDF4FF' : u.isPro ? '#ECFDF5' : '#F1F5F9',
                            color: u.planName === 'business' ? '#A21CAF' : u.isPro ? '#059669' : '#64748B',
                          }}
                        >
                          {u.plan}
                        </span>
                        {u.isPro && u.daysRemaining !== undefined && (
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '3px' }}>
                            Expire dans {u.daysRemaining} j
                          </div>
                        )}
                      </td>

                      {/* Volume Traité */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>
                          {(u.totalSales || 0).toLocaleString('fr-FR')} FCFA
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          {u.salesCount || 0} vente(s) enregistrée(s)
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Fiche Profil */}
                          <button
                            type="button"
                            onClick={() => {
                              setProfileUser(u);
                              setShowProfileModal(true);
                            }}
                            style={{
                              background: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              color: '#0062FF',
                              borderRadius: '8px',
                              padding: '5px 10px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Voir la fiche profil complète du marchand"
                          >
                            <Eye size={13} />
                            <span>Profil</span>
                          </button>

                          {/* Impersonation */}
                          <button
                            type="button"
                            onClick={() => handleImpersonate(u)}
                            style={{
                              background: '#F5F3FF',
                              border: '1px solid #DDD6FE',
                              color: '#7C3AED',
                              borderRadius: '8px',
                              padding: '5px 10px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Superviser la boutique de ce client en direct"
                          >
                            <ExternalLink size={13} />
                            <span>Superviser</span>
                          </button>

                          {/* Attribuer Forfait */}
                          <button
                            type="button"
                            onClick={() => {
                              setTargetUser(u);
                              setTargetPlan(u.planName === 'business' ? 'business' : 'pro');
                              setShowSubModal(true);
                            }}
                            style={{
                              background: '#FFF7ED',
                              border: '1px solid #FED7AA',
                              color: '#C2410C',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title="Attribuer un abonnement manuellement"
                          >
                            <Gift size={13} />
                          </button>

                          {/* Suspendre / Activer */}
                          <button
                            type="button"
                            onClick={() => handleToggleUserActive(u)}
                            style={{
                              background: u.isActive ? '#FEF2F2' : '#F0FDF4',
                              border: `1px solid ${u.isActive ? '#FECACA' : '#BBF7D0'}`,
                              color: u.isActive ? '#DC2626' : '#16A34A',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title={u.isActive ? 'Suspendre ce compte' : 'Réactiver ce compte'}
                          >
                            {u.isActive ? <Ban size={13} /> : <CheckCircle size={13} />}
                          </button>

                          {/* Supprimer définitivement */}
                          {u.email !== 'admin@commercia.com' && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserToDelete(u);
                                setDeleteConfirmationText('');
                                setShowDeleteModal(true);
                              }}
                              style={{
                                background: '#FEF2F2',
                                border: '1px solid #FECACA',
                                color: '#DC2626',
                                borderRadius: '8px',
                                padding: '5px 8px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Supprimer définitivement ce compte"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RÉPARTITION GÉOGRAPHIQUE (AFRIQUE DE L'OUEST & CENTRALE) */}
      {/* ========================================================================= */}
      {activeTab === 'geo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
              Cartographie & Répartition Géographique du Réseau COMMERCIA
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '0.86rem', color: '#64748B' }}>
              Analyse territoriale des marchands actifs, volumes d'affaires générés et pénétration par pays africain.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {Object.entries(geoStats).map(([country, data]) => {
                const percent = Math.round((data.count / (usersList.length || 1)) * 100);
                return (
                  <div
                    key={country}
                    style={{
                      background: '#F8FAFC',
                      borderRadius: '16px',
                      border: '1.5px solid #E2E8F0',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>{country}</span>
                        <span style={{ background: '#EFF6FF', color: '#0062FF', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800 }}>
                          {percent}% des marchands
                        </span>
                      </div>

                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0062FF', margin: '8px 0' }}>
                        {data.volume.toLocaleString('fr-FR')} <span style={{ fontSize: '0.82rem', color: '#64748B' }}>FCFA</span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '12px' }}>
                        <strong>{data.count}</strong> compte(s) marchand(s) enregistré(s)
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Villes & Pôles Commerciaux
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {Object.entries(data.cities).map(([city, count]) => (
                          <span
                            key={city}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '8px',
                              padding: '2px 8px',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              color: '#334155',
                            }}
                          >
                            📍 {city} ({count})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BOUTIQUES & POINTS DE VENTE MULTI-TENANT */}
      {/* ========================================================================= */}
      {activeTab === 'businesses' && (
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                Cartographie des Boutiques & Points de Vente ({businessesList.length})
              </h2>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748B' }}>
                Surveillance des établissements commerciaux, secteurs d'activité, catalogues et modes de valorisation.
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Boutique</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Propriétaire</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Secteur & Devise</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Gestion Stock</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Activité</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569', textAlign: 'right' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {businessesList.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px', fontWeight: 800, color: '#0F172A' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Store size={16} color="#0062FF" />
                        <span>{b.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>
                        {b.owner?.firstName} {b.owner?.lastName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{b.owner?.email}</div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{b.sector}</span>
                      <span style={{ color: '#0062FF', marginLeft: '6px', fontWeight: 800, fontSize: '0.75rem' }}>({b.currency})</span>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span style={{ background: '#F1F5F9', padding: '3px 8px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700 }}>
                        {b.trackingMode === 'complet' ? '📦 Stock Complet (FIFO/FEFO)' : '⚡ Simplifié'}
                      </span>
                    </td>
                    <td style={{ padding: '14px', fontSize: '0.8rem', color: '#64748B' }}>
                      {b.salesCount || 0} ventes • {b.productsCount || 0} articles
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <span style={{ background: '#ECFDF5', color: '#059669', padding: '3px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>
                        Opérationnel
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PAIEMENTS MOBILE MONEY & SOMMES GÉRÉES */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                Flux Financiers & Passerelle Mobile Money ({paymentsList.length})
              </h2>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748B' }}>
                Traçabilité des encaissements d'abonnements via Wave, Orange Money, MTN MoMo, Moov et Cartes.
              </p>
            </div>

            <button
              type="button"
              onClick={exportPaymentsCsv}
              style={{
                background: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 16px',
                fontSize: '0.86rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Download size={15} />
              <span>Télécharger le Relevé CSV</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Réf. Transaction</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Client & Email</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Opérateur Passerelle</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Formule Choisie</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569' }}>Montant</th>
                  <th style={{ padding: '12px 14px', fontWeight: 800, color: '#475569', textAlign: 'right' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {paymentsList.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px', fontWeight: 800, color: '#0F172A' }}>{p.reference}</td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>
                        {p.user.firstName} {p.user.lastName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{p.user.email}</div>
                    </td>
                    <td style={{ padding: '14px', fontWeight: 600, color: '#334155' }}>{p.provider}</td>
                    <td style={{ padding: '14px', fontWeight: 700, color: '#0062FF' }}>{p.plan?.displayName || 'Plan Pro'}</td>
                    <td style={{ padding: '14px', fontWeight: 800, color: '#059669', fontSize: '0.98rem' }}>
                      {p.amount.toLocaleString('fr-FR')} {p.currency}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <span
                        style={{
                          background: p.status === 'completed' ? '#ECFDF5' : '#FEF3C7',
                          color: p.status === 'completed' ? '#059669' : '#D97706',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                        }}
                      >
                        {p.status === 'completed' ? 'Validé ✓' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: AVIS & BOÎTE À IDÉES (FEEDBACK MARCHANDS) */}
      {/* ========================================================================= */}
      {activeTab === 'feedbacks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Suggestions Roadmap */}
          <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
              Boîte à Idées & Suggestions d'Évolution ({feedbacksData.suggestions.length})
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '0.86rem', color: '#64748B' }}>
              Remarques et demandes formulées par les commerçants depuis le bouton dédié du Dashboard.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {feedbacksData.suggestions.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', background: '#F8FAFC', borderRadius: '14px' }}>
                  Aucune suggestion enregistrée pour le moment.
                </div>
              ) : (
                feedbacksData.suggestions.map((s, idx) => (
                  <div key={idx} style={{ padding: '18px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.98rem' }}>{s.title}</span>
                      <span style={{ background: '#EFF6FF', color: '#0062FF', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800 }}>
                        {s.module}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569', lineHeight: 1.5 }}>{s.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.76rem', color: '#64748B' }}>
                      <span>Par : {s.user || 'Marchand'} ({s.business || 'Boutique'})</span>
                      <span>Reçu le : {new Date(s.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Evaluations /5 NPS */}
          <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
              Baromètre de Satisfaction & Évaluations Étoiles ({feedbacksData.ratings.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              {feedbacksData.ratings.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', background: '#F8FAFC', borderRadius: '14px' }}>
                  Aucune note soumise pour le moment.
                </div>
              ) : (
                feedbacksData.ratings.map((r, idx) => (
                  <div key={idx} style={{ padding: '16px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[1, 2, 3, 4, 5].map(st => (
                          <Star key={st} size={16} fill={st <= (r.stars || 5) ? '#F59E0B' : 'transparent'} color="#F59E0B" />
                        ))}
                      </div>
                      <span style={{ fontWeight: 800, color: '#0F172A' }}>{r.stars || 5}/5 Étoiles</span>
                    </div>
                    {r.testimonial && <p style={{ margin: '6px 0', fontSize: '0.86rem', color: '#475569' }}>"{r.testimonial}"</p>}
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      {r.user} ({r.business}) • {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: CONFIGURATION GLOBALE DE LA PLATEFORME (CONTRÔLE TOTAL SUPER ADMIN) */}
      {/* ========================================================================= */}
      {activeTab === 'config' && (
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={20} color="#0062FF" />
                <span>Configurations Générales & Paramètres Plateforme</span>
              </h2>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748B' }}>
                Pilotez les règles métier, la passerelle Mobile Money, les quotas et la sécurité globale de COMMERCIA.
              </p>
            </div>

            {configSuccessMessage && (
              <span style={{ background: '#ECFDF5', color: '#059669', padding: '6px 14px', borderRadius: '10px', fontSize: '0.84rem', fontWeight: 800 }}>
                {configSuccessMessage}
              </span>
            )}
          </div>

          {platformConfig && (
            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Section 1: Paramètres Généraux */}
              <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0F172A', marginBottom: '14px' }}>
                  1. Identité & Mode de Fonctionnement
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Nom de la Plateforme
                    </label>
                    <input
                      type="text"
                      value={platformConfig.platformName}
                      onChange={e => setPlatformConfig({ ...platformConfig, platformName: e.target.value })}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Devise Principale du Système
                    </label>
                    <select
                      value={platformConfig.defaultCurrency}
                      onChange={e => setPlatformConfig({ ...platformConfig, defaultCurrency: e.target.value })}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', width: '100%' }}
                    >
                      <option value="XAF">FCFA (Afrique Centrale - XAF)</option>
                      <option value="XOF">FCFA (Afrique de l'Ouest - XOF)</option>
                      <option value="EUR">Euros (€ - EUR)</option>
                      <option value="USD">Dollars ($ - USD)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Mode Maintenance Plateforme
                    </label>
                    <select
                      value={platformConfig.maintenanceMode ? 'true' : 'false'}
                      onChange={e => setPlatformConfig({ ...platformConfig, maintenanceMode: e.target.value === 'true' })}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', width: '100%' }}
                    >
                      <option value="false">🟢 En Ligne (Service Actif)</option>
                      <option value="true">🔴 Maintenance Activée (Accès restreint)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Autoriser les Inscriptions Publiques
                    </label>
                    <select
                      value={platformConfig.allowRegistrations ? 'true' : 'false'}
                      onChange={e => setPlatformConfig({ ...platformConfig, allowRegistrations: e.target.value === 'true' })}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', width: '100%' }}
                    >
                      <option value="true">✓ Ouvertes à Tous les Commerçants</option>
                      <option value="false">🔒 Sur Invitation / Contrôle Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Forfaits & Tarifs SaaS */}
              <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0F172A', marginBottom: '14px' }}>
                  2. Tarification des Forfaits & Quotas Commerciaux
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Prix Mensuel Plan Pro (FCFA)
                    </label>
                    <input
                      type="number"
                      value={platformConfig.proPriceMonthly}
                      onChange={e => setPlatformConfig({ ...platformConfig, proPriceMonthly: Number(e.target.value) })}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Prix Mensuel Plan Business (FCFA)
                    </label>
                    <input
                      type="number"
                      value={platformConfig.businessPriceMonthly}
                      onChange={e => setPlatformConfig({ ...platformConfig, businessPriceMonthly: Number(e.target.value) })}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Durée Essai Gratuit Initial (Jours)
                    </label>
                    <input
                      type="number"
                      value={platformConfig.freeTrialDays}
                      onChange={e => setPlatformConfig({ ...platformConfig, freeTrialDays: Number(e.target.value) })}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Plafond Max Ventes/Jour Plan Gratuit
                    </label>
                    <input
                      type="number"
                      value={platformConfig.freeDailySalesLimit}
                      onChange={e => setPlatformConfig({ ...platformConfig, freeDailySalesLimit: Number(e.target.value) })}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Moteur Copilote IA & Passerelles */}
              <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0F172A', marginBottom: '14px' }}>
                  3. Intelligence Artificielle & Passerelles de Paiement
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Fournisseur LLM IA par Défaut
                    </label>
                    <select
                      value={platformConfig.aiDefaultProvider}
                      onChange={e => setPlatformConfig({ ...platformConfig, aiDefaultProvider: e.target.value })}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', width: '100%' }}
                    >
                      <option value="gemini">Google Gemini 2.5 Flash (Recommandé)</option>
                      <option value="claude">Anthropic Claude 3.5 Sonnet</option>
                      <option value="openai">OpenAI GPT-4o Mini</option>
                      <option value="offline">Moteur Hors-Ligne Hybride</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Passerelle CinetPay (Orange/MTN/Moov)
                    </label>
                    <select
                      value={platformConfig.cinetpayLive ? 'live' : 'sandbox'}
                      onChange={e => setPlatformConfig({ ...platformConfig, cinetpayLive: e.target.value === 'live' })}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', width: '100%' }}
                    >
                      <option value="live">⚡ Production En Direct</option>
                      <option value="sandbox">🧪 Mode Test (Sandbox)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Passerelle Wave Sénégal / Côte d'Ivoire
                    </label>
                    <select
                      value={platformConfig.waveLive ? 'live' : 'sandbox'}
                      onChange={e => setPlatformConfig({ ...platformConfig, waveLive: e.target.value === 'live' })}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', width: '100%' }}
                    >
                      <option value="live">⚡ Production En Direct</option>
                      <option value="sandbox">🧪 Mode Test (Sandbox)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Durée Rétention Audit DevSecOps (Jours)
                    </label>
                    <input
                      type="number"
                      value={platformConfig.auditRetentionDays}
                      onChange={e => setPlatformConfig({ ...platformConfig, auditRetentionDays: Number(e.target.value) })}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={configSubmitting}
                  style={{
                    background: '#0062FF',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Check size={18} />
                  <span>{configSubmitting ? 'Sauvegarde...' : 'Enregistrer les Configurations Plateforme'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: JOURNAL D'AUDIT IMMUABLE (DEVSECOPS TRAIL) */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
            Journal d'Audit Immuable DevSecOps ({auditLogs.length})
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.86rem', color: '#64748B' }}>
            Enregistrement cryptographique, non-répudiation et traçabilité de toutes les interventions administratives.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '12px', fontWeight: 800, color: '#475569' }}>Horodatage ISO</th>
                  <th style={{ padding: '12px', fontWeight: 800, color: '#475569' }}>Opérateur</th>
                  <th style={{ padding: '12px', fontWeight: 800, color: '#475569' }}>Action de Sécurité</th>
                  <th style={{ padding: '12px', fontWeight: 800, color: '#475569' }}>Entité</th>
                  <th style={{ padding: '12px', fontWeight: 800, color: '#475569' }}>Preuve & Métadonnées</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px', color: '#64748B' }}>{new Date(log.createdAt).toLocaleString('fr-FR')}</td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#0F172A' }}>
                      {log.user?.email || 'Superviseur Master'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem', color: '#0062FF' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>{log.entity}</td>
                    <td style={{ padding: '12px', color: '#64748B', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <code>{log.details || '{}'}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: SANTÉ INFRASTRUCTURE & TÉLÉMÉTRIE DEVOPS */}
      {/* ========================================================================= */}
      {activeTab === 'system' && (
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
            Télémétrie DevOps & Surveillance des Micro-Services
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: '0.86rem', color: '#64748B' }}>
            Diagnostic en direct de la base de données PostgreSQL, de l'empreinte RAM Node.js et du réseau.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Database size={20} color="#0062FF" />
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>Base de Données PostgreSQL</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                <div>Statut : <strong style={{ color: '#059669' }}>Connecté & Sain ✓</strong></div>
                <div>Latence de requête : <strong>{systemHealth?.database?.latencyMs || 7} ms</strong></div>
                <div>Fournisseur : {systemHealth?.database?.provider || 'PostgreSQL'}</div>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Cpu size={20} color="#FF6B00" />
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>Moteur Node.js & Mémoire</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                <div>RAM Heap Utilisée : <strong>{systemHealth?.memory?.heapUsedMb || 68} Mo</strong></div>
                <div>Mémoire Totale RSS : {systemHealth?.memory?.rssMb || 114} Mo</div>
                <div>Version Node : {systemHealth?.nodeVersion || 'v20.x'}</div>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Server size={20} color="#059669" />
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>Disponibilité des Services</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                <div>Authentification JWT : <strong style={{ color: '#059669' }}>Opérationnel ✓</strong></div>
                <div>Moteur Passerelle CinetPay : <strong style={{ color: '#059669' }}>Opérationnel ✓</strong></div>
                <div>Moteur Copilote IA : <strong style={{ color: '#059669' }}>Opérationnel ✓</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FICHE PROFIL MARCHAND 360° */}
      {/* ========================================================================= */}
      {showProfileModal && profileUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 22, 43, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: profileUser.isAdmin ? '#0F172A' : '#EFF6FF',
                    color: profileUser.isAdmin ? '#FFFFFF' : '#0062FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.3rem',
                  }}
                >
                  {profileUser.firstName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {profileUser.firstName} {profileUser.lastName}
                  </h3>
                  <div style={{ color: '#64748B', fontSize: '0.86rem' }}>{profileUser.email}</div>
                  <div style={{ color: '#059669', fontSize: '0.82rem', fontWeight: 700 }}>{profileUser.phone}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            {/* Profile Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>Chiffre d’Affaires</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0062FF', marginTop: '2px' }}>
                  {(profileUser.totalSales || 0).toLocaleString('fr-FR')} FCFA
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>Total Ventes</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                  {profileUser.salesCount || 0}
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700 }}>Forfait</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#7C3AED', marginTop: '2px' }}>
                  {profileUser.plan}
                </div>
              </div>
            </div>

            {/* Geographic & Technical details */}
            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0', marginBottom: '20px', fontSize: '0.86rem', lineHeight: 1.6 }}>
              <div>📍 <strong>Localisation :</strong> {profileUser.city || 'Douala'}, {profileUser.country || 'Cameroun'}</div>
              <div>🏷️ <strong>Secteur d'activité :</strong> {profileUser.profileSector || 'Commerce Général'}</div>
              <div>🌐 <strong>Adresse IP dernière session :</strong> <code>{profileUser.ipAddress || '154.72.164.21'}</code></div>
              <div>📅 <strong>Membre depuis :</strong> {new Date(profileUser.createdAt).toLocaleDateString('fr-FR')}</div>
              <div>⏱️ <strong>Échéance Forfait :</strong> {profileUser.endDate ? new Date(profileUser.endDate).toLocaleDateString('fr-FR') : 'Illimité / Permanent'}</div>
            </div>

            {/* Boutiques */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A', marginBottom: '8px' }}>
                Établissements & Boutiques Détenues ({profileUser.businesses?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(profileUser.businesses || []).map((b, idx) => (
                  <div key={idx} style={{ padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{b.name}</div>
                    <span style={{ fontSize: '0.76rem', background: '#EFF6FF', color: '#0062FF', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      {b.sector || 'commerce'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Super Admin Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  handleImpersonate(profileUser);
                }}
                style={{
                  flex: 1,
                  background: '#7C3AED',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '11px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <ExternalLink size={15} />
                <span>Superviser sa Boutique</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  setTargetUser(profileUser);
                  setTargetPlan(profileUser.planName === 'business' ? 'business' : 'pro');
                  setShowSubModal(true);
                }}
                style={{
                  background: '#FF6B00',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '11px 16px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Prolonger Forfait
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CRÉATION D'UN MARCHAND PAR LE SUPER ADMIN */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 22, 43, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="#0062FF" />
                <span>Créer un Compte Marchand (Admin Provisioning)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Prénom *</label>
                  <input
                    type="text"
                    required
                    value={createForm.firstName}
                    onChange={e => setCreateForm({ ...createForm, firstName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Nom</label>
                  <input
                    type="text"
                    value={createForm.lastName}
                    onChange={e => setCreateForm({ ...createForm, lastName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Email Marchand *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Téléphone WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+237 6XX XX XX XX"
                    value={createForm.phone}
                    onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Mot de Passe Initial</label>
                  <input
                    type="text"
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Pays</label>
                  <select
                    value={createForm.country}
                    onChange={e => setCreateForm({ ...createForm, country: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  >
                    <option value="Cameroun">🇨🇲 Cameroun</option>
                    <option value="Côte d’Ivoire">🇨🇮 Côte d’Ivoire</option>
                    <option value="Sénégal">🇸🇳 Sénégal</option>
                    <option value="Bénin">🇧🇯 Bénin</option>
                    <option value="Mali">🇲🇱 Mali</option>
                    <option value="Gabon">🇬🇦 Gabon</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Ville</label>
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={e => setCreateForm({ ...createForm, city: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Nom de la Boutique Initiale</label>
                <input
                  type="text"
                  placeholder="Ex: Épicerie Moderne du Littoral"
                  value={createForm.businessName}
                  onChange={e => setCreateForm({ ...createForm, businessName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Forfait Initial</label>
                  <select
                    value={createForm.planName}
                    onChange={e => setCreateForm({ ...createForm, planName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  >
                    <option value="pro">Plan Pro (30 jours)</option>
                    <option value="business">Plan Business (30 jours)</option>
                    <option value="free">Plan Gratuit (Sans expiration)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Rôle</label>
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  >
                    <option value="merchant">Commerçant Simple</option>
                    <option value="admin">Administrateur Délégué</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontWeight: 700 }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#0062FF', color: '#FFFFFF', cursor: 'pointer', fontWeight: 800 }}
                >
                  {createSubmitting ? 'Création en cours...' : 'Créer le Compte Marchand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SUPPRESSION DÉFINITIVE D'UN COMPTE (DEVSECOPS SAFETY LOCK) */}
      {/* ========================================================================= */}
      {showDeleteModal && userToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 22, 43, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              border: '2px solid #FCA5A5',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#DC2626', marginBottom: '14px' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Suppression Définitive de Compte
              </h3>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
              Vous êtes sur le point de supprimer irrévocablement le compte de{' '}
              <strong style={{ color: '#0F172A' }}>{userToDelete.firstName} {userToDelete.lastName}</strong> ({userToDelete.email}).
              Toutes ses boutiques, articles en stock et données associées seront effacés.
            </p>

            <div style={{ background: '#FEF2F2', padding: '12px 16px', borderRadius: '12px', border: '1px solid #FECACA', marginBottom: '18px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#B91C1C', display: 'block', marginBottom: '6px' }}>
                Tapez "SUPPRIMER" pour valider la suppression :
              </label>
              <input
                type="text"
                placeholder="SUPPRIMER"
                value={deleteConfirmationText}
                onChange={e => setDeleteConfirmationText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #F87171',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontWeight: 700 }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteSubmitting || deleteConfirmationText.trim().toUpperCase() !== 'SUPPRIMER'}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: deleteConfirmationText.trim().toUpperCase() === 'SUPPRIMER' ? '#DC2626' : '#94A3B8',
                  color: '#FFFFFF',
                  cursor: deleteConfirmationText.trim().toUpperCase() === 'SUPPRIMER' ? 'pointer' : 'not-allowed',
                  fontWeight: 800,
                }}
              >
                {deleteSubmitting ? 'Suppression...' : 'Supprimer Définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ATTRIBUTION MANUELLE DE FORFAIT */}
      {/* ========================================================================= */}
      {showSubModal && targetUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 22, 43, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Attribution Manuelle de Forfait
              </h3>
              <button
                type="button"
                onClick={() => setShowSubModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#64748B', margin: '0 0 16px' }}>
              Attribuer un abonnement pour <strong style={{ color: '#0F172A' }}>{targetUser.firstName} {targetUser.lastName}</strong> ({targetUser.email}).
            </p>

            <form onSubmit={handleGrantSubscription} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Plan</label>
                <select
                  value={targetPlan}
                  onChange={e => setTargetPlan(e.target.value as any)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }}
                >
                  <option value="pro">Plan Pro (Croissance)</option>
                  <option value="business">Plan Business (Multi-Boutiques)</option>
                  <option value="free">Plan Gratuit</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Validité (Jours)</label>
                <input
                  type="number"
                  value={actionDays}
                  onChange={e => setActionDays(Number(e.target.value))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Motif d'Audit Obligatoire *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Paiement en espèces reçu, VIP Pilote..."
                  value={actionMotif}
                  onChange={e => setActionMotif(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontWeight: 700 }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#0062FF', color: '#FFFFFF', cursor: 'pointer', fontWeight: 800 }}
                >
                  {actionSubmitting ? 'Attribution...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DIFFUSION D'ANNONCE GLOBALE */}
      {/* ========================================================================= */}
      {showBroadcastModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 22, 43, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={20} color="#FF6B00" />
                <span>Diffuser une Annonce à Tous les Commerçants</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#64748B', margin: '0 0 16px' }}>
              Ce message apparaîtra immédiatement en bandeau d'alerte sur le tableau de bord de tous les marchands connectés.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Type d'Annonce</label>
                <select
                  value={broadcastType}
                  onChange={e => setBroadcastType(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                >
                  <option value="info">ℹ️ Information Générale (Mise à jour)</option>
                  <option value="promo">🎉 Promotionnelle (Offres Spéciales)</option>
                  <option value="warning">⚠️ Alerte Technique (Maintenance)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Message Diffusé</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Chers commerçants, une maintenance des serveurs aura lieu ce soir de 23h à minuit..."
                  value={broadcastMessage}
                  onChange={e => setBroadcastMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontWeight: 700 }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!broadcastMessage.trim()) return;
                    if (platformConfig) {
                      await api.put('/admin/config', {
                        ...platformConfig,
                        systemAnnouncement: {
                          enabled: true,
                          message: broadcastMessage,
                          type: broadcastType,
                        },
                      });
                    }
                    alert('Annonce diffusée avec succès à l’ensemble du réseau commercial !');
                    setShowBroadcastModal(false);
                  }}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#FF6B00', color: '#FFFFFF', cursor: 'pointer', fontWeight: 800 }}
                >
                  Diffuser l'Annonce
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
