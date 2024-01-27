import {
  applyThemesOnElement,
  invalidateThemeCache,
} from "../common/dom/apply_themes_on_element";
import { HASSDomEvent } from "../common/dom/fire_event";
import { subscribeThemes } from "../data/ws-themes";
import { Constructor, HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";
import { HassBaseEl } from "./hass-base-mixin";

declare global {
  // for add event listener
  interface HTMLElementEventMap {
    settheme: HASSDomEvent<Partial<HomeAssistant["selectedTheme"]>>;
  }
  interface HASSDomEvents {
    settheme: Partial<HomeAssistant["selectedTheme"]>;
  }
}

const mql = matchMedia("(prefers-color-scheme: dark)");

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    private _themeApplied = false;

    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("settheme", (ev) => {
        this._updateHass({
          selectedTheme: {
            ...this.hass!.selectedTheme!,
            ...ev.detail,
          },
        });
        this._applyTheme(mql.matches);
        storeState(this.hass!);
      });
      mql.addListener((ev) => this._applyTheme(ev.matches));
      if (!this._themeApplied && mql.matches) {
        applyThemesOnElement(
          document.documentElement,
          {
            default_theme: "default",
            default_dark_theme: null,
            themes: {},
            darkMode: true,
            theme: "default",
          },
          undefined,
          undefined,
          true
        );
      }
    }

    protected hassConnected() {
      super.hassConnected();

      subscribeThemes(this.hass!.connection, (themes) => {
        this._themeApplied = true;
        this._updateHass({ themes });
        invalidateThemeCache();
        this._applyTheme(mql.matches);
      });
    }

    private _applyTheme(darkPreferred: boolean) {
      if (!this.hass) {
        return;
      }

      let themeSettings: Partial<HomeAssistant["selectedTheme"]> =
        this.hass.config.recovery_mode || this.hass.config.safe_mode
          ? {
              ...this.hass.selectedTheme,
              theme: "default",
              primaryColor: this.hass.config.recovery_mode
                ? "#db4437"
                : "#e48629",
              accentColor: this.hass.config.recovery_mode
                ? "#ffca28"
                : "#db4437",
            }
          : this.hass.selectedTheme;

      const themeName =
        themeSettings?.theme ||
        (darkPreferred && this.hass.themes.default_dark_theme
          ? this.hass.themes.default_dark_theme
          : this.hass.themes.default_theme);

      let darkMode =
        themeSettings?.dark === undefined ? darkPreferred : themeSettings.dark;

      const selectedTheme = themeName
        ? this.hass.themes.themes[themeName]
        : undefined;

      if (selectedTheme && darkMode && !selectedTheme.modes) {
        darkMode = false;
      }

      themeSettings = { ...themeSettings, dark: darkMode };
      this._updateHass({
        themes: { ...this.hass.themes!, theme: themeName },
      });

      applyThemesOnElement(
        document.documentElement,
        this.hass.themes,
        themeName,
        themeSettings,
        true
      );

      if (darkMode !== this.hass.themes.darkMode) {
        this._updateHass({
          themes: { ...this.hass.themes!, darkMode },
        });

        const schemeMeta = document.querySelector("meta[name=color-scheme]");
        if (schemeMeta) {
          schemeMeta.setAttribute(
            "content",
            darkMode ? "dark" : themeName === "default" ? "light" : "dark light"
          );
        }
      }

      const themeMeta = document.querySelector("meta[name=theme-color]");
      const computedStyles = getComputedStyle(document.documentElement);
      const headerColor = computedStyles.getPropertyValue(
        "--app-header-background-color"
      );

      document.documentElement.style.backgroundColor =
        computedStyles.getPropertyValue("--primary-background-color");

      if (themeMeta) {
        if (!themeMeta.hasAttribute("default-content")) {
          themeMeta.setAttribute(
            "default-content",
            themeMeta.getAttribute("content")!
          );
        }
        const themeColor =
          headerColor?.trim() ||
          (themeMeta.getAttribute("default-content") as string);
        themeMeta.setAttribute("content", themeColor);
      }

      this.hass!.auth.external?.fireMessage({ type: "theme-update" });
    }
  };
