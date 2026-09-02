import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-form/ha-form";
import type {
  HaFormDataContainer,
  HaFormSchema,
} from "../../../components/ha-form/types";
import "../../../components/ha-settings-row";
import "../../../components/progress/ha-progress-bar";
import type { HomeAssistant } from "../../../types";
import { StoreDispatchEvent } from "../data/common";
import { websocketSubscription } from "../data/websocket";
import type { StoreFormDialogParams } from "./show-dialog-store";

@customElement("dialog-store-form")
class DialogStoreForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() _dialogParams?: StoreFormDialogParams;

  @state() _waiting?: boolean;

  @state() _errors?: Record<string, string>;

  _errorSubscription: any;

  public async showDialog(dialogParams: StoreFormDialogParams): Promise<void> {
    this._dialogParams = dialogParams;
    this._errorSubscription = await websocketSubscription(
      this.hass,
      (data) => {
        this._errors = { base: data?.message || data };
      },
      StoreDispatchEvent.ERROR
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
        .headerTitle=${this._dialogParams.title}
        @closed=${this.closeDialog}
      >
        <div>
          ${this._dialogParams.description || nothing}
          ${
            this._dialogParams.schema && this._dialogParams.saveAction
              ? html`<ha-form
                  .hass=${this.hass}
                  .data=${this._dialogParams.data || {}}
                  .schema=${this._dialogParams.schema || []}
                  .error=${this._errors}
                  .computeLabel=${this._computeLabel}
                  .computeHelper=${this._computeHelper}
                  .computeError=${this._computeError}
                  @value-changed=${this._valueChanged}
                  autofocus
                ></ha-form>`
              : nothing
          }
          ${
            this._waiting
              ? html`<ha-progress-bar indeterminate></ha-progress-bar>`
              : nothing
          }
        </div>
        ${
          this._dialogParams.saveAction
            ? html`<ha-dialog-footer slot="footer">
                <ha-button
                  slot="secondaryAction"
                  appearance="plain"
                  @click=${this.closeDialog}
                >
                  ${this.hass.localize("ui.panel.store.common.cancel")}
                </ha-button>
                <ha-button
                  slot="primaryAction"
                  appearance="filled"
                  variant=${this._dialogParams.destructive ? "danger" : "brand"}
                  .disabled=${
                    this._waiting ||
                    (this._dialogParams.schema?.some(
                      (entry) => entry.required
                    ) &&
                      !this._dialogParams.data)
                  }
                  @click=${this._saveClicked}
                >
                  ${
                    this._dialogParams.saveLabel ||
                    this.hass.localize("ui.panel.store.common.save")
                  }
                </ha-button>
              </ha-dialog-footer>`
            : nothing
        }
      </ha-dialog>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    this._dialogParams = {
      ...this._dialogParams!,
      data: { ...this._dialogParams!.data, ...ev.detail.value },
    };
  }

  private async _saveClicked(): Promise<void> {
    if (!this._dialogParams?.saveAction) {
      return;
    }
    this._errors = {};
    this._waiting = true;
    try {
      await this._dialogParams.saveAction(this._dialogParams.data);
    } catch (err: any) {
      this._errors = {
        base: err?.message || "Unkown error, check Home Assistant logs",
      };
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
    this._dialogParams?.computeHelper
      ? this._dialogParams.computeHelper(schema)
      : "";

  private _computeError = (
    error,
    schema: HaFormSchema | readonly HaFormSchema[]
  ) =>
    this._dialogParams?.computeError
      ? this._dialogParams.computeError(error, schema)
      : error || "";

  static styles: CSSResultGroup = css`
    ha-progress-bar {
      margin-bottom: -8px;
      margin-top: 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-store-form": DialogStoreForm;
  }
}
