import { mdiClose } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import type { HomeAssistant } from "../../../types";
import "../../ha-dialog-header";
import "../../ha-icon-button";
import "../../ha-icon-next";
import "../../ha-md-dialog";
import type { HaMdDialog } from "../../ha-md-dialog";
import "../../ha-md-list";
import "../../ha-md-list-item";
import "../../ha-svg-icon";
import "../ha-target-picker-item-row";
import type { TargetDetailsDialogParams } from "./show-dialog-target-details";

@customElement("ha-dialog-target-details")
class DialogTargetDetails extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: TargetDetailsDialogParams;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public showDialog(params: TargetDetailsDialogParams): void {
    this._params = params;
  }

  public closeDialog() {
    this._dialog?.close();
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
      <ha-md-dialog open @closed=${this._dialogClosed}>
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            @click=${this.closeDialog}
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title"
            >${this.hass.localize(
              "ui.components.target-picker.target_details"
            )}</span
          >
          <span slot="subtitle"
            >${this.hass.localize(
              `ui.components.target-picker.type.${this._params.type}`
            )}:
            ${this._params.title}</span
          >
        </ha-dialog-header>
        <div slot="content">
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
        </div>
      </ha-md-dialog>
    `;
  }

  static styles = css`
    ha-md-dialog {
      min-width: 400px;
      max-height: 90%;
      --dialog-content-padding: var(--ha-space-2) var(--ha-space-6)
        max(var(--safe-area-inset-bottom, var(--ha-space-0)), var(--ha-space-8));
    }

    @media all and (max-width: 600px), all and (max-height: 500px) {
      ha-md-dialog {
        --md-dialog-container-shape: var(--ha-space-0);
        min-width: 100%;
        min-height: 100%;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-target-details": DialogTargetDetails;
  }
}
