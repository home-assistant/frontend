import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { HassDialog } from "../../../../../dialogs/make-dialog-manager";
import { HomeAssistant } from "../../../../../types";
import { DialogThreadDatasetParams } from "./show-dialog-thread-dataset";
import { createCloseHeading } from "../../../../../components/ha-dialog";

@customElement("ha-dialog-thread-dataset")
class DialogThreadDataset extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DialogThreadDatasetParams;

  public async showDialog(
    params: DialogThreadDatasetParams
  ): Promise<Promise<void>> {
    this._params = params;
  }

  public closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const network = this._params.network;
    const dataset = network.dataset!;
    const otbrInfo = this._params.otbrInfo;

    const hasOTBR =
      otbrInfo &&
      dataset.extended_pan_id &&
      otbrInfo.active_dataset_tlvs?.includes(dataset.extended_pan_id);

    const canImportKeychain =
      hasOTBR &&
      !this.hass.auth.external?.config.canTransferThreadCredentialsToKeychain &&
      network.routers?.length;

    return html`<ha-dialog
      open
      .hideActions=${!canImportKeychain}
      @closed=${this.closeDialog}
      .heading=${createCloseHeading(this.hass, network.name)}
    >
      <div>
        Network name: ${dataset.network_name}<br />
        Channel: ${dataset.channel}<br />
        Dataset id: ${dataset.dataset_id}<br />
        Pan id: ${dataset.pan_id}<br />
        Extended Pan id: ${dataset.extended_pan_id}<br />

        ${hasOTBR
          ? html`OTBR URL: ${otbrInfo.url}<br />
              Active dataset TLVs: ${otbrInfo.active_dataset_tlvs}`
          : nothing}
      </div>
      ${canImportKeychain
        ? html`<ha-button slot="primary-action" @click=${this._sendCredentials}
            >Send credentials to phone</ha-button
          >`
        : nothing}
    </ha-dialog>`;
  }

  private _sendCredentials() {
    this.hass.auth.external!.fireMessage({
      type: "thread/store_in_platform_keychain",
      payload: {
        mac_extended_address:
          this._params?.network.dataset?.preferred_extended_address ||
          this._params!.network.routers![0]!.extended_address,
        border_agent_id:
          this._params?.network.dataset?.preferred_border_agent_id ||
          this._params!.network.routers![0]!.border_agent_id,
        active_operational_dataset: this._params!.otbrInfo!.active_dataset_tlvs,
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-thread-dataset": DialogThreadDataset;
  }
}
