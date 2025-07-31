import React, { useEffect, useState, useRef } from 'react';

interface MoodleWidgetProps {
  src?: string;
  title?: string;
  description?: string;
  height?: string;
  showInHero?: boolean;
  fallbackMessage?: string;
}

const MoodleWidget: React.FC<MoodleWidgetProps> = ({
  src = "",
  title = "Contenido de Moodle",
  description = "Accede a tu contenido educativo",
  height = "h-64 md:h-96",
  showInHero = false,
  fallbackMessage = "Inicia sesión para ver este contenido"
}) => {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkAuthentication = async () => {
    try {
      const previousState = authState;
      const sessionId = localStorage.getItem('moodle_session_id');

      // Verificar sistema de auth local
      const authResponse = await fetch('/api/auth', {
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
        if (authData.authenticated) {
          setAuthState('authenticated');
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }

          // Notificar a otras pestañas si cambió el estado
          if (previousState !== 'authenticated') {
            localStorage.setItem('moodle_auth_changed', 'true');
            setTimeout(() => localStorage.removeItem('moodle_auth_changed'), 100);
          }
          return;
        }
      }

      // Verificar sesión de Moodle
      const sessionResponse = await fetch('/api/check-session', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
      });

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData.loggedIn && sessionData.user) {
          setAuthState('authenticated');
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }

          // Notificar a otras pestañas si cambió el estado
          if (previousState !== 'authenticated') {
            localStorage.setItem('moodle_auth_changed', 'true');
            setTimeout(() => localStorage.removeItem('moodle_auth_changed'), 100);
          }
          return;
        }
      }

      setAuthState('unauthenticated');
    } catch (error) {
      console.error('Error checking authentication:', error);
      setAuthState('unauthenticated');
    }
  };

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('MoodleWidget: Login requested - directing user to login form');

    // En lugar de redireccionar, mostrar un mensaje o scrollear al AuthWidget
    const authWidget = document.querySelector('.auth-widget');
    if (authWidget) {
      authWidget.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Hacer flash al widget para llamar la atención
      authWidget.classList.add('ring-4', 'ring-yellow-400', 'ring-opacity-75');
      setTimeout(() => {
        authWidget.classList.remove('ring-4', 'ring-yellow-400', 'ring-opacity-75');
      }, 2000);
    }
  };

  const refreshContent = () => {
    if (authState === 'authenticated') {
      setIframeLoaded(false);
      // Trigger iframe reload by changing src
      const iframe = document.querySelector('#moodle-iframe-react') as HTMLIFrameElement;
      if (iframe && src) {
        const refreshUrl = src + (src.includes('?') ? '&' : '?') + '_refresh=' + Date.now();
        iframe.src = refreshUrl;
      }
    } else {
      checkAuthentication();
    }
  };

  useEffect(() => {
    checkAuthentication();

    // Verificar autenticación cada 30 segundos si no está autenticado
    const startInterval = () => {
      if (authState === 'unauthenticated') {
        checkIntervalRef.current = setInterval(checkAuthentication, 30000);
      }
    };

    startInterval();

    // Event listener para re-verificar cuando la ventana vuelve a tener foco
    const handleFocus = () => {
      if (authState === 'unauthenticated') {
        checkAuthentication();
      }
    };

    // Event listener para cambios en localStorage (sincronización entre pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'moodle_auth_changed' && e.newValue === 'true') {
        console.log('Detected auth change from another tab/window');
        checkAuthentication();
        // Limpiar el flag
        localStorage.removeItem('moodle_auth_changed');
      }
    };

    // Event listener para postMessage (desde popup de login o AuthWidget)
    const handleMessage = (event: MessageEvent) => {
      // Verificar origen por seguridad
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'MOODLE_LOGIN_SUCCESS' || event.data.type === 'MOODLE_AUTH_CHANGED') {
        console.log('Received auth change message:', event.data.type);
        checkAuthentication();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('message', handleMessage);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message', handleMessage);
    };
  }, [authState]);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
  };

  // Estado de carga
  if (authState === 'loading') {
    return (
      <div className={`w-full ${showInHero ? 'mb-8' : ''}`}>
        <div className={`w-full ${height} rounded-lg card p-8 flex items-center justify-center`}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-white/70">Cargando contenido...</p>
          </div>
        </div>
      </div>
    );
  }

  // Estado no autenticado
  if (authState === 'unauthenticated') {
    return (
      <div className={`w-full ${showInHero ? 'mb-8' : ''}`}>
        <div className={`w-full ${height} rounded-lg card p-8 flex items-center justify-center`}>
          <div className="text-center max-w-lg">
            <div className="text-6xl mb-6">🎓</div>
            <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
            <p className="text-white/70 mb-6 leading-relaxed">
              {fallbackMessage}. {description && `${description}.`}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleLoginClick}
                className="btn btn-accent w-full sm:w-auto"
              >
                🚀 Acceder a Moodle
              </button>
              <p className="text-xs text-white/50">
                Una vez que inicies sesión, este contenido se mostrará automáticamente
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Estado autenticado
  return (
    <div className={`w-full ${showInHero ? 'mb-8' : ''}`}>
      <div className="w-full">
        <div className="relative group">
          {/* Header del widget */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              {description && <p className="text-sm text-white/60">{description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                ✅ Conectado
              </span>
              <button
                onClick={refreshContent}
                className="text-white/60 hover:text-white p-1 rounded"
                title="Actualizar contenido"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Iframe container */}
          <div className="relative overflow-hidden rounded-lg border border-white/10 shadow-xl">
            <iframe
              id="moodle-iframe-react"
              src={src}
              className={`w-full ${height} transition-opacity duration-300`}
              allowFullScreen
              title={title}
              onLoad={handleIframeLoad}
            />

            {/* Loading overlay para el iframe */}
            {!iframeLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                  <p>Cargando {title.toLowerCase()}...</p>
                  <p className="text-xs text-white/60 mt-2">Esto puede tomar unos segundos</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoodleWidget;
