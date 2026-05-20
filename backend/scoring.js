function calculatePoints(bh, ba, rh, ra) {
  if (rh === null || ra === null) return 0;
  if (bh === rh && ba === ra) return 5;
  const bw = bh > ba ? 'h' : bh < ba ? 'a' : 'd';
  const rw = rh > ra ? 'h' : rh < ra ? 'a' : 'd';
  if (bw !== rw) return 0;
  if (bh === rh || ba === ra) return 3;
  return 1;
}
module.exports = { calculatePoints };
