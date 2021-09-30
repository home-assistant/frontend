import "@material/mwc-button/mwc-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-formfield";
import "../../components/ha-paper-dropdown-menu";
import "../../components/ha-radio";
import type { HaRadio } from "../../components/ha-radio";
import "../../components/ha-settings-row";
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_ACCENT_COLOR,
} from "../../resources/ha-style";
import { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";

@customElement("ha-pick-theme-row")
export class HaPickThemeRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() _themeNames: string[] = [];

  protected render(): TemplateResult {
    const hasThemes =
      this.hass.themes.themes && Object.keys(this.hass.themes.themes).length;
    const curTheme =
      this.hass.selectedTheme?.theme || this.hass.themes.darkMode
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
        <ha-paper-dropdown-menu
          .label=${this.hass.localize("ui.panel.profile.themes.dropdown_label")}
          dynamic-align
          .disabled=${!hasThemes}
        >
          <paper-listbox
            slot="dropdown-content"
            .selected=${this.hass.selectedTheme?.theme || "Backend-selected"}
            attr-for-selected="theme"
            @iron-select=${this._handleThemeSelection}
          >
            ${this._themeNames.map(
              (theme) => html`<paper-item .theme=${theme}>${theme}</paper-item>`
            )}
          </paper-listbox>
        </ha-paper-dropdown-menu>
      </ha-settings-row>
      ${curTheme === "default" || this._supportsModeSelection(curTheme)
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
                ?checked=${themeSettings?.dark === undefined}
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
                ?checked=${themeSettings?.dark === false}
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
                ?checked=${themeSettings?.dark === true}
              >
              </ha-radio>
            </ha-formfield>
            ${curTheme === "default"
              ? html` <div class="color-pickers">
                  <paper-input
                    .value=${themeSettings?.primaryColor ||
                    DEFAULT_PRIMARY_COLOR}
                    type="color"
                    .label=${this.hass.localize(
                      "ui.panel.profile.themes.primary_color"
                    )}
                    .name=${"primaryColor"}
                    @change=${this._handleColorChange}
                  ></paper-input>
                  <paper-input
                    .value=${themeSettings?.accentColor || DEFAULT_ACCENT_COLOR}
                    type="color"
                    .label=${this.hass.localize(
                      "ui.panel.profile.themes.accent_color"
                    )}
                    .name=${"accentColor"}
                    @change=${this._handleColorChange}
                  ></paper-input>
                  ${themeSettings?.primaryColor || themeSettings?.accentColor
                    ? html` <mwc-button @click=${this._resetColors}>
                        ${this.hass.localize("ui.panel.profile.themes.reset")}
                      </mwc-button>`
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
      this._themeNames = ["Backend-selected", "default"].concat(
        Object.keys(this.hass.themes.themes).sort()
      );
    }
  }

  private _handleColorChange(ev: CustomEvent) {
    const target = ev.target as any;
    fireEvent(this, "settheme", { [target.name]: target.value });
  }

  private _resetColors() {
    fireEvent(this, "settheme", {
      primaryColor: undefined,
      accentColor: undefined,
    });
  }

  private _supportsModeSelection(themeName: string): boolean {
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
    fireEvent(this, "settheme", { dark });
  }

  private _handleThemeSelection(ev: CustomEvent) {
    const theme = ev.detail.item.theme;
    if (theme === "Backend-selected") {
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

  static get styles(): CSSResultGroup {
    return css`
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
      paper-input {
        min-width: 75px;
        flex-grow: 1;
        margin: 0 4px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-theme-row": HaPickThemeRow;
  }
}
