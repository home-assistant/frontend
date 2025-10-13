import type { ReactiveElement, PropertyValues } from "lit";
/**
 * Transform function type.
 */
export type Transformer<T = any, V = any> = (value: T) => V | undefined;

type ReactiveTransformElement = ReactiveElement & {
  _transformers: Map<PropertyKey, Transformer>;
  _watching: Map<PropertyKey, Set<PropertyKey>>;
};

/**
 * Specifies a transformer callback that is run when the value of the decorated property, or any of the properties in the watching array, changes.
 * The result of the transformer is assigned to the decorated property.
 * The transformer receives the current as argument.
 */
export function transform<T, V>(config: {
  transformer: Transformer<T, V>;
  watch?: PropertyKey[];
}) {
  return <ElemClass extends ReactiveElement>(
    proto: ElemClass,
    propertyKey: string
  ) => {
    if (typeof propertyKey === "object") {
      throw new Error("This decorator does not support this compilation type.");
    }

    const key = String(propertyKey);

    const el = proto as unknown as ReactiveTransformElement;

    // if we haven't wrapped `willUpdate` in this class, do so
    if (!el._transformers) {
      el._transformers = new Map<PropertyKey, Transformer>();
      el._watching = new Map<PropertyKey, Set<PropertyKey>>();
      // @ts-ignore
      const userWillUpdate = el.willUpdate;
      // @ts-ignore
      el.willUpdate = function (
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
    } else if (!el.hasOwnProperty("_transformers")) {
      const tranformers = el._transformers;
      el._transformers = new Map();
      tranformers.forEach((v: any, k: PropertyKey) =>
        el._transformers.set(k, v)
      );
    }
    // set this method
    el._transformers.set(propertyKey, config.transformer);
    if (config.watch) {
      // store watchers
      config.watch.forEach((k) => {
        let curWatch = el._watching.get(k);
        if (!curWatch) {
          curWatch = new Set();
          el._watching.set(k, curWatch);
        }
        curWatch.add(propertyKey);
      });
    }

    const descriptor = Object.getOwnPropertyDescriptor(proto, propertyKey);
    let newDescriptor: PropertyDescriptor;
    if (descriptor === undefined) {
      newDescriptor = {
        get(this: ReactiveTransformElement): V {
          return this[`__transform_${key}`];
        },
        set(this: ReactiveTransformElement, value: T) {
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
        configurable: true,
        enumerable: true,
      };
    } else {
      const oldSetter = descriptor.set;
      newDescriptor = {
        ...descriptor,
        set(this: ReactiveTransformElement, value: T) {
          const oldValue = this[`__transform_${key}`];
          const trnsformr: Transformer | undefined =
            this._transformers.get(key);
          if (trnsformr) {
            this[`__transform_${key}`] = trnsformr.call(this, value);
          } else {
            this[`__transform_${key}`] = value;
          }
          this[`__original_${key}`] = value;
          this.requestUpdate(key, oldValue);
          oldSetter?.call(this, value);
        },
      };
    }
    Object.defineProperty(proto, propertyKey, newDescriptor);
  };
}
