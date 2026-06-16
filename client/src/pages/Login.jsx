import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { supabase } from '../supabaseClient';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = "Participant Login - Invictus";
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
      // Small delay to allow Supabase trigger to complete profile creation
      await new Promise(r => setTimeout(r, 400));

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('custom_id, full_name, role')
        .eq('id', authData.user.id)
        .single();

      console.log("Profile fetch result:", { profile, profileError });

      if (profileError || !profile) {
        setError(`Could not load profile: ${profileError?.message || 'Not found'}. Please check your Supabase RLS policies or try again.`);
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (profile.role === 'admin') {
        setError("This portal is for participants. Administrators should use the Admin Portal.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      localStorage.setItem('invictus_userId', profile.custom_id || authData.user.id);
      localStorage.setItem('invictus_userUUID', authData.user.id);
      localStorage.setItem('invictus_userName', profile.full_name || '');
      localStorage.setItem('invictus_userEmail', authData.user.email || '');
      navigate('/diagnostic');
    }
    setLoading(false);
  };

  return (
    <div className="app-container" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
      <div className="question-card" style={{width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', padding: '40px', alignItems: 'center'}}>
        <img src={logo} alt="Invictus Logo" className="main-logo" />
        <h1 style={{textAlign: 'center', fontSize: '1.8rem', marginBottom: '20px'}}>Participant Login</h1>
        
        <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '20px', width: '100%'}}>
          {error && <div style={{background: 'rgba(255, 23, 68, 0.1)', color: 'var(--error)', padding: '10px', borderRadius: '5px', textAlign: 'center'}}>{error}</div>}

          <div>
            <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>Email Address</label>
            <input type="email" className="input-text" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" />
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
          
          <div style={{textAlign: 'right', marginTop: '-10px'}}>
            <Link to="/forgot-password" style={{color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none'}}>Forget password?</Link>
          </div>

          <button type="submit" disabled={loading} className="btn btn-secondary" style={{marginTop: '10px', width: '100%', borderColor: '#fff', color: '#fff', opacity: loading ? 0.7 : 1}}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
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
