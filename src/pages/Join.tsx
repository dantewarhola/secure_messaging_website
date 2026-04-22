import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { hashValue } from '../lib/crypto';
import LogoMark from '../components/LogoMark';

export default function Join() {
  const { roomId: paramRoomId } = useParams<{ roomId?: string }>();
  const savedRoomId = sessionStorage.getItem('selectedRoomId') || '';
  const [roomId, setRoomId] = useState(paramRoomId || savedRoomId);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => { if (!localStorage.getItem('userId')) navigate('/'); }, [navigate]);

  const handleJoin = async () => {
    const trimmedRoom = roomId.trim();
    const trimmedPass = password.trim();
    if (!trimmedRoom || !trimmedPass) return;
    setLoading(true);
    setError('');
    try {
      const { data: room, error: fetchError } = await supabase.from('rooms').select('room_id, password, capacity, member_count').eq('room_id', trimmedRoom).single();
      if (fetchError || !room) { setError('Room not found. Verify the room ID.'); setLoading(false); return; }

      const hashedPassword = await hashValue(trimmedPass);
      if (room.password !== hashedPassword) { setError('Incorrect password.'); setLoading(false); return; }
      if (room.member_count >= room.capacity) { setError('Room is at capacity.'); setLoading(false); return; }

      sessionStorage.setItem('roomId', trimmedRoom);
      sessionStorage.setItem('roomPassword', trimmedPass);
      navigate('/chat');
    } catch { setError('Connection failed. Please retry.'); setLoading(false); }
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
          <div className="hero-eyebrow">access control</div>
          <h1 className="hero-title">
            Request<br />
            Channel<br />
            <span className="accent">Access.</span>
          </h1>
          <p className="hero-sub">
            Enter the room ID and shared password provided by the room creator.
            Your password is verified against a hash — the original is only ever
            used locally to derive your encryption key.
          </p>

          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Room ID', 'The unique identifier shared by the creator'],
              ['Password', 'The shared secret — hashed before verification'],
              ['Key', 'Derived locally from your password — never transmitted'],
            ].map(([label, desc]) => (
              <div key={label} style={{ display: 'flex', gap: 14, padding: '12px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--blue)', letterSpacing: '0.06em', flexShrink: 0, paddingTop: 1 }}>{label}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="split-right">
          <div className="tag" style={{ alignSelf: 'flex-start', marginBottom: 28 }}>AUTHENTICATION</div>
          <div className="panel-title">CHANNEL ACCESS</div>
          <div className="panel-sub">// enter credentials to join</div>

          <div className="input-wrap">
            <label className="input-label">Room ID</label>
            <input placeholder="e.g. alpha-7" value={roomId} onChange={(e) => setRoomId(e.target.value)} autoFocus={!roomId} />
          </div>

          <div className="input-wrap">
            <label className="input-label">Shared Password</label>
            <input type="password" placeholder="Shared secret from room creator" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }} autoFocus={!!roomId} />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button
            className="btn-primary"
            onClick={handleJoin}
            disabled={!roomId.trim() || !password.trim() || loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Checking…' : 'Join Room →'}
          </button>

          <div className="security-row" style={{ marginTop: 24 }}>
            <span className="sec-chip">Hash verified</span>
            <span className="sec-chip">Local key derivation</span>
            <span className="sec-chip">Zero plaintext</span>
          </div>
        </div>
      </div>
    </>
  );
}
