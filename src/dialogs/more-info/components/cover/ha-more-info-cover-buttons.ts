import { mdiArrowBottomLeft, mdiArrowTopRight, mdiStop } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
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
  canCloseTilt,
  canOpen,
  canOpenTilt,
  canStop,
  canStopTilt,
  CoverEntity,
  CoverEntityFeature,
} from "../../../../data/cover";
import { HomeAssistant } from "../../../../types";

type CoverButton =
  | "open"
  | "close"
  | "stop"
  | "open-tilt"
  | "close-tilt"
  | "none";

type CoverLayout = {
  type: "line" | "cross";
  buttons: CoverButton[];
};

export const getCoverLayout = memoizeOne(
  (stateObj: CoverEntity): CoverLayout => {
    const supportsOpen = supportsFeature(stateObj, CoverEntityFeature.OPEN);
    const supportsClose = supportsFeature(stateObj, CoverEntityFeature.CLOSE);
    const supportsStop = supportsFeature(stateObj, CoverEntityFeature.STOP);
    const supportsOpenTilt = supportsFeature(
      stateObj,
      CoverEntityFeature.OPEN_TILT
    );
    const supportsCloseTilt = supportsFeature(
      stateObj,
      CoverEntityFeature.CLOSE_TILT
    );
    const supportsStopTilt = supportsFeature(
      stateObj,
      CoverEntityFeature.STOP_TILT
    );

    if (
      (supportsOpen || supportsClose) &&
      (supportsOpenTilt || supportsCloseTilt)
    ) {
      return {
        type: "cross",
        buttons: [
          supportsOpen ? "open" : "none",
          supportsCloseTilt ? "close-tilt" : "none",
          supportsStop || supportsStopTilt ? "stop" : "none",
          supportsOpenTilt ? "open-tilt" : "none",
          supportsClose ? "close" : "none",
        ],
      };
    }

    if (supportsOpen || supportsClose) {
      const buttons: CoverButton[] = [];
      if (supportsOpen) buttons.push("open");
      if (supportsStop) buttons.push("stop");
      if (supportsClose) buttons.push("close");
      return {
        type: "line",
        buttons,
      };
    }

    if (supportsOpenTilt || supportsCloseTilt) {
      const buttons: CoverButton[] = [];
      if (supportsOpenTilt) buttons.push("open-tilt");
      if (supportsStopTilt) buttons.push("stop");
      if (supportsCloseTilt) buttons.push("close-tilt");
      return {
        type: "line",
        buttons,
      };
    }

    return {
      type: "line",
      buttons: [],
    };
  }
);

@customElement("ha-more-info-cover-buttons")
export class HaMoreInfoCoverButtons extends LitElement {
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

  private _onOpenTiltTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "open_cover_tilt", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _onCloseTiltTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "close_cover_tilt", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _onStopTap(ev): void {
    ev.stopPropagation();
    if (supportsFeature(this.stateObj, CoverEntityFeature.STOP)) {
      this.hass!.callService("cover", "stop_cover", {
        entity_id: this.stateObj!.entity_id,
      });
    }
    if (supportsFeature(this.stateObj, CoverEntityFeature.STOP_TILT)) {
      this.hass!.callService("cover", "stop_cover_tilt", {
        entity_id: this.stateObj!.entity_id,
      });
    }
  }

  protected renderButton(button: CoverButton | undefined) {
    if (button === "open") {
      return html`
        <ha-control-button
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.cover.open_cover"
          )}
          @click=${this._onOpenTap}
          .disabled=${!canOpen(this.stateObj)}
          data-button="open"
        >
          <ha-svg-icon .path=${computeOpenIcon(this.stateObj)}></ha-svg-icon>
        </ha-control-button>
      `;
    }
    if (button === "close") {
      return html`
        <ha-control-button
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.cover.close_cover"
          )}
          @click=${this._onCloseTap}
          .disabled=${!canClose(this.stateObj)}
          data-button="close"
        >
          <ha-svg-icon .path=${computeCloseIcon(this.stateObj)}></ha-svg-icon>
        </ha-control-button>
      `;
    }
    if (button === "stop") {
      return html`
        <ha-control-button
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.cover.stop_cover"
          )}
          @click=${this._onStopTap}
          .disabled=${!canStop(this.stateObj) && !canStopTilt(this.stateObj)}
          data-button="stop"
        >
          <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
        </ha-control-button>
      `;
    }
    if (button === "open-tilt") {
      return html`
        <ha-control-button
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.cover.open_tilt_cover"
          )}
          @click=${this._onOpenTiltTap}
          .disabled=${!canOpenTilt(this.stateObj)}
          data-button="open-tilt"
        >
          <ha-svg-icon .path=${mdiArrowTopRight}></ha-svg-icon>
        </ha-control-button>
      `;
    }
    if (button === "close-tilt") {
      return html`
        <ha-control-button
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.cover.close_tilt_cover"
          )}
          @click=${this._onCloseTiltTap}
          .disabled=${!canCloseTilt(this.stateObj)}
          data-button="close-tilt"
        >
          <ha-svg-icon .path=${mdiArrowBottomLeft}></ha-svg-icon>
        </ha-control-button>
      `;
    }
    return nothing;
  }

  protected render(): TemplateResult {
    const layout = getCoverLayout(this.stateObj);

    return html`
      ${layout.type === "line"
        ? html`
            <ha-control-button-group vertical>
              ${repeat(
                layout.buttons,
                (action) => action,
                (action) => this.renderButton(action)
              )}
            </ha-control-button-group>
          `
        : nothing}
      ${layout.type === "cross"
        ? html`
            <div class="cross-container">
              ${repeat(
                layout.buttons,
                (action) => action,
                (action) => this.renderButton(action)
              )}
            </div>
          `
        : nothing}
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
      .cross-container {
        height: 45vh;
        max-height: 320px;
        min-height: 200px;
        display: grid;
        grid-gap: 10px;
        grid-template-columns: repeat(3, min(100px, 25vw, 15vh));
        grid-template-rows: repeat(3, min(100px, 25vw, 15vh));
        grid-template-areas: ". open ." "close-tilt stop open-tilt" ". close .";
      }
      .cross-container > * {
        width: 100%;
        height: 100%;
      }
      .cross-container > [data-button="open"] {
        grid-area: open;
      }
      .cross-container > [data-button="close"] {
        grid-area: close;
      }
      .cross-container > [data-button="open-tilt"] {
        grid-area: open-tilt;
      }
      .cross-container > [data-button="close-tilt"] {
        grid-area: close-tilt;
      }
      .cross-container > [data-button="stop"] {
        grid-area: stop;
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
    "ha-more-info-cover-buttons": HaMoreInfoCoverButtons;
  }
}
