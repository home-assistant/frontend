import "@material/mwc-linear-progress/mwc-linear-progress";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { BINARY_STATE_OFF } from "../../../common/const";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-checkbox";
import "../../../components/ha-circular-progress";
import "../../../components/ha-faded";
import "../../../components/ha-formfield";
import "../../../components/ha-markdown";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import { isUnavailableState } from "../../../data/entity";
import {
  UpdateEntity,
  UpdateEntityFeature,
  updateIsInstalling,
  updateReleaseNotes,
} from "../../../data/update";
import type { HomeAssistant } from "../../../types";
import { showAlertDialog } from "../../generic/show-dialog-box";

@customElement("more-info-update")
class MoreInfoUpdate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: UpdateEntity;

  @state() private _releaseNotes?: string | null;

  @state() private _error?: string;

  @state() private _markdownLoading = true;

  protected render() {
    if (
      !this.hass ||
      !this.stateObj ||
      isUnavailableState(this.stateObj.state)
    ) {
      return nothing;
    }

    const skippedVersion =
      this.stateObj.attributes.latest_version &&
      this.stateObj.attributes.skipped_version ===
        this.stateObj.attributes.latest_version;

    return html`
      <div class="content">
        ${this.stateObj.attributes.in_progress
          ? supportsFeature(this.stateObj, UpdateEntityFeature.PROGRESS) &&
            this.stateObj.attributes.update_percentage !== null
            ? html`<mwc-linear-progress
                .progress=${this.stateObj.attributes.update_percentage / 100}
                buffer=""
              ></mwc-linear-progress>`
            : html`<mwc-linear-progress indeterminate></mwc-linear-progress>`
          : nothing}
        <h3>${this.stateObj.attributes.title}</h3>
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}
        <div class="row">
          <div class="key">
            ${this.hass.formatEntityAttributeName(
              this.stateObj,
              "installed_version"
            )}
          </div>
          <div class="value">
            ${this.stateObj.attributes.installed_version ??
            this.hass.localize("state.default.unavailable")}
          </div>
        </div>
        <div class="row">
          <div class="key">
            ${this.hass.formatEntityAttributeName(
              this.stateObj,
              "latest_version"
            )}
          </div>
          <div class="value">
            ${this.stateObj.attributes.latest_version ??
            this.hass.localize("state.default.unavailable")}
          </div>
        </div>

        ${this.stateObj.attributes.release_url
          ? html`<div class="row">
              <div class="key">
                <a
                  href=${this.stateObj.attributes.release_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  ${this.hass.localize(
                    "ui.dialogs.more_info_control.update.release_announcement"
                  )}
                </a>
              </div>
            </div>`
          : nothing}
        ${supportsFeature(this.stateObj!, UpdateEntityFeature.RELEASE_NOTES) &&
        !this._error
          ? this._releaseNotes === undefined
            ? html`
                <hr />
                ${this._markdownLoading ? this._renderLoader() : nothing}
              `
            : html`
                <hr />
                <ha-markdown
                  @content-resize=${this._markdownLoaded}
                  .content=${this._releaseNotes}
                  class=${this._markdownLoading ? "hidden" : ""}
                ></ha-markdown>
                ${this._markdownLoading ? this._renderLoader() : nothing}
              `
          : this.stateObj.attributes.release_summary
            ? html`
                <hr />
                <ha-markdown
                  @content-resize=${this._markdownLoaded}
                  .content=${this.stateObj.attributes.release_summary}
                  class=${this._markdownLoading ? "hidden" : ""}
                ></ha-markdown>
                ${this._markdownLoading ? this._renderLoader() : nothing}
              `
            : nothing}
      </div>
      <div class="footer">
        ${supportsFeature(this.stateObj, UpdateEntityFeature.BACKUP)
          ? html`
              <ha-settings-row>
                <span slot="heading">
                  ${this.hass.localize(
                    "ui.dialogs.more_info_control.update.create_backup"
                  )}
                </span>
                <ha-switch
                  id="create_backup"
                  checked
                  .disabled=${updateIsInstalling(this.stateObj)}
                ></ha-switch>
              </ha-settings-row>
            `
          : nothing}
        <div class="actions">
          ${this.stateObj.state === BINARY_STATE_OFF &&
          this.stateObj.attributes.skipped_version
            ? html`
                <ha-button @click=${this._handleClearSkipped}>
                  ${this.hass.localize(
                    "ui.dialogs.more_info_control.update.clear_skipped"
                  )}
                </ha-button>
              `
            : html`
                <ha-button
                  @click=${this._handleSkip}
                  .disabled=${skippedVersion ||
                  this.stateObj.state === BINARY_STATE_OFF ||
                  updateIsInstalling(this.stateObj)}
                >
                  ${this.hass.localize(
                    "ui.dialogs.more_info_control.update.skip"
                  )}
                </ha-button>
              `}
          ${supportsFeature(this.stateObj, UpdateEntityFeature.INSTALL)
            ? html`
                <ha-button
                  @click=${this._handleInstall}
                  .disabled=${(this.stateObj.state === BINARY_STATE_OFF &&
                    !skippedVersion) ||
                  updateIsInstalling(this.stateObj)}
                >
                  ${this.hass.localize(
                    "ui.dialogs.more_info_control.update.update"
                  )}
                </ha-button>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderLoader() {
    return html`
      <div class="flex center loader">
        <ha-circular-progress indeterminate></ha-circular-progress>
      </div>
    `;
  }

  protected firstUpdated(): void {
    if (supportsFeature(this.stateObj!, UpdateEntityFeature.RELEASE_NOTES)) {
      this._fetchReleaseNotes();
    }
  }

  private async _markdownLoaded() {
    if (this._markdownLoading) {
      this._markdownLoading = false;
    }
  }

  private async _fetchReleaseNotes() {
    try {
      this._releaseNotes = await updateReleaseNotes(
        this.hass,
        this.stateObj!.entity_id
      );
    } catch (err: any) {
      this._error = err.message;
    }
  }

  get _shouldCreateBackup(): boolean | null {
    if (!supportsFeature(this.stateObj!, UpdateEntityFeature.BACKUP)) {
      return null;
    }
    const createBackupSwitch = this.shadowRoot?.getElementById(
      "create-backup"
    ) as HaSwitch;
    if (createBackupSwitch) {
      return createBackupSwitch.checked;
    }
    return true;
  }

  private _handleInstall(): void {
    const installData: Record<string, any> = {
      entity_id: this.stateObj!.entity_id,
    };

    if (this._shouldCreateBackup) {
      installData.backup = true;
    }

    if (
      supportsFeature(this.stateObj!, UpdateEntityFeature.SPECIFIC_VERSION) &&
      this.stateObj!.attributes.latest_version
    ) {
      installData.version = this.stateObj!.attributes.latest_version;
    }

    this.hass.callService("update", "install", installData);
  }

  private _handleSkip(): void {
    if (this.stateObj!.attributes.auto_update) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.dialogs.more_info_control.update.auto_update_enabled_title"
        ),
        text: this.hass.localize(
          "ui.dialogs.more_info_control.update.auto_update_enabled_text"
        ),
      });
      return;
    }
    this.hass.callService("update", "skip", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _handleClearSkipped(): void {
    this.hass.callService("update", "clear_skipped", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        justify-content: space-between;
      }
      hr {
        border-color: var(--divider-color);
        border-bottom: none;
        margin: 16px 0;
      }
      ha-expansion-panel {
        margin: 16px 0;
      }
      .row {
        margin: 0;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
      }

      .footer {
        border-top: 1px solid var(--divider-color);
        background: var(
          --ha-dialog-surface-background,
          var(--mdc-theme-surface, #fff)
        );
        position: sticky;
        bottom: 0;
        margin: 0 -24px -24px -24px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden;
        z-index: 10;
      }

      ha-settings-row {
        width: 100%;
        padding: 0 24px;
        box-sizing: border-box;
        margin-bottom: -16px;
        margin-top: -4px;
      }

      .actions {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: flex-end;
        box-sizing: border-box;
        padding: 12px;
        z-index: 1;
        gap: 8px;
      }

      a {
        color: var(--primary-color);
      }
      .flex.center {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      mwc-linear-progress {
        margin-bottom: -8px;
        margin-top: 4px;
      }
      ha-markdown {
        direction: ltr;
        padding-bottom: 16px;
        box-sizing: border-box;
      }
      ha-markdown.hidden {
        display: none;
      }
      .loader {
        height: 80px;
        box-sizing: border-box;
        padding-bottom: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-update": MoreInfoUpdate;
  }
}
