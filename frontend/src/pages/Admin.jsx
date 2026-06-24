import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';

const PHASES         = ['Grupos','Pré-Oitavas','Oitavas','Quartas','Semi','Terceiro Lugar','Final'];
const PHASE_KEYS     = ['Grupos','Pre-Oitavas','Oitavas','Quartas','Semi','Terceiro Lugar','Final'];
const KNOCKOUT_KEYS  = new Set(['Pre-Oitavas','Oitavas','Quartas','Semi','Terceiro Lugar','Final']);

const TEAMS = [
  // Grupo A
  'México','África do Sul','Coreia do Sul','Rep. Tcheca',
  // Grupo B
  'Canadá','Suíça','Catar','Bósnia',
  // Grupo C
  'Brasil','Marrocos','Escócia','Haiti',
  // Grupo D
  'Estados Unidos','Paraguai','Austrália','Turquia',
  // Grupo E
  'Alemanha','Curaçao','Costa do Marfim','Equador',
  // Grupo F
  'Países Baixos','Japão','Suécia','Tunísia',
  // Grupo G
  'Bélgica','Egito','Irã','Nova Zelândia',
  // Grupo H
  'Espanha','Uruguai','Arábia Saudita','Cabo Verde',
  // Grupo I
  'França','Senegal','Noruega','Iraque',
  // Grupo J
  'Argentina','Argélia','Áustria','Jordânia',
  // Grupo K
  'Portugal','Colômbia','Uzbequistão','RD Congo',
  // Grupo L
  'Inglaterra','Croácia','Gana','Panamá',
];

export default function Admin() {
  const { api, token } = useAuth();
  const [tab, setTab] = useState('jogos');
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [games, setGames] = useState([]);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState({});
  const [msgs, setMsgs] = useState({});
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name:'', username:'' });
  const [loading, setLoading] = useState(true);
  const [avatarUrlInput, setAvatarUrlInput] = useState({});
  const [savingAvatarUrl, setSavingAvatarUrl] = useState({});

  // Bonus state
  const [bonusResults, setBonusResults] = useState({ champion: '', vice: '' });
  const [bonusAwards, setBonusAwards] = useState([]);
  const [savingBonus, setSavingBonus] = useState({});
  const [bonusMsgs, setBonusMsgs] = useState({});

  const loadGames = async () => {
    const data = await api('/api/admin/games');
    setGames(data);
    const em = {};
    for (const g of data) em[g.id] = { ...g, home_score: g.home_score ?? '', away_score: g.away_score ?? '', penalty_winner: g.penalty_winner ?? '' };
    setEdits(em);
  };

  const loadUsers = async () => setUsers(await api('/api/admin/users'));

  const loadBonus = async () => {
    const [br, ba] = await Promise.all([
      api('/api/admin/bonus-results'),
      api('/api/admin/bonus-awards'),
    ]);
    setBonusResults({ champion: br.champion || '', vice: '' });
    setBonusAwards(ba);
  };

  useEffect(() => {
    Promise.all([loadGames(), loadUsers(), loadBonus()]).finally(() => setLoading(false));
  }, []);

  const setEdit = (id, k, v) => setEdits(e => ({ ...e, [id]: { ...e[id], [k]: v } }));

  const saveGame = async id => {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      await api(`/api/admin/games/${id}`, { method:'PUT', body: JSON.stringify(edits[id]) });
      setMsgs(m => ({ ...m, [id]: { t:'ok', text:'Salvo' } }));
      setTimeout(() => setMsgs(m => ({ ...m, [id]: null })), 1800);
      await loadGames();
    } catch(e) {
      setMsgs(m => ({ ...m, [id]: { t:'err', text: e.message } }));
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  };

  const deleteGame = async id => {
    if (!confirm('Deletar jogo e palpites relacionados?')) return;
    await api(`/api/admin/games/${id}`, { method:'DELETE' });
    await loadGames();
  };

  const phase = PHASE_KEYS[phaseIdx];

  const addGame = async () => {
    await api('/api/admin/games', { method:'POST', body: JSON.stringify({
      home_team:'A definir', home_flag:'', away_team:'A definir', away_flag:'',
      match_date:'2026-06-28', match_time:'16:00', phase
    })});
    await loadGames();
  };

  const createUser = async () => {
    if (!newUser.name || !newUser.username) return;
    try {
      await api('/api/admin/users', { method:'POST', body: JSON.stringify(newUser) });
      setNewUser({ name:'', username:'' });
      await loadUsers();
    } catch(e) { alert(e.message); }
  };

  const deleteUser = async id => {
    if (!confirm('Deletar usuário e todos seus palpites?')) return;
    await api(`/api/admin/users/${id}`, { method:'DELETE' });
    await loadUsers();
  };

  const saveAvatarUrl = async (userId) => {
    const url = avatarUrlInput[userId]?.trim();
    if (!url) return;
    setSavingAvatarUrl(s => ({ ...s, [userId]: true }));
    try {
      await api(`/api/admin/users/${userId}/avatar-url`, {
        method: 'POST',
        body: JSON.stringify({ avatar_url: url }),
      });
      await loadUsers();
      setAvatarUrlInput(a => ({ ...a, [userId]: '' }));
    } catch(e) { alert(e.message); }
    finally { setSavingAvatarUrl(s => ({ ...s, [userId]: false })); }
  };

  // ── Bonus helpers ─────────────────────────────────────────────────────────

  const saveChampion = async () => {
    setSavingBonus(s => ({ ...s, champion: true }));
    try {
      await api('/api/admin/bonus-results/champion', { method:'PUT', body: JSON.stringify({ champion: bonusResults.champion }) });
      await loadBonus();
      setBonusMsgs(m => ({ ...m, champion: { t:'ok', text:'Campeã salva! Pontos distribuídos.' } }));
      setTimeout(() => setBonusMsgs(m => ({ ...m, champion: null })), 2500);
    } catch(e) {
      setBonusMsgs(m => ({ ...m, champion: { t:'err', text: e.message } }));
    } finally { setSavingBonus(s => ({ ...s, champion: false })); }
  };

  const saveVice = async () => {
    setSavingBonus(s => ({ ...s, vice: true }));
    try {
      await api('/api/admin/bonus-results/vice', { method:'PUT', body: JSON.stringify({ vice: bonusResults.vice }) });
      await loadBonus();
      setBonusMsgs(m => ({ ...m, vice: { t:'ok', text:'Vice salva! Pontos distribuídos.' } }));
      setTimeout(() => setBonusMsgs(m => ({ ...m, vice: null })), 2500);
    } catch(e) {
      setBonusMsgs(m => ({ ...m, vice: { t:'err', text: e.message } }));
    } finally { setSavingBonus(s => ({ ...s, vice: false })); }
  };

  const hasAward = (userId, type) => bonusAwards.some(a => a.user_id === userId && a.award_type === type);

  const toggleAward = async (userId, awardType, points) => {
    const already = hasAward(userId, awardType);
    const key = `${userId}_${awardType}`;
    setSavingBonus(s => ({ ...s, [key]: true }));
    try {
      await api('/api/admin/bonus-awards', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, award_type: awardType, points, remove: already })
      });
      await loadBonus();
    } catch(e) { alert(e.message); }
    finally { setSavingBonus(s => ({ ...s, [key]: false })); }
  };

  // Champion auto-award status per user
  const getChampionStatus = (user) => {
    if (hasAward(user.id, 'champion')) return { pts: 50, label: '🥇 Campeã (+50)' };
    if (hasAward(user.id, 'champion_vice')) return { pts: 25, label: '🥈 Vice (+25)' };
    return null;
  };

  const phaseGames = games.filter(g => g.phase === phase);
  const activeUsers = users.filter(u => !u.is_admin && !u.is_precadastro);

  if (loading) return <div className="spinner" />;

  return (
    <div className="fade-up">
      <h1 className="section-title" style={{ marginBottom:'20px' }}>Admin</h1>

      {/* Main tabs */}
      <div className="tabs">
        <button className={`tab${tab==='jogos'?' active':''}`} onClick={() => setTab('jogos')}>Jogos</button>
        <button className={`tab${tab==='users'?' active':''}`} onClick={() => setTab('users')}>Participantes</button>
        <button className={`tab${tab==='bonus'?' active':''}`} onClick={() => setTab('bonus')}>🏆 Palpites Bônus</button>
      </div>

      {/* ── JOGOS ─────────────────────────────────────── */}
      {tab === 'jogos' && (
        <div>
          <div className="tabs">
            {PHASES.map((p, i) => (
              <button key={p} className={`tab${phaseIdx===i?' active':''}`} onClick={() => setPhaseIdx(i)}>{p}</button>
            ))}
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'10px' }}>
            <button className="btn btn-lime btn-sm" onClick={addGame}>+ Novo jogo</button>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th><th>Grp</th><th>Time Casa</th><th>Flag</th>
                  <th>Time Fora</th><th>Flag</th><th>Data</th><th>Hora</th>
                  <th style={{ background:'rgba(200,240,62,0.08)' }}>Gols Casa</th>
                  <th style={{ background:'rgba(200,240,62,0.08)' }}>Gols Fora</th>
                  {KNOCKOUT_KEYS.has(phase) && <th style={{ background:'rgba(200,240,62,0.08)' }}>Classificado (pên.)</th>}
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {phaseGames.map(game => {
                  const e = edits[game.id] || {};
                  const m = msgs[game.id];
                  return (
                    <tr key={game.id}>
                      <td><input className="admin-input" style={{ width:44 }} value={e.match_number||''} onChange={ev => setEdit(game.id,'match_number',ev.target.value)} /></td>
                      <td><input className="admin-input" style={{ width:36 }} value={e.group_name||''} onChange={ev => setEdit(game.id,'group_name',ev.target.value)} placeholder="A" /></td>
                      <td><input className="admin-input" style={{ width:110 }} value={e.home_team||''} onChange={ev => setEdit(game.id,'home_team',ev.target.value)} /></td>
                      <td><input className="admin-input" style={{ width:50 }} value={e.home_flag||''} onChange={ev => setEdit(game.id,'home_flag',ev.target.value)} placeholder="BR" /></td>
                      <td><input className="admin-input" style={{ width:110 }} value={e.away_team||''} onChange={ev => setEdit(game.id,'away_team',ev.target.value)} /></td>
                      <td><input className="admin-input" style={{ width:50 }} value={e.away_flag||''} onChange={ev => setEdit(game.id,'away_flag',ev.target.value)} placeholder="AR" /></td>
                      <td><input className="admin-input" type="date" style={{ width:128 }} value={e.match_date||''} onChange={ev => setEdit(game.id,'match_date',ev.target.value)} /></td>
                      <td><input className="admin-input" type="time" style={{ width:80 }} value={e.match_time||''} onChange={ev => setEdit(game.id,'match_time',ev.target.value)} /></td>
                      <td style={{ background:'rgba(200,240,62,0.04)' }}>
                        <input className="admin-input" type="number" min="0" style={{ width:52, textAlign:'center', fontWeight:700 }} value={e.home_score} onChange={ev => setEdit(game.id,'home_score',ev.target.value)} placeholder="-" />
                      </td>
                      <td style={{ background:'rgba(200,240,62,0.04)' }}>
                        <input className="admin-input" type="number" min="0" style={{ width:52, textAlign:'center', fontWeight:700 }} value={e.away_score} onChange={ev => setEdit(game.id,'away_score',ev.target.value)} placeholder="-" />
                      </td>
                      {KNOCKOUT_KEYS.has(phase) && (
                        <td style={{ background:'rgba(200,240,62,0.04)' }}>
                          <select
                            className="admin-input"
                            style={{ width:120, fontSize:'0.75rem' }}
                            value={e.penalty_winner || ''}
                            onChange={ev => setEdit(game.id,'penalty_winner',ev.target.value)}
                          >
                            <option value="">— sem pên. —</option>
                            <option value="home">Casa</option>
                            <option value="away">Fora</option>
                          </select>
                        </td>
                      )}
                      <td>
                        <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
                          <button className="btn btn-lime btn-sm" onClick={() => saveGame(game.id)} disabled={saving[game.id]}>
                            {saving[game.id] ? '...' : 'Salvar'}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteGame(game.id)}>Del</button>
                          {m && <span style={{ fontSize:'0.7rem', color: m.t==='ok' ? 'var(--green)' : 'var(--red)' }}>{m.text}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {phaseGames.length === 0 && (
            <div className="card" style={{ textAlign:'center', padding:'32px', marginTop:'10px' }}>
              <p style={{ color:'var(--muted)' }}>Nenhum jogo nesta fase. Clique em "+ Novo jogo".</p>
            </div>
          )}

          <div style={{ marginTop:'14px', padding:'12px 14px', background:'rgba(200,240,62,0.04)', border:'1px solid rgba(200,240,62,0.1)', borderRadius:'var(--radius-sm)', fontSize:'0.75rem', color:'var(--muted)', lineHeight:1.7 }}>
            <strong style={{ color:'var(--lime)' }}>Flags:</strong> use códigos ISO 3166-1 em maiúsculo.<br/>
            Exemplos: BR, AR, FR, DE, ES, PT, IT, NL, BE, HR, CH, JP, MX, US, CA, SN, MA, UY, CO, CL, AU, PE, NG, EC, KR, PL, CZ, HN, SK, TH, TR, CN, IR, TN, GE, PA, EG, NZ, BY, KG, CM, TZ, AF, CR, VE, SA
          </div>
        </div>
      )}

      {/* ── PARTICIPANTES ──────────────────────────────── */}
      {tab === 'users' && (
        <div>
          <div className="card" style={{ marginBottom:'16px' }}>
            <h3 style={{ fontSize:'0.9rem', fontWeight:700, marginBottom:'12px' }}>Adicionar participante</h3>
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end' }}>
              <div style={{ flex:1, minWidth:140 }}>
                <label className="label">Nome</label>
                <input className="input" value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div style={{ flex:1, minWidth:120 }}>
                <label className="label">Usuário (login)</label>
                <input className="input" value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} placeholder="sem espaços" />
              </div>
              <button className="btn btn-lime" onClick={createUser}>Adicionar</button>
            </div>
            <p style={{ color:'var(--muted)', fontSize:'0.75rem', marginTop:'8px' }}>
              O participante usa o login para ativar a conta e definir a senha no primeiro acesso.
            </p>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {users.filter(u => !u.is_admin).map(u => (
              <div key={u.id} className="card card-sm" style={{ display:'flex', gap:'14px', alignItems:'center' }}>
                <div style={{ flexShrink:0 }}>
                  <Avatar src={u.avatar_path} name={u.name} size={44} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{u.name}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--muted)', marginTop:'2px' }}>
                    @{u.username} •{' '}
                    {u.is_precadastro ? <span style={{ color:'var(--yellow)' }}>Aguardando ativação</span> : <span style={{ color:'var(--green)' }}>Ativo</span>}
                  </div>
                  {!u.is_precadastro && (
                    <div style={{ fontSize:'0.7rem', color:'var(--muted)', marginTop:'4px', display:'flex', gap:'12px', flexWrap:'wrap' }}>
                      {u.champion_pick && <span>Campeã: <strong style={{ color:'var(--white)' }}>{u.champion_pick}</strong></span>}
                      {u.best_player_pick && <span>Melhor: <strong style={{ color:'var(--white)' }}>{u.best_player_pick}</strong></span>}
                      {u.top_scorer_pick && <span>Artilheiro: <strong style={{ color:'var(--white)' }}>{u.top_scorer_pick}</strong></span>}
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'4px', alignItems:'flex-end', flexShrink:0 }}>
                  <div style={{ display:'flex', gap:'4px' }}>
                    <input
                      className="admin-input"
                      style={{ width:180, fontSize:'0.72rem' }}
                      placeholder="URL da foto..."
                      value={avatarUrlInput[u.id] || ''}
                      onChange={e => setAvatarUrlInput(a => ({ ...a, [u.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && saveAvatarUrl(u.id)}
                    />
                    <button
                      className="btn btn-dark btn-sm"
                      onClick={() => saveAvatarUrl(u.id)}
                      disabled={savingAvatarUrl[u.id]}
                    >
                      {savingAvatarUrl[u.id] ? '...' : '💾'}
                    </button>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>Remover</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PALPITES BÔNUS ────────────────────────────── */}
      {tab === 'bonus' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

          {/* ── Campeã ── */}
          <div className="card">
            <h2 style={{ fontSize:'1rem', fontWeight:700, marginBottom:'4px' }}>🏆 Seleção Campeã</h2>
            <p style={{ fontSize:'0.75rem', color:'var(--muted)', marginBottom:'14px' }}>
              Defina a campeã e o sistema distribui +50 pts para quem acertou automaticamente. Você também pode definir a vice (+25 pts).
            </p>

            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end', marginBottom:'10px' }}>
              <div style={{ flex:1, minWidth:160 }}>
                <label className="label">Seleção Campeã</label>
                <select className="input" value={bonusResults.champion} onChange={e => setBonusResults(b => ({ ...b, champion: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button className="btn btn-lime" onClick={saveChampion} disabled={savingBonus.champion}>
                {savingBonus.champion ? 'Salvando...' : 'Confirmar Campeã'}
              </button>
            </div>

            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end', marginBottom:'10px' }}>
              <div style={{ flex:1, minWidth:160 }}>
                <label className="label">Seleção Vice-campeã (+25 pts)</label>
                <select className="input" value={bonusResults.vice || ''} onChange={e => setBonusResults(b => ({ ...b, vice: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button className="btn btn-dark" onClick={saveVice} disabled={savingBonus.vice}>
                {savingBonus.vice ? 'Salvando...' : 'Confirmar Vice'}
              </button>
            </div>

            {bonusMsgs.champion && (
              <div className={`alert alert-${bonusMsgs.champion.t === 'ok' ? 'success' : 'error'}`} style={{ marginBottom:0 }}>
                {bonusMsgs.champion.text}
              </div>
            )}
            {bonusMsgs.vice && (
              <div className={`alert alert-${bonusMsgs.vice.t === 'ok' ? 'success' : 'error'}`} style={{ marginBottom:0 }}>
                {bonusMsgs.vice.text}
              </div>
            )}

            {/* Champion pick overview */}
            {activeUsers.length > 0 && (
              <div style={{ marginTop:'16px' }}>
                <div style={{ fontSize:'0.72rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:'8px' }}>
                  Palpites dos participantes
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  {activeUsers.map(u => {
                    const status = getChampionStatus(u);
                    return (
                      <div key={u.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'var(--card2)', borderRadius:'var(--radius-sm)' }}>
                        <Avatar src={u.avatar_path} name={u.name} size={28} />
                        <span style={{ flex:1, fontSize:'0.85rem', fontWeight:500 }}>{u.name}</span>
                        <span style={{ fontSize:'0.8rem', color: u.champion_pick ? 'var(--white)' : 'var(--muted)' }}>
                          {u.champion_pick || '—'}
                        </span>
                        {status ? (
                          <span style={{ fontSize:'0.72rem', padding:'2px 8px', borderRadius:'12px', background:'rgba(200,240,62,0.12)', color:'var(--lime)', fontWeight:700, whiteSpace:'nowrap' }}>
                            {status.label}
                          </span>
                        ) : (
                          <span style={{ fontSize:'0.72rem', color:'var(--muted2)', minWidth:'80px', textAlign:'right' }}>sem pontos</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Melhor Jogador ── */}
          <BonusPickPanel
            title="⭐ Melhor Jogador"
            subtitle="Marque quem acertou o Melhor Jogador da Copa (Bola de Ouro da FIFA). +25 pts exato, sem opção de parcial."
            users={activeUsers}
            pickField="best_player_pick"
            awardType="best_player"
            awardPoints={25}
            hasAward={hasAward}
            toggleAward={toggleAward}
            savingBonus={savingBonus}
          />

          {/* ── Artilheiro ── */}
          <BonusPickPanel
            title="👟 Artilheiro"
            subtitle="Marque quem acertou o Artilheiro da Copa. +20 pts (acerto exato) ou +10 pts (desempate)."
            users={activeUsers}
            pickField="top_scorer_pick"
            awardType="top_scorer"
            awardPoints={20}
            partialAwardType="top_scorer_partial"
            partialAwardPoints={10}
            partialLabel="+10 desempate"
            hasAward={hasAward}
            toggleAward={toggleAward}
            savingBonus={savingBonus}
          />

        </div>
      )}
    </div>
  );
}

// ── Sub-component: BonusPickPanel ─────────────────────────────────────────────
function BonusPickPanel({ title, subtitle, users, pickField, awardType, awardPoints, partialAwardType, partialAwardPoints, partialLabel, hasAward, toggleAward, savingBonus }) {
  return (
    <div className="card">
      <h2 style={{ fontSize:'1rem', fontWeight:700, marginBottom:'4px' }}>{title}</h2>
      <p style={{ fontSize:'0.75rem', color:'var(--muted)', marginBottom:'14px' }}>{subtitle}</p>

      {users.length === 0 && (
        <p style={{ color:'var(--muted)', fontSize:'0.82rem' }}>Nenhum participante ativo ainda.</p>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
        {users.map(u => {
          const pick = u[pickField];
          const exactKey = `${u.id}_${awardType}`;
          const partialKey = partialAwardType ? `${u.id}_${partialAwardType}` : null;
          const isExact = hasAward(u.id, awardType);
          const isPartial = partialAwardType ? hasAward(u.id, partialAwardType) : false;

          return (
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', background:'var(--card2)', borderRadius:'var(--radius-sm)', flexWrap:'wrap' }}>
              <Avatar src={u.avatar_path} name={u.name} size={30} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'0.85rem', fontWeight:600 }}>{u.name}</div>
                {pick ? (
                  <div style={{ fontSize:'0.75rem', color:'var(--muted)', marginTop:'1px' }}>"{pick}"</div>
                ) : (
                  <div style={{ fontSize:'0.75rem', color:'var(--muted2)', marginTop:'1px', fontStyle:'italic' }}>sem palpite</div>
                )}
              </div>

              {/* Exact award toggle */}
              <button
                onClick={() => toggleAward(u.id, awardType, awardPoints)}
                disabled={savingBonus[exactKey] || (partialAwardType && isPartial)}
                style={{
                  padding:'5px 12px',
                  borderRadius:'var(--radius-sm)',
                  fontSize:'0.75rem',
                  fontWeight:700,
                  border: isExact ? '1px solid rgba(34,197,94,0.4)' : '1px solid var(--border2)',
                  background: isExact ? 'rgba(34,197,94,0.15)' : 'var(--card)',
                  color: isExact ? 'var(--green)' : 'var(--muted)',
                  cursor: (partialAwardType && isPartial) ? 'not-allowed' : 'pointer',
                  opacity: (partialAwardType && isPartial) ? 0.4 : 1,
                  transition:'all 0.15s',
                  whiteSpace:'nowrap',
                }}
              >
                {savingBonus[exactKey] ? '...' : isExact ? `✓ +${awardPoints} pts` : `+${awardPoints} pts`}
              </button>

              {/* Partial award toggle (only for top_scorer) */}
              {partialAwardType && (
                <button
                  onClick={() => toggleAward(u.id, partialAwardType, partialAwardPoints)}
                  disabled={savingBonus[partialKey] || isExact}
                  style={{
                    padding:'5px 12px',
                    borderRadius:'var(--radius-sm)',
                    fontSize:'0.75rem',
                    fontWeight:700,
                    border: isPartial ? '1px solid rgba(234,179,8,0.4)' : '1px solid var(--border2)',
                    background: isPartial ? 'rgba(234,179,8,0.12)' : 'var(--card)',
                    color: isPartial ? 'var(--yellow)' : 'var(--muted)',
                    cursor: isExact ? 'not-allowed' : 'pointer',
                    opacity: isExact ? 0.4 : 1,
                    transition:'all 0.15s',
                    whiteSpace:'nowrap',
                  }}
                >
                  {savingBonus[partialKey] ? '...' : isPartial ? `✓ ${partialLabel}` : partialLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
