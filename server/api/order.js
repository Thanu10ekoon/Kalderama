import mysql from 'mysql2/promise';

const db = mysql.createPool({
  host: 'bp2juxysn0nszxvmkkzj-mysql.services.clever-cloud.com',
  user: 'udflccbdblfustx7',
  password: 'qgnCvYDdKjXJIfaLe8hL',
  database: 'bp2juxysn0nszxvmkkzj',
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://kalderama.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { items, user } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0 || !user) {
    return res.status(400).json({ message: 'No items in order or user missing.' });
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const item of items) {
      const [foods] = await conn.query('SELECT quantity FROM foods WHERE id = ? FOR UPDATE', [item.id]);
      if (!foods.length || foods[0].quantity < item.quantity) {
        throw new Error(`Not enough quantity for ${item.name}`);
      }
      await conn.query('UPDATE foods SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.id]);
      await conn.query('UPDATE foods SET available = FALSE WHERE id = ? AND quantity = 0', [item.id]);
    }
    const [users] = await conn.query('SELECT id FROM Kalderamausers WHERE username = ?', [user]);
    if (!users.length) throw new Error('User not found');
    const customerId = users[0].id;
    const [orderResult] = await conn.query('INSERT INTO orders (customer_id) VALUES (?)', [customerId]);
    const orderId = orderResult.insertId;
    for (const item of items) {
      await conn.query('INSERT INTO order_items (order_id, food_id, quantity) VALUES (?, ?, ?)', [orderId, item.id, item.quantity]);
    }
    await conn.commit();
    res.status(200).json({ message: 'Order placed successfully!', orderId });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
}
