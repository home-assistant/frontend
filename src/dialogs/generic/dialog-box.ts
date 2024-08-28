import "@material/mwc-button/mwc-button";

import { mdiAlertOutline, mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-dialog";
import "../../components/ha-svg-icon";
import "../../components/ha-switch";
import "../../components/ha-form/ha-form";
import { HaTextField } from "../../components/ha-textfield";
import { HomeAssistant } from "../../types";
import { DialogBoxParams } from "./show-dialog-box";

@customElement("dialog-box")
class DialogBox extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DialogBoxParams;

  @state() private _formData?;

  @query("ha-textfield") private _textField?: HaTextField;

  public async showDialog(params: DialogBoxParams): Promise<void> {
    this._params = params;
    this._formData = { ...this._params?.formData };
  }

  public closeDialog(): boolean {
    if (
      this._params?.confirmation ||
      this._params?.prompt ||
      this._params?.formSchema
    ) {
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

    const confirmPrompt =
      this._params.confirmation ||
      this._params.prompt ||
      this._params.formSchema;

    const headingTitle = this._params.title
      ? this._params.title
      : this._params.confirmation &&
        this.hass.localize("ui.dialogs.generic.default_confirmation_title");

    const headingAlertIcon = this._params.warning
      ? html`<ha-svg-icon
          .path=${mdiAlertOutline}
          style="color: var(--warning-color)"
        ></ha-svg-icon> `
      : nothing;

    const headingCancelBtn =
      confirmPrompt && this._params.secondaryAction
        ? html`<ha-icon-button
            .label=${this.hass?.localize("ui.dialogs.generic.close") ?? "Close"}
            .path=${mdiClose}
            dialogAction="close"
            class="header_button"
          ></ha-icon-button>`
        : nothing;

    const heading = html` <div class="header_title">
      <span>${headingAlertIcon}${headingTitle}</span>${headingCancelBtn}
    </div>`;

    return html`
      <ha-dialog
        open
        ?scrimClickAction=${confirmPrompt}
        ?escapeKeyAction=${confirmPrompt}
        @closed=${this._dialogClosed}
        defaultAction="ignore"
        .heading=${heading}
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
          ${this._params.formSchema
            ? html`
                <ha-form
                  .schema=${this._params.formSchema}
                  .data=${this._formData}
                  .hass=${this.hass}
                  .computeLabel=${this._params.computeLabelCallback}
                  @value-changed=${this._valueChanged}
                ></ha-form>
              `
            : ""}
        </div>
        ${confirmPrompt && !this._params.secondaryAction
          ? html`
              <mwc-button
                @click=${this._dismiss}
                slot="secondaryAction"
                ?dialogInitialFocus=${!this._params.prompt &&
                this._params.destructive}
              >
                ${this._params.dismissText
                  ? this._params.dismissText
                  : this.hass.localize("ui.dialogs.generic.cancel")}
              </mwc-button>
            `
          : nothing}
        ${this._params.secondaryAction
          ? html`
              <mwc-button
                @click=${this._secondaryAction}
                slot="secondaryAction"
                class=${classMap({
                  destructive: this._params.secondaryActionDestructive || false,
                })}
              >
                ${this._params.secondaryActionText}
              </mwc-button>
            `
          : nothing}
        <mwc-button
          @click=${this._confirm}
          ?dialogInitialFocus=${!this._params.prompt &&
          !this._params.destructive}
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

  private _secondaryAction(): void {
    if (this._params!.secondaryAction) {
      this._params!.secondaryAction();
    }
    this._close();
  }

  private _confirm(): void {
    if (this._params!.confirm) {
      this._params!.confirm(this._textField?.value);
    }
    if (this._params!.submit) {
      this._params!.submit(this._formData);
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
    this._formData = undefined;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _valueChanged(ev) {
    this._formData = ev.detail.value;
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
