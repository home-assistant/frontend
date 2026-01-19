import {
  css,
  type CSSResultGroup,
  html,
  LitElement,
  nothing,
  type PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { atLeastVersion } from "../../../../../common/config/version";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-faded";
import "../../../../../components/ha-markdown";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-switch";
import type { HaSwitch } from "../../../../../components/ha-switch";
import type { HassioAddonDetails } from "../../../../../data/hassio/addon";
import {
  fetchHassioAddonChangelog,
  updateHassioAddon,
} from "../../../../../data/hassio/addon";
import {
  extractApiErrorMessage,
  ignoreSupervisorError,
} from "../../../../../data/hassio/common";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { extractChangelog } from "../util/supervisor-app";

declare global {
  interface HASSDomEvents {
    "update-complete": undefined;
  }
}

@customElement("supervisor-app-update-available-card")
class SupervisorAppUpdateAvailableCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @state() private _changelogContent?: string;

  @state() private _updating = false;

  @state() private _error?: string;

  protected render() {
    if (!this.addon) {
      return nothing;
    }

    const createBackupTexts = this._computeCreateBackupTexts();

    return html`
      <ha-card
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.apps.dashboard.update_available.update_name",
          {
            name: this.addon.name,
          }
        )}
      >
        <div class="card-content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          ${this.addon.version === this.addon.version_latest
            ? html`<p>
                ${this.hass.localize(
                  "ui.panel.config.apps.dashboard.update_available.no_update",
                  {
                    name: this.addon.name,
                  }
                )}
              </p>`
            : !this._updating
              ? html`
                  ${this._changelogContent
                    ? html`
                        <ha-faded>
                          <ha-markdown .content=${this._changelogContent}>
                          </ha-markdown>
                        </ha-faded>
                      `
                    : nothing}
                  <div class="versions">
                    <p>
                      ${this.hass.localize(
                        "ui.panel.config.apps.dashboard.update_available.description",
                        {
                          name: this.addon.name,
                          version: this.addon.version,
                          newest_version: this.addon.version_latest,
                        }
                      )}
                    </p>
                  </div>
                  ${createBackupTexts
                    ? html`
                        <hr />
                        <ha-md-list>
                          <ha-md-list-item>
                            <span slot="headline">
                              ${createBackupTexts.title}
                            </span>

                            ${createBackupTexts.description
                              ? html`
                                  <span slot="supporting-text">
                                    ${createBackupTexts.description}
                                  </span>
                                `
                              : nothing}
                            <ha-switch
                              slot="end"
                              id="create-backup"
                            ></ha-switch>
                          </ha-md-list-item>
                        </ha-md-list>
                      `
                    : nothing}
                `
              : html`<ha-spinner
                    aria-label="Updating"
                    size="large"
                  ></ha-spinner>
                  <p class="progress-text">
                    ${this.hass.localize(
                      "ui.panel.config.apps.dashboard.update_available.updating",
                      {
                        name: this.addon.name,
                        version: this.addon.version_latest,
                      }
                    )}
                  </p>`}
        </div>
        ${this.addon.version !== this.addon.version_latest && !this._updating
          ? html`
              <div class="card-actions">
                <span></span>
                <ha-progress-button @click=${this._update}>
                  ${this.hass.localize("ui.common.update")}
                </ha-progress-button>
              </div>
            `
          : nothing}
      </ha-card>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._loadAddonData();
  }

  private _computeCreateBackupTexts():
    | { title: string; description?: string }
    | undefined {
    if (atLeastVersion(this.hass.config.version, 2025, 2, 0)) {
      const version = this.addon.version;
      return {
        title: this.hass.localize(
          "ui.panel.config.apps.dashboard.update_available.create_backup.app"
        ),
        description: this.hass.localize(
          "ui.panel.config.apps.dashboard.update_available.create_backup.app_description",
          { version: version }
        ),
      };
    }

    return {
      title: this.hass.localize(
        "ui.panel.config.apps.dashboard.update_available.create_backup.generic"
      ),
    };
  }

  get _shouldCreateBackup(): boolean {
    const createBackupSwitch = this.shadowRoot?.getElementById(
      "create-backup"
    ) as HaSwitch;
    if (createBackupSwitch) {
      return createBackupSwitch.checked;
    }
    return true;
  }

  private async _loadAddonData() {
    if (this.addon.changelog) {
      try {
        const content = await fetchHassioAddonChangelog(
          this.hass,
          this.addon.slug
        );
        this._changelogContent = extractChangelog(
          this.addon as HassioAddonDetails,
          content
        );
      } catch (err) {
        this._error = extractApiErrorMessage(err);
      }
    }
  }

  private async _update() {
    this._error = undefined;
    this._updating = true;

    try {
      await updateHassioAddon(
        this.hass,
        this.addon.slug,
        this._shouldCreateBackup
      );
    } catch (err: any) {
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        this._error = extractApiErrorMessage(err);
        this._updating = false;
        return;
      }
    }
    fireEvent(this, "update-complete");
    this._updating = false;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }
        ha-card {
          margin: auto;
        }
        a {
          text-decoration: none;
          color: var(--primary-text-color);
        }
        .card-actions {
          display: flex;
          justify-content: space-between;
        }

        ha-spinner {
          display: block;
          margin: 32px;
          text-align: center;
        }

        .progress-text {
          text-align: center;
        }

        ha-markdown {
          padding-bottom: var(--ha-space-2);
        }

        hr {
          border-color: var(--divider-color);
          border-bottom: none;
          margin: var(--ha-space-4) 0 0 0;
        }

        ha-md-list {
          padding: 0;
          margin-bottom: calc(-1 * var(--ha-space-4));
        }

        ha-md-list-item {
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
          --md-item-overflow: visible;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-app-update-available-card": SupervisorAppUpdateAvailableCard;
  }
}
