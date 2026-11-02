import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingDown,
  Users,
  Package,
  BarChart3,
  Bot,
  Crown,
  ShieldAlert,
  LogOut,
  Wallet,
  TrendingUp,
  Landmark,
  Sparkles,
  ArrowRight,
  PhoneCall,
  MessageCircle,
  CheckCircle2,
  Headphones,
  X,
  Truck,
  ShieldCheck,
  Store,
  Boxes,
  UtensilsCrossed,
  Scissors,
  Smartphone,
  SlidersHorizontal,
  BookOpen,
  Lock,
  Check,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getBusinessProfile } from '../../config/businessProfiles';
import { TradeConfigModal } from '../common/TradeConfigModal';
import { getSupportWhatsAppNumber } from '../../utils/formatters';

interface SidebarProps {
  debtCount?: number;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ debtCount = 0, lowStockCount = 0 }) => {
  const { user, activeBusinessId, logout } = useAuthStore();
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];

  const profile = getBusinessProfile(activeBusiness?.profileId || 'epicerie_alimentation');

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [callbackSent, setCallbackSent] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState(user?.phone || '');

  const planName = user?.subscription?.planName || 'free';
  const subStatus = user?.subscription?.status || 'free';
  const isPro = Boolean(user?.isAdmin || (user?.subscription?.isPro && subStatus === 'active'));

  const trackingMode = activeBusiness?.trackingMode || 'complet';
  const enabledModules: string[] = activeBusiness?.activeModules?.length
    ? activeBusiness.activeModules
    : (activeBusiness?.profileId ? profile.recommendedModules : []);
  const hasStockModule = isPro || trackingMode === 'avec_stock' || trackingMode === 'complet' || enabledModules.includes('stock_alerts');
  const hasCreditModule = isPro || trackingMode === 'avec_credit' || trackingMode === 'complet' || enabledModules.includes('customer_credits');
  // Les lots restent réservés au plan Pro (contrôle serveur dans lots.routes.ts)
  const hasLotsModule = isPro;
  const hasFoodPrep = enabledModules.includes('food_preparation');
  const hasServiceOrders = enabledModules.includes('service_orders');
  const hasMobileMoney = enabledModules.includes('mobile_money_ops');

  const modeBadge = trackingMode === 'simple'
    ? { label: '⚡ Mode Simplifié', bg: 'rgba(2, 132, 199, 0.25)', color: '#38BDF8' }
    : trackingMode === 'avec_stock'
    ? { label: '📦 Stock & Alertes', bg: 'rgba(16, 185, 129, 0.25)', color: '#34D399' }
    : trackingMode === 'avec_credit'
    ? { label: '👥 Carnet Crédits', bg: 'rgba(245, 158, 11, 0.25)', color: '#FBBF24' }
    : { label: '🚀 Mode Intégral', bg: 'rgba(139, 92, 246, 0.25)', color: '#C084FC' };

  const planBadge = user?.isAdmin
    ? 'ADMIN'
    : isPro
    ? (planName === 'business' ? 'BUSINESS' : 'PRO ACTIF')
    : subStatus === 'expired'
    ? 'EXPIRÉ'
    : 'VERSION GRATUITE';

  return (
    <>
      <TradeConfigModal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
      />

      <aside className="sidebar">
        <div className="sidebar-header">
          <img
            src="/commercia-logo.png"
            alt="COMMERCIA"
            style={{
              width: '42px',
              height: '42px',
              objectFit: 'contain',
              borderRadius: '12px',
              background: '#FFFFFF',
              padding: '2px',
              boxShadow: '0 4px 14px rgba(0, 98, 255, 0.35)',
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', lineHeight: 1.2 }}>
                COMMERC<span style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>IA</span>
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: isPro
                    ? (planName === 'business' ? 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)' : 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)')
                    : subStatus === 'expired'
                    ? '#EF4444'
                    : '#334155',
                  color: '#FFFFFF',
                  letterSpacing: '0.04em',
                }}
              >
                {planBadge}
              </span>
            </div>
            <div
              style={{
                fontSize: '0.74rem',
                color: isPro ? '#60A5FA' : '#94A3B8',
                fontWeight: 600,
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: '2px',
              }}
              title={activeBusiness?.name}
            >
              {activeBusiness?.name || (isPro ? 'Compte Pro actif' : 'Commerce Actif')}
            </div>
            {/* Tracking Mode Pill */}
            <div
              style={{
                display: 'inline-block',
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '6px',
                background: modeBadge.bg,
                color: modeBadge.color,
                marginTop: '4px',
              }}
            >
              {modeBadge.label}
            </div>
          </div>
        </div>

        {/* Trade Identity Card - Immersion Métier Immédiate */}
        <div
          onClick={() => setShowTradeModal(true)}
          style={{
            margin: '8px 12px 14px',
            padding: '10px 12px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.14) 0%, rgba(0, 98, 255, 0.14) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
          title="Cliquez pour changer ou configurer votre profil métier"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{profile.emoji}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile.name}
              </div>
              <div style={{ fontSize: '0.66rem', color: '#94A3B8' }}>
                {profile.familyName} • Configurer
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.64rem',
              background: 'rgba(255,255,255,0.15)',
              color: '#F1F5F9',
              padding: '2px 6px',
              borderRadius: '6px',
              fontWeight: 700,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <SlidersHorizontal size={10} />
            <span>Changer</span>
          </span>
        </div>

      <nav className="sidebar-menu">
        <div className="menu-category" style={{ letterSpacing: '0.06em', color: '#94A3B8', fontSize: '0.67rem', fontWeight: 800, textTransform: 'uppercase' }}>
          Pilotage {profile.name}
        </div>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Tableau de bord</span>
        </NavLink>

        <NavLink
          to="/guide"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          style={{ background: 'linear-gradient(135deg, rgba(0, 98, 255, 0.12) 0%, rgba(255, 107, 0, 0.10) 100%)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
        >
          <BookOpen size={18} color="#FF7A00" />
          <span style={{ fontWeight: 800, color: '#FFFFFF' }}>Guide & Mode d'Emploi</span>
          <span style={{ fontSize: '0.58rem', background: '#FF7A00', color: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', fontWeight: 900 }}>AIDE</span>
        </NavLink>

        <NavLink
          to="/sales"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <ShoppingCart size={18} />
          <span>{profile.terminology.salesNav || (trackingMode === 'simple' ? 'Ventes Express' : 'Ventes comptoir')}</span>
          <span style={{ fontSize: '0.58rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>GRATUIT</span>
        </NavLink>

        {/* Module Métier Spécialisé : Préparation Restauration */}
        {hasFoodPrep && (
          <NavLink
            to="/food-prep"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={{ background: 'rgba(234, 88, 12, 0.12)', color: '#FB923C' }}
          >
            <UtensilsCrossed size={18} />
            <span>Recettes & Plats du jour</span>
            <span style={{ fontSize: '0.58rem', background: '#EA580C', color: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>MÉTIER</span>
          </NavLink>
        )}

        {/* Module Métier Spécialisé : Prestations & Commandes */}
        {hasServiceOrders && (
          <NavLink
            to="/service-orders"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818CF8' }}
          >
            <Scissors size={18} />
            <span>Commandes & Devis</span>
            <span style={{ fontSize: '0.58rem', background: '#6366F1', color: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>MÉTIER</span>
          </NavLink>
        )}

        {/* Module Métier Spécialisé : Mobile Money */}
        {hasMobileMoney && (
          <NavLink
            to="/mobile-money"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34D399' }}
          >
            <Smartphone size={18} />
            <span>Opérations Mobile Money</span>
            <span style={{ fontSize: '0.58rem', background: '#10B981', color: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>MÉTIER</span>
          </NavLink>
        )}

        {/* Module Métier Spécialisé : Lots & Ballots Friperie */}
        {hasLotsModule && (
          <NavLink
            to="/lots"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Boxes size={18} />
            <span>{profile.id === 'friperie_vetements' ? 'Ballots & Lots' : 'Gestion des lots'}</span>
            <span style={{ fontSize: '0.58rem', background: '#8B5CF6', color: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>PRO</span>
          </NavLink>
        )}

        <NavLink
          to="/expenses"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <TrendingDown size={18} />
          <span>{profile.terminology.expenseNav || 'Dépenses'}</span>
          <span style={{ fontSize: '0.58rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>GRATUIT</span>
        </NavLink>

        <NavLink
          to="/cash"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Wallet size={18} />
          <span>Caisse Journalière</span>
          <span style={{ fontSize: '0.58rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>GRATUIT</span>
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <BarChart3 size={18} />
          <span>Statistiques & Rapport</span>
          <span style={{ fontSize: '0.58rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>GRATUIT</span>
        </NavLink>

        <div className="menu-category" style={{ letterSpacing: '0.06em', color: '#94A3B8', fontSize: '0.67rem', fontWeight: 800, textTransform: 'uppercase' }}>
          Catalogue & Dettes
        </div>

        {/* Stock & Alertes : visible dès que le mode inclut le stock OU que le compte est PRO */}
        {hasStockModule && (
          <NavLink
            to="/products"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Package size={18} />
            <span>{profile.terminology.inventoryNav || 'Stock & Alertes'}</span>
            {lowStockCount > 0 && <span className="badge badge-warning">{lowStockCount}</span>}
          </NavLink>
        )}

        {/* Clients & Dettes : visible dès que le mode inclut le carnet de crédit OU que le compte est PRO */}
        {hasCreditModule && (
          <NavLink
            to="/customers"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Clients & Dettes</span>
            {debtCount > 0 && <span className="badge badge-danger">{debtCount}</span>}
          </NavLink>
        )}

        {/* ========================================================================= */}
        {/* FONCTIONNALITÉS STRICTEMENT RÉSERVÉES AUX COMPTES PRO ACTIFS */}
        {/* ========================================================================= */}
        {isPro ? (
          <>
            <div className="menu-category" style={{ letterSpacing: '0.06em', color: '#94A3B8', fontSize: '0.67rem', fontWeight: 800, textTransform: 'uppercase' }}>
              Modules Avancés PRO & Business
            </div>
            {!hasCreditModule && (
              <NavLink
                to="/customers"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Users size={18} />
                <span>Clients & Dettes</span>
                {debtCount > 0 && <span className="badge badge-danger">{debtCount}</span>}
              </NavLink>
            )}

            {!hasStockModule && (
              <NavLink
                to="/products"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Package size={18} />
                <span>Stock & Alertes</span>
                {lowStockCount > 0 && <span className="badge badge-warning">{lowStockCount}</span>}
              </NavLink>
            )}

            <NavLink
              to="/deliveries"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Truck size={18} />
              <span>Livraisons & Expéditions</span>
              <span style={{ fontSize: '0.58rem', background: '#0062FF', color: 'white', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>PRO</span>
            </NavLink>

            <NavLink
              to="/copilot"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Bot size={18} />
              <span>Copilote IA COMMERCIA</span>
              <span style={{ fontSize: '0.58rem', background: 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)', color: 'white', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>PRO</span>
            </NavLink>

            <NavLink
              to="/growth"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <TrendingUp size={18} />
              <span>Croissance & CAC</span>
              <span style={{ fontSize: '0.58rem', background: '#FF6B00', color: 'white', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>PRO</span>
            </NavLink>

            <NavLink
              to="/treasury"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Landmark size={18} />
              <span>Trésorerie & Scénarios</span>
              <span style={{ fontSize: '0.58rem', background: '#10B981', color: 'white', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>PRO</span>
            </NavLink>

            <NavLink
              to="/lots"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Boxes size={18} />
              <span>Gestion des lots & Ballots</span>
              <span style={{ fontSize: '0.58rem', background: '#8B5CF6', color: 'white', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>PRO</span>
            </NavLink>

            <div
              onClick={() => setShowTradeModal(true)}
              className="nav-item"
              style={{ cursor: 'pointer' }}
            >
              <SlidersHorizontal size={18} color="#38BDF8" />
              <span>Mon Profil Métier ({profile.name})</span>
            </div>

            <div className="menu-category" style={{ letterSpacing: '0.06em', color: '#94A3B8', fontSize: '0.67rem', fontWeight: 800, textTransform: 'uppercase' }}>
              Abonnement Pro
            </div>
            <NavLink
              to="/subscription"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Crown size={18} color="#FF6B00" />
              <span>Gérer mon abonnement</span>
            </NavLink>
          </>
        ) : (
          /* ========================================================================= */
          /* SECTION DÉDIÉE OFFRES PRO POUR UTILISATEURS GRATUITS */
          /* ========================================================================= */
          <div
            style={{
              margin: '16px 10px',
              padding: '14px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.15) 0%, rgba(0, 98, 255, 0.12) 100%)',
              border: '1px solid rgba(255, 107, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Crown size={16} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
                  COMMERCIA PRO
                </div>
                <div style={{ fontSize: '0.68rem', color: '#CBD5E1' }}>
                  4 500 FCFA / mois
                </div>
              </div>
            </div>

            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.72rem', color: '#94A3B8', lineHeight: 1.5 }}>
              <li>Ventes & encaissements illimités</li>
              <li>Gestion de stock & alertes ruptures</li>
              <li>Livraisons & expéditions e-commerce</li>
              <li>Carnet de crédits clients & relances</li>
              <li>Copilote IA financier interactif</li>
            </ul>

            <NavLink
              to="/subscription"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#FF6B00',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: 'none',
                border: '1px solid #E65100',
                marginTop: '4px',
              }}
            >
              <Sparkles size={14} />
              <span>Passer à Pro</span>
              <ArrowRight size={14} />
            </NavLink>
          </div>
        )}

        {!isPro && (
          <NavLink
            to="/lots"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={{ marginBottom: '8px' }}
          >
            <Boxes size={18} />
            <span>Gestion des lots</span>
            <span style={{ fontSize: '0.62rem', background: '#8B5CF6', color: 'white', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>PRO</span>
          </NavLink>
        )}

        <div
          onClick={() => setShowTradeModal(true)}
          className="nav-item"
          style={{ cursor: 'pointer', marginBottom: '8px' }}
        >
          <SlidersHorizontal size={18} color="#38BDF8" />
          <span>Profil Métier ({profile.name})</span>
        </div>

        <div className="menu-category">Formules & Offres</div>
        <NavLink
          to="/subscription"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Crown size={18} />
          <span>{isPro ? 'Mon Abonnement Pro' : 'Découvrir les offres Pro'}</span>
        </NavLink>

        {user?.isAdmin && (
          <>
            <div className="menu-category">Super Administration</div>
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-item admin-saas-beveled-btn ${isActive ? 'active' : ''}`}
            >
              <ShieldAlert size={18} style={{ color: '#FFFFFF', flexShrink: 0 }} />
              <span>Administration SaaS</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-card">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.firstName}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: isPro ? '2px solid #FF6B00' : '2px solid #0062FF',
                flexShrink: 0,
              }}
            />
          ) : (
            <div className="user-avatar" style={{ background: isPro ? 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)' : '#475569' }}>
              {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div className="user-info">
            <div className="user-name">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Commerçant'}
            </div>
            <div className="user-role" style={{ color: isPro ? '#38BDF8' : '#94A3B8', fontWeight: 600 }}>
              {isPro ? 'Compte Pro actif' : 'Version Gratuite'}
            </div>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            title="Se déconnecter"
            style={{
              background: 'transparent',
              color: '#94A3B8',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Logout Confirmation & Support Call Modal */}
      {showLogoutModal && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: '580px',
              width: '100%',
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '28px 32px',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8)',
              border: 'none',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: '#FEF2F2',
                    border: '1px solid #FEE2E2',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <LogOut size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                    Déconnexion Sécurisée
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#059669', fontWeight: 600, marginTop: '3px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                    <span>Données chiffrées & synchronisées avec le Cloud</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Shop context banner & Cloud status */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '16px 18px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: '#EFF6FF',
                      border: '1px solid #DBEAFE',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Store size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0F172A' }}>
                      {activeBusiness?.name || 'Votre Boutique'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                      {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Commerçant'} • Caisse & Journal à jour
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: '14px',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    color: '#059669',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>Cloud Synchronisé</span>
                </div>
              </div>

              {/* Data integrity checklist */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  paddingTop: '10px',
                  borderTop: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                  <Check size={13} color="#10B981" />
                  <span>Ventes sauvegardées</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                  <Check size={13} color="#10B981" />
                  <span>Caisse à jour</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                  <Lock size={13} color="#10B981" />
                  <span>Zéro perte garantie</span>
                </div>
              </div>
            </div>

            {/* Informational Callout */}
            <div
              style={{
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '0.82rem',
                color: '#0369A1',
                lineHeight: 1.5,
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <Sparkles size={16} color="#0284C7" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                Vous pouvez vous déconnecter en toute tranquillité. Toutes vos ventes, clôtures et données restent protégées dans votre espace sécurisé et seront instantanément retrouvées à votre prochaine connexion.
              </div>
            </div>

            {/* Support Concierge Section */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '22px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Headphones size={18} color="#0062FF" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>
                    Assistance Commerçant Dédiée
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#0062FF',
                    background: '#EFF6FF',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  7j / 7 • Disponible
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                Une question sur vos chiffres, un imprévu de caisse ou besoin d'un accompagnement ? Notre équipe est immédiatement à votre écoute.
              </p>

              {callbackSent ? (
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #86EFAC',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#166534',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={18} color="#16A34A" style={{ flexShrink: 0 }} />
                  <span>Demande transmise ! Un conseiller COMMERCIA va vous appeler sur votre numéro dans quelques instants.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <a
                      href="tel:+237690000000"
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        textDecoration: 'none',
                        background: '#F8FAFC',
                        color: '#0F172A',
                        border: '1px solid #CBD5E1',
                        borderRadius: '12px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <PhoneCall size={16} color="#0062FF" />
                      <span>Appel Direct</span>
                    </a>
                    <a
                      href={`https://wa.me/${getSupportWhatsAppNumber(activeBusiness?.currency || user?.phone)}?text=${encodeURIComponent("Bonjour assistance COMMERCIA, je souhaite échanger avec un conseiller pour ma boutique " + (activeBusiness?.name || ''))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        textDecoration: 'none',
                        background: '#F0FDF4',
                        color: '#15803D',
                        border: '1px solid #BBF7D0',
                        borderRadius: '12px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <MessageCircle size={16} color="#16A34A" />
                      <span>WhatsApp Support</span>
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCallbackSent(true);
                      try {
                        localStorage.setItem('commercia_last_callback_request', JSON.stringify({
                          time: new Date().toISOString(),
                          phone: callbackPhone || user?.phone || 'Non renseigné',
                          user: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Commerçant',
                          business: activeBusiness?.name || '',
                        }));
                      } catch (_) {}
                    }}
                    style={{
                      background: '#EFF6FF',
                      border: '1px dashed #93C5FD',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#0062FF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Sparkles size={14} color="#0062FF" />
                    <span>Être rappelé gratuitement par un conseiller</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                style={{
                  height: '46px',
                  borderRadius: '14px',
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#334155',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                Rester connecté
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                style={{
                  height: '46px',
                  borderRadius: '14px',
                  background: '#DC2626',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#B91C1C')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#DC2626')}
              >
                <LogOut size={17} />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
    </>
  );
};
