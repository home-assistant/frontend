import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { domainIcon } from "../../../../common/entity/domain_icon";
import { stateColorCss } from "../../../../common/entity/state_color";
import "../../../../components/ha-control-button";
import "../../../../components/ha-control-switch";
import { UNAVAILABLE, UNKNOWN } from "../../../../data/entity";
import { forwardHaptic } from "../../../../data/haptics";
import { callProtectedLockService, LockEntity } from "../../../../data/lock";
import { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-lock-toggle")
export class HaMoreInfoLockToggle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LockEntity;

  @state() private _isOn = false;

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("stateObj")) {
      this._isOn =
        this.stateObj.state === "locked" || this.stateObj.state === "locking";
    }
  }

  private _valueChanged(ev) {
    const checked = ev.target.checked as boolean;

    if (checked) {
      this._turnOn();
    } else {
      this._turnOff();
    }
  }

  private async _turnOn() {
    this._isOn = true;
    try {
      await this._callService(true);
    } catch (err) {
      this._isOn = false;
    }
  }

  private async _turnOff() {
    this._isOn = false;
    try {
      await this._callService(false);
    } catch (err) {
      this._isOn = true;
    }
  }

  private async _callService(turnOn: boolean): Promise<void> {
    if (!this.hass || !this.stateObj) {
      return;
    }
    forwardHaptic("light");
    callProtectedLockService(
      this,
      this.hass,
      this.stateObj,
      turnOn ? "lock" : "unlock"
    );
  }

  protected render(): TemplateResult {
    const locking = this.stateObj.state === "locking";
    const unlocking = this.stateObj.state === "unlocking";

    const color = stateColorCss(this.stateObj);

    const onIcon = domainIcon(
      "lock",
      this.stateObj,
      locking ? "locking" : "locked"
    );

    const offIcon = domainIcon(
      "lock",
      this.stateObj,
      unlocking ? "unlocking" : "unlocked"
    );

    if (this.stateObj.state === UNKNOWN) {
      return html`
        <div class="buttons">
          <ha-control-button
            .label=${this.hass.localize(
              "ui.dialogs.more_info_control.lock.lock"
            )}
            @click=${this._turnOn}
          >
            <ha-svg-icon .path=${onIcon}></ha-svg-icon>
          </ha-control-button>
          <ha-control-button
            .label=${this.hass.localize(
              "ui.dialogs.more_info_control.lock.unlock"
            )}
            @click=${this._turnOff}
          >
            <ha-svg-icon .path=${offIcon}></ha-svg-icon>
          </ha-control-button>
        </div>
      `;
    }

    return html`
      <ha-control-switch
        vertical
        reversed
        .checked=${this._isOn}
        @change=${this._valueChanged}
        .ariaLabel=${this.hass.localize("ui.dialogs.more_info_control.toggle")}
        style=${styleMap({
          "--control-switch-on-color": color,
          "--control-switch-off-color": color,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
        <ha-svg-icon
          slot="icon-on"
          .path=${onIcon}
          class=${classMap({ pulse: locking })}
        ></ha-svg-icon>
        <ha-svg-icon
          slot="icon-off"
          .path=${offIcon}
          class=${classMap({ pulse: unlocking })}
        ></ha-svg-icon>
      </ha-control-switch>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      @keyframes pulse {
        0% {
          opacity: 1;
        }
        50% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      ha-control-switch {
        height: 45vh;
        max-height: 320px;
        min-height: 200px;
        --control-switch-thickness: 100px;
        --control-switch-border-radius: 24px;
        --control-switch-padding: 6px;
        --mdc-icon-size: 24px;
      }
      .pulse {
        animation: pulse 1s infinite;
      }
      .buttons {
        display: flex;
        flex-direction: column;
        width: 100px;
        height: 45vh;
        max-height: 320px;
        min-height: 200px;
        padding: 6px;
        box-sizing: border-box;
      }
      ha-control-button {
        flex: 1;
        width: 100%;
        --control-button-border-radius: 18px;
        --mdc-icon-size: 24px;
      }
      ha-control-button.active {
        --control-button-icon-color: white;
        --control-button-background-color: var(--color);
        --control-button-background-opacity: 1;
      }
      ha-control-button:not(:last-child) {
        margin-bottom: 6px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-lock-toggle": HaMoreInfoLockToggle;
  }
}
