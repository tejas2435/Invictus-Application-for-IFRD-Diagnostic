import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { supabase } from '../supabaseClient';
import Select from 'react-select';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { countryOptions } from '../data/countries';

export default function Signup() {
  const navigate = useNavigate();
  const { signupToken } = useParams();
  const [formData, setFormData] = useState({
    fullName: '',
    preferredName: '',
    email: '',
    phoneCode: '+1',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [orgData, setOrgData] = useState(null);
  const [orgError, setOrgError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [awaitingOTP, setAwaitingOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    document.title = "Participant Sign Up - Invictus";
    if (signupToken) {
      checkOrganization();
    }
  }, [signupToken]);

  const checkOrganization = async () => {
    setLoading(true);
    // Fetch Organization By token
    const { data: orgs, error: fetchErr } = await supabase
      .from('organizations')
      .select('*')
      .eq('signup_token', signupToken)
      .limit(1);

    if (fetchErr || !orgs || orgs.length === 0) {
      setOrgError("Invalid or expired organization signup link.");
      setLoading(false);
      return;
    }

    const org = orgs[0];

    // Check participant count
    const { count, error: countErr } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization', org.name)
      .eq('role', 'participant');

    if (countErr) {
      setOrgError("Error verifying organization capabilities.");
    } else if (org.max_participants > 0 && count >= org.max_participants) {
      setOrgError("This organization has reached its maximum participant limit.");
    } else {
      setOrgData(org);
    }
    setLoading(false);
  };

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
        if (orgData) {
          await supabase.from('profiles').update({ organization: orgData.name }).eq('id', data.user.id);
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('custom_id, organization')
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

        if (orgData) {
          await supabase.from('profiles').update({ organization: orgData.name }).eq('id', data.user.id);
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('custom_id, organization')
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
    <div className="app-container centering-container">
      <div className="question-card card-narrow" style={{ alignItems: 'center' }}>
        <img src={logo} alt="Invictus Logo" className="main-logo" />
        {orgError ? (
          <div style={{ textAlign: 'center', color: 'var(--error)', marginTop: '20px' }}>
            <h2 style={{ color: '#fff' }}>Access Denied</h2>
            <p>{orgError}</p>
          </div>
        ) : (
          <>
            <h1 className="diag-title" style={{ marginBottom: '30px' }}>Sign Up for Participant {orgData ? <div style={{ fontSize: '1.6rem', color: 'var(--accent)' }}>{orgData.name}</div> : (signupToken && 'Loading Org...')}</h1>

            {!awaitingOTP ? (
              <>
                <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                  {error && <div style={{ background: 'rgba(255, 23, 68, 0.1)', color: 'var(--error)', padding: '10px', borderRadius: '5px', textAlign: 'center' }}>{error}</div>}

                  <div><label className="question-text" style={{ fontSize: '0.9rem' }}>1. Full Name</label><input name="fullName" value={formData.fullName} onChange={handleChange} type="text" className="input-text" required /></div>
                  <div><label className="question-text" style={{ fontSize: '0.9rem' }}>2. Preferred Name</label><input name="preferredName" value={formData.preferredName} onChange={handleChange} type="text" className="input-text" required /></div>
                  <div><label className="question-text" style={{ fontSize: '0.9rem' }}>3. Email Address</label><input name="email" value={formData.email} onChange={handleChange} type="email" className="input-text" required /></div>
                  <div>
                    <label className="question-text" style={{ fontSize: '0.9rem' }}>4. Mobile Number</label>
                    <div className="phone-input-row" style={{ display: 'flex', gap: '10px' }}>
                      <Select
                        options={countryOptions}
                        value={countryOptions.find(o => o.value === formData.phoneCode)}
                        onChange={(selected) => setFormData({ ...formData, phoneCode: selected.value })}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        styles={{
                          control: (base) => ({ ...base, background: 'rgba(0,0,0,0.5)', borderColor: 'var(--border-color)', minWidth: '130px', minHeight: '44px' }),
                          singleValue: (base) => ({ ...base, color: 'var(--text-primary)' }),
                          menuList: (base) => ({ ...base, background: 'var(--bg-dark)' }),
                          option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--accent)' : 'transparent', color: state.isFocused ? '#000' : 'var(--text-primary)' }),
                          input: (base) => ({ ...base, color: 'var(--text-primary)' })
                        }}
                      />
                      <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} type="text" className="input-text" placeholder="Number" style={{ flex: 1 }} required />
                    </div>
                  </div>
                  <div>
                    <label className="question-text" style={{ fontSize: '0.9rem' }}>5. Set Password</label>
                    <div style={{ position: 'relative' }}>
                      <input name="password" value={formData.password} onChange={handleChange} type={showPassword ? 'text' : 'password'} className="input-text" required />
                      <div style={{ position: 'absolute', right: '15px', top: '12px', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="question-text" style={{ fontSize: '0.9rem' }}>6. Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <input name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} type={showConfirmPassword ? 'text' : 'password'} className="input-text" required />
                      <div style={{ position: 'absolute', right: '15px', top: '12px', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="btn btn-secondary" style={{ marginTop: '20px', width: '100%', borderColor: '#fff', color: '#fff', opacity: loading ? 0.7 : 1 }}>
                    {loading ? 'Registering...' : 'Register & Verify Email'}
                  </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '30px', color: 'var(--text-secondary)' }}>
                  Already an existing user? <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Login here</Link>
                </p>
              </>
            ) : (
              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                {error && <div style={{ background: 'rgba(255, 23, 68, 0.1)', color: 'var(--error)', padding: '10px', borderRadius: '5px', textAlign: 'center' }}>{error}</div>}

                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  We sent a 6-digit confirmation code to <strong>{formData.email}</strong>.<br />
                  Please check your inbox and spam folder.
                </div>

                <div>
                  <label className="question-text" style={{ fontSize: '0.9rem', textAlign: 'center', display: 'block' }}>Enter OTP</label>
                  <input value={otp} onChange={e => setOtp(e.target.value)} type="text" className="input-text" required placeholder="123456" style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.2rem' }} maxLength={6} />
                </div>

                <button type="submit" disabled={loading} className="btn btn-secondary" style={{ marginTop: '20px', width: '100%', borderColor: '#fff', color: '#fff', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Verifying...' : 'Verify Option & Start Diagnostic'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
