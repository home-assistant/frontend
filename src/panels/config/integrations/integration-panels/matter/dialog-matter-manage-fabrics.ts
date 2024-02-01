import "@material/mwc-button/mwc-button";
import { mdiDelete } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-qr-code";
import {
  MatterFabricData,
  MatterNodeDiagnostics,
  getMatterNodeDiagnostics,
  removeMatterFabric,
} from "../../../../../data/matter";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { MatterManageFabricsDialogParams } from "./show-dialog-matter-manage-fabrics";

const NABUCASA_FABRIC = 4939;

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
          ? html`<mwc-list>
              ${this._nodeDiagnostics.active_fabrics.map(
                (fabric) =>
                  html`<ha-list-item
                    noninteractive
                    .hasMeta=${this._nodeDiagnostics?.available &&
                    fabric.vendor_id !== NABUCASA_FABRIC}
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
            </mwc-list>`
          : html`<div class="center">
              <ha-circular-progress indeterminate></ha-circular-progress>
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
    } catch (err: any) {
      this._nodeDiagnostics = undefined;
    }
  }

  private async _removeFabric(ev) {
    const fabric: MatterFabricData = ev.target.fabric;
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
    } catch (err: any) {
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
