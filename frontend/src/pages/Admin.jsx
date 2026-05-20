import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const PHASES = ['Grupos', 'Oitavas', 'Quartas', 'Semi', 'Terceiro', 'Final'];

export default function Admin() {
  const { apiCall } = useAuth();
  const [games, setGames] = useState([]);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState({});
  const [msg, setMsg] = useState({});
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('Grupos');
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('jogos');

  const loadGames = async () => {
    const data = await apiCall('/api/admin/games');
    setGames(data);
    const editMap = {};
    for (const g of data) {
      editMap[g.id] = { ...g, home_score: g.home_score ?? '', away_score: g.away_score ?? '' };
    }
    setEdits(editMap);
    setLoading(false);
  };

  const loadUsers = async () => {
    const data = await apiCall('/api/admin/users');
    setUsers(data);
  };

  useEffect(() => {
    loadGames();
    loadUsers();
  }, []);

  const setEdit = (id, key, val) => {
    setEdits(e => ({ ...e, [id]: { ...e[id], [key]: val } }));
  };

  const saveGame = async (id) => {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      await apiCall(`/api/admin/games/${id}`, {
        method: 'PUT',
        body: JSON.stringify(edits[id]),
      });
      setMsg(m => ({ ...m, [id]: { type: 'success', text: '✓ Salvo' } }));
      setTimeout(() => setMsg(m => ({ ...m, [id]: null })), 2000);
      await loadGames();
    } catch (e) {
      setMsg(m => ({ ...m, [id]: { type: 'error', text: e.message } }));
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  };

  const deleteGame = async (id) => {
    if (!confirm('Deletar este jogo e todos os palpites relacionados?')) return;
    try {
      await apiCall(`/api/admin/games/${id}`, { method: 'DELETE' });
      await loadGames();
    } catch (e) {
      alert(e.message);
    }
  };

  const addGame = async () => {
    try {
      await apiCall('/api/admin/games', {
        method: 'POST',
        body: JSON.stringify({
          home_team: 'Time A', home_flag: '🏳️',
          away_team: 'Time B', away_flag: '🏳️',
          match_date: '2026-07-01', match_time: '16:00',
          phase: phase, group_name: null, venue: 'A definir',
        }),
      });
      await loadGames();
    } catch (e) {
      alert(e.message);
    }
  };

  const phaseGames = games.filter(g => g.phase === phase);

  if (loading) return <div className="spinner" />;

  return (
    <div className="fade-in">
      <h1 className="section-title">🔧 Painel Admin</h1>

      <div className="tabs" style={{ marginBottom: '24px' }}>
        <button className={`tab${tab === 'jogos' ? ' active' : ''}`} onClick={() => setTab('jogos')}>⚽ Jogos</button>
        <button className={`tab${tab === 'users' ? ' active' : ''}`} onClick={() => setTab('users')}>👥 Participantes</button>
      </div>

      {tab === 'jogos' && (
        <>
          <div className="tabs">
            {PHASES.map(p => (
              <button key={p} className={`tab${phase === p ? ' active' : ''}`} onClick={() => setPhase(p)}>
                {p}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button className="btn btn-gold btn-sm" onClick={addGame}>+ Novo Jogo</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Grupo</th>
                  <th>Time Casa</th>
                  <th>Bandeira</th>
                  <th>Time Fora</th>
                  <th>Bandeira</th>
                  <th>Data</th>
                  <th>Hora</th>
                  <th>Local</th>
                  <th style={{ background: 'rgba(0,168,107,0.15)', textAlign: 'center' }}>Gols Casa</th>
                  <th style={{ background: 'rgba(0,168,107,0.15)', textAlign: 'center' }}>Gols Fora</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {phaseGames.map(game => {
                  const e = edits[game.id] || {};
                  const m = msg[game.id];
                  return (
                    <tr key={game.id}>
                      <td>
                        <input className="admin-input" style={{ width: '50px' }} value={e.match_number || ''} onChange={ev => setEdit(game.id, 'match_number', ev.target.value)} />
                      </td>
                      <td>
                        <input className="admin-input" style={{ width: '50px' }} value={e.group_name || ''} onChange={ev => setEdit(game.id, 'group_name', ev.target.value)} placeholder="A" />
                      </td>
                      <td>
                        <input className="admin-input" style={{ width: '120px' }} value={e.home_team || ''} onChange={ev => setEdit(game.id, 'home_team', ev.target.value)} />
                      </td>
                      <td>
                        <input className="admin-input" style={{ width: '60px', textAlign: 'center', fontSize: '1.2rem' }} value={e.home_flag || ''} onChange={ev => setEdit(game.id, 'home_flag', ev.target.value)} />
                      </td>
                      <td>
                        <input className="admin-input" style={{ width: '120px' }} value={e.away_team || ''} onChange={ev => setEdit(game.id, 'away_team', ev.target.value)} />
                      </td>
                      <td>
                        <input className="admin-input" style={{ width: '60px', textAlign: 'center', fontSize: '1.2rem' }} value={e.away_flag || ''} onChange={ev => setEdit(game.id, 'away_flag', ev.target.value)} />
                      </td>
                      <td>
                        <input className="admin-input" type="date" style={{ width: '130px' }} value={e.match_date || ''} onChange={ev => setEdit(game.id, 'match_date', ev.target.value)} />
                      </td>
                      <td>
                        <input className="admin-input" type="time" style={{ width: '90px' }} value={e.match_time || ''} onChange={ev => setEdit(game.id, 'match_time', ev.target.value)} />
                      </td>
                      <td>
                        <input className="admin-input" style={{ width: '140px' }} value={e.venue || ''} onChange={ev => setEdit(game.id, 'venue', ev.target.value)} />
                      </td>
                      <td style={{ background: 'rgba(0,168,107,0.06)', textAlign: 'center' }}>
                        <input
                          className="admin-input"
                          style={{ width: '55px', textAlign: 'center', fontWeight: 700 }}
                          type="number"
                          min="0"
                          value={e.home_score}
                          onChange={ev => setEdit(game.id, 'home_score', ev.target.value)}
                          placeholder="–"
                        />
                      </td>
                      <td style={{ background: 'rgba(0,168,107,0.06)', textAlign: 'center' }}>
                        <input
                          className="admin-input"
                          style={{ width: '55px', textAlign: 'center', fontWeight: 700 }}
                          type="number"
                          min="0"
                          value={e.away_score}
                          onChange={ev => setEdit(game.id, 'away_score', ev.target.value)}
                          placeholder="–"
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            className="btn btn-gold btn-sm"
                            onClick={() => saveGame(game.id)}
                            disabled={saving[game.id]}
                          >
                            {saving[game.id] ? '...' : '💾'}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteGame(game.id)}>🗑️</button>
                          {m && <span style={{ fontSize: '0.75rem', color: m.type === 'success' ? '#4ade80' : '#f87171' }}>{m.text}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {phaseGames.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '40px', marginTop: '12px' }}>
              <p style={{ color: 'var(--text-dim)' }}>Nenhum jogo nesta fase. Clique em "+ Novo Jogo" para adicionar.</p>
            </div>
          )}
        </>
      )}

      {tab === 'users' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Usuário</th>
                <th>Campeã</th>
                <th>Melhor Jogador</th>
                <th>Artilheiro</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => !u.is_admin).map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.name}</td>
                  <td style={{ color: 'var(--text-dim)' }}>@{u.username}</td>
                  <td>{u.champion_pick || '—'}</td>
                  <td>{u.best_player_pick || '—'}</td>
                  <td>{u.top_scorer_pick || '—'}</td>
                  <td style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
