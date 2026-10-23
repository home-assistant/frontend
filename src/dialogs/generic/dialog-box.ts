import { mdiAlertOutline, mdiClose } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-adaptive-popover";
import "../../components/ha-button";
import "../../components/ha-dialog";
import "../../components/ha-dialog-footer";
import "../../components/ha-dialog-header";
import "../../components/ha-svg-icon";
import "../../components/ha-textarea";
import type { HaTextArea } from "../../components/ha-textarea";
import "../../components/input/ha-input";
import type { HaInput } from "../../components/input/ha-input";
import { DirtyStateProviderMixin } from "../../mixins/dirty-state-provider-mixin";
import type { HomeAssistant } from "../../types";
import type { DialogBoxParams } from "./show-dialog-box";

interface DialogBoxDirtyState {
  value: string;
}

@customElement("dialog-box")
class DialogBox extends DirtyStateProviderMixin<DialogBoxDirtyState>()(
  LitElement
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  // Set by the dialog manager before each showDialog
  @property({ attribute: false }) public dialogAnchor?: Element;

  @state() private _params?: DialogBoxParams;

  @state() private _anchor?: Element;

  @state() private _open = false;

  @state() private _closeState?: "canceled" | "confirmed";

  @state() private _loading = false;

  @state() private _validInput = true;

  @query("ha-input, ha-textarea") private _textField?: HaInput | HaTextArea;

  private _closePromise?: Promise<void>;

  private _closeResolve?: () => void;

  public async showDialog(params: DialogBoxParams): Promise<void> {
    if (this._closePromise) {
      await this._closePromise;
    }
    this._params = params;
    this._anchor = this.dialogAnchor;
    this._validInput = true;
    this._open = true;
    this._initDirtyTracking(
      { type: "deep" },
      { value: params.defaultValue ?? "" }
    );
    await this.updateComplete;
    this._validateInput();
  }

  public closeDialog(): boolean {
    if (!this._open) {
      // Dialog is already closing
      return true;
    }
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

    if (this._anchor) {
      // With only a title, it reads as the message rather than a heading
      const titleOnly =
        !!dialogTitle &&
        !this._params.text &&
        !this._params.subtitle &&
        !this._params.prompt;

      // A popover next to what opened it, or a bottom sheet on small screens.
      // The title is the popover's own, so it can name the dialog.
      return html`
        <ha-adaptive-popover
          .dialogAnchor=${this._anchor}
          compact
          ?without-header=${titleOnly}
          .open=${this._open}
          .preventScrimClose=${!!this._params.confirmation || this.isDirtyState}
          .headerTitle=${titleOnly ? undefined : dialogTitle || undefined}
          .headerSubtitle=${this._params.subtitle}
          .accessibleLabel=${titleOnly ? dialogTitle : undefined}
          .hideCloseButton=${confirmPrompt && !this._params.showCloseButton}
          @closed=${this._dialogClosed}
        >
          ${
            titleOnly
              ? html`<div id="dialog-box-description">
                  <p>${dialogTitle}</p>
                </div>`
              : this._renderDescription(this._params)
          }
          ${this._renderFooter(this._params, confirmPrompt)}
        </ha-adaptive-popover>
      `;
    }

    return html`
      <ha-dialog
        .open=${this._open}
        type=${confirmPrompt ? "alert" : "standard"}
        .preventScrimClose=${!!this._params.confirmation || this.isDirtyState}
        @closed=${this._dialogClosed}
        .accessibleLabel=${this._accessibleLabel(dialogTitle)}
        aria-describedby="dialog-box-description"
      >
        <ha-dialog-header slot="header">
          ${
            !confirmPrompt || this._params.showCloseButton
              ? html`<slot name="headerNavigationIcon" slot="navigationIcon">
                  <ha-icon-button
                    data-dialog="close"
                    .label=${this.hass?.localize("ui.common.close") ?? "Close"}
                    .path=${mdiClose}
                  ></ha-icon-button
                ></slot>`
              : nothing
          }
          <h1
            class=${classMap({ title: true, alert: confirmPrompt })}
            slot="title"
            id="dialog-box-title"
          >
            ${
              this._params.warning
                ? html`<ha-svg-icon
                    .path=${mdiAlertOutline}
                    style="color: var(--warning-color)"
                  ></ha-svg-icon> `
                : nothing
            }
            ${dialogTitle}
          </h1>
          ${
            this._params.subtitle
              ? html`<span slot="subtitle">${this._params.subtitle}</span>`
              : nothing
          }
        </ha-dialog-header>
        ${this._renderDescription(this._params)}
        ${this._renderFooter(this._params, confirmPrompt)}
      </ha-dialog>
    `;
  }

  private _renderDescription(params: DialogBoxParams) {
    return html`
      <div id="dialog-box-description">
        ${params.text ? html` <p>${params.text}</p> ` : ""}
        ${
          params.prompt && !params.multiline
            ? html`
                <ha-input
                  autofocus
                  value=${ifDefined(params.defaultValue)}
                  .placeholder=${params.placeholder}
                  .label=${params.inputLabel ? params.inputLabel : ""}
                  .type=${params.inputType ? params.inputType : "text"}
                  .min=${params.inputMin}
                  .max=${params.inputMax}
                  .disabled=${this._loading}
                  @input=${this._validateInput}
                >
                  ${
                    params.inputSuffix
                      ? html`<span slot="end">${params.inputSuffix}</span>`
                      : nothing
                  }
                </ha-input>
              `
            : params.prompt && params.multiline
              ? html`
                  <ha-textarea
                    resize="auto"
                    autofocus
                    .value=${params.defaultValue}
                    .placeholder=${params.placeholder}
                    .label=${params.inputLabel}
                    .disabled=${this._loading}
                    @input=${this._validateInput}
                  ></ha-textarea>
                `
              : nothing
        }
        ${
          params.prompt && params.textBelowInput
            ? html`<div class="after-input">${params.textBelowInput}</div>`
            : nothing
        }
      </div>
    `;
  }

  private _renderFooter(params: DialogBoxParams, confirmPrompt: boolean) {
    return html`
      <ha-dialog-footer slot="footer">
        ${
          confirmPrompt
            ? html`
                <ha-button
                  slot="secondaryAction"
                  @click=${this._dismiss}
                  ?autofocus=${!params.prompt && params.destructive}
                  ?disabled=${this._loading}
                  appearance="plain"
                >
                  ${
                    params.dismissText
                      ? params.dismissText
                      : this.hass.localize("ui.common.cancel")
                  }
                </ha-button>
              `
            : nothing
        }
        <ha-button
          slot="primaryAction"
          @click=${this._confirm}
          ?autofocus=${!params.prompt && !params.destructive}
          ?disabled=${this._loading || (!!params.prompt && !this._validInput)}
          .loading=${this._loading}
          variant=${params.destructive ? "danger" : "brand"}
        >
          ${
            params.confirmText
              ? params.confirmText
              : this.hass.localize("ui.common.ok")
          }
        </ha-button>
      </ha-dialog-footer>
    `;
  }

  private _cancel(): void {
    if (this._params?.cancel) {
      this._params.cancel();
    }
  }

  // Alerts often have no title. Their message is what a screen reader should
  // announce then, as long as it is plain text.
  private _accessibleLabel(dialogTitle: string | false | undefined) {
    if (dialogTitle) {
      return dialogTitle;
    }
    return typeof this._params?.text === "string"
      ? this._params.text
      : undefined;
  }

  private _dismiss(): void {
    this._closeState = "canceled";
    this._cancel();
    this._closeDialog();
  }

  private async _confirm(): Promise<void> {
    if (this._params?.prompt && !this._textField?.reportValidity()) {
      return;
    }

    if (this._params!.action) {
      this._loading = true;
      try {
        await this._params!.action(this._textField?.value);
      } catch (_err) {
        this._loading = false;
        return;
      }
      this._loading = false;
    }
    this._closeState = "confirmed";
    if (this._params!.confirm) {
      this._params!.confirm(this._textField?.value);
    }
    this._markDirtyStateClean();
    this._closeDialog();
  }

  private _validateInput(): void {
    this._validInput = this._params?.prompt
      ? (this._textField?.checkValidity() ?? true)
      : true;
    if (this._params?.prompt) {
      this._updateDirtyState({ value: this._textField?.value ?? "" });
    }
  }

  private _closeDialog() {
    this._open = false;
    this._closePromise = new Promise((resolve) => {
      this._closeResolve = resolve;
    });
  }

  private _dialogClosed() {
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    if (!this._closeState) {
      this._cancel();
    }
    this._closeState = undefined;
    this._params = undefined;
    this._anchor = undefined;
    this._open = false;
    this._loading = false;
    this._closeResolve?.();
    this._closeResolve = undefined;
  }

  static styles = css`
    ha-adaptive-popover {
      /* As wide as the message and buttons need, up to the screen width, so
         text only wraps when there is no room left */
      --ha-adaptive-popover-min-width: 0;
      --ha-adaptive-popover-width: 95vw;
    }
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
    ha-input {
      width: 100%;
    }
    .after-input {
      margin-top: var(--ha-space-4);
    }
    .title {
      font-weight: inherit;
      font-size: inherit;
      margin: inherit;
    }
    .title.alert {
      padding: 0 var(--ha-space-2);
    }
    @media all and (min-width: 450px) and (min-height: 500px) {
      .title.alert {
        padding: 0 var(--ha-space-1);
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-box": DialogBox;
  }
}
