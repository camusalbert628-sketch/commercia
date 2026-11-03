import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { api } from '../../services/api';

interface CommunicationViewProps {
  adminTheme: 'light' | 'dark';
}

export const CommunicationView: React.FC<CommunicationViewProps> = ({ adminTheme }) => {
  const [subTab, setSubTab] = useState<'individual' | 'campaign' | 'templates' | 'history'>('campaign');

  // État Message Individuel
  const [merchantsList, setMerchantsList] = useState<any[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [individualTitle, setIndividualTitle] = useState<string>('');
  const [individualContent, setIndividualContent] = useState<string>('');
  const [individualChannel, setIndividualChannel] = useState<string>('internal_notification');

  // État Campagne Collective
  const [campaignAudience, setCampaignAudience] = useState<string>('expiring_7d');
  const [campaignTitle, setCampaignTitle] = useState<string>('');
  const [campaignContent, setCampaignContent] = useState<string>('');
  const [campaignChannel, setCampaignChannel] = useState<string>('internal_notification');
  const [campaignIsPromo, setCampaignIsPromo] = useState<boolean>(false);

  // État Modèles
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);

  // État Historique
  const [historyMessages, setHistoryMessages] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Chargement des marchands pour message individuel
  const loadMerchants = useCallback(async () => {
    try {
      const res = await api.get<any>('/admin/merchants?limit=100');
      setMerchantsList(res.merchants || []);
    } catch (_) {}
  }, []);

  // Chargement des modèles
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

  // Chargement de l'historique
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
    loadMerchants();
    loadTemplates();
    loadHistory();
  }, [loadMerchants, loadTemplates, loadHistory]);

  const handleApplyTemplate = (tpl: any, target: 'individual' | 'campaign') => {
    if (target === 'individual') {
      setIndividualTitle(tpl.title);
      setIndividualContent(tpl.content);
      setIndividualChannel(tpl.defaultChannel);
    } else {
      setCampaignTitle(tpl.title);
      setCampaignContent(tpl.content);
      setCampaignChannel(tpl.defaultChannel);
    }
    showToast(`Modèle "${tpl.name}" inséré.`);
  };

  const handleSendIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipientId || !individualTitle.trim() || !individualContent.trim()) {
      alert('Veuillez renseigner le destinataire, le titre et le contenu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<any>('/admin/communication/send-individual', {
        userId: selectedRecipientId,
        title: individualTitle.trim(),
        content: individualContent.trim(),
        channel: individualChannel,
      });

      showToast(res.message || 'Message individuel expédié avec succès !');
      setIndividualTitle('');
      setIndividualContent('');
      loadHistory();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’envoi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle.trim() || !campaignContent.trim()) {
      alert('Titre et contenu obligatoires pour lancer la campagne.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<any>('/admin/communication/send-campaign', {
        targetAudience: campaignAudience,
        title: campaignTitle.trim(),
        content: campaignContent.trim(),
        channel: campaignChannel,
        isPromo: campaignIsPromo,
      });

      showToast(res.message || 'Campagne collective transmise à l’ensemble de la cible !');
      setCampaignTitle('');
      setCampaignContent('');
      loadHistory();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la diffusion de la campagne');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLight = adminTheme === 'light';
  const cardBg = isLight ? '#FFFFFF' : '#0F172A';
  const borderCol = isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)';
  const textPrimary = isLight ? '#1E293B' : '#F8FAFC';
  const textSecondary = isLight ? '#64748B' : '#94A3B8';

  return (
    <div>
      {/* EN-TÊTE DE LA SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: textPrimary, margin: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={22} color="#2563EB" />
            Communication & Notifications Multi-Canal
          </h2>
          <p style={{ color: textSecondary, fontSize: '13px', marginTop: '4px', margin: 0 }}>
            Messagerie individuelle, campagnes collectives segmentées, bibliothèque de modèles et traçabilité des livraisons.
          </p>
        </div>
      </div>

      {toastMessage && (
        <div style={{ background: '#ECFDF5', borderLeft: '4px solid #10B981', color: '#047857', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '18px' }}>
          ✓ {toastMessage}
        </div>
      )}

      {/* SOUS-NAVIGATION */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', borderBottom: `1px solid ${borderCol}`, paddingBottom: '12px' }}>
        {[
          { id: 'campaign', label: 'Campagne Collective & Segmentation', icon: Users },
          { id: 'individual', label: 'Message Individuel Direct', icon: Send },
          { id: 'templates', label: 'Bibliothèque de Modèles', icon: Sparkles },
          { id: 'history', label: 'Grand Livre des Envois', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? '#2563EB' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.04)',
                color: isActive ? '#FFFFFF' : textSecondary,
                fontWeight: isActive ? 700 : 500,
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. CAMPAGNE COLLECTIVE AVEC SEGMENTATION AVANCÉE */}
      {subTab === 'campaign' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
          <form onSubmit={handleSendCampaign} style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: textPrimary, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#2563EB" />
              Lancer une Diffusion Collective Ciblée
            </h3>

            {/* Segmentation de l'audience */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                Segment de l'audience cible (Segmentation intelligente) :
              </label>
              <select
                value={campaignAudience}
                onChange={(e) => setCampaignAudience(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none' }}
              >
                <option value="expiring_7d">Abonnements arrivant à expiration (≤ 7 jours)</option>
                <option value="expired">Abonnements expirés (non renouvelés)</option>
                <option value="pro">Tous les marchands Formule Pro</option>
                <option value="business">Tous les marchands Formule Business</option>
                <option value="free">Tous les utilisateurs en Formule Gratuite</option>
                <option value="suspended">Comptes actuellement suspendus</option>
                <option value="new_users">Nouveaux inscrits des 7 derniers jours</option>
                <option value="never_renewed">Abonnés n'ayant jamais renouvelé</option>
                <option value="all">Tous les utilisateurs de COMMERCIA</option>
              </select>
            </div>

            {/* Canal */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                Canal de diffusion :
              </label>
              <select
                value={campaignChannel}
                onChange={(e) => setCampaignChannel(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none' }}
              >
                <option value="internal_notification">Notification Interne Dashboard (Recommandé)</option>
                <option value="email">Courrier Électronique (Email)</option>
                <option value="sms">SMS Direct</option>
                <option value="whatsapp">WhatsApp Business API</option>
              </select>
            </div>

            {/* Titre */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                Titre de l'annonce :
              </label>
              <input
                type="text"
                placeholder="Ex: Offre spéciale renouvellement : -20% sur votre formule Pro"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none' }}
              />
            </div>

            {/* Contenu */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                Message :
              </label>
              <textarea
                rows={5}
                placeholder="Rédigez le texte de votre campagne..."
                value={campaignContent}
                onChange={(e) => setCampaignContent(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none', resize: 'vertical' }}
              />
            </div>

            {/* Option Marketing & Opt-in */}
            <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="isPromoCheck"
                checked={campaignIsPromo}
                onChange={(e) => setCampaignIsPromo(e.target.checked)}
              />
              <label htmlFor="isPromoCheck" style={{ fontSize: '12.5px', color: textSecondary, cursor: 'pointer' }}>
                Campagne promotionnelle (exclut automatiquement les commerçants ayant refusé les communications marketing)
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                padding: '11px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Send size={15} />
              {isSubmitting ? 'Diffusion en cours...' : 'Diffuser la Campagne'}
            </button>
          </form>

          {/* Sélecteur rapide de modèle pour la campagne */}
          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: textPrimary, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="#D97706" />
              Insérer un Modèle Rapide
            </h4>
            <p style={{ fontSize: '12px', color: textSecondary, marginBottom: '14px' }}>
              Cliquez pour charger automatiquement un canevas professionnel prêt à l'emploi.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleApplyTemplate(tpl, 'campaign')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ fontWeight: 700, color: textPrimary, fontSize: '12.5px' }}>{tpl.name}</div>
                  <div style={{ color: textSecondary, fontSize: '11.5px', marginTop: '2px' }}>{tpl.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. MESSAGE INDIVIDUEL DIRECT */}
      {subTab === 'individual' && (
        <form onSubmit={handleSendIndividual} style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '24px', maxWidth: '680px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: textPrimary, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={18} color="#2563EB" />
            Rédiger un Message Individuel Personnalisé
          </h3>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
              Sélectionner le commerçant destinataire :
            </label>
            <select
              value={selectedRecipientId}
              onChange={(e) => setSelectedRecipientId(e.target.value)}
              required
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none' }}
            >
              <option value="">-- Choisir un utilisateur --</option>
              {merchantsList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.businessName}) • {m.email}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
              Canal de communication :
            </label>
            <select
              value={individualChannel}
              onChange={(e) => setIndividualChannel(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none' }}
            >
              <option value="internal_notification">Notification Interne Dashboard</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp Business API</option>
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
              Objet du message :
            </label>
            <input
              type="text"
              placeholder="Ex: Confirmation de prise en compte de votre réclamation"
              value={individualTitle}
              onChange={(e) => setIndividualTitle(e.target.value)}
              required
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
              Corps du message :
            </label>
            <textarea
              rows={6}
              placeholder="Rédigez votre message..."
              value={individualContent}
              onChange={(e) => setIndividualContent(e.target.value)}
              required
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '11px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Send size={15} />
            {isSubmitting ? 'Envoi en cours...' : 'Transmettre au Commerçant'}
          </button>
        </form>
      )}

      {/* 3. BIBLIOTHÈQUE DE MODÈLES */}
      {subTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {templates.map((tpl) => (
            <div key={tpl.id} style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', background: isLight ? '#EFF6FF' : 'rgba(37,99,235,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                  {tpl.category}
                </span>
                <span style={{ fontSize: '11px', color: textSecondary }}>{tpl.defaultChannel}</span>
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, margin: '6px 0 10px 0' }}>{tpl.name}</h4>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: textPrimary, marginBottom: '6px' }}>{tpl.title}</div>
              <p style={{ fontSize: '12px', color: textSecondary, whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                {tpl.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 4. GRAND LIVRE DES ENVOIS */}
      {subTab === 'history' && (
        <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${borderCol}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, margin: 0 }}>
              Grand Livre des Communications ({historyTotal} messages expédiés)
            </h3>
            <button
              onClick={() => loadHistory()}
              style={{ background: 'transparent', border: 'none', color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600 }}
            >
              <RefreshCw size={13} className={loadingHistory ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead style={{ background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)' }}>
                <tr style={{ borderBottom: `1px solid ${borderCol}`, color: textSecondary }}>
                  <th style={{ padding: '12px 14px' }}>Type</th>
                  <th style={{ padding: '12px 14px' }}>Destinataire / Audience</th>
                  <th style={{ padding: '12px 14px' }}>Canal</th>
                  <th style={{ padding: '12px 14px' }}>Titre</th>
                  <th style={{ padding: '12px 14px' }}>Statut</th>
                  <th style={{ padding: '12px 14px' }}>Volume</th>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {historyMessages.map((msg) => (
                  <tr key={msg.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                    <td style={{ padding: '12px 14px', textTransform: 'capitalize', fontWeight: 600, color: textPrimary }}>
                      {msg.type}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {msg.recipient ? (
                        <div>
                          <strong>{msg.recipient.firstName} {msg.recipient.lastName}</strong>
                          <div style={{ fontSize: '11px', color: textSecondary }}>{msg.recipient.email}</div>
                        </div>
                      ) : (
                        <span style={{ fontWeight: 600, color: '#2563EB' }}>Cible : {msg.targetAudience}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {msg.channel}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: textPrimary }}>
                      {msg.title}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        background: msg.status === 'delivered' ? '#ECFDF5' : '#FEF2F2',
                        color: msg.status === 'delivered' ? '#059669' : '#DC2626',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}>
                        {msg.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: textSecondary }}>
                      {msg.recipientCount} destinataire(s)
                    </td>
                    <td style={{ padding: '12px 14px', color: textSecondary }}>
                      {new Date(msg.sentAt).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
