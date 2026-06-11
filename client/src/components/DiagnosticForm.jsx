import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';
import { questionnaireData } from '../data/questionnaire';
import ProgressBar from './ProgressBar';
import { InfoPanel, KeyQuestionPanel, DomainInfoPanel } from './InfoPanel';
import ProfileMenu from './ProfileMenu';
import {
  TextAreaInput, SelectDropdown, OptionSelection,
  CheckboxList, TextInput, CheckboxSingle, DateInput
} from './FormInputs';

const SERVER_URL = 'http://localhost:5000/api/save';

function DiagnosticForm() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [errorIds, setErrorIds] = useState([]);

  useEffect(() => {
    const storedUserId = localStorage.getItem('invictus_userId');
    const storedName = localStorage.getItem('invictus_userName') || '';
    if (!storedUserId) {
      navigate('/');
      return;
    }
    setUserId(storedUserId);
    setUserName(storedName);

    const savedResponses = localStorage.getItem('invictus_responses');
    if (savedResponses) setResponses(JSON.parse(savedResponses));

    const savedPart = localStorage.getItem('invictus_currentPart');
    if (savedPart !== null) setCurrentPartIndex(parseInt(savedPart, 10));
  }, [navigate]);

  if (!userId) return null;

  const currentPart = questionnaireData[currentPartIndex];

  const handleAnswerChange = (questionId, value) => {
    const updatedResponses = {
      ...responses,
      [currentPart.id]: {
        ...responses[currentPart.id],
        [questionId]: value
      }
    };
    setResponses(updatedResponses);
    localStorage.setItem('invictus_responses', JSON.stringify(updatedResponses));
    setValidationError('');
    setErrorIds([]);
  };

  const handleSaveAndNext = async () => {
    // Validation — skip internal/consent meta questions
    const skipIds = ['consent_name', 'consent_date'];
    const partResponses = responses[currentPart.id] || {};
    const missing = [];
    
    for (const q of currentPart.questions) {
      if (skipIds.includes(q.id) || q.type === 'CheckboxSingle') continue;
      const val = partResponses[q.id];
      const isEmpty =
        val === undefined || val === null || val === '' ||
        (typeof val === 'object' && !Array.isArray(val) && (val.items ? val.items.length === 0 : !val.main)) ||
        (Array.isArray(val) && val.length === 0);
      if (isEmpty) missing.push(q.id);
    }

    if (missing.length > 0) {
      setErrorIds(missing);
      setValidationError(`${missing.length} question${missing.length > 1 ? 's' : ''} left unanswered. Please complete all highlighted fields.`);
      // Scroll to first unanswered question
      setTimeout(() => {
        const el = document.getElementById(`q-${missing[0]}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }
    
    setValidationError('');
    setErrorIds([]);
    setSaving(true);
    try {
      await fetch(SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, partId: currentPart.id, data: partResponses })
      });
    } catch (_) {
      // Server offline — continue anyway locally
    }

    if (currentPartIndex < questionnaireData.length - 1) {
      const nextIndex = currentPartIndex + 1;
      setCurrentPartIndex(nextIndex);
      localStorage.setItem('invictus_currentPart', nextIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setSubmitSuccess(true);
      localStorage.removeItem('invictus_currentPart');
      localStorage.removeItem('invictus_responses');
    }
    setSaving(false);
  };

  const handleBack = () => {
    if (currentPartIndex > 0) {
      const prevIndex = currentPartIndex - 1;
      setCurrentPartIndex(prevIndex);
      localStorage.setItem('invictus_currentPart', prevIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setValidationError('');
      setErrorIds([]);
    }
  };

  if (submitSuccess) {
    return (
      <div className="app-container" style={{ textAlign: 'center', marginTop: '100px' }}>
        <div className="question-card" style={{ borderColor: 'var(--accent)' }}>
          <h1 style={{ marginBottom: '20px' }}>Diagnostic Complete ✓</h1>
          <p>Thank you for completing the Invictus Future Readiness Diagnostic™ (IFRD™).</p>
          <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>
            Your assessment has been submitted. Your organisation will review your responses and you will be notified by email.
          </p>
          <button
            className="btn btn-secondary"
            style={{ marginTop: '30px', borderColor: '#fff', color: '#fff' }}
            onClick={() => { localStorage.removeItem('invictus_userId'); navigate('/'); }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (!currentPart) return null;

  const renderQuestion = (q) => {
    const value = responses[currentPart.id]?.[q.id];
    const isAnswered = (() => {
      if (value === undefined || value === null || value === '') return false;
      if (typeof value === 'object' && !Array.isArray(value)) {
        if (value.items !== undefined) return value.items.length > 0;
        return !!value.main;
      }
      return true;
    })();
    const hasError = errorIds.includes(q.id);
    const props = {
      key: q.id,
      question: q,
      value,
      hasError,
      isAnswered,
      onChange: (v) => {
        handleAnswerChange(q.id, v);
        // Remove from errorIds when answered
        if (errorIds.includes(q.id)) {
          setErrorIds(prev => prev.filter(id => id !== q.id));
        }
      }
    };
    
    // Auto-fill name on consent form
    if (q.id === 'consent_name' && !value && userName) {
      handleAnswerChange(q.id, userName);
    }

    switch (q.type) {
      case 'TextAreaInput': return <TextAreaInput {...props} />;
      case 'SelectDropdown': return <SelectDropdown {...props} />;
      case 'OptionSelection': return <OptionSelection {...props} />;
      case 'CheckboxList': return <CheckboxList {...props} />;
      case 'TextInput': return <TextInput {...props} />;
      case 'CheckboxSingle': return <CheckboxSingle {...props} />;
      case 'DateInput': return <DateInput {...props} />;
      default: return null;
    }
  };

  return (
    <div className="app-container fade-enter-active">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', letterSpacing: '0.02em' }}>
          Invictus Future Readiness Diagnostic™
        </h1>
        <ProfileMenu userId={userId} userName={userName} />
      </div>

      {/* Progress Bar */}
      <ProgressBar currentPartIndex={currentPartIndex} />

      {/* Validation Error */}
      {validationError && (
        <div style={{
          background: 'rgba(255, 65, 54, 0.15)',
          border: '1px solid var(--error)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: 'var(--error)',
          fontSize: '0.9rem'
        }}>
          ⚠ {validationError}
        </div>
      )}

      {/* Section header */}
      <div className="part-header" style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {currentPart.sectionLabel}
        </div>
        <h2 style={{ margin: 0 }}>{currentPart.title}</h2>
        {currentPart.subtitle && (
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{currentPart.subtitle}</p>
        )}
      </div>

      {/* Info before questions */}
      {currentPart.infoBefore && <InfoPanel text={currentPart.infoBefore} />}

      {/* Domain definition panel */}
      {currentPart.domainInfo && <DomainInfoPanel text={currentPart.domainInfo} />}

      {/* Key Question panel */}
      {currentPart.keyQuestion && <KeyQuestionPanel text={currentPart.keyQuestion} />}

      {/* Questions */}
      <div className="questions-container">
        {currentPart.questions.map(q => renderQuestion(q))}
      </div>

      {/* Info after questions */}
      {currentPart.infoAfter && <InfoPanel text={currentPart.infoAfter} />}

      {/* Consent internal use block */}
      {currentPart.type === 'consent' && (
        <div className="info-panel" style={{ marginTop: '20px', background: 'rgba(0,230,118,0.07)', borderColor: 'rgba(0,230,118,0.4)' }}>
          <h3 style={{ color: 'var(--accent)', marginBottom: '12px', fontSize: '0.9rem', letterSpacing: '0.1em' }}>INTERNAL USE ONLY</h3>
          <p><strong>Participant ID:</strong> {userId}</p>
          <p><strong>Organisation ID:</strong> {userId.substring(0, 8).toUpperCase()}</p>
          <p><strong>Assessment Date:</strong> {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      )}

      {/* Footer Nav */}
      <div className="form-footer">
        {currentPartIndex > 0 ? (
          <button
            className="btn btn-secondary"
            style={{ borderColor: 'rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.6)' }}
            onClick={handleBack}
            disabled={saving}
          >
            ← Back
          </button>
        ) : <div />}

        <button
          className="btn btn-secondary"
          style={{ borderColor: '#fff', color: '#fff' }}
          onClick={handleSaveAndNext}
          disabled={saving}
        >
          {saving ? 'Saving...' : currentPartIndex === questionnaireData.length - 1 ? 'Submit Assessment' : 'Save & Next →'}
        </button>
      </div>
    </div>
  );
}

export default DiagnosticForm;
