import { PropertyDeclaration, PropertyValues, ReactiveElement } from "lit";
import { ClassElement } from "../../types";
import { shallowEqual } from "../util/shallow-equal";

/**
 * Transform function type.
 */
export interface Transformer<T = any, V = any> {
  (value: V): T;
}

type ReactiveTransformElement = ReactiveElement & {
  _transformers: Map<PropertyKey, Transformer>;
  _watching: Map<PropertyKey, Set<PropertyKey>>;
};

type ReactiveElementClassWithTransformers = typeof ReactiveElement & {
  prototype: ReactiveTransformElement;
};

/**
 * Specifies an tranformer callback that is run when the value of the decorated property, or any of the properties in the watching array, changes.
 * The result of the tranformer is assigned to the decorated property.
 * The tranformer receives the current as arguments.
 */
export const transform =
  <T, V>(config: {
    transformer: Transformer<T, V>;
    watch?: PropertyKey[];
    propertyOptions?: PropertyDeclaration;
  }): any =>
  (clsElement: ClassElement) => {
    const key = String(clsElement.key);
    return {
      ...clsElement,
      kind: "method",
      descriptor: {
        set(this: ReactiveTransformElement, value: V) {
          const oldValue = this[`__transform_${key}`];
          const trnsformr: Transformer<T, V> | undefined =
            this._transformers.get(key);
          if (trnsformr) {
            this[`__transform_${key}`] = trnsformr.call(this, value);
          } else {
            this[`__transform_${key}`] = value;
          }
          this[`__original_${key}`] = value;
          this.requestUpdate(key, oldValue);
        },
        get(): T {
          return this[`__transform_${key}`];
        },
        enumerable: true,
        configurable: true,
      },
      finisher(cls: ReactiveElementClassWithTransformers) {
        // if we haven't wrapped `willUpdate` in this class, do so
        if (!cls.prototype._transformers) {
          cls.prototype._transformers = new Map<PropertyKey, Transformer>();
          cls.prototype._watching = new Map<PropertyKey, Set<PropertyKey>>();
          // @ts-ignore
          const userWillUpdate = cls.prototype.willUpdate;
          // @ts-ignore
          cls.prototype.willUpdate = function (
            this: ReactiveTransformElement,
            changedProperties: PropertyValues
          ) {
            userWillUpdate.call(this, changedProperties);
            const keys = new Set<PropertyKey>();
            changedProperties.forEach((_v, k) => {
              const watchers = this._watching;
              const ks: Set<PropertyKey> | undefined = watchers.get(k);
              if (ks !== undefined) {
                ks.forEach((wk) => keys.add(wk));
              }
            });
            keys.forEach((k) => {
              // trigger setter
              this[k] = this[`__original_${String(k)}`];
            });
          };
          // clone any existing observers (superclasses)
          // eslint-disable-next-line no-prototype-builtins
        } else if (!cls.prototype.hasOwnProperty("_transformers")) {
          const tranformers = cls.prototype._transformers;
          cls.prototype._transformers = new Map();
          tranformers.forEach((v: any, k: PropertyKey) =>
            cls.prototype._transformers.set(k, v)
          );
        }
        // set this method
        cls.prototype._transformers.set(clsElement.key, config.transformer);
        if (config.watch) {
          // store watchers
          config.watch.forEach((k) => {
            let curWatch = cls.prototype._watching.get(k);
            if (!curWatch) {
              curWatch = new Set();
              cls.prototype._watching.set(k, curWatch);
            }
            curWatch.add(clsElement.key);
          });
        }
        cls.createProperty(clsElement.key, {
          noAccessor: true,
          hasChanged: (v: any, o: any) => !shallowEqual(v, o),
          ...config.propertyOptions,
        });
      },
    };
  };
