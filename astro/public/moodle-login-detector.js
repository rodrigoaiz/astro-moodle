// Script para detectar login exitoso en Moodle y notificar a la ventana padre
(function() {
  'use strict';

  // Solo ejecutar si estamos en una ventana popup
  if (window.opener && window.opener !== window) {

    // Función para verificar si el usuario está logueado
    const checkIfLoggedIn = () => {
      // Buscar indicadores de que el usuario está logueado
      const indicators = [
        // Menú de usuario
        '.usermenu',
        '.user-menu',
        '[data-region="user-menu"]',
        // Avatar o nombre de usuario
        '.usertext',
        '.username',
        // Dashboard o elementos de usuario logueado
        '#page-my-index',
        '#page-site-index',
        '.dashboard',
        // Header con usuario logueado
        '.navbar .user',
        // Cualquier elemento que indique login
        '[data-region="drawer"]'
      ];

      const hasLoginIndicator = indicators.some(selector =>
        document.querySelector(selector) !== null
      );

      // También verificar si NO estamos en página de login
      const notOnLoginPage = !window.location.href.includes('/login/');

      // Y verificar si estamos en una página que requiere autenticación
      const onAuthenticatedPage = window.location.href.includes('/my/') ||
                                 window.location.href.includes('/course/') ||
                                 window.location.href.includes('/dashboard/') ||
                                 (window.location.href.includes('/learning/') &&
                                  !window.location.href.includes('/login/') &&
                                  !window.location.href.includes('/signup/'));

      return hasLoginIndicator || (notOnLoginPage && onAuthenticatedPage);
    };
    // Función para notificar login exitoso
    const notifyLoginSuccess = () => {
      console.log('User appears to be logged in, notifying parent window');

      // Notificar a la ventana padre
      try {
        window.opener.postMessage({
          type: 'MOODLE_LOGIN_SUCCESS',
          timestamp: Date.now()
        }, window.location.origin);

        // También marcar en localStorage
        localStorage.setItem('moodle_auth_changed', 'true');

        // Cerrar el popup después de un breve delay
        setTimeout(() => {
          window.close();
        }, 1500);

      } catch (error) {
        console.error('Error notifying parent window:', error);
      }
    };

    // Verificar si el usuario ya está logueado
    if (checkIfLoggedIn()) {
      notifyLoginSuccess();
    }

    // Verificar cuando el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (checkIfLoggedIn()) {
          notifyLoginSuccess();
        }
      });
    }

    // Verificar cada 2 segundos por si el login toma tiempo
    const checkInterval = setInterval(() => {
      if (checkIfLoggedIn()) {
        notifyLoginSuccess();
        clearInterval(checkInterval);
      }
    }, 2000);

    // Detener verificación después de 30 segundos
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 30000);

    // También escuchar cambios en la URL (en caso de redirects)
    let currentUrl = window.location.href;
    const urlCheckInterval = setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(() => {
          if (checkIfLoggedIn()) {
            notifyLoginSuccess();
            clearInterval(urlCheckInterval);
          }
        }, 500); // Dar tiempo para que cargue la página
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(urlCheckInterval);
    }, 30000);
  }
})();
