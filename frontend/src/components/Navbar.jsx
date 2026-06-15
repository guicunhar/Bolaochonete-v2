import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Avatar from './Avatar';

const links = [
  { to: '/classificacao', label: 'Classificação', icon: '🏆' },
  { to: '/palpites', label: 'Palpites', icon: '👀' },
  { to: '/meus-palpites', label: 'Meus Palpites', icon: '✏' },
  { to: '/estatisticas', label: 'Estatísticas', icon: '📊' },
  { to: '/regulamento', label: 'Regulamento', icon: '📋' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const isAdmin = user?.is_admin === 1 || user?.is_admin === true;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <span className="navbar-logo">BOLÃO<span>CHONETE</span></span>
          <div className="nav-links">
            {links.map(l => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                {l.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Admin</NavLink>
            )}
          </div>
          <div className="navbar-right">
            <Avatar src={user?.avatar_path} name={user?.name} size={30} />
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sair</button>
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
            <span>{l.icon}</span>
            {l.label.split(' ')[0]}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
            <span>⚙</span>Admin
          </NavLink>
        )}
      </nav>
    </>
  );
}
