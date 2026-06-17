// hooks/useTelemetry.ts - Implementação real sem loop
import { useCallback } from 'react';

export const useTelemetry = () => {
  const trackEvent = useCallback((event: string, data?: any) => {
    console.log(`📊 Telemetry: ${event}`, data);
    // Aqui você pode adicionar integração com Google Analytics, Mixpanel, etc.
  }, []);

  const trackError = useCallback((error: Error, context?: any) => {
    console.warn(`⚠️ Telemetry Error:`, error, context);
    // Log de erros para Sentry ou similares
  }, []);

  const trackMetric = useCallback((metric: string, value: number) => {
    console.log(`📈 Metric ${metric}: ${value}`);
    // Métricas de performance
  }, []);

  return {
    trackEvent,
    trackError,
    trackMetric
  };
};