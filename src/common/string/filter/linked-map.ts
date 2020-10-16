export enum EntityTouch {
  None = 0,
  AsOld = 1,
  AsNew = 2,
}

interface Item<K, V> {
  previous: Item<K, V> | undefined;
  next: Item<K, V> | undefined;
  key: K;
  value: V;
}

export class LinkedMap<K, V> implements Map<K, V> {
  readonly [Symbol.toStringTag] = "LinkedMap";

  private _map: Map<K, Item<K, V>>;

  private _head: Item<K, V> | undefined;

  private _tail: Item<K, V> | undefined;

  private _size: number;

  private _state: number;

  constructor() {
    this._map = new Map<K, Item<K, V>>();
    this._head = undefined;
    this._tail = undefined;
    this._size = 0;
    this._state = 0;
  }

  clear(): void {
    this._map.clear();
    this._head = undefined;
    this._tail = undefined;
    this._size = 0;
    this._state++;
  }

  isEmpty(): boolean {
    return !this._head && !this._tail;
  }

  get size(): number {
    return this._size;
  }

  get first(): V | undefined {
    return this._head?.value;
  }

  get last(): V | undefined {
    return this._tail?.value;
  }

  has(key: K): boolean {
    return this._map.has(key);
  }

  get(key: K, touch: EntityTouch = EntityTouch.None): V | undefined {
    const item = this._map.get(key);
    if (!item) {
      return undefined;
    }
    if (touch !== EntityTouch.None) {
      this.touch(item, touch);
    }
    return item.value;
  }

  set(key: K, value: V, touch: EntityTouch = EntityTouch.None): this {
    let item = this._map.get(key);
    if (item) {
      item.value = value;
      if (touch !== EntityTouch.None) {
        this.touch(item, touch);
      }
    } else {
      item = { key, value, next: undefined, previous: undefined };
      switch (touch) {
        case EntityTouch.None:
          this.addItemLast(item);
          break;
        case EntityTouch.AsOld:
          this.addItemFirst(item);
          break;
        case EntityTouch.AsNew:
          this.addItemLast(item);
          break;
        default:
          this.addItemLast(item);
          break;
      }
      this._map.set(key, item);
      this._size++;
    }
    return this;
  }

  delete(key: K): boolean {
    return !!this.remove(key);
  }

  remove(key: K): V | undefined {
    const item = this._map.get(key);
    if (!item) {
      return undefined;
    }
    this._map.delete(key);
    this.removeItem(item);
    this._size--;
    return item.value;
  }

  shift(): V | undefined {
    if (!this._head && !this._tail) {
      return undefined;
    }
    if (!this._head || !this._tail) {
      throw new Error("Invalid list");
    }
    const item = this._head;
    this._map.delete(item.key);
    this.removeItem(item);
    this._size--;
    return item.value;
  }

  forEach(
    callbackfn: (value: V, key: K, map: LinkedMap<K, V>) => void,
    thisArg?: any
  ): void {
    const state = this._state;
    let current = this._head;
    while (current) {
      if (thisArg) {
        callbackfn.bind(thisArg)(current.value, current.key, this);
      } else {
        callbackfn(current.value, current.key, this);
      }
      if (this._state !== state) {
        throw new Error(`LinkedMap got modified during iteration.`);
      }
      current = current.next;
    }
  }

  keys(): IterableIterator<K> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const map = this;
    const state = this._state;
    let current = this._head;
    const iterator: IterableIterator<K> = {
      [Symbol.iterator]() {
        return iterator;
      },
      next(): IteratorResult<K> {
        if (map._state !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result = { value: current.key, done: false };
          current = current.next;
          return result;
        }
        return { value: undefined, done: true };
      },
    };
    return iterator;
  }

  values(): IterableIterator<V> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const map = this;
    const state = this._state;
    let current = this._head;
    const iterator: IterableIterator<V> = {
      [Symbol.iterator]() {
        return iterator;
      },
      next(): IteratorResult<V> {
        if (map._state !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result = {
            value: current.value,
            done: false,
          };
          current = current.next;
          return result;
        }
        return { value: undefined, done: true };
      },
    };
    return iterator;
  }

  entries(): IterableIterator<[K, V]> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const map = this;
    const state = this._state;
    let current = this._head;
    const iterator: IterableIterator<[K, V]> = {
      [Symbol.iterator]() {
        return iterator;
      },
      next(): IteratorResult<[K, V]> {
        if (map._state !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result: IteratorResult<[K, V]> = {
            value: [current.key, current.value],
            done: false,
          };
          current = current.next;
          return result;
        }
        return {
          value: undefined,
          done: true,
        };
      },
    };
    return iterator;
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }

  protected trimOld(newSize: number) {
    if (newSize >= this.size) {
      return;
    }
    if (newSize === 0) {
      this.clear();
      return;
    }
    let current = this._head;
    let currentSize = this.size;
    while (current && currentSize > newSize) {
      this._map.delete(current.key);
      current = current.next;
      currentSize--;
    }
    this._head = current;
    this._size = currentSize;
    if (current) {
      current.previous = undefined;
    }
    this._state++;
  }

  private addItemFirst(item: Item<K, V>): void {
    // First time Insert
    if (!this._head && !this._tail) {
      this._tail = item;
    } else if (!this._head) {
      throw new Error("Invalid list");
    } else {
      item.next = this._head;
      this._head.previous = item;
    }
    this._head = item;
    this._state++;
  }

  private addItemLast(item: Item<K, V>): void {
    // First time Insert
    if (!this._head && !this._tail) {
      this._head = item;
    } else if (!this._tail) {
      throw new Error("Invalid list");
    } else {
      item.previous = this._tail;
      this._tail.next = item;
    }
    this._tail = item;
    this._state++;
  }

  private removeItem(item: Item<K, V>): void {
    if (item === this._head && item === this._tail) {
      this._head = undefined;
      this._tail = undefined;
    } else if (item === this._head) {
      // This can only happend if size === 1 which is handle
      // by the case above.
      if (!item.next) {
        throw new Error("Invalid list");
      }
      item.next.previous = undefined;
      this._head = item.next;
    } else if (item === this._tail) {
      // This can only happend if size === 1 which is handle
      // by the case above.
      if (!item.previous) {
        throw new Error("Invalid list");
      }
      item.previous.next = undefined;
      this._tail = item.previous;
    } else {
      const next = item.next;
      const previous = item.previous;
      if (!next || !previous) {
        throw new Error("Invalid list");
      }
      next.previous = previous;
      previous.next = next;
    }
    item.next = undefined;
    item.previous = undefined;
    this._state++;
  }

  private touch(item: Item<K, V>, touch: EntityTouch): void {
    if (!this._head || !this._tail) {
      throw new Error("Invalid list");
    }
    if (touch !== EntityTouch.AsOld && touch !== EntityTouch.AsNew) {
      return;
    }

    if (touch === EntityTouch.AsOld) {
      if (item === this._head) {
        return;
      }

      const next = item.next;
      const previous = item.previous;

      // Unlink the item
      if (item === this._tail) {
        // previous must be defined since item was not head but is tail
        // So there are more than on item in the map
        previous!.next = undefined;
        this._tail = previous;
      } else {
        // Both next and previous are not undefined since item was neither head nor tail.
        next!.previous = previous;
        previous!.next = next;
      }

      // Insert the node at head
      item.previous = undefined;
      item.next = this._head;
      this._head.previous = item;
      this._head = item;
      this._state++;
    } else if (touch === EntityTouch.AsNew) {
      if (item === this._tail) {
        return;
      }

      const next = item.next;
      const previous = item.previous;

      // Unlink the item.
      if (item === this._head) {
        // next must be defined since item was not tail but is head
        // So there are more than on item in the map
        next!.previous = undefined;
        this._head = next;
      } else {
        // Both next and previous are not undefined since item was neither head nor tail.
        next!.previous = previous;
        previous!.next = next;
      }
      item.next = undefined;
      item.previous = this._tail;
      this._tail.next = item;
      this._tail = item;
      this._state++;
    }
  }

  toJSON(): [K, V][] {
    const data: [K, V][] = [];

    this.forEach((value, key) => {
      data.push([key, value]);
    });

    return data;
  }

  fromJSON(data: [K, V][]): void {
    this.clear();

    for (const [key, value] of data) {
      this.set(key, value);
    }
  }
}
