import { mdiArrowBottomLeft, mdiArrowTopRight, mdiStop } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import {
  computeCloseIcon,
  computeOpenIcon,
} from "../../../../common/entity/cover_icon";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../../common/translations/localize";
import "../../../../components/ha-control-button";
import "../../../../components/ha-svg-icon";
import type {
  CoverAction,
  CoverControlMode,
  CoverEntity,
} from "../../../../data/cover";
import {
  CoverEntityFeature,
  canClose,
  canCloseTilt,
  canOpen,
  canOpenTilt,
  canStop,
  canStopTilt,
} from "../../../../data/cover";

interface CoverButton {
  action: CoverAction;
  feature: CoverEntityFeature;
  icon: (stateObj: CoverEntity) => string;
  label: LocalizeKeys;
  enabled: (stateObj: CoverEntity) => boolean;
}

const BUTTONS: Record<CoverControlMode, CoverButton[]> = {
  position: [
    {
      action: "open",
      feature: CoverEntityFeature.OPEN,
      icon: computeOpenIcon,
      label: "ui.card.cover.open_cover",
      enabled: canOpen,
    },
    {
      action: "stop",
      feature: CoverEntityFeature.STOP,
      icon: () => mdiStop,
      label: "ui.card.cover.stop_cover",
      enabled: canStop,
    },
    {
      action: "close",
      feature: CoverEntityFeature.CLOSE,
      icon: computeCloseIcon,
      label: "ui.card.cover.close_cover",
      enabled: canClose,
    },
  ],
  tilt: [
    {
      action: "open",
      feature: CoverEntityFeature.OPEN_TILT,
      icon: () => mdiArrowTopRight,
      label: "ui.card.cover.open_tilt_cover",
      enabled: canOpenTilt,
    },
    {
      action: "stop",
      feature: CoverEntityFeature.STOP_TILT,
      icon: () => mdiStop,
      label: "ui.card.cover.stop_cover",
      enabled: canStopTilt,
    },
    {
      action: "close",
      feature: CoverEntityFeature.CLOSE_TILT,
      icon: () => mdiArrowBottomLeft,
      label: "ui.card.cover.close_tilt_cover",
      enabled: canCloseTilt,
    },
  ],
};

@customElement("ha-more-info-cover-buttons")
export class HaMoreInfoCoverButtons extends LitElement {
  @property({ attribute: false }) public stateObj!: CoverEntity;

  @property({ attribute: false }) public mode: CoverControlMode = "position";

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  private _handleClick(ev: Event) {
    const action = (ev.currentTarget as HTMLElement).dataset
      .action as CoverAction;
    fireEvent(this, "cover-command", { mode: this.mode, action });
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const stateObj = this.stateObj;
    const buttons = BUTTONS[this.mode].filter((button) =>
      supportsFeature(stateObj, button.feature)
    );
    if (!buttons.length) {
      return nothing;
    }
    return html`
      ${buttons.map(
        (button) => html`
          <ha-control-button
            .label=${this._localize(button.label)}
            .disabled=${!button.enabled(stateObj)}
            data-action=${button.action}
            @click=${this._handleClick}
          >
            <div class="content">
              <ha-svg-icon .path=${button.icon(stateObj)}></ha-svg-icon>
              <span>
                ${this._localize(
                  `ui.dialogs.more_info_control.cover.${button.action}`
                )}
              </span>
            </div>
          </ha-control-button>
        `
      )}
    `;
  }

  static styles = css`
    :host {
      display: flex;
      justify-content: center;
      gap: var(--ha-space-3);
      width: 100%;
    }
    ha-control-button {
      flex: 1;
      max-width: 104px;
      height: 64px;
      --control-button-border-radius: var(--ha-border-radius-xl);
      --mdc-icon-size: 22px;
    }
    .content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ha-space-1);
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-cover-buttons": HaMoreInfoCoverButtons;
  }
}
