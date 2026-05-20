import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const PHASES = ['Grupos', 'Oitavas', 'Quartas', 'Semi', 'Final'];

function isLocked(game) {
  const matchStart = new Date(`${game.match_date}T${game.match_time}:00-03:00`);
  return new Date() >= matchStart;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const dt = new Date(+y, +m - 1, +d);
  return `${days[dt.getDay()]}, ${d} ${months[+m - 1]}`;
}

export default function MeusPalpites() {
  const { apiCall } = useAuth();
  const [games, setGames] = useState([]);
  const [bets, setBets] = useState({}); // game_id -> {home, away}
  const [savedBets, setSavedBets] = useState({});
  const [saving, setSaving] = useState({});
  const [phase, setPhase] = useState('Grupos');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({});

  const loadData = useCallback(async () => {
    const [gamesData, betsData] = await Promise.all([
      apiCall('/api/games'),
      apiCall('/api/bets/mine'),
    ]);
    setGames(gamesData);
    const betMap = {};
    const savedMap = {};
    for (const b of betsData) {
      betMap[b.game_id] = { home: String(b.home_score), away: String(b.away_score) };
      savedMap[b.game_id] = { home: b.home_score, away: b.away_score, points: b.points };
    }
    setBets(betMap);
    setSavedBets(savedMap);
    setLoading(false);
  }, [apiCall]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBet = (gameId, side, val) => {
    const num = val.replace(/\D/g, '').slice(0, 2);
    setBets(b => ({ ...b, [gameId]: { ...b[gameId], [side]: num } }));
  };

  const saveBet = async (game) => {
    const bet = bets[game.id] || {};
    if (bet.home === '' || bet.away === '' || bet.home === undefined || bet.away === undefined) {
      setMsg(m => ({ ...m, [game.id]: { type: 'error', text: 'Preencha os dois placares!' } }));
      return;
    }
    setSaving(s => ({ ...s, [game.id]: true }));
    try {
      await apiCall('/api/bets', {
        method: 'POST',
        body: JSON.stringify({ game_id: game.id, home_score: Number(bet.home), away_score: Number(bet.away) }),
      });
      setMsg(m => ({ ...m, [game.id]: { type: 'success', text: 'Salvo! ✓' } }));
      setSavedBets(s => ({ ...s, [game.id]: { home: Number(bet.home), away: Number(bet.away) } }));
      setTimeout(() => setMsg(m => ({ ...m, [game.id]: null })), 2000);
    } catch (e) {
      setMsg(m => ({ ...m, [game.id]: { type: 'error', text: e.message } }));
    } finally {
      setSaving(s => ({ ...s, [game.id]: false }));
    }
  };

  const phaseGames = games.filter(g => g.phase === phase);

  if (loading) return <div className="spinner" />;

  return (
    <div className="fade-in">
      <h1 className="section-title">✏️ Meus Palpites</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '24px' }}>
        Os palpites ficam bloqueados automaticamente no horário de início de cada jogo.
      </p>

      <div className="tabs">
        {PHASES.map(p => (
          <button key={p} className={`tab${phase === p ? ' active' : ''}`} onClick={() => setPhase(p)}>
            {p}
          </button>
        ))}
      </div>

      {phaseGames.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-dim)' }}>Nenhum jogo nesta fase ainda.</p>
        </div>
      )}

      {phaseGames.map(game => {
        const locked = isLocked(game);
        const saved = savedBets[game.id];
        const bet = bets[game.id] || { home: '', away: '' };
        const gameMsg = msg[game.id];
        const hasResult = game.home_score !== null;

        let badge = null;
        if (hasResult && saved) {
          const pts = saved.points;
          if (pts === 5) badge = <span className="result-badge badge-total">✅ Exato +5</span>;
          else if (pts === 3) badge = <span className="result-badge badge-parcial3">🎯 Parcial +3</span>;
          else if (pts === 1) badge = <span className="result-badge badge-parcial1">👍 Básico +1</span>;
          else badge = <span className="result-badge badge-errou">❌ Errou</span>;
        }

        return (
          <div key={game.id} className={`match-card${locked ? ' locked' : ''}`}>
            <div className="match-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`phase-badge phase-${game.phase}`}>{game.phase}</span>
                {game.group_name && <span>Grupo {game.group_name}</span>}
                <span>•</span>
                <span>{formatDate(game.match_date)} às {game.match_time} (Brasília)</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {badge}
                {locked && !hasResult && <span style={{ color: 'var(--red)', fontSize: '0.75rem', fontWeight: 700 }}>🔒 ENCERRADO</span>}
                {hasResult && <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.82rem' }}>Resultado: {game.home_score} × {game.away_score}</span>}
              </div>
            </div>

            <div className="match-body">
              <div className="team-block">
                <div className="team-flag">{game.home_flag}</div>
                <div className="team-name">{game.home_team}</div>
              </div>

              <div className="match-vs">
                {locked ? (
                  <>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'Bebas Neue', color: 'var(--text-dim)' }}>
                      {saved ? saved.home : '–'}
                    </span>
                    <span className="vs-sep">×</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'Bebas Neue', color: 'var(--text-dim)' }}>
                      {saved ? saved.away : '–'}
                    </span>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      className="score-input"
                      value={bet.home}
                      onChange={e => handleBet(game.id, 'home', e.target.value)}
                      placeholder="0"
                    />
                    <span className="vs-sep">×</span>
                    <input
                      type="text"
                      className="score-input"
                      value={bet.away}
                      onChange={e => handleBet(game.id, 'away', e.target.value)}
                      placeholder="0"
                    />
                  </>
                )}
              </div>

              <div className="team-block">
                <div className="team-flag">{game.away_flag}</div>
                <div className="team-name">{game.away_team}</div>
              </div>

              {!locked && (
                <button
                  className="btn btn-gold btn-sm"
                  onClick={() => saveBet(game)}
                  disabled={saving[game.id]}
                  style={{ marginLeft: '8px', flexShrink: 0 }}
                >
                  {saving[game.id] ? '...' : saved ? '💾 Atualizar' : '💾 Salvar'}
                </button>
              )}
            </div>

            {gameMsg && (
              <div className={`alert alert-${gameMsg.type}`} style={{ marginTop: '10px', marginBottom: 0 }}>
                {gameMsg.text}
              </div>
            )}

            {game.venue && (
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                📍 {game.venue}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
