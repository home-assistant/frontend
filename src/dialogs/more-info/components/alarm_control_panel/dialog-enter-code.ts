import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-dialog";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { HassDialog } from "../../../make-dialog-manager";
import { EnterCodeDialogParams } from "./show-enter-code-dialog";

@customElement("dialog-enter-code")
export class DialogEnterCode
  extends LitElement
  implements HassDialog<EnterCodeDialogParams>
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _dialogParams?: EnterCodeDialogParams;

  public async showDialog(dialogParams: EnterCodeDialogParams): Promise<void> {
    this._dialogParams = dialogParams;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._dialogParams?.cancel?.();
    this._dialogParams = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }

    return html`
      <ha-dialog open .heading=${"Enter code"} @closed=${this.closeDialog}>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [haStyleDialog, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-enter-code": DialogEnterCode;
  }
}
