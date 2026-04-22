import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { deriveKeyFromPassword, encryptMessage, decryptMessage } from '../lib/crypto';
import MatrixRain from '../components/MatrixRain';
import Logo from '../components/LogoMark';

interface Msg { id: string; type: 'own' | 'other' | 'sys'; sender: string; text: string; time: string; }

const ts = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Heartbeat interval in ms — if a user misses 3 beats they're considered gone
const HEARTBEAT_INTERVAL = 8000;
const HEARTBEAT_TIMEOUT  = 25000;

export default function Chat() {
  const navigate = useNavigate();
  const roomId   = sessionStorage.getItem('roomId') || '';
  const password = sessionStorage.getItem('roomPassword') || '';
  const userId   = localStorage.getItem('userId') || 'anon';

  const [messages, setMessages]     = useState<Msg[]>([]);
  const [input, setInput]           = useState('');
  const [key, setKey]               = useState<Uint8Array | null>(null);
  const [members, setMembers]       = useState<string[]>([]);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Track last heartbeat time per user so we can detect silent disconnects
  const heartbeats = useRef<Record<string, number>>({});
  const deadTimer  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (!roomId || !password) navigate('/'); }, []);
  useEffect(() => { if (password) deriveKeyFromPassword(password).then(setKey); }, [password]);

  useEffect(() => {
    if (!key || !roomId) return;

    const sys = (text: string) =>
      setMessages(p => [...p, { id: crypto.randomUUID(), type: 'sys', sender: 'sys', text, time: ts() }]);

    sys('🔒 Encrypted session started');

    const ch = supabase.channel(`room:${roomId}`, { config: { presence: { key: userId } } });
    channelRef.current = ch;

    // ── MESSAGES ──
    ch.on('broadcast', { event: 'msg' }, ({ payload }) => {
      if (payload.sender === userId) return;
      try {
        const text = decryptMessage(payload.cipher, payload.nonce, key);
        setMessages(p => [...p, { id: crypto.randomUUID(), type: 'other', sender: payload.sender, text, time: ts() }]);
      } catch {
        setMessages(p => [...p, { id: crypto.randomUUID(), type: 'other', sender: payload.sender, text: '[decryption failed]', time: ts() }]);
      }
    });

    // ── HEARTBEAT ── each client broadcasts a ping every 8s
    // Any client that stops pinging for 25s is considered disconnected
    ch.on('broadcast', { event: 'heartbeat' }, ({ payload }) => {
      if (payload.userId) heartbeats.current[payload.userId] = Date.now();
    });

    // ── PRESENCE ── used to show member names in real time
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ user: string }>();
      const names = Object.values(state).flat().map((p) => p.user);
      setMembers(names);
      // Also update DB member list
      supabase.from('rooms').update({ members: names, member_count: names.length }).eq('room_id', roomId);
    });

    ch.on('presence', { event: 'join' }, ({ key: k }) => {
      if (k !== userId) sys(`${k} joined`);
    });

    ch.on('presence', { event: 'leave' }, ({ key: k }) => {
      sys(`${k} left`);
    });

    ch.subscribe(async (s) => {
      if (s !== 'SUBSCRIBED') return;

      // Track presence with our name
      await ch.track({ user: userId, at: Date.now() });

      // Use the new join_room RPC to add us to the members array
      await supabase.rpc('join_room', { p_room_id: roomId, p_user_id: userId });

      // Start sending heartbeats
      heartbeats.current[userId] = Date.now();
      const hbInterval = setInterval(() => {
        ch.send({ type: 'broadcast', event: 'heartbeat', payload: { userId } });
      }, HEARTBEAT_INTERVAL);

      // Check for dead clients every 10s
      deadTimer.current = setInterval(async () => {
        const now = Date.now();
        const dead = Object.entries(heartbeats.current)
          .filter(([id, lastSeen]) => id !== userId && now - lastSeen > HEARTBEAT_TIMEOUT)
          .map(([id]) => id);

        // Untrack dead clients from presence
        dead.forEach((id) => {
          delete heartbeats.current[id];
          sys(`${id} disconnected`);
        });
      }, 10000);

      // Cleanup heartbeat interval on unmount
      return () => {
        clearInterval(hbInterval);
        if (deadTimer.current) clearInterval(deadTimer.current);
      };
    });

    const cleanup = async () => {
      if (deadTimer.current) clearInterval(deadTimer.current);
      await supabase.rpc('leave_room', { p_room_id: roomId, p_user_id: userId });
      supabase.removeChannel(ch);
    };

    // Handle iOS Safari swiping away — visibilitychange is more reliable than beforeunload on mobile
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Fire-and-forget leave on tab hide — catches iOS swipe-away
        supabase.rpc('leave_room', { p_room_id: roomId, p_user_id: userId });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      cleanup();
    };
  }, [key, roomId, userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = useCallback(() => {
    if (!key || !input.trim() || !channelRef.current) return;
    const text = input.trim();
    setInput('');
    const { nonce, cipher } = encryptMessage(text, key);
    setMessages(p => [...p, { id: crypto.randomUUID(), type: 'own', sender: userId, text, time: ts() }]);
    channelRef.current.send({ type: 'broadcast', event: 'msg', payload: { sender: userId, nonce, cipher } });
  }, [key, input, userId]);

  const leave = async () => {
    if (deadTimer.current) clearInterval(deadTimer.current);
    await supabase.rpc('leave_room', { p_room_id: roomId, p_user_id: userId });
    if (channelRef.current) { await supabase.removeChannel(channelRef.current); channelRef.current = null; }
    sessionStorage.removeItem('roomId');
    sessionStorage.removeItem('roomPassword');
    navigate('/lobby');
  };

  return (
    <>
      <MatrixRain />
      <div className="chat-layout">
        <nav className="chat-nav">
          <div className="chat-nav-left">
            <div className="online-dot" />
            <Logo size={20} />
            <div>
              <div className="chat-room-name">#{roomId}</div>
              <div className="chat-room-meta">
                {members.length > 0
                  ? members.map((m, i) => (
                      <span key={m}>
                        <span style={{ color: m === userId ? 'var(--green)' : 'var(--text2)' }}>{m === userId ? `${m} (you)` : m}</span>
                        {i < members.length - 1 && <span style={{ color: 'var(--text3)' }}>, </span>}
                      </span>
                    ))
                  : `you are ${userId}`}
              </div>
            </div>
          </div>
          <div className="chat-nav-right">
            <div className="e2ee-badge">
              <div className="online-dot" style={{ width: 5, height: 5 }} />
              E2EE
            </div>
            <button className="btn-danger" onClick={leave}>Leave</button>
          </div>
        </nav>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 60, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', lineHeight: 2 }}>
              No messages yet.<br />
              <span style={{ fontSize: 10, opacity: 0.5 }}>Share the room ID and password with your contact.</span>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.type}`}>
              {m.type !== 'sys' && <div className="msg-sender">{m.type === 'own' ? 'you' : m.sender}</div>}
              <div className="msg-bubble">{m.text}</div>
              {m.type !== 'sys' && <div className="msg-time">{m.time}</div>}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-area">
          <input
            placeholder={key ? 'Type a message…' : 'Deriving key…'}
            value={input}
            disabled={!key}
            autoFocus
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button className="btn-send" onClick={send} disabled={!key || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </>
  );
}
