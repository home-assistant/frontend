import "@material/web/button/outlined-button";
import "@material/web/iconbutton/outlined-icon-button";
import { mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-textfield";
import type { HaTextField } from "../../../../components/ha-textfield";
import { HomeAssistant } from "../../../../types";
import { HassDialog } from "../../../make-dialog-manager";
import { EnterCodeDialogParams } from "./show-enter-code-dialog";

const BUTTONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "clear"];

@customElement("dialog-enter-code")
export class DialogEnterCode
  extends LitElement
  implements HassDialog<EnterCodeDialogParams>
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _dialogParams?: EnterCodeDialogParams;

  @query("#code") private _input?: HaTextField;

  public async showDialog(dialogParams: EnterCodeDialogParams): Promise<void> {
    this._dialogParams = dialogParams;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._dialogParams?.cancel?.();
    this._dialogParams = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _submit(): void {
    this._dialogParams?.submit?.(this._input?.value ?? "");
    this._dialogParams = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _handlePadClick(e: MouseEvent): void {
    const val = (e.currentTarget! as any).value;
    this._input!.value = val === "clear" ? "" : this._input!.value + val;
  }

  protected render() {
    if (!this._dialogParams || !this.hass) {
      return nothing;
    }

    return html`
      <ha-dialog open .heading=${"Enter code"} @closed=${this.closeDialog}>
        <div class="container">
          <ha-textfield
            class="input"
            ?dialogInitialFocus=${this._dialogParams.codeFormat !== "number"}
            id="code"
            label="Code"
            type="password"
            .inputMode=${this._dialogParams.codeFormat === "number"
              ? "numeric"
              : "text"}
          ></ha-textfield>
          <div class="keypad">
            ${BUTTONS.map((value) =>
              value === ""
                ? html`<span></span>`
                : value === "clear"
                ? html`
                    <md-outlined-icon-button
                      .value=${value}
                      @click=${this._handlePadClick}
                    >
                      <ha-svg-icon path=${mdiClose}></ha-svg-icon>
                    </md-outlined-icon-button>
                  `
                : html`
                    <md-outlined-button
                      .value=${value}
                      @click=${this._handlePadClick}
                      .label=${value}
                    >
                    </md-outlined-button>
                  `
            )}
          </div>
        </div>
        <div slot="secondaryAction">
          <ha-button class="warning" @click=${this.closeDialog}
            >Cancel</ha-button
          >
        </div>
        <div slot="primaryAction">
          <ha-button @click=${this._submit}>Submit</ha-button>
        </div>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          --md-outlined-icon-button-container-size: 64px;
          --md-outlined-button-container-height: 64px;
        }
        ha-dialog {
          --justify-action-buttons: space-between;
        }
        @media all and (min-width: 600px) {
          ha-dialog {
            --mdc-dialog-min-width: 400px;
          }
        }
        .container {
          display: flex;
          align-items: center;
          flex-direction: column;
        }
        .input {
          margin-bottom: 12px;
        }
        .keypad {
          margin-top: 12px;
          padding: 12px;
          display: grid;
          grid-template-columns: repeat(3, 80px);
          grid-auto-rows: 80px;
          justify-items: center;
          align-items: center;
        }
        md-outlined-button {
          width: var(--md-outlined-button-container-height);
          --md-outlined-button-label-text-type: 500 24px Roboto;
          --md-sys-color-primary: var(--secondary-text-color);
        }
        md-outlined-icon-button {
          --md-outlined-icon-button-icon-size: 24px;
        }
        ha-button.warning {
          --mdc-theme-primary: var(--error-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-enter-code": DialogEnterCode;
  }
}
