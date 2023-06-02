import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { computeRTLDirection } from "../../common/util/compute_rtl";
import "../../components/ha-dialog";
import "../../components/ha-formfield";
import "../../components/ha-switch";
import type { HaSwitch } from "../../components/ha-switch";
import {
  ConfigEntryMutableParams,
  updateConfigEntry,
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

  @state() private _submitting = false;

  public async showDialog(
    params: ConfigEntrySystemOptionsDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._disableNewEntities = params.entry.pref_disable_new_entities;
    this._disablePolling = params.entry.pref_disable_polling;
  }

  public closeDialog(): void {
    this._error = "";
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
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
        ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
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
            dialogInitialFocus
          ></ha-switch>
        </ha-formfield>

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
        <mwc-button
          slot="secondaryAction"
          @click=${this.closeDialog}
          .disabled=${this._submitting}
        >
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          slot="primaryAction"
          @click=${this._updateEntry}
          .disabled=${this._submitting}
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

  private _disablePollingChanged(ev: Event): void {
    this._error = undefined;
    this._disablePolling = !(ev.target as HaSwitch).checked;
  }

  private async _updateEntry(): Promise<void> {
    this._submitting = true;
    const data: ConfigEntryMutableParams = {
      pref_disable_new_entities: this._disableNewEntities,
    };
    data.pref_disable_polling = this._disablePolling;
    try {
      const result = await updateConfigEntry(
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
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
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
