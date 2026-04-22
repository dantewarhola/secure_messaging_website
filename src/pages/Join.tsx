import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
// Import hashValue to hash the entered password before comparing with Supabase
import { hashValue } from '../lib/crypto';

export default function Join() {
  const { roomId: paramRoomId } = useParams<{ roomId?: string }>();
  const savedRoomId = sessionStorage.getItem('selectedRoomId') || '';
  const [roomId, setRoomId] = useState(paramRoomId || savedRoomId);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('userId')) {
      navigate('/');
    }
  }, [navigate]);

  const handleJoin = async () => {
    const trimmedRoom = roomId.trim();
    const trimmedPass = password.trim();
    if (!trimmedRoom || !trimmedPass) return;

    setLoading(true);
    setError('');

    try {
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('room_id, password, capacity, member_count')
        .eq('room_id', trimmedRoom)
        .single();

      if (fetchError || !room) {
        setError('Room not found. Check the Room ID and try again.');
        setLoading(false);
        return;
      }

      // Hash what the user typed so we can compare it against the stored hash
      const hashedPassword = await hashValue(trimmedPass);

      if (room.password !== hashedPassword) {
        setError('Incorrect password.');
        setLoading(false);
        return;
      }

      // Store the ORIGINAL password for encryption key derivation — not the hash
      sessionStorage.setItem('roomId', trimmedRoom);
      sessionStorage.setItem('roomPassword', trimmedPass);

      if (room.member_count >= room.capacity) {
        setError('Room is full (max 2 users).');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('roomId', trimmedRoom);
      sessionStorage.setItem('roomPassword', trimmedPass);
      navigate('/chat');
    } catch {
      setError('Something went wrong. Please try again.');
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

        <h1>Join Room</h1>
        <p className="subtitle">// enter room ID and shared password</p>

        <div className="field">
          <label>Room ID</label>
          <input
            placeholder="e.g. myroom42"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            autoFocus={!roomId}
          />
        </div>

        <div className="field">
          <label>Room Password</label>
          <input
            type="password"
            placeholder="Shared secret from room creator"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
            autoFocus={!!roomId}
          />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button
          className="btn-primary"
          onClick={handleJoin}
          disabled={!roomId.trim() || !password.trim() || loading}
          style={{ marginTop: 8 }}
        >
          {loading ? 'Checking…' : 'Join Room →'}
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
          Password derives encryption key locally · Never transmitted
        </div>
      </div>
    </div>
  );
}
