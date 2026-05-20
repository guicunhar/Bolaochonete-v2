import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';

const PHASES = ['Grupos','Pré-Oitavas','Oitavas','Quartas','Semi','Terceiro Lugar','Final'];

export default function Admin() {
  const { api, token } = useAuth();
  const [tab, setTab] = useState('jogos');
  const [phase, setPhase] = useState('Grupos');
  const [games, setGames] = useState([]);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState({});
  const [msgs, setMsgs] = useState({});
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name:'', username:'' });
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState({});

  const loadGames = async () => {
    const data = await api('/api/admin/games');
    setGames(data);
    const em = {};
    for (const g of data) em[g.id] = { ...g, home_score: g.home_score ?? '', away_score: g.away_score ?? '' };
    setEdits(em);
  };
  const loadUsers = async () => setUsers(await api('/api/admin/users'));

  useEffect(() => {
    Promise.all([loadGames(), loadUsers()]).finally(() => setLoading(false));
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
    } finally { setSaving(s => ({ ...s, [id]: false })); }
  };

  const deleteGame = async id => {
    if (!confirm('Deletar jogo e palpites?')) return;
    await api(`/api/admin/games/${id}`, { method:'DELETE' });
    await loadGames();
  };

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

  const uploadAvatar = async (userId, file) => {
    setUploadingAvatar(u => ({ ...u, [userId]: true }));
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await fetch(`/api/admin/users/${userId}/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error('Falha no upload');
      await loadUsers();
    } catch(e) { alert(e.message); }
    finally { setUploadingAvatar(u => ({ ...u, [userId]: false })); }
  };

  const phaseGames = games.filter(g => g.phase === phase);
  if (loading) return <div className="spinner" />;

  return (
    <div className="fade-up">
      <h1 className="section-title" style={{ marginBottom:'20px' }}>Admin</h1>

      <div className="tabs">
        <button className={`tab${tab==='jogos'?' active':''}`} onClick={() => setTab('jogos')}>Jogos</button>
        <button className={`tab${tab==='users'?' active':''}`} onClick={() => setTab('users')}>Participantes</button>
      </div>

      {tab === 'jogos' && (
        <>
          <div className="tabs">
            {PHASES.map((p, i) => <button key={p} className={`tab${phase===PHASE_KEYS[i]?' active':''}`} onClick={() => setPhase(PHASE_KEYS[i])}>{p}</button>)}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'10px' }}>
            <button className="btn btn-lime btn-sm" onClick={addGame}>+ Novo jogo</button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th><th>Grp</th>
                  <th>Time Casa</th><th>Flag</th>
                  <th>Time Fora</th><th>Flag</th>
                  <th>Data</th><th>Hora</th>
                  <th style={{ background:'rgba(200,240,62,0.08)' }}>Gols Casa</th>
                  <th style={{ background:'rgba(200,240,62,0.08)' }}>Gols Fora</th>
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
                      <td>
                        <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
                          <button className="btn btn-lime btn-sm" onClick={() => saveGame(game.id)} disabled={saving[game.id]}>
                            {saving[game.id] ? '...' : 'Salvar'}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteGame(game.id)}>Del</button>
                          {m && <span style={{ fontSize:'0.7rem', color: m.t==='ok'?'var(--green)':'var(--red)' }}>{m.text}</span>}
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
          <div style={{ marginTop:'14px', padding:'12px 14px', background:'rgba(200,240,62,0.04)', border:'1px solid rgba(200,240,62,0.1)', borderRadius:'var(--radius-sm)', fontSize:'0.75rem', color:'var(--muted)' }}>
            <strong style={{ color:'var(--lime)' }}>Flags:</strong> use códigos ISO 3166-1 em maiúsculo. Ex: BR, AR, FR, DE, ES, PT, IT, GB-ENG, NL, BE, HR, CH, JP, MX, US, CA, SN, MA, UY, CO, CL, AU, PE, NG, EC, KR, PL, CZ, HN, SK, TH, TR, CN, IR, TN, GE, PA, UY, EG, NZ, BY, KG, CM, TZ, TH, AF, CR, VE, UY, SA
          </div>
        </>
      )}

      {tab === 'users' && (
        <>
          {/* Add user */}
          <div className="card" style={{ marginBottom:'16px' }}>
            <h3 style={{ fontSize:'0.9rem', fontWeight:700, marginBottom:'12px' }}>Adicionar participante</h3>
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end' }}>
              <div style={{ flex:1, minWidth:140 }}>
                <label className="label">Nome</label>
                <input className="input" value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div style={{ flex:1, minWidth:120 }}>
                <label className="label">Usuario (login)</label>
                <input className="input" value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} placeholder="sem espacos" />
              </div>
              <button className="btn btn-lime" onClick={createUser}>Adicionar</button>
            </div>
            <p style={{ color:'var(--muted)', fontSize:'0.75rem', marginTop:'8px' }}>
              O participante usa o login para ativar a conta e definir a senha no primeiro acesso.
            </p>
          </div>

          {/* User list */}
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {users.filter(u => !u.is_admin).map(u => (
              <div key={u.id} className="card card-sm" style={{ display:'flex', gap:'14px', alignItems:'center' }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <Avatar src={u.avatar_path} name={u.name} size={44} />
                  <label style={{
                    position:'absolute', bottom:-2, right:-2,
                    width:18, height:18, borderRadius:'50%',
                    background:'var(--lime)', cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.6rem', color:'var(--black)', fontWeight:700
                  }}>
                    {uploadingAvatar[u.id] ? '...' : '+'}
                    <input type="file" accept="image/*" style={{ display:'none' }}
                      onChange={e => e.target.files[0] && uploadAvatar(u.id, e.target.files[0])} />
                  </label>
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{u.name}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--muted)', marginTop:'2px' }}>
                    @{u.username} •{' '}
                    {u.is_precadastro
                      ? <span style={{ color:'var(--yellow)' }}>Aguardando ativação</span>
                      : <span style={{ color:'var(--green)' }}>Ativo</span>}
                  </div>
                  {!u.is_precadastro && (
                    <div style={{ fontSize:'0.7rem', color:'var(--muted)', marginTop:'4px', display:'flex', gap:'12px' }}>
                      {u.champion_pick && <span>Campea: {u.champion_pick}</span>}
                      {u.best_player_pick && <span>Melhor: {u.best_player_pick}</span>}
                      {u.top_scorer_pick && <span>Artilheiro: {u.top_scorer_pick}</span>}
                    </div>
                  )}
                </div>

                <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>Remover</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
