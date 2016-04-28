export default function NuclearObserver(reactor) {
  return {

    attached() {
      this.nuclearUnwatchFns = Object.keys(this.properties).reduce(
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
            this[key] = val;
          }));
        }, []);
    },

    detached() {
      while (this.nuclearUnwatchFns.length) {
        this.nuclearUnwatchFns.shift()();
      }
    },

  };
}
