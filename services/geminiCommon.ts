// services/geminiCommon.ts - Mock para SecurityCircuitBreaker
export class SecurityCircuitBreaker {
  private static instance: SecurityCircuitBreaker;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;

  static getInstance(): SecurityCircuitBreaker {
    if (!SecurityCircuitBreaker.instance) {
      SecurityCircuitBreaker.instance = new SecurityCircuitBreaker();
    }
    return SecurityCircuitBreaker.instance;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    console.log('Mock SecurityCircuitBreaker.execute');
    try {
      return await operation();
    } catch (error) {
      console.warn('Circuit breaker fallback:', error);
      throw error;
    }
  }
}