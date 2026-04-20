import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchOrders, resolveOrderComplaintAsAdmin, updateOrder } from '../lib/api';
import AdminOrderResolutionModal from '../components/AdminOrderResolutionModal';
import MessageModal from '../components/MessageModal';
import OrderComplaintModal from '../components/OrderComplaintModal';
import producePlaceholder from '../assets/produce-placeholder.svg';

function statusBadge(order) {
  const label = order.status_label || order.status;
  if (order.status === 'cart') return <span className="badge bg-warning-subtle text-warning border border-warning-subtle">{label}</span>;
  if (order.status === 'pending') return <span className="badge bg-info-subtle text-info border border-info-subtle">{label}</span>;
  if (order.status === 'approved') return <span className="badge bg-success-subtle text-success border border-success-subtle">{label}</span>;
  return <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">{label}</span>;
}

export default function OrdersPage() {
  const { user } = useContext(AuthContext);
  const isAdmin = !!(user && (user.is_staff || user.is_superuser || user?.privileges?.is_admin || user.role === 'admin'));
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftQty, setDraftQty] = useState({});
  const [openChat, setOpenChat] = useState(false);
  const [chatUserId, setChatUserId] = useState(null);
  const [chatName, setChatName] = useState('');
  const [complaintOrder, setComplaintOrder] = useState(null);
  const [adminResolveOrder, setAdminResolveOrder] = useState(null);

  async function loadOrders() {
    const rows = await fetchOrders();
    setOrders(rows || []);
    setDraftQty(Object.fromEntries((rows || []).map((row) => [row.id, String(row.quantity ?? '')])));
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    loadOrders()
      .catch((err) => mounted && setError(err?.response?.data?.detail || 'Failed to load orders'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const cartOrders = useMemo(() => orders.filter((order) => order.buyer === user?.id && order.status === 'cart'), [orders, user]);
  const buyerOrders = useMemo(() => orders.filter((order) => order.buyer === user?.id && order.status !== 'cart'), [orders, user]);
  const incomingOrders = useMemo(() => orders.filter((order) => order.seller === user?.id && order.status !== 'cart'), [orders, user]);
  const allOrders = useMemo(() => orders, [orders]);

  async function applyAction(orderId, payload, message) {
    setError('');
    try {
      await updateOrder(orderId, payload);
      await loadOrders();
    } catch (err) {
      setError(err?.response?.data?.detail || message);
    }
  }

  function openConversation(otherUserId, displayName) {
    setChatUserId(otherUserId);
    setChatName(displayName);
    setOpenChat(true);
  }

  async function resolveComplaint(payload) {
    setError('');
    try {
      await resolveOrderComplaintAsAdmin(adminResolveOrder.id, payload);
      await loadOrders();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not resolve complaint');
      throw err;
    }
  }

  if (loading) return <div>Loading orders...</div>;

  if (isAdmin) {
    return (
      <div className="container py-2">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h2 className="h4 mb-1">Orders</h2>
            <div className="text-muted small">View and manage all marketplace orders across the platform.</div>
          </div>
          <div className="text-muted small">Total orders: {allOrders.length}</div>
        </div>

        {error ? <div className="alert alert-danger">{error}</div> : null}

        <div className="card app-card">
          <div className="card-body">
            <h5 className="mb-3">All Platform Orders</h5>
            {allOrders.length === 0 ? (
              <div className="text-muted small">No orders available.</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {allOrders.map((order) => (
                  <div key={order.id} className="border rounded p-3">
                    <div className="d-flex flex-column flex-lg-row gap-3">
                      <img src={order.produce_image || producePlaceholder} alt={order.crop} style={{ width: 112, height: 112, objectFit: 'cover', borderRadius: 12 }} />
                      <div className="flex-grow-1">
                        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                          <div>
                            <div className="fw-bold">Order #{order.id} - {order.crop}</div>
                            <div className="small text-muted">
                              Buyer: {order.buyer_username} | Seller: {order.listing_owner}
                            </div>
                            <div className="small text-muted">
                              Quantity: {order.quantity} {order.unit} | Total: KSh {order.total_price}
                            </div>
                          </div>
                          {statusBadge(order)}
                        </div>

                        {order.complaint_open ? (
                          <div className="alert alert-warning py-2 mb-2">
                            <div className="fw-semibold">{order.complaint_subject || 'Complaint'}</div>
                            <div className="small">Filed by: {order.complaint_filed_by_username || 'Unknown'}</div>
                            <div className="small">{order.complaint_message}</div>
                          </div>
                        ) : null}

                        {!order.complaint_open && order.complaint_resolution ? (
                          <div className="alert alert-success py-2 mb-2">
                            <div className="small">Resolved by {order.complaint_resolved_by_username || 'Admin'}: {order.complaint_resolution}</div>
                          </div>
                        ) : null}

                        <div className="d-flex flex-wrap gap-2">
                          {order.status === 'pending' ? (
                            <button className="btn btn-sm btn-success" onClick={() => applyAction(order.id, { action: 'approve' }, 'Could not approve order')}>
                              Approve order
                            </button>
                          ) : null}
                          {order.status !== 'cancelled' ? (
                            <button className="btn btn-sm btn-outline-danger" onClick={() => applyAction(order.id, { action: 'cancel' }, 'Could not cancel order')}>
                              Cancel order
                            </button>
                          ) : null}
                          {order.complaint_open ? (
                            <button className="btn btn-sm btn-outline-warning" onClick={() => setAdminResolveOrder(order)}>
                              Resolve complaint
                            </button>
                          ) : null}
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openConversation(order.buyer, order.buyer_username)}>
                            Chat buyer
                          </button>
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openConversation(order.seller, order.listing_owner)}>
                            Chat seller
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <MessageModal
          open={openChat}
          onClose={() => setOpenChat(false)}
          otherUserId={chatUserId}
          displayName={chatName}
        />
        <AdminOrderResolutionModal
          open={!!adminResolveOrder}
          onClose={() => setAdminResolveOrder(null)}
          order={adminResolveOrder}
          onSubmit={resolveComplaint}
        />
      </div>
    );
  }

  return (
    <div className="container py-2">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Orders</h2>
          <div className="text-muted small">Manage your cart, pending orders, completed orders, complaints, and incoming approvals.</div>
        </div>
        <div className="text-muted small">Cart: {cartOrders.length} | Buying: {buyerOrders.length} | Incoming: {incomingOrders.length}</div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="row g-4">
        <div className="col-12 col-xl-6">
          <div className="card app-card mb-4">
            <div className="card-body">
              <h5 className="mb-3">My Cart</h5>
              {cartOrders.length === 0 ? (
                <div className="text-muted small">No products in cart.</div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {cartOrders.map((order) => (
                    <div key={order.id} className="border rounded p-3">
                      <div className="d-flex gap-3">
                        <img src={order.produce_image || producePlaceholder} alt={order.crop} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 12 }} />
                        <div className="flex-grow-1">
                          <div className="fw-bold">{order.crop}</div>
                          <div className="small text-muted mb-2">Seller: {order.listing_owner} | Market: {order.market || 'N/A'}</div>
                          <div className="row g-2 align-items-end">
                            <div className="col-6">
                              <label className="form-label small">Quantity</label>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={draftQty[order.id] ?? ''}
                                onChange={(e) => setDraftQty((prev) => ({ ...prev, [order.id]: e.target.value }))}
                              />
                            </div>
                            <div className="col-6">
                              <div className="small text-muted">Estimated total</div>
                              <div className="fw-semibold">KSh {order.total_price}</div>
                            </div>
                          </div>
                          <div className="d-flex flex-wrap gap-2 mt-3">
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => applyAction(order.id, { quantity: draftQty[order.id] }, 'Could not update cart quantity')}
                            >
                              Update qty
                            </button>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => applyAction(order.id, { action: 'submit' }, 'Could not submit order')}
                            >
                              Place order
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => applyAction(order.id, { action: 'cancel' }, 'Could not remove cart item')}
                            >
                              Remove
                            </button>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openConversation(order.seller, order.listing_owner)}
                            >
                              Chat seller
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card app-card">
            <div className="card-body">
              <h5 className="mb-3">My Orders</h5>
              {buyerOrders.length === 0 ? (
                <div className="text-muted small">You have not placed any orders yet.</div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {buyerOrders.map((order) => (
                    <div key={order.id} className="border rounded p-3">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div>
                          <div className="fw-bold">{order.crop} - {order.quantity} {order.unit}</div>
                          <div className="small text-muted">Seller: {order.listing_owner} | Total: KSh {order.total_price}</div>
                        </div>
                        {statusBadge(order)}
                      </div>
                      {order.complaint_open ? (
                        <div className="small text-danger mb-2">
                          Complaint: <strong>{order.complaint_subject || 'Complaint'}</strong> - {order.complaint_message}
                        </div>
                      ) : null}
                      {!order.complaint_open && order.complaint_resolution ? (
                        <div className="small text-success mb-2">
                          Admin decision: {order.complaint_resolution}
                        </div>
                      ) : null}
                      <div className="d-flex flex-wrap gap-2">
                        {order.status !== 'cancelled' ? (
                          <button className="btn btn-sm btn-outline-danger" onClick={() => applyAction(order.id, { action: 'cancel' }, 'Could not cancel order')}>
                            Cancel order
                          </button>
                        ) : null}
                        <button
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => setComplaintOrder(order)}
                        >
                          Send complaint
                        </button>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => openConversation(order.seller, order.listing_owner)}>
                          Chat seller
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div className="card app-card">
            <div className="card-body">
              <h5 className="mb-3">Incoming Order Requests</h5>
              {incomingOrders.length === 0 ? (
                <div className="text-muted small">No incoming order requests yet.</div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {incomingOrders.map((order) => (
                    <div key={order.id} className="border rounded p-3">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div>
                          <div className="fw-bold">{order.crop} - {order.quantity} {order.unit}</div>
                          <div className="small text-muted">Buyer: {order.buyer_username} | Total: KSh {order.total_price}</div>
                        </div>
                        {statusBadge(order)}
                      </div>
                      {order.complaint_open ? (
                        <div className="small text-danger mb-2">
                          Complaint filed by {order.complaint_filed_by_username || 'a user'}: <strong>{order.complaint_subject || 'Complaint'}</strong> - {order.complaint_message}
                        </div>
                      ) : null}
                      {!order.complaint_open && order.complaint_resolution ? (
                        <div className="small text-success mb-2">
                          Admin decision: {order.complaint_resolution}
                        </div>
                      ) : null}
                      <div className="d-flex flex-wrap gap-2">
                        {order.status === 'pending' ? (
                          <button className="btn btn-sm btn-success" onClick={() => applyAction(order.id, { action: 'approve' }, 'Could not approve order')}>
                            Approve order
                          </button>
                        ) : null}
                        {order.status !== 'cancelled' ? (
                          <button className="btn btn-sm btn-outline-danger" onClick={() => applyAction(order.id, { action: 'cancel' }, 'Could not cancel order')}>
                            Cancel order
                          </button>
                        ) : null}
                        <button className="btn btn-sm btn-outline-warning" onClick={() => setComplaintOrder(order)}>
                          File complaint
                        </button>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => openConversation(order.buyer, order.buyer_username)}>
                          Chat buyer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MessageModal
        open={openChat}
        onClose={() => setOpenChat(false)}
        otherUserId={chatUserId}
        displayName={chatName}
      />
      <OrderComplaintModal
        open={!!complaintOrder}
        onClose={() => setComplaintOrder(null)}
        order={complaintOrder}
        onSubmit={(payload) => applyAction(complaintOrder.id, { action: 'complain', ...payload }, 'Could not submit complaint')}
      />
    </div>
  );
}
