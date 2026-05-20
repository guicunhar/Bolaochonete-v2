import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';
import Flag from '../components/Flag';

const PHASES = ['Grupos','Pre-Oitavas','Oitavas','Quartas','Semi','Terceiro Lugar','Final'];

function fmtDate(d) {
  const [y,m,day] = d.split('-');
  const months=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${day} ${months[+m-1]}`;
}

export default function Palpites() {
  const { api } = useAuth();
  const [allBets, setAllBets] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('Grupos');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    Promise.all([api('/api/bets/all'), api('/api/games')])
      .then(([b,g]) => { setAllBets(b); setGames(g); })
      .finally(() => setLoading(false));
  }, []);

  const phaseGames = games.filter(g => g.phase === phase);
  const betsFor = gid => allBets.filter(b => b.game_id === gid);

  if (loading) return <div className="spinner" />;

  return (
    <div className="fade-up">
      <div className="section-header">
        <h1 className="section-title">Palpites</h1>
      </div>
      <p style={{ color:'var(--muted)', fontSize:'0.82rem', marginBottom:'20px' }}>
        Palpites publicos aparecem antes do jogo. Anonimos so aparecem apos o inicio.
      </p>

      <div className="tabs">
        {PHASES.map(p => (
          <button key={p} className={`tab${phase===p?' active':''}`} onClick={() => { setPhase(p); setOpen(null); }}>{p}</button>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
        {phaseGames.map(game => {
          const bets = betsFor(game.id);
          const isOpen = open === game.id;
          const started = new Date() >= new Date(`${game.match_date}T${game.match_time}:00-03:00`);
          const visibleBets = bets.filter(b => !b.hidden);

          return (
            <div key={game.id} className="match-card" style={{ cursor:'pointer' }} onClick={() => setOpen(isOpen ? null : game.id)}>
              <div className="match-meta">
                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  <span className={`badge-phase ph-${game.phase}`}>{game.phase}</span>
                  {game.group_name && <span>Grupo {game.group_name}</span>}
                  <span>•</span>
                  <span>{fmtDate(game.match_date)} - {game.match_time}</span>
                </div>
                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  {game.home_score !== null && (
                    <span style={{ color:'var(--lime)', fontWeight:700, fontSize:'0.78rem' }}>
                      {game.home_score} x {game.away_score}
                    </span>
                  )}
                  <span style={{ color:'var(--muted)', fontSize:'0.75rem' }}>
                    {visibleBets.length} palpite{visibleBets.length!==1?'s':''}
                    {bets.length > visibleBets.length ? ` (+${bets.length-visibleBets.length} anonimos)` : ''}
                  </span>
                  <span style={{ color:'var(--muted2)', fontSize:'0.7rem' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              <div className="match-body" style={{ pointerEvents:'none' }}>
                <div className="team">
                  <Flag code={game.home_flag} name={game.home_team} />
                  <span className="team-name">{game.home_team}</span>
                </div>
                <div style={{ fontFamily:'Syne', fontSize:'1.1rem', fontWeight:800, color:'var(--muted2)', padding:'0 8px' }}>VS</div>
                <div className="team">
                  <Flag code={game.away_flag} name={game.away_team} />
                  <span className="team-name">{game.away_team}</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ marginTop:'14px', borderTop:'1px solid var(--border)', paddingTop:'14px' }} onClick={e=>e.stopPropagation()}>
                  {visibleBets.length === 0 ? (
                    <p style={{ color:'var(--muted)', fontSize:'0.82rem' }}>
                      {!started ? 'Nenhum palpite publico ainda. Palpites anonimos aparecem apos o inicio.' : 'Nenhum palpite registrado.'}
                    </p>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                      {visibleBets.map(bet => {
                        let badge = null;
                        if (game.home_score !== null) {
                          if (bet.points===5) badge = <span className="badge badge-exact">+5</span>;
                          else if (bet.points===3) badge = <span className="badge badge-p3">+3</span>;
                          else if (bet.points===1) badge = <span className="badge badge-p1">+1</span>;
                          else badge = <span className="badge badge-miss">0</span>;
                        }
                        return (
                          <div key={bet.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', background:'var(--card2)', borderRadius:'var(--radius-sm)' }}>
                            <Avatar src={bet.avatar_path} name={bet.user_name} size={28} />
                            <span style={{ fontWeight:600, fontSize:'0.85rem', flex:1 }}>{bet.user_name}</span>
                            <span style={{ fontFamily:'Syne', fontSize:'1rem', fontWeight:800, color:'var(--lime)' }}>
                              {bet.home_score} x {bet.away_score}
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
