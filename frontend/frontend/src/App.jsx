import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext, useEffect, useState } from 'react';
import HomePage from './pages/Home';
import MessagesPage from './pages/Messages';
import InboxPage from './pages/Inbox';
import ProvidersPage from './pages/Providers';
import AddProviderPage from './pages/AddProvider';
import ServiceDetail from './pages/ServiceDetail';
import PlatformPage from './pages/Platform';
import TransportPage from './pages/Transport';
import MarketplacePage from './pages/Marketplace';
import { loadAuthToken } from './lib/api';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfilePage from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminRecentMessages from './pages/AdminRecentMessages';

function isAdminUser(user) {
  return !!(user && (user.is_staff || user.is_superuser || user?.privileges?.is_admin || user.role === 'admin'));
}

function hasRole(user, roles = []) {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  return roles.includes(user.role);
}

function App() {
  function NavHeader() {
    const { isAuth, setToken, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
      setMobileMenuOpen(false);
    }, [location.pathname, isAuth]);

    const closeMobileMenu = () => setMobileMenuOpen(false);

    const handleLogout = () => {
      closeMobileMenu();
      setToken(null);
      navigate('/');
    };

    const canUseMarketplace = hasRole(user, ['farmer', 'buyer']);
    const canUseProviders = hasRole(user, ['farmer', 'buyer']);
    const canUseTransport = hasRole(user, ['farmer', 'buyer', 'provider']);

    return (
      <nav className="navbar app-header sticky-top">
        <div className="container d-flex justify-content-between align-items-center py-2 gap-2 position-relative">
          <div>
            <div className="fw-bold text-white">Makueni Agritech </div>
            <div className="small text-white-50">Digital Agriculture Platform</div>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-light d-lg-none"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            <span aria-hidden="true">{mobileMenuOpen ? '✕' : '☰'}</span>
          </button>

          <div className="d-none d-lg-flex align-items-center gap-2 flex-wrap justify-content-end">
            <NavLink to="/" className="btn btn-sm btn-outline-light">Home</NavLink>
            {isAuth ? (
              <>
                <NavLink to="/platform" className="btn btn-sm btn-success">Platform</NavLink>
                {canUseMarketplace ? <NavLink to="/marketplace" className="btn btn-sm btn-outline-light">Marketplace</NavLink> : null}
                {canUseProviders ? <NavLink to="/providers" className="btn btn-sm btn-outline-light">Providers</NavLink> : null}
                {canUseTransport ? <NavLink to="/transport" className="btn btn-sm btn-outline-light">Transport</NavLink> : null}
                <NavLink to="/messages" className="btn btn-sm btn-outline-light">Messaging</NavLink>
                <NavLink to="/profile" className="btn btn-sm btn-outline-light">Profile</NavLink>
                {isAdminUser(user) ? <NavLink to="/admin-dashboard" className="btn btn-sm btn-outline-light">Admin</NavLink> : null}
                <span className="small text-white-50 px-1">{user?.username}</span>
                <button onClick={handleLogout} className="btn btn-sm btn-light">Logout</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="btn btn-sm btn-outline-light">Login</NavLink>
                <NavLink to="/register" className="btn btn-sm btn-light">Register</NavLink>
              </>
            )}
          </div>

          {mobileMenuOpen ? (
            <div className="mobile-nav-menu d-lg-none">
              <NavLink to="/" className="btn btn-sm btn-outline-light" onClick={closeMobileMenu}>Home</NavLink>
              {isAuth ? (
                <>
                  <NavLink to="/platform" className="btn btn-sm btn-success" onClick={closeMobileMenu}>Platform</NavLink>
                  {canUseMarketplace ? <NavLink to="/marketplace" className="btn btn-sm btn-outline-light" onClick={closeMobileMenu}>Marketplace</NavLink> : null}
                  {canUseProviders ? <NavLink to="/providers" className="btn btn-sm btn-outline-light" onClick={closeMobileMenu}>Providers</NavLink> : null}
                  {canUseTransport ? <NavLink to="/transport" className="btn btn-sm btn-outline-light" onClick={closeMobileMenu}>Transport</NavLink> : null}
                  <NavLink to="/messages" className="btn btn-sm btn-outline-light" onClick={closeMobileMenu}>Messaging</NavLink>
                  <NavLink to="/profile" className="btn btn-sm btn-outline-light" onClick={closeMobileMenu}>Profile</NavLink>
                  {isAdminUser(user) ? <NavLink to="/admin-dashboard" className="btn btn-sm btn-outline-light" onClick={closeMobileMenu}>Admin</NavLink> : null}
                  <span className="small text-white-50 px-1">Signed in as {user?.username}</span>
                  <button onClick={handleLogout} className="btn btn-sm btn-light">Logout</button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className="btn btn-sm btn-outline-light" onClick={closeMobileMenu}>Login</NavLink>
                  <NavLink to="/register" className="btn btn-sm btn-light" onClick={closeMobileMenu}>Register</NavLink>
                </>
              )}
            </div>
          ) : null}
        </div>
      </nav>
    );
  }

  function RequireAuth({ children }) {
    const { isAuth, loading } = useContext(AuthContext);
    if (loading) return <div>Checking authentication...</div>;
    if (!isAuth) return <Navigate to="/login" replace />;
    return children;
  }

  function RequireAdmin({ children }) {
    const { isAuth, loading, user } = useContext(AuthContext);
    if (loading) return <div>Checking authentication...</div>;
    if (!isAuth) return <Navigate to="/login" replace />;
    if (!isAdminUser(user)) return <Navigate to="/platform" replace />;
    return children;
  }

  function RequireRoles({ roles, children }) {
    const { isAuth, loading, user } = useContext(AuthContext);
    if (loading) return <div>Checking authentication...</div>;
    if (!isAuth) return <Navigate to="/login" replace />;
    if (!hasRole(user, roles)) return <Navigate to="/platform" replace />;
    return children;
  }

  function GuestOnly({ children }) {
    const { isAuth, loading } = useContext(AuthContext);
    if (loading) return <div>Checking authentication...</div>;
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
            <Route path="/marketplace" element={<RequireRoles roles={['farmer', 'buyer']}><MarketplacePage /></RequireRoles>} />
            <Route path="/messages" element={<RequireAuth><MessagesPage lang="en" /></RequireAuth>} />
            <Route path="/inbox" element={<RequireAuth><InboxPage /></RequireAuth>} />
            <Route path="/providers" element={<RequireRoles roles={['farmer', 'buyer']}><ProvidersPage /></RequireRoles>} />
            <Route path="/providers/new" element={<RequireAdmin><AddProviderPage /></RequireAdmin>} />
            <Route path="/services/:id" element={<RequireAuth><ServiceDetail lang="en" /></RequireAuth>} />
            <Route path="/transport" element={<RequireRoles roles={['farmer', 'buyer', 'provider']}><TransportPage /></RequireRoles>} />
            <Route path="/profile" element={<RequireAuth><ProfilePage lang="en" /></RequireAuth>} />
            <Route path="/admin-dashboard" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
            <Route path="/admin/recent-messages" element={<RequireAdmin><AdminRecentMessages /></RequireAdmin>} />
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
