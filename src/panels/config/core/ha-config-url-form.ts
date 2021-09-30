import "@material/mwc-button/mwc-button";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-card";
import { saveCoreConfig } from "../../../data/core";
import type { PolymerChangedEvent } from "../../../polymer-types";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-url-form")
class ConfigUrlForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _working = false;

  @state() private _external_url?: string;

  @state() private _internal_url?: string;

  protected render(): TemplateResult {
    const canEdit = ["storage", "default"].includes(
      this.hass.config.config_source
    );
    const disabled = this._working || !canEdit;

    if (!this.hass.userData?.showAdvanced) {
      return html``;
    }

    return html`
      <ha-card>
        <div class="card-content">
          ${!canEdit
            ? html`
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.core.section.core.core_config.edit_requires_storage"
                  )}
                </p>
              `
            : ""}
          ${this._error ? html`<div class="error">${this._error}</div>` : ""}
          <div class="row">
            <div class="flex">
              ${this.hass.localize(
                "ui.panel.config.core.section.core.core_config.external_url"
              )}
            </div>

            <paper-input
              class="flex"
              .label=${this.hass.localize(
                "ui.panel.config.core.section.core.core_config.external_url"
              )}
              name="external_url"
              type="url"
              .disabled=${disabled}
              .value=${this._externalUrlValue}
              @value-changed=${this._handleChange}
            >
            </paper-input>
          </div>

          <div class="row">
            <div class="flex">
              ${this.hass.localize(
                "ui.panel.config.core.section.core.core_config.internal_url"
              )}
            </div>
            <paper-input
              class="flex"
              .label=${this.hass.localize(
                "ui.panel.config.core.section.core.core_config.internal_url"
              )}
              name="internal_url"
              type="url"
              .disabled=${disabled}
              .value=${this._internalUrlValue}
              @value-changed=${this._handleChange}
            >
            </paper-input>
          </div>
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._save} .disabled=${disabled}>
            ${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.save_button"
            )}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  private get _internalUrlValue() {
    return this._internal_url !== undefined
      ? this._internal_url
      : this.hass.config.internal_url;
  }

  private get _externalUrlValue() {
    return this._external_url !== undefined
      ? this._external_url
      : this.hass.config.external_url;
  }

  private _handleChange(ev: PolymerChangedEvent<string>) {
    const target = ev.currentTarget as PaperInputElement;
    this[`_${target.name}`] = target.value;
  }

  private async _save() {
    this._working = true;
    this._error = undefined;
    try {
      await saveCoreConfig(this.hass, {
        external_url: this._external_url || null,
        internal_url: this._internal_url || null,
      });
    } catch (err: any) {
      this._error = err.message || err;
    } finally {
      this._working = false;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .row {
        display: flex;
        flex-direction: row;
        margin: 0 -8px;
        align-items: center;
      }

      .secondary {
        color: var(--secondary-text-color);
      }

      .flex {
        flex: 1;
      }

      .row > * {
        margin: 0 8px;
      }
      .error {
        color: var(--error-color);
      }

      .card-actions {
        text-align: right;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-url-form": ConfigUrlForm;
  }
}
