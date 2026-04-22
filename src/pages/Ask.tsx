import { useNavigate } from 'react-router-dom';
import LogoMark from '../components/LogoMark';

export default function Ask() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || 'anonymous';

  return (
    <>
      <div className="grid-bg" />
      <div className="orb-tl" />
      <div className="orb-br" />

      <nav className="nav">
        <div className="nav-logo">
          <LogoMark size={26} />
          <span className="nav-logo-text">CIPHER<span>CHAT</span></span>
        </div>
        <div className="nav-right">
          <span className="tag" style={{ fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
            USER // {userId}
          </span>
        </div>
      </nav>

      <div className="split-page">
        {/* LEFT */}
        <div className="split-left">
          <div className="hero-eyebrow">session active</div>
          <h1 className="hero-title">
            Choose<br />
            Your<br />
            <span className="accent">Protocol.</span>
          </h1>
          <p className="hero-sub">
            Create a new encrypted channel or connect to an existing room.
            All sessions are ephemeral — messages vanish when you leave.
          </p>

          <div style={{ marginTop: 32, padding: 20, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--rl)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--blue)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              How it works
            </div>
            {[
              ['01', 'Create or join a room with a shared password'],
              ['02', 'Password is hashed — never stored in plaintext'],
              ['03', 'Key derived locally to encrypt every message'],
              ['04', 'Only ciphertext travels over the network'],
            ].map(([n, t]) => (
              <div key={n} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--blue)', opacity: 0.5, flexShrink: 0, paddingTop: 2 }}>{n}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="split-right">
          <div className="tag" style={{ alignSelf: 'flex-start', marginBottom: 28 }}>SELECT OPERATION</div>

          <div className="panel-title">MISSION CONTROL</div>
          <div className="panel-sub">// select your entry point</div>

          <button
            className="btn-primary"
            style={{ width: '100%', marginBottom: 12 }}
            onClick={() => navigate('/create')}
          >
            + Create New Room
          </button>

          <button
            className="btn-outline"
            style={{ width: '100%', marginBottom: 12 }}
            onClick={() => navigate('/lobby')}
          >
            Browse Active Rooms
          </button>

          <div className="or-divider">or</div>

          <button
            className="btn-outline"
            style={{ width: '100%' }}
            onClick={() => navigate('/join')}
          >
            Join with Room ID
          </button>
        </div>
      </div>
    </>
  );
}
