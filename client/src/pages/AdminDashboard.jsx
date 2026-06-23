import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { adminSupabase as supabase } from '../supabaseClient';
import { FiEye, FiEyeOff, FiRefreshCw, FiDownload } from 'react-icons/fi';
import { questionnaireData } from '../data/questionnaire';
import DomainReportModal from '../components/DomainReportModal';
import OrgAverageReportModal from '../components/OrgAverageReportModal';
import { computeDomainScores, scoreToBand } from '../utils/computeScores';
import { generatePDF, generateExcel, generateCSV } from '../utils/exportUtils';

function EvaluationsTab({ filter, orgName, evaluations, respondedMap }) {
  const [selectedViewEval, setSelectedViewEval] = useState(null);
  const [selectedRespondEval, setSelectedRespondEval] = useState(null);
  const [selectedDomainEval, setSelectedDomainEval] = useState(null);
  const [openExportMenu, setOpenExportMenu] = useState(null);
  const [reportSummary, setReportSummary] = useState('');
  const [reportFile, setReportFile] = useState(null);
  const [sendingRecord, setSendingRecord] = useState(false);
  const [localRespondedMap, setLocalRespondedMap] = useState({});

  useEffect(() => {
    if (selectedViewEval || selectedRespondEval || selectedDomainEval) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedViewEval, selectedRespondEval, selectedDomainEval]);

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
              from: import.meta.env.VITE_RESEND_FROM_EMAIL || 'Invictus Diagnostics <info@invictusleader.com>',
              to: pEmail,
              subject: 'Your Invictus Assessment has been Reviewed',
              html: `<p>Hello ${selectedRespondEval.profiles?.full_name},</p><p>An admin has responded to your assessment. Please log in to your Invictus dashboard to see your personalized response and download your report.</p><p>Best regards,<br/>Invictus Diagnostics Team</p>`
            })
          });
          const resText = await res.text();
          let result;
          try { result = JSON.parse(resText); } catch (e) { result = { success: res.ok, message: resText || 'No response details' }; }
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

      // Update local mapping state so it becomes 'Edit Response' immediately
      setLocalRespondedMap(prev => ({ ...prev, [selectedRespondEval.user_id]: reportSummary }));

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

  if (!evaluations) return null;

  const filteredEvaluations = evaluations.filter(ev => {
    if (filter === 'general') return !ev.profiles.organization || ev.profiles.organization.trim() === '';
    if (filter === 'org') return ev.profiles.organization === orgName;
    return true; // 'all'
  });

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {filteredEvaluations.length === 0
          ? <div className="question-card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No evaluations found.</div>
          : filteredEvaluations.map(ev => {
            const hasResponded = respondedMap[ev.user_id] !== undefined || localRespondedMap[ev.user_id] !== undefined;
            return (
              <div key={ev.id} className="question-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: ev.status === 'submitted' ? 'rgba(0,230,118,0.4)' : 'var(--border-color)', position: 'relative', zIndex: openExportMenu === ev.id ? 50 : 1 }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: '#fff' }}>{ev.profiles?.full_name} {ev.profiles?.preferred_name ? `(${ev.profiles.preferred_name})` : ''} {ev.profiles?.organization && <span style={{ fontSize: '0.8rem', color: 'var(--accent)', marginLeft: '10px' }}>[{ev.profiles.organization}]</span>}</h3>
                  <div style={{ display: 'flex', gap: '15px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <span><strong>ID:</strong> {ev.profiles?.custom_id}</span>
                    <span><strong>Status:</strong> <span style={{ color: ev.status === 'submitted' ? 'var(--accent)' : 'inherit' }}>{ev.status}</span></span>
                    <span><strong>Updated:</strong> {new Date(ev.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={() => setSelectedViewEval(ev)} className="btn btn-secondary" style={{ borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)', padding: '6px 12px', fontSize: '0.85rem', fontWeight: 400 }}>
                    View Assessment
                  </button>
                  <button
                    disabled={ev.status !== 'submitted'}
                    onClick={() => setSelectedDomainEval(ev)}
                    className="btn btn-secondary"
                    style={{
                      borderColor: ev.status === 'submitted' ? '#a78bfa' : 'var(--border-color)',
                      color: ev.status === 'submitted' ? '#a78bfa' : 'var(--border-color)',
                      opacity: ev.status === 'submitted' ? 1 : 0.4,
                      padding: '6px 12px', fontSize: '0.85rem', fontWeight: 400
                    }}
                  >
                    Domain Report
                  </button>
                  <button disabled={ev.status !== 'submitted'} onClick={() => handleSelectRespond(ev, hasResponded)} className="btn btn-secondary"
                    style={{ borderColor: ev.status === 'submitted' ? 'var(--accent)' : 'var(--border-color)', color: ev.status === 'submitted' ? 'var(--accent)' : 'var(--border-color)', opacity: ev.status === 'submitted' ? 1 : 0.5, padding: '6px 12px', fontSize: '0.85rem', fontWeight: 400 }}>
                    {hasResponded ? 'Edit Response' : 'Respond'}
                  </button>
                  <div style={{ position: 'relative' }}>
                    <button
                      disabled={ev.status !== 'submitted'}
                      onClick={() => setOpenExportMenu(openExportMenu === ev.id ? null : ev.id)}
                      className="btn btn-secondary"
                      style={{
                        borderColor: ev.status === 'submitted' ? '#3b82f6' : 'var(--border-color)',
                        color: ev.status === 'submitted' ? '#3b82f6' : 'var(--border-color)',
                        opacity: ev.status === 'submitted' ? 1 : 0.4,
                        padding: '6px 12px', fontSize: '0.85rem', fontWeight: 400,
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <FiDownload /> Export
                    </button>
                    {openExportMenu === ev.id && ev.status === 'submitted' && (
                      <div style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: '5px',
                        background: '#1a1a1a', border: '1px solid var(--border-color)',
                        borderRadius: '6px', padding: '5px', zIndex: 100,
                        display: 'flex', flexDirection: 'column', minWidth: '150px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                      }}>
                        <button className="btn btn-secondary" style={{ border: 'none', textAlign: 'left', padding: '8px 12px', fontSize: '0.85rem' }} onClick={async () => {
                          let evToExport = { ...ev };
                          if (!evToExport.reference_number) {
                            const year = new Date(ev.created_at || Date.now()).getFullYear();
                            const randomNum = Math.floor(100000 + Math.random() * 900000);
                            evToExport.reference_number = `IFRD-MY-${year}-${randomNum}`;
                            await supabase.from('evaluations').update({ reference_number: evToExport.reference_number }).eq('id', ev.id);
                          }
                          const ds = computeDomainScores(evToExport.responses);
                          const overallAvg = parseFloat((ds.reduce((s, d) => s + d.avg, 0) / ds.length).toFixed(2));
                          generatePDF(evToExport, ds, scoreToBand(overallAvg));
                          setOpenExportMenu(null);
                        }}>📄 Export PDF</button>
                        <button className="btn btn-secondary" style={{ border: 'none', textAlign: 'left', padding: '8px 12px', fontSize: '0.85rem' }} onClick={async () => {
                          let evToExport = { ...ev };
                          if (!evToExport.reference_number) {
                            const year = new Date(ev.created_at || Date.now()).getFullYear();
                            const randomNum = Math.floor(100000 + Math.random() * 900000);
                            evToExport.reference_number = `IFRD-MY-${year}-${randomNum}`;
                            await supabase.from('evaluations').update({ reference_number: evToExport.reference_number }).eq('id', ev.id);
                          }
                          const ds = computeDomainScores(evToExport.responses);
                          const overallAvg = parseFloat((ds.reduce((s, d) => s + d.avg, 0) / ds.length).toFixed(2));
                          generateExcel(evToExport, ds, scoreToBand(overallAvg));
                          setOpenExportMenu(null);
                        }}>📊 Export Excel</button>
                        <button className="btn btn-secondary" style={{ border: 'none', textAlign: 'left', padding: '8px 12px', fontSize: '0.85rem' }} onClick={async () => {
                          let evToExport = { ...ev };
                          if (!evToExport.reference_number) {
                            const year = new Date(ev.created_at || Date.now()).getFullYear();
                            const randomNum = Math.floor(100000 + Math.random() * 900000);
                            evToExport.reference_number = `IFRD-MY-${year}-${randomNum}`;
                            await supabase.from('evaluations').update({ reference_number: evToExport.reference_number }).eq('id', ev.id);
                          }
                          generateCSV(evToExport);
                          setOpenExportMenu(null);
                        }}>📝 Export CSV</button>
                      </div>
                    )}
                  </div>
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
                <div><strong style={{ color: '#fff' }}>Full Name:</strong> {selectedViewEval.profiles?.full_name} {selectedViewEval.profiles?.preferred_name ? `(${selectedViewEval.profiles.preferred_name})` : ''}</div>
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
            <h2 style={{ marginBottom: '10px', color: '#fff' }}>{(respondedMap[selectedRespondEval.user_id] || localRespondedMap[selectedRespondEval.user_id]) ? 'Edit Response for' : 'Respond to'} {selectedRespondEval.profiles?.full_name} {selectedRespondEval.profiles?.preferred_name ? `(${selectedRespondEval.profiles.preferred_name})` : ''}</h2>
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

      {/* DOMAIN REPORT MODAL */}
      {selectedDomainEval && (
        <DomainReportModal
          evaluation={selectedDomainEval}
          onClose={() => setSelectedDomainEval(null)}
          showExport={true}
        />
      )}
    </>
  );
}

function OrganizationsTab({ onOrgSelect, selectedOrg, allEvaluations, allRespondedMap }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newOrgData, setNewOrgData] = useState({ name: '', supervisorName: '', supervisorEmail: '', password: '', maxParticipants: '' });
  const [openOrgs, setOpenOrgs] = useState({});
  const [createLoading, setCreateLoading] = useState(false);
  const [showOrgAvgReport, setShowOrgAvgReport] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [createdOrgDetails, setCreatedOrgDetails] = useState(null);
  const [editingOrg, setEditingOrg] = useState(null);
  const [editOrgData, setEditOrgData] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => { fetchOrgs(); }, []);

  const fetchOrgs = async () => {
    const { data } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
    if (data) setOrgs(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newOrgData.name || !newOrgData.supervisorName || !newOrgData.supervisorEmail || !newOrgData.password || !newOrgData.maxParticipants) {
      alert("Please fill out all fields.");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch('/api/create-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrgData)
      });

      let data;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          `API not available locally. Deploy to Vercel to use this feature.\n\nServer response: ${text.substring(0, 100)}...`
        );
      }

      if (data.success) {
        setNewOrgData({ name: '', supervisorName: '', supervisorEmail: '', password: '', maxParticipants: '' });
        setShowAdd(false);
        fetchOrgs();
        setCreatedOrgDetails({
          name: data.data?.name,
          email: newOrgData.supervisorEmail,
          password: newOrgData.password,
          maxParticipants: newOrgData.maxParticipants,
          signupLink: `${window.location.origin}/${encodeURIComponent(data.data?.signup_token)}/signup`
        });
      } else {
        alert("Error creating organization: " + data.message);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
    setCreateLoading(false);
  };

  const handleEditSubmit = async () => {
    if (!editOrgData.name || !editOrgData.supervisorEmail || !editOrgData.maxParticipants) {
      alert("Please fill out the required fields (Name, Email, Limit).");
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetch('/api/update-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editOrgData)
      });
      const data = await res.json();
      if (data.success) {
        setEditingOrg(null);
        fetchOrgs();
        alert("Organization updated successfully!");
      } else {
        alert("Error updating organization: " + data.message);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
    setEditLoading(false);
  };

  const toggleOrg = (orgId, orgName) => {
    const isOpening = !openOrgs[orgId];
    setOpenOrgs(prev => ({ ...prev, [orgId]: !prev[orgId] }));
    // Notify parent which org is selected so stats update
    if (isOpening) {
      if (onOrgSelect) onOrgSelect(orgName);
    } else {
      // closing — if it was the selected one, deselect
      if (selectedOrg === orgName && onOrgSelect) onOrgSelect(null);
    }
  };

  const copyLink = (org) => {
    if (!org.signup_token) {
      alert("No signup token found for this organization. You may need to update the database schema.");
      return;
    }
    setCreatedOrgDetails({
      name: org.name,
      email: org.supervisor_email,
      maxParticipants: org.max_participants,
      password: '******** (Hidden for security)',
      signupLink: `${window.location.origin}/${encodeURIComponent(org.signup_token)}/signup`
    });
  };

  const handleViewAvg = async (e, orgName) => {
    e.stopPropagation();
    try {
      const { data: participants, error } = await supabase
        .from('profiles')
        .select(`
          id, custom_id, full_name, preferred_name, role, created_at,
          evaluations (id, responses, status, created_at)
        `)
        .eq('organization', orgName)
        .eq('role', 'participant');

      if (error) throw error;

      const evals = [];
      if (participants) {
        participants.forEach(p => {
          if (p.evaluations && p.evaluations.length > 0) {
            evals.push({ ...p.evaluations[0], profiles: p });
          }
        });
      }
      setShowOrgAvgReport({ orgName, evaluations: evals });
    } catch (err) {
      alert("Error generating report: " + err.message);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading organizations...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button className="btn" onClick={() => setShowAdd(true)}>+ Add Organization</button>
      </div>

      {showAdd && (
        <div style={{ marginBottom: '20px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ marginTop: 0 }}>Create New Organization</h3>
          <input type="text" className="input-text" value={newOrgData.name} onChange={e => setNewOrgData({ ...newOrgData, name: e.target.value })} placeholder="Organization Name" />
          <input type="text" className="input-text" value={newOrgData.supervisorName} onChange={e => setNewOrgData({ ...newOrgData, supervisorName: e.target.value })} placeholder="Supervisor Name" />
          <input type="email" className="input-text" value={newOrgData.supervisorEmail} onChange={e => setNewOrgData({ ...newOrgData, supervisorEmail: e.target.value })} placeholder="Supervisor Email Address" />
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} className="input-text" style={{ width: '100%' }} value={newOrgData.password} onChange={e => setNewOrgData({ ...newOrgData, password: e.target.value })} placeholder="Supervisor Password" />
            <div style={{ position: 'absolute', right: '15px', top: '12px', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </div>
          </div>
          <input type="number" className="input-text" value={newOrgData.maxParticipants} onChange={e => setNewOrgData({ ...newOrgData, maxParticipants: e.target.value })} placeholder="Total Participants Limit" min="1" />

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn" onClick={handleCreate} disabled={createLoading}>{createLoading ? 'Creating...' : 'Create'}</button>
          </div>
        </div>
      )}

      {createdOrgDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="question-card" style={{ maxWidth: '500px', width: '100%', padding: '30px' }}>
            <h2 style={{ marginTop: 0, color: 'var(--accent)' }}>{createdOrgDetails.password === '******** (Hidden for security)' ? 'Organization Details' : 'Organization Created!'}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Please copy these details to share with the supervisor.</p>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', fontFamily: 'monospace', marginBottom: '20px', color: '#fff', lineHeight: '1.6' }}>
              <div><strong>Org Name:</strong> {createdOrgDetails.name}</div>
              <div><strong>Login Email:</strong> {createdOrgDetails.email}</div>
              {createdOrgDetails.maxParticipants && <div><strong>Max Participants:</strong> {createdOrgDetails.maxParticipants}</div>}
              <div><strong>Password:</strong> {createdOrgDetails.password}</div>
              <div><strong>Signup Link:</strong> {createdOrgDetails.signupLink}</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setCreatedOrgDetails(null)}>Close</button>
              <button className="btn" onClick={() => {
                navigator.clipboard.writeText(`Organization: ${createdOrgDetails.name}\nMax Participants: ${createdOrgDetails.maxParticipants}\nSupervisor Login Email: ${createdOrgDetails.email}\nSupervisor Password: ${createdOrgDetails.password}\nParticipant Signup Link: ${createdOrgDetails.signupLink}`);
                alert('Copied to clipboard!');
              }}>Copy All Details</button>
            </div>
          </div>
        </div>
      )}

      {orgs.map(org => {
        const isOpen = !!openOrgs[org.id];
        const isSelected = selectedOrg === org.name;
        // Filter shared evaluations for this org
        const orgEvals = allEvaluations.filter(ev => ev.profiles?.organization === org.name);
        const orgTotal = orgEvals.length;
        const orgCompleted = orgEvals.filter(e => e.status === 'submitted').length;
        const orgActive = orgTotal - orgCompleted;

        return (
          <div key={org.id} style={{ marginBottom: '15px', border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-color)'}`, borderRadius: '8px', overflow: 'visible', transition: 'border-color 0.2s' }}>
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleOrg(org.id, org.name)}>
              <div>
                <h3 style={{ margin: 0, color: '#fff' }}>{org.name}</h3>
                <div style={{ display: 'flex', gap: '20px', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Total: <strong style={{ color: '#fff' }}>{orgTotal}</strong></span>
                  <span style={{ color: '#ffc800' }}>In Progress: <strong>{orgActive}</strong></span>
                  <span style={{ color: 'var(--accent)' }}>Completed: <strong>{orgCompleted}</strong></span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={(e) => { e.stopPropagation(); copyLink(org); }}>Copy Link</button>
                <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={(e) => handleViewAvg(e, org.name)}>View Average Report</button>
                <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem', borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }} onClick={(e) => {
                  e.stopPropagation();
                  setEditingOrg(org.id);
                  setEditOrgData({
                    id: org.id,
                    name: org.name,
                    supervisorName: org.supervisor_name,
                    supervisorEmail: org.supervisor_email,
                    password: '',
                    maxParticipants: org.max_participants,
                    oldSupervisorId: org.supervisor_id
                  });
                }}>Edit Settings</button>
                <span style={{ fontSize: '1.2rem', userSelect: 'none', color: isSelected ? 'var(--accent)' : 'inherit' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {editingOrg === org.id && (
              <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h4 style={{ margin: 0, color: 'var(--accent)' }}>Edit Organization Settings</h4>
                <input type="text" className="input-text" value={editOrgData.name} onChange={e => setEditOrgData({ ...editOrgData, name: e.target.value })} placeholder="Organization Name" />
                <input type="text" className="input-text" value={editOrgData.supervisorName} onChange={e => setEditOrgData({ ...editOrgData, supervisorName: e.target.value })} placeholder="Supervisor Name" />
                <input type="email" className="input-text" value={editOrgData.supervisorEmail} onChange={e => setEditOrgData({ ...editOrgData, supervisorEmail: e.target.value })} placeholder="Supervisor Email" />
                <input type="password" className="input-text" value={editOrgData.password} onChange={e => setEditOrgData({ ...editOrgData, password: e.target.value })} placeholder="New Supervisor Password (leave blank to keep current)" />
                <input type="number" className="input-text" value={editOrgData.maxParticipants} onChange={e => setEditOrgData({ ...editOrgData, maxParticipants: e.target.value })} placeholder="Max Participants" />

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-secondary" onClick={() => setEditingOrg(null)}>Cancel</button>
                  <button className="btn" onClick={handleEditSubmit} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </div>
            )}

            {isOpen && !editingOrg && (
              <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)' }}>
                <EvaluationsTab
                  filter="org"
                  orgName={org.name}
                  evaluations={allEvaluations}
                  respondedMap={allRespondedMap}
                />
              </div>
            )}
          </div>
        );
      })}

      {orgs.length === 0 && !showAdd && (
        <div className="question-card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No organizations found. Add one above.</div>
      )}

      {showOrgAvgReport && (
        <OrgAverageReportModal
          orgName={showOrgAvgReport.orgName}
          evaluations={showOrgAvgReport.evaluations}
          onClose={() => setShowOrgAvgReport(null)}
        />
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState(null); // for org accordion selection
  const [allEvaluations, setAllEvaluations] = useState([]);
  const [allRespondedMap, setAllRespondedMap] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const adminName = localStorage.getItem('invictus_adminName') || 'Admin';

  useEffect(() => {
    document.title = "Admin Dashboard - Invictus";
    const auth = localStorage.getItem('invictus_adminAuth');
    if (!auth) { navigate('/admin/login'); return; }
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      const { data: participants } = await supabase
        .from('profiles')
        .select('id, custom_id, full_name, preferred_name, phone_number, email, created_at, organization')
        .eq('role', 'participant');

      const { data: evals } = await supabase.from('evaluations').select('*');
      const { data: reports } = await supabase.from('admin_reports').select('participant_id, summary_text');

      let rMap = {};
      if (reports) {
        reports.forEach(r => rMap[r.participant_id] = r.summary_text);
      }
      setAllRespondedMap(rMap);

      if (participants) {
        const formattedEvals = participants.map(p => {
          const evalData = evals?.find(e => e.user_id === p.id);
          return {
            id: evalData ? evalData.id : `no-eval-${p.id}`,
            user_id: p.id,
            status: evalData ? evalData.status : 'not-started',
            updated_at: evalData ? evalData.updated_at : p.created_at,
            responses: evalData ? evalData.responses : {},
            profiles: {
              custom_id: p.custom_id,
              full_name: p.full_name,
              preferred_name: p.preferred_name,
              phone_number: p.phone_number,
              email: p.email,
              organization: p.organization
            }
          };
        });
        formattedEvals.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        setAllEvaluations(formattedEvals);
      }
    } catch (err) {
      console.error(err);
    }
    setRefreshing(false);
    setInitialLoading(false);
  };

  const triggerRefresh = async () => {
    setRefreshKey(k => k + 1);
    await fetchDashboardData();
  };

  // Compute stats dynamically based on tab + selectedOrg
  const computeStats = (evList) => {
    const total = evList.length;
    const completed = evList.filter(e => e.status === 'submitted').length;
    const active = total - completed;
    return { total, completed, active };
  };

  const statsSource = () => {
    if (tab === 'general') {
      return allEvaluations.filter(ev => !ev.profiles?.organization || ev.profiles.organization.trim() === '');
    }
    if (tab === 'organization') {
      if (selectedOrg) {
        return allEvaluations.filter(ev => ev.profiles?.organization === selectedOrg);
      }
      // No specific org selected — show totals across all org participants
      return allEvaluations.filter(ev => ev.profiles?.organization && ev.profiles.organization.trim() !== '');
    }
    return allEvaluations; // 'all'
  };

  const stats = computeStats(statsSource());

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
      {/* Fullscreen refreshing overlay loader */}
      {(refreshing || initialLoading) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 15, 15, 0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <FiRefreshCw className="spin-anim" size={45} color="var(--accent)" />
            <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600 }}>Syncing Data...</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Admin Dashboard</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>Welcome, {adminName}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 2 }}>
          <img src={logo} alt="Invictus Logo" className="main-logo" />
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
          <button className="btn btn-secondary" onClick={triggerRefresh} disabled={refreshing} style={{ borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiRefreshCw className={refreshing ? 'spin-anim' : ''} /> Refresh Data
          </button>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>Logout</button>
        </div>
      </div>

      <style>{`
        .spin-anim { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
        <button className="btn" style={{ flex: 1, background: tab === 'all' ? 'var(--accent)' : 'transparent', color: tab === 'all' ? '#000' : 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => { setTab('all'); setSelectedOrg(null); }}>All</button>
        <button className="btn" style={{ flex: 1, background: tab === 'general' ? 'var(--accent)' : 'transparent', color: tab === 'general' ? '#000' : 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => { setTab('general'); setSelectedOrg(null); }}>General</button>
        <button className="btn" style={{ flex: 1, background: tab === 'organization' ? 'var(--accent)' : 'transparent', color: tab === 'organization' ? '#000' : 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => { setTab('organization'); setSelectedOrg(null); }}>Organization</button>
      </div>

      {/* Stats — dynamic based on active tab + selected org */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '35px' }}>
        <div className="question-card" style={{ flex: 1, textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.total}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {tab === 'organization' && selectedOrg ? `${selectedOrg} — Total` : 'Total Participants'}
          </div>
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

      {tab === 'organization'
        ? <OrganizationsTab
          key={refreshKey}
          onOrgSelect={(orgName) => setSelectedOrg(orgName)}
          selectedOrg={selectedOrg}
          allEvaluations={allEvaluations}
          allRespondedMap={allRespondedMap}
        />
        : <EvaluationsTab
          key={refreshKey}
          filter={tab}
          evaluations={allEvaluations}
          respondedMap={allRespondedMap}
        />
      }
    </div>
  );
}
