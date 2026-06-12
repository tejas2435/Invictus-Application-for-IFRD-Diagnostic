import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { supabase } from '../supabaseClient';

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    preferredName: '',
    email: '',
    phoneCode: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [awaitingOTP, setAwaitingOTP] = useState(false);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    document.title = "Participant Sign Up - Invictus";
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match.");
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          preferred_name: formData.preferredName,
          phone_number: `${formData.phoneCode} ${formData.phoneNumber}`,
          role: 'participant'
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else if (data?.session) {
      if (data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('custom_id')
          .eq('id', data.user.id)
          .single();

        localStorage.setItem('invictus_userId', profile?.custom_id || data.user.id);
        localStorage.setItem('invictus_userUUID', data.user.id);
        localStorage.setItem('invictus_userName', formData.fullName);
        localStorage.setItem('invictus_userEmail', data.user.email || '');
        navigate('/diagnostic');
      }
    } else {
      setAwaitingOTP(true);
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: formData.email,
      token: otp,
      type: 'signup'
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
    } else {
      if (data?.user) {
        await new Promise(r => setTimeout(r, 600));

        const { data: profile } = await supabase
          .from('profiles')
          .select('custom_id')
          .eq('id', data.user.id)
          .single();

        localStorage.setItem('invictus_userId', profile?.custom_id || data.user.id);
        localStorage.setItem('invictus_userUUID', data.user.id);
        localStorage.setItem('invictus_userName', formData.fullName);
        localStorage.setItem('invictus_userEmail', data.user.email || '');
        navigate('/diagnostic');
      }
    }
  };

  return (
    <div className="app-container" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'}}>
      <div className="question-card" style={{width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', padding: '40px', alignItems: 'center'}}>
        <img src={logo} alt="Invictus Logo" style={{ height: '60px', marginBottom: '20px' }} />
        <h1 style={{textAlign: 'center', fontSize: '1.8rem', marginBottom: '30px'}}>Sign Up for Participant</h1>
        
        {!awaitingOTP ? (
          <>
            <form onSubmit={handleSignup} style={{display: 'flex', flexDirection: 'column', gap: '20px', width: '100%'}}>
              {error && <div style={{background: 'rgba(255, 23, 68, 0.1)', color: 'var(--error)', padding: '10px', borderRadius: '5px', textAlign: 'center'}}>{error}</div>}
              
              <div><label className="question-text" style={{fontSize: '0.9rem'}}>1. Full Name</label><input name="fullName" value={formData.fullName} onChange={handleChange} type="text" className="input-text" required /></div>
              <div><label className="question-text" style={{fontSize: '0.9rem'}}>2. Preferred Name</label><input name="preferredName" value={formData.preferredName} onChange={handleChange} type="text" className="input-text" required /></div>
              <div><label className="question-text" style={{fontSize: '0.9rem'}}>3. Email Address</label><input name="email" value={formData.email} onChange={handleChange} type="email" className="input-text" required /></div>
              <div>
                <label className="question-text" style={{fontSize: '0.9rem'}}>4. Mobile Number</label>
                <div style={{display: 'flex', gap: '10px'}}>
                  <select name="phoneCode" value={formData.phoneCode} onChange={handleChange} className="input-text" style={{flex: '0 0 110px', padding: '10px 5px', cursor: 'pointer', appearance: 'auto'}} required>
                    <option value="" disabled>Code</option>
                    <option value="+1">+1 (US)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+65">+65 (SG)</option>
                    <option value="+91">+91 (IN)</option>
                    <option value="+971">+971 (AE)</option>
                    <option value="+60">+60 (MY)</option>
                    <option value="+62">+62 (ID)</option>
                    <option value="+353">+353 (IE)</option>
                    <option value="+86">+86 (CN)</option>
                  </select>
                  <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} type="text" className="input-text" placeholder="Number" style={{flex: 1}} required />
                </div>
              </div>
              <div><label className="question-text" style={{fontSize: '0.9rem'}}>5. Set Password</label><input name="password" value={formData.password} onChange={handleChange} type="password" className="input-text" required /></div>
              <div><label className="question-text" style={{fontSize: '0.9rem'}}>6. Confirm Password</label><input name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} type="password" className="input-text" required /></div>

              <button type="submit" disabled={loading} className="btn btn-secondary" style={{marginTop: '20px', width: '100%', borderColor: '#fff', color: '#fff', opacity: loading ? 0.7 : 1}}>
                {loading ? 'Registering...' : 'Register & Verify Email'}
              </button>
            </form>

            <p style={{textAlign: 'center', marginTop: '30px', color: 'var(--text-secondary)'}}>
              Already an existing user? <Link to="/" style={{color: 'var(--accent)', textDecoration: 'none', fontWeight: 600}}>Login here</Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleVerifyOTP} style={{display: 'flex', flexDirection: 'column', gap: '20px', width: '100%'}}>
            {error && <div style={{background: 'rgba(255, 23, 68, 0.1)', color: 'var(--error)', padding: '10px', borderRadius: '5px', textAlign: 'center'}}>{error}</div>}
            
            <div style={{textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '10px'}}>
              We sent a 6-digit confirmation code to <strong>{formData.email}</strong>.<br/>
              Please check your inbox and spam folder.
            </div>

            <div>
              <label className="question-text" style={{fontSize: '0.9rem', textAlign: 'center', display: 'block'}}>Enter OTP</label>
              <input value={otp} onChange={e => setOtp(e.target.value)} type="text" className="input-text" required placeholder="123456" style={{textAlign: 'center', letterSpacing: '8px', fontSize: '1.2rem'}} maxLength={6} />
            </div>

            <button type="submit" disabled={loading} className="btn btn-secondary" style={{marginTop: '20px', width: '100%', borderColor: '#fff', color: '#fff', opacity: loading ? 0.7 : 1}}>
              {loading ? 'Verifying...' : 'Verify Option & Start Diagnostic'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
