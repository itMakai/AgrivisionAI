import React, { useContext, useEffect, useRef, useState } from 'react';
import { fetchConversations, openNotificationsSocket } from '../lib/api';
import MessageModal from '../components/MessageModal';
import { AuthContext } from '../context/AuthContext';

export default function InboxPage() {
  const { user, isAuth } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openConversationId, setOpenConversationId] = useState(null);
  const [openName, setOpenName] = useState(null);
  const [unread, setUnread] = useState({});
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const wsRef = useRef(null);

  function reload() {
    fetchConversations()
      .then((data) => setConversations(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!isAuth) return;
    const ws = openNotificationsSocket();
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        const { conversation_id } = notification;
        setUnread((prev) =>
          conversation_id && openConversationId !== conversation_id
            ? { ...prev, [conversation_id]: (prev[conversation_id] || 0) + 1 }
            : prev,
        );
        reload();
      } catch {
        // Ignore malformed notification payloads.
      }
    };
    return () => { ws.close(); wsRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  function openConversation(conv) {
    setOpenConversationId(conv.id);
    setOpenName(labelFor(conv));
    setUnread((prev) => { const next = { ...prev }; delete next[conv.id]; return next; });
  }

  function isMine(msg) {
    const sender = typeof msg?.sender === 'object' ? msg.sender : null;
    if (sender?.id) return String(sender.id) === String(user?.id);
    return !msg?.inbound;
  }

  function labelFor(c) {
    const parts = c?.participants || [];
    const other = parts.find((p) => p?.username && p.username !== user?.username);
    if (c?.channel === 'internal' && other?.username) return other.username;
    return c?.phone || 'Conversation';
  }

  function lastMessage(c) {
    const msgs = c?.messages || [];
    return msgs.length ? msgs[msgs.length - 1] : null;
  }

  function isUnreplied(c) {
    const last = lastMessage(c);
    if (!last) return false;
    return !isMine(last);
  }

  const filtered = (conversations || []).filter((c) => {
    const label = labelFor(c).toLowerCase();
    const preview = String(lastMessage(c)?.body || '').toLowerCase();
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || label.includes(q) || preview.includes(q);
    const unreadCount = unread[c.id] || 0;

    if (!matchesSearch) return false;
    if (tab === 'unread') return unreadCount > 0;
    if (tab === 'unreplied') return isUnreplied(c);
    return true;
  });

  const unreadChats = conversations.filter((c) => (unread[c.id] || 0) > 0).length;
  const unrepliedChats = conversations.filter((c) => isUnreplied(c)).length;

  if (loading) return <div className="text-muted">Loading conversations...</div>;

  return (
    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
      <div className="p-3 p-md-4 border-bottom bg-white">
        <h2 className="h4 mb-2">Inbox</h2>
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6">
            <input
              className="form-control"
              placeholder="Search chats"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <div className="d-flex gap-2 justify-content-md-end">
              <button className={`btn btn-sm ${tab === 'all' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setTab('all')}>
                Current chats ({conversations.length})
              </button>
              <button className={`btn btn-sm ${tab === 'unread' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setTab('unread')}>
                Unread ({unreadChats})
              </button>
              <button className={`btn btn-sm ${tab === 'unreplied' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setTab('unreplied')}>
                Unreplied ({unrepliedChats})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 p-md-4" style={{ minHeight: 420, background: '#f8fafc' }}>
      {filtered.length === 0 ? (
        <div className="text-muted">No conversations yet. Start one from a profile or marketplace page.</div>
      ) : (
        <div className="list-group list-group-flush">
          {filtered.map((c) => {
            const last = lastMessage(c);
            const badge = unread[c.id];
            const unreplied = isUnreplied(c);
            return (
              <button
                key={c.id}
                type="button"
                className="list-group-item list-group-item-action border-0 rounded-3 mb-2 shadow-sm"
                onClick={() => openConversation(c)}
              >
                <div className="d-flex align-items-start justify-content-between gap-3 text-start">
                  <div className="d-flex align-items-start gap-3">
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#0f6b4b,#0b5a3f)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      {labelFor(c).slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="fw-semibold d-flex align-items-center gap-2">
                        {labelFor(c)}
                        {unreplied ? <span className="badge text-bg-warning">Needs reply</span> : null}
                      </div>
                      {last && (
                        <div className="small text-muted text-truncate" style={{ maxWidth: 360 }}>
                          {last.body}
                        </div>
                      )}
                      <div className="small text-muted">{c.channel}</div>
                    </div>
                  </div>
                  <div className="text-end">
                    {last?.created_at ? <div className="small text-muted mb-1">{new Date(last.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div> : null}
                    {badge ? <span className="badge bg-success rounded-pill">{badge}</span> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      </div>
      <MessageModal
        open={!!openConversationId}
        onClose={() => setOpenConversationId(null)}
        conversationId={openConversationId}
        displayName={openName}
        onConversationChanged={reload}
      />
    </div>
  );
}
