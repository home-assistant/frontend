import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../../common/dom/fire_event";
import { stateColorCss } from "../../common/entity/state_color";
import "../../components/ha-control-button";
import "../../components/ha-control-switch";
import "../../components/ha-state-icon";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity";
import { forwardHaptic } from "../../data/haptics";
import type { LockEntity } from "../../data/lock";
import { callProtectedLockService } from "../../data/lock";
import type { HomeAssistant } from "../../types";

declare global {
  interface HASSDomEvents {
    "lock-service-called": undefined;
  }
}

@customElement("ha-state-control-lock-toggle")
export class HaStateControlLockToggle extends LitElement {
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
    } catch (_err) {
      this._isOn = false;
    }
  }

  private async _turnOff() {
    this._isOn = false;
    try {
      await this._callService(false);
    } catch (_err) {
      this._isOn = true;
    }
  }

  private async _callService(turnOn: boolean): Promise<void> {
    if (!this.hass || !this.stateObj) {
      return;
    }
    forwardHaptic("light");
    fireEvent(this, "lock-service-called");
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

    if (this.stateObj.state === UNKNOWN) {
      return html`
        <div class="buttons">
          <ha-control-button
            .label=${this.hass.localize("ui.card.lock.lock")}
            @click=${this._turnOn}
          >
            <ha-state-icon
              .hass=${this.hass}
              .stateObj=${this.stateObj}
              .stateValue=${locking ? "locking" : "locked"}
            ></ha-state-icon>
          </ha-control-button>
          <ha-control-button
            .label=${this.hass.localize("ui.card.lock.unlock")}
            @click=${this._turnOff}
          >
            <ha-state-icon
              .hass=${this.hass}
              .stateObj=${this.stateObj}
              .stateValue=${unlocking ? "unlocking" : "unlocked"}
            ></ha-state-icon>
          </ha-control-button>
        </div>
      `;
    }

    return html`
      <ha-control-switch
        touch-action="none"
        vertical
        reversed
        .checked=${this._isOn}
        @change=${this._valueChanged}
        .label=${this._isOn
          ? this.hass.localize("ui.card.lock.unlock")
          : this.hass.localize("ui.card.lock.lock")}
        style=${styleMap({
          "--control-switch-on-color": color,
          "--control-switch-off-color": color,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
        <ha-state-icon
          slot="icon-on"
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .stateValue=${locking ? "locking" : "locked"}
          class=${classMap({ pulse: locking })}
        ></ha-state-icon>
        <ha-state-icon
          slot="icon-off"
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .stateValue=${unlocking ? "unlocking" : "unlocked"}
          class=${classMap({ pulse: unlocking })}
        ></ha-state-icon>
      </ha-control-switch>
    `;
  }

  static styles = css`
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
      --control-switch-thickness: 130px;
      --control-switch-border-radius: var(--ha-border-radius-6xl);
      --control-switch-padding: 6px;
      --mdc-icon-size: 24px;
    }
    .pulse {
      animation: pulse 1s infinite;
    }
    .buttons {
      display: flex;
      flex-direction: column;
      width: 130px;
      height: 45vh;
      max-height: 320px;
      min-height: 200px;
      padding: 6px;
      box-sizing: border-box;
    }
    ha-control-button {
      flex: 1;
      width: 100%;
      --control-button-border-radius: var(--ha-border-radius-6xl);
      --mdc-icon-size: 24px;
    }
    ha-control-button.active {
      --control-button-icon-color: white;
      --control-button-background-color: var(--color);
      --control-button-focus-color: var(--color);
      --control-button-background-opacity: 1;
    }
    ha-control-button:not(:last-child) {
      margin-bottom: 6px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-lock-toggle": HaStateControlLockToggle;
  }
}
