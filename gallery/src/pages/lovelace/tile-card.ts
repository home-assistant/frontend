import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { CoverEntityFeature } from "../../../../src/data/cover";
import { LightColorMode } from "../../../../src/data/light";
import { VacuumEntityFeature } from "../../../../src/data/vacuum";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";

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
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-tile-card": DemoTile;
  }
}
