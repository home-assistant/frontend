export default function NuclearObserver(reactor) {
  return {

    attached: function() {
      var component = this;
      this.__unwatchFns = Object.keys(component.properties).reduce(
        function(unwatchFns, key) {
          if (!('bindNuclear' in component.properties[key])) {
            return unwatchFns;
          }
          var getter = component.properties[key].bindNuclear;

          if (!getter) {
            throw 'Undefined getter specified for key ' + key;
          }

          component[key] = reactor.evaluate(getter);

          return unwatchFns.concat(reactor.observe(getter, function(val) {
            if (__DEV__) {
              console.log(component, key, val);
            }
            component[key] = val;
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
