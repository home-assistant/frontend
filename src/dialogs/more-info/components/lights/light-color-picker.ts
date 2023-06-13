import "@material/mwc-button";
import "@material/mwc-tab-bar/mwc-tab-bar";
import "@material/mwc-tab/mwc-tab";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-hs-color-picker";
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
            <mwc-tab-bar
              .activeIndex=${this._mode ? this._modes.indexOf(this._mode) : 0}
              @MDCTabBar:activated=${this._handleTabChanged}
            >
              ${this._modes.map(
                (value) =>
                  html`<mwc-tab
                    .label=${this.hass.localize(
                      `ui.dialogs.more_info_control.light.color_picker.mode.${value}`
                    )}
                  ></mwc-tab>`
              )}
            </mwc-tab-bar>
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

  private _handleTabChanged(ev: CustomEvent): void {
    const newMode = this._modes[ev.detail.index];
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
          padding: 24px;
          flex: 1;
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
