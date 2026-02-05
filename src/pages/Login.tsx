import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import logo from '../assets/novo-logo.svg';

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASS = 'admin123';

export const LoginPage: React.FC = () => {
  const { setRole } = useAuth();
  const navigate = useNavigate();
  const [role, setRoleLocal] = useState<'admin' | 'doctor' | 'fdo'>('admin');
  const [doctorName, setDoctorName] = useState('Dr. Khan');
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [info, setInfo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'doctor' && !doctorName.trim()) {
      setInfo('Please enter doctor name.');
      return;
    }
    if (role === 'admin') {
      if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASS) {
        setInfo('Invalid admin credentials. Use admin@gmail.com / admin123.');
        return;
      }
    } else if (role === 'doctor') {
      if (!email.trim()) {
        setInfo('Please enter email for doctor login.');
        return;
      }
      if (password !== ADMIN_PASS) {
        setInfo('Invalid doctor credentials. Password is admin123.');
        return;
      }
    } else {
      if (!email.trim()) {
        setInfo('Please enter email for FDO login.');
        return;
      }
      if (password !== ADMIN_PASS) {
        setInfo('Invalid FDO credentials. Password is admin123.');
        return;
      }
    }
    setInfo('');
    if (role === 'doctor') {
      setRole('doctor', doctorName.trim());
      navigate('/appointments', { replace: true });
    } else if (role === 'fdo') {
      setRole('fdo');
      navigate('/appointments', { replace: true });
    } else {
      setRole('admin');
      navigate('/', { replace: true });
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
          {role === 'doctor' && (
            <label className="public-field">
              <span>Doctor Name</span>
              <input
                className="input"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                required
              />
            </label>
          )}
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
