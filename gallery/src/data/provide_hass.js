import fireEvent from '../../../src/common/dom/fire_event.js';

const ensureArray = val => (Array.isArray(val) ? val : [val]);

const services = {
  'homeassistant.turn_off': (hass, domain, service, data) => {
    const newStates = {};
    ensureArray(data.entity_id).forEach((entityId) => {
      const current = hass.states[entityId];
      newStates[entityId] = Object.assign({}, current, {
        state: 'off',
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      });
    });
    hass.updateStates(newStates);
    return Promise.resolve();
  },
  'homeassistant.turn_on': (hass, domain, service, data) => {
    const newStates = {};
    ensureArray(data.entity_id).forEach((entityId) => {
      const current = hass.states[entityId];
      newStates[entityId] = Object.assign({}, current, {
        state: 'on',
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      });
    });
    hass.updateStates(newStates);
    return Promise.resolve();
  },
};

export default function provideFakeHass(elements, { states } = {}) {
  elements = ensureArray(elements);

  const wsCommands = {};
  let hass;

  function updateHass(obj) {
    hass = Object.assign({}, hass, obj);
    elements.forEach((el) => { el.hass = hass; });
  }

  updateHass({
    states,
    config: {
      services: {

      }
    },

    addWSCommand(command, callback) {
      wsCommands[command] = callback;
    },

    async callService(domain, service, data) {
      fireEvent(elements[0], 'show-notification', { message: `Called service ${domain}/${service}` });

      const key = `${domain}.${service}`;
      if (key in services) {
        return services[key](hass, domain, service, data);
      }
      console.log('unmocked callService', key, data);
      return Promise.resolve();
    },

    async callWS(msg) {
      const callback = wsCommands[msg.type];
      return callback ? callback(msg) : Promise.reject({
        code: 'command_not_mocked',
        message: 'This command is not implemented in the gallery.',
      });
    },

    async sendWS(msg) {
      const callback = wsCommands[msg.type];

      if (callback) {
        callback(msg);
      } else {
        console.error(`Unknown command: ${msg.type}`);
      }
      console.log('sendWS', msg);
    },

    updateHass,
    updateStates(newStates) {
      updateHass({
        states: Object.assign({}, hass.states, newStates),
      });
    }
  });
}
