import { mdiLightbulbOff, mdiLightbulbOn } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { stateActive } from "../../../../common/entity/state_active";
import { stateColorCss } from "../../../../common/entity/state_color";
import "../../../../components/ha-bar-switch";
import { UNAVAILABLE, UNKNOWN } from "../../../../data/entity";
import { LightEntity } from "../../../../data/light";
import { HomeAssistant } from "../../../../types";
import "../../../../components/ha-bar-button";

@customElement("ha-more-info-light-toggle")
export class HaMoreInfoLightToggle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @state() value?: number;

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    if (changedProp.has("stateObj")) {
      this.value =
        this.stateObj.attributes.brightness != null
          ? Math.max(
              Math.round((this.stateObj.attributes.brightness * 100) / 255),
              1
            )
          : undefined;
    }
  }

  private _valueChanged(ev) {
    const checked = ev.target.checked as boolean;

    this.hass.callService("light", checked ? "turn_on" : "turn_off", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _turnOn() {
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _turnOff() {
    this.hass.callService("light", "turn_off", {
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
            .label=${this.hass.localize(
              "ui.dialogs.more_info_control.cover.open_tilt_cover"
            )}
            @click=${this._turnOn}
            .disabled=${this.stateObj.state === UNAVAILABLE}
            class=${classMap({
              active: isOn,
            })}
            style=${styleMap({
              "--color": color,
            })}
          >
            <ha-svg-icon .path=${mdiLightbulbOn}></ha-svg-icon>
          </ha-bar-button>
          <ha-bar-button
            .label=${this.hass.localize(
              "ui.dialogs.more_info_control.cover.open_tilt_cover"
            )}
            @click=${this._turnOff}
            class=${classMap({
              active: isOff,
            })}
            style=${styleMap({
              "--color": color,
            })}
          >
            <ha-svg-icon .path=${mdiLightbulbOff}></ha-svg-icon>
          </ha-bar-button>
        </div>
      `;
    }

    return html`
      <ha-bar-switch
        .pathOn=${mdiLightbulbOn}
        .pathOff=${mdiLightbulbOff}
        vertical
        reversed
        .checked=${isOn}
        .showHandle=${stateActive(this.stateObj)}
        @change=${this._valueChanged}
        aria-label="Light switch"
        style=${styleMap({
          "--switch-bar-on-color": color,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
      </ha-bar-switch>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-bar-switch {
        height: 320px;
        --switch-bar-thickness: 100px;
        --switch-bar-border-radius: 24px;
        --switch-bar-padding: 6px;
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
    "ha-more-info-light-toggle": HaMoreInfoLightToggle;
  }
}
