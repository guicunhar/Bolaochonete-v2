import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const TEAMS = [
  '🇧🇷 Brasil','🇦🇷 Argentina','🇫🇷 França','🇵🇹 Portugal','🇩🇪 Alemanha',
  '🇪🇸 Espanha','🇳🇱 Países Baixos','🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra','🇧🇪 Bélgica','🇺🇾 Uruguai',
  '🇭🇷 Croácia','🇮🇹 Itália','🇲🇦 Marrocos','🇯🇵 Japão','🇲🇽 México',
  '🇺🇸 Estados Unidos','🇨🇦 Canadá','🇵🇱 Polônia','🇨🇴 Colômbia','🇨🇱 Chile',
  '🇰🇷 Coréia do Sul','🇸🇳 Senegal','🇹🇷 Turquia','🇺🇦 Ucrânia','🇨🇭 Suíça',
  '🇩🇰 Dinamarca','🇸🇪 Suécia','🇦🇺 Austrália','🇪🇨 Equador','🇵🇪 Peru',
];

export default function Register() {
  const [form, setForm] = useState({ name: '', username: '', password: '', champion_pick: '', best_player_pick: '', top_scorer_pick: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '3rem' }}>⚽</div>
          <h1 style={{ fontSize: '2.8rem', color: 'var(--gold)', lineHeight: 1 }}>BOLÃO CHONETE</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '4px' }}>Copa do Mundo 2026</p>
        </div>

        <div className="card fade-in">
          <h2 style={{ fontSize: '1.5rem', color: 'var(--gold)', marginBottom: '20px' }}>CRIAR CONTA</h2>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nome completo</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Seu nome" required />
              </div>
              <div className="form-group">
                <label className="form-label">Usuário</label>
                <input className="form-input" value={form.username} onChange={e => set('username', e.target.value)} placeholder="sem espaços" required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="mínimo 4 caracteres" required />
            </div>

            <div className="divider" />
            <p style={{ color: 'var(--gold)', fontFamily: 'Bebas Neue', fontSize: '1.1rem', marginBottom: '12px', letterSpacing: '0.04em' }}>
              🏆 PALPITES ESPECIAIS
            </p>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginBottom: '16px' }}>
              Esses palpites valem pontos bônus ao final da Copa e podem ser alterados até 11/05 às 15h59.
            </p>

            <div className="form-group">
              <label className="form-label">🥇 Seleção Campeã (+50 pts)</label>
              <select className="form-input" value={form.champion_pick} onChange={e => set('champion_pick', e.target.value)}>
                <option value="">Selecione uma seleção...</option>
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">⭐ Melhor Jogador (+25 pts)</label>
              <input className="form-input" value={form.best_player_pick} onChange={e => set('best_player_pick', e.target.value)} placeholder="Nome do jogador..." />
            </div>

            <div className="form-group">
              <label className="form-label">👟 Artilheiro (+20 pts)</label>
              <input className="form-input" value={form.top_scorer_pick} onChange={e => set('top_scorer_pick', e.target.value)} placeholder="Nome do jogador..." />
            </div>

            <button className="btn btn-gold btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
              {loading ? 'Cadastrando...' : 'Criar conta e jogar!'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            Já tem conta? <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 700 }}>Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
