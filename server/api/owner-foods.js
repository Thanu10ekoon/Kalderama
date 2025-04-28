import mysql from 'mysql2/promise';

const db = mysql.createPool({
  host: 'bp2juxysn0nszxvmkkzj-mysql.services.clever-cloud.com',
  user: 'udflccbdblfustx7',
  password: 'qgnCvYDdKjXJIfaLe8hL',
  database: 'bp2juxysn0nszxvmkkzj',
});

export default async function handler(req, res) {
  const allowedOrigins = [
    'https://kalderama.vercel.app',
    'https://kalderama-9akqkghda-thanujaya-tennekoons-projects-879a74da.vercel.app',
    'http://localhost:5173'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const [rows] = await db.query('SELECT * FROM foods');
    return res.status(200).json(rows);
  }
  if (req.method === 'POST') {
    const { name, price, quantity } = req.body;
    if (!name || !price || !Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({ message: 'Name, price, and quantity required' });
    }
    await db.query('INSERT INTO foods (name, price, available, quantity) VALUES (?, ?, ?, ?)', [name, price, quantity > 0, quantity]);
    return res.status(200).json({ message: 'Food added successfully' });
  }
  res.status(405).json({ message: 'Method not allowed' });
}
