import {
  applyThemesOnElement,
  invalidateThemeCache,
} from "../common/dom/apply_themes_on_element";
import type { HASSDomEvent } from "../common/dom/fire_event";
import {
  fetchSelectedTheme,
  saveSelectedTheme,
  SELECTED_THEME_KEY,
  subscribeSelectedTheme,
  subscribeThemes,
} from "../data/ws-themes";
import type { Constructor, HomeAssistant, ThemeSettings } from "../types";
import { clearStateKey, storeState } from "../util/ha-pref-storage";
import type { HassBaseEl } from "./hass-base-mixin";

export type StorageLocation = "user" | "browser";

interface SetThemeSettings {
  settings: ThemeSettings;
  storageLocation: StorageLocation;
  saveHass: boolean;
}

declare global {
  // for add event listener
  interface HTMLElementEventMap {
    settheme: HASSDomEvent<SetThemeSettings>;
  }
  interface HASSDomEvents {
    settheme: SetThemeSettings;
    resetBrowserTheme: undefined;
  }

  interface FrontendUserData {
    selectedTheme?: ThemeSettings;
  }
}

const mql = matchMedia("(prefers-color-scheme: dark)");

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    private _themeApplied = false;

    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("settheme", (ev) => {
        if (ev.detail.saveHass) {
          this._updateHass({
            selectedTheme: ev.detail.settings,
            browserThemeEnabled: ev.detail.storageLocation === "browser",
          });
          this._applyTheme(mql.matches);
        }

        if (ev.detail.storageLocation === "browser") {
          storeState(this.hass!);
        } else {
          if (ev.detail.saveHass) {
            clearStateKey(SELECTED_THEME_KEY);
          }
          saveSelectedTheme(this.hass!, ev.detail.settings);
        }
      });

      this.addEventListener("resetBrowserTheme", async () => {
        clearStateKey(SELECTED_THEME_KEY);
        const selectedTheme = await fetchSelectedTheme(this.hass!);
        this._updateHass({
          selectedTheme,
          browserThemeEnabled: false,
        });
        this._applyTheme(mql.matches);
      });

      mql.addEventListener("change", (ev) => this._applyTheme(ev.matches));

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

      subscribeSelectedTheme(
        this.hass!,
        (selectedTheme?: ThemeSettings | null) => {
          if (
            !window.localStorage.getItem(SELECTED_THEME_KEY) &&
            selectedTheme
          ) {
            this._themeApplied = true;
            this._updateHass({
              selectedTheme,
              browserThemeEnabled: false,
            });
            this._applyTheme(mql.matches);
          }
        }
      );
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

      let darkMode =
        themeSettings?.dark === undefined ? darkPreferred : themeSettings.dark;

      const themeName =
        themeSettings?.theme ||
        (darkMode && this.hass.themes.default_dark_theme
          ? this.hass.themes.default_dark_theme
          : this.hass.themes.default_theme);

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
      const themeMetaColor =
        computedStyles.getPropertyValue("--app-theme-color");

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
          themeMetaColor?.trim() ||
          (themeMeta.getAttribute("default-content") as string);
        themeMeta.setAttribute("content", themeColor);
      }

      this.hass!.auth.external?.fireMessage({ type: "theme-update" });
    }
  };
