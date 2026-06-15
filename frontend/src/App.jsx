import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import PrimeiroAcesso from './pages/PrimeiroAcesso';
import Classificacao from './pages/Classificacao';
import MeusPalpites from './pages/MeusPalpites';
import Palpites from './pages/Palpites';
import Regulamento from './pages/Regulamento';
import Admin from './pages/Admin';
import Estatisticas from './pages/Estatisticas';

function Guard({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', justifyContent:'center', marginTop:'80px' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !user.is_admin) return <Navigate to="/classificacao" />;
  return children;
}

function Layout({ children }) {
  return (
    <div className="app">
      <Navbar />
      <main className="page">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><div className="spinner" /></div>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/classificacao" /> : <Login />} />
      <Route path="/primeiro-acesso" element={user ? <Navigate to="/classificacao" /> : <PrimeiroAcesso />} />
      <Route path="/classificacao" element={<Guard><Layout><Classificacao /></Layout></Guard>} />
      <Route path="/palpites" element={<Guard><Layout><Palpites /></Layout></Guard>} />
      <Route path="/meus-palpites" element={<Guard><Layout><MeusPalpites /></Layout></Guard>} />
      <Route path="/regulamento" element={<Guard><Layout><Regulamento /></Layout></Guard>} />
      <Route path="/estatisticas" element={<Guard><Layout><Estatisticas /></Layout></Guard>} />
      <Route path="/admin" element={<Guard adminOnly><Layout><Admin /></Layout></Guard>} />
      <Route path="*" element={<Navigate to={user ? '/classificacao' : '/login'} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
