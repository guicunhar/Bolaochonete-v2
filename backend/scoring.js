/**
 * Calculate points for a bet
 * 5 pts = exact score
 * 3 pts = correct winner + goals of one team (winner OR loser)
 * 1 pt  = correct winner only
 */
function calculatePoints(bet_home, bet_away, real_home, real_away) {
  if (real_home === null || real_away === null) return 0;

  // Exact result
  if (bet_home === real_home && bet_away === real_away) return 5;

  const betWinner = bet_home > bet_away ? 'home' : bet_home < bet_away ? 'away' : 'draw';
  const realWinner = real_home > real_away ? 'home' : real_home < real_away ? 'away' : 'draw';

  if (betWinner !== realWinner) return 0;

  // Correct winner: check if also got one team's goals right
  if (bet_home === real_home || bet_away === real_away) return 3;

  // Just the winner
  return 1;
}

function getScoreType(points) {
  if (points === 5) return 'total';
  if (points === 3) return 'parcial';
  if (points === 1) return 'basico';
  return 'errou';
}

module.exports = { calculatePoints, getScoreType };
