const now = () => new Date().toISOString();
const randomTime = () =>
  new Date(new Date().getTime() - Math.random() * 80 * 60 * 1000).toISOString();

/* eslint-disable no-unused-vars */

export class Entity {
  constructor(domain, objectId, state, baseAttributes) {
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
    console.log(
      `Unmocked service for ${this.entityId}: ${domain}/${service}`,
      data
    );
  }

  update(state, attributes = {}) {
    this.state = state;
    this.lastUpdated = now();
    this.lastChanged =
      state === this.state ? this.lastChanged : this.lastUpdated;
    this.attributes = Object.assign({}, this.baseAttributes, attributes);

    console.log("update", this.entityId, this);

    this.hass.updateStates({
      [this.entityId]: this.toState(),
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
  async handleService(domain, service, data) {
    if (!["homeassistant", this.domain].includes(domain)) return;

    if (service === "turn_on") {
      // eslint-disable-next-line
      let { brightness, hs_color, brightness_pct } = data;
      // eslint-disable-next-line
      brightness = (255 * brightness_pct) / 100;
      this.update(
        "on",
        Object.assign(this.attributes, {
          brightness,
          hs_color,
        })
      );
    } else if (service === "turn_off") {
      this.update("off");
    } else if (service === "toggle") {
      if (this.state === "on") {
        this.handleService(domain, "turn_off", data);
      } else {
        this.handleService(domain, "turn_on", data);
      }
    }
  }
}

export class LockEntity extends Entity {
  async handleService(domain, service, data) {
    if (domain !== this.domain) return;

    if (service === "lock") {
      this.update("locked");
    } else if (service === "unlock") {
      this.update("unlocked");
    }
  }
}

export class CoverEntity extends Entity {
  async handleService(domain, service, data) {
    if (domain !== this.domain) return;

    if (service === "open_cover") {
      this.update("open");
    } else if (service === "close_cover") {
      this.update("closing");
    }
  }
}

export class ClimateEntity extends Entity {
  async handleService(domain, service, data) {
    if (domain !== this.domain) return;

    if (service === "set_operation_mode") {
      this.update(
        data.operation_mode === "heat" ? "heat" : data.operation_mode,
        Object.assign(this.attributes, {
          operation_mode: data.operation_mode,
        })
      );
    }
  }
}

export class GroupEntity extends Entity {
  async handleService(domain, service, data) {
    if (!["homeassistant", this.domain].includes(domain)) return;

    await Promise.all(
      this.attributes.entity_id.map((ent) => {
        const entity = this.hass.mockEntities[ent];
        return entity.handleService(entity.domain, service, data);
      })
    );

    this.update(service === "turn_on" ? "on" : "off");
  }
}

const TYPES = {
  climate: ClimateEntity,
  light: LightEntity,
  lock: LockEntity,
  cover: CoverEntity,
  group: GroupEntity,
};

export default (domain, objectId, state, baseAttributes = {}) =>
  new (TYPES[domain] || Entity)(domain, objectId, state, baseAttributes);
