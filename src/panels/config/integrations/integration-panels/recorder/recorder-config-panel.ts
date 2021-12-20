import "@material/mwc-button";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-code-editor";
import "../../../../../components/ha-formfield";
import "../../../../../components/entity/ha-entities-picker";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { PolymerChangedEvent } from "../../../../../polymer-types";
import "./recorder-filter-card";
import {
  fetchRecorderConfig,
  RecorderConfig,
  updateRecorderConfig,
} from "../../../../../data/recorder";

@customElement("recorder-config-panel")
class RecorderConfigPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _config?: RecorderConfig;

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      <hass-subpage .narrow=${this.narrow} .hass=${this.hass}>
        <div class="content">
          <ha-card header="Recorder settings">
            <div class="card-content">
              <div class="row">
                <div class="flex">
                  ${this.hass.localize(
                    "ui.panel.config.recorder.purge_keep_days"
                  )}
                </div>

                <paper-input
                  class="flex"
                  .label=${this.hass.localize(
                    "ui.panel.config.recorder.purge_keep_days"
                  )}
                  name="purge_keep_days"
                  type="number"
                  .value=${this._config?.purge_keep_days}
                  @value-changed=${this._handleChange}
                >
                  <span slot="suffix">
                    ${this.hass.localize("ui.duration.day", "count")}
                  </span>
                </paper-input>
              </div>
              <div class="row">
                <div class="flex">
                  ${this.hass.localize(
                    "ui.panel.config.recorder.commit_interval"
                  )}
                </div>

                <paper-input
                  class="flex"
                  .label=${this.hass.localize(
                    "ui.panel.config.recorder.commit_interval"
                  )}
                  name="commit_interval"
                  type="number"
                  .value=${this._config?.commit_interval}
                  @value-changed=${this._handleChange}
                >
                  <span slot="suffix">
                    ${this.hass.localize("ui.duration.second", "count")}
                  </span>
                </paper-input>
              </div>
            </div>
            <div class="card-actions">
              <mwc-button @click=${this._submit}>Save / Update</mwc-button>
            </div>
          </ha-card>

          <recorder-filter-card
            .hass=${this.hass}
            .filter=${this._config?.include}
            name="include"
            header="Include entities"
            hasAll
          ></recorder-filter-card>

          <recorder-filter-card
            .hass=${this.hass}
            .filter=${this._config?.exclude}
            name="exclude"
            header="Exclude entities"
          ></recorder-filter-card>
        </div>
      </hass-subpage>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._fetchData();
  }

  private async _fetchData() {
    this._config = await fetchRecorderConfig(this.hass);
  }

  private _handleChange(ev: PolymerChangedEvent<string>) {
    const target = ev.currentTarget as PaperInputElement;
    if (this._config && target.name) {
      this._config[target.name] = target.value;
    }
  }

  private _submit(): void {
    if (!this.hass || !this._config) {
      return;
    }
    updateRecorderConfig(this.hass, {
      commit_interval: this._config.commit_interval,
      purge_keep_days: this._config.purge_keep_days,
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
        }

        .content {
          padding: 24px 0 32px;
          max-width: 600px;
          margin: 0 auto;
          direction: ltr;
        }
        ha-card,
        recorder-filter-card {
          margin-bottom: 16px;
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
    "recorder-config-panel": RecorderConfigPanel;
  }
}
