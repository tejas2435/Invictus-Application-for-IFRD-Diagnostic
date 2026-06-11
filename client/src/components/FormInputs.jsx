import React from 'react';

// Helper to get card class based on answered/error state
function cardClass(hasError, isAnswered) {
  if (hasError) return 'question-card error-card';
  if (isAnswered) return 'question-card answered-card';
  return 'question-card';
}

export function TextInput({ question, value, onChange, hasError, isAnswered }) {
  return (
    <div id={`q-${question.id}`} className={cardClass(hasError, isAnswered)}>
      {hasError && <div className="field-error-tag">⚠ Required</div>}
      <div className="question-text">{question.text}</div>
      {question.hint && <div className="question-hint">{question.hint}</div>}
      <input
        type="text"
        className="input-text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here..."
      />
    </div>
  );
}

export function DateInput({ question, value, onChange, hasError, isAnswered }) {
  return (
    <div id={`q-${question.id}`} className={cardClass(hasError, isAnswered)}>
      {hasError && <div className="field-error-tag">⚠ Required</div>}
      <div className="question-text">{question.text}</div>
      <input
        type="text"
        className="input-text"
        placeholder="DD-MM-YYYY"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function CheckboxSingle({ question, value, onChange, hasError, isAnswered }) {
  return (
    <div id={`q-${question.id}`} className={cardClass(hasError, isAnswered)}>
      <label className={`option-item ${value ? 'selected' : ''}`} style={{ cursor: 'pointer' }}>
        <input
          type="checkbox"
          className="option-input"
          checked={value || false}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{question.text}</span>
      </label>
    </div>
  );
}

export function TextAreaInput({ question, value, onChange, hasError, isAnswered }) {
  return (
    <div id={`q-${question.id}`} className={cardClass(hasError, isAnswered)}>
      {hasError && <div className="field-error-tag">⚠ Required</div>}
      <div className="question-text">{question.text}</div>
      {question.hint && <div className="question-hint">{question.hint}</div>}
      <textarea
        className="input-text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here..."
        rows={4}
        style={{ resize: 'vertical' }}
      />
    </div>
  );
}

export function SelectDropdown({ question, value, onChange, hasError, isAnswered }) {
  const selected = value?.main || '';
  const otherText = value?.other || '';
  const showOther = question.allowOther && selected === 'Other';

  return (
    <div id={`q-${question.id}`} className={cardClass(hasError, isAnswered)}>
      {hasError && <div className="field-error-tag">⚠ Required</div>}
      <div className="question-text">{question.text}</div>
      {question.hint && <div className="question-hint">{question.hint}</div>}
      <select
        className="input-text"
        value={selected}
        onChange={(e) => onChange({ main: e.target.value, other: '' })}
        style={{ cursor: 'pointer' }}
      >
        <option value="">— Select an option —</option>
        {question.options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {showOther && (
        <input
          type="text"
          className="input-text"
          style={{ marginTop: '10px' }}
          placeholder="Please specify..."
          value={otherText}
          onChange={(e) => onChange({ main: 'Other', other: e.target.value })}
        />
      )}
    </div>
  );
}

export function OptionSelection({ question, value, onChange, hasError, isAnswered }) {
  return (
    <div id={`q-${question.id}`} className={cardClass(hasError, isAnswered)}>
      {hasError && <div className="field-error-tag">⚠ Required</div>}
      <div className="question-text">{question.text}</div>
      {question.hint && <div className="question-hint">{question.hint}</div>}
      <div className="options-list">
        {question.options.map((opt) => (
          <label
            key={opt}
            className={`option-item ${value === opt ? 'selected' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            <input
              type="radio"
              className="option-input"
              name={question.id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function CheckboxList({ question, value, onChange, hasError, isAnswered }) {
  const selected = value?.items || [];
  const otherText = value?.other || '';
  const limit = question.limit;

  const handleToggle = (opt) => {
    let newSelected;
    if (selected.includes(opt)) {
      newSelected = selected.filter((s) => s !== opt);
    } else {
      if (limit && selected.length >= limit) return;
      newSelected = [...selected, opt];
    }
    onChange({ items: newSelected, other: otherText });
  };

  const showOther = question.allowOther && selected.includes('Other');

  return (
    <div id={`q-${question.id}`} className={cardClass(hasError, isAnswered)}>
      {hasError && <div className="field-error-tag">⚠ Required</div>}
      <div className="question-text">{question.text}</div>
      {question.hint && <div className="question-hint">{question.hint}</div>}
      {limit && (
        <div className="question-hint" style={{ color: selected.length >= limit ? 'var(--accent)' : 'var(--text-secondary)', marginBottom: '10px' }}>
          Select up to {limit}. ({selected.length}/{limit} selected)
        </div>
      )}
      <div className="options-list">
        {question.options.map((opt) => {
          const isChecked = selected.includes(opt);
          const isDisabled = !isChecked && limit && selected.length >= limit;
          return (
            <label
              key={opt}
              className={`option-item ${isChecked ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
              style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1 }}
            >
              <input
                type="checkbox"
                className="option-input"
                checked={isChecked}
                disabled={isDisabled}
                onChange={() => handleToggle(opt)}
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
      {showOther && (
        <input
          type="text"
          className="input-text"
          style={{ marginTop: '10px' }}
          placeholder="Please specify..."
          value={otherText}
          onChange={(e) => onChange({ items: selected, other: e.target.value })}
        />
      )}
    </div>
  );
}
