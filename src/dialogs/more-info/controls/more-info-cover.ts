import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import { attributeClassNames } from "../../../common/entity/attribute_class_names";
import { featureClassNames } from "../../../common/entity/feature_class_names";

import CoverEntity from "../../../util/cover-model";

import "../../../components/ha-attributes";
import "../../../components/ha-cover-tilt-controls";
import "../../../components/ha-labeled-slider";

import type { HassEntity } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../../../types";

const FEATURE_CLASS_NAMES = {
  4: "has-set_position",
  128: "has-set_tilt_position",
};

@customElement("more-info-cover")
class MoreInfoCover extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) stateObj!: HassEntity;

  @internalProperty() private _entityObj?: CoverEntity;

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has("stateObj")) {
      this._entityObj = new CoverEntity(this.hass, this.stateObj);
    }
  }

  protected render(): TemplateResult {
    if (!this._entityObj) {
      return html``;
    }

    return html`<div class=${classMap(this._computeClassNames())}>
        <div class="current_position">
          <ha-labeled-slider
            .caption="[[localize('ui.card.cover.position')]]"
            pin=""
            .value=${this.stateObj.attributes.current_position}
            .disabled=${!this._entityObj.supportsSetPosition}
            @on-change=${this._coverPositionSliderChanged}
          ></ha-labeled-slider>
        </div>

        <div class="tilt">
          <ha-labeled-slider
            .caption=${this.hass.localize("ui.card.cover.tilt_position")}
            pin
            extra
            .value=${this.stateObj.attributes.current_tilt_position}
            .disabled=${!this._entityObj.supportsSetTiltPosition}
            @change=${this._coverTiltPositionSliderChanged}
          >
            <ha-cover-tilt-controls
              class=${classMap({
                invisible: !this._entityObj.isTiltOnly,
              })}
              slot="extra"
              .hass=${this.hass}
              .stateObj=${this.stateObj}
            ></ha-cover-tilt-controls>
          </ha-labeled-slider>
        </div>
      </div>
      <ha-attributes
        .stateObj=${this.stateObj}
        extra-filters="current_position,current_tilt_position"
      ></ha-attributes>`;
  }

  private _computeClassNames() {
    const classes = [
      attributeClassNames(this.stateObj, [
        "current_position",
        "current_tilt_position",
      ]),
      featureClassNames(this.stateObj, FEATURE_CLASS_NAMES),
    ];
    return classes.join(" ");
  }

  private _coverPositionSliderChanged(ev): void {
    this._entityObj.setCoverPosition(ev.target.value);
  }

  private _coverTiltPositionSliderChanged(ev): void {
    this._entityObj.setCoverTiltPosition(ev.target.value);
  }

  static get styles(): CSSResult {
    return css`
      .current_position,
      .tilt {
        max-height: 0px;
        overflow: hidden;
      }

      .has-set_position .current_position,
      .has-current_position .current_position,
      .has-set_tilt_position .tilt,
      .has-current_tilt_position .tilt {
        max-height: 208px;
      }

      [invisible] {
        visibility: hidden !important;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-cover": MoreInfoCover;
  }
}
