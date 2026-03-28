import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteMessageAsAdmin, fetchAdminMetrics } from '../lib/api';

export default function AdminRecentMessages() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAdminMetrics()
      .then((d) => {
        if (!mounted) return;
        setMessages(d?.recent?.messages || []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.detail || 'Failed to load recent messages');
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  async function handleDeleteMessage(id) {
    setError('');
    try {
      await deleteMessageAsAdmin(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to delete message');
    }
  }

  return (
    <div className="container py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 mb-0">Recent Messages</h2>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/admin-dashboard')}>
          Back to Dashboard
        </button>
      </div>

      {error ? <div className="alert alert-danger py-2">{error}</div> : null}
      {loading ? <div>Loading recent messages...</div> : null}

      {!loading && messages.length === 0 ? (
        <div className="text-muted">No recent messages.</div>
      ) : null}

      {!loading && messages.length > 0 ? (
        <div className="card app-card">
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Channel</th>
                  <th>Sender</th>
                  <th>Time</th>
                  <th>Body</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id}>
                    <td>#{m.id}</td>
                    <td>{m.conversation__channel}</td>
                    <td>{m.sender__username || 'external'}</td>
                    <td>{m.created_at ? new Date(m.created_at).toLocaleString() : '—'}</td>
                    <td style={{ maxWidth: 420 }} className="text-truncate">{String(m.body || '')}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteMessage(m.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
