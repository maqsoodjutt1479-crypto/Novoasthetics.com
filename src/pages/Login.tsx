import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { useStaff } from '../store/useStaff';
import logo from '../assets/novo-logo.svg';

const ADMIN_EMAIL = 'admin.novoasthetics@novo-asthetics.com';
const ADMIN_PASS = 'admin@nova123';

export const LoginPage: React.FC = () => {
  const { setRole } = useAuth();
  const { hydrate, verifyStaffCredentials, registerStaffAccount } = useStaff();
  const navigate = useNavigate();
  const [portal, setPortal] = useState<'admin' | 'doctor' | 'fdo'>('fdo');
  const [fdoMode, setFdoMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [info, setInfo] = useState('');
  const [signupForm, setSignupForm] = useState({
    name: '',
    phone: '',
    email: '',
    branch: 'Main',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfo('');
    if (portal === 'admin') {
      if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASS) {
        setInfo('Invalid admin credentials.');
        return;
      }
      setRole('admin');
      navigate('/', { replace: true });
      return;
    }
    if (!email.trim()) {
      setInfo('Please enter your email.');
      return;
    }
    if (!password) {
      setInfo('Please enter your password.');
      return;
    }
    const staffMember = await verifyStaffCredentials(email.trim(), password);
    if (!staffMember) {
      setInfo('Invalid email or password.');
      return;
    }
    if (portal === 'doctor') {
      if (staffMember.role !== 'Doctor') {
        setInfo('This account is not a doctor. Use Doctor role to sign in as doctor.');
        return;
      }
      setRole('doctor', staffMember.name);
      navigate('/appointments', { replace: true });
    } else {
      if (staffMember.role !== 'FDO') {
        setInfo('This account is not FDO. Use FDO role to sign in as FDO.');
        return;
      }
      setRole('fdo');
      navigate('/appointments', { replace: true });
    }
  };

  const handleFdoSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfo('');
    if (!signupForm.name.trim() || !signupForm.phone.trim() || !signupForm.email.trim()) {
      setInfo('Name, phone, and email are required.');
      return;
    }
    if (!signupForm.password || signupForm.password.length < 6) {
      setInfo('Password must be at least 6 characters.');
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setInfo('Password and confirm password do not match.');
      return;
    }

    const result = await registerStaffAccount({
      name: signupForm.name,
      phone: signupForm.phone,
      email: signupForm.email,
      password: signupForm.password,
      role: 'FDO',
      specialty: 'Front Desk',
      branch: signupForm.branch,
    });

    if (result.error) {
      setInfo(result.error);
      return;
    }

    setEmail(signupForm.email.trim());
    setPassword('');
    setSignupForm({
      name: '',
      phone: '',
      email: '',
      branch: 'Main',
      password: '',
      confirmPassword: '',
    });
    setFdoMode('login');
    setInfo('FDO account created. Now log in with your email and password.');
  };

  const handleReset = () => {
    setInfo('Password reset link sent (mock). Check your email.');
  };

  const headingTitle =
    portal === 'admin'
      ? 'Admin Login'
      : portal === 'doctor'
      ? 'Doctor Login'
      : fdoMode === 'signup'
      ? 'FDO Signup'
      : 'FDO Login';
  const headingText =
    portal === 'admin'
      ? 'Use the admin credentials to open the full dashboard.'
      : portal === 'doctor'
      ? 'Doctors sign in separately with their own email and password.'
      : fdoMode === 'signup'
      ? 'Create the FDO account first, then use FDO login.'
      : 'Front desk officers sign in here with their own credentials.';

  return (
    <div className="auth-shell">
      <div className="auth-overlay" />
        <div className="auth-card panel">
          <div className="auth-brand">
            <img className="brand-logo" src={logo} alt="Novo Aesthetics" />
            <div className="brand-subtitle">Refined Care - Exceptional Results</div>
          </div>
        <div className="auth-heading">
          <h1>{headingTitle}</h1>
          <p>{headingText}</p>
        </div>
        <div className="filter-bar" style={{ marginBottom: 14 }}>
          <button className={`pill ${portal === 'fdo' ? '' : 'pill--ghost'}`} type="button" onClick={() => setPortal('fdo')}>
            FDO
          </button>
          <button className={`pill ${portal === 'doctor' ? '' : 'pill--ghost'}`} type="button" onClick={() => setPortal('doctor')}>
            Doctor
          </button>
          <button className={`pill ${portal === 'admin' ? '' : 'pill--ghost'}`} type="button" onClick={() => setPortal('admin')}>
            Admin
          </button>
        </div>

        {portal === 'fdo' && (
          <div className="filter-bar" style={{ marginBottom: 14 }}>
            <button className={`pill ${fdoMode === 'signup' ? '' : 'pill--ghost'}`} type="button" onClick={() => setFdoMode('signup')}>
              Signup
            </button>
            <button className={`pill ${fdoMode === 'login' ? '' : 'pill--ghost'}`} type="button" onClick={() => setFdoMode('login')}>
              Login
            </button>
          </div>
        )}

        {portal === 'fdo' && fdoMode === 'signup' ? (
          <form className="auth-form" onSubmit={handleFdoSignup}>
            <label className="public-field">
              <span>Full Name</span>
              <input
                className="input"
                value={signupForm.name}
                onChange={(e) => setSignupForm((current) => ({ ...current, name: e.target.value }))}
                required
              />
            </label>
            <label className="public-field">
              <span>Phone</span>
              <input
                className="input"
                value={signupForm.phone}
                onChange={(e) => setSignupForm((current) => ({ ...current, phone: e.target.value }))}
                required
              />
            </label>
            <label className="public-field">
              <span>Email</span>
              <input
                type="email"
                className="input"
                value={signupForm.email}
                onChange={(e) => setSignupForm((current) => ({ ...current, email: e.target.value }))}
                required
              />
            </label>
            <label className="public-field">
              <span>Branch</span>
              <input
                className="input"
                value={signupForm.branch}
                onChange={(e) => setSignupForm((current) => ({ ...current, branch: e.target.value }))}
              />
            </label>
            <label className="public-field">
              <span>Password</span>
              <input
                type="password"
                className="input"
                value={signupForm.password}
                onChange={(e) => setSignupForm((current) => ({ ...current, password: e.target.value }))}
                required
              />
            </label>
            <label className="public-field">
              <span>Confirm Password</span>
              <input
                type="password"
                className="input"
                value={signupForm.confirmPassword}
                onChange={(e) => setSignupForm((current) => ({ ...current, confirmPassword: e.target.value }))}
                required
              />
            </label>
            <button className="pill auth-primary" type="submit">
              Create FDO Account
            </button>
            {info && <div className="muted small">{info}</div>}
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
          <label className="public-field">
            <span>Email</span>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="public-field">
            <span>Password</span>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <div className="auth-row">
            <label className="pill">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Remember me</span>
            </label>
            <button type="button" className="pill pill--ghost" onClick={handleReset}>
              Forgot password?
            </button>
          </div>
          <button className="pill auth-primary" type="submit">
            {portal === 'doctor' ? 'Doctor Login' : portal === 'admin' ? 'Admin Login' : 'FDO Login'}
          </button>
          {info && <div className="muted small">{info}</div>}
          </form>
        )}
        <div className="auth-footer muted small">
          Need help? Contact support at care@novoaestheticspk.com - 2026 Novo Aesthetics Clinic
        </div>
      </div>
    </div>
  );
};
