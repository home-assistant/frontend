import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";

const ENTITIES = [
  getEntity("switch", "decorative_lights", "on", {
    friendly_name: "Decorative Lights",
  }),
  getEntity("light", "ceiling_lights", "on", {
    friendly_name: "Ceiling Lights",
  }),
  getEntity("binary_sensor", "movement_backyard", "on", {
    friendly_name: "Movement Backyard",
    device_class: "moving",
  }),
  getEntity("binary_sensor", "basement_floor_wet", "off", {
    friendly_name: "Basement Floor Wet",
    device_class: "moisture",
  }),
];

const CONFIGS = [
  {
    heading: "Title, dialog, toggle",
    config: `
- type: picture-glance
  image: /images/living_room.png
  title: Living room
  entities:
    - switch.decorative_lights
    - light.ceiling_lights
    - binary_sensor.movement_backyard
    - binary_sensor.basement_floor_wet
    `,
  },
  {
    heading: "Title, dialog, no toggle",
    config: `
- type: picture-glance
  image: /images/living_room.png
  title: Living room
  entities:
    - binary_sensor.movement_backyard
    - binary_sensor.basement_floor_wet
    `,
  },
  {
    heading: "Title, no dialog, toggle",
    config: `
- type: picture-glance
  image: /images/living_room.png
  title: Living room
  entities:
    - switch.decorative_lights
    - light.ceiling_lights
    `,
  },
  {
    heading: "No title, dialog, toggle",
    config: `
- type: picture-glance
  image: /images/living_room.png
  entities:
    - switch.decorative_lights
    - light.ceiling_lights
    - binary_sensor.movement_backyard
    - binary_sensor.basement_floor_wet
    `,
  },
  {
    heading: "No title, dialog, no toggle",
    config: `
- type: picture-glance
  image: /images/living_room.png
  entities:
    - binary_sensor.movement_backyard
    - binary_sensor.basement_floor_wet
    `,
  },
  {
    heading: "No title, no dialog, toggle",
    config: `
- type: picture-glance
  image: /images/living_room.png
  entities:
    - switch.decorative_lights
    - light.ceiling_lights
    `,
  },
  {
    heading: "Custom icon",
    config: `
- type: picture-glance
  image: /images/living_room.png
  title: Living room
  entities:
    - entity: switch.decorative_lights
      icon: mdi:power
    - binary_sensor.basement_floor_wet
    `,
  },
  {
    heading: "Custom tap action",
    config: `
- type: picture-glance
  image: /images/living_room.png
  title: Living room
  entity: light.ceiling_lights
  tap_action:
    action: toggle
  entities:
    - entity: switch.decorative_lights
      icon: mdi:power
      tap_action:
        action: toggle
    - binary_sensor.basement_floor_wet
    `,
  },
];

@customElement("demo-lovelace-picture-glance-card")
class DemoPictureGlance extends LitElement {
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
    "demo-lovelace-picture-glance-card": DemoPictureGlance;
  }
}
