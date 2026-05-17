import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { normalizeLuminance } from "../../common/color/palette";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-settings-row";
import "../../components/ha-theme-picker";
import "../../components/input/ha-input";
import "../../components/radio/ha-radio-group";
import type { HaRadioGroup } from "../../components/radio/ha-radio-group";
import "../../components/radio/ha-radio-option";
import {
  saveThemePreferences,
  subscribeThemePreferences,
} from "../../data/theme";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import {
  DefaultAccentColor,
  DefaultPrimaryColor,
} from "../../resources/theme/color/color.globals";
import type {
  HomeAssistant,
  ThemeSettings,
  ValueChangedEvent,
} from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import { clearSelectedThemeState } from "../../util/ha-pref-storage";

const HOME_ASSISTANT_THEME = "default";

@customElement("ha-pick-theme-row")
export class HaPickThemeRow extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _userTheme?: ThemeSettings | null;

  @state() private _migrating = false;

  protected hassSubscribe() {
    return [
      subscribeThemePreferences(this.hass, ({ value }) => {
        this._userTheme = value;
      }).catch(() => {
        this._userTheme = undefined;
        return () => undefined;
      }),
    ];
  }

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
    const localTheme = this._getLocalTheme();
    const showMigration =
      this._userTheme !== undefined &&
      this._userTheme === null &&
      localTheme !== null;

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
        <ha-theme-picker
          .hass=${this.hass}
          .label=${this.hass.localize("ui.panel.profile.themes.dropdown_label")}
          .noThemeLabel=${this.hass.localize(
            "ui.panel.profile.themes.use_default"
          )}
          .value=${this.hass.selectedTheme?.theme || undefined}
          .disabled=${!hasThemes}
          include-default
          @value-changed=${this._handleThemeSelection}
        ></ha-theme-picker>
      </ha-settings-row>
      ${curTheme === HOME_ASSISTANT_THEME ||
      (curThemeIsUseDefault &&
        this.hass.themes.default_dark_theme &&
        this.hass.themes.default_theme) ||
      this._supportsModeSelection(curTheme)
        ? html`<div class="inputs">
            <ha-radio-group
              @change=${this._handleDarkMode}
              name="dark_mode"
              .ariaLabel=${this.hass.localize(
                "ui.panel.profile.themes.theme_mode"
              )}
              .value=${themeSettings?.dark === undefined
                ? "auto"
                : themeSettings.dark
                  ? "dark"
                  : "light"}
              orientation="horizontal"
            >
              <ha-radio-option value="auto">
                ${this.hass.localize("ui.panel.profile.themes.dark_mode.auto")}
              </ha-radio-option>
              <ha-radio-option value="light">
                ${this.hass.localize("ui.panel.profile.themes.dark_mode.light")}
              </ha-radio-option>
              <ha-radio-option value="dark">
                ${this.hass.localize("ui.panel.profile.themes.dark_mode.dark")}
              </ha-radio-option>
            </ha-radio-group>
            ${curTheme === HOME_ASSISTANT_THEME
              ? html`<div class="color-pickers">
                  <ha-input
                    .value=${themeSettings?.primaryColor || DefaultPrimaryColor}
                    type="color"
                    .label=${this.hass.localize(
                      "ui.panel.profile.themes.primary_color"
                    )}
                    .name=${"primaryColor"}
                    @change=${this._handleColorChange}
                  ></ha-input>
                  <ha-input
                    .value=${themeSettings?.accentColor || DefaultAccentColor}
                    type="color"
                    .label=${this.hass.localize(
                      "ui.panel.profile.themes.accent_color"
                    )}
                    .name=${"accentColor"}
                    @change=${this._handleColorChange}
                  ></ha-input>
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
      ${showMigration
        ? html`
            <ha-settings-row .narrow=${this.narrow}>
              <span slot="heading">
                ${this.hass.localize("ui.panel.profile.themes.migrate_header")}
              </span>
              <span slot="description">
                ${this.hass.localize(
                  "ui.panel.profile.themes.migrate_description"
                )}
              </span>
              <ha-button
                appearance="plain"
                size="small"
                .disabled=${this._migrating}
                @click=${this._migrateThemePreferences}
              >
                ${this.hass.localize("ui.panel.profile.themes.migrate_button")}
              </ha-button>
            </ha-settings-row>
          `
        : ""}
    `;
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
    fireEvent(this, "settheme", { dark });
  }

  private _handleThemeSelection(
    ev: ValueChangedEvent<string | undefined>
  ): void {
    ev.stopPropagation();
    const theme = ev.detail.value; // undefined = "use default"

    if (theme === undefined) {
      if (this.hass.selectedTheme?.theme) {
        fireEvent(this, "settheme", {
          theme: "",
          primaryColor: undefined,
          accentColor: undefined,
        });
      }
      return;
    }

    if (theme === this.hass.selectedTheme?.theme) {
      return;
    }

    fireEvent(this, "settheme", {
      theme,
      primaryColor: undefined,
      accentColor: undefined,
    });
  }

  private _getLocalTheme(): ThemeSettings | null {
    return this.hass.selectedTheme ?? null;
  }

  private async _migrateThemePreferences() {
    const localTheme = this._getLocalTheme();
    if (!localTheme) {
      return;
    }
    this._migrating = true;
    try {
      await saveThemePreferences(this.hass, localTheme);
      clearSelectedThemeState();
      fireEvent(this, "hass-notification", {
        message: this.hass.localize("ui.panel.profile.themes.migrate_success"),
      });
    } catch (_err: any) {
      fireEvent(this, "hass-notification", {
        message: this.hass.localize("ui.panel.profile.themes.migrate_failed"),
      });
    } finally {
      this._migrating = false;
    }
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
    ha-radio-group {
      display: flex;
      justify-content: center;
      margin-inline-end: var(--ha-space-3);
    }
    .color-pickers {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      flex-grow: 1;
    }
    ha-input {
      min-width: 75px;
      flex-grow: 1;
      margin: 0 4px;
    }

    ha-theme-picker {
      display: block;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-theme-row": HaPickThemeRow;
  }
}
