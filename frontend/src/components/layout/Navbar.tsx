import React, { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Minus, Store, BookOpen, Users, ChevronDown, Check, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useModals } from '../../context/ModalContext';
import { api } from '../../services/api';
import { NotificationItem } from '../../types';
import { TeamModal } from '../modals/TeamModal';
import { BranchModal } from '../modals/BranchModal';

interface NavbarProps {
  onOpenSaleModal?: () => void;
  onOpenExpenseModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSaleModal, onOpenExpenseModal }) => {
  const navigate = useNavigate();
  const { user, activeBusinessId, setActiveBusinessId } = useAuthStore();
  const { openChatbot } = useModals();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowBusinessDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0] || null;

  const handleSelectBusiness = (businessId: string) => {
    setActiveBusinessId(businessId);
    setShowBusinessDropdown(false);
    window.location.reload();
  };

  const fetchNotifications = async () => {
    try {
      const data = await api.get<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      // ignore
    }
  };

  return (
    <header className="topbar">
      {/* Sélecteur de Boutique & Multi-Points de Vente */}
      <div className="topbar-business" style={{ position: 'relative' }} ref={dropdownRef}>
        <div
          onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: '12px',
            transition: 'background 0.15s ease',
            background: showBusinessDropdown ? '#F1F5F9' : 'transparent',
          }}
          title="Cliquez pour basculer de boutique ou en ajouter une"
        >
          <div className="business-avatar" style={{ background: '#EFF6FF', color: '#0062FF', border: '1px solid #DBEAFE' }}>
            <Store size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="business-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {activeBusiness?.name || 'Mon Activité'}
                <ChevronDown size={14} color="#64748B" />
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: isOnline ? '#ECFDF5' : '#FEF3C7',
                  color: isOnline ? '#059669' : '#D97706',
                  border: isOnline ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: isOnline ? '#10B981' : '#F59E0B',
                  }}
                />
                {isOnline ? 'En ligne' : 'Hors-ligne'}
              </span>
            </div>
            <div className="business-sector" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{activeBusiness?.sector ? `Secteur : ${activeBusiness.sector}` : 'Micro-entreprise'}</span>
              {activeBusiness?.role && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: activeBusiness.role === 'owner' ? '#FEF3C7' : '#E0F2FE',
                    color: activeBusiness.role === 'owner' ? '#B45309' : '#0369A1',
                  }}
                >
                  {activeBusiness.role === 'owner' ? '👑 Propriétaire' : activeBusiness.role === 'manager' ? '👔 Gérant' : '🛒 Caissier'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Menu Déroulant Multi-Boutiques */}
        {showBusinessDropdown && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '8px',
              width: '320px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              border: '1px solid #E2E8F0',
              zIndex: 1000,
              padding: '12px',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px 10px', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mes Boutiques & Succursales
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0062FF' }}>
                {user?.businesses?.length || 1} boutique(s)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {(user?.businesses || []).map((b: any) => {
                const isSelected = (activeBusiness?.id === b.id);
                return (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBusiness(b.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected ? '#EFF6FF' : 'transparent',
                      border: isSelected ? '1px solid #BFDBFE' : '1px solid transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isSelected ? '#0062FF' : '#F1F5F9',
                          color: isSelected ? '#FFFFFF' : '#64748B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: isSelected ? 800 : 600, color: '#0F172A' }}>
                          {b.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          {b.sector} • {b.currency || 'FCFA'}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={16} color="#0062FF" strokeWidth={3} />}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #F1F5F9', paddingTop: '10px', marginTop: '8px' }}>
              <button
                onClick={() => {
                  setShowBusinessDropdown(false);
                  setShowBranchModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: '#EFF6FF',
                  border: '1px dashed #60A5FA',
                  color: '#0062FF',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  justifyContent: 'center',
                }}
              >
                <Plus size={16} />
                <span>+ Ajouter une boutique / succursale</span>
              </button>

              <button
                onClick={() => {
                  setShowBusinessDropdown(false);
                  setShowTeamModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  justifyContent: 'center',
                }}
              >
                <Users size={16} color="#0062FF" />
                <span>Gérer l'équipe & caissiers</span>
              </button>
            </div>
          </div>
        )}
      </div>


      <div className="topbar-actions">
        {/* Bouton Copilote IA en haut dans la barre de navigation */}
        <button
          onClick={openChatbot}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #08162B 0%, #004BD6 100%)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.82rem',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 12px rgba(0, 98, 255, 0.25)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
          title="Consulter le Copilote IA COMMERCIA"
        >
          <img
            src="/commercia-logo.png"
            alt="IA"
            style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '4px' }}
          />
          <span>Copilote IA</span>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
        </button>

        {/* Bouton Guide & Mode d'emploi */}
        <button
          onClick={() => navigate('/guide')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: '10px',
            background: '#F1F5F9',
            color: '#1E293B',
            fontWeight: 700,
            fontSize: '0.82rem',
            border: '1px solid #CBD5E1',
            cursor: 'pointer',
          }}
          title="Consulter le Guide Complet & Mode d'emploi de COMMERCIA"
        >
          <BookOpen size={16} color="#0062FF" />
          <span>Guide</span>
        </button>

        {/* Bouton Équipe & Caissiers */}
        <button
          onClick={() => setShowTeamModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: '10px',
            background: '#F1F5F9',
            color: '#1E293B',
            fontWeight: 700,
            fontSize: '0.82rem',
            border: '1px solid #CBD5E1',
            cursor: 'pointer',
          }}
          title="Gérer les caissiers et l'équipe de la boutique"
        >
          <Users size={16} color="#0062FF" />
          <span>Équipe</span>
        </button>

        {onOpenSaleModal && (
          <button className="btn btn-primary" onClick={onOpenSaleModal} style={{ padding: '8px 16px', fontSize: '0.88rem', fontWeight: 700 }}>
            <Plus size={16} />
            <span>Vente</span>
          </button>
        )}

        {onOpenExpenseModal && (
          <button className="btn btn-secondary" onClick={onOpenExpenseModal} style={{ padding: '8px 14px', fontSize: '0.88rem', fontWeight: 600 }}>
            <Minus size={16} />
            <span>Dépense</span>
          </button>
        )}

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: 'relative',
              background: '#F1F5F9',
              border: 'none',
              padding: '10px',
              borderRadius: '10px',
              color: '#334155',
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'linear-gradient(135deg, #FF6B00 0%, #FF8A00 100%)',
                  color: 'white',
                  borderRadius: '9999px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(255, 107, 0, 0.4)',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '48px',
                width: '320px',
                background: '#FFFFFF',
                borderRadius: '14px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                border: '1px solid #E2E8F0',
                zIndex: 100,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{ background: 'transparent', fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}
                  >
                    Tout marquer comme lu
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                    Aucune notification pour le moment.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #F1F5F9',
                        background: n.isRead ? '#FFFFFF' : '#F0FDF4',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span>{n.icon || '🔔'}</span>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{n.title}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#64748B' }}>{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar Profil Marchand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px', borderLeft: '1px solid #E2E8F0' }}>
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.firstName || 'Profil'}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #0062FF',
                boxShadow: '0 2px 8px rgba(0, 98, 255, 0.2)',
              }}
            />
          ) : (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0062FF 0%, #FF6B00 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.9rem',
              }}
            >
              {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
        </div>
      </div>

      {/* Modals Équipe et Multi-Boutiques */}
      <TeamModal isOpen={showTeamModal} onClose={() => setShowTeamModal(false)} />
      <BranchModal isOpen={showBranchModal} onClose={() => setShowBranchModal(false)} />
    </header>
  );
};
