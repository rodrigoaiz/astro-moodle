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
// ESTE ES EL ENDPOINT MÁS CRÍTICO DEL SISTEMA
// Implementa autenticación REAL contra Moodle con CSRF tokens
// Soluciona el problema de sincronización entre AuthWidget y MoodleWidget
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

    // PASO 1: Buscar usuario en la base de datos
    // Esto verifica que el usuario existe en Moodle antes de intentar autenticar
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

    // PASO 2: Verificar contraseña usando el FLUJO COMPLETO DE MOODLE
    // NOTA CRÍTICA: No usamos hashes locales, sino que autenticamos contra Moodle real
    // Esto fue la clave para resolver el problema de sincronización
    let passwordValid = false;
    
    try {
      const storedHash = user.password;
      
      console.log(`🔐 Verifying password for user: ${username}`);
      console.log(`🔐 Attempting complete Moodle login flow...`);
      
      // PASO 2A: CSRF Token Management
      // Moodle requiere tokens CSRF para prevenir ataques
      // Tuvimos que implementar esto cuando descubrimos que Moodle lo requiere
      try {
        // DESCUBRIMIENTO CLAVE: Usar URL externa, no la interna del contenedor
        // Antes usábamos 'http://moodle:8080/' y no funcionaba la sincronización
        // Ahora usamos la URL real que ve el navegador
        const moodleExternalUrl = 'http://132.248.218.76:4324/learning';
        console.log(`🌐 Using external Moodle URL: ${moodleExternalUrl}`);
        
        // Obtener la página de login para extraer el token CSRF
        const getLoginPageResponse = await fetch(`${moodleExternalUrl}/login/index.php`);
        const loginPageHtml = await getLoginPageResponse.text();
        
        // Extraer el token logintoken del HTML usando regex
        // Este token es obligatorio para que Moodle acepte el login
        const tokenMatch = loginPageHtml.match(/name="logintoken"\s+value="([^"]+)"/);
        const logintoken = tokenMatch ? tokenMatch[1] : '';
        
        console.log(`🔑 Extracted logintoken: ${logintoken.substring(0, 10)}...`);
        
        // Extraer cookies de la respuesta inicial
        // Estas cookies son necesarias para mantener la sesión durante el flujo CSRF
        const setCookieHeaders = getLoginPageResponse.headers.get('set-cookie');
        console.log(`🍪 Initial cookies: ${setCookieHeaders}`);
        
        // PASO 2B: Realizar el login con el token CSRF
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
          redirect: 'manual' // IMPORTANTE: No seguir redirects automáticamente
        });
        
        console.log(`🔄 Login response status: ${loginResponse.status}`);
        const location = loginResponse.headers.get('location');
        console.log(`🔄 Redirect location: ${location}`);
        
        // PASO 2C: Interpretar el resultado del login
        // ESTO FUE LO MÁS COMPLICADO: Moodle no da respuestas simples de éxito/error
        // Tuvimos que interpretar los diferentes tipos de redirects
        if (loginResponse.status === 302 || loginResponse.status === 303) {
          if (location && location.includes('/login/index.php')) {
            // Si incluye testsession, significa que las credenciales son válidas 
            // pero Moodle necesita verificar que las cookies funcionan
            if (location.includes('testsession=')) {
              console.log(`🔄 Moodle requires session test - credentials are valid for: ${username}`);
              passwordValid = true;
              
              // Extraer la cookie de sesión del login exitoso
              // Esta es la sesión REAL de Moodle que necesitamos
              const loginCookies = loginResponse.headers.get('set-cookie');
              if (loginCookies && loginCookies.includes('MoodleSession=')) {
                const sessionMatch = loginCookies.match(/MoodleSession=([^;]+)/);
                if (sessionMatch) {
                  const moodleSessionId = sessionMatch[1];
                  console.log(`🍪 Valid Moodle session established: ${moodleSessionId}`);
                }
              }
            } else {
              // Si redirect de vuelta al login sin testsession = credenciales inválidas
              console.log(`❌ Moodle redirected back to login - Invalid credentials for: ${username}`);
              passwordValid = false;
            }
          } else if (location && (location.includes('/my/') || location.includes('/?redirect=0') || !location.includes('login'))) {
            // Redirect al dashboard = login exitoso directo
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
    
    // PASO 3: Rechazar si las credenciales no son válidas
    if (!passwordValid) {
      console.log(`❌ Authentication failed for user: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    console.log(`🎯 About to try Moodle authentication for user: ${username}`);

    // PASO 4: Usar la sesión real de Moodle que obtuvimos durante la validación
    // ESTO FUE CLAVE: En lugar de crear sesiones artificiales, 
    // usamos las sesiones REALES creadas por Moodle
    if (passwordValid) {
      console.log('🔄 Using real Moodle session from validation...');
      
      // Buscar la sesión de Moodle que se creó durante la validación
      // Ordenamos por timemodified DESC para obtener la más reciente
      const [moodleSessions] = await db.execute(
        'SELECT sid FROM mdl_sessions WHERE userid = ? ORDER BY timemodified DESC LIMIT 1',
        [user.id]
      );
      
      let finalSessionId;
      if (moodleSessions.length > 0) {
        // ¡Perfecto! Usar la sesión real de Moodle
        finalSessionId = moodleSessions[0].sid;
        console.log(`🍪 Using existing Moodle session: ${finalSessionId}`);
      } else {
        // Fallback: crear nuestra propia sesión (solo si es necesario)
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
      
      // PASO 5: Retornar el sessionId real al frontend
      // El AuthWidget usará este sessionId para establecer cookies
      res.json({
        success: true,
        sessionId: finalSessionId, // Esta es la sesión REAL de Moodle
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
// ENDPOINT CRÍTICO: Este establece la cookie que sincroniza AuthWidget con MoodleWidget
// Sin esto, el iframe de Moodle seguiría mostrando "session timed out"
app.post('/set-session-cookie', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // SEGURIDAD: Verificar que la sesión existe en la base de datos
    // No podemos establecer cookies para sesiones que no existen
    if (db) {
      const [rows] = await db.execute(
        'SELECT userid FROM mdl_sessions WHERE sid = ? AND timemodified > ?',
        [sessionId, Math.floor(Date.now() / 1000) - 7200]
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid session' });
      }
    }

    // SOLUCIÓN CLAVE: Establecer la cookie de sesión de Moodle
    // IMPORTANTE: Sin 'domain' específico para que funcione en el contexto actual
    // Probamos con domain='132.248.218.76' pero causaba problemas cross-domain
    res.cookie('MoodleSession', sessionId, {
      path: '/',
      // Sin domain específico para que funcione en el contexto actual
      httpOnly: false, // CRÍTICO: Permitir acceso desde JavaScript del iframe
      secure: false,   // Para desarrollo, cambiar a true en producción con HTTPS
      sameSite: 'lax', // Permite cookies en contextos de iframe
      maxAge: 7200000  // 2 horas - mismo tiempo que Moodle
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

// Generar sessionId con formato de Moodle (26 caracteres)
// IMPORTANTE: Moodle usa un formato específico de 26 caracteres alfanuméricos
// Esto es necesario para el fallback cuando no podemos usar sesión real de Moodle
function generateMoodleSessionId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 26; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Crear sessdata con formato PHP serializado
// NOTA: Moodle almacena datos de sesión en formato PHP serializado
// Esto es una versión simplificada - en producción podríamos usar una librería completa
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
  // Pero esto funciona para nuestro caso de uso básico
  return `USER|O:8:"stdClass":3:{s:2:"id";i:${userId};s:8:"username";s:${username.length}:"${username}";s:9:"loggedinas";i:${userId};}`;
}

// Inicializar la conexión a la base de datos al iniciar el servidor
connectDB();

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de autenticación ejecutándose en puerto ${PORT}`);
});
