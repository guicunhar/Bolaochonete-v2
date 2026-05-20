import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const TEAMS = ['Argentina','Alemanha','Arabia Saudita','Australia','Belgica','Bielorrussia','Bolivia','Brasil',
  'Camaroes','Canada','Chile','China','Colombia','Coreia do Sul','Costa Rica','Croacia','Dinamarca',
  'Egito','Equador','Espanha','Eslovaquia','Estados Unidos','Franca','Georgia','Honduras','Inglaterra',
  'Ira','Italia','Japao','Marrocos','Mexico','Nigeria','Nova Zelandia','Paises Baixos','Panama',
  'Peru','Polonia','Portugal','Rep. Tcheca','Russia','Senegal','Suica','Tailandia','Tanzania',
  'Tunisia','Turquia','Uruguai','Venezuela'];

export default function PrimeiroAcesso() {
  const [params] = useSearchParams();
  const [username, setUsername] = useState(params.get('user') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [champion, setChampion] = useState('');
  const [player, setPlayer] = useState('');
  const [scorer, setScorer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault(); setError('');
    if (password !== confirm) return setError('As senhas nao conferem');
    if (password.length < 4) return setError('Senha minima de 4 caracteres');
    setLoading(true);
    try {
      const res = await fetch('/api/first-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, champion_pick: champion, best_player_pick: player, top_scorer_pick: scorer })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data.token, data.user);
      navigate('/classificacao');
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', background:'var(--black)' }}>
      <div style={{ width:'100%', maxWidth:'460px' }}>
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ fontSize:'2.2rem', fontFamily:'Syne', fontWeight:800, letterSpacing:'-0.03em' }}>
            BOLAO<span style={{ color:'var(--lime)' }}>CHONETE</span>
          </div>
          <p style={{ color:'var(--muted)', marginTop:'6px', fontSize:'0.875rem' }}>Ativacao de conta</p>
        </div>

        <div className="card fade-up">
          <h2 style={{ fontSize:'1.1rem', marginBottom:'6px' }}>Primeiro acesso</h2>
          <p style={{ color:'var(--muted)', fontSize:'0.82rem', marginBottom:'20px' }}>
            Defina sua senha e faca seus palpites bonus — <strong style={{ color:'var(--lime)' }}>eles nao poderao ser alterados depois!</strong>
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Seu usuario (cadastrado pelo admin)</label>
              <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="usuario" required />
            </div>
            <div className="grid2">
              <div className="form-group">
                <label className="label">Senha</label>
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="min. 4 caracteres" required />
              </div>
              <div className="form-group">
                <label className="label">Confirmar senha</label>
                <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="repita a senha" required />
              </div>
            </div>

            <div className="divider" />

            <div style={{ background:'rgba(200,240,62,0.04)', border:'1px solid rgba(200,240,62,0.15)', borderRadius:'var(--radius-sm)', padding:'12px 14px', marginBottom:'16px' }}>
              <p style={{ fontSize:'0.78rem', color:'var(--lime)', fontWeight:600, marginBottom:'4px' }}>PALPITES BONUS — ATENCAO</p>
              <p style={{ fontSize:'0.75rem', color:'var(--muted)' }}>Esses palpites valem pontos extras ao final da Copa e nao podem ser alterados apos a ativacao da conta.</p>
            </div>

            <div className="form-group">
              <label className="label">Selecao Campea (+50 pts / +25 se vice)</label>
              <select className="input" value={champion} onChange={e => setChampion(e.target.value)}>
                <option value="">Escolha uma selecao...</option>
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Melhor Jogador (+25 pts)</label>
              <input className="input" value={player} onChange={e => setPlayer(e.target.value)} placeholder="Nome do jogador..." />
            </div>
            <div className="form-group">
              <label className="label">Artilheiro (+20 pts / +10 se desempate)</label>
              <input className="input" value={scorer} onChange={e => setScorer(e.target.value)} placeholder="Nome do jogador..." />
            </div>

            <button className="btn btn-lime btn-lg" type="submit" disabled={loading} style={{ width:'100%', marginTop:'8px' }}>
              {loading ? 'Ativando...' : 'Ativar conta e jogar!'}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:'14px', fontSize:'0.8rem', color:'var(--muted)' }}>
            Ja tem senha? <Link to="/login" style={{ color:'var(--lime)', fontWeight:600 }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
