const express = require('express');
const app = express();

app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Ruta GET /auth para testing
app.get('/auth', (req, res) => {
  console.log('✅ Ruta /auth funcionando');
  res.json({
    authenticated: false,
    message: 'Ruta funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta POST /auth para testing
app.post('/auth', (req, res) => {
  console.log('✅ POST /auth funcionando');
  res.json({
    success: false,
    message: 'POST funcionando correctamente',
    body: req.body
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ message: 'Simple auth server working' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
});
