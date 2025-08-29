import { mdiAlertOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-dialog-header";
import "../../components/ha-md-dialog";
import type { HaMdDialog } from "../../components/ha-md-dialog";
import "../../components/ha-svg-icon";
import "../../components/ha-textfield";
import type { HaTextField } from "../../components/ha-textfield";
import { KeyboardShortcutMixin } from "../../mixins/keyboard-shortcut-mixin";
import type { HomeAssistant } from "../../types";
import type { DialogBoxParams } from "./show-dialog-box";

@customElement("dialog-box")
class DialogBox extends KeyboardShortcutMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DialogBoxParams;

  @state() private _closeState?: "canceled" | "confirmed";

  @query("ha-textfield") private _textField?: HaTextField;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  private _closePromise?: Promise<void>;

  private _closeResolve?: () => void;

  public async showDialog(params: DialogBoxParams): Promise<void> {
    if (this._closePromise) {
      await this._closePromise;
    }
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

    const confirmPrompt = this._params.confirmation || !!this._params.prompt;

    const dialogTitle =
      this._params.title ||
      (this._params.confirmation &&
        this.hass.localize("ui.dialogs.generic.default_confirmation_title"));

    return html`
      <ha-md-dialog
        open
        .disableCancelAction=${!this._params.enableCancelAction &&
        confirmPrompt}
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
          ${confirmPrompt
            ? html`
                <ha-button
                  @click=${this._dismiss}
                  ?dialogInitialFocus=${!this._params.prompt &&
                  this._params.destructive}
                  appearance="plain"
                >
                  ${this._params.dismissText
                    ? this._params.dismissText
                    : this.hass.localize("ui.common.cancel")}
                </ha-button>
              `
            : nothing}
          <ha-button
            @click=${this._confirm}
            ?dialogInitialFocus=${!this._params.prompt &&
            !this._params.destructive}
            variant=${this._params.destructive ? "danger" : "brand"}
          >
            ${this._params.confirmText
              ? this._params.confirmText
              : this.hass.localize("ui.common.ok")}
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
    this._closeState = "canceled";
    this._cancel();
    this._closeDialog();
  }

  private _confirm(): void {
    this._closeState = "confirmed";
    if (this._params!.confirm) {
      this._params!.confirm(this._textField?.value);
    }
    this._closeDialog();
  }

  private _closeDialog() {
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    this._dialog?.close();
    this._closePromise = new Promise((resolve) => {
      this._closeResolve = resolve;
    });
  }

  private _dialogClosed() {
    if (!this._closeState) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
      this._cancel();
    }
    this._closeState = undefined;
    this._params = undefined;
    this._closeResolve?.();
    this._closeResolve = undefined;
  }

  protected supportedSingleKeyShortcuts(): SupportedShortcuts {
    return {
      Enter: () => this._confirm(),
    };
  }

  static styles = css`
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
    ha-textfield {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-box": DialogBox;
  }
}
