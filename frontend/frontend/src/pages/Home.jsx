import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div>
      {/* Hero callout */}
      <div className="card app-card p-4 mb-4" style={{ background: 'linear-gradient(145deg, #28a745 0%, #1e7e34 100%)', color: 'white' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
          <div>
            <h1 className="h2 mb-2">Welcome to AgriVisionAI</h1>
            <p className="mb-0" style={{ fontSize: '1.1rem', opacity: 0.95 }}>
              Connect your farm to real-time price forecasts, weather insights, and market coordination—all in one place.
            </p>
          </div>
          <div className="d-flex gap-2 flex-shrink-0">
            <Link to="/register" className="btn btn-light px-4">Get Started</Link>
            <Link to="/login" className="btn btn-outline-light px-4">Sign In</Link>
          </div>
        </div>
      </div>

      {/* Key Value Props */}
      <section className="mb-4">
        <h2 className="h4 mb-3">Why AgriVisionAI?</h2>
        <div className="row g-3">
          <div className="col-md-4">
            <div className="card app-card p-3 h-100">
              <h5 className="mb-2">📈 Predictive Market Intelligence</h5>
              <p className="small text-muted mb-0">
                Track predicted price trends for your crops and receive alerts when selling conditions are optimal.
              </p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card app-card p-3 h-100">
              <h5 className="mb-2">🌦️ Weather & Advisories</h5>
              <p className="small text-muted mb-0">
                Get real-time weather forecasts tailored to your region with actionable crop-care recommendations.
              </p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card app-card p-3 h-100">
              <h5 className="mb-2">🚚 Logistics Coordination</h5>
              <p className="small text-muted mb-0">
                Connect with transport providers, coordinate orders, and track delivery statuses—no phone tag required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-4">
        <h2 className="h4 mb-3">How It Works</h2>
        <div className="row g-3">
          <div className="col-md-6">
            <div className="card app-card p-3">
              <h6 className="mb-2">1. Sign Up & Build Your Profile</h6>
              <p className="small text-muted mb-0">
                Register as a farmer or buyer. Add your location, produce type, and contact details to unlock platform features.
              </p>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card app-card p-3">
              <h6 className="mb-2">2. View Live Analytics</h6>
              <p className="small text-muted mb-0">
                Head to the control center to monitor weather, browse predicted price charts, and review advisories.
              </p>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card app-card p-3">
              <h6 className="mb-2">3. List Crops & Connect with Buyers</h6>
              <p className="small text-muted mb-0">
                Post your available produce in the marketplace. Buyers can discover and contact you directly, with optional transport support.
              </p>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card app-card p-3">
              <h6 className="mb-2">4. Coordinate Transport & Delivery</h6>
              <p className="small text-muted mb-0">
                Request transport services, track shipment status, and communicate with providers through the platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Capabilities */}
      <section className="mb-4">
        <h2 className="h4 mb-3">Platform Capabilities</h2>
        <div className="row g-3">
          <div className="col-md-4">
            <div className="card app-card p-3 h-100">
              <h5 className="mb-2">User & Profile Management</h5>
              <p className="small text-muted mb-0">
                Secure auth, farmer and buyer profiles, optional transport flags, and flexible contact methods.
              </p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card app-card p-3 h-100">
              <h5 className="mb-2">Marketplace & Listings</h5>
              <p className="small text-muted mb-0">
                Search active listings, post your own, and filter by crop, market, or price range.
              </p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card app-card p-3 h-100">
              <h5 className="mb-2">AI-Driven Analytics</h5>
              <p className="small text-muted mb-0">
                Leverage price forecasts, weather models, and advisory insights to optimize harvest timing and sales.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <div className="card app-card p-4 d-flex flex-md-row justify-content-between align-items-md-center gap-3" style={{ borderLeft: '4px solid var(--primary)' }}>
        <div>
          <h5 className="mb-1">Ready to modernize your agri operations?</h5>
          <div className="small text-muted">
            Join a growing community of farmers and buyers who rely on AgriVisionAI for smarter decisions.
          </div>
        </div>
        <div className="d-flex gap-2 flex-shrink-0">
          <Link to="/register" className="btn btn-success px-4">Create Account</Link>
          <Link to="/platform" className="btn btn-outline-success px-4">View Platform</Link>
        </div>
      </div>
    </div>
  );
}
