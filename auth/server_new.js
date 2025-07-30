// auth/server.js
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

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
        port: process.env.DB_PORT || 3306
      });

      console.log('✅ Conectado a la base de datos MySQL');
      return;
    } catch (error) {
      attempts++;
      console.log(`❌ Intento ${attempts}/${maxRetries} fallido:`, error.message);

      if (attempts >= maxRetries) {
        console.error('💥 No se pudo conectar a la base de datos después de varios intentos');
        process.exit(1);
      }

      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Endpoint para verificar estado del servicio
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para verificar sesión de Moodle
app.get('/check-session', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    // Obtener cookie de sesión de Moodle
    const sessionId = req.headers.cookie?.split('MoodleSession=')[1]?.split(';')[0];

    if (!sessionId) {
      return res.json({ loggedIn: false, message: 'No session cookie found' });
    }

    // Verificar sesión en la base de datos de Moodle
    const [rows] = await db.execute(
      'SELECT userid, timecreated, timemodified FROM mdl_sessions WHERE sid = ? AND timemodified > ?',
      [sessionId, Math.floor(Date.now() / 1000) - 86400] // Sesiones válidas por 24 horas
    );

    if (rows.length > 0) {
      const session = rows[0];

      // Obtener información del usuario
      const [userRows] = await db.execute(
        'SELECT id, username, firstname, lastname, email FROM mdl_user WHERE id = ?',
        [session.userid]
      );

      if (userRows.length > 0) {
        const user = userRows[0];
        return res.json({
          loggedIn: true,
          user: {
            id: user.id,
            username: user.username,
            name: `${user.firstname} ${user.lastname}`,
            email: user.email
          },
          sessionInfo: {
            created: new Date(session.timecreated * 1000),
            lastActivity: new Date(session.timemodified * 1000)
          }
        });
      }
    }

    res.json({ loggedIn: false, message: 'Invalid or expired session' });
  } catch (error) {
    console.error('Error checking session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint para obtener información del usuario actual
app.get('/user', async (req, res) => {
  try {
    const sessionCheck = await checkUserSession(req);
    if (!sessionCheck.loggedIn) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json(sessionCheck.user);
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Función auxiliar para verificar sesión
async function checkUserSession(req) {
  const sessionId = req.headers.cookie?.split('MoodleSession=')[1]?.split(';')[0];

  if (!sessionId) {
    return { loggedIn: false };
  }

  const [rows] = await db.execute(
    'SELECT userid FROM mdl_sessions WHERE sid = ? AND timemodified > ?',
    [sessionId, Math.floor(Date.now() / 1000) - 86400]
  );

  if (rows.length > 0) {
    const [userRows] = await db.execute(
      'SELECT id, username, firstname, lastname, email FROM mdl_user WHERE id = ?',
      [rows[0].userid]
    );

    if (userRows.length > 0) {
      return {
        loggedIn: true,
        user: userRows[0]
      };
    }
  }

  return { loggedIn: false };
}

// Endpoint para logout
app.post('/logout', async (req, res) => {
  try {
    const sessionId = req.headers.cookie?.split('MoodleSession=')[1]?.split(';')[0];

    if (sessionId && db) {
      // Eliminar sesión de la base de datos
      await db.execute('DELETE FROM mdl_sessions WHERE sid = ?', [sessionId]);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Inicializar la conexión a la base de datos al iniciar el servidor
connectDB();

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de autenticación ejecutándose en puerto ${PORT}`);
});
