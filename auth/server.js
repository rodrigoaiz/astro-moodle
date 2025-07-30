// auth/server.js
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());

let db = null;

async function connectDB() {
  const maxRetries = 10;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      db = await mysql.createConnection({
        host: process.env.DB_HOST || 'db',
        user: process.env.DB_USER || 'moodle',
        password: process.env.DB_PASS || 'moodle_pass',
        database: process.env.DB_NAME || 'moodle',
        port: parseInt(process.env.DB_PORT || 3306),
      });
      console.log("✅ Auth: Conectado a la DB de Moodle");
      return;
    } catch (err) {
      attempts++;
      console.log(`🔁 Auth: Intento ${attempts} fallido al conectar a DB:`, err.message);
      await new Promise(res => setTimeout(res, 5000)); // Espera 5s
    }
  }

  console.error("❌ Auth: No se pudo conectar a la DB después de varios intentos");
}

connectDB();

app.get('/api/me', async (req, res) => {
  if (!db) {
    return res.status(500).json({ logged_in: false, error: "DB not connected" });
  }

  const cookie = req.headers.cookie || '';
  const match = cookie.match(/MoodleSession=([^;]+)/);
  if (!match) return res.json({ logged_in: false });

  const sessionId = match[1];

  try {
    const [rows] = await db.execute(
      "SELECT u.firstname FROM mdl_sessions s JOIN mdl_user u ON s.userid = u.id WHERE s.sid = ? AND s.timemodified > ?",
      [sessionId, Math.floor(Date.now() / 1000) - 3600]
    );

    if (rows.length > 0) {
      return res.json({ logged_in: true, name: rows[0].firstname });
    }
  } catch (err) {
    console.error("Error en /api/me:", err);
  }

  res.json({ logged_in: false });
});

app.listen(3000, () => {
  console.log("🔐 Auth escuchando en puerto 3000");
});
