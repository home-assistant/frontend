import { mdiFormatListBulletedType, mdiMemory } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import type { RouterOptions } from "../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../layouts/hass-router-page";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import type { HomeAssistant } from "../../../types";

export const hardwareTabs = (hass: HomeAssistant): PageNavigation[] => {
  const tabs: PageNavigation[] = [
    {
      path: "/config/hardware/overview",
      translationKey: "ui.panel.config.hardware.overview",
      iconPath: mdiMemory,
    },
  ];

  if (isComponentLoaded(hass, "hassio")) {
    tabs.push({
      path: "/config/hardware/all",
      translationKey: "ui.panel.config.hardware.system_hardware.title",
      iconPath: mdiFormatListBulletedType,
    });
  }

  return tabs;
};

@customElement("ha-config-hardware")
class HaConfigHardware extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "overview",
    routes: {
      overview: {
        tag: "ha-config-hardware-overview",
        load: () => import("./ha-config-hardware-overview"),
        cache: true,
      },
      all: {
        tag: "ha-config-hardware-all",
        load: () => import("./ha-config-hardware-all"),
      },
    },
    beforeRender: (page) => {
      if (
        page === "all" &&
        (!this.hass || !isComponentLoaded(this.hass, "hassio"))
      ) {
        return "overview";
      }
      return undefined;
    },
  };

  protected updatePageEl(pageEl) {
    pageEl.hass = this.hass;
    pageEl.narrow = this.narrow;
    pageEl.route = this.routeTail;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-hardware": HaConfigHardware;
  }
}
