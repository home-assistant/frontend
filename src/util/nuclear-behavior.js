export default function NuclearObserver(reactor) {
  return {

    attached() {
      this.__unwatchFns = Object.keys(this.properties).reduce(
        (unwatchFns, key) => {
          if (!('bindNuclear' in this.properties[key])) {
            return unwatchFns;
          }
          const getter = this.properties[key].bindNuclear;
          if (!getter) {
            throw new Error(`Undefined getter specified for key ${key}`);
          }
          this[key] = reactor.evaluate(getter);

          return unwatchFns.concat(reactor.observe(getter, (val) => {
            if (__DEV__) {
              /* eslint-disable no-console */
              console.log(this, key, val);
              /* eslint-enable no-console */
            }
            this[key] = val;
          }));
        }, []);
    },

    detached() {
      while (this.__unwatchFns.length) {
        this.__unwatchFns.shift()();
      }
    },

  };
}
