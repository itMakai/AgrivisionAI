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
      } catch (_e) {}
    };
    return () => { ws.close(); wsRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  function openConversation(conv) {
    setOpenConversationId(conv.id);
    setOpenName(labelFor(conv));
    setUnread((prev) => { const next = { ...prev }; delete next[conv.id]; return next; });
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

  if (loading) return <div className="text-muted">Loading conversations...</div>;

  return (
    <div>
      <h2 className="h4 mb-3">Inbox</h2>
      {conversations.length === 0 ? (
        <div className="text-muted">No conversations yet. Start one from a profile or marketplace page.</div>
      ) : (
        <div className="list-group">
          {conversations.map((c) => {
            const last = lastMessage(c);
            const badge = unread[c.id];
            return (
              <button
                key={c.id}
                type="button"
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                onClick={() => openConversation(c)}
              >
                <div className="text-start">
                  <div className="fw-semibold d-flex align-items-center gap-2">
                    {labelFor(c)}
                    {badge ? <span className="badge bg-primary rounded-pill">{badge}</span> : null}
                  </div>
                  {last && (
                    <div className="small text-muted text-truncate" style={{ maxWidth: 280 }}>
                      {last.body}
                    </div>
                  )}
                  <div className="small text-muted">{c.channel}</div>
                </div>
                <span className="btn btn-sm btn-outline-primary">Open</span>
              </button>
            );
          })}
        </div>
      )}
      <MessageModal
        open={!!openConversationId}
        onClose={() => setOpenConversationId(null)}
        conversationId={openConversationId}
        displayName={openName}
      />
    </div>
  );
}
