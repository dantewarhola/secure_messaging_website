import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Login from './pages/Login';
import Ask from './pages/Ask';
import Lobby from './pages/Lobby';
import Join from './pages/Join';
import Create from './pages/Create';
import Chat from './pages/Chat';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/ask" element={<Ask />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/join" element={<Join />} />
        <Route path="/join/:roomId" element={<Join />} />
        <Route path="/create" element={<Create />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}
