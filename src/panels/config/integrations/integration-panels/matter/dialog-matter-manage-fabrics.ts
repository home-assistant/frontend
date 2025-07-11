import "@material/mwc-button/mwc-button";
import { mdiDelete } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-list";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-qr-code";
import "../../../../../components/ha-spinner";
import type {
  MatterFabricData,
  MatterNodeDiagnostics,
} from "../../../../../data/matter";
import {
  getMatterNodeDiagnostics,
  removeMatterFabric,
} from "../../../../../data/matter";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { MatterManageFabricsDialogParams } from "./show-dialog-matter-manage-fabrics";

@customElement("dialog-matter-manage-fabrics")
class DialogMatterManageFabrics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device_id?: string;

  @state() private _nodeDiagnostics?: MatterNodeDiagnostics;

  public async showDialog(
    params: MatterManageFabricsDialogParams
  ): Promise<void> {
    this.device_id = params.device_id;
    this._fetchNodeDetails();
  }

  protected render() {
    if (!this.device_id) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.matter.manage_fabrics.title")
        )}
      >
        <p>
          ${this.hass.localize("ui.panel.config.matter.manage_fabrics.fabrics")}
        </p>
        ${this._nodeDiagnostics
          ? html`<ha-list>
              ${this._nodeDiagnostics.active_fabrics.map(
                (fabric) =>
                  html`<ha-list-item
                    noninteractive
                    .hasMeta=${this._nodeDiagnostics!.available &&
                    fabric.fabric_index !==
                      this._nodeDiagnostics!.active_fabric_index}
                    >${fabric.vendor_name ||
                    fabric.fabric_label ||
                    fabric.vendor_id}
                    <ha-icon-button
                      @click=${this._removeFabric}
                      slot="meta"
                      .fabric=${fabric}
                      .path=${mdiDelete}
                    ></ha-icon-button>
                  </ha-list-item>`
              )}
            </ha-list>`
          : html`<div class="center">
              <ha-spinner></ha-spinner>
            </div>`}
      </ha-dialog>
    `;
  }

  private async _fetchNodeDetails() {
    if (!this.device_id) {
      return;
    }

    try {
      this._nodeDiagnostics = await getMatterNodeDiagnostics(
        this.hass,
        this.device_id
      );
    } catch (_err: any) {
      this._nodeDiagnostics = undefined;
    }
  }

  private async _removeFabric(ev) {
    const fabric: MatterFabricData = ev.target.fabric;
    if (this._nodeDiagnostics!.active_fabric_index === fabric.fabric_index) {
      return;
    }
    const fabricName =
      fabric.vendor_name || fabric.fabric_label || fabric.vendor_id.toString();
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.matter.manage_fabrics.remove_fabric_confirm_header",
        { fabric: fabricName }
      ),
      text: this.hass.localize(
        "ui.panel.config.matter.manage_fabrics.remove_fabric_confirm_text",
        { fabric: fabricName }
      ),
      warning: true,
    });

    if (!confirm) {
      return;
    }

    try {
      await removeMatterFabric(this.hass, this.device_id!, fabric.fabric_index);
      this._fetchNodeDetails();
    } catch (_err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.matter.manage_fabrics.remove_fabric_failed_header",
          { fabric: fabricName }
        ),
        text: this.hass.localize(
          "ui.panel.config.matter.manage_fabrics.remove_fabric_failed_text"
        ),
      });
    }
  }

  public closeDialog(): void {
    this.device_id = undefined;
    this._nodeDiagnostics = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
          --mdc-list-side-padding: 24px;
          --mdc-list-side-padding-right: 16px;
          --mdc-list-item-meta-size: 48px;
        }
        p {
          margin: 8px 24px;
        }
        .center {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-manage-fabrics": DialogMatterManageFabrics;
  }
}
