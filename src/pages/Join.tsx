import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { hashValue } from '../lib/crypto';
import MatrixRain from '../components/MatrixRain';
import Logo from '../components/LogoMark';

export default function Join() {
  const { roomId: param } = useParams<{ roomId?: string }>();
  const saved = sessionStorage.getItem('selectedRoomId') || '';
  const [roomId, setRoomId]     = useState(param || saved);
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  useEffect(() => { if (!localStorage.getItem('userId')) navigate('/'); }, [navigate]);

  const handle = async () => {
    const room = roomId.trim(), pass = password.trim();
    if (!room || !pass) return;
    setLoading(true); setError('');
    try {
      const { data, error: err } = await supabase
        .from('rooms')
        .select('room_id, password, capacity, member_count, is_locked, expires_at')
        .eq('room_id', room)
        .single();

      if (err || !data) { setError('Room not found.'); setLoading(false); return; }
      if (data.is_locked) { setError('Room is locked by the creator.'); setLoading(false); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('This room has expired.');
        setLoading(false);
        return;
      }

      const hashed = await hashValue(pass);
      if (data.password !== hashed) { setError('Incorrect password.'); setLoading(false); return; }
      if (data.member_count >= data.capacity) { setError('Room is full.'); setLoading(false); return; }

      sessionStorage.setItem('roomId', room);
      sessionStorage.setItem('roomPassword', pass);
      navigate('/chat');
    } catch { setError('Connection failed. Try again.'); setLoading(false); }
  };

  return (
    <>
      <MatrixRain />
      <nav className="nav">
        <div className="nav-brand"><Logo size={22} />PhantomChat</div>
        <div className="nav-right">
          <button className="btn-ghost" onClick={() => navigate('/ask')}>← Back</button>
        </div>
      </nav>

      <div className="auth-page">
        <div className="auth-box">
          <div className="auth-header">
            <div className="auth-title">Join a <span className="g">Room</span></div>
            <div className="auth-desc">enter the room ID and password from the creator</div>
          </div>

          <div className="field">
            <label className="field-label">Room ID</label>
            <input placeholder="e.g. alpha-7" value={roomId} onChange={(e) => setRoomId(e.target.value)} autoFocus={!roomId} />
          </div>

          <div className="field">
            <label className="field-label">Password</label>
            <input type="password" placeholder="Shared secret" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handle(); }}
              autoFocus={!!roomId} />
          </div>

          {error && (
            <div className={error.includes('locked') ? 'locked-banner' : 'error-msg'}>
              {error.includes('locked') ? '🔒 ' : ''}{error}
            </div>
          )}

          <button className="btn-primary" onClick={handle} disabled={!roomId.trim() || !password.trim() || loading}>
            {loading ? 'Checking…' : 'Join Room →'}
          </button>

          <div className="enc-footer">
            <div className="dot" />
            Password verified against a hash — never transmitted in plaintext.
          </div>
        </div>
      </div>
    </>
  );
}
