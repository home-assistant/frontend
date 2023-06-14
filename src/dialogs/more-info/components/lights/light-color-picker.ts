import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../../components/ha-hs-color-picker";
import "../../../../components/ha-icon-button-group";
import "../../../../components/ha-icon-button-toggle";
import "../../../../components/ha-temp-color-picker";
import {
  LightColor,
  LightColorMode,
  LightEntity,
  lightSupportsColor,
  lightSupportsColorMode,
} from "../../../../data/light";
import { HomeAssistant } from "../../../../types";
import "./light-color-rgb-picker";
import "./light-color-temp-picker";

export type LightPickerMode = "color_temp" | "color";

declare global {
  interface HASSDomEvents {
    "color-changed": LightColor;
  }
}

@customElement("light-color-picker")
class LightColorPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @property() public defaultMode?: LightPickerMode;

  @state() private _mode?: LightPickerMode;

  @state() private _modes: LightPickerMode[] = [];

  get stateObj() {
    return this.hass.states[this.entityId] as LightEntity | undefined;
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    return html`
      ${this._modes.length > 1
        ? html`
            <div class="modes">
              ${this._modes.map(
                (value) =>
                  html`<ha-icon-button-toggle
                    border-only
                    ?selected=${value === this._mode}
                    .title=${this.hass.localize(
                      `ui.dialogs.more_info_control.light.color_picker.mode.${value}`
                    )}
                    .ariaLabel=${this.hass.localize(
                      `ui.dialogs.more_info_control.light.color_picker.mode.${value}`
                    )}
                    .mode=${value}
                    @click=${this._modeChanged}
                  >
                    <span
                      class="wheel ${classMap({
                        [value]: true,
                      })}"
                    ></span>
                  </ha-icon-button-toggle>`
              )}
            </div>
          `
        : nothing}
      <div class="content">
        ${this._mode === LightColorMode.COLOR_TEMP
          ? html`
              <light-color-temp-picker
                .hass=${this.hass}
                .stateObj=${this.stateObj}
              >
              </light-color-temp-picker>
            `
          : nothing}
        ${this._mode === "color"
          ? html`
              <light-color-rgb-picker
                .hass=${this.hass}
                .stateObj=${this.stateObj}
              >
              </light-color-rgb-picker>
            `
          : nothing}
      </div>
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!changedProps.has("entityId") && !changedProps.has("hass")) {
      return;
    }

    if (changedProps.has("entityId")) {
      const supportsTemp = lightSupportsColorMode(
        this.stateObj!,
        LightColorMode.COLOR_TEMP
      );

      const supportsColor = lightSupportsColor(this.stateObj!);

      const modes: LightPickerMode[] = [];
      if (supportsColor) {
        modes.push("color");
      }
      if (supportsTemp) {
        modes.push("color_temp");
      }

      this._modes = modes;
      this._mode =
        this.defaultMode ??
        (this.stateObj!.attributes.color_mode
          ? this.stateObj!.attributes.color_mode === LightColorMode.COLOR_TEMP
            ? LightColorMode.COLOR_TEMP
            : "color"
          : this._modes[0]);
    }
  }

  private _modeChanged(ev): void {
    const newMode = ev.currentTarget.mode;
    if (newMode === this._mode) {
      return;
    }
    this._mode = newMode;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
        }
        .content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px 24px 12px 24px;
          flex: 1;
        }
        .modes {
          display: flex;
          flex-direction: row;
          justify-content: flex-end;
          padding: 0 24px;
        }
        .wheel {
          width: 30px;
          height: 30px;
          flex: none;
          border-radius: 15px;
        }
        .wheel.color {
          background-image: url("/static/images/color_wheel.png");
          background-size: cover;
        }
        .wheel.color_temp {
          background: linear-gradient(
            0,
            rgb(166, 209, 255) 0%,
            white 50%,
            rgb(255, 160, 0) 100%
          );
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "light-color-picker": LightColorPicker;
  }
}
