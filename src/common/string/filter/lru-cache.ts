import { EntityTouch, LinkedMap } from "./linked-map";

export class LRUCache<K, V> extends LinkedMap<K, V> {
  private _limit: number;

  private _ratio: number;

  constructor(limit: number, ratio = 1) {
    super();
    this._limit = limit;
    this._ratio = Math.min(Math.max(0, ratio), 1);
  }

  get limit(): number {
    return this._limit;
  }

  set limit(limit: number) {
    this._limit = limit;
    this.checkTrim();
  }

  get ratio(): number {
    return this._ratio;
  }

  set ratio(ratio: number) {
    this._ratio = Math.min(Math.max(0, ratio), 1);
    this.checkTrim();
  }

  get(key: K, touch: EntityTouch = EntityTouch.AsNew): V | undefined {
    return super.get(key, touch);
  }

  peek(key: K): V | undefined {
    return super.get(key, EntityTouch.None);
  }

  set(key: K, value: V): this {
    super.set(key, value, EntityTouch.AsNew);
    this.checkTrim();
    return this;
  }

  private checkTrim() {
    if (this.size > this._limit) {
      this.trimOld(Math.round(this._limit * this._ratio));
    }
  }
}
