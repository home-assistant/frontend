import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { ReactiveElement } from "lit";
import { InternalPropertyDeclaration } from "lit/decorators";
import type { ClassElement } from "../../types";

type Callback = (oldValue: any, newValue: any) => void;

class StorageClass {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    if (storage !== window.localStorage) {
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

  private _storage: { [storageKey: string]: any } = {};

  private _listeners: {
    [storageKey: string]: Callback[];
  } = {};

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
    if (this._listeners[storageKey]) {
      this._listeners[storageKey].push(callback);
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

  public getValue(storageKey: string): any {
    return this._storage[storageKey];
  }

  public setValue(storageKey: string, value: any): any {
    const oldValue = this._storage[storageKey];
    this._storage[storageKey] = value;
    try {
      if (value === undefined) {
        this.storage.removeItem(storageKey);
      } else {
        this.storage.setItem(storageKey, JSON.stringify(value));
      }
    } catch (err: any) {
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

export const storage =
  (options: {
    key?: string;
    storage?: "localStorage" | "sessionStorage";
    subscribe?: boolean;
    state?: boolean;
    stateOptions?: InternalPropertyDeclaration;
  }): any =>
  (clsElement: ClassElement) => {
    const storageName = options.storage || "localStorage";

    let storageInstance: StorageClass;
    if (storageName && storageName in storages) {
      storageInstance = storages[storageName];
    } else {
      storageInstance = new StorageClass(window[storageName]);
      storages[storageName] = storageInstance;
    }

    const key = String(clsElement.key);
    const storageKey = options.key || String(clsElement.key);
    const initVal = clsElement.initializer
      ? clsElement.initializer()
      : undefined;

    storageInstance.addFromStorage(storageKey);

    const subscribeChanges =
      options.subscribe !== false
        ? (el: ReactiveElement): UnsubscribeFunc =>
            storageInstance.subscribeChanges(
              storageKey!,
              (oldValue, _newValue) => {
                el.requestUpdate(clsElement.key, oldValue);
              }
            )
        : undefined;

    const getValue = (): any =>
      storageInstance.hasKey(storageKey!)
        ? storageInstance.getValue(storageKey!)
        : initVal;

    const setValue = (el: ReactiveElement, value: any) => {
      let oldValue: unknown | undefined;
      if (options.state) {
        oldValue = getValue();
      }
      storageInstance.setValue(storageKey!, value);
      if (options.state) {
        el.requestUpdate(clsElement.key, oldValue);
      }
    };

    return {
      kind: "method",
      placement: "prototype",
      key: clsElement.key,
      descriptor: {
        set(this: ReactiveElement, value: unknown) {
          setValue(this, value);
        },
        get() {
          return getValue();
        },
        enumerable: true,
        configurable: true,
      },
      finisher(cls: typeof ReactiveElement) {
        if (options.state && options.subscribe) {
          const connectedCallback = cls.prototype.connectedCallback;
          const disconnectedCallback = cls.prototype.disconnectedCallback;
          cls.prototype.connectedCallback = function () {
            connectedCallback.call(this);
            this[`__unbsubLocalStorage${key}`] = subscribeChanges?.(this);
          };
          cls.prototype.disconnectedCallback = function () {
            disconnectedCallback.call(this);
            this[`__unbsubLocalStorage${key}`]?.();
            this[`__unbsubLocalStorage${key}`] = undefined;
          };
        }
        if (options.state) {
          cls.createProperty(clsElement.key, {
            noAccessor: true,
            ...options.stateOptions,
          });
        }
      },
    };
  };
