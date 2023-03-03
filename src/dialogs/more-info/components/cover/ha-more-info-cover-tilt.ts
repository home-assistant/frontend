import { mdiArrowBottomLeft, mdiArrowTopRight, mdiStop } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import "../../../../components/ha-control-button";
import "../../../../components/ha-control-button-group";
import "../../../../components/ha-control-slider";
import "../../../../components/ha-svg-icon";
import {
  canCloseTilt,
  canOpenTilt,
  canStopTilt,
  CoverEntity,
  CoverEntityFeature,
} from "../../../../data/cover";
import { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-cover-tilt")
export class HaMoreInfoCoverTilt extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: CoverEntity;

  private _onOpenTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "open_tilt_cover", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _onCloseTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "close_tilt_cover", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _onStopTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "stop_tilt_cover", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  protected render(): TemplateResult {
    return html`
      <ha-control-button-group vertical>
        ${supportsFeature(this.stateObj, CoverEntityFeature.OPEN_TILT)
          ? html`
              <ha-control-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.cover.open_tilt_cover"
                )}
                @click=${this._onOpenTap}
                .disabled=${!canOpenTilt(this.stateObj)}
              >
                <ha-svg-icon .path=${mdiArrowTopRight}></ha-svg-icon>
              </ha-control-button>
            `
          : null}
        ${supportsFeature(this.stateObj, CoverEntityFeature.STOP_TILT)
          ? html`
              <ha-control-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.cover.stop_cover"
                )}
                @click=${this._onStopTap}
                .disabled=${!canStopTilt(this.stateObj)}
              >
                <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
              </ha-control-button>
            `
          : null}
        ${supportsFeature(this.stateObj, CoverEntityFeature.CLOSE_TILT)
          ? html`
              <ha-control-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.cover.close_tilt_cover"
                )}
                @click=${this._onCloseTap}
                .disabled=${!canCloseTilt(this.stateObj)}
              >
                <ha-svg-icon .path=${mdiArrowBottomLeft}></ha-svg-icon>
              </ha-control-button>
            `
          : undefined}
      </ha-control-button-group>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-control-button-group {
        height: 45vh;
        max-height: 320px;
        min-height: 200px;
        --control-button-group-spacing: 6px;
        --control-button-group-thickness: 100px;
      }
      ha-control-button {
        --control-button-border-radius: 18px;
        --mdc-icon-size: 24px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-cover-tilt": HaMoreInfoCoverTilt;
  }
}
