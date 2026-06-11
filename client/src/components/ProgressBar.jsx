import React from 'react';
import { questionnaireData } from '../data/questionnaire';

export default function ProgressBar({ currentPartIndex }) {
  const total = questionnaireData.length;
  const percentage = total <= 1 ? 0 : (currentPartIndex / (total - 1)) * 100;

  // Group by section for big dot detection
  const sections = [1, 2, 3];

  return (
    <div className="progress-bar-wrapper">
      {/* Section labels */}
      <div className="progress-section-labels">
        {sections.map(sec => {
          const partsInSection = questionnaireData.filter(p => p.section === sec);
          const firstIdx = questionnaireData.findIndex(p => p.section === sec);
          const isDone = firstIdx < currentPartIndex;
          const isActive = partsInSection.some((_, i) => questionnaireData.indexOf(partsInSection[i]) === currentPartIndex);
          return (
            <div key={sec} className={`section-label ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
              Section {sec}
            </div>
          );
        })}
      </div>

      {/* Progress track */}
      <div className="progress-container" style={{ overflowX: 'auto', paddingBottom: '8px' }}>
        <div className="progress-track" style={{ left: '20px', right: '20px' }} />
        <div className="progress-track-fill" style={{ left: '20px', width: `${percentage}%` }} />

        {questionnaireData.map((part, index) => {
          // Big dot = first part of each section (section boundary)
          const prevSection = index > 0 ? questionnaireData[index - 1].section : null;
          const isBig = index === 0 || part.section !== prevSection;

          let statusClass = `dot-node ${isBig ? 'dot-big' : 'dot-small'}`;
          if (index < currentPartIndex) statusClass += ' completed';
          else if (index === currentPartIndex) statusClass += ' active';

          return (
            <div
              key={part.id}
              className="progress-node"
              title={`${part.sectionLabel} — ${part.title}`}
              style={{ flexShrink: 0, margin: '0 4px' }}
            >
              <div className={statusClass} />
            </div>
          );
        })}
      </div>

      {/* Current part label */}
      <div className="progress-label">
        <span style={{ color: 'var(--accent)' }}>{questionnaireData[currentPartIndex]?.sectionLabel}</span>
        {' — '}
        {questionnaireData[currentPartIndex]?.title}
        <span style={{ marginLeft: '10px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          ({currentPartIndex + 1} / {total})
        </span>
      </div>
    </div>
  );
}
