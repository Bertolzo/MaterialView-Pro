// App.MINIMAL.tsx - Versão minimal para diagnosticar loading infinito
import React, { useState } from 'react';

const App = () => {
  const [debugMessage, setDebugMessage] = useState('App carregando...');

  console.log('🔄 App MINIMAL - Iniciando render');
  
  // Simula um processo de inicialização
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebugMessage('✅ App carregado com sucesso!');
      console.log('✅ App MINIMAL - Load completo');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🚀 App MINIMAL - Teste de Loading</h1>
      <p><strong>Status:</strong> {debugMessage}</p>
      <p><strong>Verificações:</strong></p>
      <ul>
        <li>✅ React funcionando</li>
        <li>✅ Hooks funcionais</li>
        <li>✅ Estado do React funcionando</li>
        <li>⏳ Aguardando conclusão do timeout</li>
      </ul>
    </div>
  );
};

export default App;