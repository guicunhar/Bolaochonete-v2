import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Flag from '../components/Flag';

const PHASES = ['Grupos','Pre-Oitavas','Oitavas','Quartas','Semi','Terceiro Lugar','Final'];

function isLocked(game) {
  return new Date() >= new Date(`${game.match_date}T${game.match_time}:00-03:00`);
}
function fmtDate(d) {
  const [y,m,day] = d.split('-');
  const months=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const days=['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
  const dt = new Date(+y,+m-1,+day);
  return `${days[dt.getDay()]}, ${day} ${months[+m-1]}`;
}

export default function MeusPalpites() {
  const { api } = useAuth();
  const [games, setGames] = useState([]);
  const [bets, setBets] = useState({});
  const [saved, setSaved] = useState({});
  const [anon, setAnon] = useState({});
  const [saving, setSaving] = useState({});
  const [msgs, setMsgs] = useState({});
  const [phase, setPhase] = useState('Grupos');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [g, b] = await Promise.all([api('/api/games'), api('/api/bets/mine')]);
    setGames(g);
    const bMap={}, sMap={}, aMap={};
    for (const bet of b) {
      bMap[bet.game_id] = { home: String(bet.home_score), away: String(bet.away_score) };
      sMap[bet.game_id] = { home: bet.home_score, away: bet.away_score, points: bet.points };
      aMap[bet.game_id] = !!bet.is_anonymous;
    }
    setBets(bMap); setSaved(sMap); setAnon(aMap);
    setLoading(false);
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const setScore = (gid, side, val) => {
    const v = val.replace(/\D/g,'').slice(0,2);
    setBets(b => ({ ...b, [gid]: { ...b[gid], [side]: v } }));
  };

  const save = async game => {
    const bet = bets[game.id] || {};
    if (bet.home===undefined||bet.away===undefined||bet.home===''||bet.away==='') {
      return setMsgs(m => ({ ...m, [game.id]: { t:'error', text:'Preencha os dois placares' } }));
    }
    setSaving(s => ({ ...s, [game.id]: true }));
    try {
      await api('/api/bets', { method:'POST', body: JSON.stringify({
        game_id: game.id, home_score: Number(bet.home), away_score: Number(bet.away),
        is_anonymous: anon[game.id] || false
      })});
      setSaved(s => ({ ...s, [game.id]: { home: Number(bet.home), away: Number(bet.away) } }));
      setMsgs(m => ({ ...m, [game.id]: { t:'success', text:'Salvo!' } }));
      setTimeout(() => setMsgs(m => ({ ...m, [game.id]: null })), 1800);
    } catch(e) {
      setMsgs(m => ({ ...m, [game.id]: { t:'error', text: e.message } }));
    } finally {
      setSaving(s => ({ ...s, [game.id]: false }));
    }
  };

  const phaseGames = games.filter(g => g.phase === phase);

  if (loading) return <div className="spinner" />;

  return (
    <div className="fade-up">
      <div className="section-header">
        <h1 className="section-title">Meus Palpites</h1>
      </div>
      <p style={{ color:'var(--muted)', fontSize:'0.82rem', marginBottom:'20px' }}>
        Palpites bloqueados automaticamente no horario de inicio. Se nao marcar "anonimo", seu palpite aparece publico antes do jogo.
      </p>

      <div className="tabs">
        {PHASES.map(p => (
          <button key={p} className={`tab${phase===p?' active':''}`} onClick={() => setPhase(p)}>{p}</button>
        ))}
      </div>

      {phaseGames.length === 0 && (
        <div className="card" style={{ textAlign:'center', padding:'40px' }}>
          <p style={{ color:'var(--muted)' }}>Nenhum jogo nesta fase ainda.</p>
        </div>
      )}

      {phaseGames.map(game => {
        const locked = isLocked(game);
        const sv = saved[game.id];
        const bet = bets[game.id] || { home:'', away:'' };
        const msg = msgs[game.id];
        const hasResult = game.home_score !== null;

        let badge = null;
        if (hasResult && sv) {
          const pts = sv.points;
          if (pts===5) badge = <span className="badge badge-exact">+5 pts</span>;
          else if (pts===3) badge = <span className="badge badge-p3">+3 pts</span>;
          else if (pts===1) badge = <span className="badge badge-p1">+1 pt</span>;
          else badge = <span className="badge badge-miss">0 pts</span>;
        }

        return (
          <div key={game.id} className={`match-card${locked?' locked':''}`}>
            <div className="match-meta">
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <span className={`badge-phase ph-${game.phase}`}>{game.phase}</span>
                {game.group_name && <span>Grupo {game.group_name}</span>}
                <span>•</span>
                <span>{fmtDate(game.match_date)} - {game.match_time} (Brasilia)</span>
              </div>
              <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                {badge}
                {hasResult && <span style={{ color:'var(--lime)', fontWeight:600, fontSize:'0.75rem' }}>
                  {game.home_score} x {game.away_score}
                </span>}
                {locked && !hasResult && <span style={{ color:'var(--red)', fontSize:'0.7rem', fontWeight:700 }}>ENCERRADO</span>}
              </div>
            </div>

            <div className="match-body">
              <div className="team">
                <Flag code={game.home_flag} name={game.home_team} />
                <span className="team-name">{game.home_team}</span>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                {locked ? (
                  <div className="match-score-display">
                    <span>{sv ? sv.home : '-'}</span>
                    <span className="score-sep">x</span>
                    <span>{sv ? sv.away : '-'}</span>
                  </div>
                ) : (
                  <>
                    <input type="number" className="input-score" value={bet.home} onChange={e => setScore(game.id,'home',e.target.value)} placeholder="0" min="0" />
                    <span style={{ color:'var(--muted2)', fontWeight:700 }}>x</span>
                    <input type="number" className="input-score" value={bet.away} onChange={e => setScore(game.id,'away',e.target.value)} placeholder="0" min="0" />
                  </>
                )}
              </div>

              <div className="team">
                <Flag code={game.away_flag} name={game.away_team} />
                <span className="team-name">{game.away_team}</span>
              </div>

              {!locked && (
                <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginLeft:'8px', flexShrink:0 }}>
                  <button className="btn btn-lime btn-sm" onClick={() => save(game)} disabled={saving[game.id]}>
                    {saving[game.id] ? '...' : sv ? 'Atualizar' : 'Salvar'}
                  </button>
                  <label className="check-row">
                    <input type="checkbox" checked={anon[game.id]||false}
                      onChange={e => setAnon(a => ({ ...a, [game.id]: e.target.checked }))} />
                    Anonimo
                  </label>
                </div>
              )}
            </div>

            {msg && (
              <div className={`alert alert-${msg.t}`} style={{ marginTop:'10px', marginBottom:0 }}>
                {msg.text}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
