// COMMERCIA Text Sanitizer & Natural Formatter
// Converts raw LLM outputs (markdown tags, encoding glitches, HTML artifacts, raw asterisks)
// into clean, natural, human-readable French text with elegant typography.

import React from 'react';

/**
 * Clean encoding glitches and artifacts that often appear in LLM responses
 */
export function sanitizeNaturalText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Fix common UTF-8 / latin1 double-encoding glitches
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
    .replace(/â€/g, '”')
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

  // 2. Remove markdown code fences or raw backticks (```json, ```markdown, etc.)
  cleaned = cleaned.replace(/```[a-zA-Z0-9_-]*\n?/g, '');
  cleaned = cleaned.replace(/```/g, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // 3. Remove raw HTML tags if any leaked in
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, '');

  return cleaned.trim();
}

/**
 * Render sanitized text with natural layout (clean bolding, bullets, clean headings)
 * instead of raw markdown characters.
 */
export function renderNaturalFormattedText(rawText: string, isUser = false): React.ReactNode {
  const sanitized = sanitizeNaturalText(rawText);
  const lines = sanitized.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((rawLine, idx) => {
        let line = rawLine.trim();

        // Empty line spacer
        if (!line) {
          return <div key={idx} style={{ height: '6px' }} />;
        }

        // Detect and clean headers (#, ##, ###)
        let isHeading = false;
        if (/^#{1,4}\s+/.test(line)) {
          isHeading = true;
          line = line.replace(/^#{1,4}\s+/, '');
        }

        // Detect and clean bullet points (*, -, •)
        let isBullet = false;
        if (/^[\*\-•]\s+/.test(line)) {
          isBullet = true;
          line = line.replace(/^[\*\-•]\s+/, '');
        } else if (/^\d+\.\s+/.test(line)) {
          // Numbered bullet like 1. 2.
          const matchNum = line.match(/^(\d+\.)\s+(.*)/);
          if (matchNum) {
            isBullet = true;
            line = matchNum[2];
          }
        }

        // Detect blockquotes (> )
        let isQuote = false;
        if (/^>\s*/.test(line)) {
          isQuote = true;
          line = line.replace(/^>\s*/, '');
        }

        // Parse inline bolding (**text**) and italic (*text*)
        const segments: React.ReactNode[] = [];
        let cursor = 0;
        const boldRegex = /\*\*(.*?)\*\*/g;
        let match: RegExpExecArray | null;

        while ((match = boldRegex.exec(line)) !== null) {
          if (match.index > cursor) {
            segments.push(line.substring(cursor, match.index));
          }
          segments.push(
            <span
              key={`b-${match.index}`}
              style={{
                fontWeight: 700,
                color: isUser ? '#FFFFFF' : '#0F172A',
              }}
            >
              {match[1]}
            </span>
          );
          cursor = match.index + match[0].length;
        }

        if (cursor < line.length) {
          segments.push(line.substring(cursor));
        }

        // Clean any leftover single asterisks like *mot*
        const renderedContent = segments.map((seg, sIdx) => {
          if (typeof seg === 'string') {
            return seg.replace(/\*([^*]+)\*/g, '$1');
          }
          return seg;
        });

        // 1. Heading style
        if (isHeading) {
          return (
            <div
              key={idx}
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: isUser ? '#FFFFFF' : '#0F172A',
                marginTop: idx > 0 ? '6px' : 0,
                marginBottom: '2px',
              }}
            >
              {renderedContent}
            </div>
          );
        }

        // 2. Quote style
        if (isQuote) {
          return (
            <div
              key={idx}
              style={{
                padding: '6px 12px',
                borderLeft: isUser ? '3px solid rgba(255,255,255,0.6)' : '3px solid #7C3AED',
                background: isUser ? 'rgba(255,255,255,0.1)' : '#F5F3FF',
                borderRadius: '0 8px 8px 0',
                fontSize: '0.88rem',
                fontStyle: 'italic',
                margin: '2px 0',
              }}
            >
              {renderedContent}
            </div>
          );
        }

        // 3. Bullet item style
        if (isBullet) {
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                paddingLeft: '6px',
                fontSize: '0.9rem',
                lineHeight: 1.5,
              }}
            >
              <span
                style={{
                  color: isUser ? 'rgba(255,255,255,0.7)' : '#0062FF',
                  fontWeight: 900,
                  fontSize: '1rem',
                  lineHeight: '1.2',
                }}
              >
                •
              </span>
              <div style={{ flex: 1 }}>{renderedContent}</div>
            </div>
          );
        }

        // 4. Standard paragraph
        return (
          <div
            key={idx}
            style={{
              fontSize: '0.9rem',
              lineHeight: 1.55,
              color: isUser ? '#FFFFFF' : '#1E293B',
            }}
          >
            {renderedContent}
          </div>
        );
      })}
    </div>
  );
}
