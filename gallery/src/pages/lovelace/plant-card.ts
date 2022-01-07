import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";
import { createPlantEntities } from "../../data/plants";

const CONFIGS = [
  {
    heading: "Basic example",
    config: `
- type: plant-status
  entity: plant.lemon_tree
    `,
  },
  {
    heading: "Problem (too bright) + low battery",
    config: `
- type: plant-status
  entity: plant.apple_tree
    `,
  },
  {
    heading: "With picture + multiple problems",
    config: `
- type: plant-status
  entity: plant.sunflowers
  name: Sunflowers Name Overwrite
    `,
  },
];

@customElement("demo-lovelace-plant-card")
export class DemoPlantEntity extends LitElement {
  @query("#demos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    hass.addEntities(createPlantEntities());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-plant-card": DemoPlantEntity;
  }
}
