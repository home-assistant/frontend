import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import type { PictureCardConfig } from "../../../../src/panels/lovelace/cards/types";
import type { DemoCardConfig } from "../../components/demo-card";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";
import { mockIcons } from "../../../../demo/src/stubs/icons";

const ENTITIES = [
  {
    entity_id: "person.paulus",
    state: "home",
    attributes: {
      friendly_name: "Paulus",
      entity_picture: "/images/paulus.jpg",
    },
  },
];

const CONFIGS = [
  {
    heading: "Image URL",
    config: {
      type: "picture",
      image: "/images/living_room.png",
    },
  },
  {
    heading: "Person entity",
    config: {
      type: "picture",
      image_entity: "person.paulus",
    },
  },
  {
    heading: "Error: Image required",
    config: {
      type: "picture",
    },
    expectConfigError: true,
  },
] satisfies DemoCardConfig<PictureCardConfig>[];

@customElement("demo-lovelace-picture-card")
class DemoPicture extends LitElement {
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
    "demo-lovelace-picture-card": DemoPicture;
  }
}
