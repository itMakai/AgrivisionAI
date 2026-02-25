import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// --- CSS for Custom Hover Effects ---
const customStyles = `
  .hover-lift {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .hover-lift:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
  }
  .hero-overlay {
    background: linear-gradient(rgba(18, 53, 36, 0.8), rgba(26, 77, 46, 0.85)), url('https://images.unsplash.com/photo-1500937386664-56d1dfefcb19?auto=format&fit=crop&w=1920&q=80') center/cover;
  }
  .step-number {
    width: 40px;
    height: 40px;
    background-color: #28a745;
    color: white;
    font-weight: bold;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }
`;

function AlternatingFeatureCard({ title, description, image, alt, reverse = false }) {
  return (
    <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
      <div className={`row g-0 align-items-center ${reverse ? 'flex-md-row-reverse' : ''}`}>
        <div className="col-12 col-md-6">
          <img
            src={image}
            alt={alt}
            className="w-100"
            style={{ height: '350px', objectFit: 'cover' }}
          />
        </div>
        <div className="col-12 col-md-6 p-4 p-lg-5">
          <h3 className="h4 fw-bold text-dark mb-3">{title}</h3>
          <p className="text-muted mb-0 lh-lg" style={{ fontSize: '1.1rem' }}>{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isAuth } = useContext(AuthContext);

  const whyItems = [
    {
      title: 'Predictive Intelligence',
      icon: '📈',
      description: 'Track predicted price trends for your crops and receive alerts when selling conditions are optimal.',
      image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Weather & Advisories',
      icon: '🌦️',
      description: 'Get real-time weather forecasts tailored to your region with actionable crop-care recommendations.',
      image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Logistics Coordination',
      icon: '🚚',
      description: 'Connect with transport providers, coordinate orders, and track delivery statuses seamlessly.',
      image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const howItems = [
    {
      title: 'Sign Up',
      description: 'Register and build your profile with location and produce details.',
    },
    {
      title: 'View Analytics',
      description: 'Monitor weather, price charts, and AI-driven advisories.',
    },
    {
      title: 'List & Connect',
      description: 'Post available produce and let verified buyers find you.',
    },
    {
      title: 'Deliver',
      description: 'Coordinate transport and track shipments right from the app.',
    },
  ];

  const capabilityItems = [
    {
      title: 'Secure Profile Management',
      description: 'Protect your data with secure authentication. Manage your farmer or buyer profiles, set transport flags, and choose flexible contact methods that suit your lifestyle.',
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1400&q=80',
      alt: 'Secure account management',
    },
    {
      title: 'Digital Marketplace & Listings',
      description: 'Search active listings across regions, post your own harvest, and use smart filters by crop type, market demand, or price range to find the best deals.',
      image: 'https://images.unsplash.com/photo-1570358934836-6802981e481e?auto=format&fit=crop&w=1400&q=80',
      alt: 'Digital marketplace',
    },
  ];

  return (
    <div className="homepage-wrapper pb-5">
      <style>{customStyles}</style>

      {/* Hero Section */}
      <div className="hero-overlay text-white rounded-4 p-5 mb-5 shadow text-center text-md-start d-flex align-items-center" style={{ minHeight: '450px' }}>
        <div className="container-fluid px-0">
          <div className="row">
            <div className="col-12 col-md-8 col-lg-7">
              <span className="badge bg-success mb-3 px-3 py-2 rounded-pill fs-6">Empowering Modern Farmers</span>
              <h1 className="display-4 fw-bold mb-3" style={{ lineHeight: '1.2' }}>
                Farm Smarter, <br /> Sell Better with AgriVisionAI
              </h1>
              <p className="mb-4 fs-5" style={{ opacity: 0.9 }}>
                Connect your farm to real-time price forecasts, weather insights, and market coordination—all in one easy-to-use platform.
              </p>
              {!isAuth && (
                <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-md-start">
                  <Link to="/register" className="btn btn-success btn-lg px-5 fw-bold rounded-pill">Get Started Today</Link>
                  <Link to="/login" className="btn btn-outline-light btn-lg px-5 fw-bold rounded-pill">Sign In</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Why AgriVisionAI (Grid Layout) */}
      <section className="mb-5 pt-3">
        <div className="text-center mb-5">
          <h2 className="fw-bold text-dark">Why Choose AgriVisionAI?</h2>
          <p className="text-muted">Tools designed specifically to maximize your harvest value.</p>
        </div>
        <div className="row g-4">
          {whyItems.map((item) => (
            <div className="col-12 col-md-4" key={item.title}>
              <div className="card h-100 border-0 shadow-sm rounded-4 hover-lift">
                <img src={item.image} className="card-img-top" alt={item.title} style={{ height: '200px', objectFit: 'cover', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }} />
                <div className="card-body p-4 text-center">
                  <div className="display-6 mb-2">{item.icon}</div>
                  <h4 className="card-title h5 fw-bold">{item.title}</h4>
                  <p className="card-text text-muted">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works (Step Layout) */}
      <section className="mb-5 py-5 rounded-4 shadow-sm" style={{ backgroundColor: '#f8faf9' }}>
        <div className="container-fluid px-4">
          <div className="text-center mb-5">
            <h2 className="fw-bold text-dark">How It Works</h2>
            <p className="text-muted">Four simple steps to transform your agricultural business.</p>
          </div>
          <div className="row g-4 text-center text-md-start">
            {howItems.map((item, index) => (
              <div className="col-12 col-sm-6 col-lg-3 d-flex flex-column align-items-center align-items-md-start" key={item.title}>
                <div className="step-number shadow-sm">{index + 1}</div>
                <h5 className="fw-bold mb-2">{item.title}</h5>
                <p className="text-muted small">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Capabilities (Alternating Layout) */}
      <section className="mb-5 pt-3">
        <div className="text-center mb-5">
          <h2 className="fw-bold text-dark">Powerful Capabilities</h2>
          <p className="text-muted">Everything you need to manage your farming operations effectively.</p>
        </div>
        <div className="d-flex flex-column gap-4">
          {capabilityItems.map((item, index) => (
            <AlternatingFeatureCard
              key={item.title}
              title={item.title}
              description={item.description}
              image={item.image}
              alt={item.alt}
              reverse={index % 2 === 1}
            />
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ background: '#1e7e34' }}>
        <div className="card-body p-5 text-center text-white">
          <h2 className="fw-bold mb-3">Ready to modernize your agri-operations?</h2>
          <p className="mb-4 fs-5" style={{ opacity: 0.9 }}>
            Join a growing community of farmers and buyers who rely on AgriVisionAI for smarter, data-driven decisions.
          </p>
          <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
            <Link to="/register" className="btn btn-light text-success btn-lg px-5 fw-bold rounded-pill">Create Free Account</Link>
            <Link to="/platform" className="btn btn-outline-light btn-lg px-5 fw-bold rounded-pill">Explore Platform</Link>
          </div>
        </div>
      </div>
      
    </div>
  );
}