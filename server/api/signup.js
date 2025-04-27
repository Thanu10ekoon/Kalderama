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
    res.status(200).json({ message: 'Signup successful' });
  } catch (err) {
    res.status(400).json({ message: 'Signup failed', error: err.message });
  }
}
