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
import "../ha-target-picker-selector";
import type { TargetTypeFloorless } from "../ha-target-picker-selector";
import type { TargetPickerDialogParams } from "./show-dialog-target-picker";

@customElement("ha-dialog-target-picker")
class DialogTargetPicker extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: TargetPickerDialogParams;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public showDialog(params: TargetPickerDialogParams): void {
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
          <span slot="title">Pick target</span>
        </ha-dialog-header>
        <div slot="content">
          <ha-target-picker-selector
            autofocus
            .hass=${this.hass}
            @filter-types-changed=${this._handleUpdatePickerFilters}
            .filterTypes=${this._params.typeFilter || []}
          ></ha-target-picker-selector>
        </div>
      </ha-md-dialog>
    `;
  }

  private _handleUpdatePickerFilters(ev: CustomEvent<TargetTypeFloorless[]>) {
    if (this._params?.updateTypeFilter) {
      this._params.updateTypeFilter(ev.detail);
    }
  }

  static styles = css`
    ha-md-dialog {
      --md-dialog-container-shape: 0;
      min-width: 100%;
      min-height: 100%;
      --dialog-content-padding: 8px 24px
        max(var(--safe-area-inset-bottom, 0px), 32px);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-target-picker": DialogTargetPicker;
  }
}
