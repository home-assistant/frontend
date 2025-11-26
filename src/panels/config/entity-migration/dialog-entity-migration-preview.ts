import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LocalizeKeys } from "../../../common/translations/localize";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-checkbox";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-formfield";
import "../../../components/ha-spinner";
import "../../../components/ha-wa-dialog";
import {
  migrateEntityReferences,
  type MigrationResult,
} from "../../../data/entity_migration";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { EntityMigrationPreviewDialogParams } from "./show-entity-migration-preview-dialog";

@customElement("dialog-entity-migration-preview")
class DialogEntityMigrationPreview extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EntityMigrationPreviewDialogParams;

  @state() private _open = false;

  @state() private _createBackup = true;

  @state() private _migrating = false;

  @state() private _error?: string;

  public showDialog(params: EntityMigrationPreviewDialogParams): void {
    this._params = params;
    this._open = true;
    this._createBackup = true;
    this._migrating = false;
    this._error = undefined;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const { scanResult, compatibilityResult, sourceEntityId, targetEntityId } =
      this._params;
    const hasBlockingErrors = compatibilityResult.blocking_errors.length > 0;
    const hasWarnings = compatibilityResult.warnings.length > 0;
    const categories = Object.entries(scanResult.references);

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.entity_migration.preview_title"
        )}
        @closed=${this._dialogClosed}
      >
        <span slot="headerSubtitle">
          ${sourceEntityId} → ${targetEntityId}
        </span>

        <div class="dialog-content">
          ${hasBlockingErrors
            ? html`
                <ha-alert alert-type="error">
                  ${this.hass.localize(
                    "ui.panel.config.entity_migration.migration_blocked"
                  )}
                  <ul>
                    ${compatibilityResult.blocking_errors.map(
                      (error) => html`<li>${error}</li>`
                    )}
                  </ul>
                </ha-alert>
              `
            : nothing}
          ${hasWarnings
            ? html`
                <ha-alert alert-type="warning">
                  ${this.hass.localize(
                    "ui.panel.config.entity_migration.compatibility_warnings"
                  )}
                  <ul>
                    ${compatibilityResult.warnings.map(
                      (warning) => html`<li>${warning.message}</li>`
                    )}
                  </ul>
                </ha-alert>
              `
            : nothing}
          ${this._error
            ? html` <ha-alert alert-type="error"> ${this._error} </ha-alert> `
            : nothing}

          <p class="summary">
            ${this.hass.localize(
              "ui.panel.config.entity_migration.preview_summary",
              { count: scanResult.total_count }
            )}
          </p>

          ${categories.map(
            ([type, refs]) => html`
              <ha-expansion-panel
                .header=${this._getCategoryLabel(type)}
                .secondary=${this.hass.localize(
                  "ui.panel.config.entity_migration.reference_count",
                  { count: refs.length }
                )}
                .expanded=${refs.length > 0 && refs.length <= 3}
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
          ${!hasBlockingErrors
            ? html`
                <ha-formfield
                  .label=${this.hass.localize(
                    "ui.panel.config.entity_migration.create_backup"
                  )}
                >
                  <ha-checkbox
                    .checked=${this._createBackup}
                    @change=${this._backupChanged}
                  ></ha-checkbox>
                </ha-formfield>
              `
            : nothing}
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            .disabled=${this._migrating}
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            .disabled=${hasBlockingErrors || this._migrating}
            @click=${this._migrate}
          >
            ${this._migrating
              ? html`<ha-spinner size="small"></ha-spinner>`
              : this.hass.localize(
                  "ui.panel.config.entity_migration.migrate_button"
                )}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
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

  private _backupChanged(ev: Event): void {
    const checkbox = ev.currentTarget as HTMLInputElement;
    this._createBackup = checkbox.checked;
  }

  private async _migrate(): Promise<void> {
    if (!this._params) return;

    this._migrating = true;
    this._error = undefined;

    try {
      const result: MigrationResult = await migrateEntityReferences(
        this.hass,
        this._params.sourceEntityId,
        this._params.targetEntityId,
        {
          dry_run: false,
          create_backup: this._createBackup,
        }
      );

      if (result.success) {
        this._params.onMigrationComplete?.(result);
        this.closeDialog();
      } else {
        this._error = this.hass.localize(
          "ui.panel.config.entity_migration.migration_failed"
        );
        if (result.errors.length > 0) {
          this._error += ": " + result.errors.map((e) => e.message).join(", ");
        }
      }
    } catch (err: unknown) {
      this._error =
        (err as Error).message ||
        this.hass.localize("ui.panel.config.entity_migration.migration_failed");
    } finally {
      this._migrating = false;
    }
  }

  static styles: CSSResultGroup = [
    haStyleDialog,
    css`
      .dialog-content {
        padding-top: 0;
      }

      ha-alert {
        display: block;
        margin-bottom: var(--ha-space-4);
      }

      ha-alert ul {
        margin: var(--ha-space-2) 0 0 0;
        padding-left: var(--ha-space-5);
      }

      .summary {
        margin: 0 0 var(--ha-space-4) 0;
        color: var(--secondary-text-color);
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

      ha-formfield {
        display: block;
        margin-top: var(--ha-space-4);
      }

      ha-spinner {
        --ha-spinner-size: 20px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-entity-migration-preview": DialogEntityMigrationPreview;
  }
}
