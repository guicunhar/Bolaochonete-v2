import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';

export default function Classificacao() {
  const { api, user } = useAuth();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api('/api/ranking').then(setRanking).finally(() => setLoading(false)); }, [api]);

  if (loading) return <div className="spinner" />;

  const posClass = ['p1','p2','p3'];

  return (
    <div className="fade-up">
      <div className="section-header">
        <h1 className="section-title">Classificação</h1>
        <span style={{ fontSize:'0.8rem', color:'var(--muted)' }}>{ranking.length} participantes</span>
      </div>

      {ranking.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'48px' }}>
          <p style={{ color:'var(--muted)' }}>Nenhum jogo finalizado ainda. A Copa começa em 11/06!</p>
        </div>
      ) : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="rank-table">
            <thead>
              <tr>
                <th style={{ width:44 }}>#</th>
                <th>Participante</th>
                <th style={{ textAlign:'center' }}>Exatos</th>
                <th style={{ textAlign:'center' }}>Parcial 3</th>
                <th style={{ textAlign:'center' }}>Básico</th>
                <th style={{ textAlign:'center' }}>Bônus</th>
                <th>Pontos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((p, i) => (
                <tr key={p.id} style={p.id === user?.id ? { background:'rgba(200,240,62,0.04)' } : {}}>
                  <td><div className={`rank-pos ${posClass[i]||''}`}>{i+1}</div></td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                      <Avatar src={p.avatar_path} name={p.name} size={44} />
                      <div>
                        <div style={{ fontWeight:600, fontSize:'0.9rem' }}>
                          {p.name}
                          {p.id===user?.id && <span style={{ color:'var(--lime)', fontSize:'0.7rem', marginLeft:'6px', fontWeight:400 }}>(você)</span>}
                        </div>
                        {p.champion_pick && <div style={{ fontSize:'0.7rem', color:'var(--muted)', marginTop:'1px' }}>{p.champion_pick}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign:'center' }}><span className="badge badge-exact">{p.exact}</span></td>
                  <td style={{ textAlign:'center' }}><span className="badge badge-p3">{p.partial3}</span></td>
                  <td style={{ textAlign:'center' }}><span className="badge badge-p1">{p.partial1}</span></td>
                  <td style={{ textAlign:'center' }}>
                    {p.bonus_points > 0 ? (
                      <span style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--lime)', background:'rgba(200,240,62,0.1)', padding:'2px 8px', borderRadius:'12px' }}>
                        +{p.bonus_points}
                      </span>
                    ) : (
                      <span style={{ color:'var(--muted2)', fontSize:'0.8rem' }}>—</span>
                    )}
                  </td>
                  <td className="rank-pts">{p.total_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ranking.length > 0 && (
        <div style={{ marginTop:'32px' }}>
          <h2 style={{ fontFamily:'Outfit', fontSize:'1rem', fontWeight:700, marginBottom:'14px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            Palpites Bônus
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'10px' }}>
            {ranking.map(p => (
              <div key={p.id} className="card card-sm" style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
                <Avatar src={p.avatar_path} name={p.name} size={44} />
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:'0.85rem', marginBottom:'6px' }}>{p.name}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--muted)', display:'flex', flexDirection:'column', gap:'3px' }}>
                    {p.champion_pick && (
                      <span>
                        Campeã: <strong style={{ color:'var(--white)' }}>{p.champion_pick}</strong>
                        {p.award_details?.champion && <span style={{ color:'var(--lime)', marginLeft:4, fontWeight:700 }}>+50</span>}
                        {p.award_details?.champion_vice && <span style={{ color:'var(--yellow)', marginLeft:4, fontWeight:700 }}>+25</span>}
                      </span>
                    )}
                    {p.best_player_pick && (
                      <span>
                        Melhor: <strong style={{ color:'var(--white)' }}>{p.best_player_pick}</strong>
                        {p.award_details?.best_player && <span style={{ color:'var(--lime)', marginLeft:4, fontWeight:700 }}>+25</span>}
                      </span>
                    )}
                    {p.top_scorer_pick && (
                      <span>
                        Artilheiro: <strong style={{ color:'var(--white)' }}>{p.top_scorer_pick}</strong>
                        {p.award_details?.top_scorer && <span style={{ color:'var(--lime)', marginLeft:4, fontWeight:700 }}>+20</span>}
                        {p.award_details?.top_scorer_partial && <span style={{ color:'var(--yellow)', marginLeft:4, fontWeight:700 }}>+10</span>}
                      </span>
                    )}
                  </div>
                  {p.bonus_points > 0 && (
                    <div style={{ marginTop:'6px', fontSize:'0.72rem', fontWeight:700, color:'var(--lime)' }}>
                      Total bônus: +{p.bonus_points} pts
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
