import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <span className="navbar-brand">⚽ BOLÃO <span>CHONETE</span></span>

        <div className="nav-links">
          <NavLink to="/classificacao" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            🏆 Classificação
          </NavLink>
          <NavLink to="/palpites" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            👀 Palpites
          </NavLink>
          <NavLink to="/meus-palpites" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            ✏️ Meus Palpites
          </NavLink>
          <NavLink to="/regulamento" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            📋 Regulamento
          </NavLink>
          {user?.is_admin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              🔧 Admin
            </NavLink>
          )}
        </div>

        <div className="navbar-right">
          {user && <span className="nav-user">Olá, <strong>{user.name.split(' ')[0]}</strong></span>}
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sair</button>
        </div>
      </div>
    </nav>
  );
}
