import { ContextProvider } from "@lit/context";
import { mdiClose } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { labelsContext } from "../../../data/context";
import { subscribeLabelRegistry } from "../../../data/label_registry";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
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
class DialogTargetPicker
  extends SubscribeMixin(LitElement)
  implements HassDialog
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: TargetPickerDialogParams;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  private _labelsContext = new ContextProvider(this, {
    context: labelsContext,
    initialValue: [],
  });

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

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeLabelRegistry(this.hass.connection!, (labels) => {
        this._labelsContext.setValue(labels);
      }),
    ];
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-md-dialog flexcontent open @closed=${this._dialogClosed}>
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            @click=${this.closeDialog}
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">Pick target</span>
        </ha-dialog-header>
        <div class="content" slot="content">
          <ha-target-picker-selector
            mode="dialog"
            autofocus
            .hass=${this.hass}
            @filter-types-changed=${this._handleUpdatePickerFilters}
            .filterTypes=${this._params.typeFilter || []}
            @target-picked=${this._handleTargetPicked}
            .targetValue=${this._params.target}
            .deviceFilter=${this._params.deviceFilter}
            .entityFilter=${this._params.entityFilter}
            .includeDomains=${this._params.includeDomains}
            .includeDeviceClasses=${this._params.includeDeviceClasses}
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

  private _handleTargetPicked(
    ev: CustomEvent<{ id: string; type: TargetTypeFloorless }>
  ) {
    this._params?.selectTarget(ev);
    this.closeDialog();
  }

  static styles = css`
    ha-md-dialog {
      --md-dialog-container-shape: 0;
      min-width: 100%;
      min-height: 100%;
      --dialog-content-padding: 8px 0 0 0;
    }

    .content {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    ha-target-picker-selector {
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-target-picker": DialogTargetPicker;
  }
}
