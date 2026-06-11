import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email) return;
    localStorage.setItem('invictus_adminAuth', 'true');
    navigate('/admin');
  };

  return (
    <div className="app-container" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
      <div className="question-card" style={{width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', padding: '40px', borderTop: '4px solid #fff'}}>
        <h1 style={{textAlign: 'center', fontSize: '1.8rem', marginBottom: '20px'}}>ADMIN PORTAL</h1>
        
        <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
          <div>
            <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Admin Email</label>
            <input type="email" className="input-text" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter admin email" />
          </div>
          <div>
            <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Password</label>
            <input type="password" className="input-text" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password" />
          </div>

          <button type="submit" className="btn btn-secondary" style={{marginTop: '20px', width: '100%', borderColor: '#fff', color: '#fff'}}>Secure Login</button>
        </form>

        <p style={{textAlign: 'center', marginTop: '30px', fontSize: '0.8rem'}}>
          <Link to="/" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>← Back to Participant Sign In</Link>
        </p>
      </div>
    </div>
  );
}
