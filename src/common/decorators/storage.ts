import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { ReactiveElement } from "lit";

type Callback = (oldValue: any, newValue: any) => void;

type ReactiveStorageElement = ReactiveElement & {
  __unbsubLocalStorage: UnsubscribeFunc | undefined;
  __initialized: boolean;
};

class StorageClass {
  constructor(store = window.localStorage) {
    this.storage = store;
    if (this.storage !== window.localStorage) {
      // storage events only work for localStorage
      return;
    }
    window.addEventListener("storage", (ev: StorageEvent) => {
      if (ev.key && this.hasKey(ev.key)) {
        this._storage[ev.key] = ev.newValue
          ? JSON.parse(ev.newValue)
          : ev.newValue;
        if (this._listeners[ev.key]) {
          this._listeners[ev.key].forEach((listener) =>
            listener(
              ev.oldValue ? JSON.parse(ev.oldValue) : ev.oldValue,
              this._storage[ev.key!]
            )
          );
        }
      }
    });
  }

  public storage: globalThis.Storage;

  private _storage: Record<string, any> = {};

  private _listeners: Record<string, Callback[]> = {};

  public addFromStorage(storageKey: any): void {
    if (!this._storage[storageKey]) {
      const data = this.storage.getItem(storageKey);
      if (data) {
        this._storage[storageKey] = JSON.parse(data);
      }
    }
  }

  public subscribeChanges(
    storageKey: string,
    callback: Callback
  ): UnsubscribeFunc {
    const listeners = this._listeners[storageKey];
    if (listeners) {
      listeners.push(callback);
    } else {
      this._listeners[storageKey] = [callback];
    }
    return () => {
      this.unsubscribeChanges(storageKey, callback);
    };
  }

  public unsubscribeChanges(storageKey: string, callback: Callback) {
    if (!(storageKey in this._listeners)) {
      return;
    }
    const index = this._listeners[storageKey].indexOf(callback);
    if (index !== -1) {
      this._listeners[storageKey].splice(index, 1);
    }
  }

  public hasKey(storageKey: string): any {
    return storageKey in this._storage;
  }

  public getValue<T = any>(storageKey: string): T | undefined {
    if (!(storageKey in this._storage)) {
      this.addFromStorage(storageKey);
    }

    return this._storage[storageKey];
  }

  public setValue<T = any>(storageKey: string, value: T): void {
    const oldValue = this._storage[storageKey];
    this._storage[storageKey] = value;
    try {
      if (value === undefined) {
        this.storage.removeItem(storageKey);
      } else {
        this.storage.setItem(storageKey, JSON.stringify(value));
      }
    } catch (_err: any) {
      // Safari in private mode doesn't allow localstorage
    } finally {
      if (this._listeners[storageKey]) {
        this._listeners[storageKey].forEach((listener) =>
          listener(oldValue, value)
        );
      }
    }
  }
}

const storages: Record<string, StorageClass> = {};

export type StorageName = "localStorage" | "sessionStorage";

// Shared with `@storage`, so code that isn't a decorated field sees the same values
export const getStorage = (
  storageName: StorageName = "localStorage"
): StorageClass => {
  if (!(storageName in storages)) {
    storages[storageName] = new StorageClass(window[storageName]);
  }

  return storages[storageName];
};

export function storage(options: {
  key?: string;
  storage?: StorageName;
  subscribe?: boolean;
  state?: boolean;
  serializer?: (value: any) => any;
  deserializer?: (value: any) => any;
}) {
  return <ElemClass extends ReactiveElement>(
    proto: ElemClass,
    propertyKey: string
  ) => {
    if (typeof propertyKey === "object") {
      throw new Error("This decorator does not support this compilation type.");
    }

    const storageInstance = getStorage(options.storage);

    const storageKey = options.key || String(propertyKey);

    storageInstance.addFromStorage(storageKey);

    const subscribeChanges =
      options.subscribe !== false
        ? (el: ReactiveElement): UnsubscribeFunc =>
            storageInstance.subscribeChanges(
              storageKey!,
              (oldValue, _newValue) => {
                el.requestUpdate(propertyKey, oldValue);
              }
            )
        : undefined;

    const getValue = (): any =>
      storageInstance.hasKey(storageKey!)
        ? options.deserializer
          ? options.deserializer(storageInstance.getValue(storageKey!))
          : storageInstance.getValue(storageKey!)
        : undefined;

    const setValue = (el: ReactiveElement, value: any) => {
      let oldValue: unknown | undefined;
      if (options.state) {
        oldValue = getValue();
      }
      storageInstance.setValue(
        storageKey!,
        options.serializer ? options.serializer(value) : value
      );
      if (options.state) {
        el.requestUpdate(propertyKey, oldValue);
      }
    };

    // @ts-ignore
    const performUpdate = proto.performUpdate;
    // @ts-ignore
    proto.performUpdate = function () {
      (this as unknown as ReactiveStorageElement).__initialized = true;
      performUpdate.call(this);
    };

    if (options.subscribe) {
      const connectedCallback = proto.connectedCallback;
      const disconnectedCallback = proto.disconnectedCallback;

      proto.connectedCallback = function () {
        connectedCallback.call(this);
        const el = this as unknown as ReactiveStorageElement;
        if (!el.__unbsubLocalStorage) {
          el.__unbsubLocalStorage = subscribeChanges?.(this);
        }
      };
      proto.disconnectedCallback = function () {
        disconnectedCallback.call(this);
        const el = this as unknown as ReactiveStorageElement;
        el.__unbsubLocalStorage?.();
        el.__unbsubLocalStorage = undefined;
      };
    }

    const descriptor = Object.getOwnPropertyDescriptor(proto, propertyKey);
    let newDescriptor: PropertyDescriptor;
    if (descriptor === undefined) {
      newDescriptor = {
        get(this: ReactiveStorageElement) {
          return getValue();
        },
        set(this: ReactiveStorageElement, value) {
          // Don't set the initial value if we have a value in localStorage
          if (this.__initialized || getValue() === undefined) {
            setValue(this, value);
          }
        },
        configurable: true,
        enumerable: true,
      };
    } else {
      const oldSetter = descriptor.set;
      newDescriptor = {
        ...descriptor,
        get(this: ReactiveStorageElement) {
          return getValue();
        },
        set(this: ReactiveStorageElement, value) {
          // Don't set the initial value if we have a value in localStorage
          if (this.__initialized || getValue() === undefined) {
            setValue(this, value);
          }
          oldSetter?.call(this, value);
        },
      };
    }
    Object.defineProperty(proto, propertyKey, newDescriptor);
  };
}
