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

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
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
  res.status(200).json({ currentOrders, pastOrders });
}
