import "@material/mwc-button/mwc-button";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import {
  addMatterDevice,
  canCommissionMatterExternal,
  redirectOnNewMatterDevice,
} from "../../../../../data/matter";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";

@customElement("dialog-matter-add-device")
class DialogMatterAddDevice extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  private _unsub?: UnsubscribeFunc;

  public showDialog(): void {
    this._open = true;
    if (!canCommissionMatterExternal(this.hass)) {
      return;
    }
    this._unsub = redirectOnNewMatterDevice(this.hass, () =>
      this.closeDialog()
    );
    addMatterDevice(this.hass);
  }

  public closeDialog(): void {
    this._open = false;
    this._unsub?.();
    this._unsub = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._open) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(this.hass, "Add Matter device")}
      >
        <div>
          ${!canCommissionMatterExternal(this.hass)
            ? this.hass.localize(
                "ui.panel.config.integrations.config_flow.matter_mobile_app"
              )
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
