import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { normalizeLuminance } from "../common/color/palette";
import { fireEvent } from "../common/dom/fire_event";
import {
  DefaultAccentColor,
  DefaultPrimaryColor,
} from "../resources/theme/color/color.globals";
import type { HomeAssistant, ThemeSettings, ValueChangedEvent } from "../types";
import "./ha-button";
import "./ha-settings-row";
import "./ha-theme-picker";
import "./input/ha-input";
import "./radio/ha-radio-group";
import type { HaRadioGroup } from "./radio/ha-radio-group";
import "./radio/ha-radio-option";

const HOME_ASSISTANT_THEME = "default";

export interface ThemeSettingsLabels {
  theme?: string;
  noTheme?: string;
  mode?: string;
  autoMode?: string;
  lightMode?: string;
  darkMode?: string;
  colors?: string;
  primaryColor?: string;
  accentColor?: string;
  reset?: string;
}

@customElement("ha-theme-settings")
export class HaThemeSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selectedTheme?: ThemeSettings | null;

  @property({ attribute: false }) public labels?: ThemeSettingsLabels;

  @property({ attribute: false }) public description?: TemplateResult | string;

  @property() public heading?: string;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "include-default", type: Boolean })
  public includeDefault = false;

  @property({ attribute: "show-theme-picker", type: Boolean })
  public showThemePicker = true;

  @property({ attribute: "theme-picker-disabled", type: Boolean })
  public themePickerDisabled = false;

  protected render(): TemplateResult {
    const themeSettings = this.selectedTheme ?? this.hass.selectedTheme;
    const curThemeIsUseDefault = themeSettings?.theme === "";
    const curTheme = themeSettings?.theme
      ? themeSettings.theme
      : this.hass.themes.darkMode
        ? this.hass.themes.default_dark_theme || this.hass.themes.default_theme
        : this.hass.themes.default_theme;

    return html`
      <ha-settings-row .narrow=${this.narrow} ?empty=${!this.showThemePicker}>
        ${this.heading
          ? html`<span slot="heading">${this.heading}</span>`
          : nothing}
        ${this.description
          ? html`<span slot="description">${this.description}</span>`
          : nothing}
        ${this.showThemePicker
          ? html`
              <ha-theme-picker
                .label=${this.labels?.theme}
                .noThemeLabel=${this.labels?.noTheme}
                .value=${themeSettings?.theme || undefined}
                .disabled=${this.themePickerDisabled}
                ?include-default=${this.includeDefault}
                @value-changed=${this._handleThemeSelection}
              ></ha-theme-picker>
            `
          : nothing}
      </ha-settings-row>
      ${curTheme === HOME_ASSISTANT_THEME ||
      (curThemeIsUseDefault &&
        this.hass.themes.default_dark_theme &&
        this.hass.themes.default_theme) ||
      this._supportsModeSelection(curTheme)
        ? html`<ha-settings-row .narrow=${this.narrow}>
            <span slot="heading">${this.labels?.mode ?? "Theme mode"}</span>
            <ha-radio-group
              @change=${this._handleDarkMode}
              name="dark_mode"
              .value=${themeSettings?.dark === undefined
                ? "auto"
                : themeSettings.dark
                  ? "dark"
                  : "light"}
              orientation="horizontal"
            >
              <ha-radio-option value="auto">
                ${this.labels?.autoMode ?? "Auto"}
              </ha-radio-option>
              <ha-radio-option value="light">
                ${this.labels?.lightMode ?? "Light"}
              </ha-radio-option>
              <ha-radio-option value="dark">
                ${this.labels?.darkMode ?? "Dark"}
              </ha-radio-option>
            </ha-radio-group>
          </ha-settings-row>`
        : nothing}
      ${curTheme === HOME_ASSISTANT_THEME
        ? html`<ha-settings-row .narrow=${this.narrow} class="color-row">
              <span slot="heading"
                >${this.labels?.colors ?? "Custom colors"}</span
              >
              <div class="color-pickers">
                <ha-input
                  .value=${themeSettings?.primaryColor || DefaultPrimaryColor}
                  type="color"
                  .label=${this.labels?.primaryColor ?? "Primary color"}
                  .name=${"primaryColor"}
                  @change=${this._handleColorChange}
                ></ha-input>
                <ha-input
                  .value=${themeSettings?.accentColor || DefaultAccentColor}
                  type="color"
                  .label=${this.labels?.accentColor ?? "Accent color"}
                  .name=${"accentColor"}
                  @change=${this._handleColorChange}
                ></ha-input>
              </div>
            </ha-settings-row>
            ${themeSettings?.primaryColor || themeSettings?.accentColor
              ? html`<div class="reset-row">
                  <ha-button
                    appearance="plain"
                    size="s"
                    @click=${this._resetColors}
                  >
                    ${this.labels?.reset ?? "Reset"}
                  </ha-button>
                </div>`
              : nothing}`
        : nothing}
    `;
  }

  private _handleColorChange(ev: Event) {
    const target = ev.currentTarget as HTMLInputElement;
    const value =
      target.name === "primaryColor"
        ? normalizeLuminance(target.value)
        : target.value;

    target.value = value;
    fireEvent(this, "theme-settings-changed", {
      [target.name]: value,
    } as Partial<ThemeSettings>);
  }

  private _resetColors() {
    fireEvent(this, "theme-settings-changed", {
      primaryColor: undefined,
      accentColor: undefined,
    });
  }

  private _supportsModeSelection(themeName: string): boolean {
    const theme = this.hass.themes.themes[themeName];
    if (!theme) {
      return false;
    }

    return !!(theme.modes && "light" in theme.modes && "dark" in theme.modes);
  }

  private _handleDarkMode(ev: Event) {
    let dark: boolean | undefined;
    switch ((ev.currentTarget as HaRadioGroup).value) {
      case "light":
        dark = false;
        break;
      case "dark":
        dark = true;
        break;
    }
    fireEvent(this, "theme-settings-changed", { dark });
  }

  private _handleThemeSelection(
    ev: ValueChangedEvent<string | undefined>
  ): void {
    ev.stopPropagation();
    const theme = ev.detail.value;

    if (theme === undefined) {
      if (this.selectedTheme?.theme || this.hass.selectedTheme?.theme) {
        fireEvent(this, "theme-settings-changed", {
          theme: "",
          primaryColor: undefined,
          accentColor: undefined,
        });
      }
      return;
    }

    if (theme === (this.selectedTheme ?? this.hass.selectedTheme)?.theme) {
      return;
    }

    fireEvent(this, "theme-settings-changed", {
      theme,
      primaryColor: undefined,
      accentColor: undefined,
    });
  }

  static styles = css`
    a {
      color: var(--primary-color);
    }
    ha-settings-row.color-row {
      --settings-row-content-width: 100%;
    }
    ha-radio-group {
      display: flex;
      justify-content: center;
    }
    .color-pickers {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      width: 100%;
      gap: var(--ha-space-1);
    }
    ha-input {
      min-width: 75px;
      flex: 1;
    }
    .reset-row {
      display: flex;
      justify-content: flex-end;
      padding-inline-end: var(--ha-space-4);
      padding-bottom: var(--ha-space-4);
    }
    ha-theme-picker {
      display: block;
      width: 100%;
    }
  `;
}

declare global {
  interface HASSDomEvents {
    "theme-settings-changed": Partial<ThemeSettings>;
  }

  interface HTMLElementTagNameMap {
    "ha-theme-settings": HaThemeSettings;
  }
}
