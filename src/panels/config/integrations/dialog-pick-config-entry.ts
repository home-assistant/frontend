import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-wa-dialog";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import { ERROR_STATES, RECOVERABLE_STATES } from "../../../data/config_entries";
import type { HomeAssistant } from "../../../types";
import type { PickConfigEntryDialogParams } from "./show-pick-config-entry-dialog";

@customElement("dialog-pick-config-entry")
export class DialogPickConfigEntry extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: PickConfigEntryDialogParams;

  @state() private _open = false;

  public showDialog(params: PickConfigEntryDialogParams): void {
    this._params = params;
    this._open = true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._open = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const title = this.hass.localize(
      `component.${this._params.domain}.config_subentries.${this._params.subFlowType}.initiate_flow.user`
    );

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${title}
        @closed=${this._dialogClosed}
      >
        <ha-md-list>
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
      </ha-wa-dialog>
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
      ha-wa-dialog {
        --ha-dialog-min-width: 400px;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-pick-config-entry": DialogPickConfigEntry;
  }
}
