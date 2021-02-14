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
    settheme: HASSDomEvent<Partial<HomeAssistant["selectedThemeSettings"]>>;
  }
  interface HASSDomEvents {
    settheme: Partial<HomeAssistant["selectedThemeSettings"]>;
  }
}

const mql = matchMedia("(prefers-color-scheme: dark)");

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("settheme", (ev) => {
        this._updateHass({
          selectedThemeSettings: {
            ...this.hass!.selectedThemeSettings!,
            ...ev.detail,
          },
        });
        this._applyTheme(mql.matches);
        storeState(this.hass!);
      });
      mql.addListener((ev) => this._applyTheme(ev.matches));
    }

    protected hassConnected() {
      super.hassConnected();

      subscribeThemes(this.hass!.connection, (themes) => {
        this._updateHass({ themes });
        invalidateThemeCache();
        this._applyTheme(mql.matches);
      });
    }

    private _applyTheme(darkPreferred: boolean) {
      if (!this.hass) {
        return;
      }
      const themeName =
        this.hass.selectedThemeSettings?.theme ||
        (darkPreferred && this.hass.themes.default_dark_theme
          ? this.hass.themes.default_dark_theme!
          : this.hass.themes.default_theme);

      let settings: Partial<HomeAssistant["selectedThemeSettings"]> = this.hass!
        .selectedThemeSettings;

      let darkMode =
        settings?.dark === undefined ? darkPreferred : settings?.dark;

      const selectedTheme =
        settings?.theme !== undefined
          ? this.hass.themes.themes[settings.theme]
          : undefined;

      if (selectedTheme) {
        // Override dark mode selection depending on what the theme actually provides.
        // Leave the selection as-is if the theme can provide the requested style.
        if (darkMode && !selectedTheme.dark) {
          darkMode = false;
        } else if (!darkMode && !selectedTheme.light && selectedTheme.dark) {
          darkMode = true;
        }
      }

      settings = { ...this.hass.selectedThemeSettings, dark: darkMode };

      applyThemesOnElement(
        document.documentElement,
        this.hass.themes,
        themeName,
        settings
      );

      // Now determine value that should be stored in the local storage settings
      darkMode =
        darkMode || !!(darkPreferred && this.hass.themes.default_dark_theme);

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

      document.documentElement.style.backgroundColor = computedStyles.getPropertyValue(
        "--primary-background-color"
      );

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
    }
  };
