import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFarmers, fetchBuyers, getOrCreateConversationWithUser } from '../lib/api';
import MessageModal from '../components/MessageModal';
import { AuthContext } from '../context/AuthContext';

/**
 * New Messages page — replaced the old Twilio SMS/WhatsApp page.
 * Users can search for other platform users and open a real-time WebSocket chat.
 */
export default function MessagesPage() {
  const { user, isAuth } = useContext(AuthContext);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openConvId, setOpenConvId] = useState(null);
  const [openName, setOpenName] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchFarmers(), fetchBuyers()])
      .then(([farmers, buyers]) => {
        const all = [
          ...(farmers.results || farmers || []).map((f) => ({
            id: f.user_id || f.id,
            username: f.username || f.user,
            label: f.username || f.user,
            role: 'Farmer',
            location: f.location || '',
          })),
          ...(buyers.results || buyers || []).map((b) => ({
            id: b.user_id || b.id,
            username: b.username || b.user,
            label: b.username || b.user,
            role: 'Buyer',
            location: b.location || '',
          })),
        ];
        // Remove current user and deduplicate
        const seen = new Set();
        const filtered = all.filter((u) => {
          if (!u.id || seen.has(u.id) || u.username === user?.username) return false;
          seen.add(u.id);
          return true;
        });
        setUsers(filtered);
      })
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
  }, [user]);

  async function startChat(u) {
    try {
      const conv = await getOrCreateConversationWithUser(u.id);
      setOpenConvId(conv.id);
      setOpenName(u.label || u.username);
    } catch (_e) {
      setError('Could not start conversation');
    }
  }

  const filtered = search.trim()
    ? users.filter(
        (u) =>
          (u.label || '').toLowerCase().includes(search.toLowerCase()) ||
          (u.location || '').toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  return (
    <div>
      <h2 className="h3 fw-bold mb-3" style={{ color: 'var(--primary)' }}>Messages</h2>

      <div className="mb-3">
        <input
          className="form-control"
          placeholder="Search users by name or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="text-muted">Loading users…</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-muted">No users found.</div>
      )}

      <div className="list-group">
        {filtered.map((u) => (
          <div key={u.id} className="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-semibold">{u.label}</div>
              <div className="small text-muted">{u.role}{u.location ? ` · ${u.location}` : ''}</div>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => startChat(u)}>
              Chat
            </button>
          </div>
        ))}
      </div>

      <MessageModal
        open={!!openConvId}
        onClose={() => setOpenConvId(null)}
        conversationId={openConvId}
        displayName={openName}
      />
    </div>
  );
}
