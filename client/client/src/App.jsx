import { useEffect, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || '';

function App({ user, onLogout }) {
  const [foods, setFoods] = useState([])
  const [order, setOrder] = useState([])
  const [message, setMessage] = useState('')
  const [orders, setOrders] = useState([])
  const [showOrders, setShowOrders] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/foods`)
      .then(res => res.json())
      .then(data => setFoods(data))
    if (user && user.username) {
      fetch(`${API_BASE}/api/customer/orders`, { credentials: 'include' })
        .then(async res => {
          if (!res.ok) return setOrders([])
          try {
            const data = await res.json()
            setOrders(Array.isArray(data) ? data : [])
          } catch {
            setOrders([])
          }
        })
    } else {
      setOrders([])
    }
  }, [user])

  const currentOrders = orders.filter(order => !order.completed)
  const pastOrders = orders.filter(order => order.completed)

  const handleAddToOrder = (food, quantity) => {
    if (!quantity || quantity < 1) return;
    setOrder(prev => {
      const idx = prev.findIndex(item => item.id === food.id)
      if (idx !== -1) {
        const updated = [...prev]
        updated[idx].quantity = Math.min(updated[idx].quantity + quantity, food.quantity)
        return updated
      }
      return [...prev, { ...food, quantity }]
    })
  }

  const handleOrder = async () => {
    const res = await fetch(`${API_BASE}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ items: order })
    })
    const data = await res.json()
    setMessage(data.message)
    setOrder([])
    fetch(`${API_BASE}/api/foods`)
      .then(res => res.json())
      .then(data => setFoods(data))
    // Refresh orders
    fetch(`${API_BASE}/api/customer/orders`, { credentials: 'include' })
      .then(async res => {
        if (!res.ok) return setOrders([])
        try {
          const data = await res.json()
          setOrders(Array.isArray(data) ? data : [])
        } catch {
          setOrders([])
        }
      })
  }

  const handleQuantityChange = (foodId, value) => {
    setFoods(foods => foods.map(f => f.id === foodId ? { ...f, orderQuantity: value } : f))
  }

  const handleLogout = async () => {
    await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' })
    onLogout()
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-column align-items-center mb-5">
        <div className="glass-navbar w-100 d-flex flex-column align-items-center" style={{maxWidth: 900}}>
          <h1 className="display-4 fw-bold mb-0" style={{letterSpacing: 1}}>Kalderama</h1>
          <div className="d-flex flex-column flex-md-row align-items-center justify-content-center w-100 mt-3 gap-2">
            {user && <>
              <span className="fs-5 mb-1 mb-md-0" style={{fontWeight: 400, minWidth: 120, textAlign: 'center'}}>Hello, {user.username}</span>
              <button className="btn btn-glass" onClick={() => setShowOrders(v => !v)}>
                {showOrders ? 'Hide' : 'Show'} My Orders
              </button>
              <button className="btn btn-glass btn-danger" onClick={handleLogout}>Logout</button>
            </>}
          </div>
        </div>
      </div>
      {!showOrders && <>
        <h2>Available Food</h2>
        <div className="row">
          {foods.map(food => (
            <div className="col-md-4 mb-3" key={food.id}>
              <div className="glass-card card">
                <div className="card-body">
                  <h5 className="card-title">{food.name}</h5>
                  <p className="card-text">${Number(food.price).toFixed(2)}<br/>Available: {food.quantity}</p>
                  <div className="input-group mb-2">
                    <input type="number" min="1" max={food.quantity} className="form-control" placeholder="Qty" value={food.orderQuantity || ''} onChange={e => handleQuantityChange(food.id, Math.max(1, Math.min(food.quantity, parseInt(e.target.value) || 1)))} disabled={!food.available || food.quantity === 0} />
                    <button className="btn btn-glass btn-primary" disabled={!food.available || food.quantity === 0} onClick={() => handleAddToOrder(food, food.orderQuantity ? parseInt(food.orderQuantity) : 1)}>
                      {food.available && food.quantity > 0 ? 'Add to Order' : 'Not Available'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <h2 className="mt-4">Take-away Order</h2>
        {order.length === 0 ? <p>No items in order.</p> : (
          <ul className="list-group mb-3">
            {order.map((item, idx) => (
              <li className="list-group-item" key={idx}>{item.name} - ${Number(item.price).toFixed(2)} x{item.quantity}</li>
            ))}
          </ul>
        )}
        <button className="btn btn-glass btn-success mb-3" disabled={order.length === 0} onClick={handleOrder}>Place Order</button>
        {message && <div className="alert alert-info">{message}</div>}
      </>}
      {showOrders && <>
        <div className="glass-card mb-4">
          <h2>My Orders</h2>
          <h4>Current Orders</h4>
          {currentOrders.length === 0 ? <p>No current orders.</p> : (
            <div className="table-responsive">
              <table className="glass-table table table-bordered">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Items</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrders.map(order => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
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
          <h4 className="mt-4">Past Orders</h4>
          {pastOrders.length === 0 ? <p>No past orders.</p> : (
            <div className="table-responsive">
              <table className="glass-table table table-bordered">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Items</th>
                  </tr>
                </thead>
                <tbody>
                  {pastOrders.map(order => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
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
          <button className="btn btn-glass btn-secondary mt-3" onClick={() => setShowOrders(false)}>Back to Menu</button>
        </div>
      </>}
    </div>
  )
}

export default App
