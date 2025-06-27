import { mdiClose } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-dialog-header";
import "../../../components/ha-icon-button";
import "../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../components/ha-md-dialog";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import { ERROR_STATES, RECOVERABLE_STATES } from "../../../data/config_entries";
import type { HomeAssistant } from "../../../types";
import type { PickConfigEntryDialogParams } from "./show-pick-config-entry-dialog";

@customElement("dialog-pick-config-entry")
export class DialogPickConfigEntry extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: PickConfigEntryDialogParams;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public showDialog(params: PickConfigEntryDialogParams): void {
    this._params = params;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialog() {
    this._dialog?.close();
    return true;
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
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>
          <span
            slot="title"
            .title=${this.hass.localize(
              `component.${this._params.domain}.config_subentries.${this._params.subFlowType}.initiate_flow.user`
            )}
            >${this.hass.localize(
              `component.${this._params.domain}.config_subentries.${this._params.subFlowType}.initiate_flow.user`
            )}</span
          >
        </ha-dialog-header>
        <ha-md-list slot="content">
          ${this._params.configEntries.map(
            (entry) =>
              html`<ha-md-list-item
                type="button"
                @click=${this._itemPicked}
                .entry=${entry}
                .disabled=${!ERROR_STATES.includes(entry.state) &&
                !RECOVERABLE_STATES.includes(entry.state)}
                >${entry.title}</ha-md-list-item
              >`
          )}
        </ha-md-list>
      </ha-md-dialog>
    `;
  }

  private _itemPicked(ev: Event) {
    this._params?.configEntryPicked((ev.currentTarget as any).entry);
    this.closeDialog();
  }

  static styles = css`
    :host {
      --dialog-content-padding: 0;
    }
    @media all and (min-width: 600px) {
      ha-dialog {
        --mdc-dialog-min-width: 400px;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-pick-config-entry": DialogPickConfigEntry;
  }
}
