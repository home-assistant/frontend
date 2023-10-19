import { mdiCheck, mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-control-button";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-textfield";
import type { HaTextField } from "../../components/ha-textfield";
import { HomeAssistant } from "../../types";
import { HassDialog } from "../make-dialog-manager";
import { EnterCodeDialogParams } from "./show-enter-code-dialog";

const BUTTONS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
  "clear",
  "submit",
];

@customElement("dialog-enter-code")
export class DialogEnterCode
  extends LitElement
  implements HassDialog<EnterCodeDialogParams>
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _dialogParams?: EnterCodeDialogParams;

  @query("#code") private _input?: HaTextField;

  @state() private _showClearButton = false;

  public async showDialog(dialogParams: EnterCodeDialogParams): Promise<void> {
    this._dialogParams = dialogParams;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._dialogParams = undefined;
    this._showClearButton = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _submit(): void {
    this._dialogParams?.submit?.(this._input?.value ?? "");
    this.closeDialog();
  }

  private _cancel(): void {
    this._dialogParams?.cancel?.();
    this.closeDialog();
  }

  private _numberClick(e: MouseEvent): void {
    const val = (e.currentTarget! as any).value;
    this._input!.value = this._input!.value + val;
    this._showClearButton = true;
  }

  private _clear(): void {
    this._input!.value = "";
    this._showClearButton = false;
  }

  private _inputValueChange(e) {
    const field = e.currentTarget as HaTextField;
    const val = field.value;
    this._showClearButton = !!val;
  }

  protected render() {
    if (!this._dialogParams || !this.hass) {
      return nothing;
    }

    const isText = this._dialogParams.codeFormat === "text";

    if (isText) {
      return html`
        <ha-dialog
          open
          @closed=${this._cancel}
          .heading=${this._dialogParams.title ??
          this.hass.localize("ui.dialogs.enter_code.title")}
        >
          <ha-textfield
            class="input"
            dialogInitialFocus
            id="code"
            .label=${this.hass.localize("ui.dialogs.enter_code.input_label")}
            type="password"
            pattern=${ifDefined(this._dialogParams.codePattern)}
            inputmode="text"
          ></ha-textfield>
          <ha-button slot="secondaryAction" dialogAction="cancel">
            ${this._dialogParams.cancelText ??
            this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button @click=${this._submit} slot="primaryAction">
            ${this._dialogParams.submitText ??
            this.hass.localize("ui.common.submit")}
          </ha-button>
        </ha-dialog>
      `;
    }

    return html`
      <ha-dialog
        open
        .heading=${createCloseHeading(
          this.hass,
          this._dialogParams.title ?? "Enter code"
        )}
        @closed=${this._cancel}
        hideActions
      >
        <div class="container">
          <ha-textfield
            @input=${this._inputValueChange}
            id="code"
            .label=${this.hass.localize("ui.dialogs.enter_code.input_label")}
            type="password"
            inputmode="numeric"
          ></ha-textfield>
          <div class="keypad">
            ${BUTTONS.map((value) =>
              value === ""
                ? html`<span></span>`
                : value === "clear"
                ? html`
                    <ha-control-button
                      @click=${this._clear}
                      class="clear"
                      .disabled=${!this._showClearButton}
                      .label=${this.hass!.localize("ui.common.clear")}
                    >
                      <ha-svg-icon path=${mdiClose}></ha-svg-icon>
                    </ha-control-button>
                  `
                : value === "submit"
                ? html`
                    <ha-control-button
                      @click=${this._submit}
                      class="submit"
                      .label=${this._dialogParams!.submitText ??
                      this.hass!.localize("ui.common.submit")}
                    >
                      <ha-svg-icon path=${mdiCheck}></ha-svg-icon>
                    </ha-control-button>
                  `
                : html`
                    <ha-control-button
                      .value=${value}
                      @click=${this._numberClick}
                      .label=${value}
                    >
                      ${value}
                    </ha-control-button>
                  `
            )}
          </div>
        </div>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-dialog {
        /* Place above other dialogs */
        --dialog-z-index: 104;
      }
      ha-textfield {
        width: 100%;
        max-width: 300px;
        margin: auto;
      }
      .container {
        display: flex;
        align-items: center;
        flex-direction: column;
      }
      .keypad {
        --keypad-columns: 3;
        margin-top: 12px;
        padding: 12px;
        display: grid;
        grid-template-columns: repeat(var(--keypad-columns), auto);
        grid-auto-rows: auto;
        grid-gap: 24px;
        justify-items: center;
        align-items: center;
      }
      .clear {
        grid-row-start: 4;
        grid-column-start: 0;
      }
      @media all and (max-height: 450px) {
        .keypad {
          --keypad-columns: 6;
        }
        .clear {
          grid-row-start: 1;
          grid-column-start: 6;
        }
      }

      ha-control-button {
        width: 56px;
        height: 56px;
        --control-button-border-radius: 28px;
        --mdc-icon-size: 24px;
        font-size: 24px;
      }
      .submit {
        --control-button-background-color: var(--green-color);
        --control-button-icon-color: var(--green-color);
      }
      .clear {
        --control-button-background-color: var(--red-color);
        --control-button-icon-color: var(--red-color);
      }
      .hidden {
        display: none;
      }
      .buttons {
        margin-top: 12px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-enter-code": DialogEnterCode;
  }
}
