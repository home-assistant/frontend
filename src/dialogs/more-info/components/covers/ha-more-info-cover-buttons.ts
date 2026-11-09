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
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-control-button";
import "../../../../components/ha-svg-icon";
import type {
  CoverControlMode,
  CoverEntity,
  CoverService,
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
  service: CoverService;
  icon: string;
  text: string;
  label: string;
  disabled: boolean;
}

@customElement("ha-more-info-cover-buttons")
export class HaMoreInfoCoverButtons extends LitElement {
  @property({ attribute: false }) public stateObj!: CoverEntity;

  @property({ attribute: false }) public mode: CoverControlMode = "position";

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  private _shortText(key: "open" | "close" | "stop") {
    return this._localize(`ui.dialogs.more_info_control.cover.${key}`);
  }

  private _tiltButtons(): CoverButton[] {
    const stateObj = this.stateObj;
    const buttons: CoverButton[] = [];
    if (supportsFeature(stateObj, CoverEntityFeature.OPEN_TILT)) {
      buttons.push({
        service: "open_cover_tilt",
        icon: mdiArrowTopRight,
        text: this._shortText("open"),
        label: this._localize("ui.card.cover.open_tilt_cover"),
        disabled: !canOpenTilt(stateObj),
      });
    }
    if (supportsFeature(stateObj, CoverEntityFeature.STOP_TILT)) {
      buttons.push({
        service: "stop_cover_tilt",
        icon: mdiStop,
        text: this._shortText("stop"),
        label: this._localize("ui.card.cover.stop_cover"),
        disabled: !canStopTilt(stateObj),
      });
    }
    if (supportsFeature(stateObj, CoverEntityFeature.CLOSE_TILT)) {
      buttons.push({
        service: "close_cover_tilt",
        icon: mdiArrowBottomLeft,
        text: this._shortText("close"),
        label: this._localize("ui.card.cover.close_tilt_cover"),
        disabled: !canCloseTilt(stateObj),
      });
    }
    return buttons;
  }

  private _positionButtons(): CoverButton[] {
    const stateObj = this.stateObj;
    const buttons: CoverButton[] = [];
    if (supportsFeature(stateObj, CoverEntityFeature.OPEN)) {
      buttons.push({
        service: "open_cover",
        icon: computeOpenIcon(stateObj),
        text: this._shortText("open"),
        label: this._localize("ui.card.cover.open_cover"),
        disabled: !canOpen(stateObj),
      });
    }
    if (supportsFeature(stateObj, CoverEntityFeature.STOP)) {
      buttons.push({
        service: "stop_cover",
        icon: mdiStop,
        text: this._shortText("stop"),
        label: this._localize("ui.card.cover.stop_cover"),
        disabled: !canStop(stateObj),
      });
    }
    if (supportsFeature(stateObj, CoverEntityFeature.CLOSE)) {
      buttons.push({
        service: "close_cover",
        icon: computeCloseIcon(stateObj),
        text: this._shortText("close"),
        label: this._localize("ui.card.cover.close_cover"),
        disabled: !canClose(stateObj),
      });
    }
    return buttons;
  }

  private _handleClick(ev: Event) {
    const service = (ev.currentTarget as HTMLElement).dataset
      .service as CoverService;
    fireEvent(this, "cover-command", { service });
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const buttons =
      this.mode === "tilt" ? this._tiltButtons() : this._positionButtons();
    if (!buttons.length) {
      return nothing;
    }
    return html`
      ${buttons.map(
        (button) => html`
          <ha-control-button
            .label=${button.label}
            .disabled=${button.disabled}
            data-service=${button.service}
            @click=${this._handleClick}
          >
            <div class="content">
              <ha-svg-icon .path=${button.icon}></ha-svg-icon>
              <span>${button.text}</span>
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
