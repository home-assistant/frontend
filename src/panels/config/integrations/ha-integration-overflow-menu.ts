import { css, html, LitElement } from "lit";
import { mdiDotsVertical } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-button-menu";
import "../../../components/ha-svg-icon";
import "../../../components/ha-clickable-list-item";

@customElement("ha-integration-overflow-menu")
export class HaIntegrationOverflowMenu extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render() {
    return html`
      <ha-button-menu activatable>
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        <ha-clickable-list-item
          @click=${this._entryClicked}
          href="/config/application_credentials"
          aria-label=${this.hass.localize(
            "ui.panel.config.application_credentials.caption"
          )}
        >
          ${this.hass.localize(
            "ui.panel.config.application_credentials.caption"
          )}
        </ha-clickable-list-item>
      </ha-button-menu>
    `;
  }

  private _entryClicked(ev) {
    ev.currentTarget.blur();
  }

  static get styles() {
    return css``;
  }
}
