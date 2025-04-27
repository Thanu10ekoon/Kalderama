import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function OwnerDashboard({ owner, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [currentOrders, setCurrentOrders] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [error, setError] = useState('');
  const [foodForm, setFoodForm] = useState({ name: '', price: '', quantity: '' });
  const [foodMsg, setFoodMsg] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/owner/orders`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setCurrentOrders(data.currentOrders || []);
        setPastOrders(data.pastOrders || []);
        setLoadingOrders(false);
      })
      .catch(err => {
        setError(err.message);
        setLoadingOrders(false);
      });
    fetch(`${API_BASE}/api/owner/foods`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setFoods(data);
        setLoadingFoods(false);
      })
      .catch(err => {
        setError(err.message);
        setLoadingFoods(false);
      });
  }, []);

  const handleFoodChange = e => {
    setFoodForm({ ...foodForm, [e.target.name]: e.target.value });
  };

  const handleAddFood = async e => {
    e.preventDefault();
    setFoodMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/owner/foods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: foodForm.name,
          price: parseFloat(foodForm.price),
          quantity: parseInt(foodForm.quantity, 10)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add food');
      setFoodMsg('Food added successfully!');
      setFoodForm({ name: '', price: '', quantity: '' });
      // Refresh foods
      const foodsRes = await fetch(`${API_BASE}/api/owner/foods`, { credentials: 'include' });
      setFoods(await foodsRes.json());
    } catch (err) {
      setFoodMsg(err.message);
    }
  };

  const handleMarkCompleted = async (orderId) => {
    await fetch(`${API_BASE}/api/owner/orders/${orderId}/complete`, {
      method: 'POST',
      credentials: 'include',
    });
    // Refresh orders
    setLoadingOrders(true);
    fetch(`${API_BASE}/api/owner/orders`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setCurrentOrders(data.currentOrders || []);
        setPastOrders(data.pastOrders || []);
        setLoadingOrders(false);
      });
  };

  return (
    <div className="container py-4">
      <div className="glass-navbar d-flex justify-content-between align-items-center mb-3">
        <h2>Owner Dashboard</h2>
        <button className="btn btn-glass btn-outline-danger" onClick={onLogout}>Logout</button>
      </div>
      <div className="glass-card mb-4">
        <h4>Add New Food</h4>
        <form className="row g-2 align-items-end" onSubmit={handleAddFood} style={{ maxWidth: 500 }}>
          <div className="col-md-4">
            <input name="name" className="form-control" placeholder="Food Name" value={foodForm.name} onChange={handleFoodChange} required />
          </div>
          <div className="col-md-3">
            <input name="price" type="number" step="0.01" className="form-control" placeholder="Price" value={foodForm.price} onChange={handleFoodChange} required />
          </div>
          <div className="col-md-3">
            <input name="quantity" type="number" min="0" className="form-control" placeholder="Quantity" value={foodForm.quantity} onChange={handleFoodChange} required />
          </div>
          <div className="col-md-2">
            <button className="btn btn-glass btn-success w-100" type="submit">Add</button>
          </div>
        </form>
        {foodMsg && <div className="mt-2 alert alert-info">{foodMsg}</div>}
      </div>
      <div className="glass-card mb-4">
        <h4>All Foods</h4>
        {loadingFoods ? <div>Loading foods...</div> : (
          <div className="table-responsive">
            <table className="glass-table table table-bordered">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody>
                {foods.map(food => (
                  <tr key={food.id}>
                    <td>{food.name}</td>
                    <td>${Number(food.price).toFixed(2)}</td>
                    <td>{food.quantity}</td>
                    <td>{food.available ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="glass-card mb-4">
        <h4>Current Orders</h4>
        {loadingOrders && <div>Loading orders...</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {!loadingOrders && !error && (
          <div>
            {currentOrders.length === 0 ? <p>No current orders.</p> : (
              <div className="table-responsive">
                <table className="glass-table table table-bordered">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Created At</th>
                      <th>Items</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOrders.map(order => (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>{order.customer_name || '-'}</td>
                        <td>{new Date(order.created_at).toLocaleString()}</td>
                        <td>
                          <ul className="mb-0">
                            {order.items.map((item, idx) => (
                              <li key={idx}>{item.name} x{item.quantity} (${Number(item.price).toFixed(2)})</li>
                            ))}
                          </ul>
                        </td>
                        <td>
                          <button className="btn btn-glass btn-success btn-sm" onClick={() => handleMarkCompleted(order.id)}>Mark Completed</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="glass-card mb-4">
        <h4>Past Orders</h4>
        {pastOrders.length === 0 ? <p>No past orders.</p> : (
          <div className="table-responsive">
            <table className="glass-table table table-bordered">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Created At</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody>
                {pastOrders.map(order => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.customer_name || '-'}</td>
                    <td>{new Date(order.created_at).toLocaleString()}</td>
                    <td>
                      <ul className="mb-0">
                        {order.items.map((item, idx) => (
                          <li key={idx}>{item.name} x{item.quantity} (${Number(item.price).toFixed(2)})</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default OwnerDashboard;
