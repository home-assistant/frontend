import { mdiFlash, mdiFlashOff } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-bar-button";
import "../../../components/ha-control-switch";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity";
import { HomeAssistant } from "../../../types";

@customElement("ha-more-info-toggle")
export class HaMoreInfoToggle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: false }) public iconPathOn?: string;

  @property({ attribute: false }) public iconPathOff?: string;

  private _valueChanged(ev) {
    const checked = ev.target.checked as boolean;

    if (checked) {
      this._turnOn();
    } else {
      this._turnOff();
    }
  }

  private _turnOn() {
    const domain = computeDomain(this.stateObj!.entity_id);
    this.hass.callService(domain, "turn_on", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _turnOff() {
    const domain = computeDomain(this.stateObj!.entity_id);
    this.hass.callService(domain, "turn_off", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  protected render(): TemplateResult {
    const color = stateColorCss(this.stateObj);
    const isOn = this.stateObj.state === "on";
    const isOff = this.stateObj.state === "off";

    if (
      this.stateObj.attributes.assumed_state ||
      this.stateObj.state === UNKNOWN
    ) {
      return html`
        <div class="buttons">
          <ha-bar-button
            .label=${this.hass.localize("ui.dialogs.more_info_control.turn_on")}
            @click=${this._turnOn}
            .disabled=${this.stateObj.state === UNAVAILABLE}
            class=${classMap({
              active: isOn,
            })}
            style=${styleMap({
              "--color": color,
            })}
          >
            <ha-svg-icon .path=${this.iconPathOn || mdiFlash}></ha-svg-icon>
          </ha-bar-button>
          <ha-bar-button
            .label=${this.hass.localize(
              "ui.dialogs.more_info_control.turn_off"
            )}
            @click=${this._turnOff}
            .disabled=${this.stateObj.state === UNAVAILABLE}
            class=${classMap({
              active: isOff,
            })}
            style=${styleMap({
              "--color": color,
            })}
          >
            <ha-svg-icon .path=${this.iconPathOff || mdiFlashOff}></ha-svg-icon>
          </ha-bar-button>
        </div>
      `;
    }

    return html`
      <ha-control-switch
        .pathOn=${this.iconPathOn || mdiFlash}
        .pathOff=${this.iconPathOff || mdiFlashOff}
        vertical
        reversed
        .checked=${isOn}
        .showHandle=${stateActive(this.stateObj)}
        @change=${this._valueChanged}
        .ariaLabel=${this.hass.localize("ui.dialogs.more_info_control.toggle")}
        style=${styleMap({
          "--control-switch-on-color": color,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
      </ha-control-switch>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-control-switch {
        height: 320px;
        --control-switch-thickness: 100px;
        --control-switch-border-radius: 24px;
        --control-switch-padding: 6px;
        --mdc-icon-size: 24px;
      }
      .buttons {
        display: flex;
        flex-direction: column;
        width: 100px;
        height: 320px;
        padding: 6px;
        box-sizing: border-box;
      }
      ha-bar-button {
        flex: 1;
        width: 100%;
        --button-bar-border-radius: 18px;
      }
      ha-bar-button.active {
        --button-bar-icon-color: white;
        --button-bar-background-color: var(--color);
        --button-bar-background-opacity: 1;
      }
      ha-bar-button:not(:last-child) {
        margin-bottom: 6px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-toggle": HaMoreInfoToggle;
  }
}
