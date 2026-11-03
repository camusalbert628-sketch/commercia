import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldAlert,
  CreditCard,
  DollarSign,
  Activity,
  MessageSquare,
  History,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Send,
  PlusCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  Truck,
  FileText,
  Percent,
} from 'lucide-react';
import { api } from '../../services/api';

interface MerchantProfileModalProps {
  userId: string;
  adminTheme: 'light' | 'dark';
  onClose: () => void;
  onRefresh: () => void;
}

export const MerchantProfileModal: React.FC<MerchantProfileModalProps> = ({
  userId,
  adminTheme,
  onClose,
  onRefresh,
}) => {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'identity' | 'subscription' | 'financial' | 'activity' | 'support'>('identity');

  // État de l'action de confirmation
  const [actionType, setActionType] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState<string>('');
  const [extensionDays, setExtensionDays] = useState<number>(30);
  const [newPlanName, setNewPlanName] = useState<string>('pro');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // État pour message direct
  const [showMessageModal, setShowMessageModal] = useState<boolean>(false);
  const [directMsgTitle, setDirectMsgTitle] = useState<string>('');
  const [directMsgContent, setDirectMsgContent] = useState<string>('');
  const [directMsgChannel, setDirectMsgChannel] = useState<string>('internal_notification');
  const [isSendingMsg, setIsSendingMsg] = useState<boolean>(false);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/admin/merchants/${userId}/profile`);
      setProfile(res);
    } catch (err: any) {
      console.error('Erreur chargement profil 360:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const handleExecuteAction = async () => {
    if (!actionType || !actionReason.trim()) {
      setActionErrorMsg('Le motif de l’action est obligatoire pour le journal d’audit.');
      return;
    }

    setIsSubmittingAction(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await api.post<any>(`/admin/merchants/${userId}/action`, {
        action: actionType,
        reason: actionReason.trim(),
        days: extensionDays,
        planName: newPlanName,
      });

      setActionSuccessMsg(res.message || 'Action exécutée avec succès.');
      setActionType(null);
      setActionReason('');
      await loadProfile();
      onRefresh();
    } catch (err: any) {
      setActionErrorMsg(err?.message || 'Erreur lors de l’exécution de l’action.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directMsgTitle.trim() || !directMsgContent.trim()) {
      alert('Titre et contenu obligatoires.');
      return;
    }

    setIsSendingMsg(true);
    try {
      await api.post<any>('/admin/communication/send-individual', {
        userId,
        title: directMsgTitle.trim(),
        content: directMsgContent.trim(),
        channel: directMsgChannel,
      });
      alert('Message envoyé avec succès au commerçant !');
      setShowMessageModal(false);
      setDirectMsgTitle('');
      setDirectMsgContent('');
      await loadProfile();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’envoi du message.');
    } finally {
      setIsSendingMsg(false);
    }
  };

  const isLight = adminTheme === 'light';

  const modalBg = isLight ? '#FFFFFF' : '#0F172A';
  const cardBg = isLight ? '#F8FAFC' : 'rgba(255,255,255,0.03)';
  const borderCol = isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)';
  const textPrimary = isLight ? '#1E293B' : '#F8FAFC';
  const textSecondary = isLight ? '#64748B' : '#94A3B8';

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{ background: modalBg, padding: '30px', borderRadius: '16px', color: textPrimary, textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} />
          Chargement du dossier 360° du commerçant...
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const { identity, subscriptionInfo, financialHistory, platformActivity, supportInteractions, auditLogs } = profile;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        background: modalBg,
        border: `1px solid ${borderCol}`,
        borderRadius: '16px',
        width: '1100px',
        maxWidth: '96%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden',
      }}>
        {/* EN-TÊTE DU DOSSIER */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${borderCol}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#2563EB',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px',
            }}>
              {identity.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: textPrimary, margin: 0 }}>
                  {identity.fullName}
                </h2>
                <span style={{
                  background: identity.statusColor,
                  color: '#FFFFFF',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}>
                  {identity.status}
                </span>
                <span style={{
                  background: identity.currentPlan === 'Business' ? '#7C3AED' : identity.currentPlan === 'Pro' ? '#2563EB' : '#64748B',
                  color: '#FFFFFF',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}>
                  {identity.currentPlan}
                </span>
              </div>
              <div style={{ color: textSecondary, fontSize: '12.5px', marginTop: '3px' }}>
                {identity.businessName} • {identity.email} • ID: <code style={{ fontSize: '11px' }}>{identity.id}</code>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowMessageModal(true)}
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Send size={14} />
              Envoyer un Message
            </button>
            <button
              onClick={onClose}
              style={{
                background: isLight ? '#EDF2F7' : 'rgba(255,255,255,0.08)',
                border: 'none',
                color: textSecondary,
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* NOTIFICATIONS DE SUCCÈS OU ERREUR D'ACTION */}
        {actionSuccessMsg && (
          <div style={{ background: '#ECFDF5', borderLeft: '4px solid #10B981', color: '#047857', padding: '10px 20px', fontSize: '13px', fontWeight: 600 }}>
            ✓ {actionSuccessMsg}
          </div>
        )}
        {actionErrorMsg && (
          <div style={{ background: '#FEF2F2', borderLeft: '4px solid #EF4444', color: '#B91C1C', padding: '10px 20px', fontSize: '13px', fontWeight: 600 }}>
            ✕ {actionErrorMsg}
          </div>
        )}

        {/* BARRE D'ONGLETS DU DOSSIER 360 */}
        <div style={{
          display: 'flex',
          gap: '2px',
          borderBottom: `1px solid ${borderCol}`,
          padding: '0 20px',
          background: isLight ? '#FFFFFF' : '#0B1120',
        }}>
          {[
            { id: 'identity', label: 'A. Identité & Compte', icon: User },
            { id: 'subscription', label: 'B. Abonnement & Chronologie', icon: CreditCard },
            { id: 'financial', label: 'C. Rentabilité Individuelle', icon: DollarSign },
            { id: 'activity', label: 'D. Activité Plateforme', icon: Activity },
            { id: 'support', label: 'E. Support & Messages', icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #2563EB' : '3px solid transparent',
                  background: 'transparent',
                  color: isActive ? '#2563EB' : textSecondary,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* CORPS PRINCIPAL DE L'ONGLET SÉLECTIONNÉ */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* ONGLET A : IDENTITÉ & INFORMATIONS GÉNÉRALES */}
          {activeTab === 'identity' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '11.5px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>
                    Coordonnées du Marchand
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textSecondary }}>Nom complet :</span>
                      <strong style={{ color: textPrimary }}>{identity.fullName}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textSecondary }}>Email :</span>
                      <span style={{ color: '#2563EB', fontWeight: 600 }}>{identity.email}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: textSecondary }}>Téléphone :</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: textPrimary }}>{identity.phone || 'Non renseigné'}</strong>
                        {identity.phoneVerified ? (
                          <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            ✓ Vérifié OTP
                          </span>
                        ) : identity.phone ? (
                          <span style={{ fontSize: '10px', background: 'rgba(0,98,255,0.1)', color: '#0062FF', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            E.164
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textSecondary }}>Pays & Devise :</span>
                      <strong style={{ color: textPrimary }}>{identity.country} ({identity.currency})</strong>
                    </div>
                  </div>
                </div>

                <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '11.5px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>
                    Entreprise & Activité
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textSecondary }}>Nom Boutique :</span>
                      <strong style={{ color: textPrimary }}>{identity.businessName}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textSecondary }}>Secteur d'activité :</span>
                      <strong style={{ color: textPrimary, textTransform: 'capitalize' }}>{identity.sector}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textSecondary }}>Nombre de boutiques :</span>
                      <strong style={{ color: textPrimary }}>{identity.businessCount}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textSecondary }}>Type de compte :</span>
                      <strong style={{ color: identity.accountType.includes('Super') ? '#D97706' : textPrimary }}>{identity.accountType}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '11.5px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>
                    Connexions & Statut
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textSecondary }}>Date d'inscription :</span>
                      <span style={{ color: textPrimary }}>{new Date(identity.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textSecondary }}>Dernière connexion :</span>
                      <span style={{ color: textPrimary }}>{identity.lastLoginAt ? new Date(identity.lastLoginAt).toLocaleString('fr-FR') : 'Non renseigné'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textSecondary }}>Nombre de connexions :</span>
                      <strong style={{ color: textPrimary }}>{identity.loginCount}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: textSecondary }}>Opt-in Marketing :</span>
                      <span style={{ color: identity.optInMarketing ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                        {identity.optInMarketing ? 'Accepté' : 'Refusé'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ZONE DE CONTRÔLE ADMINISTRATIF MANUEL (SECTION 5 DU CDC) */}
              <div style={{
                background: isLight ? '#FFFBEB' : 'rgba(217, 119, 6, 0.08)',
                border: '1px solid #F59E0B',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '16px',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: isLight ? '#92400E' : '#FCD34D', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={18} />
                  Actions d'Administration & Contrôle Manuel du Compte
                </h3>
                <p style={{ fontSize: '12.5px', color: isLight ? '#78350F' : '#FDE68A', margin: '0 0 16px 0' }}>
                  Toute action sur ce compte exigera une confirmation explicite avec motif obligatoire et sera consignée dans le journal d'audit immuable.
                </p>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {identity.isSuspended ? (
                    <button
                      onClick={() => setActionType('reactivate')}
                      style={{ background: '#10B981', color: '#FFFFFF', border: 'none', padding: '9px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <CheckCircle size={15} />
                      Réactiver le Compte
                    </button>
                  ) : (
                    <button
                      onClick={() => setActionType('suspend')}
                      style={{ background: '#EF4444', color: '#FFFFFF', border: 'none', padding: '9px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <XCircle size={15} />
                      Suspendre le Compte
                    </button>
                  )}

                  {identity.securityLocked ? (
                    <button
                      onClick={() => setActionType('security_unlock')}
                      style={{ background: '#0284C7', color: '#FFFFFF', border: 'none', padding: '9px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Unlock size={15} />
                      Déverrouiller Sécurité
                    </button>
                  ) : (
                    <button
                      onClick={() => setActionType('security_lock')}
                      style={{ background: '#DC2626', color: '#FFFFFF', border: 'none', padding: '9px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Lock size={15} />
                      Bloquer pour Sécurité
                    </button>
                  )}

                  <button
                    onClick={() => setActionType('extend_subscription')}
                    style={{ background: '#4F46E5', color: '#FFFFFF', border: 'none', padding: '9px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <PlusCircle size={15} />
                    Prolonger l'Abonnement
                  </button>

                  <button
                    onClick={() => setActionType('change_plan')}
                    style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '9px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CreditCard size={15} />
                    Modifier la Formule
                  </button>

                  <button
                    onClick={() => setActionType('cancel_subscription')}
                    style={{ background: '#64748B', color: '#FFFFFF', border: 'none', padding: '9px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <AlertTriangle size={15} />
                    Résilier l'Abonnement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET B : ABONNEMENT & CHRONOLOGIE */}
          {activeTab === 'subscription' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: textSecondary, fontSize: '11px', fontWeight: 700 }}>FORMULE ACTUELLE</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: textPrimary, marginTop: '6px' }}>{subscriptionInfo.currentPlan}</div>
                  <div style={{ color: '#2563EB', fontSize: '12px', marginTop: '4px' }}>
                    {subscriptionInfo.catalogPriceMonthly} XAF / mois
                  </div>
                </div>

                <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: textSecondary, fontSize: '11px', fontWeight: 700 }}>ÉCHÉANCE RESTANTE</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: subscriptionInfo.daysRemaining !== null && subscriptionInfo.daysRemaining <= 3 ? '#EF4444' : '#10B981', marginTop: '6px' }}>
                    {subscriptionInfo.daysRemaining !== null ? `${subscriptionInfo.daysRemaining} jours restants` : 'Illimité'}
                  </div>
                  <div style={{ color: textSecondary, fontSize: '12px', marginTop: '4px' }}>
                    Fin : {subscriptionInfo.endDate ? new Date(subscriptionInfo.endDate).toLocaleDateString('fr-FR') : 'Non définie'}
                  </div>
                </div>

                <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: textSecondary, fontSize: '11px', fontWeight: 700 }}>RENOUVELLEMENTS</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: textPrimary, marginTop: '6px' }}>
                    {subscriptionInfo.renewalCount} fois
                  </div>
                  <div style={{ color: textSecondary, fontSize: '12px', marginTop: '4px' }}>
                    Dernier : {subscriptionInfo.lastRenewedAt ? new Date(subscriptionInfo.lastRenewedAt).toLocaleDateString('fr-FR') : 'Aucun'}
                  </div>
                </div>

                <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: textSecondary, fontSize: '11px', fontWeight: 700 }}>DURÉE D'UTILISATION</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: textPrimary, marginTop: '6px' }}>
                    {subscriptionInfo.totalUsageDays} jours
                  </div>
                  <div style={{ color: textSecondary, fontSize: '12px', marginTop: '4px' }}>
                    Inscrit depuis {Math.round(subscriptionInfo.totalUsageDays / 30)} mois
                  </div>
                </div>
              </div>

              {/* CHRONOLOGIE DE LA VIE DE L'ABONNEMENT */}
              <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={16} color="#2563EB" />
                  Chronologie Complète de la Vie de l'Abonnement
                </h3>

                {subscriptionInfo.eventsTimeline.length === 0 ? (
                  <div style={{ color: textSecondary, fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                    Aucun événement de cycle de vie enregistré pour cet abonnement.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {subscriptionInfo.eventsTimeline.map((ev: any) => (
                      <div key={ev.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2563EB', marginTop: '6px' }} />
                        <div style={{ flex: 1, borderBottom: `1px solid ${borderCol}`, paddingBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: textPrimary, fontSize: '13px' }}>
                              Événement : <code style={{ color: '#2563EB' }}>{ev.eventType}</code>
                            </strong>
                            <span style={{ color: textSecondary, fontSize: '11.5px' }}>
                              {new Date(ev.createdAt).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          {ev.metadata && (
                            <div style={{ fontSize: '12px', color: textSecondary, marginTop: '4px' }}>
                              {JSON.stringify(ev.metadata)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ONGLET C : HISTORIQUE FINANCIER & CARTE DE RENTABILITÉ INDIVIDUELLE */}
          {activeTab === 'financial' && (
            <div>
              {/* CARTE PARTICULIÈREMENT VISIBLE : RENTABILITÉ DE L'UTILISATEUR */}
              <div style={{
                background: isLight ? 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)' : 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)',
                border: '2px solid #2563EB',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.15)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      ANALYSE ÉCONOMIQUE & MARGE
                    </span>
                    <h2 style={{ fontSize: '22px', fontWeight: 900, color: textPrimary, margin: '4px 0 8px 0' }}>
                      RENTABILITÉ DE L'UTILISATEUR
                    </h2>
                    <p style={{ fontSize: '12.5px', color: textSecondary, margin: 0, maxWidth: '600px' }}>
                      {financialHistory.profitabilityCard.note}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: textSecondary, fontWeight: 600 }}>CONTRIBUTION FINANCIÈRE NETTE ESTIMÉE</div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: financialHistory.estimatedContribution >= 0 ? '#10B981' : '#EF4444', letterSpacing: '-0.02em' }}>
                      {financialHistory.estimatedContribution.toLocaleString()} XAF
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '20px' }}>
                  <div style={{ background: cardBg, padding: '14px', borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                    <div style={{ fontSize: '11px', color: textSecondary }}>Chiffre d'Affaires Brut</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: textPrimary, marginTop: '4px' }}>
                      {financialHistory.totalConfirmedPayments.toLocaleString()} XAF
                    </div>
                  </div>

                  <div style={{ background: cardBg, padding: '14px', borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                    <div style={{ fontSize: '11px', color: '#EF4444' }}>− Frais Opérateur & Remboursements</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>
                      {(financialHistory.totalProviderFees + financialHistory.totalRefunds).toLocaleString()} XAF
                    </div>
                  </div>

                  <div style={{ background: cardBg, padding: '14px', borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                    <div style={{ fontSize: '11px', color: '#2563EB' }}>= Revenu Net Encaissé</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
                      {financialHistory.netRevenue.toLocaleString()} XAF
                    </div>
                  </div>

                  <div style={{ background: cardBg, padding: '14px', borderRadius: '10px', border: `1px solid ${borderCol}` }}>
                    <div style={{ fontSize: '11px', color: textSecondary }}>− CAC & Coûts Variables Support</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: textPrimary, marginTop: '4px' }}>
                      {(financialHistory.knownCac + financialHistory.supportCost).toLocaleString()} XAF
                    </div>
                  </div>
                </div>
              </div>

              {/* TABLEAU DES PAIEMENTS CONFIRMÉS */}
              <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, margin: '0 0 16px 0' }}>
                  Grand Livre des Paiements ({financialHistory.paymentsList.length} transactions)
                </h3>

                {financialHistory.paymentsList.length === 0 ? (
                  <div style={{ color: textSecondary, textAlign: 'center', padding: '20px', fontSize: '13px' }}>
                    Aucun paiement enregistré pour ce commerçant.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${borderCol}`, color: textSecondary }}>
                          <th style={{ padding: '8px 12px' }}>Référence</th>
                          <th style={{ padding: '8px 12px' }}>Montant</th>
                          <th style={{ padding: '8px 12px' }}>Passerelle</th>
                          <th style={{ padding: '8px 12px' }}>Statut</th>
                          <th style={{ padding: '8px 12px' }}>Frais Opérateur</th>
                          <th style={{ padding: '8px 12px' }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialHistory.paymentsList.map((p: any) => (
                          <tr key={p.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{p.reference}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: textPrimary }}>{p.amount.toLocaleString()} {p.currency}</td>
                            <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>{p.provider} ({p.method})</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                background: p.status === 'completed' ? '#ECFDF5' : '#FEF2F2',
                                color: p.status === 'completed' ? '#059669' : '#DC2626',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}>
                                {p.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#EF4444' }}>− {p.providerFee} XAF</td>
                            <td style={{ padding: '10px 12px', color: textSecondary }}>{new Date(p.createdAt).toLocaleDateString('fr-FR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ONGLET D : ACTIVITÉ RÉELLE SUR COMMERCIA */}
          {activeTab === 'activity' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: textSecondary, fontSize: '11px', fontWeight: 700 }}>VENTES ENREGISTRÉES</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: textPrimary, marginTop: '6px' }}>
                    {platformActivity.salesCount} ventes
                  </div>
                  <div style={{ color: '#10B981', fontSize: '12px', marginTop: '4px', fontWeight: 600 }}>
                    GMV : {platformActivity.salesGmv.toLocaleString()} XAF
                  </div>
                </div>

                <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: textSecondary, fontSize: '11px', fontWeight: 700 }}>PRODUITS CRÉÉS</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: textPrimary, marginTop: '6px' }}>
                    {platformActivity.productsCount} articles
                  </div>
                  <div style={{ color: textSecondary, fontSize: '12px', marginTop: '4px' }}>
                    Catalogue en stock
                  </div>
                </div>

                <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: textSecondary, fontSize: '11px', fontWeight: 700 }}>DÉPENSES DU COMMERCE</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: textPrimary, marginTop: '6px' }}>
                    {platformActivity.expensesCount} dépenses
                  </div>
                  <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', fontWeight: 600 }}>
                    Volume : {platformActivity.expensesVolume.toLocaleString()} XAF
                  </div>
                </div>

                <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ color: textSecondary, fontSize: '11px', fontWeight: 700 }}>CLIENTS & DETTES GÉRÉS</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: textPrimary, marginTop: '6px' }}>
                    {platformActivity.customersCount} clients
                  </div>
                  <div style={{ color: textSecondary, fontSize: '12px', marginTop: '4px' }}>
                    Livraisons : {platformActivity.deliveriesCount}
                  </div>
                </div>
              </div>

              {/* MODULES LES PLUS UTILISÉS & FRÉQUENCE */}
              <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, margin: '0 0 16px 0' }}>
                  Intensité d'Utilisation & Modules Préférentiels
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: textSecondary }}>
                    Fréquence d'utilisation détectée : <strong style={{ color: '#2563EB' }}>{platformActivity.usageFrequency}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: textSecondary }}>
                    Dernière activité : <strong>{new Date(platformActivity.lastActivity).toLocaleString('fr-FR')}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {platformActivity.mostUsedModules.map((m: any) => (
                    <div key={m.name} style={{ background: isLight ? '#FFFFFF' : '#0B1120', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 700, color: textPrimary, fontSize: '13px' }}>{m.name}</span>
                      <span style={{ background: '#2563EB', color: '#FFFFFF', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                        {m.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ONGLET E : SUPPORT & INTERACTIONS */}
          {activeTab === 'support' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={16} color="#2563EB" />
                    Feedbacks & Évaluations Envoyés ({supportInteractions.feedbacks.length})
                  </h3>

                  {supportInteractions.feedbacks.length === 0 ? (
                    <div style={{ color: textSecondary, fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                      Aucun retour envoyé par ce commerçant.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {supportInteractions.feedbacks.map((f: any) => (
                        <div key={f.id} style={{ background: isLight ? '#FFFFFF' : '#0B1120', padding: '14px', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 700, color: textPrimary, fontSize: '13px' }}>
                              ⭐ {f.rating}/5 — {f.category}
                            </span>
                            <span style={{ fontSize: '11.5px', color: textSecondary }}>{new Date(f.createdAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: textSecondary }}>{f.comment}</p>
                          {f.responseMessage && (
                            <div style={{ background: isLight ? '#EFF6FF' : 'rgba(37,99,235,0.1)', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#2563EB' }}>
                              <strong>Réponse Admin :</strong> {f.responseMessage}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Send size={16} color="#10B981" />
                    Messages & Notifications Reçus ({supportInteractions.communications.length})
                  </h3>

                  {supportInteractions.communications.length === 0 ? (
                    <div style={{ color: textSecondary, fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                      Aucune communication administrative envoyée à cet utilisateur.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {supportInteractions.communications.map((c: any) => (
                        <div key={c.id} style={{ background: isLight ? '#FFFFFF' : '#0B1120', padding: '14px', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ color: textPrimary, fontSize: '13px' }}>{c.title}</strong>
                            <span style={{ fontSize: '11.5px', color: textSecondary }}>{new Date(c.sentAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '12.5px', color: textSecondary }}>{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL DE CONFIRMATION D'ACTION SENSIBLE (SECTION 5) */}
        {actionType && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}>
            <div style={{
              background: modalBg,
              border: '2px solid #EF4444',
              borderRadius: '14px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: textPrimary, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="#EF4444" />
                Confirmation de l'Action Administrative : {actionType.toUpperCase()}
              </h3>
              <p style={{ fontSize: '12.5px', color: textSecondary, marginBottom: '16px' }}>
                Conformément aux normes d'audit, vous devez obligatoirement renseigner le motif de cette opération.
              </p>

              {actionType === 'extend_subscription' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                    Nombre de jours de prolongation :
                  </label>
                  <input
                    type="number"
                    value={extensionDays}
                    onChange={(e) => setExtensionDays(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: cardBg, color: textPrimary, outline: 'none' }}
                  />
                </div>
              )}

              {actionType === 'change_plan' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                    Nouvelle formule à attribuer :
                  </label>
                  <select
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: cardBg, color: textPrimary, outline: 'none' }}
                  >
                    <option value="free">Gratuit</option>
                    <option value="pro">Pro (4 500 XAF/m)</option>
                    <option value="business">Business (12 000 XAF/m)</option>
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                  Motif de l'opération (Obligatoire) :
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Demande de régularisation par le commerçant, suspicion de fraude, etc."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: cardBg, color: textPrimary, outline: 'none', resize: 'none', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setActionType(null);
                    setActionReason('');
                  }}
                  disabled={isSubmittingAction}
                  style={{ background: 'transparent', border: `1px solid ${borderCol}`, color: textSecondary, padding: '9px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleExecuteAction}
                  disabled={isSubmittingAction || !actionReason.trim()}
                  style={{ background: '#EF4444', border: 'none', color: '#FFFFFF', padding: '9px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSubmittingAction ? 'Exécution...' : 'Confirmer l\'Opération'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE RÉDACTION D'UN MESSAGE INDIVIDUEL (SECTION 7.1) */}
        {showMessageModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}>
            <form onSubmit={handleSendDirectMessage} style={{
              background: modalBg,
              border: `1px solid ${borderCol}`,
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: textPrimary, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} color="#2563EB" />
                Envoyer un Message à {identity.fullName}
              </h3>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                  Canal de diffusion :
                </label>
                <select
                  value={directMsgChannel}
                  onChange={(e) => setDirectMsgChannel(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: cardBg, color: textPrimary, outline: 'none' }}
                >
                  <option value="internal_notification">Notification Interne COMMERCIA</option>
                  <option value="email">Courrier Électronique (Email)</option>
                  <option value="sms">SMS Direct (si configuré)</option>
                  <option value="whatsapp">WhatsApp Business API</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                  Objet / Titre du message :
                </label>
                <input
                  type="text"
                  placeholder="Ex: Information importante sur votre abonnement"
                  value={directMsgTitle}
                  onChange={(e) => setDirectMsgTitle(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: cardBg, color: textPrimary, outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                  Contenu du message :
                </label>
                <textarea
                  rows={5}
                  placeholder="Rédigez votre message personnalisé..."
                  value={directMsgContent}
                  onChange={(e) => setDirectMsgContent(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: cardBg, color: textPrimary, outline: 'none', resize: 'none', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  style={{ background: 'transparent', border: `1px solid ${borderCol}`, color: textSecondary, padding: '9px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSendingMsg}
                  style={{ background: '#2563EB', border: 'none', color: '#FFFFFF', padding: '9px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSendingMsg ? 'Envoi...' : 'Transmettre le Message'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
