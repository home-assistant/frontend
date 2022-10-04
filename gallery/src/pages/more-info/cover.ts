import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../../src/components/ha-card";
import { CoverEntityFeature } from "../../../../src/data/cover";
import "../../../../src/dialogs/more-info/more-info-content";
import { getEntity } from "../../../../src/fake_data/entity";
import {
  MockHomeAssistant,
  provideHass,
} from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";

const ENTITIES = [
  getEntity("cover", "position_buttons", "on", {
    friendly_name: "Position Buttons",
    supported_features:
      CoverEntityFeature.OPEN +
      CoverEntityFeature.STOP +
      CoverEntityFeature.CLOSE,
  }),
  getEntity("cover", "position_slider_half", "on", {
    friendly_name: "Position Half-Open",
    supported_features:
      CoverEntityFeature.OPEN +
      CoverEntityFeature.STOP +
      CoverEntityFeature.CLOSE +
      CoverEntityFeature.SET_POSITION,
    current_position: 50,
  }),
  getEntity("cover", "position_slider_open", "on", {
    friendly_name: "Position Open",
    supported_features:
      CoverEntityFeature.OPEN +
      CoverEntityFeature.STOP +
      CoverEntityFeature.CLOSE +
      CoverEntityFeature.SET_POSITION,
    current_position: 100,
  }),
  getEntity("cover", "position_slider_closed", "on", {
    friendly_name: "Position Closed",
    supported_features:
      CoverEntityFeature.OPEN +
      CoverEntityFeature.STOP +
      CoverEntityFeature.CLOSE +
      CoverEntityFeature.SET_POSITION,
    current_position: 0,
  }),
  getEntity("cover", "tilt_buttons", "on", {
    friendly_name: "Tilt Buttons",
    supported_features:
      CoverEntityFeature.OPEN_TILT +
      CoverEntityFeature.STOP_TILT +
      CoverEntityFeature.CLOSE_TILT,
  }),
  getEntity("cover", "tilt_slider_half", "on", {
    friendly_name: "Tilt Half-Open",
    supported_features:
      CoverEntityFeature.OPEN_TILT +
      CoverEntityFeature.STOP_TILT +
      CoverEntityFeature.CLOSE_TILT +
      CoverEntityFeature.SET_TILT_POSITION,
    current_tilt_position: 50,
  }),
  getEntity("cover", "tilt_slider_open", "on", {
    friendly_name: "Tilt Open",
    supported_features:
      CoverEntityFeature.OPEN_TILT +
      CoverEntityFeature.STOP_TILT +
      CoverEntityFeature.CLOSE_TILT +
      CoverEntityFeature.SET_TILT_POSITION,
    current_tilt_position: 100,
  }),
  getEntity("cover", "tilt_slider_closed", "on", {
    friendly_name: "Tilt Closed",
    supported_features:
      CoverEntityFeature.OPEN_TILT +
      CoverEntityFeature.STOP_TILT +
      CoverEntityFeature.CLOSE_TILT +
      CoverEntityFeature.SET_TILT_POSITION,
    current_tilt_position: 0,
  }),
  getEntity("cover", "position_slider_tilt_slider", "on", {
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
  }),
  getEntity("cover", "position_tilt_slider", "on", {
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
  }),
  getEntity("cover", "position_slider_tilt", "on", {
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
  }),
  getEntity("cover", "position_slider_only_tilt_slider", "on", {
    friendly_name: "Position Slider Only & Tilt Buttons",
    supported_features:
      CoverEntityFeature.SET_POSITION +
      CoverEntityFeature.OPEN_TILT +
      CoverEntityFeature.STOP_TILT +
      CoverEntityFeature.CLOSE_TILT,
    current_position: 30,
  }),
  getEntity("cover", "position_slider_only_tilt", "on", {
    friendly_name: "Position Slider Only & Tilt",
    supported_features:
      CoverEntityFeature.SET_POSITION +
      CoverEntityFeature.OPEN_TILT +
      CoverEntityFeature.STOP_TILT +
      CoverEntityFeature.CLOSE_TILT +
      CoverEntityFeature.SET_TILT_POSITION,
    current_position: 30,
    current_tilt_position: 70,
  }),
];

@customElement("demo-more-info-cover")
class DemoMoreInfoCover extends LitElement {
  @property() public hass!: MockHomeAssistant;

  @query("demo-more-infos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`
      <demo-more-infos
        .hass=${this.hass}
        .entities=${ENTITIES.map((ent) => ent.entityId)}
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
