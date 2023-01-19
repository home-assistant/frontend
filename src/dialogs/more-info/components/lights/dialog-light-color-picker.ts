import "@material/mwc-button";
import "@material/mwc-tab-bar/mwc-tab-bar";
import "@material/mwc-tab/mwc-tab";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button-toggle-group";
import "../../../../components/ha-header-bar";
import "../../../../components/ha-icon-button-prev";
import {
  LightColorMode,
  LightEntity,
  lightSupportsColorMode,
} from "../../../../data/light";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import "./modes/light-color-picker-mode-color";
import "./modes/light-color-picker-mode-color-temp";
import "./modes/light-color-picker-mode-color-advanced";
import { LightColorPickerDialogParams } from "./show-dialog-light-color-picker";

const MODES = ["color_temp", "color", "color_advanced"] as const;
type Mode = (typeof MODES)[number];

const supportedModes: Record<Mode, LightColorMode[]> = {
  color_temp: [LightColorMode.COLOR_TEMP],
  color: [LightColorMode.HS],
  color_advanced: [
    LightColorMode.RGB,
    LightColorMode.RGBW,
    LightColorMode.RGBWW,
  ],
};

const modesLabels: Record<Mode, string> = {
  color_temp: "Temperature",
  color: "Color",
  color_advanced: "Advanced",
};

@customElement("dialog-light-color-picker")
class DialogLightColorPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LightColorPickerDialogParams;

  @state() private _mode?: Mode;

  @state() private _modes: Mode[] = [];

  public async showDialog(params: LightColorPickerDialogParams): Promise<void> {
    this._params = params;
    const stateObj = this.hass.states[this._params.entityId];

    this._modes = MODES.filter((mode) =>
      supportedModes[mode].some((lightCodeMode) =>
        lightSupportsColorMode(stateObj, lightCodeMode)
      )
    );
    this._mode = this._modes[0];

    await this.updateComplete;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const stateObj = this.hass.states[this._params.entityId] as LightEntity;

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .heading=${"Change Color"}
      >
        <div slot="heading">
          <ha-header-bar>
            <ha-icon-button-prev
              slot="navigationIcon"
              dialogAction="cancel"
              .label=${this.hass.localize(
                "ui.dialogs.more_info_control.dismiss"
              )}
            ></ha-icon-button-prev>

            <span slot="title">Change Color</span>
          </ha-header-bar>
        </div>
        <div>
          ${this._modes.length > 1
            ? html`
                <mwc-tab-bar
                  .activeIndex=${this._mode && this._modes.indexOf(this._mode)}
                  @MDCTabBar:activated=${this._handleTabChanged}
                >
                  ${this._modes.map(
                    (mode) =>
                      html` <mwc-tab .label=${modesLabels[mode]}></mwc-tab> `
                  )}
                </mwc-tab-bar>
              `
            : ""}
          ${this._mode === "color_temp"
            ? html`
                <light-color-picker-mode-color-temp
                  .stateObj=${stateObj}
                  .hass=${this.hass}
                >
                </light-color-picker-mode-color-temp>
              `
            : null}
          ${this._mode === "color"
            ? html`
                <light-color-picker-mode-color
                  .stateObj=${stateObj}
                  .hass=${this.hass}
                >
                </light-color-picker-mode-color>
              `
            : null}
          ${this._mode === "color_advanced"
            ? html`
                <light-color-picker-mode-color-advanced
                  .stateObj=${stateObj}
                  .hass=${this.hass}
                >
                </light-color-picker-mode-color-advanced>
              `
            : null}
        </div>
      </ha-dialog>
    `;
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newMode = this._modes[ev.detail.index];
    if (newMode === this._mode) {
      return;
    }
    this._mode = newMode;
  }

  private _close(): void {
    this._params = undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0px;
        }
        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
        }
        ha-button-toggle-group {
          margin-bottom: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-light-color-picker": DialogLightColorPicker;
  }
}
