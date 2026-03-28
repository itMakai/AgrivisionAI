import React, { useEffect, useState, useRef, useContext } from 'react';
import { deleteMessageById, fetchConversation, fetchConversationById, getOrCreateConversationWithUser, openChatSocket } from '../lib/api';
import { AuthContext } from '../context/AuthContext';

export default function MessageModal({ open, onClose, phone, displayName, conversationId: propConversationId, otherUserId, onConversationChanged }) {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const wsRef = useRef(null);
  const [conversationId, setConversationId] = useState(propConversationId || null);
  const [deletingId, setDeletingId] = useState(null);

  // Sync conversationId when prop changes
  useEffect(() => {
    setConversationId(propConversationId || null);
    setMessages([]);
  }, [propConversationId]);

  // Load history and open WebSocket when modal opens
  useEffect(() => {
    if (!open) {
      // Close existing socket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    async function loadAndConnect() {
      try {
        let convId = conversationId;

        // If we only have otherUserId, create/get the conversation first
        if (otherUserId && !convId) {
          const conv = await getOrCreateConversationWithUser(otherUserId);
          if (!mounted) return;
          convId = conv.id;
          setConversationId(convId);
        }

        // Load message history
        let data = null;
        if (convId) {
          data = await fetchConversationById(convId);
        } else if (phone) {
          data = await fetchConversation(phone);
          convId = data?.id;
          if (convId && mounted) setConversationId(convId);
        }
        if (mounted && data) setMessages(data.messages || []);
      } catch {
        // Ignore history load errors — the WS will still deliver new messages
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAndConnect();

    return () => { mounted = false; };
  }, [open, phone, otherUserId, conversationId]);

  // Connect WebSocket whenever we have a resolved conversationId and the modal is open
  useEffect(() => {
    if (!open || !conversationId) return;

    // Clean up any existing socket before opening a new one
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = openChatSocket(conversationId);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg?.type === 'message_deleted' && msg?.id) {
          setMessages((prev) => prev.filter((m) => m.id !== msg.id));
          return;
        }
        setMessages((prev) => {
          // Deduplicate by id (the server echoes our own sends back)
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch { /* ignore malformed frames */ }
    };

    ws.onerror = () => setError('Connection error. Messages may be delayed.');
    ws.onclose = (e) => {
      if (e.code === 4001) setError('Authentication required — please log in.');
      else if (e.code === 4003) setError('You do not have access to this conversation.');
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [open, conversationId]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  function handleSend(e) {
    e?.preventDefault();
    const text = body.trim();
    if (!text) return;

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ body: text }));
      setBody('');
      setError(null);
      onConversationChanged?.();
    } else {
      setError('Not connected. Please wait and try again.');
    }
  }

  async function handleDeleteMessage(id) {
    setError(null);
    setDeletingId(id);
    try {
      await deleteMessageById(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      onConversationChanged?.();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to delete message');
    } finally {
      setDeletingId(null);
    }
  }

  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle} className="border-bottom pb-2 mb-1">
          <div className="d-flex align-items-center gap-2">
            <div style={avatarStyle}>{String(displayName || phone || 'C').slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{displayName || phone || 'Chat'}</strong>
              <div style={{ fontSize: 12, color: '#64748b' }}>{conversationId ? 'Conversation active' : 'Opening conversation...'}</div>
            </div>
          </div>
          <button className="btn btn-sm btn-light" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-warning py-1 px-2 my-1" style={{ fontSize: 12 }}>{error}</div>}

        <div ref={listRef} style={listStyle}>
          {loading && <div className="text-muted small">Loading history…</div>}
          {messages.map((m, idx) => {
            const senderObj = typeof m.sender === 'object' ? m.sender : null;
            const senderId = senderObj?.id;
            const senderName = senderObj?.username || null;
            const isMine = senderId
              ? String(senderId) === String(user?.id)
              : !m.inbound;
            const canDelete = isMine || !!user?.is_staff;
            const senderLabel = senderName || (isMine ? (user?.username || 'You') : (displayName || 'Unknown sender'));

            return (
              <div key={m.id ?? idx} style={isMine ? messageRowRightStyle : messageRowLeftStyle}>
                <div style={isMine ? outboundStyle : inboundStyle}>
                  <div style={isMine ? senderMineStyle : senderOtherStyle}>
                    {senderLabel}
                  </div>
                  <div>{m.body}</div>
                  <div style={metaRowStyle}>
                    <div style={isMine ? timeMineStyle : timeOtherStyle}>
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                    {canDelete ? (
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0"
                        style={deleteBtnStyle}
                        onClick={() => handleDeleteMessage(m.id)}
                        disabled={deletingId === m.id}
                      >
                        {deletingId === m.id ? 'Deleting...' : 'Delete'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSend} style={{ marginTop: 8 }}>
          <div className="d-flex gap-2">
            <input
              className="form-control form-control-sm"
              placeholder="Type a message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
            />
            <button className="btn btn-primary btn-sm" type="submit">Send</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
};
const modalStyle = {
  width: 520, maxWidth: '96vw', maxHeight: '86vh', background: '#fff', borderRadius: 12,
  display: 'flex', flexDirection: 'column', padding: 16, gap: 4,
  boxShadow: '0 20px 48px rgba(15, 23, 42, 0.25)',
};
const avatarStyle = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #0f6b4b, #0b5a3f)',
  color: '#fff',
  fontWeight: 700,
};
const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
};
const listStyle = {
  flex: 1, overflowY: 'auto', marginTop: 8, padding: 8,
  background: 'linear-gradient(180deg, #f1f5f9, #f8fafc)', borderRadius: 10, minHeight: 160, maxHeight: 480,
  display: 'flex', flexDirection: 'column', gap: 8,
};
const messageRowLeftStyle = {
  display: 'flex', justifyContent: 'flex-start',
};
const messageRowRightStyle = {
  display: 'flex', justifyContent: 'flex-end',
};
const inboundStyle = {
  background: '#fff', border: '1px solid #e2e8f0', padding: '6px 10px',
  borderRadius: '4px 12px 12px 12px', maxWidth: '82%',
};
const outboundStyle = {
  background: 'linear-gradient(135deg, #0f6b4b, #0b5a3f)', color: '#fff', padding: '6px 10px',
  borderRadius: '12px 4px 12px 12px', maxWidth: '82%', textAlign: 'right',
};
const senderOtherStyle = {
  fontSize: 12, color: '#475569', marginBottom: 3, fontWeight: 600,
};
const senderMineStyle = {
  fontSize: 12, color: 'rgba(255,255,255,0.9)', marginBottom: 3, fontWeight: 600,
};
const timeOtherStyle = {
  fontSize: 11, color: '#64748b', marginTop: 4,
};
const timeMineStyle = {
  fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 4,
};
const metaRowStyle = {
  marginTop: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};
const deleteBtnStyle = {
  color: '#94a3b8',
  textDecoration: 'none',
  fontSize: 11,
};


