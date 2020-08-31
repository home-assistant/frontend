import type { ClassElement } from "../../types";

class Storage {
  private _storage: any = {};

  public addFromStorage(storageKey: any): void {
    if (!this._storage[storageKey]) {
      const data = window.localStorage.getItem(storageKey);
      if (data) {
        this._storage[storageKey] = JSON.parse(data);
      }
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

export const LocalStorage = (key?: string) => {
  return (element: ClassElement, propName: string) => {
    const storageKey = key || propName;
    const initVal = element.initializer ? element.initializer() : undefined;

    storage.addFromStorage(storageKey);

    const getValue = (): any => {
      return storage.hasKey(storageKey)
        ? storage.getValue(storageKey)
        : initVal;
    };

    const setValue = (val: any) => {
      storage.setValue(storageKey, val);
    };

    return {
      kind: "method",
      placement: "own",
      key: element.key,
      descriptor: {
        set(value) {
          setValue(value);
        },
        get() {
          return getValue();
        },
        enumerable: true,
        configurable: true,
      },
    };
  };
};
