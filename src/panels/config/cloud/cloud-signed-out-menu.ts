import { mdiDeleteForever, mdiDotsVertical, mdiDownload } from "@mdi/js";
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../types";
import { showSupportPackageDialog } from "./account/show-dialog-cloud-support-package";
import { confirmDeleteCloudData } from "./delete-cloud-data";

// Recovery actions for the signed-out cloud pages, which all need to reach them
// — including while a registration is waiting on its email confirmation.
@customElement("cloud-signed-out-menu")
export class CloudSignedOutMenu extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <ha-dropdown @wa-select=${this._handleMenuAction}>
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>

        <ha-dropdown-item value="reset">
          ${this.hass.localize("ui.panel.config.cloud.account.reset_cloud_data")}
          <ha-svg-icon slot="icon" .path=${mdiDeleteForever}></ha-svg-icon>
        </ha-dropdown-item>
        <ha-dropdown-item value="download">
          ${this.hass.localize(
            "ui.panel.config.cloud.account.download_support_package"
          )}
          <ha-svg-icon slot="icon" .path=${mdiDownload}></ha-svg-icon>
        </ha-dropdown-item>
      </ha-dropdown>
    `;
  }

  private _handleMenuAction(ev: HaDropdownSelectEvent) {
    switch (ev.detail.item.value) {
      case "reset":
        this._deleteCloudData();
        break;
      case "download":
        showSupportPackageDialog(this);
        break;
    }
  }

  private async _deleteCloudData() {
    await confirmDeleteCloudData(this, this.hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-signed-out-menu": CloudSignedOutMenu;
  }
}
