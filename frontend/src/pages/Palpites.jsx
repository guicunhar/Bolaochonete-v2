import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const PHASES = ['Grupos', 'Oitavas', 'Quartas', 'Semi', 'Final'];

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${d} ${months[+m - 1]}`;
}

export default function Palpites() {
  const { apiCall } = useAuth();
  const [allBets, setAllBets] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('Grupos');
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    Promise.all([apiCall('/api/bets/all'), apiCall('/api/games')])
      .then(([bets, gamesData]) => {
        setAllBets(bets);
        setGames(gamesData);
      })
      .finally(() => setLoading(false));
  }, []);

  const phaseGames = games.filter(g => g.phase === phase);

  const getBetsForGame = (gameId) => allBets.filter(b => b.game_id === gameId);

  if (loading) return <div className="spinner" />;

  return (
    <div className="fade-in">
      <h1 className="section-title">👀 Palpites de Todos</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '24px' }}>
        Os palpites ficam visíveis apenas após o início da partida.
      </p>

      <div className="tabs">
        {PHASES.map(p => (
          <button key={p} className={`tab${phase === p ? ' active' : ''}`} onClick={() => { setPhase(p); setSelectedGame(null); }}>
            {p}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {phaseGames.map(game => {
          const gameBets = getBetsForGame(game.id);
          const isOpen = selectedGame === game.id;
          const started = new Date() >= new Date(`${game.match_date}T${game.match_time}:00-03:00`);

          return (
            <div key={game.id} className="match-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedGame(isOpen ? null : game.id)}>
              <div className="match-header">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`phase-badge phase-${game.phase}`}>{game.phase}</span>
                  {game.group_name && <span>Grupo {game.group_name}</span>}
                  <span>•</span>
                  <span>{formatDate(game.match_date)} • {game.match_time}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {game.home_score !== null && (
                    <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.82rem' }}>
                      Resultado: {game.home_score} × {game.away_score}
                    </span>
                  )}
                  {!started && <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>🔒 Antes do jogo</span>}
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              <div className="match-body" style={{ pointerEvents: 'none' }}>
                <div className="team-block">
                  <div className="team-flag">{game.home_flag}</div>
                  <div className="team-name">{game.home_team}</div>
                </div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: 'var(--gold)', padding: '0 8px' }}>VS</div>
                <div className="team-block">
                  <div className="team-flag">{game.away_flag}</div>
                  <div className="team-name">{game.away_team}</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  {gameBets.length} palpite{gameBets.length !== 1 ? 's' : ''}
                </div>
              </div>

              {isOpen && (
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  {!started ? (
                    <div className="alert alert-info" style={{ marginBottom: 0 }}>
                      Os palpites ficam visíveis após o início da partida.
                    </div>
                  ) : gameBets.length === 0 ? (
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Nenhum palpite registrado.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {gameBets.map(bet => {
                        let badge = null;
                        if (game.home_score !== null) {
                          if (bet.points === 5) badge = <span className="result-badge badge-total">+5</span>;
                          else if (bet.points === 3) badge = <span className="result-badge badge-parcial3">+3</span>;
                          else if (bet.points === 1) badge = <span className="result-badge badge-parcial1">+1</span>;
                          else badge = <span className="result-badge badge-errou">0</span>;
                        }
                        return (
                          <div key={bet.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <span style={{ fontWeight: 700, flex: 1, fontSize: '0.9rem' }}>{bet.user_name}</span>
                            <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: 'var(--gold-light)' }}>
                              {bet.home_score} × {bet.away_score}
                            </span>
                            {badge}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
