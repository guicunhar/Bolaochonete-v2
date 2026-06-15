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
                {data.stats.totalBets} palpites registrados · {data.stats.totalFinished} jogos encerrados
              </div>
            </div>
          </div>

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
            {data.stats.favoriteScore && (
              <StatCard
                icon="🎲"
                label="Placar favorito"
                value={data.stats.favoriteScore}
                sub={`Chutou ${data.stats.favoriteScoreCount}x`}
                color="var(--blue)"
              />
            )}
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
              icon="🦅"
              label="O único"
              value={data.stats.theOnlyOne}
              sub="Foi o único a chutar esse vencedor"
              color="var(--red)"
            />
            <StatCard
              icon="💎"
              label="Palpite raro"
              value={data.stats.rareCount}
              sub="Placar chutado por menos de 3 pessoas"
              color="var(--yellow)"
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
                        Afinidade: <strong>{f.similarity}</strong> pts em {f.shared} jogos
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
