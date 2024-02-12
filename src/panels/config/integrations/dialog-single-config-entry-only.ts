import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { HomeAssistant } from "../../../types";
import { SingleConfigEntryOnlyDialogParams } from "./show-add-integration-dialog";

@customElement("dialog-single-config-entry-only")
export class DialogSingleConfigEntryOnly extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: SingleConfigEntryOnlyDialogParams;

  public showDialog(params: SingleConfigEntryOnlyDialogParams): void {
    this._params = params;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this.hass.localize(
          "ui.panel.config.integrations.config_flow.single_config_entry_title"
        )}
      >
        <p>
          ${this.hass.localize(
            "ui.panel.config.integrations.config_flow.single_config_entry",
            {
              integration_name: this._params.name,
            }
          )}
        </p>
        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass.localize("ui.dialogs.generic.ok")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host([inert]) {
        pointer-events: initial !important;
        cursor: initial !important;
      }
      a {
        text-decoration: none;
      }
      ha-dialog {
        /* Place above other dialogs */
        --dialog-z-index: 104;
      }
      @media all and (min-width: 600px) {
        ha-dialog {
          --mdc-dialog-min-width: 400px;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-single-config-entry-only": DialogSingleConfigEntryOnly;
  }
}
