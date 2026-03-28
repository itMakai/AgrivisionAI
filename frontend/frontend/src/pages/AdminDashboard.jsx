import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createAdminManagedUser,
  deleteAdminManagedUser,
  deleteTransportRequestAsAdmin,
  fetchAdminMetrics,
  fetchAdminUsers,
  moderateTransportRequest,
  updateAdminManagedUser,
} from '../lib/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'farmer',
    phone_number: '',
    location: '',
    provider_name: '',
    offers_transport: true,
    offers_cold_storage: false,
  });

  function loadUsers() {
    return fetchAdminUsers().then((u) => setUsers(u?.results || []));
  }

  async function approveTransportRequest(id) {
    setError('');
    try {
      const updated = await moderateTransportRequest(id, { status: 'accepted' });
      setData((prev) => ({
        ...prev,
        recent: {
          ...(prev?.recent || {}),
          transport_requests: (prev?.recent?.transport_requests || []).map((r) =>
            r.id === id ? { ...r, status: updated.status } : r,
          ),
        },
      }));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to approve request');
    }
  }

  async function deleteTransportRequest(id) {
    setError('');
    try {
      await deleteTransportRequestAsAdmin(id);
      setData((prev) => ({
        ...prev,
        recent: {
          ...(prev?.recent || {}),
          transport_requests: (prev?.recent?.transport_requests || []).filter((r) => r.id !== id),
        },
      }));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to delete request');
    }
  }

  async function deactivateUser(id, isActive) {
    setError('');
    try {
      const updated = await updateAdminManagedUser(id, { is_active: !isActive });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_active: updated.is_active } : u)));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to update user status');
    }
  }

  async function deleteUser(id) {
    setError('');
    try {
      await deleteAdminManagedUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to delete user');
    }
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([fetchAdminMetrics(), fetchAdminUsers()])
      .then(([d, u]) => {
        if (!mounted) return;
        setData(d);
        setUsers(u?.results || []);
      })
      .catch((err) => mounted && setError(err?.response?.data?.detail || 'Failed to load admin metrics'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  async function handleCreateUser(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await createAdminManagedUser(form);
      setSuccess('User created successfully.');
      setForm({
        username: '',
        email: '',
        password: '',
        role: 'farmer',
        phone_number: '',
        location: '',
        provider_name: '',
        offers_transport: true,
        offers_cold_storage: false,
      });
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading admin dashboard...</div>;
  if (!data) return <div className="text-muted">No data.</div>;

  const totals = data.totals || {};
  const recent = data.recent || {};

  return (
    <div className="container py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 mb-0">Administration</h2>
        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/admin/recent-messages')}>
          Open Recent Messages
        </button>
      </div>
      {error ? <div className="alert alert-danger py-2">{error}</div> : null}

      <div className="row g-3 mb-4">
        {Object.entries(totals).map(([k, v]) => (
          <div key={k} className="col-6 col-lg-3">
            <div className="card app-card h-100">
              <div className="card-body">
                <div className="text-muted small text-uppercase">{k.replaceAll('_', ' ')}</div>
                <div className="fs-4 fw-bold">{v}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12">
          <div className="card app-card">
            <div className="card-body">
              <h6 className="mb-3">Recent transport requests</h6>
              {(recent.transport_requests || []).length === 0 ? (
                <div className="text-muted small">No recent transport requests.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Status</th>
                        <th>Farmer</th>
                        <th>Provider</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.transport_requests.map((r) => (
                        <tr key={r.id}>
                          <td>#{r.id}</td>
                          <td>{r.status}</td>
                          <td>{r.farmer__username}</td>
                          <td>{r.provider__name}</td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              {r.status === 'pending' ? (
                                <button className="btn btn-sm btn-outline-success" onClick={() => approveTransportRequest(r.id)}>Approve</button>
                              ) : null}
                              <button className="btn btn-sm btn-outline-danger" onClick={() => deleteTransportRequest(r.id)}>Delete</button>
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

      <div className="row g-3 mt-1">
        <div className="col-12 col-xl-5">
          <div className="card app-card">
            <div className="card-body">
              <h6 className="mb-3">Create user account</h6>
              {success ? <div className="alert alert-success py-2">{success}</div> : null}
              <form onSubmit={handleCreateUser} className="row g-2">
                <div className="col-12">
                  <input
                    className="form-control"
                    placeholder="Username"
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                    required
                  />
                </div>
                <div className="col-12">
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Temporary password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    required
                  />
                </div>
                <div className="col-12">
                  <select
                    className="form-select"
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  >
                    <option value="farmer">Farmer</option>
                    <option value="buyer">Buyer</option>
                    <option value="provider">Service Provider</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="col-12">
                  <input
                    className="form-control"
                    placeholder="Phone number"
                    value={form.phone_number}
                    onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <input
                    className="form-control"
                    placeholder="Location"
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  />
                </div>

                {form.role === 'provider' ? (
                  <>
                    <div className="col-12">
                      <input
                        className="form-control"
                        placeholder="Provider name"
                        value={form.provider_name}
                        onChange={(e) => setForm((p) => ({ ...p, provider_name: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="adminCreateOffersTransport"
                          checked={form.offers_transport}
                          onChange={(e) => setForm((p) => ({ ...p, offers_transport: e.target.checked }))}
                        />
                        <label className="form-check-label" htmlFor="adminCreateOffersTransport">Offers transport</label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="adminCreateOffersStorage"
                          checked={form.offers_cold_storage}
                          onChange={(e) => setForm((p) => ({ ...p, offers_cold_storage: e.target.checked }))}
                        />
                        <label className="form-check-label" htmlFor="adminCreateOffersStorage">Offers cold storage</label>
                      </div>
                    </div>
                  </>
                ) : null}

                <div className="col-12">
                  <button className="btn btn-success w-100" type="submit" disabled={saving}>
                    {saving ? 'Creating...' : 'Create user'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-7">
          <div className="card app-card">
            <div className="card-body">
              <h6 className="mb-3">Users and roles</h6>
              {users.length === 0 ? (
                <div className="text-muted small">No users found.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.username}</td>
                          <td className="text-capitalize">{u.role}</td>
                          <td>{u.email || '—'}</td>
                          <td>{u.is_active ? 'Active' : 'Disabled'}</td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => deactivateUser(u.id, u.is_active)}>
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => deleteUser(u.id)}>Delete</button>
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

