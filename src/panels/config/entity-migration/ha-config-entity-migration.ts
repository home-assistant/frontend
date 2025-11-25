import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-spinner";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-alert";
import "../../../components/entity/ha-entity-picker";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import {
  scanEntityReferences,
  type ScanResult,
} from "../../../data/entity_migration";

@customElement("ha-config-entity-migration")
export class HaConfigEntityMigration extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _sourceEntityId?: string;

  @state() private _scanResult?: ScanResult;

  @state() private _loading = false;

  @state() private _error?: string;

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.entity_migration.caption"
        )}
        back-path="/config"
      >
        <div class="content">
          <ha-card>
            <div class="card-content">
              <h2>
                ${this.hass.localize(
                  "ui.panel.config.entity_migration.scan_title"
                )}
              </h2>
              <p class="description">
                ${this.hass.localize(
                  "ui.panel.config.entity_migration.scan_description"
                )}
              </p>

              <ha-entity-picker
                .hass=${this.hass}
                .value=${this._sourceEntityId}
                .label=${this.hass.localize(
                  "ui.panel.config.entity_migration.source_entity"
                )}
                @value-changed=${this._sourceChanged}
              ></ha-entity-picker>

              <ha-button
                raised
                .disabled=${!this._sourceEntityId || this._loading}
                @click=${this._scan}
              >
                ${this._loading
                  ? html`<ha-spinner size="small"></ha-spinner>`
                  : this.hass.localize(
                      "ui.panel.config.entity_migration.scan_button"
                    )}
              </ha-button>
            </div>
          </ha-card>

          ${this._error
            ? html` <ha-alert alert-type="error">${this._error}</ha-alert> `
            : nothing}
          ${this._scanResult ? this._renderResults() : nothing}
        </div>
      </hass-subpage>
    `;
  }

  private _renderResults() {
    if (!this._scanResult) return nothing;

    const { references, total_count } = this._scanResult;
    const categories = Object.entries(references);

    if (total_count === 0) {
      return html`
        <ha-card>
          <div class="card-content">
            <ha-alert alert-type="info">
              ${this.hass.localize(
                "ui.panel.config.entity_migration.no_references"
              )}
            </ha-alert>
          </div>
        </ha-card>
      `;
    }

    return html`
      <ha-card>
        <div class="card-content">
          <h2>
            ${this.hass.localize(
              "ui.panel.config.entity_migration.results_title",
              { count: total_count }
            )}
          </h2>

          ${categories.map(
            ([type, refs]) => html`
              <ha-expansion-panel
                .header=${this._getCategoryLabel(type)}
                .secondary=${this.hass.localize(
                  "ui.panel.config.entity_migration.reference_count",
                  { count: refs.length }
                )}
                .expanded=${refs.length > 0 && refs.length <= 5}
                outlined
              >
                <div class="references">
                  ${refs.map(
                    (ref) => html`
                      <div class="reference-item">
                        <span class="name">${ref.config_name}</span>
                        <span class="location">${ref.location}</span>
                      </div>
                    `
                  )}
                </div>
              </ha-expansion-panel>
            `
          )}
        </div>
      </ha-card>
    `;
  }

  private _getCategoryLabel(type: string): string {
    const key = `ui.panel.config.entity_migration.category_${type}`;
    const translated = this.hass.localize(key);
    // Fall back to capitalized type if no translation
    return translated !== key
      ? translated
      : type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
  }

  private _sourceChanged(ev: CustomEvent) {
    this._sourceEntityId = ev.detail.value;
    this._scanResult = undefined;
    this._error = undefined;
  }

  private async _scan() {
    if (!this._sourceEntityId) return;

    this._loading = true;
    this._error = undefined;
    this._scanResult = undefined;

    try {
      this._scanResult = await scanEntityReferences(
        this.hass,
        this._sourceEntityId
      );
    } catch (err: any) {
      this._error =
        err.message ||
        this.hass.localize("ui.panel.config.entity_migration.scan_error");
    } finally {
      this._loading = false;
    }
  }

  static styles: CSSResultGroup = css`
    .content {
      padding: var(--ha-space-4);
      max-width: 800px;
      margin: 0 auto;
    }

    ha-card {
      margin-bottom: var(--ha-space-4);
    }

    .card-content {
      padding: var(--ha-space-4);
    }

    h2 {
      margin: 0 0 var(--ha-space-2) 0;
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-medium);
    }

    .description {
      color: var(--secondary-text-color);
      margin-bottom: var(--ha-space-4);
    }

    ha-entity-picker {
      display: block;
      margin-bottom: var(--ha-space-4);
    }

    ha-button {
      margin-top: var(--ha-space-2);
    }

    ha-alert {
      display: block;
      margin-bottom: var(--ha-space-4);
    }

    ha-expansion-panel {
      margin-bottom: var(--ha-space-2);
    }

    .references {
      padding: var(--ha-space-2) 0;
    }

    .reference-item {
      padding: var(--ha-space-2) var(--ha-space-3);
      border-bottom: 1px solid var(--divider-color);
    }

    .reference-item:last-child {
      border-bottom: none;
    }

    .name {
      font-weight: var(--ha-font-weight-medium);
      display: block;
    }

    .location {
      display: block;
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }

    ha-spinner {
      --ha-spinner-size: 20px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-entity-migration": HaConfigEntityMigration;
  }
}
