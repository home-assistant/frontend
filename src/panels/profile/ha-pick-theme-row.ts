import "@material/mwc-button/mwc-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResult,
  customElement,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from "lit-element";
import { html, TemplateResult } from "lit-html";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-formfield";
import "../../components/ha-paper-dropdown-menu";
import "../../components/ha-radio";
import type { HaRadio } from "../../components/ha-radio";
import "../../components/ha-settings-row";
import { Theme } from "../../data/ws-themes";
import { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";

@customElement("ha-pick-theme-row")
export class HaPickThemeRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @internalProperty() _themeNames: string[] = [];

  @internalProperty() _selectedThemeIndex = 0;

  @internalProperty() _selectedTheme?: Theme;

  protected render(): TemplateResult {
    const hasThemes =
      this.hass.themes?.themes && Object.keys(this.hass.themes.themes).length;
    const curTheme =
      this.hass!.selectedTheme?.theme || this.hass!.themes.default_theme;
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
            href="${documentationUrl(
              this.hass!,
              "/integrations/frontend/#defining-themes"
            )}"
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
            .selected=${this._selectedThemeIndex}
            @iron-select=${this._handleThemeSelection}
          >
            ${this._themeNames.map(
              (theme) => html`<paper-item .theme=${theme}>${theme}</paper-item>`
            )}
          </paper-listbox>
        </ha-paper-dropdown-menu>
      </ha-settings-row>
      ${curTheme === "default" ||
      (this._selectedTheme && this._supportsModeSelection(this._selectedTheme))
        ? html` <div class="inputs">
            <ha-formfield
              .label=${this.hass!.localize(
                "ui.panel.profile.themes.dark_mode.auto"
              )}
            >
              <ha-radio
                @change=${this._handleDarkMode}
                name="dark_mode"
                value="auto"
                ?checked=${this.hass.selectedTheme?.dark === undefined}
              ></ha-radio>
            </ha-formfield>
            <ha-formfield
              .label=${this.hass!.localize(
                "ui.panel.profile.themes.dark_mode.light"
              )}
            >
              <ha-radio
                @change=${this._handleDarkMode}
                name="dark_mode"
                value="light"
                ?checked=${this.hass.selectedTheme?.dark === false}
              >
              </ha-radio>
            </ha-formfield>
            <ha-formfield
              .label=${this.hass!.localize(
                "ui.panel.profile.themes.dark_mode.dark"
              )}
            >
              <ha-radio
                @change=${this._handleDarkMode}
                name="dark_mode"
                value="dark"
                ?checked=${this.hass.selectedTheme?.dark === true}
              >
              </ha-radio>
            </ha-formfield>
            ${curTheme === "default"
              ? html` <div class="color-pickers">
                  <paper-input
                    .value=${this.hass!.selectedTheme?.primaryColor ||
                    "#03a9f4"}
                    type="color"
                    .label=${this.hass!.localize(
                      "ui.panel.profile.themes.primary_color"
                    )}
                    .name=${"primaryColor"}
                    @change=${this._handleColorChange}
                  ></paper-input>
                  <paper-input
                    .value=${this.hass!.selectedTheme?.accentColor || "#ff9800"}
                    type="color"
                    .label=${this.hass!.localize(
                      "ui.panel.profile.themes.accent_color"
                    )}
                    .name=${"accentColor"}
                    @change=${this._handleColorChange}
                  ></paper-input>
                  ${this.hass!.selectedTheme?.primaryColor ||
                  this.hass!.selectedTheme?.accentColor
                    ? html` <mwc-button @click=${this._resetColors}>
                        ${this.hass!.localize("ui.panel.profile.themes.reset")}
                      </mwc-button>`
                    : ""}
                </div>`
              : ""}
          </div>`
        : ""}
    `;
  }

  protected updated(changedProperties: PropertyValues) {
    const oldHass = changedProperties.get("hass") as undefined | HomeAssistant;
    const themesChanged =
      changedProperties.has("hass") &&
      (!oldHass || oldHass.themes?.themes !== this.hass.themes?.themes);
    const selectedThemeChanged =
      changedProperties.has("hass") &&
      (!oldHass || oldHass.selectedTheme !== this.hass.selectedTheme);

    if (themesChanged) {
      this._themeNames = ["Backend-selected", "default"].concat(
        Object.keys(this.hass.themes.themes).sort()
      );
    }

    if (selectedThemeChanged) {
      if (
        this.hass.selectedTheme &&
        this._themeNames.indexOf(this.hass.selectedTheme.theme) > 0
      ) {
        this._selectedThemeIndex = this._themeNames.indexOf(
          this.hass.selectedTheme.theme
        );
        this._selectedTheme = this.hass.themes.themes[
          this.hass.selectedTheme.theme
        ];
      } else if (!this.hass.selectedTheme) {
        this._selectedThemeIndex = 0;
      }
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

  private _supportsModeSelection(theme: Theme): boolean {
    return (
      theme && theme.styles !== undefined && theme.dark_styles !== undefined
    );
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
        fireEvent(this, "settheme", { theme: "" });
      }
      return;
    }
    fireEvent(this, "settheme", { theme });
  }

  static get styles(): CSSResult {
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
