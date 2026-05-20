export default function Regulamento() {
  const Block = ({ pts, label, desc, cls }) => (
    <div style={{ display:'flex', gap:'12px', padding:'14px', background:'var(--card2)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}>
      <span className={`badge ${cls}`} style={{ flexShrink:0, alignSelf:'flex-start' }}>{pts}</span>
      <div>
        <div style={{ fontWeight:600, fontSize:'0.9rem', marginBottom:'3px' }}>{label}</div>
        <p style={{ color:'var(--muted)', fontSize:'0.8rem', lineHeight:1.6 }}>{desc}</p>
      </div>
    </div>
  );

  return (
    <div className="fade-up" style={{ maxWidth:'680px' }}>
      <h1 className="section-title" style={{ marginBottom:'24px' }}>Regulamento</h1>

      <div className="card" style={{ marginBottom:'14px' }}>
        <h2 style={{ fontSize:'1rem', marginBottom:'10px' }}>Pontuação por jogo</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          <Block pts="+5 pts" cls="badge-exact" label="Acerto Total" desc="Acertou o placar exato. Ex: palpitou 2x1 e deu 2x1." />
          <Block pts="+3 pts" cls="badge-p3" label="Acerto Parcial" desc="Acertou o vencedor E os gols de um dos times. Ex: palpitou 2x0 e deu 2x1 — acertou o vencedor e os gols do mandante (2)." />
          <Block pts="+1 pt" cls="badge-p1" label="Acerto Básico" desc="Acertou apenas quem ganhou (ou que seria empate), mas errou os gols." />
          <Block pts="0 pts" cls="badge-miss" label="Errou" desc="Acertou o vencedor errado." />
        </div>
      </div>

      <div className="card" style={{ marginBottom:'14px' }}>
        <h2 style={{ fontSize:'1rem', marginBottom:'10px' }}>Palpites Bônus (feitos na ativação)</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          <Block pts="+50" cls="badge-exact" label="Seleção Campeã" desc="Acertou o campeão do mundo." />
          <Block pts="+25" cls="badge-p3" label="Vice-campeã" desc="Palpitou no campeão, mas a seleção foi até a final e perdeu." />
          <Block pts="+25" cls="badge-exact" label="Melhor Jogador" desc="Acertou o Bola de Ouro da Copa (escolha da FIFA)." />
          <Block pts="+20" cls="badge-exact" label="Artilheiro" desc="Acertou o artilheiro exato do torneio." />
          <Block pts="+10" cls="badge-p3" label="Artilheiro (desempate)" desc="O jogador marcou mais gols mas perdeu no critério de desempate da FIFA." />
        </div>
      </div>

      <div className="card" style={{ marginBottom:'14px' }}>
        <h2 style={{ fontSize:'1rem', marginBottom:'10px' }}>Prazos e regras</h2>
        <ul style={{ color:'var(--muted)', lineHeight:1.9, paddingLeft:'18px', fontSize:'0.85rem' }}>
          <li>Palpites bloqueados automaticamente no horário de início de cada partida.</li>
          <li>Horários no fuso de Brasília (GMT-3).</li>
          <li>Palpite não enviado = 0 pontos na partida.</li>
          <li>Palpites bônus são definitivos e não podem ser alterados após a ativação da conta.</li>
          <li>Se não marcar "anônimo", seu palpite aparece público antes do jogo começar.</li>
          <li>Palpites anônimos só ficam visíveis após o apito inicial.</li>
          <li>Resultados inseridos manualmente pelo administrador.</li>
        </ul>
      </div>
    </div>
  );
}
