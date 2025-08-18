import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import { CoverEntityFeature } from "../../../../src/data/cover";
import { LightColorMode } from "../../../../src/data/light";
import { LockEntityFeature } from "../../../../src/data/lock";
import { MediaPlayerEntityFeature } from "../../../../src/data/media-player";
import { VacuumEntityFeature } from "../../../../src/data/vacuum";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";
import { mockIcons } from "../../../../demo/src/stubs/icons";
import { ClimateEntityFeature } from "../../../../src/data/climate";
import { FanEntityFeature } from "../../../../src/data/fan";

const ENTITIES = [
  getEntity("switch", "tv_outlet", "on", {
    friendly_name: "TV outlet",
    device_class: "outlet",
  }),
  getEntity("light", "bed_light", "on", {
    friendly_name: "Bed Light",
    supported_color_modes: [LightColorMode.HS, LightColorMode.COLOR_TEMP],
  }),
  getEntity("light", "unavailable", "unavailable", {
    friendly_name: "Unavailable entity",
  }),
  getEntity("lock", "front_door", "locked", {
    friendly_name: "Front Door Lock",
    device_class: "lock",
    supported_features: LockEntityFeature.OPEN,
  }),
  getEntity("media_player", "living_room", "playing", {
    friendly_name: "Living room speaker",
    supported_features: MediaPlayerEntityFeature.VOLUME_SET,
  }),
  getEntity("climate", "thermostat", "heat", {
    current_temperature: 73,
    min_temp: 45,
    max_temp: 95,
    temperature: 80,
    hvac_modes: ["heat", "cool", "auto", "off"],
    friendly_name: "Thermostat",
    hvac_action: "heating",
  }),
  getEntity("person", "paulus", "home", {
    friendly_name: "Paulus",
  }),
  getEntity("vacuum", "first_floor_vacuum", "docked", {
    friendly_name: "First floor vacuum",
    supported_features:
      VacuumEntityFeature.START +
      VacuumEntityFeature.STOP +
      VacuumEntityFeature.RETURN_HOME,
  }),
  getEntity("cover", "kitchen_shutter", "open", {
    friendly_name: "Kitchen shutter",
    device_class: "shutter",
    supported_features:
      CoverEntityFeature.CLOSE +
      CoverEntityFeature.OPEN +
      CoverEntityFeature.STOP,
  }),
  getEntity("cover", "pergola_roof", "open", {
    friendly_name: "Pergola Roof",
    supported_features:
      CoverEntityFeature.CLOSE_TILT +
      CoverEntityFeature.OPEN_TILT +
      CoverEntityFeature.STOP_TILT,
  }),
  getEntity("input_number", "counter", "1.0", {
    friendly_name: "Counter",
    initial: 0,
    min: 0,
    max: 100,
    step: 1,
    mode: "slider",
  }),
  getEntity("climate", "dual_thermostat", "heat/cool", {
    friendly_name: "Dual thermostat",
    hvac_modes: ["off", "cool", "heat_cool", "auto", "dry", "fan_only"],
    min_temp: 7,
    max_temp: 35,
    fan_modes: ["on_low", "on_high", "auto_low", "auto_high", "off"],
    preset_modes: ["home", "eco", "away"],
    swing_modes: ["auto", "1", "2", "3", "off"],
    switch_horizontal_modes: ["auto", "4", "5", "6", "off"],
    current_temperature: 23,
    target_temp_high: 24,
    target_temp_low: 21,
    fan_mode: "auto_low",
    preset_mode: "home",
    swing_mode: "auto",
    swing_horizontal_mode: "off",
    supported_features:
      ClimateEntityFeature.TURN_ON +
      ClimateEntityFeature.TURN_OFF +
      ClimateEntityFeature.SWING_MODE +
      ClimateEntityFeature.SWING_HORIZONTAL_MODE +
      ClimateEntityFeature.PRESET_MODE +
      ClimateEntityFeature.FAN_MODE +
      ClimateEntityFeature.TARGET_TEMPERATURE_RANGE,
  }),
  getEntity("fan", "fan_direction", "on", {
    friendly_name: "Ceiling fan",
    device_class: "fan",
    direction: "reverse",
    supported_features: [FanEntityFeature.DIRECTION],
  }),
];

const CONFIGS = [
  {
    heading: "Basic example",
    config: `
- type: tile
  entity: switch.tv_outlet
    `,
  },
  {
    heading: "Vertical example",
    config: `
- type: tile
  entity: switch.tv_outlet
  vertical: true
    `,
  },
  {
    heading: "Custom color",
    config: `
- type: tile
  entity: switch.tv_outlet
  color: pink
    `,
  },
  {
    heading: "Whole tile tap action",
    config: `
- type: tile
  entity: switch.tv_outlet
  color: pink
  tap_action:
    action: toggle
  icon_tap_action:
    action: none
    `,
  },
  {
    heading: "Unknown entity",
    config: `
- type: tile
  entity: light.unknown
    `,
  },
  {
    heading: "Unavailable entity",
    config: `
- type: tile
  entity: light.unavailable
    `,
  },
  {
    heading: "Climate",
    config: `
- type: tile
  entity: climate.thermostat
    `,
  },
  {
    heading: "Person",
    config: `
- type: tile
  entity: person.paulus
    `,
  },
  {
    heading: "Light brightness feature",
    config: `
- type: tile
  entity: light.bed_light
  features:
    - type: "light-brightness"
    `,
  },
  {
    heading: "Light color temperature feature",
    config: `
- type: tile
  entity: light.bed_light
  features:
    - type: "color-temp"
    `,
  },
  {
    heading: "Lock commands feature",
    config: `
- type: tile
  entity: lock.front_door
  features:
    - type: "lock-commands"
    `,
  },
  {
    heading: "Lock open door feature",
    config: `
- type: tile
  entity: lock.front_door
  features:
    - type: "lock-open-door"
    `,
  },
  {
    heading: "Media player volume slider feature",
    config: `
- type: tile
  entity: media_player.living_room
  features:
    - type: "media-player-volume-slider"
    `,
  },
  {
    heading: "Vacuum commands feature",
    config: `
- type: tile
  entity: vacuum.first_floor_vacuum
  features:
    - type: "vacuum-commands"
      commands:
        - start_pause
        - stop
        - return_home
    `,
  },
  {
    heading: "Cover open close feature",
    config: `
- type: tile
  entity: cover.kitchen_shutter
  features:
    - type: "cover-open-close"
    `,
  },
  {
    heading: "Cover tilt feature",
    config: `
- type: tile
  entity: cover.pergola_roof
  features:
  - type: "cover-tilt"
    `,
  },
  {
    heading: "Number buttons feature",
    config: `
- type: tile
  entity: input_number.counter
  features:
  - type: numeric-input
    style: buttons
    `,
  },
  {
    heading: "Dual thermostat feature",
    config: `
- type: tile
  entity: climate.dual_thermostat
  features:
  - type: target-temperature
    `,
  },
  {
    heading: "Fan direction feature",
    config: `
- type: tile
  entity: fan.fan_direction
  features:
  - type: fan-direction
    `,
  },
];

@customElement("demo-lovelace-tile-card")
class DemoTile extends LitElement {
  @query("#demos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    hass.addEntities(ENTITIES);
    mockIcons(hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-tile-card": DemoTile;
  }
}
