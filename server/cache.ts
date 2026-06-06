type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class Cache {
  private store = new Map<string, CacheEntry<unknown>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
    this.timers.forEach(t => clearTimeout(t));
    this.timers.clear();
  }

  getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return Promise.resolve(cached);
    return factory().then(value => {
      this.set(key, value, ttlMs);
      return value;
    });
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }
}

export const cache = new Cache();
