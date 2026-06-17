import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { adminSupabase as supabase } from '../supabaseClient';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = "Admin Login - Invictus";
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
        .select('custom_id, full_name, role')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        if (profile.role !== 'admin') {
          setError("Access Denied: Administrator level permissions required.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        localStorage.setItem('invictus_adminAuth', 'true');
        localStorage.setItem('invictus_adminId', profile.custom_id);
        localStorage.setItem('invictus_adminUUID', authData.user.id);
        localStorage.setItem('invictus_adminName', profile.full_name);
        navigate('/admin');
      } else {
        setError("Error loading admin details.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="app-container" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
      <div className="question-card" style={{width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', padding: '40px', borderTop: '4px solid #fff', alignItems: 'center'}}>
        <img src={logo} alt="Invictus Logo" className="main-logo" />
        <h1 style={{textAlign: 'center', fontSize: '1.8rem', marginBottom: '20px'}}>ADMIN PORTAL</h1>
        
        <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '20px', width: '100%'}}>
          {error && <div style={{background: 'rgba(255, 23, 68, 0.1)', color: 'var(--error)', padding: '10px', borderRadius: '5px', textAlign: 'center'}}>{error}</div>}
          
          <div>
            <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Admin Email</label>
            <input type="email" className="input-text" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter admin email" />
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
        </form>

        <p style={{textAlign: 'center', marginTop: '30px', fontSize: '0.8rem'}}>
          <Link to="/" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>← Back to Participant Sign In</Link>
        </p>
      </div>
    </div>
  );
}
