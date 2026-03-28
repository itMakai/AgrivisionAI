import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchPlatformOverview,
  fetchPlatformAuth,
  fetchPlatformMarketplace,
  fetchPlatformAnalytics,
} from '../lib/api';
import PriceTrendChart from '../components/PriceTrendChart';
import WeatherChart from '../components/WeatherChart';
import { Link } from 'react-router-dom';

const tabs = [
  { key: 'overview', label: 'Farm Operations', icon: '🚜' },
  { key: 'auth', label: 'Stakeholder Registry', icon: '👥' },
  { key: 'market', label: 'Market & Trade', icon: '🌾' },
  { key: 'ai', label: 'Agro-Intelligence', icon: '🧠' },
];

// --- Custom CSS for Dashboard Polish ---
const dashboardStyles = `
  .hover-lift {
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  }
  .hover-lift:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.08) !important;
  }
  .icon-box {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    font-size: 1.5rem;
  }
  .nav-pills-custom .nav-link {
    color: #495057;
    background-color: #f8f9fa;
    border-radius: 50rem;
    padding: 0.6rem 1.2rem;
    font-weight: 500;
    transition: all 0.2s;
  }
  .nav-pills-custom .nav-link.active {
    color: #fff;
    background-color: #1e7e34;
    box-shadow: 0 4px 10px rgba(40, 167, 69, 0.3);
  }
  .nav-pills-custom .nav-link:hover:not(.active) {
    background-color: #e9ecef;
  }
  .weather-widget {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
  }
`;

export default function AgriControlCenter() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [overview, setOverview] = useState(null);
  const [authData, setAuthData] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [aiData, setAiData] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      fetchPlatformOverview(),
      fetchPlatformAuth(),
      fetchPlatformMarketplace(),
      fetchPlatformAnalytics(),
    ])
      .then(([o, a, m, ai]) => {
        if (!mounted) return;
        setOverview(o);
        setAuthData(a);
        setMarketData(m);
        setAiData(ai);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.detail || 'Failed to load agricultural platform data');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => (mounted = false);
  }, []);

  const metrics = useMemo(() => {
    const d1 = authData?.totals || {};
    const d2 = marketData?.totals || {};

    return [
      { label: 'Registered Users', value: d1.users ?? 0, icon: '👥', bgColor: 'bg-primary-subtle', textColor: 'text-primary' },
      { label: 'Active Listings', value: d2.active_listings ?? 0, icon: '📦', bgColor: 'bg-success-subtle', textColor: 'text-success' },
      { label: 'Logistics Providers', value: d2.providers ?? 0, icon: '🚚', bgColor: 'bg-warning-subtle', textColor: 'text-warning' },
      { label: 'AI Forecasts', value: (aiData?.price_predictions || []).length, icon: '📈', bgColor: 'bg-info-subtle', textColor: 'text-info' },
      { label: 'Agro-Advisories', value: (aiData?.advisories || []).length, icon: '💡', bgColor: 'bg-danger-subtle', textColor: 'text-danger' },
      { label: 'Profile Completion', value: `${d1.profile_completion_pct ?? 0}%`, icon: '⭐', bgColor: 'bg-secondary-subtle', textColor: 'text-secondary' },
    ];
  }, [authData, marketData, aiData]);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center" style={{ backgroundColor: '#f4f7f5' }}>
        <div className="spinner-border text-success mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
        <h5 className="text-muted fw-semibold">Loading Agricultural Intelligence...</h5>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger shadow-sm rounded-4 p-4 d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill fs-3 me-3"></i>
          <div>
            <h5 className="alert-heading fw-bold mb-1">System Error</h5>
            <p className="mb-0">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 pb-5" style={{ backgroundColor: '#f4f7f5', minHeight: '100vh' }}>
      <style>{dashboardStyles}</style>

      {/* HERO DASHBOARD HEADER */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e7e34 0%, #28a745 100%)', color: 'white' }}>
        <div className="card-body p-4 p-md-5 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <span className="badge bg-white text-success fw-bold px-3 py-2 rounded-pill mb-2">Control Center</span>
            <h2 className="display-6 fw-bold mb-1">Agritech Hub</h2>
            <p className="mb-0 opacity-75 fs-6">
              Centralized farm operations, market intelligence, climate analytics, and logistics coordination.
            </p>
          </div>
          <div className="text-md-end bg-black bg-opacity-25 p-3 rounded-4 backdrop-blur">
            <div className="small text-white-50 text-uppercase fw-semibold tracking-wide">System Identity</div>
            <div className="fs-5 fw-bold">
              {overview?.platform || 'Agritech Core'}
            </div>
          </div>
        </div>
      </div>

      {/* KPI METRICS GRID */}
      <div className="row g-4 mb-5">
        {metrics.map((item, idx) => (
          <div className="col-12 col-sm-6 col-lg-4 col-xl-2" key={idx}>
            <div className="card border-0 shadow-sm rounded-4 h-100 hover-lift">
              <div className="card-body p-3 d-flex align-items-center">
                <div className={`icon-box ${item.bgColor} ${item.textColor} me-3`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="mb-0 fw-bold text-dark lh-1">{item.value}</h3>
                  <div className="text-muted small fw-semibold text-uppercase mt-1" style={{ fontSize: '0.75rem' }}>{item.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TABS NAVIGATION */}
      <div className="d-flex flex-wrap gap-2 mb-4 nav-pills-custom">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`btn border-0 shadow-sm d-flex align-items-center gap-2 nav-link ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="tab-content">
        {activeTab === 'overview' && <OverviewPanel overview={overview} />}
        {activeTab === 'auth' && <AuthPanel data={authData} />}
        {activeTab === 'market' && <MarketPanel data={marketData} />}
        {activeTab === 'ai' && <AiPanel data={aiData} />}
      </div>
    </div>
  );
}

/* ============================= */
/* REFRESHED PANELS */
/* ============================= */

function OverviewPanel({ overview }) {
  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-header bg-white border-0 pt-4 pb-0 px-4">
        <h4 className="fw-bold text-dark mb-0">Farm Operations Workflow</h4>
      </div>
      <div className="card-body p-4">
        <div className="row g-4">
          {(overview?.flows || []).map((flow, i) => (
            <div className="col-12 col-md-6 col-xl-4" key={i}>
              <div className="d-flex align-items-start p-3 bg-light rounded-4 h-100 border border-white hover-lift">
                <div className="icon-box bg-success text-white shadow-sm me-3 flex-shrink-0" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
                  {i + 1}
                </div>
                <div className="pt-1">
                  <p className="mb-0 text-secondary fw-medium">{flow}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {(!overview?.flows || overview.flows.length === 0) && (
          <div className="text-muted text-center py-4">No workflow data available.</div>
        )}
      </div>
    </div>
  );
}

function AuthPanel({ data }) {
  const totals = data?.totals || {};
  const session = data?.session || {};

  return (
    <div className="row g-4">
      <div className="col-lg-7">
        <div className="card border-0 shadow-sm rounded-4 h-100">
          <div className="card-body p-4 p-md-5">
            <h4 className="fw-bold text-dark mb-4">Stakeholder Distribution</h4>
            
            <div className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded-3">
                <div className="d-flex align-items-center gap-2"><span className="fs-5">👨‍🌾</span> <span className="fw-semibold">Registered Farmers</span></div>
                <span className="badge bg-success rounded-pill fs-6 px-3">{totals.farmers ?? 0}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded-3">
                <div className="d-flex align-items-center gap-2"><span className="fs-5">🛒</span> <span className="fw-semibold">Verified Buyers</span></div>
                <span className="badge bg-primary rounded-pill fs-6 px-3">{totals.buyers ?? 0}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded-3">
                <div className="d-flex align-items-center gap-2"><span className="fs-5">🚚</span> <span className="fw-semibold">Transport Providers</span></div>
                <span className="badge bg-warning text-dark rounded-pill fs-6 px-3">{totals.providers ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-5">
        <div className="card border-0 shadow-sm rounded-4 h-100 bg-success bg-gradient text-white">
          <div className="card-body p-4 p-md-5 d-flex flex-column justify-content-center align-items-center text-center">
            <div className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm mb-3" style={{ width: '80px', height: '80px' }}>
              <span className="fs-1">{session.authenticated ? '👤' : '🔒'}</span>
            </div>
            <h4 className="fw-bold mb-1">Identity & Session</h4>
            <p className="fs-5 opacity-75 mb-4">
              {session.authenticated ? `Active Session: ${session.username}` : 'Guest Access Restricted'}
            </p>
            <Link to="/register" className="btn btn-light text-success btn-lg fw-bold rounded-pill shadow-sm px-4">
              Register New Stakeholder
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketPanel({ data }) {
  const listings = data?.recent_listings || [];

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="card-header bg-white border-bottom-0 pt-4 pb-2 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h4 className="fw-bold text-dark mb-0">Recent Market Listings</h4>
            <Link to="/transport" className="btn btn-outline-success rounded-pill fw-semibold shadow-sm">
              <i className="bi bi-truck me-2"></i> Open Logistics Desk
            </Link>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4 text-muted fw-semibold small text-uppercase">Listing ID</th>
                    <th className="text-muted fw-semibold small text-uppercase">Farmer</th>
                    <th className="text-muted fw-semibold small text-uppercase">Crop Type</th>
                    <th className="text-muted fw-semibold small text-uppercase">Market Destination</th>
                    <th className="px-4 text-end text-muted fw-semibold small text-uppercase">Price (KSh)</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.length > 0 ? listings.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 fw-medium text-secondary">#{row.id}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center small" style={{width: '28px', height:'28px'}}>
                            {row.owner__username.charAt(0).toUpperCase()}
                          </div>
                          <span className="fw-semibold">{row.owner__username}</span>
                        </div>
                      </td>
                      <td><span className="badge bg-light text-dark border">{row.crop__name}</span></td>
                      <td>{row.market__name || <span className="text-muted fst-italic">Open Market</span>}</td>
                      <td className="px-4 text-end fw-bold text-success">KSh {row.price}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="text-center py-5 text-muted">
                        No active listings found in the marketplace.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiPanel({ data }) {
  const weather = data?.weather || {};
  const advisories = data?.advisories || [];
  const climateAlerts = data?.climate_alerts || [];
  const recommendations = data?.recommendations || [];
  const priceSeries = data?.price_series || [];

  return (
    <div className="row g-4">
      {/* Weather Widget */}
      <div className="col-lg-4">
        <div className="card border-0 shadow-sm rounded-4 h-100 weather-widget">
          <div className="card-body p-4 p-md-5">
            <h5 className="fw-bold opacity-75 text-uppercase small mb-4 tracking-wide"><i className="bi bi-cloud-sun me-2"></i>Live Climate Intelligence</h5>
            
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div>
                <div className="display-3 fw-bold lh-1">{weather?.current?.temp ?? '--'}°C</div>
                <div className="fs-5 mt-2 text-capitalize opacity-75">{weather?.current?.description || 'Data unavailable'}</div>
              </div>
              <div className="fs-1 opacity-50">☁️</div>
            </div>
            
            <div className="d-flex gap-3 mb-4 p-3 bg-white bg-opacity-25 rounded-3 backdrop-blur">
              <div className="flex-fill text-center">
                <div className="small opacity-75">Humidity</div>
                <div className="fw-bold fs-5">{weather?.current?.humidity ?? '--'}%</div>
              </div>
              <div className="border-end border-white border-opacity-25"></div>
              <div className="flex-fill text-center">
                <div className="small opacity-75">Wind</div>
                <div className="fw-bold fs-5">{weather?.current?.wind_speed ?? '--'} km/h</div>
              </div>
            </div>

            <div className="bg-white rounded-4 p-3 shadow-sm text-dark mt-auto">
              <WeatherChart weatherData={weather} />
            </div>

            {climateAlerts.length > 0 ? (
              <div className="mt-3 bg-white bg-opacity-25 rounded-4 p-3">
                <div className="fw-bold small text-uppercase opacity-75 mb-2">Climate alerts</div>
                <div className="d-flex flex-column gap-2">
                  {climateAlerts.map((a, idx) => (
                    <div key={idx} className="small">
                      <span className="badge bg-light text-dark border me-2">{a.severity}</span>
                      {a.message}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Price Predictions & Advisories */}
      <div className="col-lg-8 d-flex flex-column gap-4">
        {/* Forecast Chart */}
        <div className="card border-0 shadow-sm rounded-4 flex-grow-1">
          <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
            <h5 className="fw-bold text-dark"><span className="fs-5 me-2">📈</span>Commodity Price Forecast Engine</h5>
          </div>
          <div className="card-body p-4">
            <PriceTrendChart predictions={priceSeries} />
          </div>
        </div>

        {/* AI Advisories */}
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
             <h5 className="fw-bold text-dark"><span className="fs-5 me-2">💡</span>AI Agronomic Advisories</h5>
          </div>
          <div className="card-body p-4">
            <div className="d-flex flex-column gap-3">
              {advisories.length > 0 ? advisories.map((a, i) => (
                <div key={i} className="d-flex gap-3 p-3 bg-light rounded-4 border-start border-4 border-success">
                  <div className="text-success fs-4 mt-1">🌿</div>
                  <div>
                    <h6 className="fw-bold text-dark mb-1">{a.title}</h6>
                    <p className="mb-0 text-muted small lh-base">{a.content}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-muted bg-light rounded-4">
                  No critical advisories at this time.
                </div>
              )}
            </div>

            {recommendations.length > 0 ? (
              <div className="mt-4">
                <h6 className="fw-bold mb-2">Recommendations</h6>
                <ul className="mb-0">
                  {recommendations.slice(0, 6).map((r, idx) => (
                    <li key={idx} className="small text-muted">{r.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      
    </div>
  );
}
