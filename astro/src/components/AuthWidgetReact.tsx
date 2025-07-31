import React, { useEffect, useState, useRef } from 'react';

interface UserData {
  fullname?: string;
  email?: string;
  authenticated?: boolean;
  name?: string;
  firstname?: string;
  lastname?: string;
}

type AuthState = 'loading' | 'logged-out' | 'logged-in';

const AuthWidgetReact: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const API_CONFIG = {
    baseUrl: '/api',
    endpoints: {
      auth: '/auth',
      profile: '/profile'
    }
  };

  const notifyAuthChange = () => {
    try {
      // Notificar via localStorage (funciona entre pestañas)
      localStorage.setItem('moodle_auth_changed', 'true');
      setTimeout(() => localStorage.removeItem('moodle_auth_changed'), 100);

      // Notificar via postMessage a todas las ventanas
      window.postMessage({
        type: 'MOODLE_AUTH_CHANGED',
        timestamp: Date.now()
      }, window.location.origin);

      console.log('Auth change notification sent from AuthWidget');
    } catch (error) {
      console.error('Error notifying auth change:', error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      console.log('AuthWidget: Checking auth status...');

      // Obtener sessionId guardado
      const sessionId = localStorage.getItem('moodle_session_id');
      
      // Verificar autenticación local primero
      const authResponse = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          ...(sessionId && { 'X-Session-Id': sessionId })
        }
      });

      if (authResponse.ok) {
        const authData = await authResponse.json();
        console.log('AuthWidget: Local auth response:', authData);
        if (authData.authenticated) {
          console.log('AuthWidget: User is authenticated locally');
          
          // Obtener información del perfil del usuario
          const profileResponse = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.profile}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              ...(sessionId && { 'X-Session-Id': sessionId })
            }
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            setAuthState('logged-in');
            setUserData(profileData);
            return;
          }
        }
      }

      console.log('AuthWidget: No local auth, checking Moodle session...');
      // Si no está autenticado localmente, verificar sesión de Moodle
      const sessionResponse = await fetch('/api/check-session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        console.log('AuthWidget: Moodle session response:', sessionData);
        if (sessionData.loggedIn && sessionData.user) {
          console.log('AuthWidget: User has Moodle session');
          // Usuario tiene sesión de Moodle pero no está autenticado en nuestro sistema
          setAuthState('logged-in');
          setUserData(sessionData.user);
          return;
        }
      }

      console.log('AuthWidget: User not authenticated');
      // Usuario no autenticado
      setAuthState('logged-out');
      setUserData(null);

    } catch (error) {
      console.error('AuthWidget: Error checking auth status:', error);
      setAuthState('logged-out');
      setUserData(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
      setLoginError('Por favor ingresa usuario y contraseña');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    console.log('AuthWidget: Attempting login with credentials...');

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('AuthWidget: Login successful');
        
        // Guardar sessionId en localStorage
        if (data.sessionId) {
          localStorage.setItem('moodle_session_id', data.sessionId);
        }
        
        setAuthState('logged-in');
        setUserData(data.user);
        setLoginError('');
        notifyAuthChange();
      } else {
        console.error('AuthWidget: Login failed:', data.message);
        setLoginError(data.message || 'Error de autenticación');
        setAuthState('logged-out');
        setUserData(null);
      }
    } catch (error) {
      console.error('AuthWidget: Login error:', error);
      setLoginError('Error de conexión. Inténtalo de nuevo.');
      setAuthState('logged-out');
      setUserData(null);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('AuthWidget: Starting logout process...');
      setAuthState('loading');

      const sessionId = localStorage.getItem('moodle_session_id');

      // Intentar logout en nuestro sistema local
      try {
        const response = await fetch(`${API_CONFIG.baseUrl}/auth`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            ...(sessionId && { 'X-Session-Id': sessionId })
          }
        });

        const data = await response.json();
        console.log('AuthWidget: Local logout response:', data);
      } catch (error) {
        console.log('AuthWidget: Local logout failed:', error);
      }

      // Limpiar datos locales
      localStorage.removeItem('moodle_session_id');

      // Forzar limpieza de cookies y almacenamiento local
      try {
        // Limpiar localStorage relacionado con Moodle
        Object.keys(localStorage).forEach(key => {
          if (key.includes('moodle') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });

        // Limpiar sessionStorage también
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('moodle') || key.includes('auth')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.log('AuthWidget: Storage cleanup failed:', error);
      }

      // Inmediatamente mostrar como logged out
      setAuthState('logged-out');
      setUserData(null);

      // Notificar cambio a otros widgets
      notifyAuthChange();

      console.log('AuthWidget: Logout process completed');

    } catch (error) {
      console.error('AuthWidget: Error during logout:', error);
      // Aún así mostrar como logged out
      setAuthState('logged-out');
      setUserData(null);
      notifyAuthChange();
    }
  };

  useEffect(() => {
    // Verificar si acabamos de regresar de un intento de login
    const loginAttempt = localStorage.getItem('moodle_login_attempt');
    if (loginAttempt === 'true') {
      console.log('AuthWidget: Detected return from Moodle login attempt');
      localStorage.removeItem('moodle_login_attempt');

      // Verificar autenticación inmediatamente
      setTimeout(() => {
        checkAuthStatus();
        notifyAuthChange();
      }, 500);
    } else {
      // Verificación normal de autenticación
      checkAuthStatus();
    }

    // Verificar cada 60 segundos para mantener la sesión sincronizada
    const interval = setInterval(checkAuthStatus, 60000);

    // Event listeners para sincronización
    const handleFocus = () => {
      checkAuthStatus();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'moodle_auth_changed' && e.newValue === 'true') {
        console.log('AuthWidget detected auth change from another component');
        checkAuthStatus();
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'MOODLE_AUTH_CHANGED' || event.data.type === 'MOODLE_LOGIN_SUCCESS') {
        console.log('AuthWidget received auth change message:', event.data.type);
        checkAuthStatus();

        // Si es un mensaje de login exitoso, también actualizar el estado inmediatamente
        if (event.data.type === 'MOODLE_LOGIN_SUCCESS') {
          setIsLoggingIn(false);
          // Dar un momento para que se procese la autenticación
          setTimeout(() => {
            checkAuthStatus();
            notifyAuthChange();
          }, 500);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('message', handleMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const getUserDisplayName = () => {
    if (!userData) return 'Usuario';
    return userData.name ||
           userData.fullname ||
           `${userData.firstname || ''} ${userData.lastname || ''}`.trim() ||
           'Usuario';
  };

  const getUserEmail = () => {
    return userData?.email || '';
  };

  // Estado de carga
  if (authState === 'loading') {
    return (
      <div className="auth-widget card p-6 min-w-[320px] animate-float">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-3 text-sm text-white/80">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Estado no autenticado - mostrar formulario de login
  if (authState === 'logged-out') {
    return (
      <div className="auth-widget card p-6 min-w-[320px] animate-float">
        <div className="text-center">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-white mb-2">¡Hola! 👋</h3>
            <p className="text-white/70">Inicia sesión para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-3">
              <input
                type="text"
                name="username"
                placeholder="Usuario"
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent backdrop-blur-sm"
                disabled={isLoggingIn}
              />
              <input
                type="password"
                name="password"
                placeholder="Contraseña"
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent backdrop-blur-sm"
                disabled={isLoggingIn}
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="btn btn-accent w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Autenticando...
                </>
              ) : (
                '🎓 Iniciar Sesión'
              )}
            </button>
          </form>

          {loginError && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-400/50 rounded-lg text-red-200 text-sm text-center backdrop-blur-sm">
              ⚠️ {loginError}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-xs text-white/50 text-center">
              ¿No tienes cuenta? Contacta al administrador
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estado autenticado - mostrar información del usuario
  const displayName = getUserDisplayName();
  const email = getUserEmail();
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="auth-widget card p-6 min-w-[320px] animate-float">
      <div className="user-info">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-purple-900 font-bold text-lg shadow-lg">
            {firstLetter}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">
              ¡Hola, {displayName}! 👋
            </h3>
            {email && (
              <p className="text-sm text-white/70 truncate">{email}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <a
            href="/learning"
            className="btn btn-primary w-full"
            target="_blank"
            rel="noopener noreferrer"
          >
            🎓 Ir a Moodle
          </a>

          <button
            onClick={handleLogout}
            className="btn btn-outline w-full text-white/80 hover:text-white"
          >
            🚪 Cerrar Sesión
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-white/50 text-center">
            Sesión activa y sincronizada
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthWidgetReact;
