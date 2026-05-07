import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";
import { mockIcons } from "../../../../demo/src/stubs/icons";

const ENTITIES = [
  {
    entity_id: "light.controller_1",
    state: "on",
    attributes: {
      friendly_name: "Controller 1",
    },
  },
  {
    entity_id: "light.controller_2",
    state: "on",
    attributes: {
      friendly_name: "Controller 2",
    },
  },
  {
    entity_id: "light.floor",
    state: "off",
    attributes: {
      friendly_name: "Floor light",
    },
  },
  {
    entity_id: "light.kitchen",
    state: "on",
    attributes: {
      friendly_name: "Kitchen light",
    },
  },
];

const CONFIGS = [
  {
    heading: "Controller",
    config: `
- type: entities
  entities:
    - light.controller_1
    - light.controller_2
    - type: divider
    - light.floor
    - light.kitchen
    `,
  },
  {
    heading: "Demo",
    config: `
- type: conditional
  conditions:
    - entity: light.controller_1
      state: "on"
    - entity: light.controller_2
      state_not: "off"
  card:
    type: entities
    entities:
      - light.controller_1
      - light.controller_2
      - light.floor
      - light.kitchen
    `,
  },
];

@customElement("demo-lovelace-conditional-card")
class DemoConditional extends LitElement {
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
    "demo-lovelace-conditional-card": DemoConditional;
  }
}
