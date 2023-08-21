/* eslint-disable max-classes-per-file */
import {
  HassEntity,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";
import { supportsFeature } from "../common/entity/supports-feature";
import { ClimateEntityFeature } from "../data/climate";

const now = () => new Date().toISOString();
const randomTime = () =>
  new Date(new Date().getTime() - Math.random() * 80 * 60 * 1000).toISOString();

export class Entity {
  public domain: string;

  public objectId: string;

  public entityId: string;

  public lastChanged: string;

  public lastUpdated: string;

  public state: string;

  public baseAttributes: HassEntityAttributeBase & Record<string, any>;

  public attributes: HassEntityAttributeBase & Record<string, any>;

  public hass?: any;

  constructor(domain, objectId, state, baseAttributes) {
    this.domain = domain;
    this.objectId = objectId;
    this.entityId = `${domain}.${objectId}`;
    this.lastChanged = randomTime();
    this.lastUpdated = randomTime();
    this.state = String(state);
    // These are the attributes that we always write to the state machine
    this.baseAttributes = baseAttributes;
    this.attributes = baseAttributes;
  }

  public async handleService(domain, service, data: Record<string, any>) {
    // eslint-disable-next-line
    console.log(
      `Unmocked service for ${this.entityId}: ${domain}/${service}`,
      data
    );
  }

  public update(state, attributes = {}) {
    this.state = state;
    this.lastUpdated = now();
    this.lastChanged =
      state === this.state ? this.lastChanged : this.lastUpdated;
    this.attributes = { ...this.baseAttributes, ...attributes };

    // eslint-disable-next-line
    console.log("update", this.entityId, this);

    this.hass.updateStates({
      [this.entityId]: this.toState(),
    });
  }

  public toState() {
    return {
      entity_id: this.entityId,
      state: this.state,
      attributes: this.attributes,
      last_changed: this.lastChanged,
      last_updated: this.lastUpdated,
    };
  }
}

class LightEntity extends Entity {
  public async handleService(domain, service, data) {
    if (!["homeassistant", this.domain].includes(domain)) {
      return;
    }

    if (service === "turn_on") {
      // eslint-disable-next-line
      let { hs_color, brightness_pct, rgb_color, color_temp } = data;
      const attrs = { ...this.attributes };
      if (brightness_pct) {
        attrs.brightness = (255 * brightness_pct) / 100;
      } else if (!attrs.brightness) {
        attrs.brightness = 255;
      }
      if (hs_color) {
        attrs.color_mode = "hs";
        attrs.hs_color = hs_color;
      }
      if (rgb_color) {
        attrs.color_mode = "rgb";
        attrs.rgb_color = rgb_color;
      }
      if (color_temp) {
        attrs.color_mode = "color_temp";
        attrs.color_temp = color_temp;
        delete attrs.rgb_color;
      }
      this.update("on", attrs);
    } else if (service === "turn_off") {
      this.update("off");
    } else if (service === "toggle") {
      if (this.state === "on") {
        this.handleService(domain, "turn_off", data);
      } else {
        this.handleService(domain, "turn_on", data);
      }
    } else {
      super.handleService(domain, service, data);
    }
  }
}

class ToggleEntity extends Entity {
  public async handleService(domain, service, data) {
    if (!["homeassistant", this.domain].includes(domain)) {
      return;
    }

    if (service === "turn_on") {
      this.update("on", this.attributes);
    } else if (service === "turn_off") {
      this.update("off", this.attributes);
    } else if (service === "toggle") {
      if (this.state === "on") {
        this.handleService(domain, "turn_off", data);
      } else {
        this.handleService(domain, "turn_on", data);
      }
    } else {
      super.handleService(domain, service, data);
    }
  }
}

class LockEntity extends Entity {
  public async handleService(
    domain,
    service,
    // @ts-ignore
    data
  ) {
    if (domain !== this.domain) {
      return;
    }

    if (service === "lock") {
      this.update("locked");
    } else if (service === "unlock") {
      this.update("unlocked");
    } else {
      super.handleService(domain, service, data);
    }
  }
}

class AlarmControlPanelEntity extends Entity {
  public async handleService(
    domain,
    service,
    // @ts-ignore
    data
  ) {
    if (domain !== this.domain) {
      return;
    }

    const serviceStateMap = {
      alarm_arm_night: "armed_night",
      alarm_arm_home: "armed_home",
      alarm_arm_away: "armed_away",
      alarm_disarm: "disarmed",
    };

    if (serviceStateMap[service]) {
      this.update(serviceStateMap[service], this.baseAttributes);
    } else {
      super.handleService(domain, service, data);
    }
  }
}

class MediaPlayerEntity extends Entity {
  public async handleService(
    domain,
    service,
    // @ts-ignore
    data
  ) {
    if (domain !== this.domain) {
      return;
    }

    if (service === "media_play_pause") {
      this.update(
        this.state === "playing" ? "paused" : "playing",
        this.attributes
      );
    } else {
      super.handleService(domain, service, data);
    }
  }
}

class CoverEntity extends Entity {
  public async handleService(
    domain,
    service,
    // @ts-ignore
    data
  ) {
    if (domain !== this.domain) {
      return;
    }

    if (service === "open_cover") {
      this.update("open");
    } else if (service === "close_cover") {
      this.update("closing");
    } else {
      super.handleService(domain, service, data);
    }
  }
}

class InputNumberEntity extends Entity {
  public async handleService(
    domain,
    service,
    // @ts-ignore
    data
  ) {
    if (domain !== this.domain) {
      return;
    }

    if (service === "set_value") {
      this.update("" + data.value);
    } else {
      super.handleService(domain, service, data);
    }
  }
}

class InputTextEntity extends Entity {
  public async handleService(
    domain,
    service,
    // @ts-ignore
    data
  ) {
    if (domain !== this.domain) {
      return;
    }

    if (service === "set_value") {
      this.update("" + data.value);
    } else {
      super.handleService(domain, service, data);
    }
  }
}

class InputSelectEntity extends Entity {
  public async handleService(
    domain,
    service,
    // @ts-ignore
    data
  ) {
    if (domain !== this.domain) {
      return;
    }

    if (service === "select_option") {
      this.update("" + data.option);
    } else {
      super.handleService(domain, service, data);
    }
  }
}

class ClimateEntity extends Entity {
  public async handleService(domain, service, data) {
    if (domain !== this.domain) {
      return;
    }

    if (service === "set_hvac_mode") {
      this.update(data.hvac_mode, this.attributes);
    } else if (
      [
        "set_temperature",
        "set_humidity",
        "set_hvac_mode",
        "set_fan_mode",
        "set_preset_mode",
        "set_swing_mode",
        "set_aux_heat",
      ].includes(service)
    ) {
      const { entity_id, ...toSet } = data;
      this.update(this.state, {
        ...this.attributes,
        ...toSet,
      });
    } else {
      super.handleService(domain, service, data);
    }
  }

  public toState() {
    const state = super.toState();

    state.attributes.hvac_action = undefined;

    if (
      supportsFeature(
        state as HassEntity,
        ClimateEntityFeature.TARGET_TEMPERATURE
      )
    ) {
      const current = state.attributes.current_temperature;
      const target = state.attributes.temperature;
      if (state.state === "heat") {
        state.attributes.hvac_action = target >= current ? "heating" : "idle";
      }
      if (state.state === "cool") {
        state.attributes.hvac_action = target <= current ? "cooling" : "idle";
      }
    }
    if (
      supportsFeature(
        state as HassEntity,
        ClimateEntityFeature.TARGET_TEMPERATURE_RANGE
      )
    ) {
      const current = state.attributes.current_temperature;
      const lowTarget = state.attributes.target_temp_low;
      const highTarget = state.attributes.target_temp_high;
      state.attributes.hvac_action =
        lowTarget >= current
          ? "heating"
          : highTarget <= current
          ? "cooling"
          : "idle";
    }
    return state;
  }
}

class WaterHeaterEntity extends Entity {
  public async handleService(domain, service, data) {
    if (domain !== this.domain) {
      return;
    }

    if (service === "set_operation_mode") {
      this.update(data.operation_mode, this.attributes);
    } else if (["set_temperature"].includes(service)) {
      const { entity_id, ...toSet } = data;
      this.update(this.state, {
        ...this.attributes,
        ...toSet,
      });
    } else {
      super.handleService(domain, service, data);
    }
  }
}

class GroupEntity extends Entity {
  public async handleService(domain, service, data) {
    if (!["homeassistant", this.domain].includes(domain)) {
      return;
    }

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
  alarm_control_panel: AlarmControlPanelEntity,
  climate: ClimateEntity,
  cover: CoverEntity,
  group: GroupEntity,
  input_boolean: ToggleEntity,
  input_number: InputNumberEntity,
  input_text: InputTextEntity,
  input_select: InputSelectEntity,
  light: LightEntity,
  lock: LockEntity,
  media_player: MediaPlayerEntity,
  switch: ToggleEntity,
  water_heater: WaterHeaterEntity,
};

export const getEntity = (
  domain,
  objectId,
  state,
  baseAttributes = {}
): Entity =>
  new (TYPES[domain] || Entity)(domain, objectId, state, baseAttributes);

type LimitedEntity = Pick<HassEntity, "state" | "attributes" | "entity_id">;

export const convertEntities = (states: {
  [entityId: string]: LimitedEntity;
}): Entity[] =>
  Object.keys(states).map((entId) => {
    const stateObj = states[entId];
    const [domain, objectId] = entId.split(".", 2);
    return getEntity(domain, objectId, stateObj.state, stateObj.attributes);
  });
