import { mdiDeleteForever, mdiDotsVertical, mdiDownload } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../common/dom/fire_event";
import { debounce } from "../../../../common/util/debounce";
import "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";
import type { BackupConfig } from "../../../../data/backup";
import { fetchBackupConfig } from "../../../../data/backup";
import type {
  CloudStatusLoggedIn,
  SubscriptionInfo,
} from "../../../../data/cloud";
import {
  cloudLogout,
  completeCloudOnboarding,
  fetchCloudSubscriptionInfo,
  ONBOARDING_ITEMS,
  removeCloudData,
} from "../../../../data/cloud";
import type { Webhook } from "../../../../data/webhook";
import { fetchWebhooks } from "../../../../data/webhook";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import "../../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "./cloud-account-onboarding";
import "./cloud-account-overview";
import {
  onboardingComplete,
  onboardingPanelCompleted,
} from "./cloud-account-status";
import { showCloudOnboardingDialog } from "./show-dialog-cloud-onboarding";
import { showSupportPackageDialog } from "./show-dialog-cloud-support-package";

@customElement("cloud-account")
export class CloudAccount extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public cloudStatus!: CloudStatusLoggedIn;

  @state() private _subscription?: SubscriptionInfo;

  @state() private _backupConfig?: BackupConfig;

  @state() private _webhooks?: Webhook[];

  // Whether the async backup config fetch has finished (regardless of outcome).
  // Used to avoid flashing the onboarding card in and out before we know the
  // backup state — see _showOnboarding.
  @state() private _backupConfigChecked = false;

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        header="Home Assistant Cloud"
      >
        <ha-dropdown slot="toolbar-icon" @wa-select=${this._handleMenuAction}>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          <ha-dropdown-item value="reset">
            ${this.hass.localize(
              "ui.panel.config.cloud.account.reset_cloud_data"
            )}
            <ha-svg-icon slot="icon" .path=${mdiDeleteForever}></ha-svg-icon>
          </ha-dropdown-item>
          <ha-dropdown-item value="download">
            ${this.hass.localize(
              "ui.panel.config.cloud.account.download_support_package"
            )}
            <ha-svg-icon slot="icon" .path=${mdiDownload}></ha-svg-icon>
          </ha-dropdown-item>
        </ha-dropdown>
        <div class="content">
          ${this._showOnboarding
            ? html`
                <cloud-account-onboarding
                  .hass=${this.hass}
                  .cloudStatus=${this.cloudStatus}
                  .backupConfig=${this._backupConfig}
                  @cloud-open-onboarding=${this._openOnboardingDialog}
                ></cloud-account-onboarding>
              `
            : nothing}
          <cloud-account-overview
            .hass=${this.hass}
            .cloudStatus=${this.cloudStatus}
            .subscription=${this._subscription}
            .backupConfig=${this._backupConfig}
            .webhooks=${this._webhooks}
            @cloud-sign-out=${this._signOut}
          ></cloud-account-overview>
        </div>
      </hass-subpage>
    `;
  }

  private get _onboarded(): boolean {
    return (
      this.cloudStatus.onboarding_completed ||
      this.cloudStatus.is_onboarding_postponed
    );
  }

  private get _showOnboarding(): boolean {
    if (!this.cloudStatus.active_subscription) {
      return false;
    }

    if (this._onboarded) {
      return false;
    }

    if (!this._backupConfigChecked && this._nonBackupStepsComplete) {
      return false;
    }

    // Hide once every step is set up (see _syncOnboardedItems, which records the
    // completed items on the backend). The setup dialog lives at the document
    // level (see _openOnboardingDialog), so it survives this card unmounting.
    return !onboardingComplete(this.cloudStatus, this._backupConfig);
  }

  private _openOnboardingDialog() {
    showCloudOnboardingDialog(this, {
      cloudStatus: this.cloudStatus,
      backupConfig: this._backupConfig,
      // The dialog keeps its own copy live; this refreshes the page behind it.
      onChanged: () => {
        fireEvent(this, "ha-refresh-cloud-status");
        this._fetchBackupConfig();
      },
    });
  }

  private get _nonBackupStepsComplete(): boolean {
    return (
      onboardingPanelCompleted("remote", this.cloudStatus) &&
      onboardingPanelCompleted("voice", this.cloudStatus) &&
      onboardingPanelCompleted("streaming", this.cloudStatus)
    );
  }

  firstUpdated() {
    this._fetchSubscriptionInfo();
    this._fetchBackupConfig();
    this._fetchWebhooks();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("cloudStatus") || changedProps.has("_backupConfig")) {
      this._syncOnboardedItems();
    }
  }

  private async _syncOnboardedItems() {
    if (!this.cloudStatus.active_subscription) {
      return;
    }

    const onboarded = this.cloudStatus.prefs.onboarded_items;
    const toComplete = ONBOARDING_ITEMS.filter(
      (item) =>
        !onboarded.includes(item) &&
        onboardingPanelCompleted(item, this.cloudStatus, this._backupConfig)
    );

    if (toComplete.length === 0) {
      return;
    }

    try {
      await completeCloudOnboarding(this.hass, toComplete);
      fireEvent(this, "ha-refresh-cloud-status");
    } catch {
      // Best effort; retried on the next status refresh.
    }
  }

  protected override hassSubscribe() {
    const googleCheck = debounce(
      () => {
        if (this.cloudStatus && !this.cloudStatus.google_registered) {
          fireEvent(this, "ha-refresh-cloud-status");
        }
      },
      10000,
      true
    );
    return [
      this.hass.connection.subscribeEvents(() => {
        if (!this.cloudStatus?.alexa_registered) {
          fireEvent(this, "ha-refresh-cloud-status");
        }
      }, "alexa_smart_home"),
      this.hass.connection.subscribeEvents(
        googleCheck,
        "google_assistant_command"
      ),
      this.hass.connection.subscribeEvents(
        googleCheck,
        "google_assistant_query"
      ),
      this.hass.connection.subscribeEvents(
        googleCheck,
        "google_assistant_sync"
      ),
    ];
  }

  private async _fetchSubscriptionInfo() {
    this._subscription = await fetchCloudSubscriptionInfo(this.hass);
    if (
      this._subscription.provider &&
      this.cloudStatus &&
      this.cloudStatus.cloud !== "connected"
    ) {
      fireEvent(this, "ha-refresh-cloud-status");
    }
  }

  private async _fetchBackupConfig() {
    if (!isComponentLoaded(this.hass.config, "backup")) {
      this._backupConfigChecked = true;
      return;
    }
    try {
      const result = await fetchBackupConfig(this.hass);
      this._backupConfig = result.config;
    } catch {
      // Best effort; leave the backup status unknown.
    } finally {
      this._backupConfigChecked = true;
    }
  }

  private async _fetchWebhooks() {
    if (!isComponentLoaded(this.hass.config, "webhook")) {
      return;
    }
    try {
      this._webhooks = await fetchWebhooks(this.hass);
    } catch {
      // Best effort; leave the webhook count at zero.
    }
  }

  private async _signOut() {
    showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.cloud.account.sign_out_confirm"
      ),
      confirmText: this.hass!.localize("ui.common.yes"),
      dismissText: this.hass!.localize("ui.common.no"),
      confirm: () => this._logoutFromCloud(),
    });
  }

  private async _logoutFromCloud() {
    await cloudLogout(this.hass);
    fireEvent(this, "ha-refresh-cloud-status");
  }

  private _handleMenuAction(ev: HaDropdownSelectEvent) {
    const value = ev.detail.item.value;
    switch (value) {
      case "reset":
        this._deleteCloudData();
        break;
      case "download":
        this._downloadSupportPackage();
        break;
    }
  }

  private async _deleteCloudData() {
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.cloud.account.reset_data_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.cloud.account.reset_data_confirm_text"
      ),
      confirmText: this.hass.localize("ui.panel.config.cloud.account.reset"),
      destructive: true,
    });
    if (!confirm) {
      return;
    }
    try {
      await cloudLogout(this.hass);
      await removeCloudData(this.hass);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.cloud.account.reset_data_failed"
        ),
        text: err?.message,
      });
      return;
    } finally {
      fireEvent(this, "ha-refresh-cloud-status");
    }
  }

  private async _downloadSupportPackage() {
    showSupportPackageDialog(this);
  }

  static get styles() {
    return [
      haStyle,
      css`
        .content {
          padding: var(--ha-space-7) var(--ha-space-5) 0;
          padding-bottom: calc(
            var(--safe-area-inset-bottom) + var(--ha-space-6)
          );
          max-width: 860px;
          margin: 0 auto;
          gap: var(--ha-space-6);
          display: flex;
          flex-direction: column;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-account": CloudAccount;
  }
}
