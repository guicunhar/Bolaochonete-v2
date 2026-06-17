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

function Section({ title, desc, children }) {
  return (
    <div className="stats-section">
      <h3 className="stats-section-title">{title}</h3>
      {desc && <p className="stats-section-desc">{desc}</p>}
      <div className="stats-grid">{children}</div>
    </div>
  );
}

function RankingTable({ rows, valueKey, valueLabel, emptyMsg }) {
  if (!rows || rows.length === 0) return <p className="stats-empty">{emptyMsg || 'Sem dados ainda'}</p>;
  return (
    <div className="ranking-table">
      {rows.map((u, i) => (
        <div key={u.id} className="ranking-row">
          <span className="ranking-pos" style={{ color: i === 0 ? 'var(--lime)' : i === 1 ? 'var(--yellow)' : i === 2 ? 'var(--orange, #f97316)' : 'var(--muted)' }}>
            #{i + 1}
          </span>
          <Avatar src={u.avatar_path} name={u.name} size={28} />
          <span className="ranking-name">{u.name.split(' ')[0]}</span>
          <span className="ranking-value">{u[valueKey] ?? 0} {valueLabel}</span>
        </div>
      ))}
    </div>
  );
}

function PhaseBadge({ label, active, onClick }) {
  return (
    <button
      className={`phase-badge${active ? ' active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function Estatisticas() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [rankingData, setRankingData] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [lastNFilter, setLastNFilter] = useState(5);
  const [faseFilter, setFaseFilter] = useState('fase1');

  useEffect(() => {
    api('/api/users/list', token).then(list => {
      setUsers(list);
      setSelectedId(user.id);
    });
  }, [token, user.id]);

  function handleSelectRanking() {
    setShowRanking(true);
    setSelectedId(null);
    setData(null);
    if (!rankingData) {
      setRankingLoading(true);
      api('/api/stats/ranking', token)
        .then(d => setRankingData(d))
        .finally(() => setRankingLoading(false));
    }
  }

  function handleSelectUser(id) {
    setShowRanking(false);
    setSelectedId(id);
  }

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

  const faseLabels = { fase1: '1ª Fase (J1–24)', fase2: '2ª Fase (J25–48)', fase3: '3ª Fase (J49–72)', mataMata: 'Mata-Mata' };

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
            onClick={() => handleSelectUser(u.id)}
          >
            <Avatar src={u.avatar_path} name={u.name} size={24} />
            <span>{u.name.split(' ')[0]}</span>
          </button>
        ))}
        <button
          className={`stats-user-pill stats-user-pill--ranking${showRanking ? ' active' : ''}`}
          onClick={handleSelectRanking}
        >
          <span className="stats-user-pill-icon">🏆</span>
          <span>Classificação</span>
        </button>
      </div>

      {/* ── ESTATÍSTICAS DE CLASSIFICAÇÃO COLETIVA ── */}
      {showRanking && (
      <div className="stats-section">
        <h3 className="stats-section-title">🏆 Estatísticas de Classificação</h3>
        <p className="stats-section-desc">Rankings baseados na posição de cada um após cada rodada do bolão</p>

        {rankingLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>}

        {rankingData && rankingData.totalRodadas === 0 && (
          <p className="stats-empty">Nenhuma rodada encerrada ainda</p>
        )}

        {rankingData && rankingData.totalRodadas > 0 && (
          <>
            <div className="classification-tops">
              <div className="classification-top-block">
                <h4 className="classification-top-title">👑 Mais rodadas na liderança</h4>
                <RankingTable rows={rankingData.top5Leaders} valueKey="rodadasLider" valueLabel="rodadas" />
              </div>
              <div className="classification-top-block">
                <h4 className="classification-top-title">🥇 Mais rodadas no Top 3</h4>
                <RankingTable rows={rankingData.top5Top3} valueKey="rodadasTop3" valueLabel="rodadas" />
              </div>
              <div className="classification-top-block">
                <h4 className="classification-top-title">📉 Mais rodadas no Bot 3</h4>
                <RankingTable rows={rankingData.top5Bot3} valueKey="rodadasBot3" valueLabel="rodadas" />
              </div>
              <div className="classification-top-block">
                <h4 className="classification-top-title">🪣 Mais rodadas na lanterna</h4>
                <RankingTable rows={rankingData.top5Lanterns} valueKey="rodadasLanterna" valueLabel="rodadas" />
              </div>
            </div>

            {/* Últimas N rodadas */}
            <div className="classification-filter-section">
              <h4 className="classification-top-title">⚡ Classificação — Últimas rodadas</h4>
              <div className="phase-badges">
                {[5, 10, 15].map(n => (
                  <PhaseBadge key={n} label={`Últimas ${n}`} active={lastNFilter === n} onClick={() => setLastNFilter(n)} />
                ))}
              </div>
              {rankingData.rankingLast[lastNFilter] == null ? (
                <p className="stats-empty">Ainda não há {lastNFilter} rodadas encerradas</p>
              ) : (
                <RankingTable rows={rankingData.rankingLast[lastNFilter]} valueKey="pts" valueLabel="pts" />
              )}
            </div>

            {/* Por fase */}
            <div className="classification-filter-section">
              <h4 className="classification-top-title">🗓️ Classificação por Fase</h4>
              <div className="phase-badges">
                {Object.entries(faseLabels).map(([key, label]) => (
                  <PhaseBadge key={key} label={label} active={faseFilter === key} onClick={() => setFaseFilter(key)} />
                ))}
              </div>
              {rankingData.rankingFase[faseFilter] == null ? (
                <p className="stats-empty">Nenhuma rodada dessa fase foi encerrada ainda</p>
              ) : (
                <>
                  {!rankingData.rankingFase[faseFilter].complete && (
                    <p className="stats-partial-note">
                      ⚠️ Parcial — {rankingData.rankingFase[faseFilter].gamesFinished} de {rankingData.rankingFase[faseFilter].gamesTotal} jogos encerrados
                    </p>
                  )}
                  <RankingTable rows={rankingData.rankingFase[faseFilter].rows} valueKey="pts" valueLabel="pts" />
                </>
              )}
            </div>
          </>
        )}
      </div>
      )}

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

          {/* ── CLASSIFICAÇÃO INDIVIDUAL ── */}
          {data.rankingStats && data.rankingStats.totalRodadas > 0 && (
            <Section title="📍 Classificação" desc="Como você se saiu na tabela de classificação ao longo do bolão">
              <StatCard
                icon="👑"
                label="Rodadas líder"
                value={data.rankingStats.rodadasLider}
                sub={`de ${data.rankingStats.totalRodadas} rodadas`}
                color="var(--lime)"
              />
              <StatCard
                icon="🥇"
                label="Rodadas no Top 3"
                value={data.rankingStats.rodadasTop3}
                sub={`de ${data.rankingStats.totalRodadas} rodadas`}
                color="var(--green)"
              />
              <StatCard
                icon="📈"
                label="Rodadas no Top 6"
                value={data.rankingStats.rodadasTop6}
                sub={`de ${data.rankingStats.totalRodadas} rodadas`}
                color="var(--blue)"
              />
              <StatCard
                icon="📉"
                label="Rodadas no Bot 6"
                value={data.rankingStats.rodadasBot6}
                sub={`de ${data.rankingStats.totalRodadas} rodadas`}
                color="var(--yellow)"
              />
              <StatCard
                icon="🪣"
                label="Rodadas na lanterna"
                value={data.rankingStats.rodadasLanterna}
                sub={`de ${data.rankingStats.totalRodadas} rodadas`}
                color="var(--red)"
              />
              <StatCard
                icon="📊"
                label="Posição média"
                value={data.rankingStats.posicaoMedia != null ? `${data.rankingStats.posicaoMedia}º` : '—'}
                sub="Posição média ao longo do bolão"
                color="var(--muted)"
              />
            </Section>
          )}

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
              <p className="stats-section-desc">Top 3 pessoas com os palpites mais parecidos</p>
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
        </>
      )}
    </div>
  );
}
