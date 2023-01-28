import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";

const ENTITIES = [
  getEntity("light", "bed_light", "on", {
    friendly_name: "Bed Light",
  }),
];

const CONFIGS = [
  {
    heading: "Basic example",
    config: `
- type: button
  entity: light.bed_light
    `,
  },
  {
    heading: "With Name (defined in card)",
    config: `
- type: button
  name: Custom Name
  entity: light.bed_light
    `,
  },
  {
    heading: "With Icon",
    config: `
- type: button
  entity: light.bed_light
  icon: mdi:tools
    `,
  },
  {
    heading: "With State",
    config: `
- type: button
  entity: light.bed_light
  show_state: true
    `,
  },
  {
    heading: "Custom Tap Action (toggle)",
    config: `
- type: button
  entity: light.bed_light
  tap_action:
    action: toggle
    `,
  },
  {
    heading: "Running Service",
    config: `
- type: button
  entity: light.bed_light
  service: light.toggle
    `,
  },
  {
    heading: "Invalid Entity",
    config: `
- type: button
  entity: sensor.invalid_entity
    `,
  },
];

@customElement("demo-lovelace-entity-button-card")
class DemoButtonEntity extends LitElement {
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
    "demo-lovelace-entity-button-card": DemoButtonEntity;
  }
}
