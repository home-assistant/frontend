import { mdiAlertOutline } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-md-dialog";
import type { HaMdDialog } from "../../components/ha-md-dialog";
import "../../components/ha-dialog-header";
import "../../components/ha-svg-icon";
import "../../components/ha-button";
import { HaTextField } from "../../components/ha-textfield";
import { HomeAssistant } from "../../types";
import { DialogBoxParams } from "./show-dialog-box";

@customElement("dialog-box")
class DialogBox extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DialogBoxParams;

  @state() private _closeState?: "canceled" | "confirmed";

  @query("ha-textfield") private _textField?: HaTextField;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public async showDialog(params: DialogBoxParams): Promise<void> {
    this._params = params;
  }

  public closeDialog(): boolean {
    if (this._params?.confirmation || this._params?.prompt) {
      return false;
    }
    if (this._params) {
      this._dismiss();
      return true;
    }
    return true;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const confirmPrompt = this._params.confirmation || this._params.prompt;

    const dialogTitle =
      this._params.title ||
      (this._params.confirmation &&
        this.hass.localize("ui.dialogs.generic.default_confirmation_title"));

    return html`
      <ha-md-dialog
        open
        .disableCancelAction=${confirmPrompt || false}
        @closed=${this._dialogClosed}
        type="alert"
        aria-labelledby="dialog-box-title"
        aria-describedby="dialog-box-description"
      >
        <div slot="headline">
          <span .title=${dialogTitle} id="dialog-box-title">
            ${this._params.warning
              ? html`<ha-svg-icon
                  .path=${mdiAlertOutline}
                  style="color: var(--warning-color)"
                ></ha-svg-icon> `
              : nothing}
            ${dialogTitle}
          </span>
        </div>
        <div slot="content" id="dialog-box-description">
          ${this._params.text ? html` <p>${this._params.text}</p> ` : ""}
          ${this._params.prompt
            ? html`
                <ha-textfield
                  dialogInitialFocus
                  value=${ifDefined(this._params.defaultValue)}
                  .placeholder=${this._params.placeholder}
                  .label=${this._params.inputLabel
                    ? this._params.inputLabel
                    : ""}
                  .type=${this._params.inputType
                    ? this._params.inputType
                    : "text"}
                  .min=${this._params.inputMin}
                  .max=${this._params.inputMax}
                ></ha-textfield>
              `
            : ""}
        </div>
        <div slot="actions">
          ${confirmPrompt &&
          html`
            <ha-button
              @click=${this._dismiss}
              ?dialogInitialFocus=${!this._params.prompt &&
              this._params.destructive}
            >
              ${this._params.dismissText
                ? this._params.dismissText
                : this.hass.localize("ui.dialogs.generic.cancel")}
            </ha-button>
          `}
          <ha-button
            @click=${this._confirm}
            ?dialogInitialFocus=${!this._params.prompt &&
            !this._params.destructive}
            class=${classMap({
              destructive: this._params.destructive || false,
            })}
          >
            ${this._params.confirmText
              ? this._params.confirmText
              : this.hass.localize("ui.dialogs.generic.ok")}
          </ha-button>
        </div>
      </ha-md-dialog>
    `;
  }

  private _cancel(): void {
    if (this._params?.cancel) {
      this._params.cancel();
    }
  }

  private _dismiss(): void {
    this._cancel();
    this._closeState = "canceled";
    this._closeDialog();
  }

  private _confirm(): void {
    if (this._params!.confirm) {
      this._params!.confirm(this._textField?.value);
    }
    this._closeState = "confirmed";
    this._closeDialog();
  }

  private _closeDialog() {
    this._dialog?.close();
  }

  private _dialogClosed() {
    if (!this._closeState) {
      this._cancel();
    }
    if (!this._params) {
      return;
    }
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host([inert]) {
        pointer-events: initial !important;
        cursor: initial !important;
      }
      a {
        color: var(--primary-color);
      }
      p {
        margin: 0;
        color: var(--primary-text-color);
      }
      .no-bottom-padding {
        padding-bottom: 0;
      }
      .secondary {
        color: var(--secondary-text-color);
      }
      .destructive {
        --mdc-theme-primary: var(--error-color);
      }
      @media all and (min-width: 600px) {
        ha-dialog {
          --mdc-dialog-min-width: 400px;
        }
      }
      ha-textfield {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-box": DialogBox;
  }
}
