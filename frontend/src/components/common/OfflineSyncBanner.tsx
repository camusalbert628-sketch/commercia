import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const OfflineSyncBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  if (!isOnline) {
    return (
      <div
        style={{
          background: 'linear-gradient(90deg, #D97706 0%, #B45309 100%)',
          color: '#FFFFFF',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          textAlign: 'center',
        }}
      >
        <WifiOff size={16} />
        <span>
          Mode Hors-Ligne activé — Vos ventes et dépenses sont sécurisées localement et se synchroniseront au retour du réseau.
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #059669 0%, #047857 100%)',
        color: '#FFFFFF',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '0.85rem',
        fontWeight: 600,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        textAlign: 'center',
        animation: 'fadeIn 0.3s ease-in-out',
      }}
    >
      <Wifi size={16} />
      <span>Connexion rétablie ! Synchronisation avec COMMERCIA Cloud réussie.</span>
      <RefreshCw size={14} className="spin" style={{ marginLeft: '4px' }} />
    </div>
  );
};
