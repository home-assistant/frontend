import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { normalizeLuminance } from "../../common/color/palette";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-formfield";
import "../../components/ha-list-item";
import "../../components/ha-radio";
import "../../components/ha-button";
import type { HaRadio } from "../../components/ha-radio";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import "../../components/ha-textfield";
import {
  DefaultAccentColor,
  DefaultPrimaryColor,
} from "../../resources/theme/color/color.globals";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";

const USE_DEFAULT_THEME = "__USE_DEFAULT_THEME__";
const HOME_ASSISTANT_THEME = "default";

@customElement("ha-pick-theme-row")
export class HaPickThemeRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() _themeNames: string[] = [];

  protected render(): TemplateResult {
    const hasThemes =
      this.hass.themes.themes && Object.keys(this.hass.themes.themes).length;

    const curThemeIsUseDefault = this.hass.selectedTheme?.theme === "";
    const curTheme = this.hass.selectedTheme?.theme
      ? this.hass.selectedTheme?.theme
      : this.hass.themes.darkMode
        ? this.hass.themes.default_dark_theme || this.hass.themes.default_theme
        : this.hass.themes.default_theme;

    const themeSettings = this.hass.selectedTheme;

    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading"
          >${this.hass.localize("ui.panel.profile.themes.header")}</span
        >
        <span slot="description">
          ${!hasThemes
            ? this.hass.localize("ui.panel.profile.themes.error_no_theme")
            : ""}
          <a
            href=${documentationUrl(
              this.hass,
              "/integrations/frontend/#defining-themes"
            )}
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize("ui.panel.profile.themes.link_promo")}
          </a>
        </span>
        <ha-select
          .label=${this.hass.localize("ui.panel.profile.themes.dropdown_label")}
          .disabled=${!hasThemes}
          .value=${this.hass.selectedTheme?.theme || USE_DEFAULT_THEME}
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
        ? html` <div class="inputs">
            <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.profile.themes.dark_mode.auto"
              )}
            >
              <ha-radio
                @change=${this._handleDarkMode}
                name="dark_mode"
                value="auto"
                .checked=${themeSettings?.dark === undefined}
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
                .checked=${themeSettings?.dark === false}
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
                .checked=${themeSettings?.dark === true}
              >
              </ha-radio>
            </ha-formfield>
            ${curTheme === HOME_ASSISTANT_THEME
              ? html`<div class="color-pickers">
                  <ha-textfield
                    .value=${themeSettings?.primaryColor || DefaultPrimaryColor}
                    type="color"
                    .label=${this.hass.localize(
                      "ui.panel.profile.themes.primary_color"
                    )}
                    .name=${"primaryColor"}
                    @change=${this._handleColorChange}
                  ></ha-textfield>
                  <ha-textfield
                    .value=${themeSettings?.accentColor || DefaultAccentColor}
                    type="color"
                    .label=${this.hass.localize(
                      "ui.panel.profile.themes.accent_color"
                    )}
                    .name=${"accentColor"}
                    @change=${this._handleColorChange}
                  ></ha-textfield>
                  ${themeSettings?.primaryColor || themeSettings?.accentColor
                    ? html` <ha-button
                        appearance="plain"
                        size="small"
                        @click=${this._resetColors}
                      >
                        ${this.hass.localize("ui.panel.profile.themes.reset")}
                      </ha-button>`
                    : ""}
                </div>`
              : ""}
          </div>`
        : ""}
    `;
  }

  public willUpdate(changedProperties: PropertyValues) {
    const oldHass = changedProperties.get("hass") as undefined | HomeAssistant;
    const themesChanged =
      changedProperties.has("hass") &&
      (!oldHass || oldHass.themes.themes !== this.hass.themes.themes);

    if (themesChanged) {
      this._themeNames = Object.keys(this.hass.themes.themes).sort();
    }
  }

  private _handleColorChange(ev: CustomEvent) {
    const target = ev.target as any;

    // normalize primary color if needed for contrast
    if (target.name === "primaryColor") {
      target.value = normalizeLuminance(target.value);
    }

    fireEvent(this, "settheme", { [target.name]: target.value });
  }

  private _resetColors() {
    fireEvent(this, "settheme", {
      primaryColor: undefined,
      accentColor: undefined,
    });
  }

  private _supportsModeSelection(themeName: string): boolean {
    const theme = this.hass.themes.themes[themeName];
    if (!theme) {
      return false; // User's theme no longer exists
    }

    return !!(theme.modes && "light" in theme.modes && "dark" in theme.modes);
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
    fireEvent(this, "settheme", { dark });
  }

  private _handleThemeSelection(ev) {
    const theme = ev.target.value;
    if (theme === this.hass.selectedTheme?.theme) {
      return;
    }

    if (theme === USE_DEFAULT_THEME) {
      if (this.hass.selectedTheme?.theme) {
        fireEvent(this, "settheme", {
          theme: "",
          primaryColor: undefined,
          accentColor: undefined,
        });
      }
      return;
    }
    fireEvent(this, "settheme", {
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-theme-row": HaPickThemeRow;
  }
}
