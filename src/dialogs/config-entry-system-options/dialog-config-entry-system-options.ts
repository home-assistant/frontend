import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { computeRTLDirection } from "../../common/util/compute_rtl";
import "../../components/ha-circular-progress";
import "../../components/ha-dialog";
import "../../components/ha-formfield";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import {
  getConfigEntrySystemOptions,
  updateConfigEntrySystemOptions,
} from "../../data/config_entries";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { showAlertDialog } from "../generic/show-dialog-box";
import { ConfigEntrySystemOptionsDialogParams } from "./show-dialog-config-entry-system-options";

@customElement("dialog-config-entry-system-options")
class DialogConfigEntrySystemOptions extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _disableNewEntities!: boolean;

  @state() private _disablePolling!: boolean;

  @state() private _error?: string;

  @state() private _params?: ConfigEntrySystemOptionsDialogParams;

  @state() private _loading = false;

  @state() private _submitting = false;

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
    this._disableNewEntities = systemOptions.disable_new_entities;
    this._disablePolling = systemOptions.disable_polling;
    this._loading = false;
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
                    ></ha-switch>
                  </ha-formfield>
                  ${this._allowUpdatePolling()
                    ? html`
                        <ha-formfield
                          .label=${html`<p>
                              ${this.hass.localize(
                                "ui.dialogs.config_entry_system_options.enable_polling_label"
                              )}
                            </p>
                            <p class="secondary">
                              ${this.hass.localize(
                                "ui.dialogs.config_entry_system_options.enable_polling_description",
                                "integration",
                                this.hass.localize(
                                  `component.${this._params.entry.domain}.title`
                                ) || this._params.entry.domain
                              )}
                            </p>`}
                          .dir=${computeRTLDirection(this.hass)}
                        >
                          <ha-switch
                            .checked=${!this._disablePolling}
                            @change=${this._disablePollingChanged}
                            .disabled=${this._submitting}
                          ></ha-switch>
                        </ha-formfield>
                      `
                    : ""}
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

  private _allowUpdatePolling() {
    return (
      this._params!.manifest &&
      (this._params!.manifest.iot_class === "local_polling" ||
        this._params!.manifest.iot_class === "cloud_polling")
    );
  }

  private _disableNewEntitiesChanged(ev: Event): void {
    this._error = undefined;
    this._disableNewEntities = !(ev.target as HaSwitch).checked;
  }

  private _disablePollingChanged(ev: Event): void {
    this._error = undefined;
    this._disablePolling = !(ev.target as HaSwitch).checked;
  }

  private async _updateEntry(): Promise<void> {
    this._submitting = true;
    const data: Parameters<typeof updateConfigEntrySystemOptions>[2] = {
      disable_new_entities: this._disableNewEntities,
    };
    if (this._allowUpdatePolling()) {
      data.disable_polling = this._disablePolling;
    }
    try {
      const result = await updateConfigEntrySystemOptions(
        this.hass,
        this._params!.entry.entry_id,
        data
      );
      if (result.require_restart) {
        await showAlertDialog(this, {
          text: this.hass.localize(
            "ui.dialogs.config_entry_system_options.restart_home_assistant"
          ),
        });
      }
      this._params = undefined;
    } catch (err) {
      this._error = err.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
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
