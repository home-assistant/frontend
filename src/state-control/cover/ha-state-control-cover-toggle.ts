import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { stateColorCss } from "../../common/entity/state_color";
import "../../components/ha-control-button";
import "../../components/ha-control-switch";
import "../../components/ha-state-icon";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity";
import { forwardHaptic } from "../../data/haptics";
import { stateControlToggleStyle } from "../../resources/state-control-styles";
import type { HomeAssistant } from "../../types";

@customElement("ha-state-control-cover-toggle")
export class HaStateControlCoverToggle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

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

  private async _callService(turnOn): Promise<void> {
    if (!this.hass || !this.stateObj) {
      return;
    }
    forwardHaptic(this, "light");

    await this.hass.callService(
      "cover",
      turnOn ? "open_cover" : "close_cover",
      {
        entity_id: this.stateObj.entity_id,
      }
    );
  }

  protected render(): TemplateResult {
    const onColor = stateColorCss(this.stateObj, "open");
    const offColor = stateColorCss(this.stateObj, "closed");

    const isOn =
      this.stateObj.state === "open" ||
      this.stateObj.state === "closing" ||
      this.stateObj.state === "opening";
    const isOff = this.stateObj.state === "closed";

    if (
      this.stateObj.attributes.assumed_state ||
      this.stateObj.state === UNKNOWN
    ) {
      return html`
        <div class="buttons">
          <ha-control-button
            .label=${this.hass.localize("ui.card.cover.open_cover")}
            @click=${this._turnOn}
            .disabled=${this.stateObj.state === UNAVAILABLE}
            class=${classMap({
              active: isOn,
            })}
            style=${styleMap({
              "--color": onColor,
            })}
          >
            <ha-state-icon
              .hass=${this.hass}
              .stateObj=${this.stateObj}
              stateValue="open"
            ></ha-state-icon>
          </ha-control-button>
          <ha-control-button
            .label=${this.hass.localize("ui.card.cover.close_cover")}
            @click=${this._turnOff}
            .disabled=${this.stateObj.state === UNAVAILABLE}
            class=${classMap({
              active: isOff,
            })}
            style=${styleMap({
              "--color": offColor,
            })}
          >
            <ha-state-icon
              .hass=${this.hass}
              .stateObj=${this.stateObj}
              stateValue="closed"
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
        .checked=${isOn}
        @change=${this._valueChanged}
        .label=${isOn
          ? this.hass.localize("ui.card.cover.close_cover")
          : this.hass.localize("ui.card.cover.open_cover")}
        style=${styleMap({
          "--control-switch-on-color": onColor,
          "--control-switch-off-color": offColor,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
        <ha-state-icon
          slot="icon-on"
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          stateValue="open"
        ></ha-state-icon>
        <ha-state-icon
          slot="icon-off"
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          stateValue="closed"
        ></ha-state-icon>
      </ha-control-switch>
    `;
  }

  static styles = [stateControlToggleStyle];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-cover-toggle": HaStateControlCoverToggle;
  }
}
