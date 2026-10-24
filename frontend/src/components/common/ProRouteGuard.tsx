import React from 'react';
import { NavLink } from 'react-router-dom';
import { Crown, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface ProRouteGuardProps {
  children: React.ReactNode;
  featureName: string;
  featureDescription?: string;
}

export const ProRouteGuard: React.FC<ProRouteGuardProps> = ({
  children,
  featureName,
  featureDescription,
}) => {
  const { user } = useAuthStore();
  const isPro = Boolean(user?.isAdmin || (user?.subscription?.isPro && user?.subscription?.status === 'active'));

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <div className="page-wrapper" style={{ padding: '32px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <div
        className="card"
        style={{
          padding: '40px 32px',
          textAlign: 'center',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 25px -5px rgba(0, 98, 255, 0.08)',
          background: '#FFFFFF',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.15) 0%, rgba(255, 165, 0, 0.25) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <Crown size={32} color="#FF6B00" />
        </div>

        <span
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            background: '#EFF6FF',
            color: '#1D4ED8',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            marginBottom: '12px',
          }}
        >
          FONCTIONNALITÉ RÉSERVÉE AU PLAN PRO
        </span>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
          Débloquez {featureName} avec COMMERCIA PRO
        </h2>

        <p style={{ color: '#64748B', fontSize: '0.95rem', maxWidth: '540px', margin: '0 auto 28px', lineHeight: 1.6 }}>
          {featureDescription ||
            `Cette fonctionnalité avancée (${featureName}) est réservée aux abonnés COMMERCIA PRO et BUSINESS. Passez à la vitesse supérieure pour automatiser et développer votre activité.`}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            textAlign: 'left',
            marginBottom: '32px',
            background: '#F8FAFC',
            padding: '20px',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Zap size={18} color="#FF6B00" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#1E293B' }}>Ventes illimitées</strong>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Dépassez le quota de 15 ventes journalières.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <ShieldCheck size={18} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#1E293B' }}>Stock & Dettes</strong>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Suivi des alertes ruptures et carnet de dettes clients.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Sparkles size={18} color="#0062FF" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#1E293B' }}>Copilote IA</strong>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Conseils stratégiques pour maximiser vos bénéfices.</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <NavLink
            to="/subscription"
            className="btn btn-primary btn-lg"
            style={{
              background: 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)',
              border: 'none',
              padding: '12px 24px',
              fontSize: '0.95rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 6px 16px rgba(255, 107, 0, 0.35)',
            }}
          >
            <Crown size={18} />
            <span>Passer à COMMERCIA PRO (4 500 FCFA/mois)</span>
            <ArrowRight size={16} />
          </NavLink>
          <NavLink
            to="/dashboard"
            className="btn btn-outline"
            style={{ padding: '12px 20px', fontSize: '0.9rem' }}
          >
            Retour au tableau de bord
          </NavLink>
        </div>
      </div>
    </div>
  );
};
