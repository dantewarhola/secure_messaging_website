import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { hashValue } from '../lib/crypto';
import LogoMark from '../components/LogoMark';

export default function Create() {
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreate = async () => {
    const trimmedRoom = roomId.trim();
    const trimmedPass = password.trim();
    if (!trimmedRoom || !trimmedPass) return;
    setLoading(true);
    setError('');
    try {
      const { data: existing } = await supabase.from('rooms').select('id').eq('room_id', trimmedRoom).single();
      if (existing) { setError('Room ID already taken. Choose a different name.'); setLoading(false); return; }

      const hashedPassword = await hashValue(trimmedPass);
      const { error: insertError } = await supabase.from('rooms').insert([{ room_id: trimmedRoom, password: hashedPassword, capacity }]);
      if (insertError) { setError('Failed to create room: ' + insertError.message); setLoading(false); return; }

      sessionStorage.setItem('roomId', trimmedRoom);
      sessionStorage.setItem('roomPassword', trimmedPass);
      navigate('/chat');
    } catch { setError('Something went wrong. Check your configuration.'); setLoading(false); }
  };

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
          <button className="btn-ghost" onClick={() => navigate('/ask')}>← Back</button>
        </div>
      </nav>

      <div className="split-page">
        <div className="split-left">
          <div className="hero-eyebrow">new channel</div>
          <h1 className="hero-title">
            Create<br />
            Encrypted<br />
            <span className="accent">Room.</span>
          </h1>
          <p className="hero-sub">
            Your room password is hashed with SHA-256 before storage.
            The original password is used locally to derive your encryption key —
            it never leaves your device in plaintext.
          </p>

          <div style={{ marginTop: 24, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', lineHeight: 2, border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16, background: 'var(--bg3)' }}>
            <span style={{ color: 'var(--blue)' }}>STEP 1</span> — Choose a unique room ID<br />
            <span style={{ color: 'var(--blue)' }}>STEP 2</span> — Set a strong shared password<br />
            <span style={{ color: 'var(--blue)' }}>STEP 3</span> — Share both with your contact<br />
            <span style={{ color: 'var(--blue)' }}>STEP 4</span> — Enter the encrypted channel
          </div>
        </div>

        <div className="split-right">
          <div className="tag" style={{ alignSelf: 'flex-start', marginBottom: 28 }}>INITIALIZE ROOM</div>
          <div className="panel-title">ROOM CONFIGURATION</div>
          <div className="panel-sub">// configure your encrypted channel</div>

          <div className="input-wrap">
            <label className="input-label">Room ID</label>
            <input placeholder="e.g. alpha-7" value={roomId} onChange={(e) => setRoomId(e.target.value)} autoFocus />
          </div>

          <div className="input-wrap">
            <label className="input-label">Shared Password</label>
            <input type="password" placeholder="Used to derive encryption key" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="input-wrap">
            <label className="input-label">Max Users</label>
            <div className="select-wrap">
              <select value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}>
                {[2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n} users</option>)}
              </select>
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={!roomId.trim() || !password.trim() || loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Creating…' : 'Create & Join Room →'}
          </button>

          <div className="security-row" style={{ marginTop: 24 }}>
            <span className="sec-chip">SHA-256 hashed</span>
            <span className="sec-chip">No plaintext stored</span>
            <span className="sec-chip">Ephemeral</span>
          </div>
        </div>
      </div>
    </>
  );
}
