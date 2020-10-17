import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { PropertyDeclaration, UpdatingElement } from "lit-element";
import type { ClassElement } from "../../types";

type Callback = (oldValue: any, newValue: any) => void;

class Storage {
  constructor() {
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

  private _storage: { [storageKey: string]: any } = {};

  private _listeners: {
    [storageKey: string]: Callback[];
  } = {};

  public addFromStorage(storageKey: any): void {
    if (!this._storage[storageKey]) {
      const data = window.localStorage.getItem(storageKey);
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
    this._storage[storageKey] = value;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (err) {
      // Safari in private mode doesn't allow localstorage
    }
  }
}

const storage = new Storage();

export const LocalStorage = (
  storageKey?: string,
  property?: boolean,
  propertyOptions?: PropertyDeclaration
): any => {
  return (clsElement: ClassElement) => {
    const key = String(clsElement.key);
    storageKey = storageKey || String(clsElement.key);
    const initVal = clsElement.initializer
      ? clsElement.initializer()
      : undefined;

    storage.addFromStorage(storageKey);

    const subscribe = (el: UpdatingElement): UnsubscribeFunc =>
      storage.subscribeChanges(storageKey!, (oldValue) => {
        el.requestUpdate(clsElement.key, oldValue);
      });

    const getValue = (): any => {
      return storage.hasKey(storageKey!)
        ? storage.getValue(storageKey!)
        : initVal;
    };

    const setValue = (el: UpdatingElement, value: any) => {
      let oldValue: unknown | undefined;
      if (property) {
        oldValue = getValue();
      }
      storage.setValue(storageKey!, value);
      if (property) {
        el.requestUpdate(clsElement.key, oldValue);
      }
    };

    return {
      kind: "method",
      placement: "prototype",
      key: clsElement.key,
      descriptor: {
        set(this: UpdatingElement, value: unknown) {
          setValue(this, value);
        },
        get() {
          return getValue();
        },
        enumerable: true,
        configurable: true,
      },
      finisher(cls: typeof UpdatingElement) {
        if (property) {
          const connectedCallback = cls.prototype.connectedCallback;
          const disconnectedCallback = cls.prototype.disconnectedCallback;
          cls.prototype.connectedCallback = function () {
            connectedCallback.call(this);
            this[`__unbsubLocalStorage${key}`] = subscribe(this);
          };
          cls.prototype.disconnectedCallback = function () {
            disconnectedCallback.call(this);
            this[`__unbsubLocalStorage${key}`]();
          };
          cls.createProperty(clsElement.key, {
            noAccessor: true,
            ...propertyOptions,
          });
        }
      },
    };
  };
};
