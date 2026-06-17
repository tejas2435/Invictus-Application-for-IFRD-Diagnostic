import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { supervisorSupabase as supabase } from '../supabaseClient';
import OrgAverageReportModal from '../components/OrgAverageReportModal';

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrgAvgReport, setShowOrgAvgReport] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [maxParticipants, setMaxParticipants] = useState(0);

  const supervisorName = localStorage.getItem('invictus_supervisorName') || 'Supervisor';
  const orgName = localStorage.getItem('invictus_supervisorOrg');
  const supervisorId = localStorage.getItem('invictus_supervisorUUID');

  useEffect(() => {
    document.title = "Supervisor Dashboard - Invictus";
    const auth = localStorage.getItem('invictus_supervisorAuth');
    if (!auth || !orgName) {
      navigate('/supervisor/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/get-supervisor-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName, supervisorId })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch dashboard data');
      }

      const evalsList = result.data.evaluations;
      setEvaluations(evalsList);
      setMaxParticipants(result.data.maxParticipants);

      const total = evalsList.length;
      const completed = evalsList.filter(e => e.status === 'submitted').length;
      const active = total - completed;

      setStats({ total, active, completed });

    } catch (err) {
      console.error("Dashboard Error:", err.message);
      // Fallback or alert if needed
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('invictus_supervisorAuth');
    localStorage.removeItem('invictus_supervisorId');
    localStorage.removeItem('invictus_supervisorUUID');
    localStorage.removeItem('invictus_supervisorName');
    localStorage.removeItem('invictus_supervisorOrg');
    navigate('/supervisor/login');
  };

  if (loading) {
    return <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading dashboard...</div>;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Supervisor Dashboard</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>Welcome, {supervisorName} • {orgName}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 2 }}>
          <img src={logo} alt="Invictus Logo" className="main-logo" />
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '15px', alignItems: 'center' }}>
           <button className="btn btn-secondary" onClick={() => setShowOrgAvgReport(true)}>Aggregate Report</button>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>Logout</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '35px' }}>
        <div className="question-card" style={{ flex: 1, textAlign: 'center', padding: '20px', borderColor: 'rgba(0,191,255,0.4)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#00bfff' }}>
            {maxParticipants - stats.total} <span style={{ fontSize: '1.2rem', fontWeight: 400, color: 'var(--text-secondary)' }}>/ {maxParticipants}</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Registrations Remaining</div>
        </div>
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

      {/* Participants List */}
      <div>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>Participant Status</h2>
        
        {evaluations.length === 0 ? (
          <div className="question-card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No participants found for this organization.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {evaluations.map((ev, i) => (
              <div key={i} className="question-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderLeft: ev.status === 'submitted' ? '4px solid var(--accent)' : '4px solid #ffc800' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
                    {ev.profiles?.full_name} {ev.profiles?.preferred_name ? `(${ev.profiles.preferred_name})` : ''}
                  </h3>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                    ID: {ev.profiles?.custom_id || 'N/A'} • Joined: {new Date(ev.profiles?.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600,
                    background: ev.status === 'submitted' ? 'rgba(0,230,118,0.1)' : 'rgba(255,200,0,0.1)',
                    color: ev.status === 'submitted' ? 'var(--accent)' : '#ffc800'
                  }}>
                    {ev.status === 'submitted' ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showOrgAvgReport && (
        <OrgAverageReportModal
          orgName={orgName}
          evaluations={evaluations.filter(e => e.status === 'submitted')}
          onClose={() => setShowOrgAvgReport(false)}
        />
      )}
    </div>
  );
}
