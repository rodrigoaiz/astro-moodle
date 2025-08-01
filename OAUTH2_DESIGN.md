# OAuth 2.0 Implementation Design for Moodle

## 🎯 Objetivo
Implementar OAuth 2.0 Authorization Code Flow para una autenticación más segura y estándar entre el AuthWidget y Moodle.

## 🏗️ Arquitectura Propuesta

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AuthWidget    │    │   OAuth Server  │    │     Moodle      │
│   (Cliente)     │    │   (auth service)│    │ (Resource Server│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Redirect to        │                       │
         │    /oauth/authorize   │                       │
         ├──────────────────────►│                       │
         │                       │                       │
         │                       │ 2. Authenticate       │
         │                       │    user with Moodle   │
         │                       ├──────────────────────►│
         │                       │                       │
         │                       │ 3. User credentials   │
         │                       │    validation         │
         │                       │◄──────────────────────┤
         │                       │                       │
         │ 4. Authorization      │                       │
         │    code callback      │                       │
         │◄──────────────────────┤                       │
         │                       │                       │
         │ 5. Exchange code      │                       │
         │    for access token   │                       │
         ├──────────────────────►│                       │
         │                       │                       │
         │ 6. JWT Access Token   │                       │
         │    + Refresh Token    │                       │
         │◄──────────────────────┤                       │
         │                       │                       │
         │ 7. Use access token   │                       │
         │    for API calls      │                       │
         ├──────────────────────►│                       │
```

## 🔧 Componentes Técnicos

### 1. OAuth Authorization Server (Nuevo servicio)
```javascript
// oauth/server.js
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class OAuthServer {
  constructor() {
    this.clients = new Map(); // Clientes registrados
    this.authCodes = new Map(); // Códigos de autorización temporales
    this.tokens = new Map(); // Tokens activos
  }

  // Endpoint: GET /oauth/authorize
  async authorize(req, res) {
    const { client_id, redirect_uri, response_type, scope, state } = req.query;
    
    // Validar cliente y redirect_uri
    // Mostrar pantalla de login de Moodle
    // Generar authorization code
  }

  // Endpoint: POST /oauth/token
  async token(req, res) {
    const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;
    
    // Intercambiar authorization code por access token
    // Generar JWT access token y refresh token
  }

  // Endpoint: POST /oauth/introspect
  async introspect(req, res) {
    // Validar y obtener información del token
  }
}
```

### 2. JWT Token Structure
```javascript
// Access Token (JWT)
{
  "iss": "moodle-auth-server",
  "sub": "user_id",
  "aud": "astro-moodle-client",
  "exp": 1234567890,
  "iat": 1234567890,
  "scope": "read write",
  "user": {
    "id": 2,
    "username": "admin",
    "email": "admin@example.com",
    "fullname": "Admin User"
  },
  "moodle_session": "session_id_from_moodle"
}

// Refresh Token (Opaque)
{
  "token": "random_256_bit_string",
  "user_id": 2,
  "expires_at": "2025-08-02T12:00:00Z",
  "client_id": "astro-moodle-client"
}
```

### 3. AuthWidget OAuth Client
```typescript
// AuthWidgetOAuth.tsx
interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

class OAuthClient {
  async startAuthorization() {
    // Generar state y code_verifier (PKCE)
    // Redirigir a authorization server
  }

  async handleCallback(code: string, state: string) {
    // Intercambiar code por tokens
    // Almacenar tokens de forma segura
  }

  async refreshToken() {
    // Renovar access token usando refresh token
  }

  async makeAuthenticatedRequest(url: string) {
    // Incluir access token en headers
    // Auto-refresh si es necesario
  }
}
```

## 🔒 Flujo de Autenticación

### Paso 1: Iniciar autorización
```
GET /oauth/authorize?
  client_id=astro-moodle-client&
  redirect_uri=http://132.248.218.76:4324/auth/callback&
  response_type=code&
  scope=read+write&
  state=random_state&
  code_challenge=challenge&
  code_challenge_method=S256
```

### Paso 2: Autenticación en Moodle
- Usuario ingresa credenciales en formulario seguro
- Servidor valida contra Moodle usando HTTP auth
- Si es válido, genera authorization code

### Paso 3: Callback con código
```
GET /auth/callback?
  code=authorization_code&
  state=random_state
```

### Paso 4: Intercambio por tokens
```
POST /oauth/token
{
  "grant_type": "authorization_code",
  "code": "authorization_code",
  "client_id": "astro-moodle-client",
  "code_verifier": "verifier",
  "redirect_uri": "http://132.248.218.76:4324/auth/callback"
}
```

### Paso 5: Respuesta con tokens
```json
{
  "access_token": "jwt_access_token",
  "refresh_token": "opaque_refresh_token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read write"
}
```

## 🛡️ Características de Seguridad

### PKCE (Proof Key for Code Exchange)
- Protege contra ataques de intercepción de código
- Necesario para Single Page Applications

### JWT Access Tokens
- Autocontenidos con información del usuario
- Firmados digitalmente para verificar integridad
- Corta duración (1 hora)

### Refresh Tokens
- Tokens opacos de larga duración (30 días)
- Almacenados en httpOnly cookies
- Rotación automática en cada uso

### State Parameter
- Protege contra ataques CSRF
- Validación estricta en callbacks

## 📁 Estructura de Archivos

```
oauth/
├── server.js              # OAuth authorization server
├── package.json           # Dependencias OAuth
├── Dockerfile             # Container para OAuth server
├── config/
│   ├── clients.json       # Clientes OAuth registrados
│   └── keys.json          # Claves para firmar JWT
└── middleware/
    ├── auth.js            # Middleware de autenticación
    └── cors.js            # CORS para OAuth

astro/src/components/
├── AuthWidgetOAuth.tsx    # Widget con OAuth
└── oauth/
    ├── OAuthClient.ts     # Cliente OAuth
    ├── TokenManager.ts    # Manejo de tokens
    └── types.ts           # Tipos TypeScript
```

## 🚀 Ventajas de OAuth 2.0

1. **Seguridad**: No manejamos contraseñas directamente
2. **Estándar**: Protocolo ampliamente adoptado y probado
3. **Escalabilidad**: Fácil agregar más clientes y scopes
4. **UX**: Login fluido sin recargas de página
5. **Tokens**: JWT autocontenidos y refresh tokens seguros
6. **Auditoria**: Logs detallados de autenticación
7. **Revocación**: Tokens pueden ser revocados centralizadamente

## 🎯 Implementación por Fases

### Fase 1: OAuth Server Básico
- Authorization endpoint
- Token endpoint
- JWT generation
- Moodle authentication

### Fase 2: Client Implementation
- AuthWidget con OAuth
- Token storage
- API integration

### Fase 3: Características Avanzadas
- Refresh token rotation
- Token introspection
- Admin panel para clientes
- Rate limiting

¿Quieres que empecemos con la Fase 1?
