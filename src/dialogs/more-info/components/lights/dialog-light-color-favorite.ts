import { mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button-toggle";
import type { EntityRegistryEntry } from "../../../../data/entity_registry";
import {
  formatTempColor,
  LightColor,
  LightColorMode,
  LightEntity,
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

  @state() private _currentValue?: string;

  private _colorHovered(ev: CustomEvent<HASSDomEvents["color-hovered"]>) {
    if (ev.detail && "color_temp_kelvin" in ev.detail) {
      this._currentValue = formatTempColor(ev.detail.color_temp_kelvin);
    } else {
      this._currentValue = undefined;
    }
  }

  public async showDialog(
    dialogParams: LightColorFavoriteDialogParams
  ): Promise<void> {
    this._entry = dialogParams.entry;
    this._dialogParams = dialogParams;
    this._color = dialogParams.initialColor ?? this._computeCurrentColor();
    this._updateModes();
  }

  public closeDialog(): void {
    this._dialogParams = undefined;
    this._entry = undefined;
    this._color = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
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
    this.closeDialog();
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
      <ha-dialog
        open
        @closed=${this._cancel}
        .heading=${this._dialogParams?.title ?? ""}
        flexContent
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">${this._dialogParams?.title}</span>
        </ha-dialog-header>
        <div class="header">
          <span class="value">${this._currentValue}</span>
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
                  @color-hovered=${this._colorHovered}
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
                  @color-hovered=${this._colorHovered}
                >
                </light-color-rgb-picker>
              `
            : nothing}
        </div>
        <ha-button slot="secondaryAction" dialogAction="cancel">
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          slot="primaryAction"
          @click=${this._save}
          .disabled=${!this._color}
          >${this.hass.localize("ui.common.save")}</ha-button
        >
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-dialog {
            --dialog-surface-margin-top: 100px;
            --mdc-dialog-min-height: auto;
            --mdc-dialog-max-height: calc(100% - 100px);
            --ha-dialog-border-radius: var(
              --ha-dialog-bottom-sheet-border-radius,
              28px 28px 0 0
            );
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
        .value {
          pointer-events: none;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          margin: auto;
          font-style: normal;
          font-weight: 500;
          font-size: 16px;
          height: 48px;
          line-height: 48px;
          letter-spacing: 0.1px;
          text-align: center;
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
