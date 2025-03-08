import { mdiAlertCircleOutline } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-formfield";
import "../../components/ha-radio";
import "../../components/ha-button";
import "../../components/ha-circular-progress";
import "../../components/ha-svg-icon";
import "../../components/ha-list-item";
import type { HaRadio } from "../../components/ha-radio";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import "../../components/ha-textfield";
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
} from "../../resources/styles-data";
import type { HomeAssistant, ThemeSettings } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import type { StorageLocation } from "../../state/themes-mixin";
import { subscribeSelectedTheme } from "../../data/ws-themes";

const USE_DEFAULT_THEME = "__USE_DEFAULT_THEME__";
const HOME_ASSISTANT_THEME = "default";

@customElement("ha-pick-theme-row")
export class HaPickThemeRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false })
  public storageLocation: StorageLocation = "browser";

  @state() _themeNames: string[] = [];

  @state() private _selectedTheme?: ThemeSettings;

  @state() private _loading = false;

  protected render(): TemplateResult {
    if (this._loading) {
      return html`<ha-circular-progress indeterminate></ha-circular-progress>`;
    }

    const hasThemes =
      this.hass.themes.themes && Object.keys(this.hass.themes.themes).length;

    const curThemeIsUseDefault = this._selectedTheme?.theme === "";
    const curTheme = this._selectedTheme?.theme
      ? this._selectedTheme?.theme
      : this._selectedTheme?.dark
        ? this.hass.themes.default_dark_theme || this.hass.themes.default_theme
        : this.hass.themes.default_theme;

    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading"
          >${this.hass.localize("ui.panel.profile.themes.header")}</span
        >
        <span
          slot="description"
          class=${this.storageLocation === "user" &&
          this.hass.browserThemeEnabled
            ? "device-info"
            : ""}
        >
          ${!hasThemes &&
          !(this.storageLocation === "user" && this.hass.browserThemeEnabled)
            ? this.hass.localize("ui.panel.profile.themes.error_no_theme")
            : ""}
          ${this.storageLocation === "user" && this.hass.browserThemeEnabled
            ? html`<ha-svg-icon .path=${mdiAlertCircleOutline}></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.profile.themes.device.user_theme_info"
                )}`
            : html`<a
                href=${documentationUrl(
                  this.hass,
                  "/integrations/frontend/#defining-themes"
                )}
                target="_blank"
                rel="noreferrer"
              >
                ${this.hass.localize("ui.panel.profile.themes.link_promo")}
              </a>`}
        </span>
        <ha-select
          .label=${this.hass.localize("ui.panel.profile.themes.dropdown_label")}
          .disabled=${!hasThemes}
          .value=${this._selectedTheme?.theme || USE_DEFAULT_THEME}
          @selected=${this._handleThemeSelection}
          naturalMenuWidth
        >
          <ha-list-item .value=${USE_DEFAULT_THEME}>
            ${this.hass.localize("ui.panel.profile.themes.use_default")}
          </ha-list-item>
          <ha-list-item .value=${HOME_ASSISTANT_THEME}>
            Home Assistant
          </ha-list-item>
          ${this._themeNames.map(
            (theme) => html`
              <ha-list-item .value=${theme}>${theme}</ha-list-item>
            `
          )}
        </ha-select>
      </ha-settings-row>
      ${curTheme === HOME_ASSISTANT_THEME ||
      (curThemeIsUseDefault &&
        this.hass.themes.default_dark_theme &&
        this.hass.themes.default_theme) ||
      this._supportsModeSelection(curTheme)
        ? html`<div class="inputs">
            <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.profile.themes.dark_mode.auto"
              )}
            >
              <ha-radio
                @change=${this._handleDarkMode}
                name="dark_mode"
                value="auto"
                .checked=${this._selectedTheme?.dark === undefined}
              ></ha-radio>
            </ha-formfield>
            <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.profile.themes.dark_mode.light"
              )}
            >
              <ha-radio
                @change=${this._handleDarkMode}
                name="dark_mode"
                value="light"
                .checked=${this._selectedTheme?.dark === false}
              >
              </ha-radio>
            </ha-formfield>
            <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.profile.themes.dark_mode.dark"
              )}
            >
              <ha-radio
                @change=${this._handleDarkMode}
                name="dark_mode"
                value="dark"
                .checked=${this._selectedTheme?.dark === true}
              >
              </ha-radio>
            </ha-formfield>
            ${curTheme === HOME_ASSISTANT_THEME
              ? html`<div class="color-pickers">
                  <ha-textfield
                    .value=${this._selectedTheme?.primaryColor ||
                    DEFAULT_PRIMARY_COLOR}
                    type="color"
                    .label=${this.hass.localize(
                      "ui.panel.profile.themes.primary_color"
                    )}
                    .name=${"primaryColor"}
                    @change=${this._handleColorChange}
                  ></ha-textfield>
                  <ha-textfield
                    .value=${this._selectedTheme?.accentColor ||
                    DEFAULT_ACCENT_COLOR}
                    type="color"
                    .label=${this.hass.localize(
                      "ui.panel.profile.themes.accent_color"
                    )}
                    .name=${"accentColor"}
                    @change=${this._handleColorChange}
                  ></ha-textfield>
                  ${this._selectedTheme?.primaryColor ||
                  this._selectedTheme?.accentColor
                    ? html`<ha-button @click=${this._resetColors}>
                        ${this.hass.localize("ui.panel.profile.themes.reset")}
                      </ha-button>`
                    : nothing}
                </div>`
              : nothing}
          </div>`
        : nothing}
    `;
  }

  public willUpdate(changedProperties: PropertyValues) {
    if (!this.hasUpdated) {
      if (this.storageLocation === "browser") {
        this._selectedTheme = this.hass.selectedTheme ?? undefined;
      } else {
        this._loading = true;
        this._selectedTheme = undefined;
        subscribeSelectedTheme(
          this.hass,
          (selectedTheme?: ThemeSettings | null) => {
            this._selectedTheme = selectedTheme ?? undefined;
            this._loading = false;
          }
        );
      }
    }

    const oldHass = changedProperties.get("hass") as undefined | HomeAssistant;
    const themesChanged =
      changedProperties.has("hass") &&
      (!oldHass || oldHass.themes.themes !== this.hass.themes.themes);

    if (themesChanged) {
      this._themeNames = Object.keys(this.hass.themes.themes).sort();
    }
  }

  private _shouldSaveHass() {
    return (
      this.storageLocation === "browser" ||
      (this.storageLocation === "user" && !this.hass.browserThemeEnabled)
    );
  }

  private _updateSelectedTheme(updatedTheme: Partial<ThemeSettings>) {
    this._selectedTheme = {
      ...this._selectedTheme,
      ...updatedTheme,
      theme: updatedTheme.theme ?? this._selectedTheme?.theme ?? "",
    };

    fireEvent(this, "settheme", {
      settings: this._selectedTheme,
      storageLocation: this.storageLocation,
      saveHass: this._shouldSaveHass(),
    });
  }

  private _handleColorChange(ev: CustomEvent) {
    const target = ev.target as any;
    this._updateSelectedTheme({ [target.name]: target.value });
  }

  private _resetColors() {
    this._updateSelectedTheme({
      primaryColor: undefined,
      accentColor: undefined,
    });
  }

  private _supportsModeSelection(themeName: string): boolean {
    if (!(themeName in this.hass.themes.themes)) {
      return false; // User's theme no longer exists
    }
    return "modes" in this.hass.themes.themes[themeName];
  }

  private _handleDarkMode(ev: CustomEvent) {
    let dark: boolean | undefined;
    switch ((ev.target as HaRadio).value) {
      case "light":
        dark = false;
        break;
      case "dark":
        dark = true;
        break;
    }
    this._updateSelectedTheme({ dark });
  }

  private _handleThemeSelection(ev) {
    const theme = ev.target.value;
    if (theme === this._selectedTheme?.theme) {
      return;
    }

    if (theme === USE_DEFAULT_THEME) {
      if (this.hass.selectedTheme?.theme) {
        this._updateSelectedTheme({
          theme: "",
          primaryColor: undefined,
          accentColor: undefined,
        });
      }
      return;
    }
    this._updateSelectedTheme({
      theme,
      primaryColor: undefined,
      accentColor: undefined,
    });
  }

  static styles = css`
    a {
      color: var(--primary-color);
    }
    .inputs {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      margin: 0 12px;
    }
    ha-formfield {
      margin: 0 4px;
    }
    .color-pickers {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      flex-grow: 1;
    }
    ha-textfield {
      --text-field-padding: 8px;
      min-width: 75px;
      flex-grow: 1;
      margin: 0 4px;
    }
    .device-info {
      color: var(--warning-color);
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-theme-row": HaPickThemeRow;
  }
}
