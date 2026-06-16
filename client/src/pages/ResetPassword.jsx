import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { supabase } from '../supabaseClient';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.title = "Update Password - Invictus";
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
         // Token successfully verified
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    setMessage('');

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setMessage('Password updated successfully! Redirecting...');
      setTimeout(() => navigate('/'), 2000);
    }
  };

  return (
    <div className="app-container" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
      <div className="question-card" style={{width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', padding: '40px', alignItems: 'center'}}>
        <img src={logo} alt="Invictus Logo" className="main-logo" />
        <h1 style={{textAlign: 'center', fontSize: '1.8rem', marginBottom: '20px'}}>Update Password</h1>
        
        <form onSubmit={handleUpdate} style={{display: 'flex', flexDirection: 'column', gap: '20px', width: '100%'}}>
          {error && <div style={{background: 'rgba(255, 23, 68, 0.1)', color: 'var(--error)', padding: '10px', borderRadius: '5px', textAlign: 'center'}}>{error}</div>}
          {message && <div style={{background: 'rgba(0, 230, 118, 0.1)', color: 'var(--accent)', padding: '10px', borderRadius: '5px', textAlign: 'center'}}>{message}</div>}

          <div>
            <label style={{display: 'block', marginBottom: '8px', color: 'var(--text-secondary)'}}>New Password</label>
            <div style={{position: 'relative'}}>
               <input type={showPassword ? 'text' : 'password'} className="input-text" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter new password" />
               <div style={{position: 'absolute', right: '15px', top: '12px', cursor: 'pointer', color: 'var(--text-secondary)'}} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
               </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-secondary" style={{marginTop: '10px', width: '100%', borderColor: '#fff', color: '#fff', opacity: loading ? 0.7 : 1}}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
