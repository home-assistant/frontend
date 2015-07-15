export default function NuclearObserver(reactor) {
  return {

    attached: function() {
      this.__unwatchFns = Object.keys(this.properties).reduce(
        (unwatchFns, key) => {
          if (!('bindNuclear' in this.properties[key])) {
            return unwatchFns;
          }
          var getter = this.properties[key].bindNuclear;

          if (!getter) {
            throw 'Undefined getter specified for key ' + key;
          }

          this[key] = reactor.evaluate(getter);

          return unwatchFns.concat(reactor.observe(getter, (val) => {
            if (__DEV__) {
              console.log(this, key, val);
            }
            this[key] = val;
          }));
      }, []);
    },

    detached: function() {
      while (this.__unwatchFns.length) {
        this.__unwatchFns.shift()();
      }
    },

  };
};
