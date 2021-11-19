import { mdiDevices, mdiHomeAssistant, mdiRobot, mdiRocket } from "@mdi/js";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../src/components/ha-card";
import { provideHass } from "../../../src/fake_data/provide_hass";
import { PageNavigation } from "../../../src/layouts/hass-tabs-subpage";
import "../../../src/panels/config/dashboard/ha-config-navigation";
import { HomeAssistant } from "../../../src/types";

const PAGES: PageNavigation[] = [
  {
    path: "#demo-ha-config-navigation",
    name: "Devices & Services",
    description: "Manage integrations, areas, tags and helpers",
    iconPath: mdiDevices,
    iconColor: "#004E98",
  },
  {
    path: "#demo-ha-config-navigation",
    name: "Automations",
    description: "Manage integrations, areas, tags and helpers",
    iconPath: mdiRobot,
    iconColor: "#2A850E",
  },
  {
    path: "#demo-ha-config-navigation",
    name: "Add-ons & Backups",
    description: "Create backups, check logs or reboot your system",
    iconPath: mdiHomeAssistant,
    iconColor: "#44739E",
  },
  {
    path: "#demo-ha-config-navigation",
    name: "Basic icon with no background",
    description:
      "This is just here to display that the component can handle this to",
    iconPath: mdiRocket,
  },
];

@customElement("demo-ha-config-navigation")
export class DemoHaConfigNavigation extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      <ha-card header="ha-config-navigation demo">
        <ha-config-navigation
          .hass=${this.hass}
          .pages=${PAGES}
        ></ha-config-navigation>
      </ha-card>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-ha-config-navigation": DemoHaConfigNavigation;
  }
}
