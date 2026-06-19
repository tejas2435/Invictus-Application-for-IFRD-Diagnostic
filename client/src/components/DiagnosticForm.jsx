import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';
import logo from '../assets/logo.png';
import { questionnaireData } from '../data/questionnaire';
import ProgressBar from './ProgressBar';
import { InfoPanel, KeyQuestionPanel, DomainInfoPanel } from './InfoPanel';
import ProfileMenu from './ProfileMenu';
import {
  TextAreaInput, SelectDropdown, OptionSelection,
  CheckboxList, TextInput, CheckboxSingle, DateInput, RadioOptions
} from './FormInputs';

import { supabase } from '../supabaseClient';



function DiagnosticForm() {
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userUUID, setUserUUID] = useState(null);
  const [userName, setUserName] = useState('');
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [highestPartIndex, setHighestPartIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [errorIds, setErrorIds] = useState([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [evaluationId, setEvaluationId] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [adminReport, setAdminReport] = useState(null);
  const [adminId, setAdminId] = useState('Pending Assignment');
  const [organization, setOrganization] = useState('General');
  const [preferredName, setPreferredName] = useState('');

  useEffect(() => {
    document.title = "Participant Diagnostic - Invictus";
    const storedUserId = localStorage.getItem('invictus_userId');
    const storedUUID = localStorage.getItem('invictus_userUUID');
    const storedName = localStorage.getItem('invictus_userName') || '';
    const storedEmail = localStorage.getItem('invictus_userEmail') || '';

    if (!storedUserId || !storedUUID) {
      navigate('/');
      return;
    }

    setUserId(storedUserId);
    setUserUUID(storedUUID);
    setUserName(storedName);
    setUserEmail(storedEmail);

    const loadSupabaseData = async () => {
      // 1. Fetch First Admin dynamically for the UI block
      const { data: adminData } = await supabase.from('profiles').select('custom_id').eq('role', 'admin').limit(1);
      if (adminData && adminData.length > 0) setAdminId(adminData[0].custom_id);

      const { data: profileData } = await supabase.from('profiles').select('organization, preferred_name').eq('id', storedUUID).single();
      if (profileData) {
        if (profileData.organization) setOrganization(profileData.organization);
        if (profileData.preferred_name) setPreferredName(profileData.preferred_name);
      }

      // 2. Fetch User Evaluation state
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('user_id', storedUUID)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        if (data.status === 'submitted') {
          setSubmitSuccess(true);
          const { data: reportDataArray } = await supabase
            .from('admin_reports')
            .select('*')
            .eq('participant_id', storedUUID)
            .order('created_at', { ascending: false })
            .limit(1);

          if (reportDataArray && reportDataArray.length > 0) {
            setAdminReport(reportDataArray[0]);
          }
          setIsInitializing(false);
          return;
        }

        setEvaluationId(data.id);
        if (data.responses) setResponses(data.responses);

        const hIndex = data.highest_part_index || 0;
        setHighestPartIndex(hIndex);

        const savedPart = localStorage.getItem(`invictus_currentPart_${storedUUID}`);
        if (savedPart !== null) {
          setCurrentPartIndex(parseInt(savedPart, 10));
        } else {
          setCurrentPartIndex(hIndex);
        }
      } else {
        // Fallback for new empty session - isolated to user_id
        const savedPart = localStorage.getItem(`invictus_currentPart_${storedUUID}`);
        if (savedPart !== null) setCurrentPartIndex(parseInt(savedPart, 10));
      }
      setIsInitializing(false);
    };

    loadSupabaseData();
  }, [navigate]);

  const handleNavigateToPart = (index) => {
    setCurrentPartIndex(index);
    localStorage.setItem(`invictus_currentPart_${userUUID}`, index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setValidationError('');
    setErrorIds([]);
  };

  useEffect(() => {
    if (!userId || !questionnaireData[currentPartIndex]) return;
    const part = questionnaireData[currentPartIndex];
    const partResponses = responses[part.id] || {};
    let updated = false;
    let newAnswers = { ...partResponses };

    part.questions.forEach(q => {
      if (q.id === 'consent_name' && !newAnswers[q.id] && userName) {
        newAnswers[q.id] = userName;
        updated = true;
      }
      if (q.id === 'consent_date' && !newAnswers[q.id]) {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        newAnswers[q.id] = `${dd}-${mm}-${yyyy}`;
        updated = true;
      }
    });

    if (updated) {
      const newGlobal = { ...responses, [part.id]: newAnswers };
      setResponses(newGlobal);
    }
  }, [currentPartIndex, userName, userId, responses]);

  if (isInitializing) {
    return (
      <div className="app-container" style={{ textAlign: 'center', marginTop: '100px', color: 'var(--text-secondary)' }}>
        <h2>Loading Assessment...</h2>
      </div>
    );
  }

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
    localStorage.setItem(`invictus_responses_${userUUID}`, JSON.stringify(updatedResponses));
    setValidationError('');
    setErrorIds([]);
  };

  const handleSaveAndNext = async () => {
    // Validation — skip only strictly internal/name variables
    const skipIds = ['consent_name', 'consent_date'];
    const partResponses = responses[currentPart.id] || {};
    const missing = [];

    for (const q of currentPart.questions) {
      if (skipIds.includes(q.id)) continue;
      const val = partResponses[q.id];
      let isEmpty = false;

      if (q.type === 'CheckboxSingle') {
        // Mandates CheckboxSingle is explicitly checked
        isEmpty = val !== true;
      } else {
        isEmpty =
          val === undefined || val === null || val === '' ||
          (typeof val === 'object' && !Array.isArray(val) && (val.items ? val.items.length === 0 : !val.main)) ||
          (Array.isArray(val) && val.length === 0);

        // Required text for "Other" field
        if (!isEmpty && typeof val === 'object' && !Array.isArray(val)) {
          if (val.main === 'Other' && (!val.other || val.other.trim() === '')) {
            isEmpty = true;
          }
          if (val.items && val.items.includes('Other') && (!val.other || val.other.trim() === '')) {
            isEmpty = true;
          }
        }
      }

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

    let newHighest = highestPartIndex;
    let nextIndex = currentPartIndex;

    if (currentPartIndex < questionnaireData.length - 1) {
      nextIndex = currentPartIndex + 1;
      newHighest = Math.max(highestPartIndex, nextIndex);
    }

    try {
      if (evaluationId) {
        await supabase.from('evaluations').update({
          responses: responses,
          highest_part_index: newHighest,
          updated_at: new Date().toISOString()
        }).eq('id', evaluationId);
      } else {
        const { data } = await supabase.from('evaluations').insert({
          user_id: userUUID,
          responses: responses,
          highest_part_index: newHighest,
          status: 'in-progress'
        }).select();
        if (data && data.length > 0) setEvaluationId(data[0].id);
      }
    } catch (_) {
      // Offline fallback
    }

    if (currentPartIndex < questionnaireData.length - 1) {
      setCurrentPartIndex(nextIndex);
      localStorage.setItem(`invictus_currentPart_${userUUID}`, nextIndex);
      setHighestPartIndex(newHighest);
      localStorage.setItem(`invictus_highestPart_${userUUID}`, newHighest);

      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    } else {
      setShowSubmitConfirm(true);
      setSaving(false);
    }
  };

  const confirmAndSubmit = async () => {
    setShowSubmitConfirm(false);

    if (evaluationId) {
      await supabase.from('evaluations').update({
        status: 'submitted',
        submitted_at: new Date().toISOString()
      }).eq('id', evaluationId);
    }

    setSubmitSuccess(true);
    localStorage.removeItem(`invictus_currentPart_${userUUID}`);
    localStorage.removeItem(`invictus_highestPart_${userUUID}`);
    localStorage.removeItem(`invictus_responses_${userUUID}`);
  };

  const cancelSubmit = () => {
    setShowSubmitConfirm(false);
  };

  const handleBack = () => {
    if (currentPartIndex > 0) {
      const prevIndex = currentPartIndex - 1;
      setCurrentPartIndex(prevIndex);
      localStorage.setItem(`invictus_currentPart_${userUUID}`, prevIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setValidationError('');
      setErrorIds([]);
    }
  };

  if (submitSuccess) {
    return (
      <div className="app-container" style={{ textAlign: 'center', marginTop: '100px' }}>
        <div className="question-card" style={{ borderColor: 'var(--accent)', maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px' }}>
          <img src={logo} alt="Invictus Logo" className="main-logo" />
          <h1 style={{ marginBottom: '20px' }}>Diagnostic Complete ✓</h1>

          {!adminReport ? (
            <>
              <p>Thank you for completing the Invictus Future Readiness Diagnostic™ (IFRD™).</p>
              <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>
                Your assessment has been submitted. Invictus Leader will review your responses and you will be notified by email.
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'left', marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid var(--accent)', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '15px' }}>Organisation Feedback received</h3>
              <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', width: '100%', color: 'var(--text-primary)', lineHeight: '1.6', fontSize: '1.05rem', margin: 0 }}>{adminReport.summary_text}</p>

              {adminReport.report_file_url && (
                <a href={adminReport.report_file_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ marginTop: '25px', display: 'inline-block', borderColor: 'var(--accent)', color: 'var(--accent)', textDecoration: 'none' }}>
                  📄 Download Attached Report
                </a>
              )}
            </div>
          )}

          <button
            className="btn btn-secondary"
            style={{ marginTop: '30px', borderColor: '#fff', color: '#fff', width: '200px' }}
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

    let component = null;
    switch (q.type) {
      case 'TextAreaInput': component = <TextAreaInput {...props} />; break;
      case 'SelectDropdown': component = <SelectDropdown {...props} />; break;
      case 'OptionSelection': component = <OptionSelection {...props} />; break;
      case 'RadioOptions': component = <RadioOptions {...props} />; break;
      case 'CheckboxList': component = <CheckboxList {...props} />; break;
      case 'TextInput': component = <TextInput {...props} />; break;
      case 'CheckboxSingle': component = <CheckboxSingle {...props} />; break;
      case 'DateInput': component = <DateInput {...props} />; break;
    }

    if (!component) return null;

    return (
      <React.Fragment key={q.id}>
        {q.preInfo && <InfoPanel text={q.preInfo} />}
        {component}
      </React.Fragment>
    );
  };

  return (
    <>
      <div className="app-container fade-enter-active">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div style={{ flex: 1 }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 2 }}>
            <img src={logo} alt="Invictus Logo" className="main-logo" style={{ marginBottom: '10px' }} />
            <h1 style={{ margin: 0, fontSize: '1.4rem', letterSpacing: '0.02em', textAlign: 'center' }}>
              Future Readiness Diagnostic™
            </h1>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <ProfileMenu userId={userId} userName={preferredName ? `${userName} (${preferredName})` : userName} userEmail={userEmail} />
          </div>
        </div>

        {/* Progress Bar */}
        <ProgressBar currentPartIndex={currentPartIndex} highestPartIndex={highestPartIndex} onNavigate={handleNavigateToPart} />

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
            <p><strong>Organization Name:</strong> {organization}</p>
            <p><strong>Assessment Date:</strong> {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        )}

        {/* Footer Nav */}
        <div className="form-footer">
          {currentPartIndex > 0 ? (
            <button
              className="btn btn-secondary"
              style={{ borderColor: '#fff', color: '#fff' }}
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

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="question-card" style={{ maxWidth: '500px', width: '90%', textAlign: 'center', padding: '40px' }}>
            <h2 style={{ marginBottom: '20px', color: '#fff' }}>Confirm Submission</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', lineHeight: '1.6' }}>
              Are you sure you want to submit your diagnostic? You will <strong>not</strong> be able to change your responses after submission.<br /><br />
              If you want to review your answers, click <strong>Cancel</strong>.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" style={{ borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }} onClick={cancelSubmit}>
                Cancel
              </button>
              <button className="btn btn-secondary" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={confirmAndSubmit}>
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DiagnosticForm;
