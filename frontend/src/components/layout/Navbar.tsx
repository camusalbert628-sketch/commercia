import React, { useState, useEffect } from 'react';
import { Bell, Plus, Minus, Store } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { NotificationItem } from '../../types';

interface NavbarProps {
  onOpenSaleModal?: () => void;
  onOpenExpenseModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSaleModal, onOpenExpenseModal }) => {
  const { user, activeBusinessId } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

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
      <div className="topbar-business">
        <div className="business-avatar" style={{ background: '#EFF6FF', color: '#0062FF', border: '1px solid #DBEAFE' }}>
          <Store size={20} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="business-name">{activeBusiness?.name || 'Mon Activité'}</span>
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
          <div className="business-sector">
            {activeBusiness?.sector ? `Secteur : ${activeBusiness.sector}` : 'Micro-entreprise'}
          </div>
        </div>
      </div>

      <div className="topbar-actions">
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
      </div>
    </header>
  );
};
