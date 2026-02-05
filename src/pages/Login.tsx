import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { useStaff } from '../store/useStaff';
import logo from '../assets/novo-logo.svg';

const ADMIN_EMAIL = 'admin.novoasthetics@novo-asthetics.com';
const ADMIN_PASS = '786/Novo@dmin345';

export const LoginPage: React.FC = () => {
  const { setRole } = useAuth();
  const { verifyStaffCredentials } = useStaff();
  const navigate = useNavigate();
  const [role, setRoleLocal] = useState<'admin' | 'doctor' | 'fdo'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [info, setInfo] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfo('');
    if (role === 'admin') {
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
    if (role === 'doctor') {
      if (staffMember.role !== 'Doctor') {
        setInfo('This account is not a doctor. Use Doctor role to sign in as doctor.');
        return;
      }
      setRole('doctor', staffMember.name);
      navigate('/appointments', { replace: true });
    } else {
      setRole('fdo');
      navigate('/appointments', { replace: true });
    }
  };

  const handleReset = () => {
    setInfo('Password reset link sent (mock). Check your email.');
  };

  return (
    <div className="auth-shell">
      <div className="auth-overlay" />
        <div className="auth-card panel">
          <div className="auth-brand">
            <img className="brand-logo" src={logo} alt="Novo Aesthetics" />
            <div className="brand-subtitle">Refined Care - Exceptional Results</div>
          </div>
        <div className="auth-heading">
          <h1>Welcome back</h1>
          <p>Please sign in to continue to your clinic dashboard.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="public-field">
            <span>Role</span>
            <select
              className="input"
              value={role}
              onChange={(e) => setRoleLocal(e.target.value as 'admin' | 'doctor' | 'fdo')}
            >
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="fdo">FDO</option>
            </select>
          </label>
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
            Login
          </button>
          {info && <div className="muted small">{info}</div>}
        </form>
        <div className="auth-footer muted small">
          Need help? Contact support at care@novoaestheticspk.com - 2026 Novo Aesthetics Clinic
        </div>
      </div>
    </div>
  );
};
