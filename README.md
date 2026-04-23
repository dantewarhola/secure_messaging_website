# PhantomChat

**End-to-end encrypted, ephemeral messaging. No accounts. No logs. No traces.**

---

## What is PhantomChat?

PhantomChat is a browser-based secure messaging platform built for private, real-time conversations. Every message is encrypted on your device before it leaves. The server never sees your plaintext. When a room is gone, the messages are gone with it.

---

## Features

### Encrypted Messaging

All messages are encrypted using **XSalsa20-Poly1305** (the same cipher used in Signal). Your room password is used locally to derive a 32-byte key via SHA-256. It is never transmitted to the server. Only ciphertext travels over the network.

> 📸 *[Screenshot: the login screen showing the PhantomChat logo, the "Welcome to PhantomChat" heading, the display name input field, and the matrix rain animation falling in the background behind the form]*

---

### Creating a Room

When you create a room you configure:

- **Room ID** - a unique name for your channel
- **Password** - shared with anyone you invite. Hashed with SHA-256 before being stored in the database, so even the server never knows your real password
- **Max Users** - from 2 up to 10
- **Expiry** - rooms can auto-delete after 1 hour, 6 hours, 24 hours, 7 days, or never
- **Visibility** - Public rooms appear in the lobby. Private rooms are invisible and can only be joined with the exact room ID

> 📸 *[Screenshot: the Create a Room page showing all five configuration fields — the Room ID text input, Password input, Max Users dropdown, the expiry time selector with all five buttons (1hr, 6hrs, 24hrs, 7 days, Never) where one is highlighted green, and the Public/Private visibility toggle showing both option cards with icons]*

---

### Room Sharing Link

Every room has a direct join link automatically generated. Copy it with one click and send it to your contact, they land straight on the join page with the room ID pre-filled.

> 📸 *[Screenshot: the share link bar at the bottom of the Create Room page or inside the empty chat state, showing the full join URL like "https://yourchat.vercel.app/join/roomname" with a green Copy button on the right side]*

---

### Public Room Lobby

Browse all active public rooms in real time. Each card shows the room name, how many users are connected out of the max capacity, the names of who is currently inside, and a fill bar showing how full the room is. The list updates live without needing to refresh.

> 📸 *[Screenshot: the Active Rooms lobby page showing two or three room cards in a grid layout, each card displaying a room name in monospace font, a green "Open" or red "Full" badge, a member count like "1 / 2 connected", small green name badge chips showing the names of connected users, a thin fill bar, and a Join Room button at the bottom of the card]*

---

### Live Chat

Messages appear instantly. Your messages appear on the right in green. Received messages appear on the left in dark grey. System events like joins and leaves appear as small centered pills.

> 📸 *[Screenshot: an active chat conversation showing at least 4 or 5 messages — green bubbles on the right side labeled "you", dark grey bubbles on the left labeled with the other user's name, and a small centered system message pill in the middle of the conversation reading something like "alice joined"]*

---

### Typing Indicator

When another user is typing, three animated green dots appear at the bottom of the chat with their name. Disappears automatically when they stop or send the message.

> 📸 *[Screenshot: the bottom section of the chat message area showing the three small green dots in a bouncing animation next to the text "alice is typing" in grey monospace font, positioned just above the chat input bar]*

---

### Message Reactions

Hover any message and tap the **＋** button to open the reaction picker. Choose from 👍 ❤️ 😂 😮 👀 🔒. Each user can only have one reaction per message, picking a new one replaces your previous. Reactions sync to everyone in the room instantly. Tap your own reaction to remove it.

> 📸 *[Screenshot: a chat message being hovered with the small "＋" button visible to the side, and the reaction picker floating above the message showing all six emoji options in a horizontal pill-shaped popup, with one emoji slightly enlarged as if being hovered]*

> 📸 *[Screenshot: a chat message after a reaction has been added, showing one or two reaction badges underneath the message bubble — for example "👍 1" with a green-tinted border indicating the current user has reacted, and "😂 2" in a normal style]*

---

### Copy Message

Hover any message to reveal a small **copy** button next to the timestamp. Click it to copy the message text to your clipboard.

> 📸 *[Screenshot: a chat message bubble being hovered, with the small grey "copy" text button visible to the right of the timestamp below the message, showing how it appears on hover]*

---

### Who's In the Room

The chat header shows the names of every connected user in real time. Your own name is highlighted in green with "(you)" next to it. Other users appear in grey. Names update immediately when someone joins or leaves.

> 📸 *[Screenshot: a close-up of the chat navigation bar at the top of the screen, showing the room name like "#myroom" on the left side, and directly below it the connected users displayed inline — one name in bright green with "(you)" appended, and another name in grey, separated by a comma]*

---

### Room Lock

The room creator can lock the room at any time using the 🔓 button in the nav bar. Once locked, no new users can join even if they have the password They see a yellow warning on the join page. The creator can unlock it at any time. All currently connected users stay in the room.

> 📸 *[Screenshot: the chat navigation bar with the lock button in its locked state showing a 🔒 icon highlighted in amber/yellow, and the room name also showing a small lock icon next to it indicating the room is currently locked]*

> 📸 *[Screenshot: the Join a Room page with a yellow-bordered warning banner near the top of the form reading "🔒 Room is locked by the creator" in amber text, preventing the user from entering]*

---

### Notification Sounds

A subtle tone plays when you receive a new message. A different softer tone plays when you send one. Mute or unmute using the 🔊 button in the chat nav. Your preference is saved for the session.

> 📸 *[Screenshot: the chat navigation bar highlighting the sound toggle button showing the 🔊 speaker icon, positioned between the other nav controls on the right side]*

---

### Unread Message Badge

If you switch to another browser tab while in a chat, any incoming messages increment an unread counter shown in the browser tab title. The counter clears automatically when you return to the tab.

> 📸 *[Screenshot: a browser window showing multiple open tabs at the top, with the PhantomChat tab clearly displaying "(3) PhantomChat" in the tab title text to show 3 unread messages have arrived while the user was away]*

---

### TODO Screenshot Detection

If another user takes a screenshot on mobile, a system message appears in the chat notifying everyone in the room. A brief toast notification also appears on the screenshotter's own screen.

> 📸 *[Screenshot: inside the active chat showing a centred system message pill reading "📸 alice may have taken a screenshot" appearing between normal chat messages, styled the same as other system events like join/leave notifications]*

---

### Panic Button — Room Self Destruct

The room creator has access to a **💥** button in the nav bar. Clicking it shows a confirmation dialog. If confirmed, the room is instantly deleted from the database, a destruction broadcast is sent to all users, and everyone is redirected to the lobby. All messages vanish permanently.

> 📸 *[Screenshot: the panic confirmation dialog overlaid on top of the blurred chat background, showing a dark modal with a red "⚠ DESTROY ROOM?" title, a description warning that all messages will be lost and the action cannot be undone, a grey "Cancel" button and a red "Destroy Room" button side by side at the bottom]*

> 📸 *[Screenshot: the chat at the moment of destruction, showing the final system message pill reading "💥 Room destroyed by creator" appearing at the bottom of the message list just before the redirect happens]*

---

### Force Remove Users

The room creator can remove any connected user by clicking the small **✕** next to their name in the chat header. The kicked user sees a message and is automatically redirected to the lobby.

> 📸 *[Screenshot: a close-up of the chat header showing connected user names, with a small red or grey "✕" button clearly visible directly next to a non-creator user's name, ready to be clicked by the room creator to force remove them]*

> 📸 *[Screenshot: the kicked user's chat view at the moment they are removed, showing a system message reading "You were removed from the room by the creator" appearing at the bottom of their chat before the redirect]*

---

### Automatic Room Cleanup

Rooms automatically delete from the database when the last person leaves. Expired rooms are removed when their timer runs out. Private rooms never appear in the lobby and leave no public trace.

---

### Mobile Friendly

The full interface is responsive and works on mobile browsers. Inputs are tuned to prevent iOS Safari from auto-zooming when tapped. Safe area padding accounts for notches and home indicators on modern iPhones.

> 📸 *[Screenshot: the PhantomChat login screen as seen on a mobile phone (portrait orientation), showing the complete page fitting correctly within the screen — the logo at the top, the display name input, and the Continue button all visible without any zooming, scrolling, or horizontal overflow]*

---

## Security Model

| What | How |
|---|---|
| Message encryption | XSalsa20-Poly1305 via TweetNaCl |
| Key derivation | SHA-256 of room password, runs locally in browser |
| Password storage | SHA-256 hash only — plaintext never touches the server |
| Message persistence | None — messages are broadcast-only, never stored |
| Room data | Supabase Postgres (room ID, hashed password, member count) |
| Transport | HTTPS + Supabase Realtime WebSockets |

**What the server can see:** room IDs, hashed passwords, member counts, member display names, and raw ciphertext passing through the relay.

**What the server cannot see:** message content, your real password, or who is saying what.

---

## Tech Stack

- **Frontend** - React 18 + TypeScript + Vite
- **Realtime** - Supabase Realtime (WebSocket broadcast + presence)
- **Database** - Supabase Postgres
- **Encryption** - TweetNaCl (XSalsa20-Poly1305)
- **Hosting** - Vercel

---

*Messages are ephemeral by design. Once a session ends, they are gone forever.*
