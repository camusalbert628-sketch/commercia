import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock, ShieldX } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Page 403 hermétique d'accès refusé à l'espace d'administration.
 * Ne divulgue AUCUNE information interne (noms de tables, métriques, serveurs, etc.).
 */
export const AdminAccessDeniedView: React.FC<{ attemptedPath: string }> = ({ attemptedPath }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B132B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          background: '#1C2541',
          border: '1px solid #3A506B',
          borderRadius: '24px',
          maxWidth: '520px',
          width: '100%',
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '2px solid rgba(239, 68, 68, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            color: '#EF4444',
          }}
        >
          <ShieldX size={44} />
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#F87171',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '14px',
          }}
        >
          <Lock size={12} />
          <span>Accès Réservé • Erreur 403</span>
        </div>

        <h1
          style={{
            color: '#FFFFFF',
            fontSize: '1.65rem',
            fontWeight: 800,
            margin: '0 0 12px 0',
            lineHeight: 1.25,
          }}
        >
          Zone d'Administration Restreinte
        </h1>

        <p
          style={{
            color: '#94A3B8',
            fontSize: '0.92rem',
            lineHeight: 1.6,
            margin: '0 0 24px 0',
          }}
        >
          Votre compte (<strong>{user?.email || 'Commerçant'}</strong>) ne possède pas les autorisations nécessaires pour accéder aux outils de gestion globale de la plateforme.
        </p>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '28px',
            textAlign: 'left',
            fontSize: '0.78rem',
            color: '#64748B',
            lineHeight: 1.5,
          }}
        >
          <div style={{ color: '#E2E8F0', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={14} color="#EF4444" />
            <span>Sécurité & Traçabilité Zero-Trust</span>
          </div>
          Cette tentative d'accès à l'URL <code style={{ color: '#93C5FD' }}>{attemptedPath}</code> a été enregistrée dans les journaux d'audit de sécurité avec l'adresse IP et l'empreinte de session.
        </div>

        <button
          type="button"
          onClick={() => navigate('/dashboard', { replace: true })}
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0062FF 0%, #004BD6 100%)',
            color: '#FFFFFF',
            fontSize: '0.95rem',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 8px 20px rgba(0, 98, 255, 0.35)',
            transition: 'all 0.15s ease',
          }}
        >
          <ArrowLeft size={18} />
          <span>Retourner à mon Espace Commerçant</span>
        </button>
      </div>
    </div>
  );
};

/**
 * Route Guard étanche pour toutes les routes /admin et /admin/*
 * Interdit tout chargement, préchargement ou affichage de l'interface admin pour les comptes non-administrateurs.
 */
export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, fetchMe } = useAuthStore();
  const location = useLocation();

  // État de validation en direct auprès de la base de données
  const [isVerifyingServer, setIsVerifyingServer] = useState<boolean>(true);
  const [isServerAdminConfirmed, setIsServerAdminConfirmed] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const verifyServerAccess = async () => {
      // 1. Contrôle client immédiat
      if (!isAuthenticated || !user) {
        setIsVerifyingServer(false);
        setIsServerAdminConfirmed(false);
        return;
      }

      if (!user.isAdmin) {
        // Signalement de la tentative au serveur pour journalisation de sécurité
        api.post('/admin/report-unauthorized-access', {
          path: location.pathname,
        }).catch(() => {});

        setIsVerifyingServer(false);
        setIsServerAdminConfirmed(false);
        return;
      }

      // 2. Contrôle serveur en temps réel (empêche toute manipulation du localStorage)
      try {
        const check = await api.get<{ authorized: boolean; user: any }>('/admin/verify-access');
        if (isMounted) {
          if (check?.authorized && check?.user?.isAdmin) {
            setIsServerAdminConfirmed(true);
          } else {
            setIsServerAdminConfirmed(false);
            await fetchMe();
          }
        }
      } catch (err) {
        if (isMounted) {
          setIsServerAdminConfirmed(false);
          // Si le serveur rejette avec 403, signaler et réinitialiser
          api.post('/admin/report-unauthorized-access', {
            path: location.pathname,
          }).catch(() => {});
          await fetchMe();
        }
      } finally {
        if (isMounted) {
          setIsVerifyingServer(false);
        }
      }
    };

    verifyServerAccess();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id, user?.isAdmin, location.pathname, fetchMe]);

  if (isLoading || isVerifyingServer) {
    return (
      <div
        style={{
          height: '100vh',
          background: '#0B132B',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          color: '#FFFFFF',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            border: '3px solid rgba(0, 98, 255, 0.2)',
            borderTop: '3px solid #0062FF',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>
          Contrôle d'autorisation administrative Zero-Trust...
        </div>
      </div>
    );
  }

  // Redirection immédiate si non connecté
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verrouillage absolu si non Super-Admin
  if (!user?.isAdmin || !isServerAdminConfirmed) {
    return <AdminAccessDeniedView attemptedPath={location.pathname} />;
  }

  // Utilisateur Super-Admin authentifié et validé en temps réel par le serveur
  return <>{children}</>;
};
