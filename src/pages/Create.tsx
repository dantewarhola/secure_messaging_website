import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { hashValue } from '../lib/crypto';
import MatrixRain from '../components/MatrixRain';
import Logo from '../components/LogoMark';

export default function Create() {
  const [roomId, setRoomId]       = useState('');
  const [password, setPassword]   = useState('');
  const [capacity, setCapacity]   = useState(2);
  const [isPublic, setIsPublic]   = useState(true);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const navigate = useNavigate();

  const handle = async () => {
    const room = roomId.trim(), pass = password.trim();
    if (!room || !pass) return;
    setLoading(true); setError('');
    try {
      const { data: ex } = await supabase.from('rooms').select('id').eq('room_id', room).single();
      if (ex) { setError('Room ID already taken.'); setLoading(false); return; }

      const hashed = await hashValue(pass);
      const { error: err } = await supabase.from('rooms').insert([{
        room_id: room,
        password: hashed,
        capacity,
        is_public: isPublic,
      }]);
      if (err) { setError(err.message); setLoading(false); return; }

      sessionStorage.setItem('roomId', room);
      sessionStorage.setItem('roomPassword', pass);
      navigate('/chat');
    } catch { setError('Something went wrong.'); setLoading(false); }
  };

  return (
    <>
      <MatrixRain />
      <nav className="nav">
        <div className="nav-brand"><Logo size={22} />CipherChat</div>
        <div className="nav-right">
          <button className="btn-ghost" onClick={() => navigate('/ask')}>← Back</button>
        </div>
      </nav>

      <div className="auth-page">
        <div className="auth-box">
          <div className="auth-header">
            <div className="auth-title">Create a <span className="g">Room</span></div>
            <div className="auth-desc">share the room ID and password with your contact</div>
          </div>

          <div className="field">
            <label className="field-label">Room ID</label>
            <input placeholder="e.g. alpha-7" value={roomId} onChange={(e) => setRoomId(e.target.value)} autoFocus />
          </div>

          <div className="field">
            <label className="field-label">Password</label>
            <input type="password" placeholder="Shared with anyone joining" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="field">
            <label className="field-label">Max Users</label>
            <div className="select-wrap">
              <select value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}>
                {[2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n} users</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Visibility</label>
            <div className="visibility-toggle">
              <label className="vis-option">
                <input
                  type="radio"
                  name="visibility"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                />
                <div className="vis-label">
                  <div className="vis-label-title">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                      <circle cx="6" cy="6" r="2" fill="currentColor"/>
                    </svg>
                    Public
                  </div>
                  <div className="vis-label-desc">Visible in Browse Rooms</div>
                </div>
              </label>

              <label className="vis-option">
                <input
                  type="radio"
                  name="visibility"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                />
                <div className="vis-label">
                  <div className="vis-label-title">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <rect x="2" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M4 5V3.5C4 2.12 4.9 1 6 1C7.1 1 8 2.12 8 3.5V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    Private
                  </div>
                  <div className="vis-label-desc">Join by Room ID only</div>
                </div>
              </label>
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button className="btn-primary" onClick={handle} disabled={!roomId.trim() || !password.trim() || loading}>
            {loading ? 'Creating…' : 'Create & Join Room →'}
          </button>

          <div className="enc-footer">
            <div className="dot" />
            Password is SHA-256 hashed before storage. Only used locally to derive your encryption key.
          </div>
        </div>
      </div>
    </>
  );
}
