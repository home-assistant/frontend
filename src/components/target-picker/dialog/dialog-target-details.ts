import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import type { HomeAssistant } from "../../../types";
import "../../ha-dialog-header";
import "../../ha-icon-button";
import "../../ha-icon-next";
import "../../ha-md-list";
import "../../ha-md-list-item";
import "../../ha-svg-icon";
import "../../ha-wa-dialog";
import "../ha-target-picker-item-row";
import type { TargetDetailsDialogParams } from "./show-dialog-target-details";

@customElement("ha-dialog-target-details")
class DialogTargetDetails extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: TargetDetailsDialogParams;

  @state() private _opened = false;

  public showDialog(params: TargetDetailsDialogParams): void {
    this._params = params;
    this._opened = true;
  }

  public closeDialog() {
    this._opened = false;
    return true;
  }

  private _dialogClosed() {
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    this._params = undefined;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._opened}
        header-title=${this.hass.localize(
          "ui.components.target-picker.target_details"
        )}
        header-subtitle=${`${this.hass.localize(
          `ui.components.target-picker.type.${this._params.type}`
        )}:
            ${this._params.title}`}
        @closed=${this._dialogClosed}
      >
        <ha-target-picker-item-row
          .hass=${this.hass}
          .type=${this._params.type}
          .itemId=${this._params.itemId}
          .deviceFilter=${this._params.deviceFilter}
          .entityFilter=${this._params.entityFilter}
          .includeDomains=${this._params.includeDomains}
          .includeDeviceClasses=${this._params.includeDeviceClasses}
          expand
        ></ha-target-picker-item-row>
      </ha-wa-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-target-details": DialogTargetDetails;
  }
}
