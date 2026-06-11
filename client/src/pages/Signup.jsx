import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

export default function Signup() {
  const navigate = useNavigate();

  const handleSignup = (e) => {
    e.preventDefault();
    // mock signup
    const userId = uuidv4();
    localStorage.setItem('invictus_userId', userId);
    navigate('/diagnostic');
  };

  return (
    <div className="app-container" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
      <div className="question-card" style={{width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', padding: '40px'}}>
        <h1 style={{textAlign: 'center', fontSize: '1.8rem', marginBottom: '30px'}}>Sign Up for Participant</h1>
        
        <form onSubmit={handleSignup} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
          <div><label className="question-text" style={{fontSize: '0.9rem'}}>1. Full Name</label><input type="text" className="input-text" required /></div>
          <div><label className="question-text" style={{fontSize: '0.9rem'}}>2. Preferred Name</label><input type="text" className="input-text" required /></div>
          <div><label className="question-text" style={{fontSize: '0.9rem'}}>3. Email Address</label><input type="email" className="input-text" required /></div>
          <div>
            <label className="question-text" style={{fontSize: '0.9rem'}}>4. Mobile Number</label>
            <div style={{display: 'flex', gap: '10px'}}>
              <input type="text" className="input-text" placeholder="+Code" style={{flex: '0 0 80px'}} required />
              <input type="text" className="input-text" placeholder="Number" style={{flex: 1}} required />
            </div>
          </div>
          <div><label className="question-text" style={{fontSize: '0.9rem'}}>5. Set Password</label><input type="password" className="input-text" required /></div>
          <div><label className="question-text" style={{fontSize: '0.9rem'}}>6. Confirm Password</label><input type="password" className="input-text" required /></div>

          <button type="submit" className="btn btn-secondary" style={{marginTop: '20px', width: '100%', borderColor: '#fff', color: '#fff'}}>Register & Start Diagnostic</button>
        </form>

        <p style={{textAlign: 'center', marginTop: '30px', color: 'var(--text-secondary)'}}>
          Already an existing user? <Link to="/" style={{color: 'var(--accent)', textDecoration: 'none', fontWeight: 600}}>Login here</Link>
        </p>
      </div>
    </div>
  );
}
