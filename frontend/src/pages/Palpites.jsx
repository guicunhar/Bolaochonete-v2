import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';
import Flag from '../components/Flag';

const PHASES     = ['Grupos','Pré-Oitavas','Oitavas','Quartas','Semi','Terceiro Lugar','Final'];
const PHASE_KEYS = ['Grupos','Pre-Oitavas','Oitavas','Quartas','Semi','Terceiro Lugar','Final'];

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
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    Promise.all([api('/api/bets/all'), api('/api/games')])
      .then(([b,g]) => { setAllBets(b); setGames(g); })
      .finally(() => setLoading(false));
  }, [api]);

  const phase = PHASE_KEYS[phaseIdx];
  const phaseGames = games.filter(g => g.phase === phase);
  const betsFor = gid => allBets.filter(b => b.game_id === gid);

  if (loading) return <div className="spinner" />;

  return (
    <div className="fade-up">
      <div className="section-header">
        <h1 className="section-title">Palpites</h1>
      </div>

      <p style={{ color:'var(--muted)', fontSize:'0.82rem', marginBottom:'20px' }}>
        Palpites públicos aparecem antes do jogo. Anônimos só aparecem após o início.
      </p>

      <div className="tabs">
        {PHASES.map((p, i) => (
          <button
            key={p}
            className={`tab${phaseIdx===i?' active':''}`}
            onClick={() => { setPhaseIdx(i); setOpen(null); }}
          >
            {p}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
        {phaseGames.map(game => {
          const bets = betsFor(game.id);
          const isOpen = open === game.id;
          const started = new Date() >= new Date(`${game.match_date}T${game.match_time}:00-03:00`);
          const visibleBets = bets.filter(b => !b.hidden);
          const anonCount = bets.length - visibleBets.length;

          return (
            <div
              key={game.id}
              className="match-card"
              style={{ cursor:'pointer' }}
              onClick={() => setOpen(isOpen ? null : game.id)}
            >

              {/* META */}
              <div className="match-meta">
                <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
                  <span className={`badge-phase ph-${game.phase}`}>{game.phase}</span>
                  {game.group_name && <span>Grupo {game.group_name}</span>}
                  <span>•</span>
                  <span>{fmtDate(game.match_date)} — {game.match_time}</span>
                </div>

                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  {game.home_score !== null && (
                    <span style={{ color:'var(--lime)', fontWeight:700, fontSize:'0.78rem' }}>
                      {game.home_score} x {game.away_score}
                    </span>
                  )}
                  <span style={{ fontSize:'0.7rem' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* TIMES */}
              <div style={{
                display:'grid',
                gridTemplateColumns:'1fr auto 1fr',
                alignItems:'center',
                gap:'12px',
                padding:'6px 0'
              }}>

                {/* Casa */}
                <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'6px' }}>
                  <span style={{ fontSize:'0.82rem', fontWeight:600 }}>
                    {game.home_team}
                  </span>
                  <Flag code={game.home_flag} name={game.home_team}/>
                </div>

                {/* Centro */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
                  <span style={{ fontFamily:'Outfit', fontSize:'1.1rem', fontWeight:800, color:'var(--muted2)' }}>
                    VS
                  </span>

                  <span style={{ fontSize:'0.65rem', color:'var(--muted2)', textAlign:'center' }}>
                    {visibleBets.length} palpite{visibleBets.length!==1?'s':''}
                    {anonCount > 0 && (
                      <span style={{ display:'block' }}>
                        {anonCount} anôn.
                      </span>
                    )}
                  </span>
                </div>

                {/* Fora */}
                <div style={{ display:'flex', justifyContent:'flex-start', alignItems:'center', gap:'6px' }}>
                  <Flag code={game.away_flag} name={game.away_team}/>
                  <span style={{ fontSize:'0.82rem', fontWeight:600 }}>
                    {game.away_team}
                  </span>
                </div>

              </div>

              {/* PALPITES */}
              {isOpen && (
                <div
                  style={{
                    marginTop:'14px',
                    borderTop:'1px solid var(--border)',
                    paddingTop:'14px'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {visibleBets.length === 0 ? (
                    <p style={{ color:'var(--muted)', fontSize:'0.82rem', textAlign:'center' }}>
                      {!started ? 'Nenhum palpite público ainda.' : 'Nenhum palpite registrado.'}
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
                          <div
                            key={bet.id}
                            style={{
                              display:'flex',
                              alignItems:'center',
                              justifyContent:'space-between',
                              padding:'8px 12px',
                              background:'var(--card2)',
                              borderRadius:'var(--radius-sm)'
                            }}
                          >
                            {/* Nome */}
                            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                              <Avatar src={bet.avatar_path} name={bet.user_name} size={28} />
                              <span style={{ fontWeight:600, fontSize:'0.85rem' }}>
                                {bet.user_name}
                              </span>
                            </div>

                            {/* Score */}
                            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                              <span style={{
                                fontFamily:'Outfit',
                                fontSize:'1rem',
                                fontWeight:800,
                                color:'var(--lime)'
                              }}>
                                {bet.home_score} x {bet.away_score}
                              </span>

                              {badge}
                            </div>
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