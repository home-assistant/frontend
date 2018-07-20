import fireEvent from '../../../src/common/dom/fire_event.js';

const ensureArray = val => (Array.isArray(val) ? val : [val]);
const now = () => new Date().toISOString();
const randomTime = () => new Date(new Date().getTime() - (Math.random() * 80 * 60 * 1000)).toISOString();

export class Entity {
  constructor(domain, objectId, state, baseAttributes = {}) {
    this.domain = domain;
    this.objectId = objectId;
    this.entityId = `${domain}.${objectId}`;
    this.lastChanged = randomTime();
    this.lastUpdated = randomTime();
    this.state = state;
    // These are the attributes that we always write to the state machine
    this.baseAttributes = baseAttributes;
    this.attributes = baseAttributes;
  }

  async handleService(domain, service, data) {
  }

  update(state, attributes = {}) {
    this.state = state;
    this.lastUpdated = now();
    this.lastChanged = state == this.state ? this.lastChanged : this.lastUpdated;
    this.attributes = Object.assign({}, this.baseAttributes, attributes);

    console.log("update", this.entityId, this);

    this.hass.updateStates({
      [this.entityId]: this.toState()
    });
  }

  toState() {
    return {
      entity_id: this.entityId,
      state: this.state,
      attributes: this.attributes,
      last_changed: this.lastChanged,
      last_updated: this.lastUpdated,
    };
  }
}

export class LightEntity extends Entity {
  constructor(objectId, state, baseAttributes) {
    super('light', objectId, state ? 'on' : 'off', baseAttributes);
  }

  async handleService(domain, service, data) {
    if (domain !== this.domain) return;

    if (service === 'turn_on') {
      const { brightness, hs_color } = data;
      this.update('on', Object.assign(this.attributes, {
        brightness,
        hs_color,
      }));
    } else if (service === 'turn_off') {
      this.update('off');
    } else if (service === 'toggle') {
      if (this.state === 'on') {
        this.handleService(domain, 'turn_off', data);
      } else {
        this.handleService(domain, 'turn_on', data);
      }
    }
  }
}

export class LockEntity extends Entity {
  constructor(objectId, state, baseAttributes) {
    super('lock', objectId, state ? 'locked' : 'unlocked', baseAttributes);
  }

  async handleService(domain, service, data) {
    if (domain !== this.domain) return;

    if (service === 'lock') {
      this.update('locked');
    } else if (service === 'unlock') {
      this.update('unlocked');
    }
  }
}

export class GroupEntity extends Entity {
  constructor(objectId, state, baseAttributes) {
    super('group', objectId, state, baseAttributes);
  }

  async handleService(domain, service, data) {
    if (!['group', 'homeassistant'].includes(domain)) return;

    await Promise.all(
      this.attributes.entity_id.map(
        ent => {
          const entity = this.hass.mockEntities[ent];
          entity.handleService(entity.domain, service, data);
        }
      ));

    this.update(service === 'turn_on' ? 'on' : 'off');
  }
}

export function provideHass(elements, { initialStates = {} } = {}) {
  elements = ensureArray(elements);

  const wsCommands = {};
  let hass;
  const entities = {};

  function updateHass(obj) {
    hass = Object.assign({}, hass, obj);
    elements.forEach((el) => { el.hass = hass; });
  }

  updateHass({
    mockEntities: entities,
    states: initialStates,
    config: {
      services: {

      }
    },

    addWSCommand(command, callback) {
      wsCommands[command] = callback;
    },

    async callService(domain, service, data) {
      fireEvent(elements[0], 'show-notification', { message: `Called service ${domain}/${service}` });
      if (data.entity_id) {
        await Promise.all(ensureArray(data.entity_id).map(
          ent => entities[ent].handleService(domain, service, data)));
      } else {
        console.log('unmocked callService', key, data);
      }
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
    },
    addEntities(newEntities) {
      const states = {};
      ensureArray(newEntities).forEach(ent => {
        ent.hass = hass;
        entities[ent.entityId] = ent;
        states[ent.entityId] = ent.toState();
      });
      this.updateStates(states);
    }
  });

  return hass;
}
