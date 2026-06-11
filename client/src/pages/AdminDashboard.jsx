import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalActive: 0, completed: 0 });

  useEffect(() => {
    const auth = localStorage.getItem('invictus_adminAuth');
    if (!auth) {
      navigate('/admin/login');
    }
  }, [navigate]);

  return (
    <div className="app-container">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px'}}>
        <h1 style={{margin: 0}}>Admin Dashboard</h1>
        <button className="btn btn-secondary" onClick={() => { localStorage.removeItem('invictus_adminAuth'); navigate('/admin/login'); }}>Logout</button>
      </div>

      <div style={{display: 'flex', gap: '20px', marginBottom: '40px'}}>
        <div className="question-card" style={{flex: 1, textAlign: 'center'}}>
          <div style={{fontSize: '3rem', fontWeight: 700, color: 'var(--text-primary)'}}>{stats.totalActive}</div>
          <div style={{color: 'var(--text-secondary)'}}>Total Participants</div>
        </div>
        <div className="question-card" style={{flex: 1, textAlign: 'center', borderColor: 'var(--accent)'}}>
          <div style={{fontSize: '3rem', fontWeight: 700, color: 'var(--accent)'}}>{stats.completed}</div>
          <div style={{color: 'var(--text-secondary)'}}>Assessments Completed</div>
        </div>
        <div className="question-card" style={{flex: 1, textAlign: 'center', borderColor: 'var(--error)'}}>
          <div style={{fontSize: '3rem', fontWeight: 700, color: 'var(--error)'}}>0</div>
          <div style={{color: 'var(--text-secondary)'}}>Replies Left Out</div>
        </div>
      </div>

      <div className="info-panel">
        <h3 style={{marginBottom: '5px'}}>Participant Reports</h3>
        <p>List of participants actively taking the diagnostic will dynamically link here. You will have an option to view details, see answers mapped out, and send reports/summaries with attachments directly back to the participant.</p>
      </div>
    </div>
  );
}
