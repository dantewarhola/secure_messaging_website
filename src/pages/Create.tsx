import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
// Import hashValue so we can hash the password before sending to Supabase
import { hashValue } from '../lib/crypto';

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
      // Check if room already exists
      const { data: existing } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_id', trimmedRoom)
        .single();

      if (existing) {
        setError('Room ID already taken. Choose a different name.');
        setLoading(false);
        return;
      }

      // Hash the password before storing — Supabase never sees the plaintext
      const hashedPassword = await hashValue(trimmedPass);

      // Create room
      const { error: insertError } = await supabase
        .from('rooms')
        .insert([{ room_id: trimmedRoom, password: hashedPassword, capacity }]);

      // Store the ORIGINAL password in sessionStorage — needed to derive the
      // encryption key for messages. This never leaves the browser.
      sessionStorage.setItem('roomId', trimmedRoom);
      sessionStorage.setItem('roomPassword', trimmedPass);

      if (insertError) {
        setError('Failed to create room: ' + insertError.message);
        setLoading(false);
        return;
      }

      // Save to session and navigate to chat
      sessionStorage.setItem('roomId', trimmedRoom);
      sessionStorage.setItem('roomPassword', trimmedPass);
      navigate('/chat');
    } catch (err) {
      setError('Something went wrong. Check Supabase configuration.');
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="brand">
          <div className="brand-icon">🔐</div>
          <div className="brand-name">Secure<span>Chat</span></div>
        </div>

        <h1>Create Room</h1>
        <p className="subtitle">// share room ID + password with your contact</p>

        <div className="field">
          <label>Room ID</label>
          <input
            placeholder="e.g. myroom42"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            autoFocus
          />
        </div>

        <div className="field">
          <label>Room Password</label>
          <input
            type="password"
            placeholder="Used to derive the encryption key"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
        </div>

        <div className="field">
          <label>Max Users</label>
          <select
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            style={{
              width: '100%',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 15,
              fontFamily: 'var(--mono)',
              padding: '12px 14px',
              outline: 'none',
              marginBottom: 16,
              cursor: 'pointer',
            }}
          >
            {[2,3,4,5,6,8,10].map(n => (
              <option key={n} value={n}>{n} users</option>
            ))}
          </select>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button
          className="btn-primary"
          onClick={handleCreate}
          disabled={!roomId.trim() || !password.trim() || loading}
          style={{ marginTop: 8 }}
        >
          {loading ? 'Creating…' : 'Create & Enter →'}
        </button>

        <button
          className="btn-ghost"
          style={{ width: '100%', padding: '11px', marginTop: 10 }}
          onClick={() => navigate('/ask')}
        >
          ← Back
        </button>

        <div className="security-badge" style={{ marginTop: 16 }}>
          <div className="dot" />
          Password never sent to server · Used only for key derivation
        </div>
      </div>
    </div>
  );
}
