import React from 'react';

const TestReact: React.FC = () => {
  return (
    <div style={{
      padding: '20px',
      background: 'red',
      color: 'white',
      border: '2px solid yellow',
      margin: '10px'
    }}>
      <h2>TEST REACT COMPONENT</h2>
      <p>Si ves esto, React está funcionando correctamente!</p>
      <button onClick={() => alert('React está hidratado!')}>
        Probar interactividad
      </button>
    </div>
  );
};

export default TestReact;
