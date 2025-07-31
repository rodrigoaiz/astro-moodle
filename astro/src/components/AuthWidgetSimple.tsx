import React, { useState } from 'react';

const AuthWidgetSimple: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div style={{
      padding: '10px',
      background: 'blue',
      color: 'white',
      border: '1px solid white',
      margin: '5px',
      borderRadius: '8px'
    }}>
      <h3>AuthWidget Simple</h3>
      <p>Contador: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Incrementar
      </button>
    </div>
  );
};

export default AuthWidgetSimple;
