import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { supabase } from '../supabaseClient';

// ─── Tab components ───────────────────────────────────────────────────────────

function EvaluationsTab() {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEval, setSelectedEval] = useState(null);
  const [reportSummary, setReportSummary] = useState('');
  const [reportFile, setReportFile] = useState(null);
  const [sendingRecord, setSendingRecord] = useState(false);

  useEffect(() => { fetchEvaluations(); }, []);

  const fetchEvaluations = async () => {
    const { data, error } = await supabase
      .from('evaluations')
      .select(`*, profiles (custom_id, full_name, phone_number)`)
      .order('updated_at', { ascending: false });
    if (!error && data) setEvaluations(data);
    setLoading(false);
  };

  const handleSelectEval = async (ev) => {
    setSelectedEval(ev);
    setReportSummary('Loading previous report...');
    setReportFile(null);
    
    const { data: existingReport } = await supabase
      .from('admin_reports')
      .select('*')
      .eq('participant_id', ev.user_id)
      .single();
      
    if (existingReport) {
      setReportSummary(existingReport.summary_text || '');
    } else {
      setReportSummary('');
    }
  };

  const handleSendReport = async () => {
    if (!selectedEval || !reportSummary) return;
    setSendingRecord(true);
    try {
      let fileUrl = null;
      if (reportFile) {
        const fileExt = reportFile.name.split('.').pop();
        const fileName = `${selectedEval.user_id}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('reports').upload(fileName, reportFile);
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from('reports').getPublicUrl(fileName);
          fileUrl = urlData.publicUrl;
        }
      }
      // Check if report exists to update instead of insert
      const { data: existingReport } = await supabase
        .from('admin_reports')
        .select('id, report_file_url')
        .eq('participant_id', selectedEval.user_id)
        .single();

      if (existingReport) {
        await supabase.from('admin_reports').update({
          summary_text: reportSummary,
          report_file_url: fileUrl || existingReport.report_file_url, // Keep old if no new file
          admin_id: localStorage.getItem('invictus_adminUUID'),
          created_at: new Date().toISOString()
        }).eq('id', existingReport.id);
      } else {
        await supabase.from('admin_reports').insert({
          participant_id: selectedEval.user_id,
          admin_id: localStorage.getItem('invictus_adminUUID'),
          summary_text: reportSummary,
          report_file_url: fileUrl
        });
      }

      console.log(`Sending email notification to participant ${selectedEval.profiles?.full_name}...`);
      // Stub: in production, an Edge Function would trigger an email here.

      setSelectedEval(null);
      setReportSummary('');
      setReportFile(null);
      alert('Report sent successfully!');
    } catch (_) { alert('Error sending report.'); }
    setSendingRecord(false);
  };

  if (loading) return <div style={{textAlign:'center',padding:'40px',color:'var(--text-secondary)'}}>Loading...</div>;

  return (
    <>
      <div style={{display:'flex',flexDirection:'column',gap:'15px'}}>
        {evaluations.length === 0
          ? <div className="question-card" style={{textAlign:'center',color:'var(--text-secondary)'}}>No evaluations found.</div>
          : evaluations.map(ev => (
            <div key={ev.id} className="question-card" style={{padding:'20px',display:'flex',justifyContent:'space-between',alignItems:'center',borderColor:ev.status==='submitted'?'rgba(0,230,118,0.4)':'var(--border-color)'}}>
              <div>
                <h3 style={{margin:'0 0 5px 0',fontSize:'1.2rem',color:'#fff'}}>{ev.profiles?.full_name}</h3>
                <div style={{display:'flex',gap:'15px',color:'var(--text-secondary)',fontSize:'0.9rem'}}>
                  <span><strong>ID:</strong> {ev.profiles?.custom_id}</span>
                  <span><strong>Status:</strong> <span style={{color:ev.status==='submitted'?'var(--accent)':'inherit'}}>{ev.status}</span></span>
                  <span><strong>Updated:</strong> {new Date(ev.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button disabled={ev.status!=='submitted'} onClick={()=>handleSelectEval(ev)} className="btn btn-secondary"
                style={{borderColor:ev.status==='submitted'?'var(--accent)':'var(--border-color)',color:ev.status==='submitted'?'var(--accent)':'var(--border-color)',opacity:ev.status==='submitted'?1:0.5}}>
                View & Respond
              </button>
            </div>
          ))
        }
      </div>

      {selectedEval && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
          <div className="question-card" style={{maxWidth:'600px',width:'100%',padding:'40px'}}>
            <h2 style={{marginBottom:'10px',color:'#fff'}}>Respond to {selectedEval.profiles?.full_name}</h2>
            <p style={{color:'var(--text-secondary)',marginBottom:'30px'}}>ID: {selectedEval.profiles?.custom_id}</p>
            <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
              <div>
                <label style={{display:'block',marginBottom:'8px',color:'var(--text-secondary)'}}>Executive Summary</label>
                <textarea className="input-textarea" value={reportSummary} onChange={e=>setReportSummary(e.target.value)} placeholder="Type the results summary here..." required />
              </div>
              <div>
                <label style={{display:'block',marginBottom:'8px',color:'var(--text-secondary)'}}>Attach PDF Report (Optional)</label>
                <input type="file" accept=".pdf,.doc,.docx" onChange={e=>setReportFile(e.target.files[0])} style={{color:'var(--text-secondary)'}} />
              </div>
              <div style={{display:'flex',gap:'15px',justifyContent:'flex-end',marginTop:'20px'}}>
                <button disabled={sendingRecord} className="btn btn-secondary" style={{borderColor:'var(--text-secondary)',color:'var(--text-secondary)'}} onClick={()=>setSelectedEval(null)}>Cancel</button>
                <button disabled={!reportSummary||sendingRecord} className="btn btn-secondary" style={{borderColor:'var(--accent)',color:'var(--accent)',opacity:(!reportSummary||sendingRecord)?0.5:1}} onClick={handleSendReport}>
                  {sendingRecord?'Sending...':'Complete & Send'}
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

  const tabStyle = (tab) => ({
    padding: '10px 24px',
    cursor: 'pointer',
    borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
    color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
    fontWeight: activeTab === tab ? 600 : 400,
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
    fontSize: '0.95rem',
    transition: 'all 0.2s'
  });

  return (
    <div className="app-container">
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'30px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'15px'}}>
          <img src={logo} alt="Invictus Logo" style={{height:'40px'}} />
          <div>
            <h1 style={{margin:0,fontSize:'1.6rem'}}>Admin Dashboard</h1>
            <div style={{color:'var(--text-secondary)',fontSize:'0.85rem',marginTop:'2px'}}>Welcome, {adminName}</div>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={handleLogout} style={{borderColor:'var(--error)',color:'var(--error)'}}>Logout</button>
      </div>

      {/* Stats */}
      <div style={{display:'flex',gap:'20px',marginBottom:'35px'}}>
        <div className="question-card" style={{flex:1,textAlign:'center',padding:'20px'}}>
          <div style={{fontSize:'2.5rem',fontWeight:700,color:'var(--text-primary)'}}>{stats.total}</div>
          <div style={{color:'var(--text-secondary)',fontSize:'0.9rem'}}>Total Participants</div>
        </div>
        <div className="question-card" style={{flex:1,textAlign:'center',padding:'20px',borderColor:'rgba(255,200,0,0.4)'}}>
          <div style={{fontSize:'2.5rem',fontWeight:700,color:'#ffc800'}}>{stats.active}</div>
          <div style={{color:'var(--text-secondary)',fontSize:'0.9rem'}}>In Progress</div>
        </div>
        <div className="question-card" style={{flex:1,textAlign:'center',padding:'20px',borderColor:'rgba(0,230,118,0.4)'}}>
          <div style={{fontSize:'2.5rem',fontWeight:700,color:'var(--accent)'}}>{stats.completed}</div>
          <div style={{color:'var(--text-secondary)',fontSize:'0.9rem'}}>Completed</div>
        </div>
      </div>

      <EvaluationsTab />
    </div>
  );
}
