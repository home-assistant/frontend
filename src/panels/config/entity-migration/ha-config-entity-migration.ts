import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { LocalizeKeys } from "../../../common/translations/localize";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-spinner";
import "../../../components/entity/ha-entity-picker";
import {
  scanEntityReferences,
  validateMigrationCompatibility,
  type CompatibilityResult,
  type MigrationResult,
  type ScanResult,
} from "../../../data/entity_migration";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import { showToast } from "../../../util/toast";
import { showEntityMigrationPreviewDialog } from "./show-entity-migration-preview-dialog";

@customElement("ha-config-entity-migration")
export class HaConfigEntityMigration extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _sourceEntityId?: string;

  @state() private _targetEntityId?: string;

  @state() private _scanResult?: ScanResult;

  @state() private _compatibilityResult?: CompatibilityResult;

  @state() private _migrationResult?: MigrationResult;

  @state() private _loading = false;

  @state() private _validating = false;

  @state() private _error?: string;

  protected render() {
    const sourceDomain = this._sourceEntityId
      ? computeDomain(this._sourceEntityId)
      : undefined;

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

              <ha-entity-picker
                .hass=${this.hass}
                .value=${this._targetEntityId}
                .label=${this.hass.localize(
                  "ui.panel.config.entity_migration.target_entity"
                )}
                .includeDomains=${sourceDomain ? [sourceDomain] : undefined}
                .excludeEntities=${this._sourceEntityId
                  ? [this._sourceEntityId]
                  : undefined}
                @value-changed=${this._targetChanged}
              ></ha-entity-picker>

              <div class="button-row">
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

                <ha-button
                  raised
                  .disabled=${!this._canMigrate()}
                  @click=${this._showPreview}
                >
                  ${this._validating
                    ? html`<ha-spinner size="small"></ha-spinner>`
                    : this.hass.localize(
                        "ui.panel.config.entity_migration.preview_button"
                      )}
                </ha-button>
              </div>
            </div>
          </ha-card>

          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing}
          ${this._renderCompatibilityWarnings()}
          ${this._scanResult ? this._renderResults() : nothing}
          ${this._migrationResult ? this._renderMigrationResult() : nothing}
        </div>
      </hass-subpage>
    `;
  }

  private _renderCompatibilityWarnings() {
    if (!this._compatibilityResult) return nothing;

    const { warnings, blocking_errors } = this._compatibilityResult;

    if (blocking_errors.length === 0 && warnings.length === 0) {
      return nothing;
    }

    return html`
      ${blocking_errors.length > 0
        ? html`
            <ha-alert alert-type="error">
              ${this.hass.localize(
                "ui.panel.config.entity_migration.migration_blocked"
              )}
              <ul>
                ${blocking_errors.map((error) => html`<li>${error}</li>`)}
              </ul>
            </ha-alert>
          `
        : nothing}
      ${warnings.length > 0
        ? html`
            <ha-alert alert-type="warning">
              ${this.hass.localize(
                "ui.panel.config.entity_migration.compatibility_warnings"
              )}
              <ul>
                ${warnings.map((warning) => html`<li>${warning.message}</li>`)}
              </ul>
            </ha-alert>
          `
        : nothing}
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

  private _renderMigrationResult() {
    if (!this._migrationResult) return nothing;

    const { success, updated_count, updated, errors, backup_path } =
      this._migrationResult;

    if (!success) {
      return html`
        <ha-card>
          <div class="card-content">
            <ha-alert alert-type="error">
              ${this.hass.localize(
                "ui.panel.config.entity_migration.migration_failed"
              )}
              ${errors.length > 0
                ? html`
                    <ul>
                      ${errors.map(
                        (err) =>
                          html`<li>${err.config_type}: ${err.message}</li>`
                      )}
                    </ul>
                  `
                : nothing}
            </ha-alert>
          </div>
        </ha-card>
      `;
    }

    const categories = Object.entries(updated);

    return html`
      <ha-card>
        <div class="card-content">
          <ha-alert alert-type="success">
            ${this.hass.localize(
              "ui.panel.config.entity_migration.migration_success",
              { count: updated_count }
            )}
            ${backup_path
              ? html`<br /><small
                    >${this.hass.localize(
                      "ui.panel.config.entity_migration.backup_created"
                    )}</small
                  >`
              : nothing}
          </ha-alert>

          ${categories.length > 0
            ? html`
                <h3>
                  ${this.hass.localize(
                    "ui.panel.config.entity_migration.updated_configs"
                  )}
                </h3>
                ${categories.map(
                  ([type, ids]) => html`
                    <ha-expansion-panel
                      .header=${this._getCategoryLabel(type)}
                      .secondary=${this.hass.localize(
                        "ui.panel.config.entity_migration.reference_count",
                        { count: ids.length }
                      )}
                      outlined
                    >
                      <div class="references">
                        ${ids.map(
                          (id) => html`
                            <div class="reference-item">
                              <span class="name">${id}</span>
                            </div>
                          `
                        )}
                      </div>
                    </ha-expansion-panel>
                  `
                )}
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  private _getCategoryLabel(type: string): string {
    const key =
      `ui.panel.config.entity_migration.category_${type}` as LocalizeKeys;
    const translated = this.hass.localize(key);
    return translated !== key
      ? translated
      : type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
  }

  private _canMigrate(): boolean {
    return Boolean(
      this._sourceEntityId &&
        this._targetEntityId &&
        this._scanResult &&
        this._scanResult.total_count > 0 &&
        !this._loading &&
        !this._validating &&
        this._compatibilityResult &&
        this._compatibilityResult.blocking_errors.length === 0
    );
  }

  private _sourceChanged(ev: CustomEvent) {
    this._sourceEntityId = ev.detail.value;
    this._scanResult = undefined;
    this._compatibilityResult = undefined;
    this._migrationResult = undefined;
    this._error = undefined;
    this._validateIfBothSelected();
  }

  private _targetChanged(ev: CustomEvent) {
    this._targetEntityId = ev.detail.value;
    this._compatibilityResult = undefined;
    this._migrationResult = undefined;
    this._error = undefined;
    this._validateIfBothSelected();
  }

  private async _validateIfBothSelected() {
    if (!this._sourceEntityId || !this._targetEntityId) {
      this._compatibilityResult = undefined;
      return;
    }

    this._validating = true;
    try {
      this._compatibilityResult = await validateMigrationCompatibility(
        this.hass,
        this._sourceEntityId,
        this._targetEntityId
      );
    } catch (err: unknown) {
      // Validation errors are shown in the UI
      this._compatibilityResult = {
        compatible: false,
        warnings: [],
        blocking_errors: [(err as Error).message],
      };
    } finally {
      this._validating = false;
    }
  }

  private async _scan() {
    if (!this._sourceEntityId) return;

    this._loading = true;
    this._error = undefined;
    this._scanResult = undefined;
    this._migrationResult = undefined;

    try {
      this._scanResult = await scanEntityReferences(
        this.hass,
        this._sourceEntityId
      );
    } catch (err: unknown) {
      this._error =
        (err as Error).message ||
        this.hass.localize("ui.panel.config.entity_migration.scan_error");
    } finally {
      this._loading = false;
    }
  }

  private async _showPreview() {
    if (
      !this._sourceEntityId ||
      !this._targetEntityId ||
      !this._scanResult ||
      !this._compatibilityResult
    ) {
      return;
    }

    showEntityMigrationPreviewDialog(this, {
      sourceEntityId: this._sourceEntityId,
      targetEntityId: this._targetEntityId,
      scanResult: this._scanResult,
      compatibilityResult: this._compatibilityResult,
      onMigrationComplete: (result) => {
        this._migrationResult = result;
        this._scanResult = undefined;

        showToast(this, {
          message: this.hass.localize(
            "ui.panel.config.entity_migration.migration_success",
            { count: result.updated_count }
          ),
        });
      },
    });
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

    h3 {
      margin: var(--ha-space-4) 0 var(--ha-space-2) 0;
      font-size: var(--ha-font-size-l);
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

    .button-row {
      display: flex;
      gap: var(--ha-space-2);
      margin-top: var(--ha-space-2);
    }

    ha-alert {
      display: block;
      margin-bottom: var(--ha-space-4);
    }

    ha-alert ul {
      margin: var(--ha-space-2) 0 0 0;
      padding-left: var(--ha-space-5);
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
