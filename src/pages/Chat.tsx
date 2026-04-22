import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { deriveKeyFromPassword, encryptMessage, decryptMessage } from '../lib/crypto';
import { playMessageReceived, playMessageSent, playPanic } from '../lib/sounds';
import MatrixRain from '../components/MatrixRain';
import Logo from '../components/LogoMark';
import { useTheme } from '../lib/theme';

interface Msg {
  id: string;
  type: 'own' | 'other' | 'sys';
  sender: string;
  text: string;
  time: string;
  reactions: Record<string, string[]>; // emoji -> userIds
}

const ts = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const HEARTBEAT_MS = 10000;
const DEAD_MS      = 32000;
const TYPING_TTL   = 3000;
const REACTION_EMOJIS = ['👍','❤️','😂','😮','👀','🔒'];
const ORIGINAL_TITLE = document.title;

export default function Chat() {
  const navigate  = useNavigate();
  const roomId    = sessionStorage.getItem('roomId') || '';
  const password  = sessionStorage.getItem('roomPassword') || '';
  const userId    = localStorage.getItem('userId') || 'anon';
  const { theme, toggle } = useTheme();

  const [messages, setMessages]         = useState<Msg[]>([]);
  const [input, setInput]               = useState('');
  const [key, setKey]                   = useState<Uint8Array | null>(null);
  const [members, setMembers]           = useState<string[]>([]);
  const [typingUsers, setTypingUsers]   = useState<string[]>([]);
  const [isLocked, setIsLocked]         = useState(false);
  const [isCreator, setIsCreator]       = useState(false);
  const [panicOpen, setPanicOpen]       = useState(false);
  const [screenshotWarn, setScrnWarn]   = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundRef = useRef(true); // ref so sound toggle never re-runs the channel effect
  const [openReaction, setOpenReaction] = useState<string | null>(null);
  const [copiedId, setCopiedId]         = useState<string | null>(null);
  const [expiresAt, setExpiresAt]       = useState<string | null>(null);
  const [linkCopied, setLinkCopied]     = useState(false);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const channelRef   = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const hbSendRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const hbCheckRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeenRef  = useRef<Record<string, number>>({});
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const typingRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHidden     = useRef(false);
  const roomIdRef    = useRef(roomId);
  const userIdRef    = useRef(userId);

  useEffect(() => { if (!roomId || !password) navigate('/'); }, []);
  useEffect(() => { if (password) deriveKeyFromPassword(password).then(setKey); }, [password]);

  // Fetch room meta (lock state, creator, expiry)
  useEffect(() => {
    if (!roomId) return;
    supabase.from('rooms')
      .select('is_locked, created_by, expires_at')
      .eq('room_id', roomId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setIsLocked(data.is_locked);
        setIsCreator(data.created_by === userId);
        setExpiresAt(data.expires_at);
      });
  }, [roomId, userId]);

  // Tab title unread badge
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) CipherChat`;
    } else {
      document.title = ORIGINAL_TITLE;
    }
    return () => { document.title = ORIGINAL_TITLE; };
  }, [unreadCount]);

  // Clear unread when tab is focused
  useEffect(() => {
    const onFocus = () => setUnreadCount(0);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Expiry countdown — delete room when it expires
  useEffect(() => {
    if (!expiresAt) return;
    const check = () => {
      if (new Date(expiresAt) <= new Date()) {
        supabase.from('rooms').delete().eq('room_id', roomId);
        navigate('/lobby');
      }
    };
    check();
    expiryRef.current = setInterval(check, 10000);
    return () => { if (expiryRef.current) clearInterval(expiryRef.current); };
  }, [expiresAt, roomId, navigate]);

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
      setMessages(p => [...p, { id: crypto.randomUUID(), type: 'sys', sender: 'sys', text, time: ts(), reactions: {} }]);

    sys('🔒 Encrypted session started');

    const ch = supabase.channel(`room:${roomId}`, { config: { presence: { key: userId } } });
    channelRef.current = ch;

    // ── MESSAGES ──
    ch.on('broadcast', { event: 'msg' }, ({ payload }) => {
      if (payload.sender === userId) return;
      setTypingUsers(p => p.filter(u => u !== payload.sender));
      if (typingTimers.current[payload.sender]) {
        clearTimeout(typingTimers.current[payload.sender]);
        delete typingTimers.current[payload.sender];
      }
      try {
        const text = decryptMessage(payload.cipher, payload.nonce, key);
        setMessages(p => [...p, { id: crypto.randomUUID(), type: 'other', sender: payload.sender, text, time: ts(), reactions: {} }]);
        if (soundRef.current) playMessageReceived();
        if (isHidden.current) setUnreadCount(c => c + 1);
      } catch {
        setMessages(p => [...p, { id: crypto.randomUUID(), type: 'other', sender: payload.sender, text: '[decryption failed]', time: ts(), reactions: {} }]);
      }
    });

    // ── REACTIONS ──
    ch.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      setMessages(p => p.map(m => {
        if (m.id !== payload.msgId) return m;
        const existing = m.reactions[payload.emoji] || [];
        const already = existing.includes(payload.sender);
        return {
          ...m,
          reactions: {
            ...m.reactions,
            [payload.emoji]: already
              ? existing.filter(u => u !== payload.sender)
              : [...existing, payload.sender],
          }
        };
      }));
    });

    // ── TYPING ──
    ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.sender === userId) return;
      setTypingUsers(p => p.includes(payload.sender) ? p : [...p, payload.sender]);
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

    // ── LOCK STATE SYNC ──
    ch.on('broadcast', { event: 'lock_change' }, ({ payload }) => {
      setIsLocked(payload.locked);
      sys(payload.locked ? '🔒 Room locked by creator' : '🔓 Room unlocked by creator');
    });

    // ── KICKED ──
    ch.on('broadcast', { event: 'kicked' }, ({ payload }) => {
      if (payload.target === userId) {
        sys('You were removed from the room by the creator');
        setTimeout(async () => {
          await supabase.rpc('leave_room', { p_room_id: roomId, p_user_id: userId });
          supabase.removeChannel(ch);
          sessionStorage.removeItem('roomId');
          sessionStorage.removeItem('roomPassword');
          navigate('/lobby');
        }, 1500);
      }
    });

    // ── PANIC ──
    ch.on('broadcast', { event: 'panic' }, () => {
      sys('💥 Room destroyed by creator');
      setTimeout(() => navigate('/lobby'), 1500);
    });

    // ── SCREENSHOT DETECTION ──
    // visibilitychange fires briefly when iOS takes a screenshot
    let lastHidden = 0;
    const onVisChange = () => {
      if (document.visibilityState === 'hidden') {
        lastHidden = Date.now();
        isHidden.current = true;
        beaconLeave(); // iOS swipe-away safety
      } else {
        isHidden.current = false;
        setUnreadCount(0);
        // If hidden for < 500ms it was probably a screenshot
        if (Date.now() - lastHidden < 500 && lastHidden > 0) {
          setScrnWarn(true);
          channelRef.current?.send({ type: 'broadcast', event: 'screenshot', payload: { sender: userId } });
          setTimeout(() => setScrnWarn(false), 4000);
        }
      }
    };

    ch.on('broadcast', { event: 'screenshot' }, ({ payload }) => {
      if (payload.sender !== userId) {
        sys(`📸 ${payload.sender} may have taken a screenshot`);
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

    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('pagehide', beaconLeave);

    return () => {
      if (hbSendRef.current)  clearInterval(hbSendRef.current);
      if (hbCheckRef.current) clearInterval(hbCheckRef.current);
      Object.values(typingTimers.current).forEach(clearTimeout);
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('pagehide', beaconLeave);
      supabase.rpc('leave_room', { p_room_id: roomId, p_user_id: userId });
      supabase.removeChannel(ch);
    };
  }, [key, roomId, userId, beaconLeave, navigate]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typingUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!channelRef.current) return;
    channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { sender: userId } });
    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => {
      channelRef.current?.send({ type: 'broadcast', event: 'stop_typing', payload: { sender: userId } });
    }, 1500);
  };

  const send = useCallback(() => {
    if (!key || !input.trim() || !channelRef.current) return;
    const text = input.trim();
    setInput('');
    if (typingRef.current) clearTimeout(typingRef.current);
    channelRef.current.send({ type: 'broadcast', event: 'stop_typing', payload: { sender: userId } });
    const { nonce, cipher } = encryptMessage(text, key);
    setMessages(p => [...p, { id: crypto.randomUUID(), type: 'own', sender: userId, text, time: ts(), reactions: {} }]);
    if (soundRef.current) playMessageSent();
    channelRef.current.send({ type: 'broadcast', event: 'msg', payload: { sender: userId, nonce, cipher } });
  }, [key, input, userId]);

  const toggleReaction = (msgId: string, emoji: string) => {
    setOpenReaction(null);
    setMessages(p => p.map(m => {
      if (m.id !== msgId) return m;
      const existing = m.reactions[emoji] || [];
      const already = existing.includes(userId);
      return {
        ...m,
        reactions: {
          ...m.reactions,
          [emoji]: already ? existing.filter(u => u !== userId) : [...existing, userId],
        }
      };
    }));
    channelRef.current?.send({ type: 'broadcast', event: 'reaction', payload: { msgId, emoji, sender: userId } });
  };

  const copyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleLock = async () => {
    const newLocked = !isLocked;
    setIsLocked(newLocked);
    await supabase.from('rooms').update({ is_locked: newLocked }).eq('room_id', roomId);
    channelRef.current?.send({ type: 'broadcast', event: 'lock_change', payload: { locked: newLocked } });
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${roomId}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handlePanic = async () => {
    playPanic();
    channelRef.current?.send({ type: 'broadcast', event: 'panic', payload: {} });
    await supabase.from('rooms').delete().eq('room_id', roomId);
    sessionStorage.removeItem('roomId');
    sessionStorage.removeItem('roomPassword');
    navigate('/lobby');
  };

  const forceRemove = async (uid: string) => {
    // Broadcast kick event — the kicked user's client listens for this and leaves
    channelRef.current?.send({ type: 'broadcast', event: 'kicked', payload: { target: uid } });
    // Also clean up the DB in case their client doesn't respond
    await supabase.rpc('leave_room', { p_room_id: roomId, p_user_id: uid });
  };

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

  const shareUrl = `${window.location.origin}/join/${roomId}`;

  return (
    <>
      <MatrixRain />

      {/* Screenshot warning toast */}
      {screenshotWarn && (
        <div className="screenshot-toast">📸 Screenshot detected</div>
      )}

      {/* Panic confirm overlay */}
      {panicOpen && (
        <div className="panic-overlay" onClick={() => setPanicOpen(false)}>
          <div className="panic-box" onClick={e => e.stopPropagation()}>
            <div className="panic-title">⚠ DESTROY ROOM?</div>
            <div className="panic-desc">
              This will immediately delete the room and disconnect all users.
              All messages will be lost. This cannot be undone.
            </div>
            <div className="panic-actions">
              <button className="btn-ghost" onClick={() => setPanicOpen(false)}>Cancel</button>
              <button className="btn-panic" onClick={handlePanic}>Destroy Room</button>
            </div>
          </div>
        </div>
      )}

      <div className="chat-layout" onClick={() => setOpenReaction(null)}>
        {/* Nav */}
        <nav className="chat-nav">
          <div className="chat-nav-left">
            <div className="online-dot" />
            <Logo size={20} />
            <div>
              <div className="chat-room-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {roomId}
                {isLocked && <span style={{ fontSize: 11, color: '#fbbf24' }}>🔒</span>}
              </div>
              <div className="chat-room-meta">
                {members.length > 0
                  ? members.map((m, i) => (
                      <span key={m}>
                        <span style={{ color: m === userId ? 'var(--green)' : 'var(--text2)' }}>
                          {m === userId ? `${m} (you)` : m}
                        </span>
                        {isCreator && m !== userId && (
                          <button className="btn-kick" title="Force remove" onClick={() => forceRemove(m)}>✕</button>
                        )}
                        {i < members.length - 1 && <span style={{ color: 'var(--text3)' }}>, </span>}
                      </span>
                    ))
                  : `you are ${userId}`}
              </div>
            </div>
          </div>
          <div className="chat-nav-right" style={{ gap: 6 }}>
            {expiresAt && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text2)', border: '1px solid var(--border)', padding: '3px 7px', borderRadius: 3 }}>
                expires {new Date(expiresAt).toLocaleDateString()}
              </span>
            )}
            <button className="theme-toggle" onClick={toggle}>{theme === 'dark' ? '☀' : '☾'}</button>
            <button
              className="btn-ghost"
              style={{ fontSize: 11, padding: '6px 9px' }}
              onClick={() => { setSoundEnabled(s => { soundRef.current = !s; return !s; }); }}
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >{soundEnabled ? '🔊' : '🔇'}</button>
            <button className="btn-ghost" style={{ fontSize: 11, padding: '6px 9px' }} onClick={copyShareLink} title="Copy share link">
              {linkCopied ? '✓' : '🔗'}
            </button>
            {isCreator && (
              <button className={`lock-btn${isLocked ? ' locked' : ''}`} onClick={toggleLock} title={isLocked ? 'Unlock room' : 'Lock room'}>
                {isLocked ? '🔒' : '🔓'}
              </button>
            )}
            <div className="e2ee-badge">
              <div className="online-dot" style={{ width: 5, height: 5 }} />
              E2EE
            </div>
            {isCreator && (
              <button className="btn-panic" onClick={() => setPanicOpen(true)}>💥</button>
            )}
            <button className="btn-danger" onClick={leave}>Leave</button>
          </div>
        </nav>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="empty-chat">
              <div className="empty-chat-icon">
                <div className="empty-chat-ring" />
                <div className="empty-chat-ring" />
                <div className="empty-chat-ring" />
                <div className="empty-chat-lock"><Logo size={24} /></div>
              </div>
              <div className="empty-chat-title">Channel is open</div>
              <div className="empty-chat-sub">
                No messages yet.<br />
                Share the room link with your contact.
              </div>
              <div className="share-bar" style={{ marginTop: 16, maxWidth: 320 }}>
                <span className="share-url">{shareUrl}</span>
                <button className={`btn-copy-link${linkCopied ? ' copied' : ''}`} onClick={copyShareLink}>
                  {linkCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`msg-wrap msg ${m.type}`}>
              {m.type !== 'sys' && <div className="msg-sender">{m.type === 'own' ? 'you' : m.sender}</div>}
              <div style={{ position: 'relative' }}>
                <div className="msg-bubble">{m.text}</div>

                {/* Reaction trigger */}
                {m.type !== 'sys' && (
                  <button
                    className="reaction-trigger"
                    onClick={e => { e.stopPropagation(); setOpenReaction(openReaction === m.id ? null : m.id); }}
                  >＋</button>
                )}

                {/* Reaction picker */}
                {openReaction === m.id && (
                  <div className="reaction-picker" onClick={e => e.stopPropagation()}>
                    {REACTION_EMOJIS.map(emoji => (
                      <button key={emoji} onClick={() => toggleReaction(m.id, emoji)}>{emoji}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reaction badges */}
              {Object.keys(m.reactions).length > 0 && (
                <div className="msg-reactions">
                  {Object.entries(m.reactions)
                    .filter(([, users]) => users.length > 0)
                    .map(([emoji, users]) => (
                      <button
                        key={emoji}
                        className={`reaction-badge${users.includes(userId) ? ' mine' : ''}`}
                        onClick={() => toggleReaction(m.id, emoji)}
                      >
                        {emoji} <span className="count">{users.length}</span>
                      </button>
                    ))}
                </div>
              )}

              {m.type !== 'sys' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="msg-time">{m.time}</div>
                  <button
                    className="copy-btn"
                    onClick={() => copyMessage(m.text, m.id)}
                  >{copiedId === m.id ? '✓' : 'copy'}</button>
                </div>
              )}
            </div>
          ))}

          {typingLabel && (
            <div className="typing-indicator">
              <div className="typing-dots"><span /><span /><span /></div>
              {typingLabel}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
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
