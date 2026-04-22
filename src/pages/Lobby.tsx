import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MatrixRain from '../components/MatrixRain';
import Logo from '../components/LogoMark';

interface Room {
  room_id: string;
  capacity: number;
  member_count: number;
  members: string[];
  is_public: boolean;
}

export default function Lobby() {
  const [rooms, setRooms]     = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rooms')
      .select('room_id, capacity, member_count, members, is_public')
      .eq('is_public', true)   // only show public rooms
      .order('created_at', { ascending: false });
    if (!error && data) setRooms(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
    const ch = supabase.channel('lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <>
      <MatrixRain />
      <nav className="nav">
        <div className="nav-brand"><Logo size={22} />CipherChat</div>
        <div className="nav-right">
          <button className="btn-ghost" onClick={fetchRooms}>↻ Refresh</button>
          <button className="btn-new" onClick={() => navigate('/create')}>+ New Room</button>
        </div>
      </nav>

      <div className="lobby-page">
        <div className="lobby-bar">
          <div className="lobby-bar-left">
            <h2>Public Rooms</h2>
            <p>// {rooms.length} public room{rooms.length !== 1 ? 's' : ''} · updates in real time</p>
          </div>
          <div className="lobby-bar-right">
            <div className="nav-dot" style={{ width: 6, height: 6 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', letterSpacing: '0.06em' }}>LIVE</span>
          </div>
        </div>

        <div className="lobby-body">
          <div className="section-label">// available</div>

          {loading ? (
            <div className="empty-state" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>scanning…</div>
          ) : rooms.length === 0 ? (
            <div className="empty-lobby">
              <div className="empty-lobby-grid">
                {Array(9).fill(0).map((_, i) => (
                  <div key={i} className="empty-lobby-cell" />
                ))}
              </div>
              <div className="empty-lobby-title">No public rooms active</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                private rooms are hidden from this list
              </div>
              <button className="link-btn" style={{ marginTop: 12 }} onClick={() => navigate('/create')}>
                Create the first room →
              </button>
            </div>
          ) : (
            <div className="rooms-grid">
              {rooms.map((r, i) => (
                <div key={r.room_id} className="room-card" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="room-top">
                    <span className="room-name">{r.room_id}</span>
                    <span className={`room-pill ${r.member_count >= r.capacity ? 'pill-full' : 'pill-open'}`}>
                      {r.member_count >= r.capacity ? 'Full' : 'Open'}
                    </span>
                  </div>
                  <div className="room-meta">{r.member_count} / {r.capacity} connected</div>

                  {r.members && r.members.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                      {r.members.map((m) => (
                        <span key={m} style={{
                          fontFamily: 'var(--mono)', fontSize: 10,
                          color: 'var(--green)', background: 'rgba(0,255,65,0.06)',
                          border: '1px solid rgba(0,255,65,0.15)',
                          borderRadius: 3, padding: '2px 7px', letterSpacing: '0.04em',
                        }}>{m}</span>
                      ))}
                    </div>
                  )}

                  <div className="fill-bar">
                    <div className="fill-bar-inner" style={{ width: `${(r.member_count / r.capacity) * 100}%` }} />
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

          <div style={{ marginTop: 28, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn-ghost" onClick={() => navigate('/ask')}>← Back</button>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>
              Private rooms are not listed here — join them via room ID
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
