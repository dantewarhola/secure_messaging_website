import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LogoMark from '../components/LogoMark';

interface RoomInfo { room_id: string; capacity: number; member_count: number; }

export default function Lobby() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('rooms').select('room_id, capacity, member_count').order('created_at', { ascending: false });
    if (!error && data) setRooms(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
    const channel = supabase.channel('rooms-lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
          <button className="btn-ghost" onClick={fetchRooms}>↻ Refresh</button>
          <button className="btn-primary" onClick={() => navigate('/create')}>+ New Room</button>
        </div>
      </nav>

      <div className="lobby-page">
        <div className="lobby-header">
          <div>
            <div className="lobby-heading">ACTIVE CHANNELS</div>
            <div className="lobby-sub">// real-time encrypted room directory</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="pulse-dot" />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: '0.08em' }}>
              LIVE — {rooms.length} room{rooms.length !== 1 ? 's' : ''} active
            </span>
          </div>
        </div>

        <div className="lobby-body">
          <div className="rooms-label">// available rooms</div>

          {loading ? (
            <div className="empty-state">scanning network…</div>
          ) : rooms.length === 0 ? (
            <div className="empty-state">
              <div style={{ marginBottom: 16, opacity: 0.3 }}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" stroke="currentColor" strokeWidth="1" fill="none"/>
                  <path d="M14 20V17C14 13.69 16.69 11 20 11C23.31 11 26 13.69 26 17V20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <rect x="13" y="20" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                </svg>
              </div>
              <p>No active rooms.</p>
              <p style={{ marginTop: 10 }}>
                <button className="link-btn" onClick={() => navigate('/create')}>Create the first room →</button>
              </p>
            </div>
          ) : (
            <div className="rooms-grid">
              {rooms.map((r) => (
                <div key={r.room_id} className="room-card">
                  <div className="room-card-top">
                    <span className="room-name">{r.room_id}</span>
                    <span className={`status-pill ${r.member_count >= r.capacity ? 'status-full' : 'status-open'}`}>
                      {r.member_count >= r.capacity ? 'FULL' : 'OPEN'}
                    </span>
                  </div>
                  <div className="room-count">{r.member_count} / {r.capacity} connected</div>
                  <div className="fill-track">
                    <div className="fill-track-inner" style={{ width: `${(r.member_count / r.capacity) * 100}%` }} />
                  </div>
                  <button
                    className="btn-join"
                    disabled={r.member_count >= r.capacity}
                    onClick={() => navigate(`/join/${r.room_id}`)}
                  >
                    {r.member_count >= r.capacity ? 'Room Full' : 'Join Room →'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 32 }}>
            <button className="btn-ghost" onClick={() => navigate('/ask')}>← Back</button>
          </div>
        </div>
      </div>
    </>
  );
}
