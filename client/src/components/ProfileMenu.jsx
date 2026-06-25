import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProfileMenu({ userId, userName, userEmail, userPhone }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('invictus_userId');
    navigate('/');
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        className="btn btn-secondary profile-menu-btn" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#fff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', flexShrink: 0 }}>U</div>
        <span className="profile-menu-label">Profile</span>
      </button>

      {isOpen && (
        <div className="profile-menu-dropdown question-card">
          <h4 style={{ margin: '0 0 15px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Participant Profile</h4>
          
          <div style={{ fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>ID:</div>
          <div style={{ fontSize: '0.9rem', marginBottom: '12px', wordBreak: 'break-all' }}>{userId}</div>

          {userName && (
            <>
              <div style={{ fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Name:</div>
              <div style={{ fontSize: '0.9rem', marginBottom: '12px' }}>{userName}</div>
            </>
          )}

          {userEmail && (
            <>
              <div style={{ fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Email:</div>
              <div style={{ fontSize: '0.9rem', marginBottom: '12px', wordBreak: 'break-all' }}>{userEmail}</div>
            </>
          )}

          {userPhone && (
            <>
              <div style={{ fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Phone:</div>
              <div style={{ fontSize: '0.9rem', marginBottom: '12px', letterSpacing: '0.03em' }}>{userPhone}</div>
            </>
          )}

          <div style={{ fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Status:</div>
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
