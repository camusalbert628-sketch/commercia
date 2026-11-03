import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Clock,
  ShieldAlert,
  Play,
  CheckCircle,
  AlertTriangle,
  Settings,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api';

interface AutomationAlertsViewProps {
  adminTheme: 'light' | 'dark';
}

export const AutomationAlertsView: React.FC<AutomationAlertsViewProps> = ({ adminTheme }) => {
  const [config, setConfig] = useState<any | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertCounts, setAlertCounts] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Édition des règles
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(3);
  const [reminderDays, setReminderDays] = useState<string>('7, 3, 1, 0');
  const [restrictFeatures, setRestrictFeatures] = useState<boolean>(true);
  const [autoReactivate, setAutoReactivate] = useState<boolean>(true);
  const [isSavingRules, setIsSavingRules] = useState<boolean>(false);

  // Déclenchement manuel
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [executionReport, setExecutionReport] = useState<any | null>(null);

  // Filtre alertes
  const [alertStatusFilter, setAlertStatusFilter] = useState<string>('open');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, alertsRes] = await Promise.all([
        api.get<any>('/admin/rules/subscriptions'),
        api.get<any>(`/admin/alerts/commercial?status=${alertStatusFilter}`),
      ]);

      if (rulesRes?.config) {
        setConfig(rulesRes.config);
        setGracePeriodDays(rulesRes.config.gracePeriodDays);
        setReminderDays((rulesRes.config.reminderDaysArray || [7, 3, 1, 0]).join(', '));
        setRestrictFeatures(rulesRes.config.restrictFeaturesOnExpiry);
        setAutoReactivate(rulesRes.config.autoReactivateOnPayment);
      }

      setAlerts(alertsRes.alerts || []);
      setAlertCounts(alertsRes.counts || null);
    } catch (err: any) {
      console.error('Erreur chargement automatisation:', err);
    } finally {
      setLoading(false);
    }
  }, [alertStatusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRules(true);
    try {
      const parsedReminders = reminderDays.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
      const res = await api.put<any>('/admin/rules/subscriptions', {
        gracePeriodDays,
        reminderDays: parsedReminders,
        restrictFeaturesOnExpiry: restrictFeatures,
        autoReactivateOnPayment: autoReactivate,
      });

      alert(res.message || 'Règles d’abonnement mises à jour avec succès.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour des règles');
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleTriggerCycle = async () => {
    setIsTriggering(true);
    setExecutionReport(null);
    try {
      const res = await api.post<any>('/admin/rules/trigger-expiration-check', {});
      setExecutionReport(res.report);
      alert(res.message || 'Cycle d’automatisation terminé avec succès.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du déclenchement du cycle');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await api.put<any>(`/admin/alerts/commercial/${id}/resolve`, { status: 'resolved' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour de l’alerte');
    }
  };

  const isLight = adminTheme === 'light';
  const cardBg = isLight ? '#FFFFFF' : '#0F172A';
  const borderCol = isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)';
  const textPrimary = isLight ? '#1E293B' : '#F8FAFC';
  const textSecondary = isLight ? '#64748B' : '#94A3B8';

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { bg: '#FEF2F2', border: '#FCA5A5', color: '#DC2626', label: 'Critique' };
      case 'high':
        return { bg: '#FFF7ED', border: '#FDBA74', color: '#EA580C', label: 'Élevée' };
      case 'medium':
        return { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706', label: 'Moyenne' };
      case 'low':
      default:
        return { bg: '#EFF6FF', border: '#BFDBFE', color: '#2563EB', label: 'Faible' };
    }
  };

  return (
    <div>
      {/* EN-TÊTE DE LA SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: textPrimary, margin: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={22} color="#4F46E5" />
            Automatisation des Abonnements & Surveillance Commerciale
          </h2>
          <p style={{ color: textSecondary, fontSize: '13px', marginTop: '4px', margin: 0 }}>
            Gestion autonome des expirations, relances automatiques, périodes de grâce et centre de surveillance proactive.
          </p>
        </div>

        <button
          onClick={handleTriggerCycle}
          disabled={isTriggering}
          style={{
            background: '#4F46E5',
            color: '#FFFFFF',
            border: 'none',
            padding: '9px 16px',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
          }}
        >
          <Play size={14} className={isTriggering ? 'animate-spin' : ''} />
          {isTriggering ? 'Exécution du cycle...' : 'Déclencher Cycle d\'Automatisation'}
        </button>
      </div>

      {/* RAPPORT D'EXÉCUTION IMMÉDIATE DU CYCLE */}
      {executionReport && (
        <div style={{
          background: isLight ? '#F0FDF4' : 'rgba(16, 185, 129, 0.1)',
          border: '1px solid #10B981',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '22px',
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={16} />
            Rapport d'Exécution du Moteur d'Automatisation
          </h4>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: textPrimary }}>
            <div>Abonnements analysés : <strong>{executionReport.totalAnalyzed}</strong></div>
            <div>Rappels envoyés : <strong>{executionReport.notificationsSent}</strong></div>
            <div>Mises en grâce : <strong>{executionReport.gracePeriodApplied}</strong></div>
            <div>Suspensions automatiques : <strong style={{ color: '#DC2626' }}>{executionReport.autoSuspensions}</strong></div>
            <div>Alertes créées : <strong>{executionReport.alertsCreated}</strong></div>
          </div>
        </div>
      )}

      {/* SECTION 1 : CONFIGURATION DES RÈGLES COMMERCIALES (SECTION 4.5) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <form onSubmit={handleSaveRules} style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: textPrimary, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="#2563EB" />
            Paramétrage des Règles d'Abonnement & Expiration
          </h3>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
              Durée de la période de grâce (en jours) :
            </label>
            <input
              type="number"
              value={gracePeriodDays}
              onChange={(e) => setGracePeriodDays(Math.max(0, parseInt(e.target.value) || 0))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none' }}
            />
            <span style={{ fontSize: '11px', color: textSecondary, marginTop: '4px', display: 'block' }}>
              Délai de tolérance commerciale après la date d'échéance avant suspension des fonctionnalités.
            </span>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
              Délais de notification automatique avant expiration (Jours) :
            </label>
            <input
              type="text"
              placeholder="7, 3, 1, 0"
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none' }}
            />
            <span style={{ fontSize: '11px', color: textSecondary, marginTop: '4px', display: 'block' }}>
              Déclenche automatiquement les alertes J-7, J-3, J-1 et le jour même de l'échéance.
            </span>
          </div>

          <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="restrictFeatures"
              checked={restrictFeatures}
              onChange={(e) => setRestrictFeatures(e.target.checked)}
            />
            <label htmlFor="restrictFeatures" style={{ fontSize: '12.5px', color: textPrimary, cursor: 'pointer' }}>
              Restreindre l'accès Pro/Business après expiration de la grâce tout en préservant 100% des données marchandes.
            </label>
          </div>

          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="autoReactivate"
              checked={autoReactivate}
              onChange={(e) => setAutoReactivate(e.target.checked)}
            />
            <label htmlFor="autoReactivate" style={{ fontSize: '12.5px', color: textPrimary, cursor: 'pointer' }}>
              Réactivation automatique immédiate et idempotente dès confirmation du paiement de renouvellement.
            </label>
          </div>

          <button
            type="submit"
            disabled={isSavingRules}
            style={{
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isSavingRules ? 'Enregistrement...' : 'Enregistrer les Règles d\'Automatisation'}
          </button>
        </form>

        {/* EXPLICATION DES AUTOMATISATIONS DU MOTEUR */}
        <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: textPrimary, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#10B981" />
            Garanties du Moteur d'Automatisation COMMERCIA
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px', color: textSecondary }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <CheckCircle size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: textPrimary }}>Fonctionnement autonome en arrière-plan :</strong> Le moteur exécute les cycles même si aucun administrateur n'est connecté.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <CheckCircle size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: textPrimary }}>Préservation absolue des données :</strong> Aucune donnée commerciale, stock ou client n'est supprimée lors d'un défaut de renouvellement.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <CheckCircle size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: textPrimary }}>Idempotence des paiements :</strong> Un paiement confirmé ne peut jamais prolonger deux fois la période d'un même abonnement.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <CheckCircle size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: textPrimary }}>Sanctuarisation des suspensions manuelles :</strong> Un renouvellement ne lève jamais une suspension prononcée manuellement par un administrateur.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 : CENTRE DE SURVEILLANCE & ALERTES COMMERCIALES (SECTION 10 DU CDC) */}
      <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${borderCol}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color="#EF4444" />
              Centre de Surveillance Commerciale & Alertes Proactives
            </h3>
            <div style={{ fontSize: '12px', color: textSecondary, marginTop: '2px' }}>
              {alertCounts ? `${alertCounts.open} alerte(s) ouverte(s) — ${alertCounts.critical} critique(s), ${alertCounts.high} élevée(s)` : 'Chargement des alertes...'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setAlertStatusFilter('open')}
              style={{
                background: alertStatusFilter === 'open' ? '#2563EB' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                color: alertStatusFilter === 'open' ? '#FFFFFF' : textSecondary,
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Alertes Ouvertes
            </button>
            <button
              onClick={() => setAlertStatusFilter('resolved')}
              style={{
                background: alertStatusFilter === 'resolved' ? '#2563EB' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                color: alertStatusFilter === 'resolved' ? '#FFFFFF' : textSecondary,
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Historique Résolues
            </button>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: textSecondary, fontSize: '13px' }}>
            Aucune alerte {alertStatusFilter === 'open' ? 'active en cours' : 'résolue'} pour le moment.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {alerts.map((al) => {
              const priority = getPriorityBadge(al.priority);
              return (
                <div
                  key={al.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: `1px solid ${borderCol}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <span style={{
                      background: priority.bg,
                      color: priority.color,
                      border: `1px solid ${priority.border}`,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}>
                      {priority.label}
                    </span>

                    <div>
                      <div style={{ fontWeight: 700, color: textPrimary, fontSize: '13.5px' }}>{al.title}</div>
                      <div style={{ color: textSecondary, fontSize: '12px', marginTop: '2px' }}>{al.message}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11.5px', color: textSecondary }}>
                      {new Date(al.createdAt).toLocaleString('fr-FR')}
                    </span>

                    {al.status === 'open' && (
                      <button
                        onClick={() => handleResolveAlert(al.id)}
                        style={{
                          background: '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Résoudre
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
