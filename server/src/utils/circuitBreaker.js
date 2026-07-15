export const CircuitBreakerState = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN"
};

export class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.cooldownPeriod = options.cooldownPeriod || 30000; // 30 seconds
    this.requestTimeout = options.requestTimeout || 5000; // 5 seconds
    
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.nextAttempt = Date.now();
  }

  async fire(actionFn, fallbackFn) {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.nextAttempt <= Date.now()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        console.log(`[CircuitBreaker:${this.name}] Transitioning to HALF_OPEN`);
      } else {
        if (fallbackFn) return fallbackFn();
        throw new Error(`[CircuitBreaker:${this.name}] Circuit is OPEN. Fast-failing.`);
      }
    }

    try {
      // Execute the action with a timeout
      const result = await this.executeWithTimeout(actionFn);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallbackFn) return fallbackFn(err);
      throw err;
    }
  }

  executeWithTimeout(actionFn) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`[CircuitBreaker:${this.name}] Request timed out after ${this.requestTimeout}ms`));
      }, this.requestTimeout);

      actionFn()
        .then((res) => {
          clearTimeout(timeoutId);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      console.log(`[CircuitBreaker:${this.name}] Transitioning to CLOSED`);
    }
  }

  onFailure() {
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold || this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttempt = Date.now() + this.cooldownPeriod;
      console.log(`[CircuitBreaker:${this.name}] Transitioning to OPEN. Next attempt in ${this.cooldownPeriod}ms`);
    }
  }
}
