import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data.token, data.user);
      navigate('/classificacao');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>⚽</div>
          <h1 style={{ fontSize: '3rem', color: 'var(--gold)', lineHeight: 1 }}>BOLÃO CHONETE</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '4px' }}>Copa do Mundo 2026</p>
        </div>

        <div className="card fade-in">
          <h2 style={{ fontSize: '1.5rem', color: 'var(--gold)', marginBottom: '20px' }}>ENTRAR</h2>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Usuário</label>
              <input className="form-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="seu.usuario" required />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn btn-gold btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            Não tem conta?{' '}
            <Link to="/register" style={{ color: 'var(--gold)', fontWeight: 700 }}>Cadastrar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
