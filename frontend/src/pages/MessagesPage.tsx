import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Mail,
  MailOpen,
  Search,
  CheckCheck,
  RefreshCw,
  Clock,
  User,
  AlertCircle,
  Flame,
  Info,
  Calendar,
  ChevronRight,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { messagesService, UserMessageItem } from '../services/messagesService';

export const MessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<UserMessageItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMessage, setSelectedMessage] = useState<UserMessageItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'urgent' | 'important' | 'read'>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  // Charger les messages depuis l'API réelle
  const loadMessages = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      else setIsRefreshing(true);

      const response = await messagesService.getMessages({
        search: searchQuery,
        filter: activeFilter,
      });

      setMessages(response.messages || []);
      setUnreadCount(response.unreadCount || 0);

      // Si un message est sélectionné, rafraîchir son état
      if (selectedMessage) {
        const updated = response.messages.find((m) => m.id === selectedMessage.id);
        if (updated) setSelectedMessage(updated);
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, activeFilter, selectedMessage]);

  useEffect(() => {
    loadMessages(true);
  }, [activeFilter]);

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadMessages(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Ouvrir un message et le marquer automatiquement comme lu en base
  const handleSelectMessage = async (msg: UserMessageItem) => {
    setSelectedMessage(msg);

    if (msg.status === 'unread') {
      try {
        // L'API GET /api/messages/:id passe automatiquement le statut à 'read' en base de données
        const detail = await messagesService.getMessage(msg.id);
        const updated = detail.message;

        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, status: 'read', readAt: updated.readAt } : m))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setSelectedMessage(updated);
      } catch (err) {
        console.error('Erreur marquage automatique lu:', err);
      }
    }
  };

  // Marquer manuellement un message comme lu
  const handleManualMarkRead = async (msgId: string) => {
    try {
      const res = await messagesService.markAsRead(msgId);
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, status: 'read', readAt: new Date().toISOString() } : m))
        );
        setUnreadCount(res.unreadCount);
        if (selectedMessage?.id === msgId) {
          setSelectedMessage((prev) => (prev ? { ...prev, status: 'read', readAt: new Date().toISOString() } : null));
        }
      }
    } catch (err) {
      console.error('Erreur marquage lu:', err);
    }
  };

  // Tout marquer comme lu
  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    try {
      setMarkingAll(true);
      const res = await messagesService.markAllAsRead();
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) => ({ ...m, status: 'read', readAt: m.readAt || new Date().toISOString() }))
        );
        setUnreadCount(0);
        if (selectedMessage) {
          setSelectedMessage((prev) => (prev ? { ...prev, status: 'read' } : null));
        }
      }
    } catch (err) {
      console.error('Erreur tout marquer comme lu:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Formatage propre de la date et heure
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Rendu de badge d'importance
  const renderImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'urgent':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 800,
              background: '#FEE2E2',
              color: '#DC2626',
              border: '1px solid #FECACA',
            }}
          >
            <Flame size={12} />
            URGENT
          </span>
        );
      case 'important':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 800,
              background: '#FEF3C7',
              color: '#D97706',
              border: '1px solid #FDE68A',
            }}
          >
            <AlertCircle size={12} />
            IMPORTANT
          </span>
        );
      case 'info':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 700,
              background: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
            }}
          >
            <Info size={12} />
            INFO
          </span>
        );
    }
  };

  // Convertisseur de texte / markdown simple vers éléments visuels HTML
  const renderRichContent = (content: string) => {
    if (!content) return null;

    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Titre niveau 3 ou 2
      if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        const text = trimmed.replace(/^#+\s*/, '');
        return (
          <h4
            key={idx}
            style={{
              fontWeight: 800,
              fontSize: '1.05rem',
              color: '#0F172A',
              marginTop: '16px',
              marginBottom: '8px',
            }}
          >
            {text}
          </h4>
        );
      }

      // Puce de liste
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.replace(/^[-*]\s*/, '');
        return (
          <li
            key={idx}
            style={{
              marginLeft: '20px',
              marginBottom: '6px',
              color: '#334155',
              fontSize: '0.92rem',
              lineHeight: 1.5,
            }}
          >
            {renderInlineFormatting(text)}
          </li>
        );
      }

      // Ligne vide
      if (!trimmed) {
        return <div key={idx} style={{ height: '10px' }} />;
      }

      // Paragraphe normal
      return (
        <p
          key={idx}
          style={{
            marginBottom: '10px',
            color: '#334155',
            fontSize: '0.92rem',
            lineHeight: 1.6,
          }}
        >
          {renderInlineFormatting(line)}
        </p>
      );
    });
  };

  // Mise en forme en ligne (gras, etc.)
  const renderInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} style={{ color: '#0F172A', fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 16px' }}>
      {/* En-tête de la page */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0062FF 0%, #0045B5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(0, 98, 255, 0.25)',
              }}
            >
              <Mail size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Messagerie Interne
              </h1>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                Communications officielles et annonces directes de l'administration COMMERCIA
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: '#F0FDF4',
                color: '#16A34A',
                border: '1px solid #BBF7D0',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <CheckCheck size={16} />
              {markingAll ? 'Mise à jour...' : 'Tout marquer comme lu'}
            </button>
          )}

          <button
            onClick={() => loadMessages(false)}
            disabled={isRefreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#FFFFFF',
              color: '#334155',
              border: '1px solid #E2E8F0',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} style={{ animation: isRefreshing ? 'spin 1s infinite linear' : 'none' }} />
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Barre d'outils: Recherche & Filtres */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #E2E8F0',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Champ recherche */}
          <div
            style={{
              flex: '1 1 300px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
            }}
          >
            <Search size={18} color="#94A3B8" />
            <input
              type="text"
              placeholder="Rechercher par objet, mot-clé ou contenu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.88rem',
                width: '100%',
                color: '#0F172A',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtres par onglets */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={() => setActiveFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeFilter === 'all' ? '#0062FF' : '#F1F5F9',
                color: activeFilter === 'all' ? '#FFFFFF' : '#475569',
              }}
            >
              Tous ({messages.length})
            </button>

            <button
              onClick={() => setActiveFilter('unread')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeFilter === 'unread' ? '#DC2626' : '#FEE2E2',
                color: activeFilter === 'unread' ? '#FFFFFF' : '#DC2626',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              Non lus
              {unreadCount > 0 && (
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: '999px',
                    background: activeFilter === 'unread' ? '#FFFFFF' : '#DC2626',
                    color: activeFilter === 'unread' ? '#DC2626' : '#FFFFFF',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveFilter('urgent')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeFilter === 'urgent' ? '#EF4444' : '#F1F5F9',
                color: activeFilter === 'urgent' ? '#FFFFFF' : '#475569',
              }}
            >
              🔴 Urgents
            </button>

            <button
              onClick={() => setActiveFilter('important')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeFilter === 'important' ? '#D97706' : '#F1F5F9',
                color: activeFilter === 'important' ? '#FFFFFF' : '#475569',
              }}
            >
              ⚡ Importants
            </button>

            <button
              onClick={() => setActiveFilter('read')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeFilter === 'read' ? '#475569' : '#F1F5F9',
                color: activeFilter === 'read' ? '#FFFFFF' : '#475569',
              }}
            >
              Lus
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal: Liste & Lecteur de message */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedMessage ? 'minmax(320px, 450px) 1fr' : '1fr',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Colonne gauche: Liste des messages */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
              Boîte de réception ({messages.length})
            </span>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#DC2626',
                  background: '#FEE2E2',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                {unreadCount} nouveau{unreadCount > 1 ? 'x' : ''}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s infinite linear', marginBottom: '8px' }} />
              <p style={{ fontSize: '0.85rem', margin: 0 }}>Chargement de vos messages réels...</p>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94A3B8' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: '#F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                  color: '#94A3B8',
                }}
              >
                <MailOpen size={28} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Aucun message reçu
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', maxWidth: '300px', margin: '0 auto' }}>
                Vous n'avez aucun message correspondant à vos critères actuels.
              </p>
            </div>
          ) : (
            <div style={{ maxHeight: '720px', overflowY: 'auto' }}>
              {messages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const isUnread = msg.status === 'unread';

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      background: isSelected
                        ? '#EFF6FF'
                        : isUnread
                        ? '#F0F9FF'
                        : '#FFFFFF',
                      borderLeft: isSelected
                        ? '4px solid #0062FF'
                        : isUnread
                        ? '4px solid #0284C7'
                        : '4px solid transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isUnread && (
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#0284C7',
                              display: 'inline-block',
                              boxShadow: '0 0 6px rgba(2, 132, 199, 0.6)',
                            }}
                          />
                        )}
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: isUnread ? 800 : 600,
                            color: isUnread ? '#0369A1' : '#64748B',
                          }}
                        >
                          {msg.senderName}
                        </span>
                      </div>
                      {renderImportanceBadge(msg.importance)}
                    </div>

                    <h4
                      style={{
                        margin: '0 0 6px 0',
                        fontSize: '0.92rem',
                        fontWeight: isUnread ? 800 : 600,
                        color: isUnread ? '#0F172A' : '#334155',
                        lineHeight: 1.3,
                      }}
                    >
                      {msg.title}
                    </h4>

                    <p
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: '0.8rem',
                        color: '#64748B',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                      }}
                    >
                      {msg.content}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          color: '#94A3B8',
                        }}
                      >
                        <Clock size={12} />
                        {formatDateTime(msg.deliveredAt || msg.createdAt)}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isUnread ? (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              color: '#0284C7',
                              background: '#E0F2FE',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            Non lu
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: '#64748B',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <CheckCheck size={12} color="#16A34A" /> Lu
                          </span>
                        )}
                        <ChevronRight size={14} color="#94A3B8" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Colonne droite: Lecteur du message sélectionné */}
        {selectedMessage ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              padding: '24px',
              minHeight: '500px',
            }}
          >
            {/* Barre d'action supérieure */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                paddingBottom: '16px',
                borderBottom: '1px solid #E2E8F0',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setSelectedMessage(null)}
                  style={{
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    color: '#64748B',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ArrowLeft size={14} /> Boîte
                </button>
                {renderImportanceBadge(selectedMessage.importance)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedMessage.status === 'unread' ? (
                  <button
                    onClick={() => handleManualMarkRead(selectedMessage.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: '#F0FDF4',
                      color: '#16A34A',
                      border: '1px solid #BBF7D0',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCheck size={14} /> Marquer comme lu
                  </button>
                ) : (
                  <span
                    style={{
                      fontSize: '0.76rem',
                      color: '#16A34A',
                      background: '#DCFCE7',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCheck size={14} /> Lu le {formatDateTime(selectedMessage.readAt || '')}
                  </span>
                )}
              </div>
            </div>

            {/* Titre & Émetteur */}
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '16px',
                lineHeight: 1.35,
              }}
            >
              {selectedMessage.title}
            </h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0062FF 0%, #38BDF8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                }}
              >
                SA
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                    {selectedMessage.senderName}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      background: '#0062FF',
                      color: '#FFFFFF',
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    COMMERCIA ADMIN
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Clock size={12} />
                  <span>Reçu le {formatDateTime(selectedMessage.deliveredAt || selectedMessage.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Corps du message formaté */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '8px',
                padding: '16px 8px',
                minHeight: '200px',
              }}
            >
              {renderRichContent(selectedMessage.content)}
            </div>

            {/* Signature officielle COMMERCIA */}
            <div
              style={{
                marginTop: '32px',
                paddingTop: '16px',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#94A3B8',
                fontSize: '0.75rem',
              }}
            >
              <span>Communication officielle émise via la plateforme COMMERCIA</span>
              <span>Identifiant message : #{selectedMessage.messageId.slice(0, 8)}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

