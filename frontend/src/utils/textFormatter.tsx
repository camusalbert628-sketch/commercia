// COMMERCIA Text Sanitizer & High-End Visual Formatter
// Transforms raw LLM outputs into elegant, professional, highly readable retail growth cards
// with rich colors, stylized italics, glowing badges, and 1-click copyable scripts.

import React, { useState } from 'react';
import {
  Copy,
  CheckCircle2,
  MessageCircle,
  Video,
  Globe,
  PackageCheck,
  Sparkles,
  Zap,
  TrendingUp,
  Target,
  Megaphone,
} from 'lucide-react';

/**
 * Clean encoding glitches and artifacts that often appear in LLM responses
 */
export function sanitizeNaturalText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Fix escaped slashes and apostrophes (e.g. d\'urgence, l\'offre, c\'est, j\'ai)
  cleaned = cleaned
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\\\/g, '');

  // 2. Fix common UTF-8 / latin1 double-encoding glitches
  cleaned = cleaned
    .replace(/Ã©/g, 'é')
    .replace(/Ã¨/g, 'è')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã /g, 'à')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã®/g, 'î')
    .replace(/Ã¯/g, 'ï')
    .replace(/Ã´/g, 'ô')
    .replace(/Ã¹/g, 'ù')
    .replace(/Ã»/g, 'û')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã€/g, 'À')
    .replace(/Ã‰/g, 'É')
    .replace(/Â«/g, '«')
    .replace(/Â»/g, '»')
    .replace(/â€™/g, '’')
    .replace(/â€˜/g, '‘')
    .replace(/â€œ/g, '“')
    .replace(/â€ /g, '”')
    .replace(/â€”/g, '—')
    .replace(/â€“/g, '–')
    .replace(/â€¦/g, '…')
    .replace(/Â /g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 3. Remove markdown code fences or raw backticks (```json, ```markdown, etc.)
  cleaned = cleaned.replace(/```[a-zA-Z0-9_-]*\n?/g, '');
  cleaned = cleaned.replace(/```/g, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // 4. Remove raw HTML tags if any leaked in
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, '');

  return cleaned.trim();
}

/**
 * Helper to parse bolding and clean leftover asterisks inline
 */
function renderInlineFormatted(line: string, isUser = false): React.ReactNode[] {
  let cleanLine = line.replace(/^#{1,6}\s*/, '').trim();

  const segments: React.ReactNode[] = [];
  let cursor = 0;
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match: RegExpExecArray | null;

  while ((match = boldRegex.exec(cleanLine)) !== null) {
    if (match.index > cursor) {
      const plain = cleanLine.substring(cursor, match.index).replace(/\*/g, '');
      if (plain) segments.push(plain);
    }
    segments.push(
      <strong
        key={`b-${match.index}`}
        style={{
          fontWeight: 700,
          color: isUser ? '#FFFFFF' : '#0F172A',
        }}
      >
        {match[1].replace(/\*/g, '')}
      </strong>
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < cleanLine.length) {
    const tail = cleanLine.substring(cursor).replace(/\*/g, '');
    if (tail) segments.push(tail);
  }

  return segments;
}

/**
 * Render sanitized text with natural layout (clean bolding, bullets, clean headings)
 * without raw markdown characters (#, *, \', etc.).
 */
export function renderNaturalFormattedText(rawText: string, isUser = false): React.ReactNode {
  const sanitized = sanitizeNaturalText(rawText);
  const lines = sanitized.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {lines.map((rawLine, idx) => {
        let line = rawLine.trim();

        if (!line) {
          return <div key={idx} style={{ height: '4px' }} />;
        }

        const isHeading = /^#{1,4}\s+/.test(line);
        if (isHeading) {
          line = line.replace(/^#{1,4}\s+/, '');
        }

        let isBullet = false;
        if (/^[\*\-•]\s+/.test(line)) {
          isBullet = true;
          line = line.replace(/^[\*\-•]\s+/, '');
        } else if (/^\d+\.\s+/.test(line)) {
          const matchNum = line.match(/^(\d+\.)\s+(.*)/);
          if (matchNum) {
            isBullet = true;
            line = matchNum[2];
          }
        }

        let isQuote = false;
        if (/^>\s*/.test(line)) {
          isQuote = true;
          line = line.replace(/^>\s*/, '');
        }

        const formatted = renderInlineFormatted(line, isUser);

        if (isHeading) {
          return (
            <div
              key={idx}
              style={{
                fontSize: '1.02rem',
                fontWeight: 800,
                color: isUser ? '#FFFFFF' : '#1E1B4B',
                marginTop: idx > 0 ? '10px' : 0,
                marginBottom: '4px',
                borderBottom: isUser ? 'none' : '1px solid #EDE9FE',
                paddingBottom: '4px',
              }}
            >
              {formatted}
            </div>
          );
        }

        if (isQuote) {
          return (
            <div
              key={idx}
              style={{
                padding: '8px 14px',
                borderLeft: isUser ? '3px solid rgba(255,255,255,0.6)' : '3px solid #7C3AED',
                background: isUser ? 'rgba(255,255,255,0.1)' : '#F5F3FF',
                borderRadius: '0 8px 8px 0',
                fontSize: '0.88rem',
                fontStyle: 'italic',
                margin: '3px 0',
                color: isUser ? '#FFFFFF' : '#4C1D95',
              }}
            >
              {formatted}
            </div>
          );
        }

        if (isBullet) {
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                paddingLeft: '4px',
                fontSize: '0.90rem',
                lineHeight: 1.55,
              }}
            >
              <span
                style={{
                  color: isUser ? 'rgba(255,255,255,0.7)' : '#7C3AED',
                  fontWeight: 900,
                  fontSize: '1rem',
                  lineHeight: '1.2',
                }}
              >
                •
              </span>
              <div style={{ flex: 1, color: isUser ? '#FFFFFF' : '#334155' }}>
                {formatted}
              </div>
            </div>
          );
        }

        return (
          <div
            key={idx}
            style={{
              fontSize: '0.90rem',
              lineHeight: 1.6,
              color: isUser ? '#FFFFFF' : '#1E293B',
            }}
          >
            {formatted}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Highlights prices (ex: 85 000 FCFA), quantities (ex: 145 pièces), products, and urgency in scripts
 * Formats the sales pitch in elegant, natural, readable italics with vibrant color accents.
 * Ensures text is properly justified and badges NEVER overlap or touch adjacent lines.
 */
function renderStylizedScriptText(text: string): React.ReactNode {
  const clean = text.replace(/\*\*/g, '').replace(/#/g, '').trim();
  const paragraphs = clean.split('\n').filter(p => p.trim().length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {paragraphs.map((p, pIdx) => {
        const parts: React.ReactNode[] = [];
        const tokenRegex = /(\d+[\s\d]*\s*(?:FCFA|EUR|USD|XAF|XOF)|\b\d+\s*(?:pièces?|unités?|articles?|habits?|vêtements?|robes?|téléphones?)(?:\s*(?:restantes?|en stock))?|🚨[^!]+!🚨|Offre\s+Flash|[“"][^”"]+[”"])/gi;

        let lastPos = 0;
        let match: RegExpExecArray | null;

        while ((match = tokenRegex.exec(p)) !== null) {
          if (match.index > lastPos) {
            parts.push(p.substring(lastPos, match.index));
          }

          const matchedText = match[0];
          if (/(?:FCFA|EUR|USD|XAF|XOF)/i.test(matchedText)) {
            // Price pill in luminous Emerald Green with strict middle alignment and clean spacing
            parts.push(
              <span
                key={`price-${pIdx}-${match.index}`}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  lineHeight: '1.2',
                  padding: '2px 9px',
                  borderRadius: '16px',
                  fontStyle: 'normal',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  margin: '2px 5px',
                  verticalAlign: 'middle',
                  boxShadow: '0 1px 3px rgba(5, 150, 105, 0.25)',
                }}
              >
                <span>🏷️</span>
                <span>{matchedText}</span>
              </span>
            );
          } else if (/(?:pièce|unité|article|habit|vêtement|robe|téléphone)/i.test(matchedText)) {
            // Urgency & stock scarcity pill in radiant Amber Fire
            parts.push(
              <span
                key={`stock-${pIdx}-${match.index}`}
                style={{
                  background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  lineHeight: '1.2',
                  padding: '2px 9px',
                  borderRadius: '16px',
                  fontStyle: 'normal',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  margin: '2px 5px',
                  verticalAlign: 'middle',
                  boxShadow: '0 1px 3px rgba(217, 119, 6, 0.25)',
                }}
              >
                <span>🔥</span>
                <span>{matchedText}</span>
              </span>
            );
          } else if (/[“"][^”"]+[”"]/.test(matchedText)) {
            // Product tag in Royal Violet
            parts.push(
              <span
                key={`prod-${pIdx}-${match.index}`}
                style={{
                  background: '#EDE9FE',
                  color: '#6D28D9',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  lineHeight: '1.2',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  border: '1px solid #C4B5FD',
                  fontStyle: 'normal',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  margin: '2px 4px',
                  verticalAlign: 'middle',
                }}
              >
                <span>📦</span>
                <span>{matchedText}</span>
              </span>
            );
          } else if (/Flash|🚨/i.test(matchedText)) {
            // Flash offer in Crimson
            parts.push(
              <span
                key={`flash-${pIdx}-${match.index}`}
                style={{
                  background: '#FEE2E2',
                  color: '#B91C1C',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  lineHeight: '1.2',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  border: '1px solid #FCA5A5',
                  fontStyle: 'normal',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  margin: '2px 4px',
                  verticalAlign: 'middle',
                }}
              >
                <span>⚡</span>
                <span>{matchedText.replace(/🚨/g, '').trim()}</span>
              </span>
            );
          } else {
            // Quoted text
            parts.push(
              <span key={`quote-${pIdx}-${match.index}`} style={{ fontWeight: 700, color: '#4338CA', fontStyle: 'italic' }}>
                {matchedText}
              </span>
            );
          }

          lastPos = match.index + match[0].length;
        }

        if (lastPos < p.length) {
          parts.push(p.substring(lastPos));
        }

        // Salutation line detection (e.g. "Chers membres VIP,", "Bonjour TikTok !", "Appel à tous les revendeurs !")
        const isSalutation = pIdx === 0 && (p.includes('!') || p.includes(',') || /VIP|TikTok|revendeur|Marketplace|Bonjour|Chers/i.test(p));

        if (isSalutation) {
          return (
            <div
              key={pIdx}
              style={{
                fontSize: '1rem',
                lineHeight: 1.5,
                color: '#1E1B4B',
                fontWeight: 800,
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: '1px solid rgba(196, 181, 253, 0.4)',
                paddingBottom: '8px',
                marginBottom: '4px',
              }}
            >
              <span style={{ fontSize: '1.15rem' }}>👋</span>
              <span>{parts}</span>
            </div>
          );
        }

        return (
          <div
            key={pIdx}
            style={{
              fontSize: '0.94rem',
              lineHeight: 2.3,
              textAlign: 'justify',
              color: '#312E81',
              fontStyle: 'italic',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            {parts}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Premium Copyable Script Box with toast feedback
 */
function PremiumScriptBox({ scriptText, channelName, badgeColor }: { scriptText: string; channelName: string; badgeColor: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const plainText = scriptText
      .replace(/\*\*/g, '')
      .replace(/#/g, '')
      .replace(/^>\s*/gm, '')
      .trim();

    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #FAF5FF 0%, #F5F3FF 50%, #EDE9FE 100%)',
        border: '1.5px dashed #A78BFA',
        borderRadius: '14px',
        padding: '16px 18px',
        marginTop: '12px',
        position: 'relative',
        boxShadow: '0 4px 14px rgba(124, 58, 237, 0.08)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '8px',
              background: '#EDE9FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Megaphone size={15} color="#7C3AED" />
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#4C1D95', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Script d'Annonce Prêt à Diffuser ({channelName}) :
          </span>
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)' : '#FFFFFF',
            color: copied ? '#FFFFFF' : '#6D28D9',
            border: copied ? '1.5px solid #059669' : '1.5px solid #C4B5FD',
            borderRadius: '10px',
            padding: '6px 14px',
            fontSize: '0.80rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: copied ? '0 2px 8px rgba(16, 185, 129, 0.35)' : '0 2px 5px rgba(124, 58, 237, 0.1)',
            transition: 'all 0.2s ease',
          }}
        >
          {copied ? <CheckCircle2 size={15} color="#FFFFFF" /> : <Copy size={15} />}
          <span>{copied ? 'Copié dans le presse-papier !' : 'Copier ce Script'}</span>
        </button>
      </div>

      <div style={{ padding: '4px 6px', background: 'rgba(255, 255, 255, 0.65)', borderRadius: '10px', border: '1px solid rgba(196, 181, 253, 0.3)' }}>
        {renderStylizedScriptText(scriptText)}
      </div>
    </div>
  );
}

/**
 * Line-by-line Structured Strategy Cards Parser & Renderer
 * Takes any LLM strategy output and transforms it into 4 high-converting, colorful, beautifully styled cards!
 */
export function renderProfessionalStrategyCards(rawText: string): React.ReactNode {
  const sanitized = sanitizeNaturalText(rawText);

  // Line-by-line robust parsing
  const lines = sanitized.split('\n');
  const cards: Array<{ number: string; title: string; strategy: string; script: string }> = [];
  let intro = '';
  let conclusion = '';
  let currentCard: { number: string; title: string; strategy: string; script: string } | null = null;
  let currentField: 'strategy' | 'script' = 'strategy';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect new card start (ex: "1. WhatsApp...", "2. TikTok...", "3. Facebook...", "4. Packs...")
    const numMatch = line.match(/^(?:#{1,4}\s*)?(\d+)[\.\)\-]\s*(.*)/i);
    if (numMatch) {
      if (currentCard) {
        cards.push(currentCard);
      }
      currentCard = {
        number: numMatch[1],
        title: numMatch[2].replace(/\*\*/g, '').replace(/#/g, '').trim(),
        strategy: '',
        script: '',
      };
      currentField = 'strategy';
      continue;
    }

    if (!currentCard) {
      // Intro line before the first card
      intro += (intro ? ' ' : '') + line;
      continue;
    }

    // Detect field switch: Stratégie vs Script
    if (/^(?:stratégie|démarche|approche)\s*[:：]/i.test(line)) {
      currentField = 'strategy';
      const clean = line.replace(/^(?:stratégie|démarche|approche)\s*[:：]\s*/i, '').trim();
      if (clean) currentCard.strategy += (currentCard.strategy ? ' ' : '') + clean;
      continue;
    }

    if (/^(?:script|modèle|annonce|texte)\s*[:：]/i.test(line)) {
      currentField = 'script';
      const clean = line.replace(/^(?:script|modèle|annonce|texte)\s*[:：]\s*/i, '').trim();
      if (clean) currentCard.script += (currentCard.script ? '\n' : '') + clean;
      continue;
    }

    // Detect conclusion line at the end
    if (/^en utilisant ces/i.test(line) || /^avec ces/i.test(line) || /^ces stratégies/i.test(line)) {
      conclusion += (conclusion ? ' ' : '') + line;
      continue;
    }

    // Accumulate
    if (currentField === 'strategy') {
      currentCard.strategy += (currentCard.strategy ? ' ' : '') + line;
    } else {
      currentCard.script += (currentCard.script ? '\n' : '') + line;
    }
  }

  if (currentCard) {
    cards.push(currentCard);
  }

  // Fallback if cards could not be split by numbers: create at least 1 card
  if (cards.length === 0) {
    cards.push({
      number: '1',
      title: 'Plan d\'Écoulement Rapide Global',
      strategy: sanitized,
      script: '',
    });
  }

  // Channel theme configuration
  const getTheme = (title: string, num: string) => {
    const t = title.toLowerCase();
    if (t.includes('whatsapp') || num === '1') {
      return {
        badge: 'WhatsApp Business VIP',
        badgeBg: '#DCFCE7',
        badgeColor: '#166534',
        border: '2px solid #86EFAC',
        gradientHeader: 'linear-gradient(135deg, #065F46 0%, #047857 100%)',
        accentBg: '#F0FDF4',
        icon: <MessageCircle size={20} color="#FFFFFF" />,
        ctaLabel: '24h à 48h • Vente Directe',
      };
    }
    if (t.includes('tiktok') || t.includes('live') || num === '2') {
      return {
        badge: 'TikTok Live & Déballage',
        badgeBg: '#EDE9FE',
        badgeColor: '#6D28D9',
        border: '2px solid #C4B5FD',
        gradientHeader: 'linear-gradient(135deg, #581C87 0%, #7C3AED 100%)',
        accentBg: '#FAF5FF',
        icon: <Video size={20} color="#FFFFFF" />,
        ctaLabel: 'Live Déballage Vidéo',
      };
    }
    if (t.includes('facebook') || t.includes('marketplace') || num === '3') {
      return {
        badge: 'Facebook Marketplace & Groupes',
        badgeBg: '#EFF6FF',
        badgeColor: '#1E40AF',
        border: '2px solid #93C5FD',
        gradientHeader: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
        accentBg: '#EFF6FF',
        icon: <Globe size={20} color="#FFFFFF" />,
        ctaLabel: 'Offre Flash Limitée',
      };
    }
    return {
      badge: 'Packs Revendeurs & Gros',
      badgeBg: '#FEF3C7',
      badgeColor: '#92400E',
      border: '2px solid #FCD34D',
      gradientHeader: 'linear-gradient(135deg, #92400E 0%, #D97706 100%)',
      accentBg: '#FFFBEB',
      icon: <PackageCheck size={20} color="#FFFFFF" />,
      ctaLabel: 'Déstockage en Volume',
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Intro banner */}
      {intro && (
        <div
          style={{
            background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
            border: '1.5px solid #C4B5FD',
            borderRadius: '14px',
            padding: '16px 20px',
            fontSize: '0.92rem',
            lineHeight: 1.6,
            color: '#4C1D95',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 2px 6px rgba(124, 58, 237, 0.08)',
          }}
        >
          <Sparkles size={24} color="#7C3AED" style={{ flexShrink: 0 }} />
          <div>{intro.replace(/\*\*/g, '').replace(/#/g, '')}</div>
        </div>
      )}

      {/* Cards 2-column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {cards.map((c, idx) => {
          const theme = getTheme(c.title, c.number);

          return (
            <div
              key={idx}
              className="card"
              style={{
                borderRadius: '16px',
                border: theme.border,
                background: '#FFFFFF',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '0',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              {/* Premium Gradient Header */}
              <div
                style={{
                  background: theme.gradientHeader,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {theme.icon}
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'rgba(255, 255, 255, 0.85)',
                        display: 'block',
                      }}
                    >
                      STRATÉGIE #{c.number.padStart(2, '0')} • {theme.badge}
                    </span>
                    <h4 style={{ margin: '2px 0 0 0', fontSize: '1.02rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                      {c.title}
                    </h4>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: '#FFFFFF',
                    color: theme.badgeColor,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {theme.ctaLabel}
                </span>
              </div>

              {/* Card Body */}
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {/* Tactical Approach section */}
                {c.strategy && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <Target size={15} color="#4338CA" />
                      <strong style={{ fontSize: '0.78rem', color: '#1E1B4B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Démarche Stratégique Commerciale :
                      </strong>
                    </div>
                    <div
                      style={{
                        fontSize: '0.88rem',
                        lineHeight: 1.6,
                        color: '#334155',
                        background: '#F8FAFC',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      {c.strategy.replace(/\*\*/g, '').replace(/#/g, '')}
                    </div>
                  </div>
                )}

                {/* Ready-to-Use Script Callout box with highlighted prices & urgency */}
                {c.script && (
                  <PremiumScriptBox scriptText={c.script} channelName={theme.badge} badgeColor={theme.badgeColor} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Conclusion note */}
      {conclusion && (
        <div
          style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
            border: '1.5px solid #86EFAC',
            borderRadius: '12px',
            padding: '14px 18px',
            fontSize: '0.88rem',
            lineHeight: 1.5,
            color: '#166534',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <TrendingUp size={20} color="#15803D" style={{ flexShrink: 0 }} />
          <div>{conclusion.replace(/\*\*/g, '').replace(/#/g, '')}</div>
        </div>
      )}
    </div>
  );
}
