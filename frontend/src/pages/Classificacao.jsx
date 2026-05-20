import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Classificacao() {
  const { apiCall, user } = useAuth();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall('/api/ranking')
      .then(setRanking)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const medals = ['🥇', '🥈', '🥉'];
  const posClasses = ['gold', 'silver', 'bronze'];

  if (loading) return <div className="spinner" />;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '28px' }}>
        <h1 className="section-title">🏆 Classificação</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
          Pontuação acumulada de todos os jogos finalizados.
        </p>
      </div>

      {ranking.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⏳</div>
          <p style={{ color: 'var(--text-dim)' }}>Nenhum jogo finalizado ainda. A Copa começa em 11/06!</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="ranking-table">
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>#</th>
                <th>Participante</th>
                <th style={{ textAlign: 'center' }}>✅ Exatos</th>
                <th style={{ textAlign: 'center' }}>🎯 Parcial 3</th>
                <th style={{ textAlign: 'center' }}>👍 Básico</th>
                <th style={{ textAlign: 'right' }}>Pontos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((p, i) => (
                <tr key={p.id} style={p.id === user?.id ? { background: 'rgba(201,168,76,0.06)' } : {}}>
                  <td>
                    <div className={`rank-pos ${posClasses[i] || ''}`}>
                      {i < 3 ? medals[i] : i + 1}
                    </div>
                  </td>
                  <td>
                    <div className="rank-name">
                      {p.name}
                      {p.id === user?.id && <span style={{ color: 'var(--gold)', fontSize: '0.75rem', marginLeft: '8px' }}>(você)</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {p.champion_pick && <span>🏆 {p.champion_pick}</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="result-badge badge-total">{p.exact}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="result-badge badge-parcial3">{p.partial3}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="result-badge badge-parcial1">{p.partial1}</span>
                  </td>
                  <td className="rank-pts">{p.total_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Special picks summary */}
      {ranking.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h2 className="section-title" style={{ fontSize: '1.5rem' }}>🎲 Palpites Especiais</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {ranking.map(p => (
              <div key={p.id} className="card card-sm">
                <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '0.95rem' }}>{p.name}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {p.champion_pick && <span>🏆 Campeã: <strong style={{ color: 'var(--text)' }}>{p.champion_pick}</strong></span>}
                  {p.best_player_pick && <span>⭐ Melhor: <strong style={{ color: 'var(--text)' }}>{p.best_player_pick}</strong></span>}
                  {p.top_scorer_pick && <span>👟 Artilheiro: <strong style={{ color: 'var(--text)' }}>{p.top_scorer_pick}</strong></span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
