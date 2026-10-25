// COMMERCIA Text Sanitizer & Natural Formatter
// Converts raw LLM outputs (markdown tags, encoding glitches, HTML artifacts, raw asterisks)
// into clean, natural, human-readable French text with elegant typography.

import React, { useState } from 'react';
import { Copy, CheckCircle2, MessageCircle, Video, Globe, PackageCheck, Sparkles, ChevronRight } from 'lucide-react';

/**
 * Clean encoding glitches and artifacts that often appear in LLM responses
 */
export function sanitizeNaturalText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Fix escaped slashes and apostrophes (e.g. d\'urgence, l\'offre, c\'est)
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
  // Strip any raw markdown heading hashes from inline
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

        // Clean any leading hashes (#, ##, ###)
        const isHeading = /^#{1,4}\s+/.test(line);
        if (isHeading) {
          line = line.replace(/^#{1,4}\s+/, '');
        }

        // Clean bullets
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

        // Blockquote
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
 * Single Copyable Script Box with toast feedback
 */
function CopyableScriptItem({ scriptText, label }: { scriptText: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      style={{
        background: '#FAF5FF',
        border: '1.5px dashed #DDD6FE',
        borderRadius: '12px',
        padding: '14px 16px',
        marginTop: '10px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label || '📢 Modèle d\'Annonce Prêt à l\'Emploi :'}
        </span>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? '#DCFCE7' : '#FFFFFF',
            color: copied ? '#15803D' : '#6D28D9',
            border: copied ? '1px solid #86EFAC' : '1px solid #DDD6FE',
            borderRadius: '6px',
            padding: '5px 10px',
            fontSize: '0.74rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.2s ease',
          }}
        >
          {copied ? <CheckCircle2 size={13} color="#16A34A" /> : <Copy size={13} />}
          <span>{copied ? 'Copié !' : 'Copier ce texte'}</span>
        </button>
      </div>
      <div
        style={{
          fontSize: '0.86rem',
          lineHeight: 1.55,
          color: '#3B0764',
          fontStyle: 'normal',
          whiteSpace: 'pre-line',
        }}
      >
        {scriptText}
      </div>
    </div>
  );
}

/**
 * Premium Structured Strategy Cards Renderer
 * Parses LLM strategy text and transforms it into high-converting cards with beautiful typography, badges, and 1-click copyable scripts.
 */
export function renderProfessionalStrategyCards(rawText: string): React.ReactNode {
  const sanitized = sanitizeNaturalText(rawText);

  // Split by numbered sections like "### 1.", "1.", "### 2.", "2."
  const sectionRegex = /(?:^|\n)(?:#{1,4}\s*)?(\d+[\.\)]\s*[^\n]+)/g;
  const sections: Array<{ title: string; body: string }> = [];

  let lastIndex = 0;
  let currentTitle = '';
  let match: RegExpExecArray | null;

  const matches: Array<{ title: string; index: number }> = [];
  while ((match = sectionRegex.exec(sanitized)) !== null) {
    matches.push({ title: match[1], index: match.index });
  }

  let introText = '';
  if (matches.length > 0) {
    introText = sanitized.substring(0, matches[0].index).trim();
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i + 1].index : sanitized.length;
      const rawChunk = sanitized.substring(start, end);
      const firstLineEnd = rawChunk.indexOf('\n');
      const title = (firstLineEnd !== -1 ? rawChunk.substring(0, firstLineEnd) : rawChunk)
        .replace(/^#{1,4}\s*/, '')
        .replace(/\*\*/g, '')
        .trim();
      const body = firstLineEnd !== -1 ? rawChunk.substring(firstLineEnd).trim() : '';
      sections.push({ title, body });
    }
  } else {
    // Fallback if no numbered sections found: render with natural formatted text
    return (
      <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px' }}>
        {renderNaturalFormattedText(sanitized)}
      </div>
    );
  }

  // Channel theme resolver
  const getChannelTheme = (title: string, index: number) => {
    const t = title.toLowerCase();
    if (t.includes('whatsapp')) {
      return {
        icon: <MessageCircle size={18} color="#15803D" />,
        badge: 'WhatsApp Business VIP',
        badgeBg: '#DCFCE7',
        badgeColor: '#15803D',
        border: '1.5px solid #86EFAC',
        headerBg: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
      };
    }
    if (t.includes('tiktok') || t.includes('live') || t.includes('déballage')) {
      return {
        icon: <Video size={18} color="#7C3AED" />,
        badge: 'TikTok Live & Déballage',
        badgeBg: '#EDE9FE',
        badgeColor: '#7C3AED',
        border: '1.5px solid #DDD6FE',
        headerBg: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
      };
    }
    if (t.includes('facebook') || t.includes('marketplace') || t.includes('groupe')) {
      return {
        icon: <Globe size={18} color="#1D4ED8" />,
        badge: 'Facebook Tech & Groupes',
        badgeBg: '#EFF6FF',
        badgeColor: '#1D4ED8',
        border: '1.5px solid #BFDBFE',
        headerBg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
      };
    }
    return {
      icon: <PackageCheck size={18} color="#B45309" />,
      badge: `Canal Stratégique #${index + 1}`,
      badgeBg: '#FEF3C7',
      badgeColor: '#B45309',
      border: '1.5px solid #FDE68A',
      headerBg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Introduction highlight note if present */}
      {introText && (
        <div
          style={{
            background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
            border: '1.5px solid #DDD6FE',
            borderRadius: '12px',
            padding: '16px 20px',
            fontSize: '0.90rem',
            lineHeight: 1.6,
            color: '#4C1D95',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Sparkles size={22} color="#7C3AED" style={{ flexShrink: 0 }} />
          <div>{introText.replace(/\*\*/g, '').replace(/#/g, '')}</div>
        </div>
      )}

      {/* Strategies Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
        {sections.map((sec, idx) => {
          const theme = getChannelTheme(sec.title, idx);

          // Separate Strategy description and Script
          let strategyPart = sec.body;
          let scriptPart = '';

          const scriptIndex = sec.body.search(/(?:script|modèle|texte\s*à\s*publier)\s*[:：]/i);
          if (scriptIndex !== -1) {
            strategyPart = sec.body.substring(0, scriptIndex).trim();
            scriptPart = sec.body.substring(scriptIndex).replace(/^(?:script|modèle|texte\s*à\s*publier)\s*[:：]\s*/i, '').trim();
          }

          // Clean markdown artifacts from script
          const cleanScript = scriptPart
            .replace(/\*\*/g, '')
            .replace(/^>\s*/gm, '')
            .replace(/\[([^\]]+)\]/g, '($1)') // [Au début du live] -> (Au début du live)
            .trim();

          return (
            <div
              key={idx}
              className="card"
              style={{
                borderRadius: '16px',
                border: theme.border,
                background: '#FFFFFF',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '0',
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  background: theme.headerBg,
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                  >
                    {theme.icon}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                      {sec.title}
                    </h4>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: '10px',
                    background: theme.badgeBg,
                    color: theme.badgeColor,
                  }}
                >
                  {theme.badge}
                </span>
              </div>

              {/* Card Body */}
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {/* Tactical approach */}
                {strategyPart && (
                  <div style={{ fontSize: '0.88rem', lineHeight: 1.55, color: '#334155' }}>
                    {renderNaturalFormattedText(strategyPart)}
                  </div>
                )}

                {/* Ready-to-use Script box */}
                {cleanScript && (
                  <CopyableScriptItem scriptText={cleanScript} label={`📢 Script d'accroche pour ${theme.badge} :`} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
