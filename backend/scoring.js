const KNOCKOUT_PHASES = new Set(['Pre-Oitavas','Oitavas','Quartas','Semi','Terceiro Lugar','Final']);

function calculatePoints(bh, ba, rh, ra) {
  if (rh === null || ra === null) return 0;
  if (bh === rh && ba === ra) return 5;
  const bw = bh > ba ? 'h' : bh < ba ? 'a' : 'd';
  const rw = rh > ra ? 'h' : rh < ra ? 'a' : 'd';
  if (bw !== rw) return 0;
  if (bh === rh || ba === ra) return 3;
  return 1;
}

// Mata-mata: same base as calculatePoints (+2 bônus se acertou o classificado)
function calculateKnockoutPoints(bh, ba, rh, ra, penaltyWinner, betPenaltyPick) {
  const base = calculatePoints(bh, ba, rh, ra);
  const actualClassifier = rh > ra ? 'home' : ra > rh ? 'away' : penaltyWinner || null;
  const betClassifier    = bh > ba ? 'home' : ba > bh ? 'away' : betPenaltyPick  || null;
  const bonus = actualClassifier && betClassifier && actualClassifier === betClassifier ? 2 : 0;
  return base + bonus;
}

module.exports = { calculatePoints, calculateKnockoutPoints, KNOCKOUT_PHASES };
