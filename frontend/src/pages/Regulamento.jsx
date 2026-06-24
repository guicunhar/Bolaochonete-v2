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
        <h2 style={{ fontSize:'1rem', marginBottom:'10px' }}>Pontuação por jogo (fase de grupos)</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          <Block pts="+5 pts" cls="badge-exact" label="Acerto Total" desc="Acertou o placar exato. Ex: palpitou 2x1 e deu 2x1." />
          <Block pts="+3 pts" cls="badge-p3" label="Acerto Parcial" desc="Acertou o vencedor E os gols de um dos times. Ex: palpitou 2x0 e deu 2x1 — acertou o vencedor e os gols do mandante (2)." />
          <Block pts="+1 pt" cls="badge-p1" label="Acerto Básico" desc="Acertou apenas quem ganhou (ou que seria empate), mas errou os gols." />
          <Block pts="0 pts" cls="badge-miss" label="Errou" desc="Acertou o vencedor errado." />
        </div>
      </div>

      <div className="card" style={{ marginBottom:'14px' }}>
        <h2 style={{ fontSize:'1rem', marginBottom:'10px' }}>Pontuação mata-mata (Pré-Oitavas em diante)</h2>
        <p style={{ color:'var(--muted)', fontSize:'0.82rem', marginBottom:'12px', lineHeight:1.6 }}>
          Os palpites valem para os <strong style={{ color:'var(--fg)' }}>120 minutos</strong> (tempo normal + prorrogação). A pontuação base é a mesma dos grupos. Além disso, acertar quem se classifica vale <strong style={{ color:'var(--lime)' }}>+2 pts bônus</strong>.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          <Block pts="+7 pts" cls="badge-exact" label="Placar exato + classificado" desc="Acertou o placar exato (5 pts) e quem se classifica (+2). Máximo possível num jogo mata-mata." />
          <Block pts="+5 pts" cls="badge-exact" label="Acerto parcial + classificado" desc="Acertou o vencedor E os gols de um dos times (+3) e quem se classifica (+2). Ex: palpitou 3x1, jogo foi 3x0 → 3 + 2 = 5 pts." />
          <Block pts="+3 pts" cls="badge-p3" label="Acerto básico + classificado" desc="Acertou apenas quem ganhou/empate (+1) e quem se classifica (+2). Ex: palpitou 1x0, jogo foi 3x1 → 1 + 2 = 3 pts." />
          <Block pts="+2 pts" cls="badge-p1" label="Acertou só o classificado" desc="Errou o resultado dos 120 min, mas acertou quem avança. Ex: palpitou 2x0 França, jogo foi 1x1 e França passou nos pênaltis → 0 + 2 = 2 pts." />
        </div>
        <div style={{ marginTop:'12px', padding:'10px 12px', background:'rgba(200,240,62,0.04)', borderRadius:'var(--radius-sm)', border:'1px solid rgba(200,240,62,0.1)' }}>
          <p style={{ fontSize:'0.78rem', color:'var(--muted)', margin:0, lineHeight:1.7 }}>
            <strong style={{ color:'var(--fg)' }}>Como funciona o palpite de pênaltis:</strong> se você palpitar empate (ex: 1x1), aparece uma opção para escolher quem avança nos pênaltis. Se palpitar vitória de um dos times, esse time é automaticamente seu "classificado" para fins do bônus.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom:'14px' }}>
        <h2 style={{ fontSize:'1rem', marginBottom:'10px' }}>Palpites Bônus (feitos na ativação)</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          <Block pts="+20" cls="badge-exact" label="Seleção Campeã" desc="Acertou o campeão do mundo." />
          <Block pts="+10" cls="badge-p3" label="Vice-campeã" desc="Palpitou no campeão, mas a seleção foi até a final e perdeu." />
          <Block pts="+20" cls="badge-exact" label="Melhor Jogador" desc="Acertou o Bola de Ouro da Copa (escolha da FIFA)." />
          <Block pts="+20" cls="badge-exact" label="Artilheiro" desc="Acertou o artilheiro exato do torneio." />
        </div>
      </div>

      <div className="card" style={{ marginBottom:'14px' }}>
        <h2 style={{ fontSize:'1rem', marginBottom:'10px' }}>Prazos e regras</h2>
        <ul style={{ color:'var(--muted)', lineHeight:1.9, paddingLeft:'18px', fontSize:'0.85rem' }}>
          <li>Palpites bloqueados automaticamente no horário de início de cada partida.</li>
          <li>Horários no fuso de Brasília (GMT-3).</li>
          <li>Palpite não enviado = 0 pontos na partida.</li>
          <li>Palpites bônus podem ser alterados até 11/05 às 15h59.</li>
          <li>Se não marcar "anônimo", seu palpite aparece público antes do jogo começar.</li>
          <li>Palpites anônimos só ficam visíveis após o apito inicial.</li>
          <li>Resultados inseridos manualmente pelo administrador.</li>
        </ul>
      </div>
    </div>
  );
}
