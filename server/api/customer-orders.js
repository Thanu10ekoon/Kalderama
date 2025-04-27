import mysql from 'mysql2/promise';

const db = mysql.createPool({
  host: 'bp2juxysn0nszxvmkkzj-mysql.services.clever-cloud.com',
  user: 'udflccbdblfustx7',
  password: 'qgnCvYDdKjXJIfaLe8hL',
  database: 'bp2juxysn0nszxvmkkzj',
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const user = req.query.user;
  if (!user) return res.status(400).json({ message: 'User required' });
  const [users] = await db.query('SELECT id FROM Kalderamausers WHERE username = ?', [user]);
  if (!users.length) return res.status(404).json({ message: 'User not found' });
  const customerId = users[0].id;
  const [orders] = await db.query('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
  for (const order of orders) {
    const [items] = await db.query(
      `SELECT oi.quantity, f.name, f.price FROM order_items oi JOIN foods f ON oi.food_id = f.id WHERE oi.order_id = ?`,
      [order.id]
    );
    order.items = items;
  }
  res.status(200).json(orders);
}
