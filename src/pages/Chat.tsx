import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { deriveKeyFromPassword, encryptMessage, decryptMessage } from '../lib/crypto';
import MatrixRain from '../components/MatrixRain';
import Logo from '../components/LogoMark';

interface Msg { id: string; type: 'own' | 'other' | 'sys'; sender: string; text: string; time: string; }

const ts = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const HEARTBEAT_MS = 10000;
const DEAD_MS      = 32000;
const TYPING_TTL   = 3000; // clear typing indicator after 3s of silence

export default function Chat() {
  const navigate = useNavigate();
  const roomId   = sessionStorage.getItem('roomId') || '';
  const password = sessionStorage.getItem('roomPassword') || '';
  const userId   = localStorage.getItem('userId') || 'anon';

  const [messages, setMessages]       = useState<Msg[]>([]);
  const [input, setInput]             = useState('');
  const [key, setKey]                 = useState<Uint8Array | null>(null);
  const [members, setMembers]         = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const channelRef   = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const hbSendRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const hbCheckRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeenRef  = useRef<Record<string, number>>({});
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const typingRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomIdRef    = useRef(roomId);
  const userIdRef    = useRef(userId);

  useEffect(() => { if (!roomId || !password) navigate('/'); }, []);
  useEffect(() => { if (password) deriveKeyFromPassword(password).then(setKey); }, [password]);

  const beaconLeave = useCallback(() => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/leave_room`;
    const body = JSON.stringify({ p_room_id: roomIdRef.current, p_user_id: userIdRef.current });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    }
  }, []);

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
      // Clear typing for this sender when they send
      setTypingUsers(p => p.filter(u => u !== payload.sender));
      if (typingTimers.current[payload.sender]) {
        clearTimeout(typingTimers.current[payload.sender]);
        delete typingTimers.current[payload.sender];
      }
      try {
        const text = decryptMessage(payload.cipher, payload.nonce, key);
        setMessages(p => [...p, { id: crypto.randomUUID(), type: 'other', sender: payload.sender, text, time: ts() }]);
      } catch {
        setMessages(p => [...p, { id: crypto.randomUUID(), type: 'other', sender: payload.sender, text: '[decryption failed]', time: ts() }]);
      }
    });

    // ── TYPING ──
    ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.sender === userId) return;
      setTypingUsers(p => p.includes(payload.sender) ? p : [...p, payload.sender]);
      // Auto-clear after TTL in case we miss the stop event
      if (typingTimers.current[payload.sender]) clearTimeout(typingTimers.current[payload.sender]);
      typingTimers.current[payload.sender] = setTimeout(() => {
        setTypingUsers(p => p.filter(u => u !== payload.sender));
        delete typingTimers.current[payload.sender];
      }, TYPING_TTL);
    });

    ch.on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
      setTypingUsers(p => p.filter(u => u !== payload.sender));
      if (typingTimers.current[payload.sender]) {
        clearTimeout(typingTimers.current[payload.sender]);
        delete typingTimers.current[payload.sender];
      }
    });

    // ── HEARTBEAT ──
    ch.on('broadcast', { event: 'hb' }, ({ payload }) => {
      if (payload.u) lastSeenRef.current[payload.u] = Date.now();
    });

    // ── PRESENCE ──
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ user: string }>();
      const names = Object.values(state).flat().map((p) => p.user);
      setMembers(names);
      supabase.from('rooms').update({ members: names, member_count: names.length }).eq('room_id', roomId);
    });

    ch.on('presence', { event: 'join' }, ({ key: k }) => { if (k !== userId) sys(`${k} joined`); });
    ch.on('presence', { event: 'leave' }, ({ key: k }) => {
      sys(`${k} left`);
      setTypingUsers(p => p.filter(u => u !== k));
    });

    ch.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      await ch.track({ user: userId, at: Date.now() });
      await supabase.rpc('join_room', { p_room_id: roomId, p_user_id: userId });
      lastSeenRef.current[userId] = Date.now();

      hbSendRef.current = setInterval(() => {
        lastSeenRef.current[userId] = Date.now();
        ch.send({ type: 'broadcast', event: 'hb', payload: { u: userId } });
      }, HEARTBEAT_MS);

      hbCheckRef.current = setInterval(async () => {
        const now = Date.now();
        for (const [uid, last] of Object.entries(lastSeenRef.current)) {
          if (uid === userId) continue;
          if (now - last > DEAD_MS) {
            delete lastSeenRef.current[uid];
            sys(`${uid} disconnected`);
            await supabase.rpc('leave_room', { p_room_id: roomId, p_user_id: uid });
          }
        }
      }, 15000);
    });

    const onVisibility = () => { if (document.visibilityState === 'hidden') beaconLeave(); };
    const onPageHide   = () => beaconLeave();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      if (hbSendRef.current)  clearInterval(hbSendRef.current);
      if (hbCheckRef.current) clearInterval(hbCheckRef.current);
      Object.values(typingTimers.current).forEach(clearTimeout);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      supabase.rpc('leave_room', { p_room_id: roomId, p_user_id: userId });
      supabase.removeChannel(ch);
    };
  }, [key, roomId, userId, beaconLeave]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typingUsers]);

  // Broadcast typing events
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!channelRef.current) return;
    channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { sender: userId } });
    // Debounce stop_typing
    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => {
      channelRef.current?.send({ type: 'broadcast', event: 'stop_typing', payload: { sender: userId } });
    }, 1500);
  };

  const send = useCallback(() => {
    if (!key || !input.trim() || !channelRef.current) return;
    const text = input.trim();
    setInput('');
    // Stop typing indicator
    if (typingRef.current) clearTimeout(typingRef.current);
    channelRef.current.send({ type: 'broadcast', event: 'stop_typing', payload: { sender: userId } });
    const { nonce, cipher } = encryptMessage(text, key);
    setMessages(p => [...p, { id: crypto.randomUUID(), type: 'own', sender: userId, text, time: ts() }]);
    channelRef.current.send({ type: 'broadcast', event: 'msg', payload: { sender: userId, nonce, cipher } });
  }, [key, input, userId]);

  const leave = async () => {
    if (hbSendRef.current)  clearInterval(hbSendRef.current);
    if (hbCheckRef.current) clearInterval(hbCheckRef.current);
    await supabase.rpc('leave_room', { p_room_id: roomId, p_user_id: userId });
    if (channelRef.current) { await supabase.removeChannel(channelRef.current); channelRef.current = null; }
    sessionStorage.removeItem('roomId');
    sessionStorage.removeItem('roomPassword');
    navigate('/lobby');
  };

  const typingLabel = typingUsers.length === 1
    ? `${typingUsers[0]} is typing`
    : typingUsers.length > 1
    ? `${typingUsers.join(', ')} are typing`
    : null;

  return (
    <>
      <MatrixRain />
      <div className="chat-layout">
        <nav className="chat-nav">
          <div className="chat-nav-left">
            <div className="online-dot" />
            <Logo size={20} />
            <div>
              <div className="chat-room-name">{roomId}</div>
              <div className="chat-room-meta">
                {members.length > 0
                  ? members.map((m, i) => (
                      <span key={m}>
                        <span style={{ color: m === userId ? 'var(--green)' : 'var(--text2)' }}>
                          {m === userId ? `${m} (you)` : m}
                        </span>
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
            <div className="empty-chat">
              <div className="empty-chat-icon">
                <div className="empty-chat-ring" />
                <div className="empty-chat-ring" />
                <div className="empty-chat-ring" />
                <div className="empty-chat-lock">
                  <Logo size={24} />
                </div>
              </div>
              <div className="empty-chat-title">Channel is open</div>
              <div className="empty-chat-sub">
                No messages yet.<br />
                Share the room ID and password with your contact.
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.type}`}>
              {m.type !== 'sys' && <div className="msg-sender">{m.type === 'own' ? 'you' : m.sender}</div>}
              <div className="msg-bubble">{m.text}</div>
              {m.type !== 'sys' && <div className="msg-time">{m.time}</div>}
            </div>
          ))}

          {/* Typing indicator */}
          {typingLabel && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span /><span /><span />
              </div>
              {typingLabel}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="chat-input-area">
          <input
            placeholder={key ? 'Type a message…' : 'Deriving key…'}
            value={input}
            disabled={!key}
            autoFocus
            onChange={handleInputChange}
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
