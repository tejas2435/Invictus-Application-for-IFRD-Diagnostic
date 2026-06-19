import React from 'react';

// InfoPanel — for {{ }} instructional text blocks
export function InfoPanel({ text, customStyle }) {
  if (!text) return null;
  return (
    <div className="info-panel" style={customStyle}>
      {text.split('\n').map((line, i) => (
        line.trim() === '' ? <br key={i} /> : <p key={i}>{line}</p>
      ))}
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
