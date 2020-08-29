import { mdiNetwork, mdiServerNetwork } from "@mdi/js";
import {
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { navigate } from "../../../../../common/navigate";
import "../../../../../layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { computeTail } from "./ozw-config-router";
import "./ozw-network-router";

export function ozwNetworkTabs(instance: number): PageNavigation[] {
  return [
    {
      translationKey: "ui.panel.config.ozw.navigation.network",
      path: `/config/ozw/network/${instance}/dashboard`,
      iconPath: mdiServerNetwork,
    },
    {
      translationKey: "ui.panel.config.ozw.navigation.nodes",
      path: `/config/ozw/network/${instance}/nodes`,
      iconPath: mdiNetwork,
    },
  ];
}

@customElement("ozw-config-network")
class OZWConfigNetwork extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property({ type: Number }) public ozwInstance?;

  protected firstUpdated() {
    if (!this.ozwInstance) {
      navigate(this, "/config/ozw/dashboard", true);
    }
  }

  protected render(): TemplateResult {
    const route = computeTail(this.route);

    if (route.path !== "/nodes") {
      return html`
        <hass-tabs-subpage
          .hass=${this.hass}
          .narrow=${this.narrow}
          .route=${route}
          .tabs=${ozwNetworkTabs(this.ozwInstance)}
        >
          <ozw-network-router
            .ozwInstance=${this.ozwInstance}
            .route=${route}
            .hass=${this.hass}
            .narrow=${this.narrow}
          >
          </ozw-network-router>
        </hass-tabs-subpage>
      `;
    }

    return html`
      <ozw-network-router
        .ozwInstance=${this.ozwInstance}
        .route=${route}
        .hass=${this.hass}
        .narrow=${this.narrow}
      >
      </ozw-network-router>
    `;
  }

  static get styles(): CSSResultArray {
    return [haStyle];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ozw-config-network": OZWConfigNetwork;
  }
}
