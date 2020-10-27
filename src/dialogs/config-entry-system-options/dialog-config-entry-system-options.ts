import "@material/mwc-button/mwc-button";
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
import "../../components/ha-dialog";
import "../../components/ha-circular-progress";
import "../../components/ha-switch";
import "../../components/ha-formfield";
import { fireEvent } from "../../common/dom/fire_event";
import type { HaSwitch } from "../../components/ha-switch";
import {
  getConfigEntrySystemOptions,
  updateConfigEntrySystemOptions,
} from "../../data/config_entries";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { ConfigEntrySystemOptionsDialogParams } from "./show-dialog-config-entry-system-options";
import { computeRTLDirection } from "../../common/util/compute_rtl";

@customElement("dialog-config-entry-system-options")
class DialogConfigEntrySystemOptions extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _disableNewEntities!: boolean;

  @internalProperty() private _error?: string;

  @internalProperty() private _params?: ConfigEntrySystemOptionsDialogParams;

  @internalProperty() private _loading = false;

  @internalProperty() private _submitting = false;

  public async showDialog(
    params: ConfigEntrySystemOptionsDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._loading = true;
    const systemOptions = await getConfigEntrySystemOptions(
      this.hass,
      params.entry.entry_id
    );
    this._loading = false;
    this._disableNewEntities = systemOptions.disable_new_entities;
  }

  public closeDialog(): void {
    this._error = "";
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this.hass.localize(
          "ui.dialogs.config_entry_system_options.title",
          "integration",
          this.hass.localize(`component.${this._params.entry.domain}.title`) ||
            this._params.entry.domain
        )}
      >
        <div>
          ${this._loading
            ? html`
                <div class="init-spinner">
                  <ha-circular-progress active></ha-circular-progress>
                </div>
              `
            : html`
                ${this._error
                  ? html` <div class="error">${this._error}</div> `
                  : ""}
                <div class="form">
                  <ha-formfield
                    .label=${html`<p>
                        ${this.hass.localize(
                          "ui.dialogs.config_entry_system_options.enable_new_entities_label"
                        )}
                      </p>
                      <p class="secondary">
                        ${this.hass.localize(
                          "ui.dialogs.config_entry_system_options.enable_new_entities_description",
                          "integration",
                          this.hass.localize(
                            `component.${this._params.entry.domain}.title`
                          ) || this._params.entry.domain
                        )}
                      </p>`}
                    .dir=${computeRTLDirection(this.hass)}
                  >
                    <ha-switch
                      .checked=${!this._disableNewEntities}
                      @change=${this._disableNewEntitiesChanged}
                      .disabled=${this._submitting}
                    >
                    </ha-switch>
                  </ha-formfield>
                </div>
              `}
        </div>
        <mwc-button
          slot="secondaryAction"
          @click=${this.closeDialog}
          .disabled=${this._submitting}
        >
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          slot="primaryAction"
          @click="${this._updateEntry}"
          .disabled=${this._submitting || this._loading}
        >
          ${this.hass.localize("ui.dialogs.config_entry_system_options.update")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _disableNewEntitiesChanged(ev: Event): void {
    this._error = undefined;
    this._disableNewEntities = !(ev.target as HaSwitch).checked;
  }

  private async _updateEntry(): Promise<void> {
    this._submitting = true;
    try {
      await updateConfigEntrySystemOptions(
        this.hass,
        this._params!.entry.entry_id,
        {
          disable_new_entities: this._disableNewEntities,
        }
      );
      this._params = undefined;
    } catch (err) {
      this._error = err.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        .init-spinner {
          padding: 50px 100px;
          text-align: center;
        }

        .form {
          padding-top: 6px;
          padding-bottom: 24px;
          color: var(--primary-text-color);
        }
        .secondary {
          color: var(--secondary-text-color);
        }

        .error {
          color: var(--error-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-config-entry-system-options": DialogConfigEntrySystemOptions;
  }
}
