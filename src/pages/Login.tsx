import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoMark from '../components/LogoMark';

const STREAM_LINES = [
  '<span class="hl">INIT</span> XSalsa20-Poly1305 cipher engine...',
  'entropy pool: <span class="hl">0xA3F9C2E1B7D4</span>',
  '<span class="hl2">SHA-256</span> key derivation: active',
  'nonce: <span class="hl">0x7E2A91F3C804B5D6</span>',
  'cipher: <span class="hl2">0xD4A1...E9F2</span> [encrypted]',
  '<span class="hl">AUTH</span> signature verified ✓',
  'channel: <span class="hl2">SECURE</span> — zero server plaintext',
  'broadcast relay: <span class="hl">STANDBY</span>',
  'key exchange: <span class="hl2">COMPLETE</span>',
  '<span class="hl">E2EE</span> session established',
];

export default function Login() {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem('userId', trimmed);
    navigate('/ask');
  };

  return (
    <>
      <div className="grid-bg" />
      <div className="orb-tl" />
      <div className="orb-br" />

      {/* Nav */}
      <nav className="nav">
        <div className="nav-logo">
          <LogoMark size={26} />
          <span className="nav-logo-text">CIPHER<span>CHAT</span></span>
        </div>
        <div className="nav-right">
          <span className="tag">v2.0 — E2EE</span>
        </div>
      </nav>

      {/* Split layout */}
      <div className="split-page">
        {/* LEFT — hero */}
        <div className="split-left">
          <div className="hero-eyebrow">military-grade encryption</div>

          <h1 className="hero-title">
            Zero<br />
            Knowledge<br />
            <span className="accent">Messaging.</span>
          </h1>

          <p className="hero-sub">
            Every message encrypted on your device before it ever leaves.
            No logs. No plaintext. No backdoors.
            Your conversations belong to you alone.
          </p>

          {/* Encryption stream visual */}
          <div className="enc-visual">
            <div
              className="enc-stream"
              dangerouslySetInnerHTML={{
                __html: [...STREAM_LINES, ...STREAM_LINES].join('<br/>')
              }}
            />
            <div className="enc-badge">
              <div className="pulse-dot" />
              XSalsa20 · ACTIVE
            </div>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-value">256-bit</div>
              <div className="stat-label">Key Strength</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">0 bytes</div>
              <div className="stat-label">Stored Plaintext</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">E2EE</div>
              <div className="stat-label">End-to-End</div>
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div className="split-right">
          <div className="tag" style={{ alignSelf: 'flex-start', marginBottom: 28 }}>
            SECURE AUTHENTICATION
          </div>

          <div className="panel-title">IDENTIFY YOURSELF</div>
          <div className="panel-sub">// your display name for this session</div>

          <div className="input-wrap">
            <label className="input-label">Display Name</label>
            <input
              placeholder="e.g. alice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
              autoFocus
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleLogin}
            disabled={!name.trim()}
            style={{ width: '100%', marginTop: 8 }}
          >
            Continue →
          </button>

          <div className="security-row" style={{ marginTop: 28 }}>
            <span className="sec-chip">XSalsa20-Poly1305</span>
            <span className="sec-chip">SHA-256 KDF</span>
            <span className="sec-chip">Zero-Knowledge</span>
            <span className="sec-chip">No Logs</span>
          </div>
        </div>
      </div>
    </>
  );
}
