import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { supervisorSupabase as supabase } from '../supabaseClient';

export default function SupervisorForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = "Supervisor Forgot Password - Invictus";
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    setMessage('');

    const { data: profileCheck } = await supabase
      .from('profiles')
      .select('email, role')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();

    if (!profileCheck) {
      setError('Account does not exist. Please check the email address.');
      setLoading(false);
      return;
    }

    if (profileCheck.role !== 'supervisor') {
      setError('This email is not associated with a Supervisor account.');
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage('Password reset link has been sent to your supervisor email.');
    }
    setLoading(false);
  };

  return (
    <div className="app-container" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
      <div className="question-card" style={{width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', padding: '40px', alignItems: 'center'}}>
        <img src={logo} alt="Invictus Logo" className="main-logo" />
        <h1 style={{textAlign: 'center', fontSize: '1.8rem', marginBottom: '20px'}}>Supervisor Password Reset</h1>
        
        <form onSubmit={handleReset} style={{display: 'flex', flexDirection: 'column', gap: '20px', width: '100%'}}>
          {error && <div style={{background: 'rgba(255, 23, 68, 0.1)', color: 'var(--error)', padding: '10px', borderRadius: '5px', textAlign: 'center'}}>{error}</div>}
          {message && <div style={{background: 'rgba(0, 230, 118, 0.1)', color: 'var(--accent)', padding: '10px', borderRadius: '5px', textAlign: 'center'}}>{message}</div>}

          <div>
            <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Supervisor Email Address</label>
            <input type="email" className="input-text" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your registered supervisor email" />
          </div>

          <button type="submit" disabled={loading} className="btn btn-secondary" style={{marginTop: '10px', width: '100%', borderColor: '#fff', color: '#fff', opacity: loading ? 0.7 : 1}}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p style={{textAlign: 'center', marginTop: '30px', fontSize: '0.8rem'}}>
          <Link to="/supervisor/login" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>← Back to Supervisor Login</Link>
        </p>
      </div>
    </div>
  );
}
