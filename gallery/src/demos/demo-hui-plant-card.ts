import {
  customElement,
  html,
  LitElement,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";
import { createPlantEntities } from "../data/plants";

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

@customElement("demo-hui-plant-card")
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

customElements.define("demo-hui-plant-card", DemoPlantEntity);
