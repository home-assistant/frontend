import "@material/mwc-button/mwc-button";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { createCloseHeading } from "../../../components/ha-dialog";
import type { NetworkInterface } from "../../../data/hassio/network";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { IPDetailDialogParams } from "./show-ip-detail-dialog";

@customElement("dialog-ip-detail")
class DialogIPDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: IPDetailDialogParams;

  @state() private _interface?: NetworkInterface;

  public showDialog(params: IPDetailDialogParams): void {
    this._params = params;
    this._interface = this._params.interface;
  }

  public closeDialog() {
    this._params = undefined;
    this._interface = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._interface) {
      return html``;
    }

    const ipv4 = this._interface.ipv4;
    const ipv6 = this._interface.ipv6;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(this.hass, "IP Information")}
      >
        ${ipv4
          ? html`
              <div>
                <h3>IPv4</h3>
                ${ipv4.address
                  ? html`<div>IP Address: ${ipv4.address?.join(", ")}</div>`
                  : ""}
                ${ipv4.gateway ? html`<div>Gateway: ${ipv4.gateway}</div>` : ""}
                ${ipv4.method ? html`<div>Method: ${ipv4.method}</div>` : ""}
                ${ipv4.nameservers?.length
                  ? html`
                      <div>Name Servers: ${ipv4.nameservers?.join(", ")}</div>
                    `
                  : ""}
              </div>
            `
          : ""}
        ${ipv6
          ? html`
              <div>
                <h3>IPv6</h3>
                ${ipv6.address
                  ? html`<div>IP Address: ${ipv6.address?.join(", ")}</div>`
                  : ""}
                ${ipv6.gateway ? html`<div>Gateway: ${ipv6.gateway}</div>` : ""}
                ${ipv6.method ? html`<div>Method: ${ipv6.method}</div>` : ""}
                ${ipv6.nameservers?.length
                  ? html`
                      <div>Name Servers: ${ipv6.nameservers?.join(", ")}</div>
                    `
                  : ""}
              </div>
            `
          : ""}
      </ha-dialog>
    `;
  }

  static styles: CSSResultGroup = haStyleDialog;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-ip-detail": DialogIPDetail;
  }
}
