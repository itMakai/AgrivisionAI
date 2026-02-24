import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import HomePage from './pages/Home';
import MessagesPage from './pages/Messages';
import InboxPage from './pages/Inbox';
import ProvidersPage from './pages/Providers';
import AddProviderPage from './pages/AddProvider';
import ServiceDetail from './pages/ServiceDetail';
import PlatformPage from './pages/Platform';
import TransportPage from './pages/Transport';
import { loadAuthToken } from './lib/api';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfilePage from './pages/Profile';

function isAdminUser(user) {
  return !!(user && (user.is_staff || user.is_superuser || user?.privileges?.is_admin || user.role === 'admin'));
}

function App() {
  function NavHeader() {
    const { isAuth, setToken, user } = useContext(AuthContext);
    const navigate = useNavigate();

    return (
      <nav className="navbar app-header sticky-top">
        <div className="container d-flex justify-content-between align-items-center py-2 gap-2">
          <div>
            <div className="fw-bold text-white">AgriVisionAI</div>
            <div className="small text-white-50">AI-Driven Agriculture Platform</div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
            <NavLink to="/" className="btn btn-sm btn-outline-light">Home</NavLink>
            {isAuth ? (
              <>
                <NavLink to="/platform" className="btn btn-sm btn-success">Platform</NavLink>
                <NavLink to="/providers" className="btn btn-sm btn-outline-light">Providers</NavLink>
                <NavLink to="/transport" className="btn btn-sm btn-outline-light">Transport</NavLink>
                <NavLink to="/messages" className="btn btn-sm btn-outline-light">Messaging</NavLink>
                <NavLink to="/profile" className="btn btn-sm btn-outline-light">Profile</NavLink>
                <span className="small text-white-50 px-1">{user?.username}</span>
                <button onClick={() => { setToken(null); navigate('/'); }} className="btn btn-sm btn-light">Logout</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="btn btn-sm btn-outline-light">Login</NavLink>
                <NavLink to="/register" className="btn btn-sm btn-light">Register</NavLink>
              </>
            )}
          </div>
        </div>
      </nav>
    );
  }

  function RequireAuth({ children }) {
    const { isAuth, loading } = useContext(AuthContext);
    if (loading) return <div>Checking authentication…</div>;
    if (!isAuth) return <Navigate to="/login" replace />;
    return children;
  }

  function RequireAdmin({ children }) {
    const { isAuth, loading, user } = useContext(AuthContext);
    if (loading) return <div>Checking authentication…</div>;
    if (!isAuth) return <Navigate to="/login" replace />;
    if (!isAdminUser(user)) return <Navigate to="/platform" replace />;
    return children;
  }

  function GuestOnly({ children }) {
    const { isAuth, loading } = useContext(AuthContext);
    if (loading) return <div>Checking authentication…</div>;
    if (isAuth) return <Navigate to="/platform" replace />;
    return children;
  }

  return (
  <AuthProvider>
  <Router>
      <div className="d-flex flex-column min-vh-100">
        <NavHeader />

        {/* Main Content */}
        <main className="container flex-fill py-4">
          <Routes>
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

            {/* Home is public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/platform" element={<RequireAuth><PlatformPage /></RequireAuth>} />
            <Route path="/messages" element={<RequireAuth><MessagesPage lang="en" /></RequireAuth>} />
            <Route path="/inbox" element={<RequireAuth><InboxPage /></RequireAuth>} />
            <Route path="/providers" element={<RequireAuth><ProvidersPage /></RequireAuth>} />
            <Route path="/providers/new" element={<RequireAdmin><AddProviderPage /></RequireAdmin>} />
            <Route path="/services/:id" element={<RequireAuth><ServiceDetail lang="en" /></RequireAuth>} />
            <Route path="/transport" element={<RequireAuth><TransportPage /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><ProfilePage lang="en" /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
    </AuthProvider>
  );
}

// load token from localStorage on module mount (ensures axios has Authorization header)
loadAuthToken();

export default App;