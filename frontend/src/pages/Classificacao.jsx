import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';

function exportRankingImage(ranking) {
  const dpr = window.devicePixelRatio || 1;
  const W = 700, ROW_H = 56, HEADER_H = 100, FOOTER_H = 36;
  const H = HEADER_H + ranking.length * ROW_H + FOOTER_H;
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // background
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, W, H);

  // header
  ctx.fillStyle = '#C8F03E';
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.fillText('Bolãochonete', 24, 38);
  ctx.fillStyle = '#888888';
  ctx.font = '13px Outfit, sans-serif';
  ctx.fillText('Classificação Geral', 24, 58);

  // col headers
  const cols = [
    { label: 'POS', x: 24, w: 36, align: 'center' },
    { label: 'PARTICIPANTE', x: 72, w: 200, align: 'left' },
    { label: 'PTS', x: 290, w: 60, align: 'center' },
    { label: 'EXATOS', x: 362, w: 60, align: 'center' },
    { label: 'PARC3', x: 432, w: 60, align: 'center' },
    { label: 'BÁSICO', x: 502, w: 60, align: 'center' },
    { label: 'BÔNUS', x: 572, w: 60, align: 'center' },
  ];
  ctx.fillStyle = '#555555';
  ctx.font = 'bold 10px Outfit, sans-serif';
  const colY = HEADER_H - 12;
  cols.forEach(c => {
    if (c.align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(c.label, c.x + c.w / 2, colY);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(c.label, c.x, colY);
    }
  });

  // separator
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, HEADER_H); ctx.lineTo(W, HEADER_H); ctx.stroke();

  const posColors = ['#ffd700', '#c0c0c0', '#cd7f32'];

  ranking.forEach((p, i) => {
    const y = HEADER_H + i * ROW_H;
    // row bg highlight (even)
    if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.012)'; ctx.fillRect(0, y, W, ROW_H); }

    const cy = y + ROW_H / 2;

    // position
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillStyle = posColors[i] || '#555555';
    ctx.fillText(String(i + 1), cols[0].x + cols[0].w / 2, cy + 6);

    // name
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillStyle = '#F5F5F0';
    const nameX = 72;
    ctx.fillText(p.name.length > 22 ? p.name.slice(0, 21) + '…' : p.name, nameX, cy + 2);
    if (p.champion_pick) {
      ctx.font = '10px Outfit, sans-serif';
      ctx.fillStyle = '#888888';
      ctx.fillText(p.champion_pick.length > 20 ? p.champion_pick.slice(0, 19) + '…' : p.champion_pick, nameX, cy + 16);
    }

    // total points
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillStyle = '#C8F03E';
    ctx.fillText(String(p.total_points), cols[2].x + cols[2].w / 2, cy + 7);

    // parciais
    const badges = [p.exact, p.partial3, p.partial1, p.bonus_points > 0 ? '+' + p.bonus_points : '—'];
    const badgeCols = [3, 4, 5, 6];
    const badgeColors = ['#22c55e', '#eab308', '#3b82f6', '#C8F03E'];
    badges.forEach((val, bi) => {
      const col = cols[badgeCols[bi]];
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillStyle = val === '—' ? '#555555' : badgeColors[bi];
      ctx.fillText(String(val), col.x + col.w / 2, cy + 6);
    });

    // row separator
    ctx.strokeStyle = '#1e1e1e';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y + ROW_H); ctx.lineTo(W, y + ROW_H); ctx.stroke();
  });

  // footer
  const fy = H - FOOTER_H / 2 + 4;
  ctx.textAlign = 'center';
  ctx.font = '10px Outfit, sans-serif';
  ctx.fillStyle = '#444444';
  ctx.fillText('bolãochonete.com.br', W / 2, fy);

  const link = document.createElement('a');
  link.download = 'classificacao-bolao.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export default function Classificacao() {
  const { api, user } = useAuth();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { api('/api/ranking').then(setRanking).finally(() => setLoading(false)); }, [api]);

  const handleExport = useCallback(() => {
    setExporting(true);
    setTimeout(() => { exportRankingImage(ranking); setExporting(false); }, 100);
  }, [ranking]);

  if (loading) return <div className="spinner" />;

  const posClass = ['p1','p2','p3'];

  return (
    <div className="fade-up">
      <div className="section-header">
        <h1 className="section-title">Classificação</h1>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'0.8rem', color:'var(--muted)' }}>{ranking.length} participantes</span>
          {ranking.length > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleExport}
              disabled={exporting}
              style={{ display:'flex', alignItems:'center', gap:'6px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {exporting ? 'Gerando…' : 'Exportar'}
            </button>
          )}
        </div>
      </div>

      {ranking.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'48px' }}>
          <p style={{ color:'var(--muted)' }}>Nenhum jogo finalizado ainda. A Copa começa em 11/06!</p>
        </div>
      ) : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
          <table className="rank-table" style={{ minWidth:'560px' }}>
            <thead>
              <tr>
                <th style={{ width:44 }}>#</th>
                <th>Participante</th>
                <th style={{ textAlign:'right' }}>Pontos</th>
                <th style={{ textAlign:'center' }}>Exatos</th>
                <th style={{ textAlign:'center' }}>Parcial 3</th>
                <th style={{ textAlign:'center' }}>Básico</th>
                <th style={{ textAlign:'center' }}>Bônus</th>
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
                  <td className="rank-pts">{p.total_points}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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
