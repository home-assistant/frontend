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
        this.hass!.selectedTheme?.theme || this.hass!.themes.default_theme;

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

      const meta = document.querySelector("meta[name=theme-color]");
      const headerColor = getComputedStyle(
        document.documentElement
      ).getPropertyValue("--app-header-background-color");
      if (meta) {
        if (!meta.hasAttribute("default-content")) {
          meta.setAttribute("default-content", meta.getAttribute("content")!);
        }
        const themeColor =
          headerColor.trim() ||
          (meta.getAttribute("default-content") as string);
        meta.setAttribute("content", themeColor);
      }
    }
  };
