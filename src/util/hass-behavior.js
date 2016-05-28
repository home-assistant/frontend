export default {

  attached() {
    const hass = this.hass;

    if (!hass) {
      throw new Error(`No hass property found on ${this.nodeName}`);
    }

    this.nuclearUnwatchFns = Object.keys(this.properties).reduce(
      (unwatchFns, key) => {
        if (!('bindNuclear' in this.properties[key])) {
          return unwatchFns;
        }

        let getter = this.properties[key].bindNuclear;

        if (typeof getter !== 'function') {
          /* eslint-disable no-console */
          console.warn(`Component ${this.nodeName} uses old style bindNuclear`);
          /* eslint-enable no-console */
        } else {
          getter = getter(hass);
        }

        if (!getter) {
          throw new Error(`Undefined getter specified for key ${key}`);
        }

        this[key] = hass.reactor.evaluate(getter);

        return unwatchFns.concat(hass.reactor.observe(getter, (val) => {
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
