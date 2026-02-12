import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../../types";
import type { DialogThreadDatasetParams } from "./show-dialog-thread-dataset";
import "../../../../../components/ha-wa-dialog";

@customElement("ha-dialog-thread-dataset")
class DialogThreadDataset extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DialogThreadDatasetParams;

  @state() private _open = false;

  public async showDialog(
    params: DialogThreadDatasetParams
  ): Promise<Promise<void>> {
    this._params = params;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
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

    return html`<ha-wa-dialog
      .hass=${this.hass}
      .open=${this._open}
      header-title=${network.name}
      @closed=${this._dialogClosed}
    >
      <div>
        Network name: ${dataset.network_name}<br />
        Channel: ${dataset.channel}<br />
        Dataset ID: ${dataset.dataset_id}<br />
        PAN ID: ${dataset.pan_id}<br />
        Extended PAN ID: ${dataset.extended_pan_id}<br />

        ${hasOTBR
          ? html`OTBR URL: ${otbrInfo.url}<br />
              Active dataset TLVs: ${otbrInfo.active_dataset_tlvs}`
          : nothing}
      </div>
    </ha-wa-dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-thread-dataset": DialogThreadDataset;
  }
}
