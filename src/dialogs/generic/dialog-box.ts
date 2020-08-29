import "@material/mwc-button/mwc-button";
import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import "../../components/ha-dialog";
import "../../components/ha-switch";
import { PolymerChangedEvent } from "../../polymer-types";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { DialogParams } from "./show-dialog-box";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("dialog-box")
class DialogBox extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _params?: DialogParams;

  @internalProperty() private _value?: string;

  public async showDialog(params: DialogParams): Promise<void> {
    this._params = params;
    if (params.prompt) {
      this._value = params.defaultValue;
    }
  }

  public closeDialog(): boolean {
    if (this._params?.confirmation || this._params?.prompt) {
      this._dismiss();
      return true;
    }
    if (this._params) {
      return false;
    }
    return true;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    const confirmPrompt = this._params.confirmation || this._params.prompt;

    return html`
      <ha-dialog
        open
        ?scrimClickAction=${this._params.prompt}
        ?escapeKeyAction=${this._params.prompt}
        @closed=${this._dismiss}
        .heading=${this._params.title
          ? this._params.title
          : this._params.confirmation &&
            this.hass.localize("ui.dialogs.generic.default_confirmation_title")}
      >
        <div>
          ${this._params.text
            ? html`
                <p
                  class=${classMap({
                    "no-bottom-padding": Boolean(this._params.prompt),
                  })}
                >
                  ${this._params.text}
                </p>
              `
            : ""}
          ${this._params.prompt
            ? html`
                <paper-input
                  autofocus
                  .value=${this._value}
                  @value-changed=${this._valueChanged}
                  @keyup=${this._handleKeyUp}
                  .label=${this._params.inputLabel
                    ? this._params.inputLabel
                    : ""}
                  .type=${this._params.inputType
                    ? this._params.inputType
                    : "text"}
                ></paper-input>
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
        <mwc-button @click=${this._confirm} slot="primaryAction">
          ${this._params.confirmText
            ? this._params.confirmText
            : this.hass.localize("ui.dialogs.generic.ok")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _valueChanged(ev: PolymerChangedEvent<string>) {
    this._value = ev.detail.value;
  }

  private _dismiss(): void {
    if (this._params!.cancel) {
      this._params!.cancel();
    }
    this._close();
  }

  private _handleKeyUp(ev: KeyboardEvent) {
    if (ev.keyCode === 13) {
      this._confirm();
    }
  }

  private _confirm(): void {
    if (this._params!.confirm) {
      this._params!.confirm(this._value);
    }
    this._close();
  }

  private _close(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        :host([inert]) {
          pointer-events: initial !important;
          cursor: initial !important;
        }
        a {
          color: var(--primary-color);
        }
        p {
          margin: 0;
          padding-top: 6px;
          padding-bottom: 24px;
          color: var(--primary-text-color);
        }
        .no-bottom-padding {
          padding-bottom: 0;
        }
        .secondary {
          color: var(--secondary-text-color);
        }
        ha-dialog {
          /* Place above other dialogs */
          --dialog-z-index: 104;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-box": DialogBox;
  }
}
