import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { supabase } from '../supabaseClient';
import { questionnaireData } from '../data/questionnaire';

function EvaluationsTab() {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedViewEval, setSelectedViewEval] = useState(null);
  const [selectedRespondEval, setSelectedRespondEval] = useState(null);
  const [reportSummary, setReportSummary] = useState('');
  const [reportFile, setReportFile] = useState(null);
  const [sendingRecord, setSendingRecord] = useState(false);
  const [respondedMap, setRespondedMap] = useState({});


  useEffect(() => { fetchEvaluations(); }, []);

  const fetchEvaluations = async () => {
    const { data: evals, error } = await supabase
      .from('evaluations')
      .select(`*, profiles (custom_id, full_name, preferred_name, phone_number, email)`)
      .order('updated_at', { ascending: false });

    const { data: reports } = await supabase
      .from('admin_reports')
      .select('participant_id, summary_text');

    let rMap = {};
    if (reports) {
      reports.forEach(r => rMap[r.participant_id] = r.summary_text);
    }
    setRespondedMap(rMap);

    if (!error && evals) setEvaluations(evals);
    setLoading(false);
  };

  const handleSelectRespond = async (ev, hasResponded) => {
    setSelectedRespondEval(ev);
    setReportFile(null);

    if (hasResponded) {
      setReportSummary('Loading previous report...');
      const { data: existingReports } = await supabase
        .from('admin_reports')
        .select('*')
        .eq('participant_id', ev.user_id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const existingReport = existingReports && existingReports.length > 0 ? existingReports[0] : null;
      setReportSummary(existingReport?.summary_text || '');
    } else {
      setReportSummary('');
    }
  };

  const handleSendReport = async () => {
    if (!selectedRespondEval || !reportSummary) return;
    setSendingRecord(true);
    try {
      let fileUrl = null;
      if (reportFile) {
        const fileExt = reportFile.name.split('.').pop();
        const fileName = `${selectedRespondEval.user_id}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('reports').upload(fileName, reportFile);
          
        if (uploadError) {
          alert("Failed to upload the report file: " + uploadError.message + ".\nPlease ensure the 'reports' storage bucket exists and is public in your Supabase dashboard.");
          setSendingRecord(false);
          return;
        }
        
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('reports').getPublicUrl(fileName);
          fileUrl = urlData.publicUrl;
        }
      }

      const { data: existingReports, error: fetchErr } = await supabase
        .from('admin_reports')
        .select('id, report_file_url')
        .eq('participant_id', selectedRespondEval.user_id)
        .order('created_at', { ascending: false })
        .limit(1);

      const existingReport = existingReports && existingReports.length > 0 ? existingReports[0] : null;

      if (existingReport) {
        const { error: updateError } = await supabase.from('admin_reports').update({
          summary_text: reportSummary,
          report_file_url: fileUrl || existingReport.report_file_url,
          admin_id: localStorage.getItem('invictus_adminUUID'),
          created_at: new Date().toISOString()
        }).eq('id', existingReport.id);
        
        if (updateError) {
            console.error("Update Error:", updateError);
            alert("Database Error updating report: " + updateError.message);
            setSendingRecord(false);
            return;
        }
      } else {
        const { error: insertError } = await supabase.from('admin_reports').insert({
          participant_id: selectedRespondEval.user_id,
          admin_id: localStorage.getItem('invictus_adminUUID'),
          summary_text: reportSummary,
          report_file_url: fileUrl
        });
        
        if (insertError) {
            console.error("Insert Error:", insertError);
            alert("Database Error inserting report: " + insertError.message);
            setSendingRecord(false);
            return;
        }
      }

      // Send Email notification using Resend
      const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
      const pEmail = selectedRespondEval.profiles?.email;
      let emailSent = false;
      let emailError = '';
      
      if (RESEND_API_KEY && pEmail) {
        try {
          const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: RESEND_API_KEY,
              to: pEmail,
              subject: 'Your Invictus Assessment has been Reviewed',
              html: `<p>Hello ${selectedRespondEval.profiles?.full_name},</p><p>An admin has responded to your assessment. Please log in to your Invictus dashboard to see your personalized response and download your report.</p><p>Best regards,<br/>Invictus Diagnostics Team</p>`
            })
          });
          const result = await res.json();
          console.log('Backend Email Proxy response:', result);
          if (res.ok && result.success) emailSent = true;
          else emailError = result.message || 'Unknown backend error';
        } catch (err) {
          console.error('Failed to send email via backend:', err);
          emailError = err.message;
        }
      } else if (!pEmail) {
        console.warn('No email found in profiles for this participant. Email notification skipped.');
      } else if (!RESEND_API_KEY) {
        console.warn('VITE_RESEND_API_KEY is not set. Email notification skipped.');
      }

      // Update mapping state so it becomes 'Edit Response' immediately
      setRespondedMap(prev => ({ ...prev, [selectedRespondEval.user_id]: reportSummary }));

      setSelectedRespondEval(null);
      setReportSummary('');
      setReportFile(null);
      
      let alertMessage = 'Report saved successfully!';
      if (!RESEND_API_KEY) {
          alertMessage += '\n(Email skipped: VITE_RESEND_API_KEY is missing in .env)';
      } else if (!pEmail) {
          alertMessage += '\n(Email skipped: Participant has no email recorded)';
      } else if (!emailSent) {
          alertMessage += `\n(Email failed to send: ${emailError})`;
      } else {
          alertMessage += '\nNotification email sent to participant!';
      }
      
      alert(alertMessage);
    } catch (_) { alert('Error saving report data.'); }
    setSendingRecord(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading...</div>;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {evaluations.length === 0
          ? <div className="question-card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No evaluations found.</div>
          : evaluations.map(ev => {
            const hasResponded = respondedMap[ev.user_id] !== undefined;
            return (
              <div key={ev.id} className="question-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: ev.status === 'submitted' ? 'rgba(0,230,118,0.4)' : 'var(--border-color)' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: '#fff' }}>{ev.profiles?.full_name}</h3>
                  <div style={{ display: 'flex', gap: '15px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <span><strong>ID:</strong> {ev.profiles?.custom_id}</span>
                    <span><strong>Status:</strong> <span style={{ color: ev.status === 'submitted' ? 'var(--accent)' : 'inherit' }}>{ev.status}</span></span>
                    <span><strong>Updated:</strong> {new Date(ev.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setSelectedViewEval(ev)} className="btn btn-secondary" style={{ borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }}>
                    View Assessment
                  </button>
                  <button disabled={ev.status !== 'submitted'} onClick={() => handleSelectRespond(ev, hasResponded)} className="btn btn-secondary"
                    style={{ borderColor: ev.status === 'submitted' ? 'var(--accent)' : 'var(--border-color)', color: ev.status === 'submitted' ? 'var(--accent)' : 'var(--border-color)', opacity: ev.status === 'submitted' ? 1 : 0.5 }}>
                    {hasResponded ? 'Edit Response' : 'Respond'}
                  </button>
                </div>
              </div>
            )
          })
        }
      </div>

      {/* FULLSCREEN VIEW MODAL */}
      {selectedViewEval && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#0f0f0f', display: 'flex', flexDirection: 'column', zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ position: 'sticky', top: 0, padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f0f0f', borderBottom: '1px solid var(--border-color)', zIndex: 10 }}>
            <h2 style={{ margin: 0, color: '#fff' }}>Participant Assessment View</h2>
            <button onClick={() => setSelectedViewEval(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '2rem', cursor: 'pointer', outline: 'none' }}>×</button>
          </div>

          <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '40px' }}>
            <div style={{ marginBottom: '40px', background: 'rgba(255,255,255,0.03)', padding: '25px', borderRadius: '8px', borderLeft: '4px solid var(--accent)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--accent)' }}>Participant Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
                <div><strong style={{ color: '#fff' }}>Full Name:</strong> {selectedViewEval.profiles?.full_name}</div>
                <div><strong style={{ color: '#fff' }}>Preferred Name:</strong> {selectedViewEval.profiles?.preferred_name || 'N/A'}</div>
                <div><strong style={{ color: '#fff' }}>PID:</strong> {selectedViewEval.profiles?.custom_id}</div>
                <div><strong style={{ color: '#fff' }}>Email:</strong> {selectedViewEval.profiles?.email || 'N/A'}</div>
                <div><strong style={{ color: '#fff' }}>Phone:</strong> {selectedViewEval.profiles?.phone_number || 'N/A'}</div>
                <div><strong style={{ color: '#fff' }}>Status:</strong> {selectedViewEval.status}</div>
                <div><strong style={{ color: '#fff' }}>Submitted:</strong> {new Date(selectedViewEval.updated_at).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ marginBottom: '40px' }}>
              {questionnaireData.map((part) => {
                if (part.type === 'consent' || part.type === 'declaration') return null;
                const partResponses = selectedViewEval.responses?.[part.id] || {};

                return (
                  <div key={part.id} style={{ marginBottom: '35px', background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px', fontSize: '1.2rem' }}>{part.sectionLabel}: {part.title}</h4>
                    {part.questions.map(q => {
                      let answer = partResponses[q.id];
                      let answerDisplay = '— No Response —';

                      if (answer) {
                        if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean') {
                          answerDisplay = answer.toString();
                        } else if (answer.items) {
                          answerDisplay = answer.items.join(', ');
                          if (answer.other) answerDisplay += ` (Other: ${answer.other})`;
                        } else if (answer.main) {
                          answerDisplay = answer.main;
                          if (answer.other) answerDisplay += ` (Other: ${answer.other})`;
                        }
                      }

                      return (
                        <div key={q.id} style={{ marginBottom: '20px' }}>
                          <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>{q.text}</div>
                          <div style={{ fontSize: '1.05rem', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                            {answerDisplay}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* RESPOND MODAL */}
      {selectedRespondEval && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="question-card" style={{ maxWidth: '700px', width: '100%', padding: '40px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '10px', color: '#fff' }}>{respondedMap[selectedRespondEval.user_id] ? 'Edit Response for' : 'Respond to'} {selectedRespondEval.profiles?.full_name}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>ID: {selectedRespondEval.profiles?.custom_id}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'rgba(0,230,118,0.05)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(0,230,118,0.2)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Notification will be sent to: </span>
                <strong style={{ color: 'var(--accent)' }}>{selectedRespondEval.profiles?.email || 'No email on file'}</strong>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Executive Summary</label>
                <textarea className="input-textarea" value={reportSummary} onChange={e => setReportSummary(e.target.value)} placeholder="Type the results summary here..." required style={{ minHeight: '150px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Attach PDF Report (Optional)</label>
                <input type="file" accept=".pdf,.doc,.docx" onChange={e => setReportFile(e.target.files[0])} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button disabled={sendingRecord} className="btn btn-secondary" style={{ borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }} onClick={() => setSelectedRespondEval(null)}>Cancel</button>
                <button disabled={!reportSummary || sendingRecord} className="btn btn-secondary" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', opacity: (!reportSummary || sendingRecord) ? 0.5 : 1 }} onClick={handleSendReport}>
                  {sendingRecord ? 'Saving...' : 'Save & Notify'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ active: 0, completed: 0, total: 0 });
  const adminName = localStorage.getItem('invictus_adminName') || 'Admin';

  useEffect(() => {
    document.title = "Admin Dashboard - Invictus";
    const auth = localStorage.getItem('invictus_adminAuth');
    if (!auth) { navigate('/admin/login'); return; }
    fetchStats();
  }, [navigate]);

  const fetchStats = async () => {
    const { data } = await supabase.from('evaluations').select('status');
    if (data) {
      setStats({
        active: data.filter(d => d.status === 'in-progress').length,
        completed: data.filter(d => d.status === 'submitted').length,
        total: data.length
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('invictus_adminAuth');
    localStorage.removeItem('invictus_adminId');
    localStorage.removeItem('invictus_adminUUID');
    localStorage.removeItem('invictus_adminName');
    navigate('/admin/login');
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={logo} alt="Invictus Logo" style={{ height: '40px' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Admin Dashboard</h1>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>Welcome, {adminName}</div>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={handleLogout} style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>Logout</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '35px' }}>
        <div className="question-card" style={{ flex: 1, textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.total}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Participants</div>
        </div>
        <div className="question-card" style={{ flex: 1, textAlign: 'center', padding: '20px', borderColor: 'rgba(255,200,0,0.4)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ffc800' }}>{stats.active}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>In Progress</div>
        </div>
        <div className="question-card" style={{ flex: 1, textAlign: 'center', padding: '20px', borderColor: 'rgba(0,230,118,0.4)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent)' }}>{stats.completed}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Completed</div>
        </div>
      </div>

      <EvaluationsTab />
    </div>
  );
}
