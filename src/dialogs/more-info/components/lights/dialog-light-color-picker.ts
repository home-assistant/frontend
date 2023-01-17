import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button-toggle-group";
import { createCloseHeading } from "../../../../components/ha-dialog";
import {
  LightColorMode,
  LightEntity,
  lightSupportsColorMode,
} from "../../../../data/light";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant, ToggleButton } from "../../../../types";
import "../ha-more-info-light-color-temp";
import "../ha-more-info-light-hs";
import { LightColorPickerDialogParams } from "./show-dialog-light-color-picker";

const COLOR_MODES = [LightColorMode.COLOR_TEMP, LightColorMode.HS] as const;
type ColorMode = typeof COLOR_MODES[number];

@customElement("dialog-light-color-picker")
class DialogLightColorPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LightColorPickerDialogParams;

  @state() private _mode?: ColorMode;

  @state() private _modes: ColorMode[] = [];

  public async showDialog(params: LightColorPickerDialogParams): Promise<void> {
    this._params = params;
    const stateObj = this.hass.states[this._params.entityId];

    this._modes = COLOR_MODES.filter((mode) =>
      lightSupportsColorMode(stateObj, mode)
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

    const buttons = this._modesButtons(
      stateObj.attributes.supported_color_modes
    );

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        .heading=${createCloseHeading(this.hass, "Color picker")}
      >
        <div>
          ${buttons.length > 1
            ? html`<ha-button-toggle-group
                fullWidth
                .buttons=${this._modesButtons(
                  stateObj.attributes.supported_color_modes
                )}
                .active=${this._mode}
                @value-changed=${this._modeChanged}
              ></ha-button-toggle-group>`
            : null}
          ${this._mode === "color_temp"
            ? html`
                <ha-more-info-light-color-temp
                  .stateObj=${stateObj}
                  .hass=${this.hass}
                >
                </ha-more-info-light-color-temp>
              `
            : null}
          ${this._mode === "hs"
            ? html`
                <ha-more-info-light-hs .stateObj=${stateObj} .hass=${this.hass}>
                </ha-more-info-light-hs>
              `
            : null}
        </div>
        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          Cancel
        </mwc-button>
        <mwc-button @click=${this.closeDialog} slot="primaryAction">
          Ok
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _modesButtons = memoizeOne(
    (supportedModes: LightColorMode[] | undefined): ToggleButton[] => {
      const modes = COLOR_MODES.filter((mode) =>
        supportedModes?.includes(mode)
      );
      return modes.map((mode) => ({
        label: mode,
        value: mode,
      }));
    }
  );

  private _modeChanged(ev: CustomEvent) {
    this._mode = ev.detail.value;
  }

  private _close(): void {
    this._params = undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
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
