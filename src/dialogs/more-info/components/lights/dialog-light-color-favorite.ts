import { mdiClose } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import {
  getMobileOpenFromBottomAnimation,
  getMobileCloseToBottomAnimation,
} from "../../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button-toggle";
import type { EntityRegistryEntry } from "../../../../data/entity_registry";
import type { LightColor, LightEntity } from "../../../../data/light";
import {
  LightColorMode,
  lightSupportsColor,
  lightSupportsColorMode,
} from "../../../../data/light";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "./light-color-rgb-picker";
import "./light-color-temp-picker";
import type { LightColorFavoriteDialogParams } from "./show-dialog-light-color-favorite";

export type LightPickerMode = "color_temp" | "color";

@customElement("dialog-light-color-favorite")
class DialogLightColorFavorite extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() _dialogParams?: LightColorFavoriteDialogParams;

  @state() _entry?: EntityRegistryEntry;

  @state() _color?: LightColor;

  @state() private _mode?: LightPickerMode;

  @state() private _modes: LightPickerMode[] = [];

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public async showDialog(
    dialogParams: LightColorFavoriteDialogParams
  ): Promise<void> {
    this._entry = dialogParams.entry;
    this._dialogParams = dialogParams;
    this._color = dialogParams.initialColor ?? this._computeCurrentColor();
    this._updateModes();
  }

  public closeDialog(): void {
    this._dialog?.close();
  }

  private _updateModes() {
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

    if (this._color) {
      this._mode = "color_temp_kelvin" in this._color ? "color_temp" : "color";
    } else {
      this._mode = this._modes[0];
    }
  }

  private _computeCurrentColor() {
    const attributes = this.stateObj!.attributes;
    const color_mode = attributes.color_mode;

    let currentColor: LightColor | undefined;
    if (color_mode === LightColorMode.XY) {
      // XY color not supported for favorites. Try to grab the hs or rgb instead.
      if (attributes.hs_color) {
        currentColor = { hs_color: attributes.hs_color };
      } else if (attributes.rgb_color) {
        currentColor = { rgb_color: attributes.rgb_color };
      }
    } else if (
      color_mode === LightColorMode.COLOR_TEMP &&
      attributes.color_temp_kelvin
    ) {
      currentColor = {
        color_temp_kelvin: attributes.color_temp_kelvin,
      };
    } else if (attributes[color_mode + "_color"]) {
      currentColor = {
        [color_mode + "_color"]: attributes[color_mode + "_color"],
      } as LightColor;
    }

    return currentColor;
  }

  private _colorChanged(ev: CustomEvent) {
    this._color = ev.detail;
  }

  get stateObj() {
    return (
      this._entry &&
      (this.hass.states[this._entry.entity_id] as LightEntity | undefined)
    );
  }

  private async _cancel() {
    this._dialogParams?.cancel?.();
  }

  private _cancelDialog() {
    this._cancel();
    this.closeDialog();
  }

  private _dialogClosed(): void {
    this._dialogParams = undefined;
    this._entry = undefined;
    this._color = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _save() {
    if (!this._color) {
      this._cancel();
      return;
    }
    this._dialogParams?.submit?.(this._color);
    this.closeDialog();
  }

  private _modeChanged(ev): void {
    const newMode = ev.currentTarget.mode;
    if (newMode === this._mode) {
      return;
    }
    this._mode = newMode;
  }

  protected render() {
    if (!this._entry || !this.stateObj) {
      return nothing;
    }

    return html`
      <ha-md-dialog
        open
        @cancel=${this._cancel}
        @closed=${this._dialogClosed}
        aria-labelledby="dialog-light-color-favorite-title"
        .getOpenAnimation=${getMobileOpenFromBottomAnimation}
        .getCloseAnimation=${getMobileCloseToBottomAnimation}
      >
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            @click=${this.closeDialog}
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title" id="dialog-light-color-favorite-title"
            >${this._dialogParams?.title}</span
          >
        </ha-dialog-header>
        <div slot="content">
          <div class="header">
            ${this._modes.length > 1
              ? html`
                  <div class="modes">
                    ${this._modes.map(
                      (value) => html`
                        <ha-icon-button-toggle
                          border-only
                          .selected=${value === this._mode}
                          .label=${this.hass.localize(
                            `ui.dialogs.more_info_control.light.color_picker.mode.${value}`
                          )}
                          .mode=${value}
                          @click=${this._modeChanged}
                        >
                          <span
                            class="wheel ${classMap({ [value]: true })}"
                          ></span>
                        </ha-icon-button-toggle>
                      `
                    )}
                  </div>
                `
              : nothing}
          </div>
          <div class="content">
            ${this._mode === "color_temp"
              ? html`
                  <light-color-temp-picker
                    .hass=${this.hass}
                    .stateObj=${this.stateObj}
                    @color-changed=${this._colorChanged}
                  >
                  </light-color-temp-picker>
                `
              : nothing}
            ${this._mode === "color"
              ? html`
                  <light-color-rgb-picker
                    .hass=${this.hass}
                    .stateObj=${this.stateObj}
                    @color-changed=${this._colorChanged}
                  >
                  </light-color-rgb-picker>
                `
              : nothing}
          </div>
        </div>
        <div slot="actions">
          <ha-button appearance="plain" @click=${this._cancelDialog}>
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button @click=${this._save} .disabled=${!this._color}
            >${this.hass.localize("ui.common.save")}</ha-button
          >
        </div>
      </ha-md-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-md-dialog {
          min-width: 420px; /* prevent width jumps when switching modes */
          max-height: min(
            600px,
            100% - 48px
          ); /* prevent scrolling on desktop */
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-md-dialog {
            min-width: 100%;
            min-height: auto;
            max-height: calc(100% - 100px);
            margin-bottom: 0;

            --md-dialog-container-shape-start-start: 28px;
            --md-dialog-container-shape-start-end: 28px;
          }
        }

        .content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
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
          border-radius: var(--ha-border-radius-xl);
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
    "dialog-light-color-favorite": DialogLightColorFavorite;
  }
}
