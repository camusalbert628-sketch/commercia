import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  ArrowRight,
  X,
  ShieldAlert,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface SubscriptionRenewalFloatingAlertProps {
  daysRemaining: number;
  planDisplayName: string;
  formattedEndDate: string;
  isExpired?: boolean;
}

export const SubscriptionRenewalFloatingAlert: React.FC<SubscriptionRenewalFloatingAlertProps> = ({
  daysRemaining,
  planDisplayName,
  formattedEndDate,
  isExpired = false,
}) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Check if user dismissed it in this browser session
  useEffect(() => {
    const sessionDismissed = sessionStorage.getItem('commercia_renewal_alert_dismissed');
    if (sessionDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('commercia_renewal_alert_dismissed', 'true');
  };

  // Only show if 7 days or fewer remain (or expired)
  if (daysRemaining > 7 && !isExpired) {
    return null;
  }

  if (dismissed) {
    // Show a tiny discreet floating pill to reopen if needed
    return (
      <button
        type="button"
        onClick={() => setDismissed(false)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9998,
          background: isExpired ? '#DC2626' : '#D97706',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '30px',
          padding: '8px 16px',
          fontSize: '0.82rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
          cursor: 'pointer',
          animation: 'fadeIn 0.2s ease-out',
        }}
        title="Voir l'alerte d'échéance de forfait"
      >
        <Clock size={16} />
        <span>Forfait : {isExpired ? 'Expiré' : `J-${daysRemaining}`}</span>
      </button>
    );
  }

  if (minimized) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9998,
          background: '#0F172A',
          color: '#FFFFFF',
          borderRadius: '16px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isExpired ? '#EF4444' : '#F59E0B',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            {isExpired ? 'Forfait expiré' : `Renouvellement : ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMinimized(false)}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            color: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Agrandir
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '2px',
          }}
          title="Fermer"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  const urgencyColor = isExpired ? '#DC2626' : daysRemaining <= 3 ? '#EA580C' : '#D97706';
  const urgencyBg = isExpired ? '#FEF2F2' : daysRemaining <= 3 ? '#FFF7ED' : '#FFFBEB';
  const urgencyBorder = isExpired ? '#FECACA' : daysRemaining <= 3 ? '#FED7AA' : '#FDE68A';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        maxWidth: '430px',
        width: 'calc(100% - 32px)',
        zIndex: 9998,
        background: '#FFFFFF',
        borderRadius: '20px',
        border: `1.5px solid ${urgencyBorder}`,
        boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.04)',
        padding: '20px 22px',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: urgencyBg,
              border: `1px solid ${urgencyBorder}`,
              color: urgencyColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isExpired ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: urgencyColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isExpired ? 'Forfait Arrivé à Échéance' : 'Alerte Renouvellement'}
            </div>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>
              {isExpired
                ? 'Renouvellement immédiat requis'
                : `Il vous reste ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} de validité`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              color: '#64748B',
              padding: '3px 8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Réduire l'alerte"
          >
            Réduire
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '50%',
              color: '#94A3B8',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Fermer pour cette session"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Professional Message Body */}
      <p style={{ margin: '0 0 14px 0', fontSize: '0.84rem', color: '#475569', lineHeight: 1.55 }}>
        {isExpired ? (
          <>
            Votre accès à la formule <strong>{planDisplayName}</strong> a expiré. Pour réactiver sans délai vos encaissements illimités, vos alertes de stock et vos exports comptables, prolongez votre forfait.
          </>
        ) : (
          <>
            Votre abonnement <strong>{planDisplayName}</strong> arrive à échéance le <strong>{formattedEndDate}</strong>. Pour assurer la continuité ininterrompue de vos encaissements, du décompte automatique de vos stocks et de vos clôtures de caisse quotidiennes, pensez à prolonger votre accès en toute tranquillité.
          </>
        )}
      </p>

      {/* Micro-assurances bar */}
      <div
        style={{
          background: '#F8FAFC',
          borderRadius: '10px',
          padding: '8px 12px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.74rem',
          color: '#64748B',
        }}
      >
        <span>🔒 Vos données restent protégées</span>
        <span>•</span>
        <span>⚡ 100% Mobile Money & Wave</span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            flex: 1,
            height: '42px',
            borderRadius: '12px',
            background: '#F1F5F9',
            border: '1px solid #CBD5E1',
            color: '#334155',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Rappeler plus tard
        </button>
        <button
          type="button"
          onClick={() => navigate('/subscription')}
          style={{
            flex: 1.4,
            height: '42px',
            borderRadius: '12px',
            background: isExpired ? '#DC2626' : '#0062FF',
            border: 'none',
            color: '#FFFFFF',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: 'none',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = isExpired ? '#B91C1C' : '#0052D6')}
          onMouseLeave={(e) => (e.currentTarget.style.background = isExpired ? '#DC2626' : '#0062FF')}
        >
          <span>Renouveler mon forfait</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};
