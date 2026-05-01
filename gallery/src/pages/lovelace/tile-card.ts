import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import { CoverEntityFeature } from "../../../../src/data/cover";
import { LightColorMode } from "../../../../src/data/light";
import { LockEntityFeature } from "../../../../src/data/lock";
import { MediaPlayerEntityFeature } from "../../../../src/data/media-player";
import { VacuumEntityFeature } from "../../../../src/data/vacuum";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";
import { mockIcons } from "../../../../demo/src/stubs/icons";
import { ClimateEntityFeature } from "../../../../src/data/climate";
import { FanEntityFeature } from "../../../../src/data/fan";

const ENTITIES = [
  {
    entity_id: "switch.tv_outlet",
    state: "on",
    attributes: {
      friendly_name: "TV outlet",
      device_class: "outlet",
    },
  },
  {
    entity_id: "light.bed_light",
    state: "on",
    attributes: {
      friendly_name: "Bed Light",
      supported_color_modes: [LightColorMode.HS, LightColorMode.COLOR_TEMP],
    },
  },
  {
    entity_id: "light.unavailable",
    state: "unavailable",
    attributes: {
      friendly_name: "Unavailable entity",
    },
  },
  {
    entity_id: "lock.front_door",
    state: "locked",
    attributes: {
      friendly_name: "Front Door Lock",
      device_class: "lock",
      supported_features: LockEntityFeature.OPEN,
    },
  },
  {
    entity_id: "media_player.living_room",
    state: "playing",
    attributes: {
      friendly_name: "Living room speaker",
      supported_features: MediaPlayerEntityFeature.VOLUME_SET,
    },
  },
  {
    entity_id: "climate.thermostat",
    state: "heat",
    attributes: {
      current_temperature: 73,
      min_temp: 45,
      max_temp: 95,
      temperature: 80,
      hvac_modes: ["heat", "cool", "auto", "off"],
      friendly_name: "Thermostat",
      hvac_action: "heating",
    },
  },
  {
    entity_id: "person.paulus",
    state: "home",
    attributes: {
      friendly_name: "Paulus",
    },
  },
  {
    entity_id: "vacuum.first_floor_vacuum",
    state: "docked",
    attributes: {
      friendly_name: "First floor vacuum",
      supported_features:
        VacuumEntityFeature.START +
        VacuumEntityFeature.STOP +
        VacuumEntityFeature.RETURN_HOME,
    },
  },
  {
    entity_id: "cover.kitchen_shutter",
    state: "open",
    attributes: {
      friendly_name: "Kitchen shutter",
      device_class: "shutter",
      supported_features:
        CoverEntityFeature.CLOSE +
        CoverEntityFeature.OPEN +
        CoverEntityFeature.STOP,
    },
  },
  {
    entity_id: "cover.pergola_roof",
    state: "open",
    attributes: {
      friendly_name: "Pergola Roof",
      supported_features:
        CoverEntityFeature.CLOSE_TILT +
        CoverEntityFeature.OPEN_TILT +
        CoverEntityFeature.STOP_TILT,
    },
  },
  {
    entity_id: "input_number.counter",
    state: "1.0",
    attributes: {
      friendly_name: "Counter",
      initial: 0,
      min: 0,
      max: 100,
      step: 1,
      mode: "slider",
    },
  },
  {
    entity_id: "climate.dual_thermostat",
    state: "heat/cool",
    attributes: {
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
    },
  },
  {
    entity_id: "fan.fan_demo",
    state: "on",
    attributes: {
      friendly_name: "Ceiling fan",
      device_class: "fan",
      direction: "reverse",
      supported_features:
        FanEntityFeature.DIRECTION +
        FanEntityFeature.SET_SPEED +
        FanEntityFeature.OSCILLATE,
    },
  },
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
  entity: fan.fan_demo
  features:
  - type: fan-direction
    `,
  },
  {
    heading: "Fan speed feature",
    config: `
- type: tile
  entity: fan.fan_demo
  features:
  - type: fan-speed
    `,
  },
  {
    heading: "Fan oscillate feature",
    config: `
- type: tile
  entity: fan.fan_demo
  features:
  - type: fan-oscillate
    `,
  },
];

@customElement("demo-lovelace-tile-card")
class DemoTile extends LitElement {
  @query("#demos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
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
