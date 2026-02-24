import { useEffect, useState } from 'react';
import {
  createTransportRequest,
  fetchListings,
  fetchMarkets,
  fetchTransportOptions,
  fetchTransportRequests,
  updateTransportRequestStatus,
} from '../lib/api';

export default function TransportPage() {
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

  async function loadAll() {
    setLoading(true);
    try {
      const [listingData, requestData, marketData] = await Promise.all([
        fetchListings({ owner: 'me' }),
        fetchTransportRequests(),
        fetchMarkets(),
      ]);
      const listingRows = listingData?.results || listingData || [];
      setListings(listingRows);
      setRequests(requestData || []);
      setMarkets(marketData?.results || marketData || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll().catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedListing) {
      setOptions([]);
      return;
    }

    fetchTransportOptions({ listing_id: selectedListing })
      .then((rows) => setOptions(rows || []))
      .catch(() => setOptions([]));
  }, [selectedListing]);

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
      setQuantity('');
      setScheduledDate('');
      await loadAll();
    } catch (err) {
      // no-op; backend returns validation details
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(id, status) {
    await updateTransportRequestStatus(id, status);
    await loadAll();
  }

  if (loading) {
    return <div className="text-muted">Loading transport coordination…</div>;
  }

  return (
    <div>
      <h2 className="h4 mb-3">Transport Coordination</h2>

      <div className="row g-3">
        <div className="col-12 col-lg-5">
          <div className="card app-card p-3 h-100">
            <h5 className="mb-3">Create Transport Request</h5>

            <form onSubmit={handleCreateRequest}>
              <div className="mb-2">
                <label className="form-label small">Source Listing</label>
                <select className="form-select" value={selectedListing} onChange={(e) => setSelectedListing(e.target.value)} required>
                  <option value="">Select listing</option>
                  {listings.map((row) => (
                    <option key={row.id} value={row.id}>
                      #{row.id} · {row.crop} · {row.quantity}{row.unit} · KSh {row.price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-2">
                <label className="form-label small">Market</label>
                <select className="form-select" value={selectedMarket} onChange={(e) => setSelectedMarket(e.target.value)}>
                  <option value="">Use listing market</option>
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-2">
                <label className="form-label small">Transport Provider Option</label>
                <select className="form-select" value={selectedOption} onChange={(e) => setSelectedOption(e.target.value)} required>
                  <option value="">Select provider option</option>
                  {options.map((row) => (
                    <option key={row.service_id} value={row.service_id}>
                      {row.provider_name} · est KSh {row.estimated_total}
                    </option>
                  ))}
                </select>
              </div>

              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label small">Quantity</label>
                  <input className="form-control" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 1200" />
                </div>
                <div className="col-6">
                  <label className="form-label small">Schedule Date</label>
                  <input type="date" className="form-control" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                </div>
              </div>

              <div className="mt-3 text-end">
                <button className="btn btn-success" type="submit" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Request Transport'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <div className="card app-card p-3 h-100">
            <h5 className="mb-3">My Transport Requests</h5>
            {requests.length === 0 ? (
              <div className="text-muted small">No transport requests yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Provider</th>
                      <th>Service</th>
                      <th>Qty</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.provider}</td>
                        <td>{row.service}</td>
                        <td>{row.quantity ?? '—'}</td>
                        <td><span className="badge text-bg-light border">{row.status}</span></td>
                        <td>
                          <div className="d-flex gap-1">
                            {row.status !== 'cancelled' && row.status !== 'completed' && (
                              <button className="btn btn-sm btn-outline-danger" onClick={() => changeStatus(row.id, 'cancelled')}>
                                Cancel
                              </button>
                            )}
                            {row.status === 'accepted' && (
                              <button className="btn btn-sm btn-outline-success" onClick={() => changeStatus(row.id, 'completed')}>
                                Complete
                              </button>
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
  );
}
