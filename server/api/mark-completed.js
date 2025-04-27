import mysql from 'mysql2/promise';

const db = mysql.createPool({
  host: 'bp2juxysn0nszxvmkkzj-mysql.services.clever-cloud.com',
  user: 'udflccbdblfustx7',
  password: 'qgnCvYDdKjXJIfaLe8hL',
  database: 'bp2juxysn0nszxvmkkzj',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ message: 'Order ID required' });
  await db.query('UPDATE orders SET completed = TRUE WHERE id = ?', [orderId]);
  res.status(200).json({ message: 'Order marked as completed' });
}
