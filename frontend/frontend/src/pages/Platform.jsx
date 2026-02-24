import { useEffect, useMemo, useState } from 'react';
import {
  fetchPlatformOverview,
  fetchPlatformAuth,
  fetchPlatformMarketplace,
  fetchPlatformAnalytics,
  fetchTransportRequests,
} from '../lib/api';
import PriceTrendChart from '../components/PriceTrendChart';
import WeatherChart from '../components/WeatherChart';
import { Link } from 'react-router-dom';

const tabs = [
  { key: 'overview', label: 'Operations Overview' },
  { key: 'auth', label: 'User Management' },
  { key: 'market', label: 'Marketplace' },
  { key: 'ai', label: 'Analytics' },
];

export default function PlatformPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [overview, setOverview] = useState(null);
  const [authData, setAuthData] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [transportRequests, setTransportRequests] = useState([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      fetchPlatformOverview(),
      fetchPlatformAuth(),
      fetchPlatformMarketplace(),
      fetchPlatformAnalytics(),
      fetchTransportRequests().catch(() => []),
    ])
      .then(([o, a, m, ai, transport]) => {
        if (!mounted) return;
        setOverview(o);
        setAuthData(a);
        setMarketData(m);
        setAiData(ai);
        setTransportRequests(transport || []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.detail || 'Failed to load platform data');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const d1 = authData?.d1_user_db || {};
    const d2 = marketData?.d2_market_db || {};
    const d3 = aiData?.d3_analytics_db || {};
    return [
      { label: 'Users', value: d1.users ?? 0 },
      { label: 'Active Listings', value: d2.active_listings ?? 0 },
      { label: 'Providers', value: d2.providers ?? 0 },
      { label: 'Forecast Rows', value: (aiData?.price_predictions || []).length },
      { label: 'Advisories', value: (aiData?.advisories || []).length },
      { label: 'Transport Requests', value: transportRequests.length },
      { label: 'Profile Completion', value: `${d1.profile_completion_pct ?? 0}%` },
    ];
  }, [authData, marketData, aiData, transportRequests]);

  if (loading) {
    return <div className="text-muted">Loading operations modules…</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div>
      <div className="platform-hero mb-4">
        <div>
          <h2 className="h3 mb-1">AgriVisionAI Control Center</h2>
          <p className="mb-0 text-muted">
            Unified workspace for identity, marketplace execution, forecasting, and logistics.
          </p>
        </div>
        <div className="text-end">
          <div className="small text-muted">System</div>
          <div className="fw-semibold">{overview?.platform || 'AgriVisionAI'}</div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {metrics.map((item) => (
          <div className="col-6 col-md-4 col-xl-2" key={item.label}>
            <div className="metric-card">
              <div className="metric-value">{item.value}</div>
              <div className="metric-label">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card app-card mb-4 p-2">
        <div className="d-flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`btn btn-sm ${activeTab === tab.key ? 'btn-success' : 'btn-outline-secondary'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && <OverviewPanel overview={overview} />}
      {activeTab === 'auth' && <AuthPanel data={authData} />}
      {activeTab === 'market' && <MarketPanel data={marketData} />}
      {activeTab === 'ai' && <AiPanel data={aiData} transportRequests={transportRequests} />}
    </div>
  );
}

function OverviewPanel({ overview }) {
  const flows = overview?.flows || [];
  return (
    <div className="row g-3">
      <div className="col-12 col-lg-7">
        <div className="card app-card p-3 h-100">
          <h5 className="mb-3">Operational Flow</h5>
          <ol className="small mb-0">
            {flows.map((f, i) => (
              <li key={`${f}-${i}`} className="mb-2">{f}</li>
            ))}
          </ol>
        </div>
      </div>
      <div className="col-12 col-lg-5">
        <div className="card app-card p-3 h-100">
          <h5 className="mb-3">External Sources</h5>
          <div className="d-flex flex-wrap gap-2">
            {(overview?.external_sources || []).map((s) => (
              <span key={s} className="badge text-bg-light border">{s}</span>
            ))}
          </div>
          <hr />
          <h6 className="small text-muted">System</h6>
          <p className="mb-0">{overview?.platform}</p>
        </div>
      </div>
    </div>
  );
}

function AuthPanel({ data }) {
  const d1 = data?.totals || {};
  const state = data?.session || {};
  return (
    <div className="row g-3">
      <div className="col-12 col-lg-6">
        <div className="card app-card p-3 h-100">
          <h5>Session & Identity</h5>
          <div className="small text-muted mb-2">Authentication and profile lifecycle</div>
          <div className="mb-3">
            <div className="fw-semibold">Current Session</div>
            <div className="small text-muted mt-1">{state.authenticated ? `Signed in as ${state.username}` : 'No active session'}</div>
          </div>
          <Link to="/register" className="btn btn-sm btn-success">Create User</Link>
        </div>
      </div>
      <div className="col-12 col-lg-6">
        <div className="card app-card p-3 h-100">
          <h5>User Metrics</h5>
          <ul className="list-unstyled small mb-0">
            <li className="mb-2"><strong>Total Users:</strong> {d1.users ?? 0}</li>
            <li className="mb-2"><strong>Farmers:</strong> {d1.farmers ?? 0}</li>
            <li className="mb-2"><strong>Buyers:</strong> {d1.buyers ?? 0}</li>
            <li className="mb-2"><strong>Profile Completion:</strong> {d1.profile_completion_pct ?? 0}%</li>
            <li><strong>Session:</strong> {state.authenticated ? `Active (${state.username})` : 'Guest Session'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function MarketPanel({ data }) {
  const d2 = data?.totals || {};
  const updates = [];
  const listings = data?.recent_listings || [];

  return (
    <div className="row g-3">
      <div className="col-12 col-lg-4">
        <div className="card app-card p-3 h-100">
          <h5>Marketplace Status</h5>
          <ul className="list-unstyled small mb-0">
            <li className="mb-2"><strong>Active Listings:</strong> {d2.active_listings ?? 0}</li>
            <li className="mb-2"><strong>Providers:</strong> {d2.providers ?? 0}</li>
            <li><strong>Booking Status:</strong></li>
            {Object.entries(d2.bookings_by_status || {}).map(([k, v]) => (
              <li key={k} className="small text-muted">{k}: {v}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="col-12 col-lg-8">
        <div className="card app-card p-3">
          <h5 className="mb-2">Transport Coordination</h5>
          <p className="small text-muted">Create and track transport requests across providers and listings.</p>
          <Link to="/transport" className="btn btn-success btn-sm">Open Transport Desk</Link>
        </div>
      </div>

      <div className="col-12">
        <div className="card app-card p-3">
          <h5 className="mb-2">Recent Listings</h5>
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Owner</th>
                  <th>Crop</th>
                  <th>Market</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.owner__username}</td>
                    <td>{row.crop__name}</td>
                    <td>{row.market__name || 'N/A'}</td>
                    <td>KSh {row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiPanel({ data, transportRequests }) {
  const weather = data?.weather || {};
  const advisories = data?.advisories || [];
  const forecasts = data?.price_predictions || [];
  const priceSeries = data?.price_series || [];

  return (
    <div className="row g-3">
      <div className="col-12 col-lg-4">
        <div className="card app-card p-3 h-100">
          <h5>Weather Forecast</h5>
          <div className="mb-2"><strong>Weather Source:</strong> {weather.source || 'N/A'}</div>
          <div className="mb-2"><strong>Current Temp:</strong> {weather?.current?.temp ?? 'N/A'}°C</div>
          <div className="mb-2"><strong>Humidity:</strong> {weather?.current?.humidity ?? 'N/A'}%</div>
          <div><strong>Description:</strong> {weather?.current?.description || 'N/A'}</div>
          <div className="mt-3"><WeatherChart lang="en" weatherData={weather} /></div>
        </div>
      </div>

      <div className="col-12 col-lg-8">
        <div className="card app-card p-3">
          <h5 className="mb-2">Predicted Prices</h5>
          <PriceTrendChart lang="en" predictions={priceSeries} title="Predicted Market Prices" />
        </div>
      </div>

      <div className="col-12 col-lg-6">
        <div className="card app-card p-3">
          <h5 className="mb-2">Advisories</h5>
          <div className="list-group list-group-flush">
            {advisories.map((a, idx) => (
              <div key={`${a.title}-${idx}`} className="list-group-item px-0">
                <div className="d-flex justify-content-between">
                  <strong>{a.title}</strong>
                  <span className="badge text-bg-light border">{a.severity}</span>
                </div>
                <div className="small text-muted">{a.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-6">
        <div className="card app-card p-3">
          <h5 className="mb-2">Transport Request Status</h5>
          {transportRequests.length === 0 ? (
            <div className="small text-muted">No transport requests yet.</div>
          ) : (
            <ul className="list-group list-group-flush">
              {transportRequests.slice(0, 8).map((row) => (
                <li key={row.id} className="list-group-item px-0 d-flex justify-content-between">
                  <span>{row.provider} · {row.service}</span>
                  <span className="badge text-bg-light border">{row.status}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <Link to="/transport" className="btn btn-sm btn-outline-primary">Manage Transport</Link>
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="card app-card p-3">
          <h5 className="mb-2">Prediction Table</h5>
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Crop</th>
                  <th>Market</th>
                  <th>Predicted Price</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.slice(0, 20).map((f, i) => (
                  <tr key={`${f.date}-${f.crop}-${f.market}-${i}`}>
                    <td>{f.date}</td>
                    <td>{f.crop}</td>
                    <td>{f.market}</td>
                    <td>KSh {f.predicted_price}</td>
                    <td>{f.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
