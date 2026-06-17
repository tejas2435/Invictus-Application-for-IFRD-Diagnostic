import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { supabase } from '../supabaseClient';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function SupervisorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = "Supervisor Login - Invictus";
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError('');

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('custom_id, full_name, role, organization')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        if (profile.role !== 'supervisor') {
          setError("Access Denied: Supervisor level permissions required.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        localStorage.setItem('invictus_supervisorAuth', 'true');
        localStorage.setItem('invictus_supervisorId', profile.custom_id || '');
        localStorage.setItem('invictus_supervisorUUID', authData.user.id);
        localStorage.setItem('invictus_supervisorName', profile.full_name);
        localStorage.setItem('invictus_supervisorOrg', profile.organization);
        navigate('/supervisor');
      } else {
        setError("Error loading supervisor details.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="app-container" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
      <div className="question-card" style={{width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', padding: '40px', borderTop: '4px solid #fff', alignItems: 'center'}}>
        <img src={logo} alt="Invictus Logo" className="main-logo" />
        <h1 style={{textAlign: 'center', fontSize: '1.8rem', marginBottom: '20px'}}>SUPERVISOR PORTAL</h1>
        
        <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '20px', width: '100%'}}>
          {error && <div style={{background: 'rgba(255, 23, 68, 0.1)', color: 'var(--error)', padding: '10px', borderRadius: '5px', textAlign: 'center'}}>{error}</div>}
          
          <div>
            <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Supervisor Email</label>
            <input type="email" className="input-text" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter supervisor email" />
          </div>
          <div>
            <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Password</label>
            <div style={{position: 'relative'}}>
               <input type={showPassword ? 'text' : 'password'} className="input-text" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password" />
               <div style={{position: 'absolute', right: '15px', top: '12px', cursor: 'pointer', color: 'var(--text-secondary)'}} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
               </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-secondary" style={{marginTop: '20px', width: '100%', borderColor: '#fff', color: '#fff', opacity: loading ? 0.7 : 1}}>
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <Link to="/supervisor/forgot-password" style={{ color: 'var(--accent)', fontSize: '0.85rem', textDecoration: 'none' }}>Forgot Password?</Link>
          </div>
        </form>

        <p style={{textAlign: 'center', marginTop: '30px', fontSize: '0.8rem'}}>
          <Link to="/" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>← Back to Participant Sign In</Link>
        </p>
      </div>
    </div>
  );
}
