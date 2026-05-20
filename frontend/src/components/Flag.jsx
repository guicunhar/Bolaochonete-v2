// Country flag using flagcdn.com
// flagCode should be ISO 3166-1 alpha-2 lowercase
export default function Flag({ code, name, size = 36 }) {
  if (!code) {
    return (
      <div className="team-flag-fallback" style={{ width: size, height: Math.round(size * 0.67) }}>
        {name?.slice(0, 3).toUpperCase() || '?'}
      </div>
    );
  }
  const lower = code.toLowerCase().replace('gb-eng', 'gb-eng');
  // Handle England specifically
  const src = lower === 'gb-eng'
    ? 'https://flagcdn.com/gb.svg'
    : `https://flagcdn.com/${lower}.svg`;
  return (
    <img
      src={src}
      alt={name}
      className="team-flag-img"
      style={{ width: size, height: Math.round(size * 0.67) }}
      onError={e => { e.target.style.display='none'; e.target.nextSibling?.style && (e.target.nextSibling.style.display='flex'); }}
    />
  );
}
