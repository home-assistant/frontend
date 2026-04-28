import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";
import { mockIcons } from "../../../../demo/src/stubs/icons";

const ENTITIES = [
  {
    entity_id: "light.bed_light",
    state: "on",
    attributes: {
      friendly_name: "Bed Light",
      brightness: 255,
    },
  },
  {
    entity_id: "light.dim_on",
    state: "on",
    attributes: {
      friendly_name: "Dining Room",
      supported_features: 1,
      brightness: 100,
    },
  },
  {
    entity_id: "light.dim_off",
    state: "off",
    attributes: {
      friendly_name: "Dining Room",
      supported_features: 1,
    },
  },
  {
    entity_id: "light.unavailable",
    state: "unavailable",
    attributes: {
      friendly_name: "Lost Light",
      supported_features: 1,
    },
  },
];

const CONFIGS = [
  {
    heading: "Switchable Light",
    config: `
- type: light
  entity: light.bed_light
    `,
  },
  {
    heading: "Dimmable Light On",
    config: `
- type: light
  entity: light.dim_on
    `,
  },
  {
    heading: "Dimmable Light Off",
    config: `
- type: light
  entity: light.dim_off
    `,
  },
  {
    heading: "Unavailable",
    config: `
- type: light
  entity: light.unavailable
    `,
  },
  {
    heading: "Non existing",
    config: `
- type: light
  entity: light.nonexisting
    `,
  },
];

@customElement("demo-lovelace-light-card")
class DemoLightEntity extends LitElement {
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
    "demo-lovelace-light-card": DemoLightEntity;
  }
}
