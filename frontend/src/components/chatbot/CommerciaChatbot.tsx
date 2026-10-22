import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
  Store,
  Wallet,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Bot,
} from 'lucide-react';
import { api } from '../../services/api';
import { getLiveStoreContext, LiveStoreContext } from '../../services/aiKnowledgeEngine';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

const QUICK_PROMPTS = [
  { label: '💼 Ma caisse en direct', query: 'Où en est ma caisse en ce moment et comment la gérer ?' },
  { label: '🎯 Règle des 3 poches', query: 'Explique-moi la règle des 3 poches pour mon commerce' },
  { label: '🤝 Dettes & Créances', query: 'Qui me doit de l\'argent et comment relancer par WhatsApp ?' },
  { label: '📦 Stock & Marges', query: 'Quels sont mes articles en stock faible et comment calculer ma marge ?' },
  { label: '👑 Forfaits COMMERCIA', query: 'Quels sont les tarifs et avantages des abonnements Pro et Business ?' },
];

export const CommerciaChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<LiveStoreContext>(getLiveStoreContext());
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: `👋 **Bonjour ! Je suis le Copilote IA COMMERCIA.**\n\nJe connais les rouages de votre boutique et l'ensemble de l'application :\n- 💼 **Caisse du jour** : gestion des ouvertures, contrôles des écarts et clôtures.\n- 🛍️ **Ventes & Encaissements** : tickets, Mobile Money (OM/MoMo) et ardoises à crédit.\n- 🤝 **Clients & Dettes** : suivi des créances et relances WhatsApp en 1 clic.\n- 🎯 **Finance TPE/PME** : application de la règle d'or des 3 poches.\n\nPosez-moi une question ou choisissez une suggestion ci-dessous !`,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Refresh live store context whenever chatbot opens
  useEffect(() => {
    if (isOpen) {
      setContext(getLiveStoreContext());
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 150);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: 'u-' + Date.now(),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post<{ reply: string }>('/ai/chat', { message: textToSend });
      const botMsg: Message = {
        id: 'b-' + Date.now(),
        sender: 'bot',
        text: res.reply,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botMsg]);
      // Update store context after query
      setContext(getLiveStoreContext());
    } catch (e: any) {
      const errorMsg: Message = {
        id: 'err-' + Date.now(),
        sender: 'bot',
        text: 'Désolé, je rencontre une petite hésitation réseau. Vous pouvez réessayer dans un instant !',
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'reset',
        sender: 'bot',
        text: 'Conversation réinitialisée ! Comment puis-je vous aider dans votre gestion commerciale aujourd\'hui ?',
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Simple Markdown-like renderer for replies
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      // Bold rendering
      let parsed = line;
      const parts = [];
      let lastIdx = 0;
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIdx) {
          parts.push(line.substring(lastIdx, match.index));
        }
        parts.push(
          <strong key={match.index} style={{ color: '#0F172A', fontWeight: 700 }}>
            {match[1]}
          </strong>
        );
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < line.length) {
        parts.push(line.substring(lastIdx));
      }

      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      const isHeader = line.trim().startsWith('#');

      return (
        <div
          key={idx}
          style={{
            marginBottom: line.trim() === '' ? '8px' : '4px',
            paddingLeft: isBullet ? '12px' : 0,
            lineHeight: 1.5,
            fontSize: isHeader ? '1rem' : '0.88rem',
            fontWeight: isHeader ? 700 : 400,
          }}
        >
          {parts.length > 0 ? parts : line}
        </div>
      );
    });
  };

  return (
    <>
      {/* 1. FLOATING LAUNCHER BUTTON */}
      {!isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Subtle tooltip / pill */}
          <div
            onClick={() => setIsOpen(true)}
            style={{
              background: '#08162B',
              color: '#FFFFFF',
              padding: '8px 14px',
              borderRadius: '24px',
              fontSize: '0.82rem',
              fontWeight: 700,
              boxShadow: '0 8px 24px rgba(8, 22, 43, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              transition: 'transform 0.2s',
            }}
          >
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
            <span>Une question ? Copilote IA</span>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            aria-label="Ouvrir le Chatbot COMMERCIA"
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0062FF 0%, #0045B5 100%)',
              border: '3px solid #FFFFFF',
              boxShadow: '0 10px 28px rgba(0, 98, 255, 0.45)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              padding: '6px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <img
              src="/commercia-logo.png"
              alt="COMMERCIA"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
              }}
            />
            {/* Sparkle badge */}
            <div
              style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                background: '#FF6B00',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(255, 107, 0, 0.5)',
              }}
            >
              <Sparkles size={11} />
            </div>
          </button>
        </div>
      )}

      {/* 2. CHAT DRAWER / WINDOW */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: isExpanded ? '10px' : '20px',
            right: isExpanded ? '10px' : '20px',
            width: isExpanded ? 'calc(100vw - 20px)' : '420px',
            maxWidth: isExpanded ? '900px' : '95vw',
            height: isExpanded ? 'calc(100vh - 20px)' : '620px',
            maxHeight: '92vh',
            background: '#FFFFFF',
            borderRadius: '20px',
            boxShadow: '0 24px 64px rgba(8, 22, 43, 0.28), 0 0 0 1px rgba(0, 98, 255, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10000,
            overflow: 'hidden',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* HEADER */}
          <div
            style={{
              background: 'linear-gradient(135deg, #08162B 0%, #0D264A 100%)',
              color: '#FFFFFF',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  padding: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 98, 255, 0.35)',
                }}
              >
                <img
                  src="/commercia-logo.png"
                  alt="COMMERCIA"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.98rem', letterSpacing: '-0.01em' }}>COMMERCIA</span>
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)',
                      color: '#FFFFFF',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    COPILOTE IA
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#94A3B8' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                  <span>Connaissance intégrale de l'application</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={clearChat}
                title="Vider la conversation"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#CBD5E1',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Réduire' : 'Agrandir'}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#CBD5E1',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                }}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Fermer"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#CBD5E1',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* LIVE CONTEXT PILL BANNER */}
          <div
            style={{
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.76rem',
              color: '#475569',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <Store size={14} color="#0062FF" />
              <span style={{ color: '#0F172A' }}>{context.businessName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: context.isCashOpen ? '#DCFCE7' : '#FEE2E2',
                  color: context.isCashOpen ? '#166534' : '#991B1B',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                }}
              >
                {context.isCashOpen ? '🟢 Caisse Ouverte' : '🔴 Caisse Fermée'}
              </span>
              <span style={{ fontWeight: 700, color: '#0062FF' }}>
                {context.todaySalesTotal.toLocaleString('fr-FR')} F vendus
              </span>
            </div>
          </div>

          {/* QUICK PROMPT CHIPS */}
          <div
            style={{
              padding: '8px 12px',
              background: '#FFFFFF',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp.query)}
                disabled={loading}
                style={{
                  padding: '5px 10px',
                  borderRadius: '16px',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  color: '#334155',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* MESSAGES STREAM */}
          <div
            style={{
              flex: 1,
              padding: '14px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: '#FDFEFE',
            }}
          >
            {messages.map(m => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: isExpanded ? '75%' : '88%',
                }}
              >
                {m.sender === 'bot' && (
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: '#08162B',
                      padding: '3px',
                      flexShrink: 0,
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src="/commercia-logo.png"
                      alt="COMMERCIA"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                )}

                <div>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: m.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: m.sender === 'user' ? 'linear-gradient(135deg, #0062FF 0%, #0045B5 100%)' : '#FFFFFF',
                      color: m.sender === 'user' ? '#FFFFFF' : '#1E293B',
                      boxShadow: m.sender === 'user' ? '0 4px 14px rgba(0, 98, 255, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
                      border: m.sender === 'user' ? 'none' : '1px solid #E2E8F0',
                      wordBreak: 'break-word',
                    }}
                  >
                    {renderFormattedText(m.text)}
                  </div>
                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: '#94A3B8',
                      marginTop: '3px',
                      textAlign: m.sender === 'user' ? 'right' : 'left',
                      paddingLeft: '4px',
                      paddingRight: '4px',
                    }}
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: '#08162B',
                    padding: '3px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src="/commercia-logo.png"
                    alt="COMMERCIA"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '16px 16px 16px 4px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    gap: '5px',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0062FF' }}></span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF6B00' }}></span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', marginLeft: '6px' }}>L'IA analyse vos comptes...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT FORM */}
          <div
            style={{
              padding: '12px 14px',
              borderTop: '1px solid #E2E8F0',
              background: '#FFFFFF',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '14px',
                padding: '4px 6px 4px 14px',
                transition: 'border-color 0.2s',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question (caisse, dettes, stock, forfaits)..."
                disabled={loading}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '0.88rem',
                  color: '#0F172A',
                  padding: '8px 0',
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: input.trim() ? 'linear-gradient(135deg, #0062FF 0%, #0045B5 100%)' : '#E2E8F0',
                  color: input.trim() ? '#FFFFFF' : '#94A3B8',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}
              >
                <Send size={16} />
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '0.68rem', color: '#94A3B8' }}>
              COMMERCIA IA • Assistance financière & gestion commerciale instantanée
            </div>
          </div>
        </div>
      )}
    </>
  );
};
