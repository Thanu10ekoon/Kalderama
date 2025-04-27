const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const session = require('express-session');

const app = express();
const PORT = 5000;

const db = mysql.createPool({
  host: 'bp2juxysn0nszxvmkkzj-mysql.services.clever-cloud.com',
  user: 'udflccbdblfustx7',
  password: 'qgnCvYDdKjXJIfaLe8hL',
  database: 'bp2juxysn0nszxvmkkzj',
});

const allowedOrigins = [
  'http://localhost:5173',
  'https://kalderama.vercel.app', // your Vercel frontend URL
  'https://your-custom-domain.com' // add your custom domain if any
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: 'kalderama_secret',
  resave: false,
  saveUninitialized: true,
}));

// Signup endpoint for both roles
app.post('/api/signup', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ message: 'Username, password, and role required' });
  try {
    if (role === 'owner') {
      await db.query('INSERT INTO owners (username, password) VALUES (?, ?)', [username, password]);
    } else if (role === 'customer') {
      await db.query('INSERT INTO Kalderamausers (username, password) VALUES (?, ?)', [username, password]);
    } else {
      return res.status(400).json({ message: 'Invalid role' });
    }
    res.json({ message: 'Signup successful' });
  } catch (err) {
    res.status(400).json({ message: 'Signup failed', error: err.message });
  }
});

// Login endpoint for both roles
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  // Check owner first
  let [rows] = await db.query('SELECT * FROM owners WHERE username = ? AND password = ?', [username, password]);
  if (rows.length > 0) {
    req.session.userId = rows[0].id;
    req.session.role = 'owner';
    return res.json({ message: 'Login successful', role: 'owner', username });
  }
  // Check customer
  [rows] = await db.query('SELECT * FROM Kalderamausers WHERE username = ? AND password = ?', [username, password]);
  if (rows.length > 0) {
    req.session.userId = rows[0].id;
    req.session.role = 'customer';
    return res.json({ message: 'Login successful', role: 'customer', username });
  }
  return res.status(401).json({ message: 'Invalid credentials' });
});

// Get current user info
app.get('/api/me', (req, res) => {
  if (!req.session.userId || !req.session.role) return res.status(401).json({ message: 'Not logged in' });
  res.json({ userId: req.session.userId, role: req.session.role });
});

// Owner: add new food
app.post('/api/owner/foods', async (req, res) => {
  if (req.session.role !== 'owner') return res.status(403).json({ message: 'Only owners can add food' });
  const { name, price, quantity } = req.body;
  if (!name || !price || !Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({ message: 'Name, price, and quantity required' });
  }
  try {
    await db.query('INSERT INTO foods (name, price, available, quantity) VALUES (?, ?, ?, ?)', [name, price, quantity > 0, quantity]);
    res.json({ message: 'Food added successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to add food', error: err.message });
  }
});

// Owner: get all foods
app.get('/api/owner/foods', async (req, res) => {
  if (req.session.role !== 'owner') return res.status(403).json({ message: 'Only owners can view foods' });
  const [rows] = await db.query('SELECT * FROM foods');
  res.json(rows);
});

// Get available food from DB (quantity > 0)
app.get('/api/foods', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM foods WHERE available = TRUE AND quantity > 0');
  res.json(rows);
});

// Place a take-away order (customer only, with quantity)
app.post('/api/order', async (req, res) => {
  if (req.session.role !== 'customer') return res.status(403).json({ message: 'Only customers can order' });
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'No items in order.' });
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Check and update quantities
    for (const item of items) {
      const [foods] = await conn.query('SELECT quantity FROM foods WHERE id = ? FOR UPDATE', [item.id]);
      if (!foods.length || foods[0].quantity < item.quantity) {
        throw new Error(`Not enough quantity for ${item.name}`);
      }
      await conn.query('UPDATE foods SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.id]);
      // Optionally set available = false if quantity is now 0
      await conn.query('UPDATE foods SET available = FALSE WHERE id = ? AND quantity = 0', [item.id]);
    }
    const [orderResult] = await conn.query('INSERT INTO orders (customer_id) VALUES (?)', [req.session.userId]);
    const orderId = orderResult.insertId;
    for (const item of items) {
      await conn.query('INSERT INTO order_items (order_id, food_id, quantity) VALUES (?, ?, ?)', [orderId, item.id, item.quantity]);
    }
    await conn.commit();
    res.json({ message: 'Order placed successfully!', orderId });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// Customer: get their own orders
app.get('/api/customer/orders', async (req, res) => {
  if (req.session.role !== 'customer') {
    return res.status(403).json({ message: 'Only customers can view their orders' });
  }
  const [orders] = await db.query('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC', [req.session.userId]);
  for (const order of orders) {
    const [items] = await db.query(
      `SELECT oi.quantity, f.name, f.price FROM order_items oi JOIN foods f ON oi.food_id = f.id WHERE oi.order_id = ?`,
      [order.id]
    );
    order.items = items;
  }
  res.json(orders);
});

// Owner: mark order as completed
app.post('/api/owner/orders/:orderId/complete', async (req, res) => {
  if (req.session.role !== 'owner') return res.status(403).json({ message: 'Only owners can complete orders' });
  const { orderId } = req.params;
  await db.query('UPDATE orders SET completed = TRUE WHERE id = ?', [orderId]);
  res.json({ message: 'Order marked as completed' });
});

// Owner: get all orders (split by completed)
app.get('/api/owner/orders', async (req, res) => {
  if (req.session.role !== 'owner') return res.status(403).json({ message: 'Only owners can view orders' });
  const [currentOrders] = await db.query('SELECT o.*, u.username as customer_name FROM orders o JOIN Kalderamausers u ON o.customer_id = u.id WHERE o.completed IS NULL OR o.completed = FALSE ORDER BY o.created_at DESC');
  for (const order of currentOrders) {
    const [items] = await db.query(
      `SELECT oi.quantity, f.name, f.price FROM order_items oi JOIN foods f ON oi.food_id = f.id WHERE oi.order_id = ?`,
      [order.id]
    );
    order.items = items;
  }
  const [pastOrders] = await db.query('SELECT o.*, u.username as customer_name FROM orders o JOIN Kalderamausers u ON o.customer_id = u.id WHERE o.completed = TRUE ORDER BY o.created_at DESC');
  for (const order of pastOrders) {
    const [items] = await db.query(
      `SELECT oi.quantity, f.name, f.price FROM order_items oi JOIN foods f ON oi.food_id = f.id WHERE oi.order_id = ?`,
      [order.id]
    );
    order.items = items;
  }
  res.json({ currentOrders, pastOrders });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});