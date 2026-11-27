import { mdiDotsVertical } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import type { HomeAssistant } from "../../../types";
import type { RecentlyRemovedDialogParams } from "../recently-removed/show-dialog-recently-removed";
import { showRecentlyRemovedDialog } from "../recently-removed/show-dialog-recently-removed";

@customElement("ha-integration-overflow-menu")
export class HaIntegrationOverflowMenu extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "recently-removed" })
  public recentlyRemoved?: RecentlyRemovedDialogParams["type"];

  protected render() {
    return html`
      <ha-dropdown @wa-select=${this._handleSelect}>
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        <a href="/config/application_credentials">
          <ha-dropdown-item>
            ${this.hass.localize(
              "ui.panel.config.application_credentials.caption"
            )}
          </ha-dropdown-item>
        </a>
        ${
          this.recentlyRemoved && this.hass.user?.is_admin
            ? html`<ha-dropdown-item value="recently_removed">
                ${this.hass.localize("ui.panel.config.recently_removed.menu")}
              </ha-dropdown-item>`
            : nothing
        }
      </ha-dropdown>
    `;
  }

  private _handleSelect(ev: HaDropdownSelectEvent) {
    if (ev.detail.item.value === "recently_removed" && this.recentlyRemoved) {
      showRecentlyRemovedDialog(this, { type: this.recentlyRemoved });
    }
  }

  static styles = css`
    :host {
      display: flex;
    }
    a {
      text-decoration: none;
    }
  `;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-overflow-menu": HaIntegrationOverflowMenu;
  }
}
