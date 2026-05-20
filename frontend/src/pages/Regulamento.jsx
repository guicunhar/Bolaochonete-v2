export default function Regulamento() {
  return (
    <div className="fade-in" style={{ maxWidth: '720px' }}>
      <h1 className="section-title">📋 Regulamento</h1>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.6rem', color: 'var(--gold)', marginBottom: '16px' }}>⚽ BOLÃO CHONETE — Copa 2026</h2>
        <p style={{ color: 'var(--text-dim)', lineHeight: 1.7 }}>
          O Bolão Chonete é o bolão oficial dos nossos amigos para a Copa do Mundo 2026.
          Os participantes palpitam nos resultados dos jogos e acumulam pontos ao longo do torneio.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.3rem', color: 'var(--gold)', marginBottom: '16px' }}>🎯 Sistema de Pontuação</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', background: 'rgba(0,168,107,0.08)', borderRadius: '8px', border: '1px solid rgba(0,168,107,0.2)' }}>
            <span className="result-badge badge-total" style={{ flexShrink: 0 }}>+5 pts</span>
            <div>
              <strong style={{ color: '#4ade80' }}>Acerto Total</strong>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginTop: '4px' }}>
                Acertou o placar exato da partida. Ex: palpitou 2×1 e deu 2×1.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', background: 'rgba(201,168,76,0.08)', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.2)' }}>
            <span className="result-badge badge-parcial3" style={{ flexShrink: 0 }}>+3 pts</span>
            <div>
              <strong style={{ color: 'var(--gold-light)' }}>Acerto Parcial</strong>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginTop: '4px' }}>
                Acertou o vencedor E os gols de um dos times (vencedor ou perdedor).
                Ex: palpitou 2×0 e deu 2×1 — acertou o vencedor e os gols do time da casa (2).
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', background: 'rgba(59,130,246,0.08)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
            <span className="result-badge badge-parcial1" style={{ flexShrink: 0 }}>+1 pt</span>
            <div>
              <strong style={{ color: '#60a5fa' }}>Acerto Básico</strong>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginTop: '4px' }}>
                Acertou apenas o vencedor (ou que seria empate).
                Ex: palpitou 1×0 e deu 3×1 — acertou quem ganhou mas não os gols.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', background: 'rgba(211,47,47,0.08)', borderRadius: '8px', border: '1px solid rgba(211,47,47,0.2)' }}>
            <span className="result-badge badge-errou" style={{ flexShrink: 0 }}>0 pts</span>
            <div>
              <strong style={{ color: '#f87171' }}>Errou</strong>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginTop: '4px' }}>
                Acertou o vencedor errado.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.3rem', color: 'var(--gold)', marginBottom: '16px' }}>🏆 Palpites Especiais (Bônus)</h3>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginBottom: '12px' }}>
          Feitos no momento do cadastro. Podem ser alterados até o início da Copa (11/06/2026).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
            <div>
              <strong>🥇 Seleção Campeã</strong>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>Acertou o campeão</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="result-badge badge-total">+50 pts</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
            <div>
              <strong>🥈 Vice-Campeã</strong>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>Palpitou no campeão, mas a seleção foi vice</p>
            </div>
            <span className="result-badge badge-parcial3">+25 pts</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
            <div>
              <strong>⭐ Melhor Jogador da Copa</strong>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>Escolhido pela FIFA</p>
            </div>
            <span className="result-badge badge-total">+25 pts</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
            <div>
              <strong>👟 Artilheiro</strong>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>Acertou o artilheiro exato</p>
            </div>
            <span className="result-badge badge-total">+20 pts</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
            <div>
              <strong>👟 Artilheiro (critério de desempate)</strong>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>Mais gols mas perdeu no desempate da FIFA</p>
            </div>
            <span className="result-badge badge-parcial3">+10 pts</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.3rem', color: 'var(--gold)', marginBottom: '12px' }}>📅 Prazos</h3>
        <ul style={{ color: 'var(--text-dim)', lineHeight: 1.8, paddingLeft: '20px', fontSize: '0.9rem' }}>
          <li>Os palpites de cada jogo são bloqueados automaticamente no horário de início da partida.</li>
          <li>Horários exibidos no fuso de Brasília (GMT-3).</li>
          <li>Palpites não enviados antes do jogo resultam em 0 pontos para aquela partida.</li>
          <li>Palpites especiais podem ser alterados até 11/06/2026.</li>
        </ul>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.3rem', color: 'var(--gold)', marginBottom: '12px' }}>👁️ Transparência</h3>
        <ul style={{ color: 'var(--text-dim)', lineHeight: 1.8, paddingLeft: '20px', fontSize: '0.9rem' }}>
          <li>Todos os palpites ficam públicos após o início de cada jogo.</li>
          <li>Os resultados são inseridos manualmente pelo administrador.</li>
          <li>Em caso de dúvidas, fale com o administrador do bolão.</li>
        </ul>
      </div>
    </div>
  );
}
