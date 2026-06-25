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
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <h1 className="diag-title" style={{ textAlign: 'left', fontSize: '1.4rem' }}>Supervisor Dashboard</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>Welcome, {supervisorName} • {orgName}</div>
        </div>
        <div className="dashboard-header-center">
          <img src={logo} alt="Invictus Logo" className="main-logo" />
        </div>
        <div className="dashboard-header-right">
          <button className="btn btn-secondary" onClick={() => setShowOrgAvgReport(true)}>Aggregate Report</button>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>Logout</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="question-card stat-card" style={{ borderColor: 'rgba(0,191,255,0.4)' }}>
          <div className="stat-value" style={{ color: '#00bfff' }}>
            {maxParticipants - stats.total} <span style={{ fontSize: '1.2rem', fontWeight: 400, color: 'var(--text-secondary)' }}>/ {maxParticipants}</span>
          </div>
          <div className="stat-label">Remaining Slots</div>
        </div>
        <div className="question-card stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Participants</div>
        </div>
        <div className="question-card stat-card stat-progress">
          <div className="stat-value" style={{ color: '#ffc800' }}>{stats.active}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="question-card stat-card stat-completed">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      {/* Participants List */}
      <div>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>Participant Status</h2>
        
        {evaluations.length === 0 ? (
          <div className="question-card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No participants found for this organization.</div>
        ) : (
          <div className="flex-column-gap15">
            {evaluations.map((ev, i) => (
              <div key={i} className="question-card card-compact" style={{ borderLeft: ev.status === 'submitted' ? '4px solid var(--accent)' : '4px solid #ffc800' }}>
                <div className="eval-card-row">
                  <div className="eval-card-info">
                    <h3 className="eval-card-title">
                      {ev.profiles?.full_name} {ev.profiles?.preferred_name ? `(${ev.profiles.preferred_name})` : ''}
                    </h3>
                    <div className="eval-card-meta">
                      <span>ID: {ev.profiles?.custom_id || 'N/A'}</span>
                      <span>Joined: {new Date(ev.profiles?.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="eval-card-actions">
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600,
                      background: ev.status === 'submitted' ? 'rgba(0,230,118,0.1)' : 'rgba(255,200,0,0.1)',
                      color: ev.status === 'submitted' ? 'var(--accent)' : '#ffc800'
                    }}>
                      {ev.status === 'submitted' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
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
