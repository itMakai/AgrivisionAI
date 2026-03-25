import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  createTransportRequest,
  fetchListings,
  fetchMarkets,
  fetchTransportOptions,
  fetchTransportRequests,
  updateTransportRequestStatus,
} from '../lib/api';
import { AuthContext } from '../context/AuthContext';

const transportStyles = `
  .hover-lift {
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  }
  .hover-lift:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.08) !important;
  }
  .form-control-custom, .form-select-custom {
    background-color: #f8f9fa;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    padding: 0.6rem 1rem;
    transition: all 0.2s;
  }
  .form-control-custom:focus, .form-select-custom:focus {
    background-color: #fff;
    border-color: #1e7e34;
    box-shadow: 0 0 0 0.25rem rgba(40, 167, 69, 0.25);
  }
  .table-custom th {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6c757d;
    border-bottom: 2px solid #e9ecef;
  }
  .table-custom td {
    vertical-align: middle;
    color: #495057;
  }
`;

const getStatusBadge = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'pending': return <span className="badge bg-warning text-dark rounded-pill px-3 py-1">Pending</span>;
    case 'accepted': return <span className="badge bg-info text-dark rounded-pill px-3 py-1">Accepted</span>;
    case 'completed': return <span className="badge bg-success rounded-pill px-3 py-1">Completed</span>;
    case 'cancelled': return <span className="badge bg-danger rounded-pill px-3 py-1">Cancelled</span>;
    default: return <span className="badge bg-secondary rounded-pill px-3 py-1">{status || 'Unknown'}</span>;
  }
};

export default function TransportPage() {
  const { user } = useContext(AuthContext);
  const role = user?.role || 'user';
  const isAdmin = !!(user && (user.is_staff || user.is_superuser || user?.privileges?.is_admin || role === 'admin'));
  const isProvider = role === 'provider';

  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [options, setOptions] = useState([]);

  const [selectedListing, setSelectedListing] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('');
  const [quantity, setQuantity] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => {
    if (isProvider) return 'Assigned delivery requests';
    if (isAdmin) return 'All transport requests';
    return 'My delivery requests';
  }, [isAdmin, isProvider]);

  async function loadAll() {
    setLoading(true);
    try {
      const req = await fetchTransportRequests();
      setRequests(req || []);

      if (!isProvider) {
        const [listingData, marketData] = await Promise.all([
          fetchListings({ owner: 'me' }),
          fetchMarkets(),
        ]);
        setListings(listingData?.results || listingData || []);
        setMarkets(marketData?.results || marketData || []);
      } else {
        setListings([]);
        setMarkets([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProvider]);

  useEffect(() => {
    if (!selectedListing || isProvider) {
      setOptions([]);
      return;
    }
    fetchTransportOptions({ listing_id: selectedListing })
      .then((rows) => setOptions(rows || []))
      .catch(() => setOptions([]));
  }, [selectedListing, isProvider]);

  async function handleCreateRequest(e) {
    e.preventDefault();
    if (!selectedOption) return;

    setSubmitting(true);
    try {
      const option = options.find((row) => String(row.service_id) === String(selectedOption));
      await createTransportRequest({
        provider_id: option.provider_id,
        service_id: option.service_id,
        market_id: selectedMarket || undefined,
        quantity: quantity || undefined,
        scheduled_date: scheduledDate || undefined,
      });

      setSelectedOption('');
      setSelectedListing('');
      setSelectedMarket('');
      setQuantity('');
      setScheduledDate('');

      await loadAll();
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(id, status) {
    await updateTransportRequestStatus(id, status);
    await loadAll();
  }

  if (loading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <div className="spinner-border text-success mb-3" role="status"></div>
        <div className="text-muted fw-semibold">Loading logistics data...</div>
      </div>
    );
  }

  return (
    <div className="container py-4 pb-5">
      <style>{transportStyles}</style>

      <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e7e34 0%, #28a745 100%)', color: 'white' }}>
        <div className="card-body p-4 p-md-5">
          <h2 className="fw-bold mb-2">Logistics coordination</h2>
          <div className="opacity-75">
            {isProvider
              ? 'Review, accept and complete assigned delivery requests.'
              : 'Request transport after agreeing on a deal in chat. Track delivery status here.'}
          </div>
        </div>
      </div>

      <div className="row g-4">
        {!isProvider ? (
          <div className="col-12 col-lg-5 d-flex flex-column">
            <div className="card border-0 shadow-sm rounded-4 flex-grow-1 hover-lift">
              <div className="card-header bg-white border-bottom-0 pt-4 px-4 pb-3">
                <h5 className="fw-bold text-dark mb-0">Request transport</h5>
                <small className="text-muted">Create a delivery request for one of your listings.</small>
              </div>
              <div className="card-body p-4 d-flex flex-column">
                <form onSubmit={handleCreateRequest} className="d-flex flex-column h-100">
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-muted small">Your listing</label>
                    <select className="form-select form-select-custom" value={selectedListing} onChange={(e) => setSelectedListing(e.target.value)} required>
                      <option value="">-- Select listing --</option>
                      {listings.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.crop} - {l.quantity} {l.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-muted small">Delivery market (optional)</label>
                    <select className="form-select form-select-custom" value={selectedMarket} onChange={(e) => setSelectedMarket(e.target.value)}>
                      <option value="">-- None --</option>
                      {markets.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-muted small">Transport provider</label>
                    <select className="form-select form-select-custom" value={selectedOption} onChange={(e) => setSelectedOption(e.target.value)} required disabled={!selectedListing}>
                      <option value="">{selectedListing ? '-- Select a provider --' : 'Select a listing first'}</option>
                      {options.map((row) => (
                        <option key={row.service_id} value={row.service_id}>
                          {row.provider_name} - Est. KSh {row.estimated_total}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-6">
                      <label className="form-label fw-semibold text-muted small">Quantity</label>
                      <input type="number" className="form-control form-control-custom" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 100" />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold text-muted small">Schedule date</label>
                      <input type="date" className="form-control form-control-custom" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                    </div>
                  </div>

                  <button className="btn btn-success w-100 rounded-pill fw-bold py-2 shadow-sm mt-auto" type="submit" disabled={submitting || !selectedOption}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Processing...</> : 'Submit request'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null}

        <div className={`col-12 ${isProvider ? 'col-lg-12' : 'col-lg-7'} d-flex flex-column`}>
          <div className="card border-0 shadow-sm rounded-4 flex-grow-1 overflow-hidden">
            <div className="card-header bg-white border-bottom-0 pt-4 px-4 pb-3">
              <h5 className="fw-bold text-dark mb-0">{title}</h5>
            </div>

            <div className="card-body p-0">
              {requests.length === 0 ? (
                <div className="text-center py-5 text-muted px-4">
                  <h6 className="fw-bold text-dark">No active requests</h6>
                  <p className="small mb-0">{isProvider ? 'No requests are assigned to your provider account.' : 'Create a transport request to start tracking deliveries.'}</p>
                </div>
              ) : (
                <div className="table-responsive px-4 pb-3">
                  <table className="table table-hover table-custom mb-0">
                    <thead>
                      <tr>
                        <th>Req ID</th>
                        <th>Provider & Service</th>
                        {isProvider ? <th>Requester</th> : null}
                        <th>Qty</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((row) => (
                        <tr key={row.id}>
                          <td className="fw-semibold text-secondary">#{row.id}</td>
                          <td>
                            <div className="fw-bold text-dark">{row.provider}</div>
                            <div className="small text-muted">{row.service}</div>
                          </td>
                          {isProvider ? <td className="fw-medium">{row.farmer}</td> : null}
                          <td className="fw-medium">{row.quantity ?? '—'}</td>
                          <td>{getStatusBadge(row.status)}</td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              {isProvider || isAdmin ? (
                                <>
                                  {row.status === 'pending' ? (
                                    <button className="btn btn-sm btn-info rounded-pill px-3 shadow-sm fw-semibold" onClick={() => changeStatus(row.id, 'accepted')}>
                                      Accept
                                    </button>
                                  ) : null}
                                  {row.status === 'accepted' ? (
                                    <button className="btn btn-sm btn-success rounded-pill px-3 shadow-sm fw-semibold" onClick={() => changeStatus(row.id, 'completed')}>
                                      Complete
                                    </button>
                                  ) : null}
                                  {row.status !== 'cancelled' && row.status !== 'completed' ? (
                                    <button className="btn btn-sm btn-light border text-danger rounded-pill px-3 shadow-sm fw-semibold hover-lift" onClick={() => changeStatus(row.id, 'cancelled')}>
                                      Cancel
                                    </button>
                                  ) : (
                                    <span className="text-muted small fst-italic">—</span>
                                  )}
                                </>
                              ) : (
                                <>
                                  {row.status !== 'cancelled' && row.status !== 'completed' ? (
                                    <button className="btn btn-sm btn-light border text-danger rounded-pill px-3 shadow-sm fw-semibold hover-lift" onClick={() => changeStatus(row.id, 'cancelled')}>
                                      Cancel
                                    </button>
                                  ) : (
                                    <span className="text-muted small fst-italic">—</span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

