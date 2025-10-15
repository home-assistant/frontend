import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { mdiClose } from "@mdi/js";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-bottom-sheet";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-button-toggle";
import "../../../../components/ha-wa-dialog";
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

  @state() private _open = false;

  @state() private _narrow = false;

  private _mediaQuery?: MediaQueryList;

  public async showDialog(
    dialogParams: LightColorFavoriteDialogParams
  ): Promise<void> {
    this._entry = dialogParams.entry;
    this._dialogParams = dialogParams;
    this._color = dialogParams.initialColor ?? this._computeCurrentColor();
    this._updateModes();
    this._mediaQuery = matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    );
    this._narrow = this._mediaQuery.matches;
    this._mediaQuery.addEventListener("change", this._handleMediaChange);
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _handleMediaChange = (ev: MediaQueryListEvent) => {
    this._narrow = ev.matches;
  };

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

  private _cancel() {
    this._dialogParams?.cancel?.();
    this.closeDialog();
  }

  private _dialogClosed(): void {
    if (this._mediaQuery) {
      this._mediaQuery.removeEventListener("change", this._handleMediaChange);
      this._mediaQuery = undefined;
    }
    this._dialogParams = undefined;
    this._entry = undefined;
    this._color = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _save() {
    if (!this._color) {
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

  private _renderModes() {
    if (this._modes.length <= 1) {
      return nothing;
    }
    return html`
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
              <span class="wheel ${classMap({ [value]: true })}"></span>
            </ha-icon-button-toggle>
          `
    )}
      </div>
    `;
  }

  private _renderColorPicker() {
    return html`
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
    `;
  }

  private _renderButtons() {
    return html`
      <ha-button
        slot="secondaryAction"
        appearance="plain"
        @click=${this._cancel}
      >
        ${this.hass.localize("ui.common.cancel")}
      </ha-button>
      <ha-button
        slot="primaryAction"
        appearance="accent"
        @click=${this._save}
        .disabled=${!this._color}
      >
        ${this.hass.localize("ui.common.save")}
      </ha-button>
    `;
  }

  protected render() {
    if (!this._entry || !this.stateObj) {
      return nothing;
    }

    if (this._narrow) {
      return html`
        <ha-bottom-sheet .open=${this._open} @closed=${this._dialogClosed}>
          <div class="bottom-sheet-container">
            <ha-dialog-header>
              <ha-icon-button
                slot="navigationIcon"
                @click=${this.closeDialog}
                .label=${this.hass.localize("ui.common.close")}
                .path=${mdiClose}
              ></ha-icon-button>
              <span slot="title">${this._dialogParams?.title}</span>
            </ha-dialog-header>
            <div class="header">${this._renderModes()}</div>
            <div class="content">${this._renderColorPicker()}</div>
            <div class="buttons">
              <ha-button appearance="plain" @click=${this._cancel}>
                ${this.hass.localize("ui.common.cancel")}
              </ha-button>
              <ha-button
                appearance="accent"
                @click=${this._save}
                .disabled=${!this._color}
              >
                ${this.hass.localize("ui.common.save")}
              </ha-button>
            </div>
          </div>
        </ha-bottom-sheet>
      `;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        .headerTitle=${this._dialogParams?.title ?? ""}
        @closed=${this._dialogClosed}
      >
        <div class="header">${this._renderModes()}</div>
        <div class="content">${this._renderColorPicker()}</div>
        <ha-dialog-footer slot="footer"
          >${this._renderButtons()}</ha-dialog-footer
        >
      </ha-wa-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-wa-dialog {
          --dialog-content-padding: 0;
          --ha-dialog-width-md: 420px;
        }

        ha-bottom-sheet {
          --ha-bottom-sheet-max-width: 560px;
          --ha-bottom-sheet-padding: 0;
          --ha-bottom-sheet-surface-background: var(--card-background-color);
        }

        .bottom-sheet-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .bottom-sheet-container .header {
          padding: 0 24px;
        }

        .bottom-sheet-container .content {
          flex: 1;
          overflow-y: auto;
        }

        .buttons {
          display: flex;
          justify-content: flex-end;
          gap: var(--ha-space-2);
          padding: var(--ha-space-4) var(--ha-space-6);
          padding-bottom: max(var(--ha-space-4), env(safe-area-inset-bottom));
        }

        .content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--ha-space-6);
          flex: 1;
        }
        .modes {
          display: flex;
          flex-direction: row;
          justify-content: flex-end;
          padding: 0 var(--ha-space-6);
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
