import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/dialogs/more-info/more-info-content";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";
import { LawnMowerEntityFeature } from "../../../../src/data/lawn_mower";

const ALL_FEATURES =
  LawnMowerEntityFeature.START_MOWING +
  LawnMowerEntityFeature.PAUSE +
  LawnMowerEntityFeature.DOCK;

const ENTITIES = [
  {
    entity_id: "lawn_mower.full_featured",
    state: "docked",
    attributes: {
      friendly_name: "Full featured mower",
      supported_features: ALL_FEATURES,
    },
  },
  {
    entity_id: "lawn_mower.mowing",
    state: "mowing",
    attributes: {
      friendly_name: "Mowing",
      supported_features: ALL_FEATURES,
    },
  },
  {
    entity_id: "lawn_mower.returning",
    state: "returning",
    attributes: {
      friendly_name: "Returning",
      supported_features:
        LawnMowerEntityFeature.START_MOWING +
        LawnMowerEntityFeature.PAUSE +
        LawnMowerEntityFeature.DOCK,
    },
  },
  {
    entity_id: "lawn_mower.paused",
    state: "paused",
    attributes: {
      friendly_name: "Paused",
      supported_features: ALL_FEATURES,
    },
  },
  {
    entity_id: "lawn_mower.error",
    state: "error",
    attributes: {
      friendly_name: "Error",
      supported_features:
        LawnMowerEntityFeature.START_MOWING + LawnMowerEntityFeature.DOCK,
    },
  },
  {
    entity_id: "lawn_mower.basic",
    state: "docked",
    attributes: {
      friendly_name: "Basic mower",
      supported_features: LawnMowerEntityFeature.START_MOWING,
    },
  },
];

@customElement("demo-more-info-lawn-mower")
class DemoMoreInfoLawnMower extends LitElement {
  @property({ attribute: false }) public hass!: MockHomeAssistant;

  @query("demo-more-infos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`
      <demo-more-infos
        .hass=${this.hass}
        .entities=${ENTITIES.map((ent) => ent.entity_id)}
      ></demo-more-infos>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.addEntities(ENTITIES);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-info-lawn-mower": DemoMoreInfoLawnMower;
  }
}
