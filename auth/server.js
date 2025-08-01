const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Debug: Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({ message: 'Auth service is running' });
});

// Variable para almacenar la conexión a la base de datos
let db = null;

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'moodle',
  password: process.env.DB_PASS || 'moodle_pass',
  database: process.env.DB_NAME || 'moodle',
  port: process.env.DB_PORT || 3306
};

// Función para conectar a la base de datos con reintentos
async function connectDB() {
  const maxRetries = 10;
  let attempts = 0;

  while (attempts < maxRetries) {
    attempts++;

    try {
      console.log(`🔄 Intento ${attempts} de conexión a la base de datos...`);

      db = await mysql.createConnection(dbConfig);

      // Probar la conexión
      await db.execute('SELECT 1');

      console.log('✅ Auth: Conectado a la DB de Moodle');
      return;

    } catch (error) {
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

    // Obtener cookie de sesión de Moodle - primero de cookies, luego de headers
    let sessionId = req.cookies?.MoodleSession;
    if (!sessionId) {
      sessionId = req.headers.cookie?.split('MoodleSession=')[1]?.split(';')[0];
    }

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
  let sessionId = req.cookies?.MoodleSession;
  if (!sessionId) {
    sessionId = req.headers.cookie?.split('MoodleSession=')[1]?.split(';')[0];
  }

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

// Rutas para la API del AuthWidget

// GET /auth - Verificar estado de autenticación
app.get('/auth', async (req, res) => {
  try {
    // Similar a /check-session pero con el formato que espera AuthWidget
    const sessionId = req.headers['x-session-id'] || req.query.session;

    if (!sessionId || !db) {
      return res.json({ authenticated: false });
    }

    const [rows] = await db.execute(
      'SELECT userid FROM mdl_sessions WHERE sid = ? AND timemodified > ?',
      [sessionId, Math.floor(Date.now() / 1000) - 7200] // 2 horas
    );

    if (rows.length > 0) {
      res.json({ authenticated: true, userId: rows[0].userid });
    } else {
      res.json({ authenticated: false });
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.json({ authenticated: false });
  }
});

// POST /auth - Iniciar sesión
app.post('/auth', async (req, res) => {
  try {
    console.log(`🔍 POST /auth - Request body:`, req.body);
    console.log(`🔍 POST /auth - Content-Type:`, req.headers['content-type']);

    const { username, password } = req.body;
    console.log(`🔐 Login attempt for user: ${username}`);

    if (!username || !password || !db) {
      console.log(`❌ Missing credentials or DB connection: username=${!!username}, password=${!!password}, db=${!!db}`);
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Buscar usuario en la base de datos
    const [userRows] = await db.execute(
      'SELECT id, username, password, firstname, lastname, email FROM mdl_user WHERE username = ? AND deleted = 0',
      [username]
    );

    if (userRows.length === 0) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    const user = userRows[0];
    console.log(`✅ User found: ${user.username} (ID: ${user.id})`);

    // Verificar contraseña usando el hash real de Moodle
    let passwordValid = false;
    
    try {
      const storedHash = user.password;
      
      console.log(`🔐 Verifying password for user: ${username}`);
      console.log(`🔐 Attempting complete Moodle login flow...`);
      
      // Paso 1: Obtener la página de login para extraer el token CSRF
      try {
        const moodleExternalUrl = 'http://132.248.218.76:4324/learning';
        console.log(`🌐 Using external Moodle URL: ${moodleExternalUrl}`);
        
        const getLoginPageResponse = await fetch(`${moodleExternalUrl}/login/index.php`);
        const loginPageHtml = await getLoginPageResponse.text();
        
        // Extraer el token logintoken del HTML
        const tokenMatch = loginPageHtml.match(/name="logintoken"\s+value="([^"]+)"/);
        const logintoken = tokenMatch ? tokenMatch[1] : '';
        
        console.log(`🔑 Extracted logintoken: ${logintoken.substring(0, 10)}...`);
        
        // Extraer cookies de la respuesta inicial
        const setCookieHeaders = getLoginPageResponse.headers.get('set-cookie');
        console.log(`🍪 Initial cookies: ${setCookieHeaders}`);
        
        // Paso 2: Realizar el login con el token CSRF
        const loginData = new URLSearchParams();
        loginData.append('username', username);
        loginData.append('password', password);
        if (logintoken) {
          loginData.append('logintoken', logintoken);
        }
        
        console.log(`🔄 Attempting login with CSRF token to external URL...`);
        
        const loginResponse = await fetch(`${moodleExternalUrl}/login/index.php`, {
          method: 'POST',
          body: loginData,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': setCookieHeaders || '',
          },
          redirect: 'manual'
        });
        
        console.log(`🔄 Login response status: ${loginResponse.status}`);
        const location = loginResponse.headers.get('location');
        console.log(`🔄 Redirect location: ${location}`);
        
        // Analizar el resultado del login
        if (loginResponse.status === 302 || loginResponse.status === 303) {
          if (location && location.includes('/login/index.php')) {
            // Si incluye testsession, significa que las credenciales son válidas pero necesita verificar cookies
            if (location.includes('testsession=')) {
              console.log(`🔄 Moodle requires session test - credentials are valid for: ${username}`);
              passwordValid = true;
              
              // Extraer la cookie de sesión del login exitoso
              const loginCookies = loginResponse.headers.get('set-cookie');
              if (loginCookies && loginCookies.includes('MoodleSession=')) {
                const sessionMatch = loginCookies.match(/MoodleSession=([^;]+)/);
                if (sessionMatch) {
                  const moodleSessionId = sessionMatch[1];
                  console.log(`🍪 Valid Moodle session established: ${moodleSessionId}`);
                }
              }
            } else {
              console.log(`❌ Moodle redirected back to login - Invalid credentials for: ${username}`);
              passwordValid = false;
            }
          } else if (location && (location.includes('/my/') || location.includes('/?redirect=0') || !location.includes('login'))) {
            passwordValid = true;
            console.log(`✅ Moodle login successful for: ${username}`);
            
            // Extraer la cookie de sesión del login exitoso
            const loginCookies = loginResponse.headers.get('set-cookie');
            if (loginCookies && loginCookies.includes('MoodleSession=')) {
              const sessionMatch = loginCookies.match(/MoodleSession=([^;]+)/);
              if (sessionMatch) {
                const moodleSessionId = sessionMatch[1];
                console.log(`🍪 Extracted Moodle session: ${moodleSessionId}`);
              }
            }
          } else {
            console.log(`❌ Moodle returned unexpected redirect: ${location}`);
            passwordValid = false;
          }
        } else {
          console.log(`❌ Unexpected response status: ${loginResponse.status}`);
          passwordValid = false;
        }
        
      } catch (apiError) {
        console.error(`❌ Moodle login flow error for ${username}:`, apiError.message);
        passwordValid = false;
      }
    } catch (error) {
      console.error(`❌ Error during password verification for ${username}:`, error);
    }
    
    if (!passwordValid) {
      console.log(`❌ Authentication failed for user: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    console.log(`🎯 About to try Moodle authentication for user: ${username}`);

    // Usar la sesión real de Moodle que obtuvimos durante la validación
    if (passwordValid) {
      console.log('🔄 Using real Moodle session from validation...');
      
      // Buscar la sesión de Moodle que se creó durante la validación
      const [moodleSessions] = await db.execute(
        'SELECT sid FROM mdl_sessions WHERE userid = ? ORDER BY timemodified DESC LIMIT 1',
        [user.id]
      );
      
      let finalSessionId;
      if (moodleSessions.length > 0) {
        finalSessionId = moodleSessions[0].sid;
        console.log(`🍪 Using existing Moodle session: ${finalSessionId}`);
      } else {
        // Fallback: crear nuestra propia sesión
        finalSessionId = generateMoodleSessionId();
        const currentTime = Math.floor(Date.now() / 1000);
        const sessdata = createMoodleSessionData(user.id, username);
        
        console.log(`🔄 Creating fallback session: ${finalSessionId}`);
        await db.execute(
          'INSERT INTO mdl_sessions (state, sid, userid, sessdata, timecreated, timemodified, firstip, lastip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [0, finalSessionId, user.id, sessdata, currentTime, currentTime, '127.0.0.1', '127.0.0.1']
        );
      }

      console.log(`✅ Authentication successful: ${username} (Session: ${finalSessionId})`);
      
      res.json({
        success: true,
        sessionId: finalSessionId,
        user: {
          id: user.id,
          username: user.username,
          fullname: `${user.firstname} ${user.lastname}`,
          email: user.email
        }
      });
    }

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /auth - Cerrar sesión
app.delete('/auth', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.query.session;

    if (sessionId && db) {
      await db.execute('DELETE FROM mdl_sessions WHERE sid = ?', [sessionId]);
    }

    // Limpiar la cookie de sesión de Moodle
    res.clearCookie('MoodleSession', {
      path: '/'
    });

    res.json({ success: true, message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// POST /set-session-cookie - Establecer cookie de sesión de Moodle
app.post('/set-session-cookie', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Verificar que la sesión existe en la base de datos
    if (db) {
      const [rows] = await db.execute(
        'SELECT userid FROM mdl_sessions WHERE sid = ? AND timemodified > ?',
        [sessionId, Math.floor(Date.now() / 1000) - 7200]
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid session' });
      }
    }

    // Establecer la cookie de sesión de Moodle
    res.cookie('MoodleSession', sessionId, {
      path: '/',
      // Sin domain específico para que funcione en el contexto actual
      httpOnly: false, // Permitir acceso desde JavaScript
      secure: false, // Para desarrollo, cambiar a true en producción con HTTPS
      sameSite: 'lax',
      maxAge: 7200000 // 2 horas
    });

    res.json({ success: true, message: 'Session cookie set successfully' });
  } catch (error) {
    console.error('Error setting session cookie:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /profile - Obtener información del perfil del usuario
app.get('/profile', async (req, res) => {
  try {
    console.log('📋 GET /profile called');
    console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
    
    const sessionId = req.headers['x-session-id'] || req.query.session;
    console.log(`📋 Session ID: ${sessionId}`);

    if (!sessionId || !db) {
      console.log(`📋 Missing sessionId or DB: sessionId=${!!sessionId}, db=${!!db}`);
      return res.status(401).json({ error: 'No authenticated' });
    }

    // Verificar sesión y obtener usuario
    const [sessionRows] = await db.execute(
      'SELECT userid FROM mdl_sessions WHERE sid = ? AND timemodified > ?',
      [sessionId, Math.floor(Date.now() / 1000) - 7200]
    );

    console.log(`📋 Session query result: ${sessionRows.length} rows`);

    if (sessionRows.length === 0) {
      console.log('📋 Session not found or expired');
      return res.status(401).json({ error: 'Session expired' });
    }

    const userId = sessionRows[0].userid;
    console.log(`📋 Found user ID: ${userId}`);

    // Obtener información del usuario
    const [userRows] = await db.execute(
      'SELECT id, username, firstname, lastname, email FROM mdl_user WHERE id = ?',
      [userId]
    );

    console.log(`📋 User query result: ${userRows.length} rows`);

    if (userRows.length === 0) {
      console.log('📋 User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRows[0];
    console.log(`📋 User profile: ${user.username}`);

    const profileData = {
      id: user.id,
      username: user.username,
      fullname: `${user.firstname} ${user.lastname}`,
      email: user.email,
      authenticated: true
    };

    console.log('📋 Sending profile data:', profileData);
    res.json(profileData);

  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Funciones auxiliares para autenticación con Moodle

// Función para autenticar directamente con Moodle
async function authenticateWithMoodle(username, password) {
  try {
    const fetch = require('node-fetch');

    // Hacer una petición POST al login de Moodle
    const loginUrl = 'http://moodle:8080/login/index.php';

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(loginUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'AuthWidget/1.0'
      },
      redirect: 'manual' // No seguir redirects automáticamente
    });

    // Moodle devuelve una cookie de sesión si el login es exitoso
    const cookies = response.headers.get('set-cookie');

    if (cookies && cookies.includes('MoodleSession=')) {
      const sessionMatch = cookies.match(/MoodleSession=([^;]+)/);
      if (sessionMatch) {
        const sessionId = sessionMatch[1];
        console.log(`🍪 Got Moodle session from login: ${sessionId}`);
        return {
          success: true,
          sessionId: sessionId
        };
      }
    }

    console.log('❌ No session cookie found in Moodle response');
    return { success: false };

  } catch (error) {
    console.error('Error authenticating with Moodle:', error);
    return { success: false };
  }
}

// Generar sessionId con formato de Moodle (26 caracteres)
function generateMoodleSessionId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 26; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Crear sessdata con formato PHP serializado
function createMoodleSessionData(userId, username) {
  // Formato PHP serializado que Moodle espera
  const sessionData = {
    'USER': {
      'id': userId,
      'username': username,
      'loggedinas': userId
    }
  };

  // Simplificado - podríamos usar una librería para serialización PHP real
  return `USER|O:8:"stdClass":3:{s:2:"id";i:${userId};s:8:"username";s:${username.length}:"${username}";s:9:"loggedinas";i:${userId};}`;
}

// Inicializar la conexión a la base de datos al iniciar el servidor
connectDB();

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de autenticación ejecutándose en puerto ${PORT}`);
});
