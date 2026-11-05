import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api, setAdminSessionCredentials } from '../../services/api';

// Seuil d'inactivité global : 10 minutes (600 000 ms)
export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Gestionnaire global de sécurité Zero-Trust :
 * Surveille toute inactivité sur l'ensemble de l'application (Interface Commerçant ET Interface Super Admin).
 * Si aucune manipulation (clic, touche, défilement, souris) n'est détectée pendant 10 minutes :
 * - Révocation immédiate de la session administrative privilégiée.
 * - Déconnexion complète de l'application.
 * - Redirection vers /login avec notification de sécurité.
 */
export const GlobalInactivityManager: React.FC = () => {
  const { isAuthenticated, logout } = useAuthStore();
  const lastActivityRef = useRef<number>(Date.now());
  const isLoggingOutRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    lastActivityRef.current = Date.now();
    isLoggingOutRef.current = false;

    // Mise à jour de l'horodatage sur interaction utilisateur
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
      'wheel',
    ];

    // Optimisation : limitation de la fréquence de mise à jour (1 seconde)
    let throttleTimeout: ReturnType<typeof setTimeout> | null = null;
    const throttledHandler = () => {
      if (!throttleTimeout) {
        handleUserActivity();
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
        }, 1000);
      }
    };

    events.forEach((eventName) => {
      window.addEventListener(eventName, throttledHandler, { passive: true });
    });

    // Surveillance de l'inactivité toutes les 5 secondes
    const intervalId = setInterval(() => {
      if (isLoggingOutRef.current) return;
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        isLoggingOutRef.current = true;

        // 1. Révocation immédiate de tout jeton ou cookie de session Super Admin
        setAdminSessionCredentials(null, null);
        api.post('/admin-auth/logout').catch(() => {});

        // 2. Enregistrement du motif de déconnexion pour informer l'utilisateur
        try {
          sessionStorage.setItem(
            'commercia_inactivity_logout_notice',
            "Votre session a été automatiquement fermée après 10 minutes d'inactivité pour des raisons de sécurité. Veuillez vous reconnecter."
          );
        } catch (_) {}

        // 3. Déconnexion complète du compte
        logout();
      }
    }, 5000);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, throttledHandler);
      });
      if (throttleTimeout) clearTimeout(throttleTimeout);
      clearInterval(intervalId);
    };
  }, [isAuthenticated, logout]);

  return null;
};
