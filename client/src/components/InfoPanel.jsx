import React from 'react';

// Detect if a line is an ALL-CAPS heading (at least 4 chars, mostly uppercase letters)
const isHeadingLine = (line) => {
  const trimmed = line.trim();
  if (trimmed.length < 4) return false;
  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return false;
  const upperRatio = (letters.match(/[A-Z]/g) || []).length / letters.length;
  return upperRatio >= 0.8 && trimmed === trimmed.toUpperCase();
};

// Detect bullet / dash items
const isBulletLine = (line) => /^\s*([•\-–—]|\d+\.)/.test(line);

// InfoPanel — for infoBefore / infoAfter instructional text blocks
export function InfoPanel({ text }) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="info-panel">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Blank line → small visual gap
        if (trimmed === '') {
          return <div key={i} style={{ height: '6px' }} />;
        }

        // ALL-CAPS heading → small accent uppercase label
        if (isHeadingLine(trimmed)) {
          return (
            <p key={i} style={{
              color: 'var(--accent)',
              fontWeight: 700,
              fontSize: '0.78rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 0,
              marginTop: i === 0 ? 0 : '4px',
            }}>
              {trimmed}
            </p>
          );
        }

        // Bullet / dash item
        if (isBulletLine(trimmed)) {
          const content = trimmed.replace(/^[•\-–—]\s*/, '');
          return (
            <div key={i} style={{
              display: 'flex',
              gap: '10px',
              paddingLeft: '4px',
              color: 'var(--text-primary)',
              lineHeight: '1.6',
              fontSize: '0.95rem',
            }}>
              <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px', fontSize: '0.75rem' }}>▸</span>
              <span>{content || trimmed}</span>
            </div>
          );
        }

        // Section title detection:
        // A short line that is surrounded by blank lines (or at start/end of text),
        // not bullet and not ALL-CAPS → render as a visible section heading (h4).
        const prevBlank = i === 0 || lines[i - 1].trim() === '';
        const nextBlank = i === lines.length - 1 || lines[i + 1].trim() === '';
        const isIsolated = prevBlank && nextBlank;
        const isShort = trimmed.length <= 100;

        if (isIsolated && isShort) {
          return (
            <h4 key={i} style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              margin: '4px 0 2px 0',
              lineHeight: 1.4,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '6px',
            }}>
              {trimmed}
            </h4>
          );
        }

        // Normal body text
        return (
          <p key={i} style={{
            color: 'var(--text-primary)',
            lineHeight: '1.7',
            fontSize: '0.97rem',
            marginBottom: 0,
          }}>
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

// KeyQuestionPanel — for "Key Question" highlighted block
export function KeyQuestionPanel({ text }) {
  if (!text) return null;
  return (
    <div className="key-question-panel">
      <span className="key-question-label">Key Question</span>
      <p className="key-question-text">{text}</p>
    </div>
  );
}

// DomainInfoPanel — definition block shown at top of each domain
export function DomainInfoPanel({ text }) {
  if (!text) return null;
  return (
    <div className="domain-info-panel">
      {text.split('\n').map((line, i) => (
        line.trim() === '' ? <br key={i} /> : <p key={i}>{line}</p>
      ))}
    </div>
  );
}
