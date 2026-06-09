import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent, type HASSDomEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-settings-row";
import "../../components/ha-theme-settings";
import {
  saveThemePreferences,
  subscribeThemePreferences,
} from "../../data/theme";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import type { HomeAssistant, ThemeSettings } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import { clearSelectedThemeState } from "../../util/ha-pref-storage";

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

    const localTheme = this._getLocalTheme();
    const showMigration =
      this._userTheme !== undefined &&
      this._userTheme === null &&
      localTheme !== null;

    return html`
      <ha-theme-settings
        .hass=${this.hass}
        .selectedTheme=${this.hass.selectedTheme}
        .narrow=${this.narrow}
        .heading=${this.hass.localize("ui.panel.profile.themes.header")}
        .description=${html`
          ${!hasThemes
            ? this.hass.localize("ui.panel.profile.themes.error_no_theme")
            : nothing}
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
        `}
        .labels=${{
          theme: this.hass.localize("ui.panel.profile.themes.dropdown_label"),
          noTheme: this.hass.localize("ui.panel.profile.themes.use_default"),
          mode: this.hass.localize("ui.panel.profile.themes.theme_mode"),
          autoMode: this.hass.localize(
            "ui.panel.profile.themes.dark_mode.auto"
          ),
          lightMode: this.hass.localize(
            "ui.panel.profile.themes.dark_mode.light"
          ),
          darkMode: this.hass.localize(
            "ui.panel.profile.themes.dark_mode.dark"
          ),
          colors: this.hass.localize("ui.panel.profile.themes.colors"),
          primaryColor: this.hass.localize(
            "ui.panel.profile.themes.primary_color"
          ),
          accentColor: this.hass.localize(
            "ui.panel.profile.themes.accent_color"
          ),
          reset: this.hass.localize("ui.panel.profile.themes.reset"),
        }}
        .themePickerDisabled=${!hasThemes}
        include-default
        @theme-settings-changed=${this._themeSettingsChanged}
      ></ha-theme-settings>
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
                size="s"
                .disabled=${this._migrating}
                @click=${this._migrateThemePreferences}
              >
                ${this.hass.localize("ui.panel.profile.themes.migrate_button")}
              </ha-button>
            </ha-settings-row>
          `
        : nothing}
    `;
  }

  private _themeSettingsChanged(ev: HASSDomEvent<Partial<ThemeSettings>>) {
    fireEvent(this, "settheme", ev.detail);
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-theme-row": HaPickThemeRow;
  }
}
