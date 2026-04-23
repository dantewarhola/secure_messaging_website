import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MatrixRain from '../components/MatrixRain';
import Logo from '../components/LogoMark';

export default function Login() {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const go = () => {
    const t = name.trim();
    if (!t) return;
    localStorage.setItem('userId', t);
    navigate('/ask');
  };

  return (
    <>
      <MatrixRain />
      <nav className="nav">
        <div className="nav-brand">
          <Logo size={22} />
          PhantomChat
        </div>
        <div className="nav-right">
          <span className="nav-tag">E2EE · XSalsa20</span>
        </div>
      </nav>

      <div className="auth-page">
        <div className="auth-box">
          <div className="auth-header">
            <div className="auth-title">
              Welcome to <span className="g">PhantomChat</span>
            </div>
            <div className="auth-desc">set a display name to get started</div>
          </div>

          <div className="field">
            <label className="field-label">Display Name</label>
            <input
              placeholder="e.g. alice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
              autoFocus
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <button className="btn-primary" onClick={go} disabled={!name.trim()}>
              Continue →
            </button>
          </div>

          <div className="enc-footer">
            <div className="dot" />
            Messages encrypted with XSalsa20-Poly1305. Keys derived locally. Zero server-side plaintext.
          </div>
        </div>
      </div>
    </>
  );
}
