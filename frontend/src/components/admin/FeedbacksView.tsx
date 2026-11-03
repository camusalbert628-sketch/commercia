import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Star,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  RefreshCw,
  Search,
  Filter,
  User,
  Building2,
  Bug,
  Lightbulb,
  ThumbsUp,
  AlertOctagon,
} from 'lucide-react';
import { api } from '../../services/api';

interface FeedbacksViewProps {
  adminTheme: 'light' | 'dark';
  onSelectUser: (userId: string) => void;
}

export const FeedbacksView: React.FC<FeedbacksViewProps> = ({
  adminTheme,
  onSelectUser,
}) => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtres
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal de réponse
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [markResolved, setMarkResolved] = useState<boolean>(true);
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);

  const loadFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      params.append('page', page.toString());
      params.append('limit', '20');

      const [listRes, analyticsRes] = await Promise.all([
        api.get<any>(`/admin/feedbacks?${params.toString()}`),
        api.get<any>('/admin/feedbacks/analytics'),
      ]);

      setFeedbacks(listRes.feedbacks || []);
      setTotal(listRes.total || 0);
      setAnalytics(analyticsRes);
    } catch (err: any) {
      console.error('Erreur chargement feedbacks:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, page]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback || !replyMessage.trim()) {
      alert('Veuillez saisir votre message de réponse.');
      return;
    }

    setIsSendingReply(true);
    try {
      const res = await api.post<any>(`/admin/feedbacks/${selectedFeedback.id}/respond`, {
        message: replyMessage.trim(),
        markResolved,
      });

      alert(res.message || 'Réponse transmise avec succès au commerçant !');
      setSelectedFeedback(null);
      setReplyMessage('');
      loadFeedbacks();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la réponse');
    } finally {
      setIsSendingReply(false);
    }
  };

  const isLight = adminTheme === 'light';
  const cardBg = isLight ? '#FFFFFF' : '#0F172A';
  const borderCol = isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)';
  const textPrimary = isLight ? '#1E293B' : '#F8FAFC';
  const textSecondary = isLight ? '#64748B' : '#94A3B8';

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'suggestion':
      case 'amelioration':
        return <Lightbulb size={14} color="#D97706" />;
      case 'bug':
      case 'probleme_technique':
        return <Bug size={14} color="#EF4444" />;
      case 'reclamation':
        return <AlertOctagon size={14} color="#DC2626" />;
      case 'avis':
        return <Star size={14} color="#10B981" />;
      default:
        return <MessageSquare size={14} color="#2563EB" />;
    }
  };

  return (
    <div>
      {/* EN-TÊTE DE LA SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: textPrimary, margin: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={22} color="#D97706" />
            Feedbacks, Suggestions & Évaluations Marchands
          </h2>
          <p style={{ color: textSecondary, fontSize: '13px', marginTop: '4px', margin: 0 }}>
            Réception centralisée de tous les retours envoyés depuis l'application commerçant avec identification de l'auteur et réponses directes.
          </p>
        </div>

        <button
          onClick={() => loadFeedbacks()}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: `1px solid ${borderCol}`,
            background: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
            color: textPrimary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* ANALYTIQUE DES RETOURS & CARTES KPI */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '22px' }}>
          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>TOTAL DES RETOURS</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: textPrimary, marginTop: '4px' }}>{analytics.total}</div>
            <div style={{ fontSize: '11.5px', color: textSecondary, marginTop: '2px' }}>Évaluations & suggestions</div>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>NOTE MOYENNE GLOBALE</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
              ⭐ {analytics.averageRating} <span style={{ fontSize: '14px', color: textSecondary }}>/ 5</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#10B981', marginTop: '2px' }}>Satisfaction marchands</div>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>SUGGESTIONS IDÉES</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>{analytics.suggestionsCount}</div>
            <div style={{ fontSize: '11.5px', color: textSecondary, marginTop: '2px' }}>Demandes d'évolution</div>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>BUGS SIGNALÉS</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>{analytics.bugsCount}</div>
            <div style={{ fontSize: '11.5px', color: textSecondary, marginTop: '2px' }}>Anomalies techniques</div>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>RÉCLAMATIONS</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>{analytics.complaintsCount}</div>
            <div style={{ fontSize: '11.5px', color: textSecondary, marginTop: '2px' }}>Plaintes & blocages</div>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>EN COURS DE TRAITEMENT</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>{analytics.unresolvedCount}</div>
            <div style={{ fontSize: '11.5px', color: '#10B981', marginTop: '2px' }}>{analytics.resolvedCount} traités et résolus</div>
          </div>
        </div>
      )}

      {/* FILTRES & RECHERCHE */}
      <div style={{
        background: cardBg,
        border: `1px solid ${borderCol}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: textSecondary }} />
          <input
            type="text"
            placeholder="Rechercher par message, module, auteur ou boutique..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.03)', color: textPrimary, fontSize: '12.5px', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '12.5px', outline: 'none' }}
          >
            <option value="all">Toutes les catégories</option>
            <option value="suggestion">💡 Suggestion d'amélioration</option>
            <option value="avis">⭐ Évaluation / Avis</option>
            <option value="bug">🐞 Signalement de bug</option>
            <option value="reclamation">⚠️ Réclamation</option>
            <option value="autre">💬 Autre</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '12.5px', outline: 'none' }}
          >
            <option value="all">Tous les statuts</option>
            <option value="new">Nouveaux</option>
            <option value="in_progress">En cours</option>
            <option value="resolved">Résolus</option>
            <option value="archived">Archivés</option>
          </select>
        </div>
      </div>

      {/* TABLEAU DES FEEDBACKS */}
      <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: textSecondary, fontSize: '13px' }}>
            <div className="animate-spin" style={{ width: '28px', height: '28px', border: '3px solid #D97706', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px' }} />
            Chargement des retours commerçants...
          </div>
        ) : feedbacks.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: textSecondary, fontSize: '13px' }}>
            Aucun feedback enregistré pour ces critères.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead style={{ background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)' }}>
                <tr style={{ borderBottom: `1px solid ${borderCol}`, color: textSecondary }}>
                  <th style={{ padding: '12px 14px' }}>Commerçant & Boutique</th>
                  <th style={{ padding: '12px 14px' }}>Catégorie</th>
                  <th style={{ padding: '12px 14px' }}>Note</th>
                  <th style={{ padding: '12px 14px' }}>Module</th>
                  <th style={{ padding: '12px 14px' }}>Commentaire Intégral</th>
                  <th style={{ padding: '12px 14px' }}>Statut</th>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((f) => (
                  <tr key={f.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                    <td style={{ padding: '12px 14px' }}>
                      <strong style={{ color: textPrimary, display: 'block' }}>{f.userName}</strong>
                      <span style={{ fontSize: '11px', color: textSecondary }}>{f.businessName} • {f.userEmail}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: textPrimary, textTransform: 'capitalize' }}>
                        {getCategoryIcon(f.category)}
                        {f.categoryLabel || f.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: f.rating >= 4 ? '#10B981' : f.rating <= 2 ? '#EF4444' : '#D97706' }}>
                      ⭐ {f.rating}/5
                    </td>
                    <td style={{ padding: '12px 14px', textTransform: 'capitalize', color: textSecondary }}>
                      {f.module}
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: '350px' }}>
                      <div style={{ color: textPrimary, fontSize: '12.5px', marginBottom: f.responseMessage ? '4px' : '0' }}>{f.comment}</div>
                      {f.responseMessage && (
                        <div style={{ fontSize: '11px', color: '#2563EB', background: isLight ? '#EFF6FF' : 'rgba(37,99,235,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                          ✓ Répondu : {f.responseMessage}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        background: f.status === 'resolved' ? '#ECFDF5' : f.status === 'in_progress' ? '#FFFBEB' : '#FEF2F2',
                        color: f.status === 'resolved' ? '#059669' : f.status === 'in_progress' ? '#D97706' : '#DC2626',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}>
                        {f.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: textSecondary }}>
                      {new Date(f.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setSelectedFeedback(f);
                          setReplyMessage(f.responseMessage || '');
                        }}
                        style={{
                          background: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Send size={12} />
                        Répondre
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE RÉPONSE DIRECTE DU SUPER ADMIN (SECTION 9.5) */}
      {selectedFeedback && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px',
        }}>
          <form onSubmit={handleSendReply} style={{
            background: cardBg,
            border: `1px solid ${borderCol}`,
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: textPrimary, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={18} color="#2563EB" />
              Répondre à {selectedFeedback.userName}
            </h3>

            <div style={{ background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '12.5px' }}>
              <div style={{ color: textSecondary, marginBottom: '4px' }}>
                Retour reçu sur le module <strong>{selectedFeedback.module}</strong> (Note : ⭐ {selectedFeedback.rating}/5) :
              </div>
              <div style={{ color: textPrimary, fontStyle: 'italic' }}>"{selectedFeedback.comment}"</div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                Votre réponse au commerçant :
              </label>
              <textarea
                rows={5}
                placeholder="Ex: Bonjour, nous avons pris en compte votre retour et déployé un correctif..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#FFFFFF' : '#0B1120', color: textPrimary, fontSize: '13px', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="resolveCheck"
                checked={markResolved}
                onChange={(e) => setMarkResolved(e.target.checked)}
              />
              <label htmlFor="resolveCheck" style={{ fontSize: '12.5px', color: textPrimary, cursor: 'pointer' }}>
                Marquer automatiquement ce retour comme <strong>Résolu</strong>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                style={{ background: 'transparent', border: `1px solid ${borderCol}`, color: textSecondary, padding: '9px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSendingReply}
                style={{ background: '#2563EB', border: 'none', color: '#FFFFFF', padding: '9px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                {isSendingReply ? 'Envoi...' : 'Transmettre la Réponse'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
