import type { ContextType } from "@lit/context";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { cssColorToHex } from "../common/color/hex";
import { normalizeLuminance } from "../common/color/palette";
import { consume } from "../common/decorators/consume";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import { uiContext } from "../data/context";
import {
  getThemeModeSupport,
  getThemeVariables,
  themeDefinesColor,
  type Theme,
  type ThemeModeSupport,
} from "../data/ws-themes";
import {
  DefaultAccentColor,
  DefaultPrimaryColor,
} from "../resources/theme/color/color.globals";
import type { ThemeSettings, ValueChangedEvent } from "../types";
import "./ha-button";
import "./item/ha-list-item-base";
import "./list/ha-list-base";
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
  @state()
  @consume({ context: uiContext, subscribe: true })
  private _ui!: ContextType<typeof uiContext>;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @property({ attribute: false }) public selectedTheme?: ThemeSettings | null;

  @property({ attribute: false }) public labels?: ThemeSettingsLabels;

  @property({ attribute: false }) public description?: TemplateResult | string;

  @property() public heading?: string;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "include-default", type: Boolean })
  public includeDefault = false;

  @property({ attribute: "show-theme-picker", type: Boolean })
  public showThemePicker = true;

  @property({ attribute: "theme-picker-disabled", type: Boolean })
  public themePickerDisabled = false;

  protected render(): TemplateResult {
    const themeSettings = this.selectedTheme ?? this._ui.selectedTheme;
    const curThemeIsUseDefault = themeSettings?.theme === "";
    const curTheme = themeSettings?.theme
      ? themeSettings.theme
      : this._ui.themes.darkMode
        ? this._ui.themes.default_dark_theme || this._ui.themes.default_theme
        : this._ui.themes.default_theme;

    const customTheme =
      curTheme && curTheme !== HOME_ASSISTANT_THEME
        ? this._ui.themes.themes[curTheme]
        : undefined;
    const showThemeOptions = curTheme === HOME_ASSISTANT_THEME || !!customTheme;

    // With "use default theme", the mode picks the default light or dark theme.
    const modeSupport: ThemeModeSupport =
      !customTheme ||
      (curThemeIsUseDefault &&
        this._ui.themes.default_dark_theme &&
        this._ui.themes.default_theme)
        ? "both"
        : getThemeModeSupport(customTheme);

    const themeColors = this._themeColors(
      customTheme,
      this._ui.themes.darkMode
    );
    const primaryColorLocked = themeColors.primary !== undefined;
    const accentColorLocked = themeColors.accent !== undefined;
    const showReset =
      (!!themeSettings?.primaryColor && !primaryColorLocked) ||
      (!!themeSettings?.accentColor && !accentColorLocked);

    return html`
      <ha-list-base>
        ${
          this.showThemePicker
            ? html`
                <ha-list-item-base>
                  ${
                    this.heading
                      ? html`<span slot="headline">${this.heading}</span>`
                      : nothing
                  }
                  ${
                    this.description
                      ? html`<span slot="supporting-text"
                          >${this.description}</span
                        >`
                      : nothing
                  }
                  <ha-theme-picker
                    slot="end"
                    .label=${this.labels?.theme}
                    .noThemeLabel=${this.labels?.noTheme}
                    .value=${themeSettings?.theme || undefined}
                    .disabled=${this.themePickerDisabled}
                    ?include-default=${this.includeDefault}
                    @value-changed=${this._handleThemeSelection}
                  ></ha-theme-picker>
                </ha-list-item-base>
              `
            : nothing
        }
        ${
          showThemeOptions
            ? html`
                <ha-list-item-base
                  class="set-by-theme"
                  wrap-supporting-text
                  .supportingText=${
                    modeSupport !== "both"
                      ? this._localize(
                          `ui.panel.profile.themes.mode_set_by_theme.${modeSupport}`,
                          { theme: curTheme }
                        )
                      : undefined
                  }
                >
                  <span slot="headline"
                    >${this.labels?.mode ?? "Theme mode"}</span
                  >
                  <ha-radio-group
                    slot="end"
                    @change=${this._handleDarkMode}
                    name="dark_mode"
                    .value=${this._modeValue(modeSupport, themeSettings?.dark)}
                    .disabled=${modeSupport !== "both"}
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
                </ha-list-item-base>
              `
            : nothing
        }
        ${
          showThemeOptions
            ? html`
                <ha-list-item-base
                  class="set-by-theme"
                  wrap-supporting-text
                  .supportingText=${
                    primaryColorLocked || accentColorLocked
                      ? this._localize(
                          `ui.panel.profile.themes.colors_set_by_theme.${
                            primaryColorLocked && accentColorLocked
                              ? "both"
                              : primaryColorLocked
                                ? "primary"
                                : "accent"
                          }`,
                          { theme: curTheme }
                        )
                      : undefined
                  }
                >
                  <span slot="headline"
                    >${this.labels?.colors ?? "Custom colors"}</span
                  >
                  <div slot="end" class="color-pickers">
                    <ha-input
                      .value=${
                        themeColors.primary ??
                        (themeSettings?.primaryColor || DefaultPrimaryColor)
                      }
                      type="color"
                      .label=${this.labels?.primaryColor ?? "Primary color"}
                      .name=${"primaryColor"}
                      .disabled=${primaryColorLocked}
                      @change=${this._handleColorChange}
                    ></ha-input>
                    <ha-input
                      .value=${
                        themeColors.accent ??
                        (themeSettings?.accentColor || DefaultAccentColor)
                      }
                      type="color"
                      .label=${this.labels?.accentColor ?? "Accent color"}
                      .name=${"accentColor"}
                      .disabled=${accentColorLocked}
                      @change=${this._handleColorChange}
                    ></ha-input>
                  </div>
                </ha-list-item-base>
                ${
                  showReset
                    ? html`
                        <div class="reset-row">
                          <ha-button
                            appearance="plain"
                            size="s"
                            @click=${this._resetColors}
                          >
                            ${this.labels?.reset ?? "Reset"}
                          </ha-button>
                        </div>
                      `
                    : nothing
                }
              `
            : nothing
        }
      </ha-list-base>
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

  private _modeValue(
    modeSupport: ThemeModeSupport,
    dark: boolean | undefined
  ): string {
    switch (modeSupport) {
      case "light":
      case "dark":
        return modeSupport;
      case "none":
        // The theme has fixed colors, so neither light nor dark is accurate.
        return "";
      default:
        return dark === undefined ? "auto" : dark ? "dark" : "light";
    }
  }

  /** Colors the theme sets itself, `undefined` when the user can pick them. */
  private _themeColors = memoizeOne(
    (
      theme: Theme | undefined,
      darkMode: boolean
    ): { primary?: string; accent?: string } => {
      if (!theme) {
        return {};
      }
      const variables = getThemeVariables(theme, darkMode);
      const toHex = (value: string | undefined, fallback: string) =>
        (value && cssColorToHex(value)) || fallback;
      return {
        primary: themeDefinesColor(variables, "primary")
          ? toHex(
              // A theme that only sets the palette uses its base step as primary
              variables["primary-color"] ?? variables["ha-color-primary-40"],
              DefaultPrimaryColor
            )
          : undefined,
        accent: themeDefinesColor(variables, "accent")
          ? toHex(variables["accent-color"], DefaultAccentColor)
          : undefined,
      };
    }
  );

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
      if (this.selectedTheme?.theme || this._ui.selectedTheme?.theme) {
        fireEvent(this, "theme-settings-changed", {
          theme: "",
          primaryColor: undefined,
          accentColor: undefined,
        });
      }
      return;
    }

    if (theme === (this.selectedTheme ?? this._ui.selectedTheme)?.theme) {
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
    ha-list-base {
      --ha-row-item-padding-block: var(--ha-space-2);
    }
    ha-theme-picker {
      min-width: 150px;
    }
    .set-by-theme::part(supporting-text) {
      color: var(--ha-color-text-secondary);
    }
    .color-pickers {
      display: flex;
      gap: var(--ha-space-2);
    }
    .color-pickers ha-input {
      min-width: 150px;
      flex: 1;
    }
    :host([narrow]) ha-list-item-base::part(base) {
      flex-direction: column;
      align-items: flex-start;
    }
    :host([narrow]) ha-list-item-base::part(end) {
      width: 100%;
    }
    :host([narrow]) .color-pickers {
      width: 100%;
    }
    .reset-row {
      display: flex;
      justify-content: flex-end;
      padding-inline-end: var(--ha-space-4);
      padding-bottom: var(--ha-space-4);
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
