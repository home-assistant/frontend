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
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("settheme", (ev) => {
        this._updateHass({
          selectedTheme: { ...this.hass!.selectedTheme!, ...ev.detail },
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

    private _applyTheme(dark: boolean) {
      const themeName =
        this.hass!.selectedTheme?.theme ||
        (dark && this.hass!.themes.default_dark_theme
          ? this.hass!.themes.default_dark_theme!
          : this.hass!.themes.default_theme);

      let options: Partial<HomeAssistant["selectedTheme"]> = this.hass!
        .selectedTheme;

      if (themeName === "default" && options?.dark === undefined) {
        options = {
          ...this.hass!.selectedTheme!,
          dark,
        };
      }

      applyThemesOnElement(
        document.documentElement,
        this.hass!.themes,
        themeName,
        options
      );

      const darkMode =
        themeName === "default"
          ? !!options?.dark
          : !!(dark && this.hass!.themes.default_dark_theme);

      if (darkMode !== this.hass!.themes.darkMode) {
        this._updateHass({
          themes: { ...this.hass!.themes, darkMode },
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
      const headerColor = getComputedStyle(
        document.documentElement
      ).getPropertyValue("--app-header-background-color");
      if (themeMeta) {
        if (!themeMeta.hasAttribute("default-content")) {
          themeMeta.setAttribute(
            "default-content",
            themeMeta.getAttribute("content")!
          );
        }
        const themeColor =
          headerColor.trim() ||
          (themeMeta.getAttribute("default-content") as string);
        themeMeta.setAttribute("content", themeColor);
      }
    }
  };
