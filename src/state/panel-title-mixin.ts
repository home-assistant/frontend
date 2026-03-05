import type { PropertyValues } from "lit";
import { getConfigSubpageTitle, getPanelTitleFromUrlPath } from "../data/panel";
import { configSections } from "../panels/config/ha-panel-config";
import type { Constructor, HomeAssistant } from "../types";
import type { HassBaseEl } from "./hass-base-mixin";

const setPageTitle = (title: string | undefined) => {
  document.title = title ? `${title} – Home Assistant` : "Home Assistant";
};

const getRoutePath = (): string =>
  // In demo mode, use hash; otherwise use pathname
  __DEMO__ ? window.location.hash.substring(1) : window.location.pathname;

export const panelTitleMixin = <T extends Constructor<HassBaseEl>>(
  superClass: T
) =>
  class extends superClass {
    private _previousPath?: string;

    protected updated(changedProps: PropertyValues): void {
      super.updated(changedProps);
      if (!changedProps.has("hass") || !this.hass) {
        return;
      }

      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      const currentPath = getRoutePath();

      // Update title when panel, localize, or route path changes
      if (
        !oldHass ||
        oldHass.panels !== this.hass.panels ||
        oldHass.panelUrl !== this.hass.panelUrl ||
        oldHass.localize !== this.hass.localize ||
        this._previousPath !== currentPath
      ) {
        this._previousPath = currentPath;

        let title: string | undefined;

        // Try to get specific subpage title for config panel
        if (this.hass.panelUrl === "config") {
          title = getConfigSubpageTitle(this.hass, currentPath, configSections);
        }

        // Fall back to panel title
        if (!title) {
          title = getPanelTitleFromUrlPath(this.hass, this.hass.panelUrl);
        }

        setPageTitle(title);
      }
    }
  };
