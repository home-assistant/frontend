import { customElement, property } from "lit/decorators";

import { mdiAccount, mdiLock } from "@mdi/js";
import { HassRouterPage, RouterOptions } from "../../layouts/hass-router-page";
import { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../types";

export const profileSections: PageNavigation[] = [
  {
    path: "/profile/general",
    translationKey: "ui.panel.profile.tabs.general",
    iconPath: mdiAccount,
  },
  {
    path: "/profile/security",
    translationKey: "ui.panel.profile.tabs.security",
    iconPath: mdiLock,
  },
];

@customElement("ha-panel-profile")
class HaPanelProfile extends SubscribeMixin(HassRouterPage) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "general",
    routes: {
      general: {
        tag: "ha-profile-section-general",
        load: () => import("./ha-profile-section-general"),
      },
      security: {
        tag: "ha-profile-section-security",
        load: () => import("./ha-profile-section-security"),
      },
    },
  };

  protected updatePageEl(el) {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.narrow = this.narrow;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-profile": HaPanelProfile;
  }
}
