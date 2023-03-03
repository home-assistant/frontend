import { mdiStop } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import {
  computeCloseIcon,
  computeOpenIcon,
} from "../../../../common/entity/cover_icon";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import "../../../../components/ha-control-button";
import "../../../../components/ha-control-button-group";
import "../../../../components/ha-control-slider";
import "../../../../components/ha-svg-icon";
import {
  canClose,
  canOpen,
  canStop,
  CoverEntity,
  CoverEntityFeature,
} from "../../../../data/cover";
import { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-cover-open-close")
export class HaMoreInfoCoverOpenClose extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: CoverEntity;

  private _onOpenTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "open_cover", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _onCloseTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "close_cover", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _onStopTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "stop_cover", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  protected render(): TemplateResult {
    return html`
      <ha-control-button-group vertical>
        ${supportsFeature(this.stateObj, CoverEntityFeature.OPEN)
          ? html`
              <ha-control-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.cover.open_cover"
                )}
                @click=${this._onOpenTap}
                .disabled=${!canOpen(this.stateObj)}
              >
                <ha-svg-icon
                  .path=${computeOpenIcon(this.stateObj)}
                ></ha-svg-icon>
              </ha-control-button>
            `
          : null}
        ${supportsFeature(this.stateObj, CoverEntityFeature.STOP)
          ? html`
              <ha-control-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.cover.stop_cover"
                )}
                @click=${this._onStopTap}
                .disabled=${!canStop(this.stateObj)}
              >
                <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
              </ha-control-button>
            `
          : null}
        ${supportsFeature(this.stateObj, CoverEntityFeature.CLOSE)
          ? html`
              <ha-control-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.cover.close_cover"
                )}
                @click=${this._onCloseTap}
                .disabled=${!canClose(this.stateObj)}
              >
                <ha-svg-icon
                  .path=${computeCloseIcon(this.stateObj)}
                ></ha-svg-icon>
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
    "ha-more-info-cover-open-close": HaMoreInfoCoverOpenClose;
  }
}
