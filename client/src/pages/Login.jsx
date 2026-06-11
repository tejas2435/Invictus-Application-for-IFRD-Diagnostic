import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { v4 as uuidv4 } from 'uuid';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    document.title = "Participant Login - Invictus";
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email) return;
    
    // Mock login by just setting the user id
    // In reality this would verify against backend
    let storedUserId = localStorage.getItem('invictus_userId');
    if (!storedUserId) {
       storedUserId = uuidv4();
       localStorage.setItem('invictus_userId', storedUserId);
    }
    
    navigate('/diagnostic');
  };

  return (
    <div className="app-container" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
      <div className="question-card" style={{width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', padding: '40px', alignItems: 'center'}}>
        <img src={logo} alt="Invictus Logo" style={{ height: '60px', marginBottom: '20px' }} />
        <h1 style={{textAlign: 'center', fontSize: '1.8rem', marginBottom: '20px'}}>Participant Login</h1>
        
        <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
          <div>
            <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Email Address</label>
            <input type="email" className="input-text" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" />
          </div>
          <div>
            <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Password</label>
            <input type="password" className="input-text" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password" />
          </div>
          
          <div style={{textAlign: 'right', marginTop: '-10px'}}>
            <a href="#" style={{color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none'}}>Forget password?</a>
          </div>

          <button type="submit" className="btn btn-secondary" style={{marginTop: '10px', width: '100%', borderColor: '#fff', color: '#fff'}}>Login</button>
        </form>

        <p style={{textAlign: 'center', marginTop: '30px', color: 'var(--text-secondary)'}}>
          New user? <Link to="/signup" style={{color: 'var(--accent)', textDecoration: 'none', fontWeight: 600}}>Sign up here</Link>
        </p>

        <p style={{textAlign: 'center', marginTop: '50px', fontSize: '0.8rem'}}>
          <Link to="/admin/login" style={{color: 'rgba(255,255,255,0.3)', textDecoration: 'none'}}>Admin Login Portal</Link>
        </p>
      </div>
    </div>
  );
}
