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
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  debtCount?: number;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ debtCount = 0, lowStockCount = 0 }) => {
  const { user, activeBusinessId, logout } = useAuthStore();
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [callbackSent, setCallbackSent] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState(user?.phone || '');

  const planName = user?.subscription?.planName || 'free';
  const subStatus = user?.subscription?.status || 'free';
  const isPro = Boolean(user?.isAdmin || (user?.subscription?.isPro && subStatus === 'active'));

  const planBadge = user?.isAdmin
    ? 'ADMIN'
    : isPro
    ? (planName === 'business' ? 'BUSINESS' : 'PRO ACTIF')
    : subStatus === 'expired'
    ? 'EXPIRÉ'
    : 'VERSION GRATUITE';

  return (
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
        <div style={{ minWidth: 0 }}>
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
                  ? 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)'
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
            {activeBusiness?.name || (isPro ? 'Compte Pro actif' : 'Version Gratuite')}
          </div>
        </div>
      </div>

      <nav className="sidebar-menu">
        <div className="menu-category">Gestion Quotidienne</div>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Tableau de bord</span>
        </NavLink>

        <NavLink
          to="/sales"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <ShoppingCart size={18} />
          <span>Ventes comptoir</span>
        </NavLink>

        <NavLink
          to="/expenses"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <TrendingDown size={18} />
          <span>Dépenses</span>
        </NavLink>

        <NavLink
          to="/cash"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Wallet size={18} />
          <span>Caisse Journalière</span>
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <BarChart3 size={18} />
          <span>Statistiques & Rapport</span>
        </NavLink>

        {/* ========================================================================= */}
        {/* FONCTIONNALITÉS STRICTEMENT RÉSERVÉES AUX COMPTES PRO ACTIFS */}
        {/* Conformément à la consigne : Masquées pour les comptes gratuits */}
        {/* ========================================================================= */}
        {isPro ? (
          <>
            <div className="menu-category">Modules Avancés PRO</div>
            <NavLink
              to="/customers"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Clients & Dettes</span>
              {debtCount > 0 && <span className="badge badge-danger">{debtCount}</span>}
            </NavLink>

            <NavLink
              to="/products"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Package size={18} />
              <span>Stock & Alertes</span>
              {lowStockCount > 0 && <span className="badge badge-warning">{lowStockCount}</span>}
            </NavLink>

            <NavLink
              to="/deliveries"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Truck size={18} />
              <span>Livraisons & Colis</span>
              <span style={{ fontSize: '0.62rem', background: '#0062FF', color: 'white', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>PRO</span>
            </NavLink>

            <NavLink
              to="/copilot"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Bot size={18} />
              <span>Copilote IA COMMERCIA</span>
            </NavLink>

            <NavLink
              to="/growth"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <TrendingUp size={18} />
              <span>Croissance & CAC</span>
              <span style={{ fontSize: '0.62rem', background: '#FF6B00', color: 'white', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>PRO</span>
            </NavLink>

            <NavLink
              to="/treasury"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Landmark size={18} />
              <span>Trésorerie & Scénarios</span>
              <span style={{ fontSize: '0.62rem', background: '#10B981', color: 'white', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>PRO</span>
            </NavLink>

            <div className="menu-category">Abonnement Pro</div>
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
                background: 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(255, 107, 0, 0.35)',
                marginTop: '4px',
              }}
            >
              <Sparkles size={14} />
              <span>Passer à Pro</span>
              <ArrowRight size={14} />
            </NavLink>
          </div>
        )}

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
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <ShieldAlert size={18} />
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
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: '470px',
              width: '100%',
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px 26px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
              border: 'none',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#FFF1F2',
                    border: '1px solid #FFE4E6',
                    color: '#E11D48',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <LogOut size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                    Déconnexion Sécurisée
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                    <span>Données synchronisées avec le Cloud</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
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
                <X size={16} />
              </button>
            </div>

            {/* Shop context banner */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: '#EFF6FF',
                    border: '1px solid #DBEAFE',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Store size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>
                    {activeBusiness?.name || 'Votre Boutique'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Commerçant'} • Caisse à jour
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#059669',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                <ShieldCheck size={13} />
                <span>Sauvegardé</span>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Vous pouvez vous déconnecter en toute tranquillité. Toutes vos ventes, clôtures et données restent protégées et seront retrouvées à votre prochaine connexion.
            </p>

            {/* Support Concierge Section */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Headphones size={16} color="#0062FF" />
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0F172A' }}>
                    Assistance Commerçant Dédiée
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#0062FF',
                    background: '#EFF6FF',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  7j / 7
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                Une question ou besoin d'un coup de main sur votre gestion ? Notre équipe vous répond immédiatement.
              </p>

              {callbackSent ? (
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #86EFAC',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#166534',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0 }} />
                  <span>Demande transmise ! Un conseiller COMMERCIA va vous appeler sur votre numéro dans quelques instants.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a
                      href="tel:+237690000000"
                      style={{
                        flex: 1,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        background: '#F8FAFC',
                        color: '#0F172A',
                        border: '1px solid #CBD5E1',
                        borderRadius: '10px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <PhoneCall size={14} color="#0062FF" />
                      <span>Appel Direct</span>
                    </a>
                    <a
                      href={`https://wa.me/237690000000?text=${encodeURIComponent("Bonjour assistance COMMERCIA, je souhaite échanger avec un conseiller pour ma boutique " + (activeBusiness?.name || ''))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        background: '#F0FDF4',
                        color: '#15803D',
                        border: '1px solid #BBF7D0',
                        borderRadius: '10px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <MessageCircle size={14} color="#16A34A" />
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
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#0062FF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Sparkles size={13} color="#0062FF" />
                    <span>Être rappelé gratuitement par un conseiller</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '12px',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  color: '#334155',
                  fontSize: '0.88rem',
                  fontWeight: 600,
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
                  flex: 1,
                  height: '42px',
                  borderRadius: '12px',
                  background: '#DC2626',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                  transition: 'background 0.15s ease',
                }}
              >
                <LogOut size={15} />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
