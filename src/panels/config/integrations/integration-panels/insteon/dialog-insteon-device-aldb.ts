import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import "../../../../../components/ha-code-editor";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { InsteonDeviceALDBDialogParams } from "./show-dialog-insteon-device-aldb";
import "./insteon-aldb-data-table";
import type { InsteonALDBDataTable } from "./insteon-aldb-data-table";
import { ALDBRecord } from "../../../../../data/insteon";

@customElement("dialog-insteon-device-aldb")
class DialogInsteonDeviceALDB extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide?: boolean;

  @property() public narrow?: boolean;

  @internalProperty() private _status!: string;

  @internalProperty() private _records!: ALDBRecord[];

  public async showDialog(
    params: InsteonDeviceALDBDialogParams
  ): Promise<void> {
    this._status = params.aldb_status;
    this._records = params.aldb;
  }

  protected render(): TemplateResult {
    if (!this._status) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        hideActions
        @closing="${this._close}"
        .heading=${createCloseHeading(this.hass, "All-Link Database")}
      >
        <div>Table should be below.</div>
        <insteon-aldb-data-table
          .hass=${this.hass}
          .records=${this._records}
        ></insteon-aldb-data-table>
        <div>Table should be above.</div>
      </ha-dialog>
    `;
  }

  private _close(): void {
    this._status = "";
  }

  static get styles(): CSSResult {
    return haStyleDialog;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-insteon-device-aldb": DialogInsteonDeviceALDB;
  }
}
