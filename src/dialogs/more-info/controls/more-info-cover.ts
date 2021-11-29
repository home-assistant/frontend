import { css, CSSResult, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { attributeClassNames } from "../../../common/entity/attribute_class_names";
import { featureClassNames } from "../../../common/entity/feature_class_names";
import "../../../components/ha-attributes";
import "../../../components/ha-cover-tilt-controls";
import "../../../components/ha-labeled-slider";
import {
  CoverEntity,
  FEATURE_CLASS_NAMES,
  isTiltOnly,
  supportsSetPosition,
  supportsSetTiltPosition,
} from "../../../data/cover";
import { HomeAssistant } from "../../../types";

@customElement("more-info-cover")
class MoreInfoCover extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: CoverEntity;

  protected render(): TemplateResult {
    if (!this.stateObj) {
      return html``;
    }

    const _isTiltOnly = isTiltOnly(this.stateObj);

    return html`
      <div class=${this._computeClassNames(this.stateObj)}>
        <div class="current_position">
          <ha-labeled-slider
            .caption=${this.hass.localize("ui.card.cover.position")}
            pin=""
            .value=${this.stateObj.attributes.current_position}
            .disabled=${!supportsSetPosition(this.stateObj)}
            @change=${this._coverPositionSliderChanged}
          ></ha-labeled-slider>
        </div>

        <div class="tilt">
          ${supportsSetTiltPosition(this.stateObj)
            ? // Either render the labeled slider and put the tilt buttons into its slot
              // or (if tilt position is not supported and therefore no slider is shown)
              // render a title <div> (same style as for a labeled slider) and directly put
              // the tilt controls on the more-info.
              html` <ha-labeled-slider
                .caption=${this.hass.localize("ui.card.cover.tilt_position")}
                pin=""
                extra=""
                .value=${this.stateObj.attributes.current_tilt_position}
                @change=${this._coverTiltPositionSliderChanged}
              >
                ${!_isTiltOnly
                  ? html`<ha-cover-tilt-controls
                      .hass=${this.hass}
                      slot="extra"
                      .stateObj=${this.stateObj}
                    ></ha-cover-tilt-controls> `
                  : html``}
              </ha-labeled-slider>`
            : !_isTiltOnly
            ? html`
                <div class="title">
                  ${this.hass.localize("ui.card.cover.tilt_position")}
                </div>
                <ha-cover-tilt-controls
                  .hass=${this.hass}
                  .stateObj=${this.stateObj}
                ></ha-cover-tilt-controls>
              `
            : html``}
        </div>
      </div>
      <ha-attributes
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        extra-filters="current_position,current_tilt_position"
      ></ha-attributes>
    `;
  }

  private _computeClassNames(stateObj) {
    const classes = [
      attributeClassNames(stateObj, [
        "current_position",
        "current_tilt_position",
      ]),
      featureClassNames(stateObj, FEATURE_CLASS_NAMES),
    ];
    return classes.join(" ");
  }

  private _coverPositionSliderChanged(ev) {
    this.hass.callService("cover", "set_cover_position", {
      entity_id: this.stateObj.entity_id,
      position: ev.target.value,
    });
  }

  private _coverTiltPositionSliderChanged(ev) {
    this.hass.callService("cover", "set_cover_tilt_position", {
      entity_id: this.stateObj.entity_id,
      tilt_position: ev.target.value,
    });
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
      .has-open_tilt .tilt,
      .has-close_tilt .tilt,
      .has-stop_tilt .tilt,
      .has-set_tilt_position .tilt,
      .has-current_tilt_position .tilt {
        max-height: 208px;
      }

      /* from ha-labeled-slider for consistent look */
      .title {
        margin: 5px 0 8px;
        color: var(--primary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-cover": MoreInfoCover;
  }
}
