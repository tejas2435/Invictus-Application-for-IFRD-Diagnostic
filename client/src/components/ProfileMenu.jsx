import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProfileMenu({ userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    // Keep responses but clear user tracking, wait: "so user can login back where they left".
    // I should not clear responses of course (it's already saved anyway). Just clear the current active run.
    localStorage.removeItem('invictus_userId');
    // For local mock realism, might want to keep the session so they really pick up, but removing user clears the active session.
    navigate('/');
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        className="btn btn-secondary" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: '8px 15px', fontSize: '0.9rem', borderColor: '#fff', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>U</div>
        Profile
      </button>

      {isOpen && (
        <div className="question-card" style={{ 
          position: 'absolute', 
          top: '110%', 
          right: 0, 
          width: '250px', 
          padding: '20px', 
          zIndex: 100, 
          background: 'var(--bg-dark)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
        }}>
          <h4 style={{ margin: '0 0 15px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Participant Profile</h4>
          
          <div style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>ID:</div>
          <div style={{ fontSize: '0.9rem', marginBottom: '15px' }}>{userId}</div>

          <div style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Status:</div>
          <div style={{ fontSize: '0.9rem', marginBottom: '25px', color: 'var(--accent)' }}>Active</div>

          <button 
            onClick={handleLogout}
            style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '4px', cursor: 'pointer' }}
          >
            Log Out & Save State
          </button>
        </div>
      )}
    </div>
  );
}
