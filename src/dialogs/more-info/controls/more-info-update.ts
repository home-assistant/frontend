import type { ContextType } from "@lit/context";
import type { HassConfig, UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { consume } from "../../../common/decorators/consume";
import { BINARY_STATE_OFF } from "../../../common/const";
import {
  consumeEntityRegistryEntry,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { sanitizeHttpUrl } from "../../../common/url/sanitize-http-url";
import { closestWithProperty } from "../../../common/dom/ancestors-with-property";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-markdown";
import "../../../components/ha-spinner";
import "../../../components/progress/ha-progress-bar";
import type { ManagerState } from "../../../data/backup_manager";
import { subscribeBackupEvents } from "../../../data/backup_manager";
import {
  apiContext,
  configContext,
  connectionContext,
  formattersContext,
  internationalizationContext,
} from "../../../data/context";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity/entity";
import type { EntityRegistryDisplayEntry } from "../../../data/entity/entity_registry";
import type { UpdateEntity } from "../../../data/update";
import {
  latestVersionIsSkipped,
  updateButtonIsDisabled,
  UpdateEntityFeature,
  updateIsInstalling,
  updateReleaseNotes,
} from "../../../data/update";
import type {
  HomeAssistantApi,
  HomeAssistantConfig,
  HomeAssistantFormatters,
} from "../../../types";
import { showAlertDialog } from "../../generic/show-dialog-box";
import { showToast } from "../../../util/toast";
import "../components/update/ha-more-info-update-backup";
import type { HaMoreInfoUpdateBackup } from "../components/update/ha-more-info-update-backup";

// Dialogs that reflect their open state to the `open` attribute.
const DIALOG_ELEMENTS = new Set(["ha-adaptive-dialog", "ha-dialog"]);

@customElement("more-info-update")
class MoreInfoUpdate extends LitElement {
  @property({ attribute: false }) public stateObj?: UpdateEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consumeEntityRegistryEntry({ entityIdPath: ["stateObj", "entity_id"] })
  private _entityEntry?: EntityRegistryDisplayEntry;

  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _config!: HassConfig;

  @state() private _releaseNotes?: string | null;

  @state() private _error?: string;

  @state() private _installError?: string;

  @state() private _backupState: ManagerState = "idle";

  @state() private _markdownLoading = true;

  @query("ha-more-info-update-backup")
  private _backupElement?: HaMoreInfoUpdateBackup;

  private _backupEventsUnsub?: Promise<UnsubscribeFunc>;

  public connectedCallback(): void {
    super.connectedCallback();
    this._subscribeBackupEvents();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._backupEventsUnsub?.then(
      (unsub) => unsub(),
      () => undefined
    );
    this._backupEventsUnsub = undefined;
    this._backupState = "idle";
  }

  private _subscribeBackupEvents(): void {
    if (
      this._backupEventsUnsub ||
      !isComponentLoaded(this._config, "backup") ||
      !isComponentLoaded(this._config, "hassio")
    ) {
      return;
    }

    const backupEventsUnsub = subscribeBackupEvents(
      this._connection,
      (event) => {
        this._backupState = event.manager_state;
      }
    );

    backupEventsUnsub.catch(() => {
      // The update can still be attempted; a failure is shown inline.
      if (this._backupEventsUnsub === backupEventsUnsub) {
        this._backupEventsUnsub = undefined;
      }
    });
    this._backupEventsUnsub = backupEventsUnsub;
  }

  private _backupInProgressMessage(): string | undefined {
    // The Supervisor only holds back the updates it manages.
    if (this._entityEntry?.platform !== "hassio") {
      return undefined;
    }

    switch (this._backupState) {
      case "create_backup":
      case "receive_backup":
      case "restore_backup":
        return this._localize(
          `ui.dialogs.more_info_control.update.backup_in_progress.${this._backupState}`,
          {
            backups_link: html`<a href="/config/backup"
              >${this._localize(
                "ui.dialogs.more_info_control.update.backup_in_progress.backups_link"
              )}</a
            >`,
          }
        );
      default:
        return undefined;
    }
  }

  protected render() {
    if (
      !this._localize ||
      !this.stateObj ||
      this.stateObj.state === UNAVAILABLE ||
      this.stateObj.state === UNKNOWN
    ) {
      return nothing;
    }

    const releaseUrl = sanitizeHttpUrl(this.stateObj.attributes.release_url);
    const backupInProgressMessage = this._backupInProgressMessage();

    return html`
      <div class="content">
        <div class="summary">
          ${
            this.stateObj.attributes.in_progress
              ? supportsFeature(this.stateObj, UpdateEntityFeature.PROGRESS) &&
                this.stateObj.attributes.update_percentage !== null
                ? html`<ha-progress-bar
                    loading
                    .value=${this.stateObj.attributes.update_percentage}
                  ></ha-progress-bar>`
                : html`<ha-progress-bar indeterminate></ha-progress-bar>`
              : nothing
          }
          <h3>${this.stateObj.attributes.title}</h3>
          ${
            this._error
              ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
              : nothing
          }
          <div class="row">
            <div class="key">
              ${this._formatters.formatEntityAttributeName(
                this.stateObj,
                "installed_version"
              )}
            </div>
            <div class="value">
              ${
                this.stateObj.attributes.installed_version ??
                this._localize("state.default.unavailable")
              }
            </div>
          </div>
          <div class="row">
            <div class="key">
              ${this._formatters.formatEntityAttributeName(
                this.stateObj,
                "latest_version"
              )}
            </div>
            <div class="value">
              ${
                this.stateObj.attributes.latest_version ??
                this._localize("state.default.unavailable")
              }
            </div>
          </div>

          ${
            releaseUrl
              ? html`<div class="row">
                  <div class="key">
                    <a href=${releaseUrl} target="_blank" rel="noreferrer">
                      ${this._localize(
                        "ui.dialogs.more_info_control.update.release_announcement"
                      )}
                    </a>
                  </div>
                </div>`
              : nothing
          }
        </div>
        ${
          supportsFeature(this.stateObj!, UpdateEntityFeature.RELEASE_NOTES) &&
          !this._error
            ? this._releaseNotes === undefined
              ? html`
                  <hr />
                  ${this._markdownLoading ? this._renderLoader() : nothing}
                `
              : this._releaseNotes
                ? html`
                    <hr />
                    <ha-markdown
                      @content-resize=${this._markdownLoaded}
                      .content=${this._releaseNotes}
                      class=${this._markdownLoading ? "hidden" : ""}
                    ></ha-markdown>
                    ${this._markdownLoading ? this._renderLoader() : nothing}
                  `
                : nothing
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
              : nothing
        }
      </div>
      <div class="footer">
        <ha-more-info-update-backup
          .stateObj=${this.stateObj}
          .disabled=${!!backupInProgressMessage}
        ></ha-more-info-update-backup>
        ${
          backupInProgressMessage
            ? html`<ha-alert alert-type="info">
                ${backupInProgressMessage}
              </ha-alert>`
            : this._installError
              ? html`<ha-alert alert-type="error">
                  ${this._localize(
                    "ui.dialogs.more_info_control.update.install_failed",
                    { error: this._installError }
                  )}
                </ha-alert>`
              : nothing
        }
        <div class="actions">
          ${
            this.stateObj.state === BINARY_STATE_OFF &&
            this.stateObj.attributes.skipped_version
              ? html`
                  <ha-button
                    appearance="plain"
                    @click=${this._handleClearSkipped}
                  >
                    ${this._localize(
                      "ui.dialogs.more_info_control.update.clear_skipped"
                    )}
                  </ha-button>
                `
              : html`
                  <ha-button
                    appearance="plain"
                    @click=${this._handleSkip}
                    .disabled=${
                      latestVersionIsSkipped(this.stateObj) ||
                      this.stateObj.state === BINARY_STATE_OFF ||
                      updateIsInstalling(this.stateObj)
                    }
                  >
                    ${this._localize("ui.dialogs.more_info_control.update.skip")}
                  </ha-button>
                `
          }
          ${
            supportsFeature(this.stateObj, UpdateEntityFeature.INSTALL)
              ? html`
                  <ha-button
                    @click=${this._handleInstall}
                    .loading=${updateIsInstalling(this.stateObj)}
                    .disabled=${
                      updateButtonIsDisabled(this.stateObj) ||
                      !!backupInProgressMessage
                    }
                  >
                    ${this._localize(
                      "ui.dialogs.more_info_control.update.update"
                    )}
                  </ha-button>
                `
              : nothing
          }
        </div>
      </div>
    `;
  }

  private _renderLoader() {
    return html`
      <div class="flex center loader">
        <ha-spinner></ha-spinner>
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
        this._api,
        this.stateObj!.entity_id
      );
    } catch (err: any) {
      this._error = err.message;
    }
  }

  private async _handleInstall(): Promise<void> {
    const installData: Record<string, any> = {
      entity_id: this.stateObj!.entity_id,
    };

    if (this._backupElement?.createBackup ?? false) {
      installData.backup = true;
    }

    if (
      supportsFeature(this.stateObj!, UpdateEntityFeature.SPECIFIC_VERSION) &&
      this.stateObj!.attributes.latest_version
    ) {
      installData.version = this.stateObj!.attributes.latest_version;
    }

    this._installError = undefined;

    try {
      await this._api.callService(
        "update",
        "install",
        installData,
        undefined,
        false
      );
    } catch (err: any) {
      const message = await this._localizeInstallError(err);

      if (this._isShown()) {
        this._installError = message;

        return;
      }

      // The dialog was closed, or is closing, while the update was installing.
      const toastHost = document.querySelector("home-assistant");

      if (toastHost) {
        showToast(toastHost, {
          message: this._localize(
            "ui.dialogs.more_info_control.update.install_failed",
            { error: message }
          ),
          duration: 10000,
        });
      }
    }
  }

  private _isShown(): boolean {
    if (!this.isConnected) {
      return false;
    }

    // The dialog keeps its content mounted while its close animation runs.
    let element = closestWithProperty(this, "open", false);

    while (element) {
      if (DIALOG_ELEMENTS.has(element.localName)) {
        return element.hasAttribute("open");
      }

      element = closestWithProperty(element, "open", false);
    }

    return true;
  }

  private async _localizeInstallError(err: any): Promise<string> {
    if (err?.translation_domain && err?.translation_key) {
      const localize = await this._i18n.loadBackendTranslation(
        "exceptions",
        err.translation_domain
      );

      const localizedMessage = localize(
        `component.${err.translation_domain}.exceptions.${err.translation_key}.message`,
        err.translation_placeholders
      );

      if (localizedMessage) {
        return localizedMessage;
      }
    }

    return err?.message ?? String(err);
  }

  private _handleSkip(): void {
    if (this.stateObj!.attributes.auto_update) {
      showAlertDialog(this, {
        title: this._localize(
          "ui.dialogs.more_info_control.update.auto_update_enabled_title"
        ),
        text: this._localize(
          "ui.dialogs.more_info_control.update.auto_update_enabled_text"
        ),
      });
      return;
    }
    this._api.callService("update", "skip", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _handleClearSkipped(): void {
    this._api.callService("update", "clear_skipped", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      justify-content: space-between;
    }
    hr {
      border-color: var(--divider-color);
      border-bottom: none;
      margin: var(--ha-space-4) 0;
    }
    ha-expansion-panel {
      margin: var(--ha-space-4) 0;
    }

    .summary {
      margin-bottom: var(--ha-space-4);
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
      margin: 0 calc(var(--ha-space-6) * -1) 0 calc(var(--ha-space-6) * -1);
      margin-bottom: calc(
        -1 * max(var(--safe-area-inset-bottom), var(--ha-space-6))
      );
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow: hidden;
      z-index: 10;
    }

    .footer ha-alert {
      display: block;
      width: 100%;
      box-sizing: border-box;
      padding: var(--ha-space-2) var(--ha-space-4) 0;
    }

    .actions {
      width: 100%;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: flex-end;
      box-sizing: border-box;
      padding: var(--ha-space-4);
      z-index: 1;
      gap: var(--ha-space-2);
    }

    a {
      color: var(--primary-color);
    }
    .flex.center {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    ha-markdown {
      direction: ltr;
      padding-bottom: var(--ha-space-4);
      box-sizing: border-box;
    }
    ha-markdown.hidden {
      display: none;
    }
    .loader {
      height: 80px;
      box-sizing: border-box;
      padding-bottom: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-update": MoreInfoUpdate;
  }
}
