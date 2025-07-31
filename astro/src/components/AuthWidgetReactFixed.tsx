import React, { useEffect, useState } from 'react';

interface UserData {
  fullname?: string;
  email?: string;
  authenticated?: boolean;
  name?: string;
  firstname?: string;
  lastname?: string;
}

type AuthState = 'loading' | 'logged-out' | 'logged-in';

const AuthWidgetReactFixed: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userData, setUserData] = useState<UserData | null>(null);

  // Verificación básica sin fetch para debug
  useEffect(() => {
    console.log('AuthWidgetReactFixed: Component mounted');

    // Simular verificación después de 2 segundos
    const timer = setTimeout(() => {
      console.log('AuthWidgetReactFixed: Setting state to logged-out');
      setAuthState('logged-out');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  console.log('AuthWidgetReactFixed: Rendering with state:', authState);

  if (authState === 'loading') {
    return (
      <div style={{
        padding: '10px',
        background: 'orange',
        color: 'white',
        border: '1px solid white',
        margin: '5px',
        borderRadius: '8px'
      }}>
        <h3>Auth Loading...</h3>
        <div>🔄 Verificando...</div>
      </div>
    );
  }

  if (authState === 'logged-out') {
    return (
      <div style={{
        padding: '10px',
        background: 'green',
        color: 'white',
        border: '1px solid white',
        margin: '5px',
        borderRadius: '8px'
      }}>
        <h3>No autenticado</h3>
        <div>👤 Login requerido</div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '10px',
      background: 'purple',
      color: 'white',
      border: '1px solid white',
      margin: '5px',
      borderRadius: '8px'
    }}>
      <h3>Autenticado</h3>
      <div>✅ Usuario logueado</div>
    </div>
  );
};

export default AuthWidgetReactFixed;
