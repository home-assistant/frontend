import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-input/paper-input";

import "../../components/dialog/ha-paper-dialog";
import "../../components/ha-switch";

import { HomeAssistant } from "../../types";
import { ConfigEntrySystemOptionsDialogParams } from "./show-dialog-config-entry-system-options";
import {
  getConfigEntrySystemOptions,
  updateConfigEntrySystemOptions,
} from "../../data/config_entries";
import { PolymerChangedEvent } from "../../polymer-types";
import { haStyleDialog } from "../../resources/styles";
// tslint:disable-next-line: no-duplicate-imports
import { HaSwitch } from "../../components/ha-switch";

@customElement("dialog-config-entry-system-options")
class DialogConfigEntrySystemOptions extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _disableNewEntities!: boolean;
  @property() private _error?: string;
  @property() private _params?: ConfigEntrySystemOptionsDialogParams;
  @property() private _loading?: boolean;
  @property() private _submitting?: boolean;

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
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <h2>
          ${this.hass.localize(
            "ui.dialogs.config_entry_system_options.title",
            "integration",
            this.hass.localize(
              `component.${this._params.entry.domain}.config.title`
            ) || this._params.entry.domain
          )}
        </h2>
        <paper-dialog-scrollable>
          ${this._loading
            ? html`
                <div class="init-spinner">
                  <paper-spinner-lite active></paper-spinner-lite>
                </div>
              `
            : html`
                ${this._error
                  ? html`
                      <div class="error">${this._error}</div>
                    `
                  : ""}
                <div class="form">
                  <ha-switch
                    .checked=${!this._disableNewEntities}
                    @change=${this._disableNewEntitiesChanged}
                    .disabled=${this._submitting}
                  >
                    <div>
                      <p>
                        ${this.hass.localize(
                          "ui.dialogs.config_entry_system_options.enable_new_entities_label"
                        )}
                      </p>
                      <p class="secondary">
                        ${this.hass.localize(
                          "ui.dialogs.config_entry_system_options.enable_new_entities_description",
                          "integration",
                          this.hass.localize(
                            `component.${this._params.entry.domain}.config.title`
                          ) || this._params.entry.domain
                        )}
                      </p>
                    </div>
                  </ha-switch>
                </div>
              `}
        </paper-dialog-scrollable>
        ${!this._loading
          ? html`
              <div class="paper-dialog-buttons">
                <mwc-button
                  @click="${this._updateEntry}"
                  .disabled=${this._submitting}
                >
                  ${this.hass.localize(
                    "ui.panel.config.entities.editor.update"
                  )}
                </mwc-button>
              </div>
            `
          : ""}
      </ha-paper-dialog>
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

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!(ev.detail as any).value) {
      this._params = undefined;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog {
          min-width: 400px;
          max-width: 500px;
        }
        .init-spinner {
          padding: 50px 100px;
          text-align: center;
        }

        .form {
          padding-top: 6px;
          padding-bottom: 24px;
          color: var(--primary-text-color);
        }
        p {
          margin: 0;
        }
        .secondary {
          color: var(--secondary-text-color);
        }

        .error {
          color: var(--google-red-500);
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
