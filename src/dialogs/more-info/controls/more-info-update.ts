import "@material/mwc-button/mwc-button";
import "@material/mwc-linear-progress/mwc-linear-progress";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { BINARY_STATE_OFF } from "../../../common/const";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-alert";
import "../../../components/ha-checkbox";
import "../../../components/ha-circular-progress";
import "../../../components/ha-faded";
import "../../../components/ha-formfield";
import "../../../components/ha-markdown";
import { isUnavailableState } from "../../../data/entity";
import {
  UpdateEntity,
  updateIsInstalling,
  updateReleaseNotes,
  UPDATE_SUPPORT_BACKUP,
  UPDATE_SUPPORT_INSTALL,
  UPDATE_SUPPORT_PROGRESS,
  UPDATE_SUPPORT_RELEASE_NOTES,
  UPDATE_SUPPORT_SPECIFIC_VERSION,
} from "../../../data/update";
import type { HomeAssistant } from "../../../types";

@customElement("more-info-update")
class MoreInfoUpdate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: UpdateEntity;

  @state() private _releaseNotes?: string | null;

  @state() private _error?: string;

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
      ${this.stateObj.attributes.in_progress
        ? supportsFeature(this.stateObj, UPDATE_SUPPORT_PROGRESS) &&
          typeof this.stateObj.attributes.in_progress === "number"
          ? html`<mwc-linear-progress
              .progress=${this.stateObj.attributes.in_progress / 100}
              buffer=""
            ></mwc-linear-progress>`
          : html`<mwc-linear-progress indeterminate></mwc-linear-progress>`
        : ""}
      <h3>${this.stateObj.attributes.title}</h3>
      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : ""}
      <div class="row">
        <div class="key">
          ${this.hass.localize(
            "ui.dialogs.more_info_control.update.installed_version"
          )}
        </div>
        <div class="value">
          ${this.stateObj.attributes.installed_version ??
          this.hass.localize("state.default.unavailable")}
        </div>
      </div>
      <div class="row">
        <div class="key">
          ${this.hass.localize(
            "ui.dialogs.more_info_control.update.latest_version"
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
        : ""}
      ${supportsFeature(this.stateObj!, UPDATE_SUPPORT_RELEASE_NOTES) &&
      !this._error
        ? this._releaseNotes === undefined
          ? html`<ha-circular-progress active></ha-circular-progress>`
          : html`<hr />
              <ha-faded>
                <ha-markdown .content=${this._releaseNotes}></ha-markdown>
              </ha-faded> `
        : this.stateObj.attributes.release_summary
        ? html`<hr />
            <ha-markdown
              .content=${this.stateObj.attributes.release_summary}
            ></ha-markdown>`
        : ""}
      ${supportsFeature(this.stateObj, UPDATE_SUPPORT_BACKUP)
        ? html`<hr />
            <ha-formfield
              .label=${this.hass.localize(
                "ui.dialogs.more_info_control.update.create_backup"
              )}
            >
              <ha-checkbox
                checked
                .disabled=${updateIsInstalling(this.stateObj)}
              ></ha-checkbox>
            </ha-formfield> `
        : ""}
      <hr />
      <div class="actions">
        ${this.stateObj.attributes.auto_update
          ? ""
          : this.stateObj.state === BINARY_STATE_OFF &&
            this.stateObj.attributes.skipped_version
          ? html`
              <mwc-button @click=${this._handleClearSkipped}>
                ${this.hass.localize(
                  "ui.dialogs.more_info_control.update.clear_skipped"
                )}
              </mwc-button>
            `
          : html`
              <mwc-button
                @click=${this._handleSkip}
                .disabled=${skippedVersion ||
                this.stateObj.state === BINARY_STATE_OFF ||
                updateIsInstalling(this.stateObj)}
              >
                ${this.hass.localize(
                  "ui.dialogs.more_info_control.update.skip"
                )}
              </mwc-button>
            `}
        ${supportsFeature(this.stateObj, UPDATE_SUPPORT_INSTALL)
          ? html`
              <mwc-button
                @click=${this._handleInstall}
                .disabled=${(this.stateObj.state === BINARY_STATE_OFF &&
                  !skippedVersion) ||
                updateIsInstalling(this.stateObj)}
              >
                ${this.hass.localize(
                  "ui.dialogs.more_info_control.update.install"
                )}
              </mwc-button>
            `
          : ""}
      </div>
    `;
  }

  protected firstUpdated(): void {
    if (supportsFeature(this.stateObj!, UPDATE_SUPPORT_RELEASE_NOTES)) {
      updateReleaseNotes(this.hass, this.stateObj!.entity_id)
        .then((result) => {
          this._releaseNotes = result;
        })
        .catch((err) => {
          this._error = err.message;
        });
    }
  }

  get _shouldCreateBackup(): boolean | null {
    if (!supportsFeature(this.stateObj!, UPDATE_SUPPORT_BACKUP)) {
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
      entity_id: this.stateObj!.entity_id,
    };

    if (this._shouldCreateBackup) {
      installData.backup = true;
    }

    if (
      supportsFeature(this.stateObj!, UPDATE_SUPPORT_SPECIFIC_VERSION) &&
      this.stateObj!.attributes.latest_version
    ) {
      installData.version = this.stateObj!.attributes.latest_version;
    }

    this.hass.callService("update", "install", installData);
  }

  private _handleSkip(): void {
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
      .actions {
        margin: 8px 0 0;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
      }

      .actions mwc-button {
        margin: 0 4px 4px;
      }
      a {
        color: var(--primary-color);
      }
      ha-circular-progress {
        width: 100%;
        justify-content: center;
      }
      mwc-linear-progress {
        margin-bottom: -8px;
        margin-top: 4px;
      }
      ha-markdown {
        direction: ltr;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-update": MoreInfoUpdate;
  }
}
