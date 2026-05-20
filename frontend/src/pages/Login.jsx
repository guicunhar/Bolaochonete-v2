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

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'first-login') {
          navigate(`/primeiro-acesso?user=${encodeURIComponent(username)}`);
          return;
        }
        throw new Error(data.error);
      }
      login(data.token, data.user);
      navigate('/classificacao');
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', background:'var(--black)' }}>
      <div style={{ width:'100%', maxWidth:'380px' }}>
        <div style={{ textAlign:'center', marginBottom:'36px' }}>
          <div style={{ fontSize:'2.5rem', fontFamily:'Outfit', fontWeight:800, letterSpacing:'-0.03em' }}>
            BOLÃO<span style={{ color:'var(--lime)' }}>CHONETE</span>
          </div>
          <p style={{ color:'var(--muted)', marginTop:'6px', fontSize:'0.875rem' }}>Copa do Mundo 2026</p>
        </div>

        <div className="card fade-up">
          <h2 style={{ fontSize:'1.1rem', marginBottom:'20px', color:'var(--white)' }}>Entrar</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Usuário</label>
              <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="seu.usuario" required />
            </div>
            <div className="form-group">
              <label className="label">Senha</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn btn-lime btn-lg" type="submit" disabled={loading} style={{ width:'100%', marginTop:'4px' }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <p style={{ textAlign:'center', marginTop:'16px', fontSize:'0.82rem', color:'var(--muted)' }}>
            Primeiro acesso?{' '}
            <Link to="/primeiro-acesso" style={{ color:'var(--lime)', fontWeight:600 }}>Ativar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
