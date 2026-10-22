import React, { useState } from 'react';
import { Bot, Send, Sparkles, User, Lightbulb } from 'lucide-react';
import { api } from '../services/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const CopilotPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Bonjour ! Je suis votre Copilote Financier COMMERCIA 🤖.\nJe surveille vos ventes, vos dépenses et vos crédits clients en temps réel pour vous aider à maximiser votre bénéfice.\n\nPosez-moi une question ou cliquez sur une suggestion ci-dessous !',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const SUGGESTIONS = [
    'Quel est mon bénéfice réel ?',
    'Qui me doit de l\'argent ?',
    'Mes dépenses sont-elles trop élevées ?',
    'Conseils pour booster mes ventes',
  ];

  const sendMessage = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post<{ reply: string }>('/analytics/ai/chat', { message: text });
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Désolé, une erreur est survenue lors de l\'analyse de vos données. Veuillez réessayer.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#059669',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bot size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Copilote Financier IA</h1>
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>
              Conseils stratégiques & analyse instantanée de votre trésorerie
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages Box */}
      <div
        className="card"
        style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: '16px',
          background: '#FFFFFF',
        }}
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}
          >
            {m.role === 'assistant' && (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <Sparkles size={16} />
              </div>
            )}

            <div
              style={{
                background: m.role === 'user' ? '#059669' : '#F8FAFC',
                color: m.role === 'user' ? '#FFFFFF' : '#1E293B',
                padding: '14px 18px',
                borderRadius: '16px',
                borderTopRightRadius: m.role === 'user' ? '4px' : '16px',
                borderTopLeftRadius: m.role === 'assistant' ? '4px' : '16px',
                border: m.role === 'assistant' ? '1px solid #E2E8F0' : 'none',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              }}
            >
              {m.content}
            </div>

            {m.role === 'user' && (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <User size={16} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#059669', fontSize: '0.85rem' }}>
            <Sparkles size={16} />
            <span>Le Copilote analyse vos finances...</span>
          </div>
        )}
      </div>

      {/* Quick Suggestions Chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px' }}>
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(s)}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontSize: '0.8rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Lightbulb size={13} color="#D97706" />
            <span>{s}</span>
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage();
        }}
        style={{ display: 'flex', gap: '10px' }}
      >
        <input
          type="text"
          placeholder="Posez votre question financière au Copilote..."
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ flex: 1, padding: '14px 18px', fontSize: '0.95rem' }}
          disabled={loading}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0 24px' }} disabled={loading || !input.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
