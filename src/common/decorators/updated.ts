import { PropertyValues, ReactiveElement } from "lit";
import { ClassElement } from "../../types";

/**
 * Observer function type.
 */
export interface Observer {
  (value: any, old: any): void;
}

/**
 * Specifies an observer callback that is run when the decorated property
 * changes. The observer receives the current and old value as arguments.
 * @updated(function (this: HaConfigRepairs, val, oldVal) {
 *   console.log("updated", val, oldVal);
 * })
 * @state()
 * private _property;
 */

export const updated =
  (obsrvr: Observer): any =>
  (clsElement: ClassElement) => ({
    ...clsElement,
    finisher(cls: any) {
      // if we haven't wrapped `updated` in this class, do so
      if (!cls.prototype._observers) {
        cls.prototype._observers = new Map<PropertyKey, Observer>();
        const userUpdated = cls.prototype.updated;
        cls.prototype.updated = function (
          this: ReactiveElement,
          changedProperties: PropertyValues
        ) {
          userUpdated.call(this, changedProperties);
          changedProperties.forEach((v, k) => {
            const observers = (this as any)._observers;
            const obsvr = observers.get(k);
            if (obsvr !== undefined) {
              obsvr.call(this, (this as any)[k], v);
            }
          });
        };
        // clone any existing observers (superclasses)
        // eslint-disable-next-line no-prototype-builtins
      } else if (!cls.prototype.hasOwnProperty("_observers")) {
        const observers = cls.prototype._observers;
        cls.prototype._observers = new Map();
        observers.forEach((v: any, k: PropertyKey) =>
          cls.prototype._observers.set(k, v)
        );
      }
      // set this method
      cls.prototype._observers.set(clsElement.key, obsrvr);
    },
  });
