import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Classificacao from './pages/Classificacao';
import MeusPalpites from './pages/MeusPalpites';
import Palpites from './pages/Palpites';
import Regulamento from './pages/Regulamento';
import Admin from './pages/Admin';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !user.is_admin) return <Navigate to="/classificacao" />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="content">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div className="spinner" /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/classificacao" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/classificacao" /> : <Register />} />
      <Route path="/classificacao" element={<ProtectedRoute><AppLayout><Classificacao /></AppLayout></ProtectedRoute>} />
      <Route path="/meus-palpites" element={<ProtectedRoute><AppLayout><MeusPalpites /></AppLayout></ProtectedRoute>} />
      <Route path="/palpites" element={<ProtectedRoute><AppLayout><Palpites /></AppLayout></ProtectedRoute>} />
      <Route path="/regulamento" element={<ProtectedRoute><AppLayout><Regulamento /></AppLayout></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute adminOnly><AppLayout><Admin /></AppLayout></ProtectedRoute>} />
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
