import "@material/mwc-button/mwc-button";
import "@material/mwc-linear-progress/mwc-linear-progress";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { BINARY_STATE_OFF } from "../../../common/const";
import { fireEvent } from "../../../common/dom/fire_event";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-checkbox";
import "../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-faded";
import "../../../components/ha-formfield";
import "../../../components/ha-markdown";
import {
  UpdateEntity,
  updateIsInstalling,
  updateReleaseNotes,
  UPDATE_SUPPORT_BACKUP,
  UPDATE_SUPPORT_PROGRESS,
  UPDATE_SUPPORT_RELEASE_NOTES,
  UPDATE_SUPPORT_SPECIFIC_VERSION,
} from "../../../data/update";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { UpdateDialogParams } from "./show-update-dialog";

@customElement("dialog-update")
class DialogUpdate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entity?: UpdateEntity;

  @state() private _releaseNotes?: string | null;

  @state() private _error?: string;

  @state() private _params?: UpdateDialogParams;

  public showDialog(params: UpdateDialogParams): void {
    this._params = params;
    this._entity = this._params.entity;

    if (supportsFeature(this._entity, UPDATE_SUPPORT_RELEASE_NOTES)) {
      updateReleaseNotes(this.hass, this._entity!.entity_id)
        .then((result) => {
          this._releaseNotes = result;
        })
        .catch((err) => {
          this._error = err.message;
        });
    }
  }

  public closeDialog() {
    this._params = undefined;
    this._entity = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._entity) {
      return html``;
    }

    const entity = this._entity;
    const skippedVersion =
      this._entity.attributes.latest_version &&
      this._entity.attributes.skipped_version ===
        this._entity.attributes.latest_version;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.updates.dialog.title", {
            entity_name:
              entity.attributes.title || entity.attributes.friendly_name,
          })
        )}
      >
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}
        <div class="latest_version">
          ${this.hass.localize(
            "ui.panel.config.updates.dialog.latest_version",
            {
              latest_version:
                entity.attributes.latest_version ??
                this.hass.localize("state.default.unavailable"),
            }
          )}
        </div>
        ${this._entity.attributes.in_progress
          ? supportsFeature(this._entity, UPDATE_SUPPORT_PROGRESS) &&
            typeof this._entity.attributes.in_progress === "number"
            ? html`<mwc-linear-progress
                .progress=${this._entity.attributes.in_progress / 100}
                buffer=""
              ></mwc-linear-progress>`
            : html`<mwc-linear-progress indeterminate></mwc-linear-progress>`
          : ""}
        ${supportsFeature(this._entity, UPDATE_SUPPORT_RELEASE_NOTES) &&
        !this._error
          ? this._releaseNotes === undefined
            ? html`<ha-circular-progress active></ha-circular-progress>`
            : html`
                <ha-faded>
                  <ha-markdown .content=${this._releaseNotes}></ha-markdown>
                </ha-faded>
              `
          : this._entity.attributes.release_summary
          ? html`
              <ha-markdown
                .content=${this._entity.attributes.release_summary}
              ></ha-markdown>
            `
          : ""}
        ${this._entity.attributes.release_url
          ? html`
              <div class="release_url">
                <a
                  href=${this._entity.attributes.release_url}
                  target="_blank"
                  rel="noreferrer"
                  class="button"
                >
                  ${this.hass.localize(
                    "ui.panel.config.updates.dialog.release_notes"
                  )}
                </a>
              </div>
            `
          : ""}
        ${supportsFeature(this._entity, UPDATE_SUPPORT_BACKUP)
          ? html`
              <div class="backup">
                <hr />
                <ha-formfield
                  .label=${this.hass.localize(
                    "ui.panel.config.updates.dialog.create_backup"
                  )}
                >
                  <ha-checkbox
                    checked
                    .disabled=${updateIsInstalling(this._entity)}
                  ></ha-checkbox>
                </ha-formfield>
              </div>
            `
          : ""}
        ${this._entity.attributes.auto_update
          ? ""
          : html`
              <mwc-button
                slot="secondaryAction"
                @click=${this._handleSkip}
                .disabled=${skippedVersion ||
                this._entity.state === BINARY_STATE_OFF ||
                updateIsInstalling(this._entity)}
              >
                ${this._entity.state === BINARY_STATE_OFF &&
                this._entity.attributes.skipped_version
                  ? this.hass.localize(
                      "ui.panel.config.updates.dialog.clear_skipped"
                    )
                  : this.hass.localize("ui.panel.config.updates.dialog.skip")}
              </mwc-button>
            `}
        <mwc-button
          slot="primaryAction"
          @click=${this._handleInstall}
          .disabled=${updateIsInstalling(this._entity)}
        >
          ${this.hass.localize("ui.panel.config.updates.dialog.update_now")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  get _shouldCreateBackup(): boolean | null {
    if (!supportsFeature(this._entity!, UPDATE_SUPPORT_BACKUP)) {
      return null;
    }
    const checkbox = this.shadowRoot?.querySelector("ha-checkbox");
    if (checkbox) {
      return checkbox.checked;
    }
    return true;
  }

  private _handleInstall(): void {
    const installData: Record<string, any> = {
      entity_id: this._entity!.entity_id,
    };

    if (this._shouldCreateBackup) {
      installData.backup = true;
    }

    if (
      supportsFeature(this._entity!, UPDATE_SUPPORT_SPECIFIC_VERSION) &&
      this._entity!.attributes.latest_version
    ) {
      installData.version = this._entity!.attributes.latest_version;
    }

    this.hass.callService("update", "install", installData);
  }

  private _handleSkip(): void {
    this.hass.callService("update", "skip", {
      entity_id: this._entity!.entity_id,
    });
  }

  static styles: CSSResultGroup = [
    haStyleDialog,
    haStyle,
    css`
      ha-expansion-panel,
      ha-markdown {
        margin: 16px 0;
      }
      .latest_version {
        font-weight: 500;
      }
      .backup {
        margin-top: 16px;
      }
      ha-circular-progress {
        width: 100%;
        justify-content: center;
      }
      mwc-linear-progress {
        margin-bottom: -10px;
        margin-top: -10px;
      }
      .release_url {
        text-align: center;
        margin: 16px 0;
      }
      a.button {
        display: inline-block;
        text-decoration: none;
        color: var(--primary-text-color);
        padding: 6px 16px;
        border-radius: 32px;
        border: 1px solid var(--divider-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-update": DialogUpdate;
  }
}
