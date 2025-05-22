export class CacheManager<T> {
  constructor(expiration?: number) {
    this._expiration = expiration;
  }

  private _expiration?: number;

  private _cache = new Map<string, T>();

  public get(key: string): T | undefined {
    return this._cache.get(key);
  }

  public set(key: string, value: T): void {
    this._cache.set(key, value);
    if (this._expiration) {
      window.setTimeout(() => this._cache.delete(key), this._expiration);
    }
  }

  public has(key: string): boolean {
    return this._cache.has(key);
  }
}
