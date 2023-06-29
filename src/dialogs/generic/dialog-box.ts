import "@material/mwc-button/mwc-button";
import { mdiAlertOutline } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-dialog";
import "../../components/ha-svg-icon";
import "../../components/ha-switch";
import { HaTextField } from "../../components/ha-textfield";
import { HomeAssistant } from "../../types";
import { DialogBoxParams } from "./show-dialog-box";

@customElement("dialog-box")
class DialogBox extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DialogBoxParams;

  @query("ha-textfield") private _textField?: HaTextField;

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

    return html`
      <ha-dialog
        open
        ?scrimClickAction=${confirmPrompt}
        ?escapeKeyAction=${confirmPrompt}
        @closed=${this._dialogClosed}
        defaultAction="ignore"
        .heading=${html`${this._params.warning
          ? html`<ha-svg-icon
              .path=${mdiAlertOutline}
              style="color: var(--warning-color)"
            ></ha-svg-icon> `
          : ""}${this._params.title
          ? this._params.title
          : this._params.confirmation &&
            this.hass.localize(
              "ui.dialogs.generic.default_confirmation_title"
            )}`}
      >
        <div>
          ${this._params.text
            ? html`
                <p class=${this._params.prompt ? "no-bottom-padding" : ""}>
                  ${this._params.text}
                </p>
              `
            : ""}
          ${this._params.prompt
            ? html`
                <ha-textfield
                  dialogInitialFocus
                  value=${ifDefined(this._params.defaultValue)}
                  .placeholder=${ifDefined(this._params.placeholder)}
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
        ${confirmPrompt &&
        html`
          <mwc-button @click=${this._dismiss} slot="secondaryAction">
            ${this._params.dismissText
              ? this._params.dismissText
              : this.hass.localize("ui.dialogs.generic.cancel")}
          </mwc-button>
        `}
        <mwc-button
          @click=${this._confirm}
          ?dialogInitialFocus=${!this._params.prompt}
          slot="primaryAction"
          class=${classMap({
            destructive: this._params.destructive || false,
          })}
        >
          ${this._params.confirmText
            ? this._params.confirmText
            : this.hass.localize("ui.dialogs.generic.ok")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _dismiss(): void {
    if (this._params?.cancel) {
      this._params.cancel();
    }
    this._close();
  }

  private _confirm(): void {
    if (this._params!.confirm) {
      this._params!.confirm(this._textField?.value);
    }
    this._close();
  }

  private _dialogClosed(ev) {
    if (ev.detail.action === "ignore") {
      return;
    }
    this._dismiss();
  }

  private _close(): void {
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
      ha-dialog {
        /* Place above other dialogs */
        --dialog-z-index: 104;
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
