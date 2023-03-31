import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { domainIcon } from "../../../../common/entity/domain_icon";
import { stateColorCss } from "../../../../common/entity/state_color";
import "../../../../components/ha-control-button";
import "../../../../components/ha-control-switch";
import { UNAVAILABLE, UNKNOWN } from "../../../../data/entity";
import { forwardHaptic } from "../../../../data/haptics";
import { LockEntity } from "../../../../data/lock";
import { HomeAssistant } from "../../../../types";
import { showEnterCodeDialogDialog } from "../../../enter-code/show-enter-code-dialog";

const wait = (duration: number) =>
  new Promise<void>((res) => {
    setTimeout(() => res(), duration);
  });

@customElement("ha-more-info-lock-toggle")
export class HaMoreInfoLockToggle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LockEntity;

  @state() private _isOn = false;

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("stateObj")) {
      this._isOn = this.stateObj.state === "locked";
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

  private _turnOn() {
    this._callService(true);
  }

  private _turnOff() {
    this._callService(false);
  }

  private async _callService(turnOn: boolean): Promise<void> {
    if (!this.hass || !this.stateObj) {
      return;
    }
    forwardHaptic("light");

    let code: string | undefined;

    this._isOn = turnOn;

    if (this.stateObj.attributes.code_format) {
      const response = await showEnterCodeDialogDialog(this, {
        codeFormat: "text",
        codePattern: this.stateObj.attributes.code_format,
        title: this.hass.localize(
          `ui.dialogs.more_info_control.lock.${turnOn ? "lock" : "unlock"}`
        ),
        submitText: this.hass.localize(
          `ui.dialogs.more_info_control.lock.${turnOn ? "lock" : "unlock"}`
        ),
      });
      if (!response) {
        return;
      }
      code = response;
    }

    const currentState = this.stateObj;

    await this.hass.callService("lock", turnOn ? "lock" : "unlock", {
      entity_id: this.stateObj.entity_id,
      code,
    });

    // If after 2 seconds we have not received a state update
    // reset the switch to it's original state.
    await wait(2000);

    if (this.stateObj === currentState) {
      this._isOn = this.stateObj.state === "locked";
    }
  }

  protected render(): TemplateResult {
    const onColor = stateColorCss(this.stateObj, "locked");
    const offColor = stateColorCss(this.stateObj, "unlocked");

    if (this.stateObj.state === UNKNOWN) {
      return html`
        <div class="buttons">
          <ha-control-button
            .label=${this.hass.localize(
              "ui.dialogs.more_info_control.lock.lock"
            )}
            @click=${this._turnOn}
          >
            <ha-svg-icon
              .path=${domainIcon("lock", this.stateObj, "locked")}
            ></ha-svg-icon>
          </ha-control-button>
          <ha-control-button
            .label=${this.hass.localize(
              "ui.dialogs.more_info_control.lock.unlock"
            )}
            @click=${this._turnOff}
          >
            <ha-svg-icon
              .path=${domainIcon("lock", this.stateObj, "unlocked")}
            ></ha-svg-icon>
          </ha-control-button>
        </div>
      `;
    }

    return html`
      <ha-control-switch
        .pathOn=${domainIcon("lock", this.stateObj, "locked")}
        .pathOff=${domainIcon("lock", this.stateObj, "unlocked")}
        vertical
        reversed
        .checked=${this._isOn}
        @change=${this._valueChanged}
        .ariaLabel=${this.hass.localize("ui.dialogs.more_info_control.toggle")}
        style=${styleMap({
          "--control-switch-on-color": onColor,
          "--control-switch-off-color": offColor,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
      </ha-control-switch>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-control-switch {
        height: 45vh;
        max-height: 320px;
        min-height: 200px;
        --control-switch-thickness: 100px;
        --control-switch-border-radius: 24px;
        --control-switch-padding: 6px;
        --mdc-icon-size: 24px;
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
