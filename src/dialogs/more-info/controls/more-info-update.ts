import "@material/mwc-button/mwc-button";
import "@material/mwc-linear-progress/mwc-linear-progress";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-checkbox";
import "../../../components/ha-formfield";
import "../../../components/ha-markdown";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import {
  updateIsInstalling,
  UpdateEntity,
  UPDATE_SUPPORT_BACKUP,
  UPDATE_SUPPORT_INSTALL,
  UPDATE_SUPPORT_PROGRESS,
  UPDATE_SUPPORT_SPECIFIC_VERSION,
} from "../../../data/update";
import type { HomeAssistant } from "../../../types";

@customElement("more-info-update")
class MoreInfoUpdate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: UpdateEntity;

  protected render(): TemplateResult {
    if (
      !this.hass ||
      !this.stateObj ||
      UNAVAILABLE_STATES.includes(this.stateObj.state)
    ) {
      return html``;
    }

    const skippedVersion =
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
      <div class="row">
        <div class="key">
          ${this.hass.localize(
            "ui.dialogs.more_info_control.update.current_version"
          )}
        </div>
        <div class="value">${this.stateObj.attributes.current_version}</div>
      </div>
      <div class="row">
        <div class="key">
          ${this.hass.localize(
            "ui.dialogs.more_info_control.update.latest_version"
          )}
        </div>
        <div class="value">${this.stateObj.attributes.latest_version}</div>
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
                  "ui.dialogs.more_info_control.update.full_changelog"
                )}
              </a>
            </div>
          </div>`
        : ""}
      ${this.stateObj.attributes.release_summary
        ? html`<hr />
            <ha-markdown
              .content=${this.stateObj.attributes.release_summary}
            ></ha-markdown> `
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
        <mwc-button
          @click=${this._handleSkip}
          .disabled=${skippedVersion ||
          this.stateObj.state === "off" ||
          updateIsInstalling(this.stateObj)}
        >
          ${this.hass.localize("ui.dialogs.more_info_control.update.skip")}
        </mwc-button>
        ${supportsFeature(this.stateObj, UPDATE_SUPPORT_INSTALL)
          ? html`
              <mwc-button
                @click=${this._handleInstall}
                .disabled=${(this.stateObj.state === "off" &&
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
    this.hass.callService("update", "install", {
      entity_id: this.stateObj!.entity_id,
      backup: this._shouldCreateBackup,
      version: supportsFeature(this.stateObj!, UPDATE_SUPPORT_SPECIFIC_VERSION)
        ? this.stateObj!.attributes.latest_version
        : null,
    });
  }

  private _handleSkip(): void {
    this.hass.callService("update", "skip", {
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-update": MoreInfoUpdate;
  }
}
