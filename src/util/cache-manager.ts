export class CacheManager<T> {
  constructor(timeout?: number) {
    this._timeout = timeout;
  }

  private _timeout?: number;

  private _cache = new Map<string, T>();

  public get(key: string): T | undefined {
    return this._cache.get(key);
  }

  public set(key: string, value: T): void {
    this._cache.set(key, value);
    if (this._timeout) {
      window.setTimeout(() => this._cache.delete(key), this._timeout);
    }
  }

  public has(key: string): boolean {
    return this._cache.has(key);
  }

  public entries() {
    return this._cache.entries();
  }
}
