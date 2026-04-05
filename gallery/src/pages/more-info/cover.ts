import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../../src/components/ha-card";
import { CoverEntityFeature } from "../../../../src/data/cover";
import "../../../../src/dialogs/more-info/more-info-content";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";

const ENTITIES = [
  {
    entity_id: "cover.position_buttons",
    state: "on",
    attributes: {
      friendly_name: "Position Buttons",
      supported_features:
        CoverEntityFeature.OPEN +
        CoverEntityFeature.STOP +
        CoverEntityFeature.CLOSE,
    },
  },
  {
    entity_id: "cover.position_slider_half",
    state: "on",
    attributes: {
      friendly_name: "Position Half-Open",
      supported_features:
        CoverEntityFeature.OPEN +
        CoverEntityFeature.STOP +
        CoverEntityFeature.CLOSE +
        CoverEntityFeature.SET_POSITION,
      current_position: 50,
    },
  },
  {
    entity_id: "cover.position_slider_open",
    state: "on",
    attributes: {
      friendly_name: "Position Open",
      supported_features:
        CoverEntityFeature.OPEN +
        CoverEntityFeature.STOP +
        CoverEntityFeature.CLOSE +
        CoverEntityFeature.SET_POSITION,
      current_position: 100,
    },
  },
  {
    entity_id: "cover.position_slider_closed",
    state: "on",
    attributes: {
      friendly_name: "Position Closed",
      supported_features:
        CoverEntityFeature.OPEN +
        CoverEntityFeature.STOP +
        CoverEntityFeature.CLOSE +
        CoverEntityFeature.SET_POSITION,
      current_position: 0,
    },
  },
  {
    entity_id: "cover.tilt_buttons",
    state: "on",
    attributes: {
      friendly_name: "Tilt Buttons",
      supported_features:
        CoverEntityFeature.OPEN_TILT +
        CoverEntityFeature.STOP_TILT +
        CoverEntityFeature.CLOSE_TILT,
    },
  },
  {
    entity_id: "cover.tilt_slider_half",
    state: "on",
    attributes: {
      friendly_name: "Tilt Half-Open",
      supported_features:
        CoverEntityFeature.OPEN_TILT +
        CoverEntityFeature.STOP_TILT +
        CoverEntityFeature.CLOSE_TILT +
        CoverEntityFeature.SET_TILT_POSITION,
      current_tilt_position: 50,
    },
  },
  {
    entity_id: "cover.tilt_slider_open",
    state: "on",
    attributes: {
      friendly_name: "Tilt Open",
      supported_features:
        CoverEntityFeature.OPEN_TILT +
        CoverEntityFeature.STOP_TILT +
        CoverEntityFeature.CLOSE_TILT +
        CoverEntityFeature.SET_TILT_POSITION,
      current_tilt_position: 100,
    },
  },
  {
    entity_id: "cover.tilt_slider_closed",
    state: "on",
    attributes: {
      friendly_name: "Tilt Closed",
      supported_features:
        CoverEntityFeature.OPEN_TILT +
        CoverEntityFeature.STOP_TILT +
        CoverEntityFeature.CLOSE_TILT +
        CoverEntityFeature.SET_TILT_POSITION,
      current_tilt_position: 0,
    },
  },
  {
    entity_id: "cover.position_slider_tilt_slider",
    state: "on",
    attributes: {
      friendly_name: "Both Sliders",
      supported_features:
        CoverEntityFeature.OPEN +
        CoverEntityFeature.STOP +
        CoverEntityFeature.CLOSE +
        CoverEntityFeature.SET_POSITION +
        CoverEntityFeature.OPEN_TILT +
        CoverEntityFeature.STOP_TILT +
        CoverEntityFeature.CLOSE_TILT +
        CoverEntityFeature.SET_TILT_POSITION,
      current_position: 30,
      current_tilt_position: 70,
    },
  },
  {
    entity_id: "cover.position_tilt_slider",
    state: "on",
    attributes: {
      friendly_name: "Position & Tilt Slider",
      supported_features:
        CoverEntityFeature.OPEN +
        CoverEntityFeature.STOP +
        CoverEntityFeature.CLOSE +
        CoverEntityFeature.OPEN_TILT +
        CoverEntityFeature.STOP_TILT +
        CoverEntityFeature.CLOSE_TILT +
        CoverEntityFeature.SET_TILT_POSITION,
      current_tilt_position: 70,
    },
  },
  {
    entity_id: "cover.position_slider_tilt",
    state: "on",
    attributes: {
      friendly_name: "Position Slider & Tilt",
      supported_features:
        CoverEntityFeature.OPEN +
        CoverEntityFeature.STOP +
        CoverEntityFeature.CLOSE +
        CoverEntityFeature.SET_POSITION +
        CoverEntityFeature.OPEN_TILT +
        CoverEntityFeature.STOP_TILT +
        CoverEntityFeature.CLOSE_TILT,
      current_position: 30,
    },
  },
  {
    entity_id: "cover.position_slider_only_tilt_slider",
    state: "on",
    attributes: {
      friendly_name: "Position Slider Only & Tilt Buttons",
      supported_features:
        CoverEntityFeature.SET_POSITION +
        CoverEntityFeature.OPEN_TILT +
        CoverEntityFeature.STOP_TILT +
        CoverEntityFeature.CLOSE_TILT,
      current_position: 30,
    },
  },
  {
    entity_id: "cover.position_slider_only_tilt",
    state: "on",
    attributes: {
      friendly_name: "Position Slider Only & Tilt",
      supported_features:
        CoverEntityFeature.SET_POSITION +
        CoverEntityFeature.OPEN_TILT +
        CoverEntityFeature.STOP_TILT +
        CoverEntityFeature.CLOSE_TILT +
        CoverEntityFeature.SET_TILT_POSITION,
      current_position: 30,
      current_tilt_position: 70,
    },
  },
];

@customElement("demo-more-info-cover")
class DemoMoreInfoCover extends LitElement {
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
    "demo-more-info-cover": DemoMoreInfoCover;
  }
}
