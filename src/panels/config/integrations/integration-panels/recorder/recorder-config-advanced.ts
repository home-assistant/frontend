import "@material/mwc-button";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../components/ha-card";
import { HaCheckbox } from "../../../../../components/ha-checkbox";
import "../../../../../components/ha-formfield";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { PolymerChangedEvent } from "../../../../../polymer-types";
import {
  RecorderConfig,
  updateRecorderConfig,
} from "../../../../../data/recorder";

@customElement("recorder-config-advanced")
class RecorderConfigAdvanced extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: RecorderConfig;

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      <ha-card header=${this.hass.localize(
        "ui.panel.config.recorder.header.advanced"
      )}>
        <div class="card-content">
          <ha-formfield
            label=${this.hass.localize("ui.panel.config.recorder.auto_purge")}>
            <ha-checkbox
              .checked=${this.config?.auto_purge}
              @change=${this._autoPurgeChanged}
            >
          </ha-formfield>
          
          <div class="row">
            <div class="flex">
              ${this.hass.localize("ui.panel.config.recorder.commit_interval")}
            </div>

            <paper-input
              class="flex"
              .label=${this.hass.localize(
                "ui.panel.config.recorder.commit_interval"
              )}
              name="commit_interval"
              type="number"
              .value=${this.config?.commit_interval}
              @value-changed=${this._handleChange}
            >
              <span slot="suffix">
                ${this.hass.localize("ui.duration.second", "count")}
              </span>
            </paper-input>
          </div>
          <div class="row">
            <div class="flex">
              ${this.hass.localize("ui.panel.config.recorder.db_retry_wait")}
            </div>

            <paper-input
              class="flex"
              .label=${this.hass.localize(
                "ui.panel.config.recorder.db_retry_wait"
              )}
              name="db_retry_wait"
              type="number"
              .value=${this.config?.db_retry_wait}
              @value-changed=${this._handleChange}
            >
              <span slot="suffix">
                ${this.hass.localize("ui.duration.second", "count")}
              </span>
            </paper-input>
          </div>
          <div class="row">
            <div class="flex">
              ${this.hass.localize("ui.panel.config.recorder.db_max_retries")}
            </div>

            <paper-input
              class="flex"
              .label=${this.hass.localize(
                "ui.panel.config.recorder.db_max_retries"
              )}
              name="db_max_retries"
              type="number"
              .value=${this.config?.db_max_retries}
              @value-changed=${this._handleChange}
            >
            </paper-input>
          </div>

        </div>
        <div class="card-actions">
          <mwc-button @click=${this._submit}>${this.hass.localize(
      "ui.common.save"
    )}</mwc-button>
        </div>
      </ha-card>
    `;
  }

  private _autoPurgeChanged(ev: Event): void {
    if (this.config) {
      this.config.auto_purge = (ev.target as HaCheckbox).checked;
    }
  }

  private _handleChange(ev: PolymerChangedEvent<string>) {
    const target = ev.currentTarget as PaperInputElement;
    if (this.config && target.name) {
      this.config[target.name] = target.value;
    }
  }

  private _submit(): void {
    if (!this.hass || !this.config) {
      return;
    }
    updateRecorderConfig(this.hass, {
      auto_purge: this.config.auto_purge,
      commit_interval: this.config.commit_interval,
      db_retry_wait: this.config.db_retry_wait,
      db_max_retries: this.config.db_max_retries,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
          display: block;
        }
        .card-actions {
          text-align: right;
        }
        .row {
          display: flex;
          flex-direction: row;
          align-items: center;
        }
        .flex {
          flex: 1;
        }
        .row > * {
          margin: 0 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "recorder-config-advanced": RecorderConfigAdvanced;
  }
}
