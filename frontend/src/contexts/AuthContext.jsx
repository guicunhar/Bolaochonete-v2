import { createContext, useContext, useState, useEffect } from 'react';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const api = async (url, opts = {}) => {
    const r = await fetch(url, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers }
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erro'); }
    return r.json();
  };

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUser(d); else { setToken(null); localStorage.removeItem('token'); } })
      .finally(() => setLoading(false));
  }, [token]);

  const login = (tok, userData) => {
    localStorage.setItem('token', tok);
    setToken(tok); setUser(userData);
  };
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null); setUser(null);
  };
  const refreshUser = async () => {
    const d = await api('/api/me');
    setUser(d);
  };

  return <Ctx.Provider value={{ user, token, login, logout, loading, api, refreshUser }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
