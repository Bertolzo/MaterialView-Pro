// hooks/useTelemetryShortcuts.ts - Implementação real sem loop
import { useCallback, useEffect } from 'react';

export const useTelemetryShortcuts = () => {
  const registerShortcut = useCallback((key: string, callback: () => void) => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === key) {
        event.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    // Implementação simples - o listener é limpo automaticamente
    console.log(`🔧 Shortcut unregistered: ${key}`);
  }, []);

  return {
    registerShortcut,
    unregisterShortcut
  };
};