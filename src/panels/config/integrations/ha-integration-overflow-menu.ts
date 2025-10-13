import { mdiDotsVertical } from "@mdi/js";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-icon-button";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-md-list-item";
import "../../../components/ha-md-button-menu";

@customElement("ha-integration-overflow-menu")
export class HaIntegrationOverflowMenu extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render() {
    return html`
      <ha-md-button-menu>
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        <ha-md-list-item type="link" href="/config/application_credentials">
          ${this.hass.localize(
            "ui.panel.config.application_credentials.caption"
          )}
        </ha-md-list-item>
      </ha-md-button-menu>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-overflow-menu": HaIntegrationOverflowMenu;
  }
}
