import { PropertyDeclaration, UpdatingElement } from "lit-element";
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

export const LocalStorage = (
  key?: string,
  property?: boolean,
  propertyOptions?: PropertyDeclaration
): any => {
  return (element: ClassElement) => {
    const storageKey = key || (element.key as string);
    const initVal = element.initializer ? element.initializer() : undefined;

    storage.addFromStorage(storageKey);

    const getValue = (): any => {
      return storage.hasKey(storageKey)
        ? storage.getValue(storageKey)
        : initVal;
    };

    const setValue = (el: UpdatingElement, value: any) => {
      let oldValue: unknown | undefined;
      if (property) {
        oldValue = getValue();
      }
      storage.setValue(storageKey, value);
      if (property) {
        el.requestUpdate(element.key, oldValue);
      }
    };

    return {
      kind: "method",
      placement: "prototype",
      key: element.key,
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
          cls.createProperty(element.key, {
            noAccessor: true,
            ...propertyOptions,
          });
        }
      },
    };
  };
};
