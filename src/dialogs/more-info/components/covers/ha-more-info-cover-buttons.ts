import {
  mdiArrowBottomLeft,
  mdiArrowCollapseHorizontal,
  mdiArrowDown,
  mdiArrowExpandHorizontal,
  mdiArrowTopRight,
  mdiArrowUp,
  mdiDoorClosed,
  mdiDoorOpen,
  mdiGate,
  mdiGateOpen,
  mdiStop,
} from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-control-button";
import "../../../../components/ha-svg-icon";
import type { CoverControlMode, CoverEntity } from "../../../../data/cover";
import { CoverEntityFeature } from "../../../../data/cover";
import { UNAVAILABLE } from "../../../../data/entity/entity";
import type { CoverService } from "../../../../state-control/cover/ha-state-control-cover-drawing";

interface CoverButton {
  service: CoverService;
  icon: string;
  label: string;
  ariaLabel: string;
  disabled: boolean;
}

const computeDirectionIcons = (stateObj: CoverEntity): [string, string] => {
  switch (stateObj.attributes.device_class) {
    case "door":
      return [mdiDoorOpen, mdiDoorClosed];
    case "gate":
      return [mdiGateOpen, mdiGate];
    case "curtain":
      return [mdiArrowExpandHorizontal, mdiArrowCollapseHorizontal];
    case "awning":
      return [mdiArrowDown, mdiArrowUp];
    default:
      return [mdiArrowUp, mdiArrowDown];
  }
};

@customElement("ha-more-info-cover-buttons")
export class HaMoreInfoCoverButtons extends LitElement {
  @property({ attribute: false }) public stateObj!: CoverEntity;

  @property({ attribute: false }) public mode: CoverControlMode = "position";

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  private _buttons(): CoverButton[] {
    const stateObj = this.stateObj;
    const unavailable = stateObj.state === UNAVAILABLE;
    const assumed = stateObj.attributes.assumed_state === true;
    const supports = (feature: CoverEntityFeature) =>
      supportsFeature(stateObj, feature);
    const localize = (key: "open" | "close" | "stop") =>
      this._localize(`ui.dialogs.more_info_control.cover.${key}`);
    const buttons: CoverButton[] = [];

    if (this.mode === "tilt") {
      const tilt = stateObj.attributes.current_tilt_position;
      if (supports(CoverEntityFeature.OPEN_TILT)) {
        buttons.push({
          service: "open_cover_tilt",
          icon: mdiArrowTopRight,
          label: localize("open"),
          ariaLabel: this._localize("ui.card.cover.open_tilt_cover"),
          disabled: unavailable || (!assumed && tilt === 100),
        });
      }
      if (supports(CoverEntityFeature.STOP_TILT)) {
        buttons.push({
          service: "stop_cover_tilt",
          icon: mdiStop,
          label: localize("stop"),
          ariaLabel: this._localize("ui.card.cover.stop_cover"),
          disabled: unavailable,
        });
      }
      if (supports(CoverEntityFeature.CLOSE_TILT)) {
        buttons.push({
          service: "close_cover_tilt",
          icon: mdiArrowBottomLeft,
          label: localize("close"),
          ariaLabel: this._localize("ui.card.cover.close_tilt_cover"),
          disabled: unavailable || (!assumed && tilt === 0),
        });
      }
      return buttons;
    }

    const [openIcon, closeIcon] = computeDirectionIcons(stateObj);
    const position = stateObj.attributes.current_position;
    const withPosition = supports(CoverEntityFeature.SET_POSITION);
    const fullyOpen = withPosition && position === 100;
    const fullyClosed = withPosition
      ? position === 0
      : stateObj.state === "closed";
    if (supports(CoverEntityFeature.OPEN)) {
      buttons.push({
        service: "open_cover",
        icon: openIcon,
        label: localize("open"),
        ariaLabel: this._localize("ui.card.cover.open_cover"),
        disabled:
          unavailable ||
          (!assumed && (fullyOpen || stateObj.state === "opening")),
      });
    }
    if (supports(CoverEntityFeature.STOP)) {
      buttons.push({
        service: "stop_cover",
        icon: mdiStop,
        label: localize("stop"),
        ariaLabel: this._localize("ui.card.cover.stop_cover"),
        disabled: unavailable,
      });
    }
    if (supports(CoverEntityFeature.CLOSE)) {
      buttons.push({
        service: "close_cover",
        icon: closeIcon,
        label: localize("close"),
        ariaLabel: this._localize("ui.card.cover.close_cover"),
        disabled:
          unavailable ||
          (!assumed && (fullyClosed || stateObj.state === "closing")),
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
    const buttons = this._buttons();
    if (!buttons.length) {
      return nothing;
    }
    return html`
      ${buttons.map(
        (button) => html`
          <ha-control-button
            .label=${button.ariaLabel}
            .disabled=${button.disabled}
            data-service=${button.service}
            @click=${this._handleClick}
          >
            <div class="content">
              <ha-svg-icon .path=${button.icon}></ha-svg-icon>
              <span>${button.label}</span>
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
