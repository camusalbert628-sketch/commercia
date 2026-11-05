import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Layers,
  History,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail,
  Smartphone,
  Sparkles,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Flame,
  Info,
  AlertTriangle,
  UserCheck,
  Radio,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api';

interface CommunicationViewProps {
  adminTheme: 'light' | 'dark';
}

interface MerchantUser {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  businessName: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
}

interface HistoryItem {
  id: string;
  type: string;
  targetAudience?: string;
  importance: 'info' | 'important' | 'urgent';
  channel: string;
  title: string;
  content: string;
  status: string;
  recipientCount: number;
  readCount: number;
  unreadCount: number;
  readRate: number;
  createdAt: string;
  recipient?: { id: string; email: string; firstName: string; lastName: string };
}

interface RecipientDetail {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  businessName: string;
  plan: string;
  status: 'unread' | 'read';
  deliveredAt: string;
  readAt: string | null;
}

export const CommunicationView: React.FC<CommunicationViewProps> = ({ adminTheme }) => {
  // Navigation par modes et fonctionnalités
  const [activeTab, setActiveTab] = useState<'mode_a' | 'mode_b' | 'mode_c' | 'templates' | 'history'>('mode_a');

  // Destinataires réels chargés depuis la base de données
  const [usersList, setUsersList] = useState<MerchantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  // Recherche & Filtres pour la sélection des utilisateurs
  const [userSearch, setUserSearch] = useState<string>('');
  const [userPlanFilter, setUserPlanFilter] = useState<string>('all');

  // MODE A — Message Personnel
  const [selectedUserA, setSelectedUserA] = useState<MerchantUser | null>(null);

  // MODE B — Message Groupé
  const [selectedUserIdsB, setSelectedUserIdsB] = useState<string[]>([]);

  // Formulaire d'édition partagé
  const [messageTitle, setMessageTitle] = useState<string>('');
  const [messageContent, setMessageContent] = useState<string>('');
  const [importance, setImportance] = useState<'info' | 'important' | 'urgent'>('info');
  const [channel, setChannel] = useState<string>('internal_notification');
  const [previewMode, setPreviewMode] = useState<boolean>(false);

  // MODE C — Confirmation d'annonce générale
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState<boolean>(false);

  // Modèles
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);

  // Historique & Suivi
  const [historyMessages, setHistoryMessages] = useState<HistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Modale de suivi détaillé d'un message
  const [selectedHistoryMsg, setSelectedHistoryMsg] = useState<HistoryItem | null>(null);
  const [historyRecipients, setHistoryRecipients] = useState<RecipientDetail[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // 1. Charger la liste des utilisateurs marchands réels
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get<{ users: MerchantUser[]; total: number }>('/admin/communication/users');
      setUsersList(res.users || []);
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // 2. Charger les modèles
  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await api.get<any>('/admin/communication/templates');
      setTemplates(res.templates || []);
    } catch (_) {}
    finally {
      setLoadingTemplates(false);
    }
  }, []);

  // 3. Charger l'historique
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get<any>('/admin/communication/history');
      setHistoryMessages(res.messages || []);
      setHistoryTotal(res.total || 0);
    } catch (_) {}
    finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadTemplates();
    loadHistory();
  }, [loadUsers, loadTemplates, loadHistory]);

  // Filtrage local dynamique des utilisateurs
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      if (userPlanFilter !== 'all' && u.plan.toLowerCase() !== userPlanFilter.toLowerCase()) {
        return false;
      }
      if (!userSearch.trim()) return true;
      const s = userSearch.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.businessName.toLowerCase().includes(s) ||
        u.id.toLowerCase().includes(s) ||
        (u.phone && u.phone.includes(s))
      );
    });
  }, [usersList, userSearch, userPlanFilter]);

  // Sélectionner / Désélectionner tous les utilisateurs visibles pour le Mode B
  const handleToggleSelectAllB = () => {
    const visibleIds = filteredUsers.map((u) => u.id);
    const allSelected = visibleIds.every((id) => selectedUserIdsB.includes(id));
    if (allSelected) {
      setSelectedUserIdsB((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedUserIdsB((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleUserB = (id: string) => {
    setSelectedUserIdsB((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Appliquer un modèle
  const handleApplyTemplate = (tpl: any) => {
    setMessageTitle(tpl.title);
    setMessageContent(tpl.content);
    showToast(`Modèle "${tpl.name}" inséré dans l'éditeur.`);
  };

  // Réinitialiser les champs de saisie
  const resetForm = () => {
    setMessageTitle('');
    setMessageContent('');
    setImportance('info');
    setPreviewMode(false);
  };

  // ENVOI — MODE A (Message Personnel)
  const handleSendModeA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserA) {
      alert('Veuillez sélectionner un commerçant destinataire.');
      return;
    }
    if (!messageTitle.trim() || !messageContent.trim()) {
      alert('Veuillez renseigner un objet et un contenu de message.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<any>('/admin/communication/send-individual', {
        userId: selectedUserA.id,
        title: messageTitle.trim(),
        content: messageContent.trim(),
        importance,
        channel,
      });

      showToast(res.message || 'Message personnel transmis avec succès !');
      resetForm();
      setSelectedUserA(null);
      loadHistory();
      setActiveTab('history');
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'envoi du message personnel");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ENVOI — MODE B (Message Groupé)
  const handleSendModeB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIdsB.length === 0) {
      alert('Veuillez cocher au moins un utilisateur destinataire dans la liste.');
      return;
    }
    if (!messageTitle.trim() || !messageContent.trim()) {
      alert('Veuillez renseigner un objet et un contenu de message.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<any>('/admin/communication/send-group', {
        userIds: selectedUserIdsB,
        title: messageTitle.trim(),
        content: messageContent.trim(),
        importance,
        channel,
      });

      showToast(res.message || 'Message groupé expédié avec succès !');
      resetForm();
      setSelectedUserIdsB([]);
      loadHistory();
      setActiveTab('history');
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'envoi du message groupé");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ENVOI — MODE C (Annonce Générale)
  const handleSendModeC = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      alert('Veuillez renseigner un objet et un contenu pour l’annonce générale.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<any>('/admin/communication/send-broadcast', {
        title: messageTitle.trim(),
        content: messageContent.trim(),
        importance,
        channel,
        confirmAll: true,
      });

      setShowBroadcastConfirm(false);
      showToast(res.message || 'Annonce générale diffusée à tous les utilisateurs !');
      resetForm();
      loadHistory();
      setActiveTab('history');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la diffusion générale');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ouvrir le détail des destinataires d'un message envoyé
  const handleOpenRecipientsDrilldown = async (msg: HistoryItem) => {
    setSelectedHistoryMsg(msg);
    setLoadingRecipients(true);
    try {
      const res = await api.get<any>(`/admin/communication/messages/${msg.id}/recipients`);
      setHistoryRecipients(res.recipients || []);
    } catch (err) {
      console.error('Erreur chargement détails destinataires:', err);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const isLight = adminTheme === 'light';
  const cardBg = isLight ? '#FFFFFF' : '#0F172A';
  const borderCol = isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)';
  const textPrimary = isLight ? '#1E293B' : '#F8FAFC';
  const textSecondary = isLight ? '#64748B' : '#94A3B8';

  return (
    <div>
      {/* EN-TÊTE PRINCIPAL DU MODULE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={22} color="#0062FF" />
            Messagerie & Communications
          </h2>
          <p style={{ color: textSecondary, fontSize: '13px', marginTop: '4px', margin: 0 }}>
            Gestion des communications directes avec les commerçants : messages personnels, envois groupés, annonces générales et suivi de lecture.
          </p>
        </div>
      </div>

      {toastMessage && (
        <div style={{ background: '#ECFDF5', borderLeft: '4px solid #10B981', color: '#047857', padding: '12px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, marginBottom: '20px', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)' }}>
          ✓ {toastMessage}
        </div>
      )}

      {/* NAVIGATION ENTRE LES MODES ET FONCTIONNALITÉS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '22px', borderBottom: `1px solid ${borderCol}`, paddingBottom: '14px', flexWrap: 'wrap' }}>
        {[
          { id: 'mode_a', label: 'Mode A : Message Personnel', icon: Send, badge: null },
          { id: 'mode_b', label: 'Mode B : Message Groupé', icon: Users, badge: selectedUserIdsB.length > 0 ? `${selectedUserIdsB.length}` : null },
          { id: 'mode_c', label: 'Mode C : Annonce Générale', icon: Layers, badge: `${usersList.length} marchands` },
          { id: 'templates', label: 'Modèles de messages', icon: Sparkles, badge: null },
          { id: 'history', label: 'Historique & Suivi des Lectures', icon: History, badge: `${historyTotal}` },
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
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? '#0062FF' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.05)',
                color: isActive ? '#FFFFFF' : textSecondary,
                fontWeight: isActive ? 800 : 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={15} />
              {tab.label}
              {tab.badge && (
                <span
                  style={{
                    background: isActive ? '#FFFFFF' : '#0062FF',
                    color: isActive ? '#0062FF' : '#FFFFFF',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    fontSize: '10px',
                    fontWeight: 800,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODE A — MESSAGE PERSONNEL */}
      {/* ========================================================================= */}
      {activeTab === 'mode_a' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: '22px', alignItems: 'start' }}>
          {/* Colonne gauche : Sélecteur & Recherche du commerçant */}
          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '18px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, margin: '0 0 12px 0' }}>
              1. Choisir le commerçant destinataire
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#F8FAFC' : '#0B1120', marginBottom: '12px' }}>
              <Search size={15} color="#94A3B8" />
              <input
                type="text"
                placeholder="Rechercher par nom, email, boutique..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '100%', color: textPrimary }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              {['all', 'free', 'pro', 'business'].map((p) => (
                <button
                  key={p}
                  onClick={() => setUserPlanFilter(p)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: userPlanFilter === p ? '#0062FF' : isLight ? '#E2E8F0' : '#1E293B',
                    color: userPlanFilter === p ? '#FFFFFF' : textSecondary,
                    textTransform: 'capitalize',
                  }}
                >
                  {p === 'all' ? 'Tous' : p}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {filteredUsers.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: textSecondary, fontSize: '12px' }}>
                  Aucun commerçant correspondant.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserA?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUserA(u)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        marginBottom: '6px',
                        cursor: 'pointer',
                        border: `1px solid ${isSelected ? '#0062FF' : borderCol}`,
                        background: isSelected ? (isLight ? '#EFF6FF' : 'rgba(0,98,255,0.15)') : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: textPrimary }}>
                          {u.fullName}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: u.plan === 'business' ? '#7C3AED' : u.plan === 'pro' ? '#0062FF' : '#64748B',
                            color: '#FFFFFF',
                            textTransform: 'uppercase',
                          }}
                        >
                          {u.plan}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#0062FF', fontWeight: 600, marginTop: '2px' }}>
                        {u.businessName}
                      </div>
                      <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>
                        {u.email}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Colonne droite : Rédacteur & Éditeur Professionnel */}
          <form onSubmit={handleSendModeA} style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: textPrimary, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={18} color="#0062FF" />
              2. Rédiger le Message Personnel
            </h3>

            {selectedUserA ? (
              <div style={{ padding: '12px 14px', borderRadius: '8px', background: isLight ? '#EFF6FF' : 'rgba(0,98,255,0.12)', border: '1px solid #BFDBFE', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: textSecondary }}>Destinataire sélectionné :</div>
                  <strong style={{ fontSize: '13.5px', color: '#1E3A8A' }}>
                    {selectedUserA.fullName} ({selectedUserA.businessName})
                  </strong>
                  <div style={{ fontSize: '11.5px', color: textSecondary }}>{selectedUserA.email} • Forfait : {selectedUserA.plan.toUpperCase()}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserA(null)}
                  style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                >
                  ✕ Changer
                </button>
              </div>
            ) : (
              <div style={{ padding: '12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
                ⚠️ Veuillez cliquer sur un commerçant dans la colonne de gauche pour lui envoyer un message personnel.
              </div>
            )}

            {/* Degré d'importance */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                Niveau d'importance / Priorité :
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  { id: 'info', label: 'Information (Normal)', color: '#2563EB', bg: '#EFF6FF' },
                  { id: 'important', label: 'Important', color: '#D97706', bg: '#FEF3C7' },
                  { id: 'urgent', label: 'Urgent (Prioritaire)', color: '#DC2626', bg: '#FEE2E2' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setImportance(item.id as any)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `2px solid ${importance === item.id ? item.color : borderCol}`,
                      background: importance === item.id ? item.bg : 'transparent',
                      color: importance === item.id ? item.color : textSecondary,
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Objet du message */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                Objet / Titre du message :
              </label>
              <input
                type="text"
                placeholder="Ex: Information relative à votre compte COMMERCIA"
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none' }}
              />
            </div>

            {/* Contenu avec onglet Éditer / Prévisualiser */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary }}>
                  Contenu du message (supporte sauts de ligne, listes et mise en forme) :
                </label>
                <button
                  type="button"
                  onClick={() => setPreviewMode(!previewMode)}
                  style={{ background: 'transparent', border: 'none', color: '#0062FF', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {previewMode ? <><EyeOff size={14} /> Revenir à l'éditeur</> : <><Eye size={14} /> Prévisualiser le rendu</>}
                </button>
              </div>

              {previewMode ? (
                <div style={{ padding: '16px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#F8FAFC' : '#0B1120', minHeight: '160px', fontSize: '13px', color: textPrimary, whiteSpace: 'pre-line' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '10px', color: '#0062FF' }}>
                    {messageTitle || 'Sans titre'}
                  </div>
                  {messageContent || '(Aucun contenu rédigé pour le moment)'}
                </div>
              ) : (
                <textarea
                  rows={8}
                  placeholder="Rédigez le texte du message personnel ici..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none', resize: 'vertical' }}
                />
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedUserA}
              style={{
                background: !selectedUserA ? '#94A3B8' : '#0062FF',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: !selectedUserA ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Send size={16} />
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer le message personnel'}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE B — MESSAGE GROUPÉ */}
      {/* ========================================================================= */}
      {activeTab === 'mode_b' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 460px) 1fr', gap: '22px', alignItems: 'start' }}>
          {/* Colonne gauche : Sélecteur multiple avec cases à cocher */}
          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, margin: 0 }}>
                1. Sélectionner les destinataires
              </h3>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0062FF', background: isLight ? '#EFF6FF' : 'rgba(0,98,255,0.15)', padding: '2px 8px', borderRadius: '999px' }}>
                {selectedUserIdsB.length} sélectionné(s)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#F8FAFC' : '#0B1120', marginBottom: '12px' }}>
              <Search size={15} color="#94A3B8" />
              <input
                type="text"
                placeholder="Rechercher des destinataires..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '100%', color: textPrimary }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['all', 'free', 'pro', 'business'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setUserPlanFilter(p)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: userPlanFilter === p ? '#0062FF' : isLight ? '#E2E8F0' : '#1E293B',
                      color: userPlanFilter === p ? '#FFFFFF' : textSecondary,
                      textTransform: 'capitalize',
                    }}
                  >
                    {p === 'all' ? 'Tous' : p}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleToggleSelectAllB}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0062FF',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIdsB.includes(u.id))
                  ? 'Tout désélectionner'
                  : 'Tout sélectionner'}
              </button>
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {filteredUsers.map((u) => {
                const isChecked = selectedUserIdsB.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => handleToggleUserB(u.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      marginBottom: '6px',
                      cursor: 'pointer',
                      border: `1px solid ${isChecked ? '#0062FF' : borderCol}`,
                      background: isChecked ? (isLight ? '#EFF6FF' : 'rgba(0,98,255,0.12)') : 'transparent',
                    }}
                  >
                    {isChecked ? (
                      <CheckSquare size={18} color="#0062FF" />
                    ) : (
                      <Square size={18} color="#94A3B8" />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.fullName}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: u.plan === 'business' ? '#7C3AED' : u.plan === 'pro' ? '#0062FF' : '#64748B',
                            color: '#FFFFFF',
                            textTransform: 'uppercase',
                          }}
                        >
                          {u.plan}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.businessName} • {u.email}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Colonne droite : Formulaire groupe */}
          <form onSubmit={handleSendModeB} style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: textPrimary, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#0062FF" />
              2. Rédiger le Message Groupé
            </h3>

            <div style={{ padding: '12px 14px', borderRadius: '8px', background: isLight ? '#F8FAFC' : '#0B1120', border: `1px solid ${borderCol}`, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', color: textSecondary }}>Destinataires ciblés :</span>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0062FF' }}>
                  {selectedUserIdsB.length} commerçant(s) sélectionné(s)
                </div>
              </div>
              {selectedUserIdsB.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedUserIdsB([])}
                  style={{ background: 'transparent', border: 'none', color: '#DC2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Vider la sélection
                </button>
              )}
            </div>

            {/* Degré d'importance */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                Niveau d'importance / Priorité :
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  { id: 'info', label: 'Information (Normal)', color: '#2563EB', bg: '#EFF6FF' },
                  { id: 'important', label: 'Important', color: '#D97706', bg: '#FEF3C7' },
                  { id: 'urgent', label: 'Urgent (Prioritaire)', color: '#DC2626', bg: '#FEE2E2' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setImportance(item.id as any)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `2px solid ${importance === item.id ? item.color : borderCol}`,
                      background: importance === item.id ? item.bg : 'transparent',
                      color: importance === item.id ? item.color : textSecondary,
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Objet */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                Objet / Titre du message groupé :
              </label>
              <input
                type="text"
                placeholder="Ex: Mise à jour importante relative à votre activité"
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none' }}
              />
            </div>

            {/* Corps */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary }}>
                  Corps du message :
                </label>
                <button
                  type="button"
                  onClick={() => setPreviewMode(!previewMode)}
                  style={{ background: 'transparent', border: 'none', color: '#0062FF', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {previewMode ? <><EyeOff size={14} /> Revenir à l'éditeur</> : <><Eye size={14} /> Prévisualiser</>}
                </button>
              </div>

              {previewMode ? (
                <div style={{ padding: '16px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#F8FAFC' : '#0B1120', minHeight: '160px', fontSize: '13px', color: textPrimary, whiteSpace: 'pre-line' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '10px', color: '#0062FF' }}>
                    {messageTitle || 'Sans titre'}
                  </div>
                  {messageContent || '(Aucun contenu rédigé pour le moment)'}
                </div>
              ) : (
                <textarea
                  rows={8}
                  placeholder="Rédigez le contenu du message groupé..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none', resize: 'vertical' }}
                />
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || selectedUserIdsB.length === 0}
              style={{
                background: selectedUserIdsB.length === 0 ? '#94A3B8' : '#0062FF',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: selectedUserIdsB.length === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Send size={16} />
              {isSubmitting ? 'Envoi en cours...' : `Envoyer aux ${selectedUserIdsB.length} commerçant(s)`}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE C — ANNONCE GÉNÉRALE À TOUS LES UTILISATEURS */}
      {/* ========================================================================= */}
      {activeTab === 'mode_c' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                <Layers size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: textPrimary, margin: 0 }}>
                  ENVOI GROUPÉ — TOUS LES UTILISATEURS
                </h3>
                <p style={{ fontSize: '12.5px', color: textSecondary, margin: '2px 0 0 0' }}>
                  Ce mode diffuse l'annonce générale à la totalité des {usersList.length} commerçants actifs enregistrés dans Neon PostgreSQL.
                </p>
              </div>
            </div>

            <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E', fontSize: '12.5px', marginBottom: '20px' }}>
              <strong>⚠️ Avertissement de sécurité administrative :</strong> Cette action génère un enregistrement pour chaque commerçant actif et déclenchera la bannière d'alerte sur leur tableau de bord.
            </div>

            {/* Degré d'importance */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                Niveau de priorité :
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  { id: 'info', label: 'Information Générale', color: '#2563EB', bg: '#EFF6FF' },
                  { id: 'important', label: 'Important', color: '#D97706', bg: '#FEF3C7' },
                  { id: 'urgent', label: 'Urgent / Critique', color: '#DC2626', bg: '#FEE2E2' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setImportance(item.id as any)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `2px solid ${importance === item.id ? item.color : borderCol}`,
                      background: importance === item.id ? item.bg : 'transparent',
                      color: importance === item.id ? item.color : textSecondary,
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Objet */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                Objet / Titre de l'annonce générale :
              </label>
              <input
                type="text"
                placeholder="Ex: Nouvelles fonctionnalités disponibles sur COMMERCIA !"
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none' }}
              />
            </div>

            {/* Corps */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary }}>
                  Corps du message :
                </label>
                <button
                  type="button"
                  onClick={() => setPreviewMode(!previewMode)}
                  style={{ background: 'transparent', border: 'none', color: '#0062FF', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {previewMode ? <><EyeOff size={14} /> Revenir à l'éditeur</> : <><Eye size={14} /> Prévisualiser</>}
                </button>
              </div>

              {previewMode ? (
                <div style={{ padding: '16px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#F8FAFC' : '#0B1120', minHeight: '160px', fontSize: '13px', color: textPrimary, whiteSpace: 'pre-line' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '10px', color: '#0062FF' }}>
                    {messageTitle || 'Sans titre'}
                  </div>
                  {messageContent || '(Aucun contenu rédigé pour le moment)'}
                </div>
              ) : (
                <textarea
                  rows={8}
                  placeholder="Rédigez le texte complet de votre annonce générale..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none', resize: 'vertical' }}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!messageTitle.trim() || !messageContent.trim()) {
                  alert('Veuillez renseigner un objet et un contenu.');
                  return;
                }
                setShowBroadcastConfirm(true);
              }}
              disabled={isSubmitting}
              style={{
                background: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Send size={16} />
              Diffuser à tous les {usersList.length} commerçants
            </button>
          </div>

          {/* Dialogue modal de confirmation d'annonce générale */}
          {showBroadcastConfirm && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '16px',
              }}
            >
              <div
                style={{
                  background: cardBg,
                  borderRadius: '16px',
                  maxWidth: '520px',
                  width: '100%',
                  padding: '24px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                  border: `1px solid ${borderCol}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: textPrimary }}>
                      Confirmer la diffusion générale
                    </h3>
                    <div style={{ fontSize: '12px', color: textSecondary }}>
                      Action globale irréversible
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: textSecondary, lineHeight: 1.5, marginBottom: '16px' }}>
                  Êtes-vous absolument certain de vouloir expédier ce message à l'ensemble des <strong>{usersList.length} commerçants</strong> actifs de la plateforme ?
                </p>

                <div style={{ padding: '12px', borderRadius: '8px', background: isLight ? '#F8FAFC' : '#0B1120', border: `1px solid ${borderCol}`, marginBottom: '20px', fontSize: '12.5px' }}>
                  <div style={{ fontWeight: 700, color: textPrimary, marginBottom: '4px' }}>{messageTitle}</div>
                  <div style={{ color: textSecondary, maxHeight: '80px', overflowY: 'auto', whiteSpace: 'pre-line' }}>{messageContent}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    onClick={() => setShowBroadcastConfirm(false)}
                    disabled={isSubmitting}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '8px',
                      border: `1px solid ${borderCol}`,
                      background: 'transparent',
                      color: textPrimary,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '12.5px',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSendModeC}
                    disabled={isSubmitting}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#DC2626',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '12.5px',
                    }}
                  >
                    {isSubmitting ? 'Diffusion en cours...' : 'Oui, diffuser à tous'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODÈLES DE MESSAGES */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {templates.map((tpl) => (
              <div key={tpl.id} style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0062FF', textTransform: 'uppercase', background: isLight ? '#EFF6FF' : 'rgba(0,98,255,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                      {tpl.category}
                    </span>
                    <button
                      onClick={() => handleApplyTemplate(tpl)}
                      style={{ background: '#0062FF', color: '#FFFFFF', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Utiliser ce modèle
                    </button>
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, margin: '6px 0 10px 0' }}>{tpl.name}</h4>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: textPrimary, marginBottom: '6px' }}>{tpl.title}</div>
                  <p style={{ fontSize: '12px', color: textSecondary, whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                    {tpl.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HISTORIQUE & SUIVI DÉTAILLÉ DES LECTURES */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${borderCol}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, margin: 0 }}>
                Historique des Communications & Suivi des Lectures
              </h3>
              <div style={{ fontSize: '12px', color: textSecondary, marginTop: '2px' }}>
                {historyTotal} communication(s) enregistrée(s) avec métriques de lecture en temps réel.
              </div>
            </div>
            <button
              onClick={() => loadHistory()}
              style={{ background: 'transparent', border: 'none', color: '#0062FF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700 }}
            >
              <RefreshCw size={13} className={loadingHistory ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead style={{ background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)' }}>
                <tr style={{ borderBottom: `1px solid ${borderCol}`, color: textSecondary }}>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                  <th style={{ padding: '12px 14px' }}>Mode d'envoi</th>
                  <th style={{ padding: '12px 14px' }}>Priorité</th>
                  <th style={{ padding: '12px 14px' }}>Objet</th>
                  <th style={{ padding: '12px 14px' }}>Destinataires</th>
                  <th style={{ padding: '12px 14px' }}>Statut de lecture</th>
                  <th style={{ padding: '12px 14px' }}>Taux (% Lu)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyMessages.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: textSecondary }}>
                      Aucune communication envoyée pour le moment.
                    </td>
                  </tr>
                ) : (
                  historyMessages.map((msg) => {
                    const modeLabel =
                      msg.type === 'personal' || msg.type === 'individual'
                        ? 'Personnel'
                        : msg.type === 'group'
                        ? 'Groupé'
                        : 'Annonce Générale';

                    return (
                      <tr key={msg.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                        <td style={{ padding: '12px 14px', color: textSecondary, whiteSpace: 'nowrap' }}>
                          {new Date(msg.createdAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background:
                                msg.type === 'broadcast'
                                  ? '#FEF3C7'
                                  : msg.type === 'group'
                                  ? '#EDE9FE'
                                  : '#EFF6FF',
                              color:
                                msg.type === 'broadcast'
                                  ? '#B45309'
                                  : msg.type === 'group'
                                  ? '#6D28D9'
                                  : '#1D4ED8',
                            }}
                          >
                            {modeLabel}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: msg.importance === 'urgent' ? '#DC2626' : msg.importance === 'important' ? '#D97706' : '#2563EB',
                            }}
                          >
                            {msg.importance === 'urgent' ? '🔴 Urgent' : msg.importance === 'important' ? '⚡ Important' : 'ℹ️ Normal'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: textPrimary, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {msg.title}
                        </td>
                        <td style={{ padding: '12px 14px', color: textSecondary }}>
                          {msg.recipientCount} destinataire(s)
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#16A34A', fontWeight: 700 }}>{msg.readCount} lu(s)</span>
                            <span style={{ color: textSecondary }}>/</span>
                            <span style={{ color: '#DC2626', fontWeight: 700 }}>{msg.unreadCount} non lu(s)</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: isLight ? '#E2E8F0' : '#334155', overflow: 'hidden' }}>
                              <div style={{ width: `${msg.readRate}%`, height: '100%', background: msg.readRate > 50 ? '#10B981' : '#0062FF' }} />
                            </div>
                            <span style={{ fontSize: '11.5px', fontWeight: 800, color: textPrimary }}>
                              {msg.readRate}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenRecipientsDrilldown(msg)}
                            style={{
                              background: isLight ? '#EFF6FF' : 'rgba(0,98,255,0.15)',
                              color: '#0062FF',
                              border: '1px solid #BFDBFE',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            Suivi des lectures →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE DE DRILLDOWN : SUIVI PAR DESTINATAIRE (QUI A LU ET QUAND) */}
      {/* ========================================================================= */}
      {selectedHistoryMsg && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: '16px',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              border: `1px solid ${borderCol}`,
              overflow: 'hidden',
            }}
          >
            {/* Header modal */}
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${borderCol}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: textPrimary }}>
                  Suivi unitaire des réceptions et lectures
                </h3>
                <div style={{ fontSize: '12px', color: '#0062FF', fontWeight: 700, marginTop: '2px' }}>
                  {selectedHistoryMsg.title}
                </div>
              </div>
              <button
                onClick={() => setSelectedHistoryMsg(null)}
                style={{ background: 'transparent', border: 'none', color: textSecondary, cursor: 'pointer', fontSize: '18px', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Corps modal : Liste des destinataires */}
            <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>
              {loadingRecipients ? (
                <div style={{ padding: '40px', textAlign: 'center', color: textSecondary }}>
                  <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                  Chargement des statuts de lecture réels...
                </div>
              ) : historyRecipients.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: textSecondary }}>
                  Aucun détail unitaire disponible pour cette diffusion.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${borderCol}`, color: textSecondary }}>
                      <th style={{ padding: '8px 10px' }}>Commerçant & Boutique</th>
                      <th style={{ padding: '8px 10px' }}>Email</th>
                      <th style={{ padding: '8px 10px' }}>Forfait</th>
                      <th style={{ padding: '8px 10px' }}>Statut</th>
                      <th style={{ padding: '8px 10px' }}>Date de lecture</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecipients.map((rec) => (
                      <tr key={rec.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                        <td style={{ padding: '10px' }}>
                          <strong style={{ color: textPrimary }}>{rec.fullName}</strong>
                          <div style={{ fontSize: '11px', color: textSecondary }}>{rec.businessName}</div>
                        </td>
                        <td style={{ padding: '10px', color: textSecondary }}>
                          {rec.email}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: isLight ? '#F1F5F9' : '#1E293B', color: textPrimary, textTransform: 'uppercase' }}>
                            {rec.plan}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          {rec.status === 'read' ? (
                            <span style={{ color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 800 }}>
                              ✓ Lu
                            </span>
                          ) : (
                            <span style={{ color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 800 }}>
                              Non lu
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px', color: textSecondary }}>
                          {rec.readAt
                            ? new Date(rec.readAt).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer modal */}
            <div style={{ padding: '14px 22px', borderTop: `1px solid ${borderCol}`, background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedHistoryMsg(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: cardBg, color: textPrimary, fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
