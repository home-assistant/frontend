import "@material/mwc-button/mwc-button";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import {
  addMatterDevice,
  canCommissionMatterExternal,
  redirectOnNewMatterDevice,
  stopRedirectOnNewMatterDevice,
} from "../../../../../data/matter";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";

@customElement("dialog-matter-add-device")
class DialogMatterAddDevice extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  public showDialog(): void {
    this._open = true;
    redirectOnNewMatterDevice(this.hass, () => this.closeDialog());
    addMatterDevice(this.hass);
  }

  public closeDialog(): void {
    this._open = false;
    stopRedirectOnNewMatterDevice();
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._open) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(this.hass, "Add Matter device")}
      >
        <div>
          ${canCommissionMatterExternal(this.hass)
            ? "Matter commissioning is not supported on this device, use the mobile app to commission Matter devices."
            : html`<ha-circular-progress
                size="large"
                active
              ></ha-circular-progress>`}
        </div>
        <mwc-button slot="primaryAction" @click=${this.closeDialog}>
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  static styles = [
    haStyleDialog,
    css`
      div {
        display: grid;
      }
      ha-circular-progress {
        justify-self: center;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-add-device": DialogMatterAddDevice;
  }
}
