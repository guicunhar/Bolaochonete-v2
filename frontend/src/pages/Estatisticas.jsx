import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';

function api(path, token) {
  return fetch(path, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
}

function StatCard({ icon, label, value, sub, color = 'var(--lime)' }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value" style={{ color }}>{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="stats-section">
      <h3 className="stats-section-title">{title}</h3>
      <div className="stats-grid">{children}</div>
    </div>
  );
}

export default function Estatisticas() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/api/users/list', token).then(list => {
      setUsers(list);
      setSelectedId(user.id);
    });
  }, [token, user.id]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setData(null);
    setError(null);
    api(`/api/stats/${selectedId}`, token)
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError('Erro ao carregar estatísticas'))
      .finally(() => setLoading(false));
  }, [selectedId, token]);

  const selectedUser = users.find(u => u.id === selectedId);

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1 className="stats-title">Estatísticas</h1>
        <p className="stats-subtitle">Curiosidades e análises dos palpites do bolão</p>
      </div>

      {/* Seletor de usuário */}
      <div className="stats-user-selector">
        {users.map(u => (
          <button
            key={u.id}
            className={`stats-user-pill${selectedId === u.id ? ' active' : ''}`}
            onClick={() => setSelectedId(u.id)}
          >
            <Avatar src={u.avatar_path} name={u.name} size={24} />
            <span>{u.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}>
          <div className="spinner" />
        </div>
      )}

      {error && <p style={{ color: 'var(--red)', textAlign: 'center', marginTop: 40 }}>{error}</p>}

      {data && (
        <>
          {/* Cabeçalho do usuário */}
          <div className="stats-user-header">
            <Avatar src={data.user.avatar_path} name={data.user.name} size={48} />
            <div>
              <div className="stats-user-name">{data.user.name}</div>
              <div className="stats-user-meta">
                {data.stats.totalFinished} jogos palpitados já encerrados
              </div>
            </div>
          </div>

          <Section title="📊 Geral">
            <StatCard
              icon="✅"
              label="Aproveitamento"
              value={`${data.stats.aproveitamento}%`}
              sub="Jogos onde pontuou algo"
              color="var(--green)"
            />
            <StatCard
              icon="📈"
              label="Média por jogo"
              value={data.stats.avgPoints ?? '—'}
              sub="Pontos médios por jogo"
              color="var(--lime)"
            />
            <StatCard
              icon="⚡"
              label="Média últimas 5"
              value={data.stats.avg5Points ?? '—'}
              sub={Number(data.stats.avg5Points) > Number(data.stats.avgPoints) ? '↑ acima da média' : Number(data.stats.avg5Points) < Number(data.stats.avgPoints) ? '↓ abaixo da média' : '= na média'}
              color={Number(data.stats.avg5Points) > Number(data.stats.avgPoints) ? 'var(--green)' : Number(data.stats.avg5Points) < Number(data.stats.avgPoints) ? 'var(--red)' : 'var(--muted)'}
            />
            <StatCard
              icon="🏅"
              label="Diferença pro líder"
              value={data.stats.diffToLeader === 0 ? 'Líder!' : `${data.stats.diffToLeader} pts`}
              sub={data.stats.diffToLeader === 0 ? 'Você está em primeiro' : 'Para alcançar o líder'}
              color={data.stats.diffToLeader === 0 ? 'var(--lime)' : 'var(--muted)'}
            />
            <StatCard
              icon="⚽"
              label="Média de gols"
              value={data.stats.avgGoals ?? '—'}
              sub="Gols por partida chutada"
              color="var(--blue)"
            />
          </Section>

          <Section title="😬 Quase Lá">
            <StatCard
              icon="🎯"
              label="Errou por 1 gol"
              value={data.stats.missedByOneGoal}
              sub="Faltou só um gol pro placar exato"
              color="var(--yellow)"
            />
          </Section>

          <Section title="🦁 Coragem">
            <StatCard
              icon="🤝"
              label="Empates chutados"
              value={data.stats.drawsBet}
              sub="Apostou no equilíbrio"
            />
            <StatCard
              icon="💥"
              label="Palpites corajosos"
              value={data.stats.boldBets}
              sub="4+ gols na partida chutada"
            />
            <StatCard
              icon="⚡"
              label="Goleadas chutadas"
              value={data.stats.thrashingsBet}
              sub="Diferença de 3+ gols"
            />
            {data.stats.topScores?.length > 0 && data.stats.topScores.map((s, i) => (
              <StatCard
                key={s.score}
                icon={['🥇','🥈','🥉'][i]}
                label={i === 0 ? 'Placar favorito' : `Placar favorito #${i + 1}`}
                value={s.score}
                sub={`Chutou ${s.count}x`}
                color="var(--blue)"
              />
            ))}
          </Section>

          <Section title="🏴‍☠️ Rebelde">
            <StatCard
              icon="⚔️"
              label="Contra a maioria"
              value={data.stats.againstMajority}
              sub={`de ${data.stats.totalFinished} jogos`}
              color="var(--red)"
            />
            <StatCard
              icon="💎"
              label="Palpite raro"
              value={data.stats.theOnlyOne}
              sub="Único no bolão a chutar esse vencedor"
              color="var(--red)"
            />
            <StatCard
              icon="🐑"
              label="Seguidor"
              value={`${data.stats.followerPct}%`}
              sub="Concordou com a maioria do bolão"
              color="var(--muted)"
            />
          </Section>

          <Section title="📈 Histórico Pessoal">
            <StatCard
              icon="🔥"
              label="Melhor sequência"
              value={data.stats.bestStreak}
              sub="Jogos seguidos pontuando"
              color="var(--green)"
            />
            <StatCard
              icon="❄️"
              label="Pior sequência"
              value={data.stats.worstStreak}
              sub="Jogos seguidos sem pontuar"
              color="var(--red)"
            />
            {data.stats.favoriteTeam && (
              <StatCard
                icon="⭐"
                label="Time favorito"
                value={data.stats.favoriteTeam}
                sub={`${data.stats.favoriteTeamPoints} pts com esse time`}
                color="var(--lime)"
              />
            )}
            {data.stats.cursedTeam && (
              <StatCard
                icon="💀"
                label="Time maldito"
                value={data.stats.cursedTeam}
                sub={`Errou ${data.stats.cursedTeamMisses}x com esse time`}
                color="var(--red)"
              />
            )}
          </Section>

          {/* Pior amigo */}
          {data.worstFriends?.length > 0 && (
            <div className="stats-section">
              <h3 className="stats-section-title">😤 Pior Amigo do Bolão</h3>
              <p className="stats-section-desc">Top 3 pessoas com os palpites mais diferentes</p>
              <div className="stats-friends">
                {data.worstFriends.map((f, i) => (
                  <div key={f.id} className="stats-friend-card">
                    <div className="stats-friend-rank" style={{ color: 'var(--red)' }}>#{i + 1}</div>
                    <Avatar src={f.avatar_path} name={f.name} size={44} />
                    <div className="stats-friend-info">
                      <div className="stats-friend-name">{f.name}</div>
                      <div className="stats-friend-meta">{f.shared} jogos comparados</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedId(f.id)}>Ver stats</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabela por tipo de palpite */}
          {data.betTypeTable && (
            <div className="stats-section">
              <h3 className="stats-section-title">📋 Desempenho por Tipo de Palpite</h3>
              <p className="stats-section-desc">Baseado no que você chutou</p>
              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="bet-type-table">
                  <thead>
                    <tr>
                      <th>Tipo de palpite</th>
                      <th>Total</th>
                      <th style={{ color: 'var(--green)' }}>Exatos</th>
                      <th style={{ color: 'var(--yellow)' }}>Parc 3</th>
                      <th style={{ color: 'var(--blue)' }}>Básico</th>
                      <th style={{ color: 'var(--red)' }}>Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.betTypeTable.map(row => (
                      <tr key={row.key}>
                        <td className="bet-type-label">{row.label}</td>
                        <td>{row.total}</td>
                        <td style={{ color: 'var(--green)', fontWeight: 700 }}>{row.exatos || '—'}</td>
                        <td style={{ color: 'var(--yellow)', fontWeight: 700 }}>{row.parc3 || '—'}</td>
                        <td style={{ color: 'var(--blue)', fontWeight: 700 }}>{row.basico || '—'}</td>
                        <td style={{ color: 'var(--red)', fontWeight: 700 }}>{row.erro || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Melhor amigo */}
          {data.bestFriends.length > 0 && (
            <div className="stats-section">
              <h3 className="stats-section-title">🤝 Melhor Amigo do Bolão</h3>
              <p className="stats-section-desc">Top 3 pessoas com os palpites mais parecidos (placar idêntico vale mais)</p>
              <div className="stats-friends">
                {data.bestFriends.map((f, i) => (
                  <div key={f.id} className="stats-friend-card">
                    <div className="stats-friend-rank">#{i + 1}</div>
                    <Avatar src={f.avatar_path} name={f.name} size={44} />
                    <div className="stats-friend-info">
                      <div className="stats-friend-name">{f.name}</div>
                      <div className="stats-friend-meta">
                        {f.shared} jogos comparados
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSelectedId(f.id)}
                    >
                      Ver stats
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
