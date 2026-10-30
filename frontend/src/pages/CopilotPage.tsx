import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  User,
  Lightbulb,
  Brain,
  Settings,
  Trash2,
  Plus,
  CheckCircle2,
  X,
  Cpu,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import {
  getLLMConfig,
  saveLLMConfig,
  getAIMemories,
  addAIMemory,
  deleteAIMemory,
  clearAIMemories,
  AIMemoryItem,
  LLMConfig,
  generateCopilotLLMResponse,
} from '../services/llmService';
import { renderNaturalFormattedText } from '../utils/textFormatter';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  providerUsed?: string;
  memorizedFact?: string | null;
}

export const CopilotPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Bonjour ! Je suis votre Copilote Financier COMMERCIA 🤖 propulsé par IA avancée (Gemini / GPT) avec mémoire continue.\n\nJe surveille votre caisse, vos bénéfices, vos alertes stock et les crédits clients en temps réel. Grâce à ma mémoire, vous pouvez aussi me dire : « Rappelle-toi que... » pour que je mémorise vos règles de gestion !',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string>('LLM Hybride / Gemini');

  // Modals state
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Memory bank state
  const [memories, setMemories] = useState<AIMemoryItem[]>([]);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryCat, setNewMemoryCat] = useState<AIMemoryItem['category']>('rule');

  // LLM Config state
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(getLLMConfig());
  const [configSuccess, setConfigSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMemories(getAIMemories());
    const cfg = getLLMConfig();
    setLlmConfig(cfg);
    if (cfg.apiKey) {
      setActiveProvider(`${cfg.provider === 'gemini' ? 'Google Gemini' : cfg.provider === 'openai' ? 'OpenAI GPT' : 'Groq'} (${cfg.model})`);
    } else {
      setActiveProvider('COMMERCIA Neural Engine (Prêt pour Gemini/GPT)');
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const reloadMemories = () => {
    setMemories(getAIMemories());
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;
    addAIMemory(newMemoryText.trim(), newMemoryCat);
    setNewMemoryText('');
    reloadMemories();
  };

  const handleDeleteMemory = (id: string) => {
    deleteAIMemory(id);
    reloadMemories();
  };

  const handleClearAllMemories = () => {
    if (window.confirm('Voulez-vous réinitialiser toute la mémoire personnalisée du Copilote ?')) {
      clearAIMemories();
      reloadMemories();
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveLLMConfig(llmConfig);
    setLlmConfig(updated);
    if (updated.apiKey) {
      setActiveProvider(`${updated.provider === 'gemini' ? 'Google Gemini' : updated.provider === 'openai' ? 'OpenAI GPT' : 'Groq'} (${updated.model})`);
    } else {
      setActiveProvider('COMMERCIA Neural Engine (Prêt pour Gemini/GPT)');
    }
    setConfigSuccess(true);
    setTimeout(() => {
      setConfigSuccess(false);
      setShowConfigModal(false);
    }, 1200);
  };

  const SUGGESTIONS = [
    '💼 Où en est ma caisse journalière ?',
    '🎯 Explique-moi la règle des 3 poches',
    '🤝 Qui me doit de l\'argent ?',
    '📈 Quel est mon bénéfice réel aujourd\'hui ?',
    '🧠 Rappelle-toi que je ferme le dimanche',
    '📦 Ai-je des produits en rupture critique ?',
  ];

  const sendMessage = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    const cfg = getLLMConfig();

    try {
      const res = await api.post<{ reply: string; memorizedFact?: string | null; providerUsed?: string }>(
        '/ai/chat',
        {
          message: text,
          history: newHistory.slice(-10),
          userConfig: {
            provider: cfg.provider,
            model: cfg.model,
            apiKey: cfg.apiKey,
          },
        },
        cfg.apiKey ? { 'x-ai-api-key': cfg.apiKey } : undefined
      );

      if (res.memorizedFact) {
        reloadMemories();
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          providerUsed: res.providerUsed || activeProvider,
          memorizedFact: res.memorizedFact,
        },
      ]);
    } catch (err: any) {
      console.warn('Backend /ai/chat call failed, using client-side generative LLM fallback:', err);
      try {
        const clientRes = await generateCopilotLLMResponse(text, newHistory.slice(-8));
        if (clientRes.memorizedFact) {
          reloadMemories();
        }
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: clientRes.reply,
            providerUsed: clientRes.providerUsed || activeProvider,
            memorizedFact: clientRes.memorizedFact,
          },
        ]);
      } catch (fallbackErr) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Désolé, une erreur temporaire est survenue lors de l\'analyse de vos données financières. Veuillez vérifier votre connexion ou réessayer.',
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Header with LLM Badge & Memory Button */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/commercia-logo.png"
            alt="Copilote COMMERCIA"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#FFFFFF',
              padding: '3px',
              boxShadow: '0 4px 14px rgba(0, 98, 255, 0.25)',
              objectFit: 'contain',
              border: '1px solid #E2E8F0',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 800 }}>
                Copilote Financier <span style={{ color: '#FF7A00' }}>IA</span>
              </h1>
              <span className="brand-tag">COMMERCIA</span>
            </div>
            <p style={{ color: '#64748B', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
              Moteur LLM & Mémoire continue • Rentabilité, trésorerie & recommandations
            </p>
          </div>
        </div>

        {/* Action Controls: Memory Bank & LLM Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => {
              reloadMemories();
              setShowMemoryModal(true);
            }}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#0F172A',
            }}
            title="Consulter et gérer les souvenirs de l'IA"
          >
            <Brain size={16} color="#7C3AED" />
            <span>Mémoire de l'IA</span>
            <span
              style={{
                background: '#7C3AED',
                color: '#FFF',
                borderRadius: '12px',
                padding: '1px 6px',
                fontSize: '0.72rem',
                fontWeight: 800,
              }}
            >
              {memories.length}
            </span>
          </button>

          <button
            onClick={() => setShowConfigModal(true)}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#0062FF',
            }}
            title="Configurer le modèle LLM (Gemini, Claude, GPT...)"
          >
            <Cpu size={16} color="#0062FF" />
            <span>Moteur LLM</span>
            <Settings size={14} color="#64748B" />
          </button>
        </div>
      </div>

      {/* Model Active Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 14px',
          background: 'linear-gradient(90deg, #F0FDF4 0%, #EFF6FF 100%)',
          borderRadius: '8px',
          border: '1px solid #BAE6FD',
          marginBottom: '10px',
          fontSize: '0.78rem',
          color: '#0369A1',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} color="#0284C7" />
          <span>
            Propulsé par : <strong>{activeProvider}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 600 }}>
          <ShieldCheck size={14} />
          <span>Données chiffrées & RAG temps réel actif</span>
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
          marginBottom: '12px',
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
              <img
                src="/commercia-logo.png"
                alt="COMMERCIA"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  padding: '2px',
                  border: '1px solid #CBD5E1',
                  objectFit: 'contain',
                  flexShrink: 0,
                  marginTop: '2px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                style={{
                  background: m.role === 'user' ? 'linear-gradient(135deg, #0062FF 0%, #004BD6 100%)' : '#F8FAFC',
                  color: m.role === 'user' ? '#FFFFFF' : '#1E293B',
                  padding: '14px 18px',
                  borderRadius: '16px',
                  borderTopRightRadius: m.role === 'user' ? '4px' : '16px',
                  borderTopLeftRadius: m.role === 'assistant' ? '4px' : '16px',
                  border: m.role === 'assistant' ? '1px solid #E2E8F0' : 'none',
                  fontSize: '0.92rem',
                  lineHeight: 1.6,
                  boxShadow: m.role === 'user' ? '0 4px 12px rgba(0, 98, 255, 0.25)' : '0 2px 4px rgba(0,0,0,0.03)',
                }}
              >
                {renderNaturalFormattedText(m.content, m.role === 'user')}
              </div>

              {m.memorizedFact && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.74rem',
                    color: '#7C3AED',
                    background: '#F5F3FF',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    alignSelf: 'flex-start',
                  }}
                >
                  <Brain size={12} />
                  <span>Souvenir enregistré dans la mémoire locale</span>
                </div>
              )}
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
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#0062FF', fontSize: '0.85rem' }}>
            <Sparkles size={16} className="animate-spin" />
            <span>Le Copilote IA réfléchit avec ses connaissances financières et vos données...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions Chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px' }}>
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
              cursor: 'pointer',
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
          placeholder="Ex: Quel est mon bénéfice ? Ou dites : Rappelle-toi que..."
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ flex: 1, padding: '14px 18px', fontSize: '0.95rem' }}
          disabled={loading}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0 24px' }} disabled={loading || !input.trim()}>
          <Send size={18} />
        </button>
      </form>

      {/* MODAL 1: MEMORY BANK MANAGER */}
      {showMemoryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#F5F3FF',
                    color: '#7C3AED',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Brain size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Mémoire Permanente du Copilote</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                    Faits, préférences et règles spécifiques dont l'IA se souvient toujours
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMemoryModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Add New Memory Form */}
            <form onSubmit={handleAddMemory} style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Ex: Le fournisseur principal livre chaque jeudi matin..."
                  value={newMemoryText}
                  onChange={e => setNewMemoryText(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', fontSize: '0.88rem' }}
                />
                <select
                  value={newMemoryCat}
                  onChange={e => setNewMemoryCat(e.target.value as any)}
                  style={{ width: '130px', padding: '10px', fontSize: '0.82rem' }}
                >
                  <option value="rule">Règle</option>
                  <option value="business_fact">Activité</option>
                  <option value="client_habit">Client</option>
                  <option value="preference">Préférence</option>
                </select>
                <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={16} />
                  <span>Retenir</span>
                </button>
              </div>
            </form>

            {/* List of Memories */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', paddingRight: '4px' }}>
              {memories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94A3B8' }}>
                  <Brain size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p>Aucun souvenir enregistré. Dites « Rappelle-toi que... » au copilote ou ajoutez-en un ci-dessus.</p>
                </div>
              ) : (
                memories.map(m => (
                  <div
                    key={m.id}
                    style={{
                      padding: '12px 14px',
                      background: '#F8FAFC',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            textTransform: 'uppercase',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: m.category === 'rule' ? '#FEF3C7' : '#EDE9FE',
                            color: m.category === 'rule' ? '#92400E' : '#6D28D9',
                          }}
                        >
                          {m.category}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                          {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#1E293B', lineHeight: 1.4 }}>
                        {m.content}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMemory(m.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      title="Oublier ce souvenir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
              <button
                onClick={handleClearAllMemories}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Trash2 size={13} />
                <span>Effacer tous les souvenirs</span>
              </button>
              <button onClick={() => setShowMemoryModal(false)} className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: LLM CONFIG & PROVIDER SETTINGS */}
      {showConfigModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#EFF6FF',
                    color: '#0062FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Cpu size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Moteur LLM & Clé d'API</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                    Connectez Gemini, Claude ou GPT pour des analyses sur-mesure
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Fournisseur LLM
                </label>
                <select
                  value={llmConfig.provider}
                  onChange={e => {
                    const p = e.target.value as any;
                    setLlmConfig(prev => ({
                      ...prev,
                      provider: p,
                      model: p === 'gemini' ? 'gemini-1.5-flash' : p === 'openai' ? 'gpt-4o-mini' : 'llama-3.3-70b-versatile',
                    }));
                  }}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem' }}
                >
                  <option value="gemini">Google Gemini (Recommandé - Quota gratuit & Très intelligent)</option>
                  <option value="openai">OpenAI (GPT-4o Mini / GPT-4o)</option>
                  <option value="groq">Groq (Llama 3.3 70B - Vitesse éclair)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Modèle d'IA
                </label>
                {llmConfig.provider === 'gemini' ? (
                  <select
                    value={llmConfig.model}
                    onChange={e => setLlmConfig(prev => ({ ...prev, model: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem' }}
                  >
                    <option value="gemini-1.5-flash">gemini-1.5-flash (Standard - Équilibré & Rapide)</option>
                    <option value="gemini-2.0-flash">gemini-2.0-flash (Nouvelle Génération - Ultra-rapide)</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro (Raisonnement Complexe & Analyse Maximale)</option>
                  </select>
                ) : llmConfig.provider === 'openai' ? (
                  <select
                    value={llmConfig.model}
                    onChange={e => setLlmConfig(prev => ({ ...prev, model: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem' }}
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Recommandé - Économique & Performant)</option>
                    <option value="gpt-4o">gpt-4o (Modèle Flagship d'OpenAI)</option>
                  </select>
                ) : (
                  <select
                    value={llmConfig.model}
                    onChange={e => setLlmConfig(prev => ({ ...prev, model: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem' }}
                  >
                    <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Le plus intelligent sur Groq)</option>
                    <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Ultra-léger et instantané)</option>
                  </select>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                    Clé d'API {llmConfig.provider === 'gemini' ? 'Google AI Studio' : llmConfig.provider === 'groq' ? 'Groq Console' : 'OpenAI'}
                  </label>
                  {llmConfig.provider === 'gemini' ? (
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.74rem', color: '#0062FF', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                    >
                      <span>Obtenir une clé Gemini gratuite</span>
                      <ExternalLink size={11} />
                    </a>
                  ) : llmConfig.provider === 'groq' ? (
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.74rem', color: '#0062FF', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                    >
                      <span>Obtenir une clé Groq gratuite</span>
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.74rem', color: '#0062FF', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                    >
                      <span>Gérer vos clés OpenAI</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <input
                  type="password"
                  value={llmConfig.apiKey}
                  onChange={e => setLlmConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={
                    llmConfig.provider === 'gemini'
                      ? 'AIzaSy...'
                      : llmConfig.provider === 'openai'
                      ? 'sk-proj-...'
                      : 'gsk_...'
                  }
                  style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem', fontFamily: 'monospace' }}
                />
                <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#64748B' }}>
                  Votre clé reste strictement sur votre navigateur dans un stockage local chiffré.
                  Si vous laissez vide, le Copilote fonctionne avec le moteur hybride local COMMERCIA.
                </p>
              </div>

              {configSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '0.85rem' }}>
                  <CheckCircle2 size={16} />
                  <span>Configuration du LLM mise à jour avec succès !</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 22px', fontSize: '0.85rem' }}>
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
