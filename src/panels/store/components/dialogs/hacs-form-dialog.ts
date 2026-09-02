import "@material/mwc-button/mwc-button";
import "@material/mwc-linear-progress/mwc-linear-progress";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../homeassistant-frontend/src/common/dom/fire_event";
import "../../../homeassistant-frontend/src/components/ha-dialog";
import { createCloseHeading } from "../../../homeassistant-frontend/src/components/ha-dialog";
import "../../../homeassistant-frontend/src/components/ha-form/ha-form";
import type {
  HaFormDataContainer,
  HaFormSchema,
} from "../../../homeassistant-frontend/src/components/ha-form/types";
import "../../../homeassistant-frontend/src/components/ha-settings-row";
import type { HomeAssistant } from "../../../homeassistant-frontend/src/types";
import { HacsDispatchEvent } from "../../data/common";
import { websocketSubscription } from "../../data/websocket";
import type { HacsFormDialogParams } from "./show-hacs-dialog";

@customElement("hacs-form-dialog")
class HacsFromDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() _dialogParams?: HacsFormDialogParams;

  @state() _waiting?: boolean;

  @state() _errors?: Record<string, string>;

  _errorSubscription: any;

  public async showDialog(dialogParams: HacsFormDialogParams): Promise<void> {
    this._dialogParams = dialogParams;
    this._errorSubscription = await websocketSubscription(
      this.hass,
      (data) => {
        console.log(data);
        this._errors = { base: data?.message || data };
      },
      HacsDispatchEvent.ERROR,
    );
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._dialogParams = undefined;
    this._waiting = undefined;
    this._errors = undefined;
    if (this._errorSubscription) {
      this._errorSubscription();
    }
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        .scrimClickAction=${this._dialogParams.saveAction !== undefined}
        .escapeKeyAction=${this._dialogParams.saveAction !== undefined}
        .heading=${this._dialogParams.saveAction === undefined
          ? createCloseHeading(this.hass, this._dialogParams.title)
          : this._dialogParams.title}
        @closed=${this.closeDialog}
      >
        <div>
          ${this._dialogParams.description || nothing}
          ${this._dialogParams.schema && this._dialogParams.saveAction
            ? html`<ha-form
                .hass=${this.hass}
                .data=${this._dialogParams.data || {}}
                .schema=${this._dialogParams.schema || []}
                .error=${this._errors}
                .computeLabel=${this._computeLabel}
                .computeHelper=${this._computeHelper}
                .computeError=${this._computeError}
                @value-changed=${this._valueChanged}
                dialogInitialFocus
              ></ha-form>`
            : nothing}
          ${this._waiting
            ? html`<mwc-linear-progress indeterminate></mwc-linear-progress>`
            : nothing}
        </div>
        ${this._dialogParams.saveAction
          ? html`<mwc-button slot="secondaryAction" @click=${this.closeDialog} dialogInitialFocus>
                ${this._dialogParams.hacs.localize("common.cancel")}
              </mwc-button>
              <mwc-button
                class="${this._dialogParams.destructive ? "destructive" : ""}"
                .disabled=${this._waiting ||
                (this._dialogParams.schema?.some((entry) => entry.required) &&
                  !this._dialogParams.data)}
                slot="primaryAction"
                @click=${this._saveClicked}
              >
                ${this._dialogParams.saveLabel || this._dialogParams.hacs.localize("common.save")}
              </mwc-button>`
          : nothing}
      </ha-dialog>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    this._dialogParams!.data = { ...this._dialogParams!.data, ...ev.detail.value };
  }

  public async _saveClicked(): Promise<void> {
    if (!this._dialogParams?.saveAction) {
      return;
    }
    this._errors = {};
    this._waiting = true;
    try {
      await this._dialogParams.saveAction(this._dialogParams.data);
    } catch (err: any) {
      this._errors = { base: err?.message || "Unkown error, check Home Assistant logs" };
    }
    this._waiting = false;

    if (!Object.keys(this._errors).length) {
      this.closeDialog();
    }
  }

  private _computeLabel = (schema: HaFormSchema, data: HaFormDataContainer) =>
    this._dialogParams?.computeLabelCallback
      ? this._dialogParams.computeLabelCallback(schema, data)
      : schema.name || "";

  private _computeHelper = (schema: HaFormSchema) =>
    this._dialogParams?.computeHelper ? this._dialogParams.computeHelper(schema) : "";

  private _computeError = (error, schema: HaFormSchema | readonly HaFormSchema[]) =>
    this._dialogParams?.computeError ? this._dialogParams.computeError(error, schema) : error || "";

  static get styles(): CSSResultGroup {
    return css`
      .root > * {
        display: block;
      }
      .root > *:not([own-margin]):not(:last-child) {
        margin-bottom: 24px;
      }
      .destructive {
        --mdc-theme-primary: var(--hcv-color-error);
      }
      mwc-linear-progress {
        margin-bottom: -8px;
        margin-top: 4px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hacs-form-dialog": HacsFromDialog;
  }
}
