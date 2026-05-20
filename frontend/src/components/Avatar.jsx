export default function Avatar({ src, name, size = 36 }) {
  const initials = name ? name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() : '?';
  if (src) {
    return <img src={src} alt={name} className="avatar" style={{ width: size, height: size }} />;
  }
  return (
    <div className="avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {initials}
    </div>
  );
}
