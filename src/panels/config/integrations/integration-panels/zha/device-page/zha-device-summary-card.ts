import { consume, type ContextType } from "@lit/context";
import {
  mdiCogRefresh,
  mdiDelete,
  mdiDotsVertical,
  mdiFamilyTree,
  mdiPlus,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import checkValidDate from "../../../../../../common/datetime/check_valid_date";
import { formatDateTimeWithSeconds } from "../../../../../../common/datetime/format_date_time";
import { navigate } from "../../../../../../common/navigate";
import "../../../../../../components/ha-button";
import "../../../../../../components/ha-card";
import "../../../../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../../../../components/ha-dropdown";
import "../../../../../../components/ha-dropdown-item";
import "../../../../../../components/ha-icon-button";
import "../../../../../../components/ha-relative-time";
import "../../../../../../components/ha-svg-icon";
import {
  apiContext,
  configContext,
  internationalizationContext,
} from "../../../../../../data/context";
import type { ZHADevice } from "../../../../../../data/zha";
import { showConfirmationDialog } from "../../../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../../../resources/styles";
import { formatAsPaddedHex } from "../functions";
import { showZHAReconfigureDeviceDialog } from "../show-dialog-zha-reconfigure-device";

type ZHADeviceAction = "add-via" | "view-network" | "remove";

@customElement("zha-device-summary-card")
export class ZHADeviceSummaryCard extends LitElement {
  @property({ attribute: false }) public device?: ZHADevice;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state() private _processingRemove = false;

  protected render(): TemplateResult | typeof nothing {
    if (!this.device || !this._config || !this._i18n) {
      return nothing;
    }

    const name = this.device.user_given_name || this.device.name;

    return html`
      <ha-card>
        <div class="device-heading">
          <div class="device-name">${name}</div>
          ${this.device.user_given_name
            ? html`<div class="device-subtitle">${this.device.name}</div>`
            : nothing}
        </div>
        <div class="section-header">
          ${this._i18n.localize("ui.panel.config.zha.device_page.information")}
        </div>
        <div class="summary-grid">
          ${this._renderSummaryItem(
            this._i18n.localize("ui.panel.config.zha.device_page.ieee"),
            this.device.ieee
          )}
          ${this._renderSummaryItem(
            this._i18n.localize("ui.panel.config.zha.device_page.nwk"),
            formatAsPaddedHex(this.device.nwk)
          )}
          ${this._renderSummaryItem(
            this._i18n.localize(
              "ui.panel.config.zha.visualization.device_type"
            ),
            this.device.device_type
          )}
          ${this._renderSummaryItem(
            this._i18n.localize("ui.dialogs.zha_device_info.power_source"),
            this.device.power_source ||
              this._i18n.localize("ui.dialogs.zha_device_info.unknown")
          )}
          ${this._renderLastSeenSummaryItem()}
        </div>
        <div class="card-actions">
          ${!this.device.active_coordinator
            ? html`
                <ha-button appearance="plain" @click=${this._reconfigureDevice}>
                  <ha-svg-icon
                    slot="start"
                    .path=${mdiCogRefresh}
                  ></ha-svg-icon>
                  ${this._i18n.localize(
                    "ui.dialogs.zha_device_info.buttons.reconfigure"
                  )}
                </ha-button>
              `
            : html`
                <ha-button appearance="plain" @click=${this._viewNetwork}>
                  <ha-svg-icon
                    slot="start"
                    .path=${mdiFamilyTree}
                  ></ha-svg-icon>
                  ${this._i18n.localize(
                    "ui.dialogs.zha_device_info.buttons.view_network"
                  )}
                </ha-button>
              `}
          ${this._renderDeviceActionMenu()}
        </div>
      </ha-card>
    `;
  }

  private _renderDeviceActionMenu(): TemplateResult | typeof nothing {
    const canAddViaDevice =
      this.device!.power_source === "Mains" &&
      (this.device!.device_type === "Router" ||
        this.device!.device_type === "Coordinator");
    const canManageDevice = !this.device!.active_coordinator;

    if (!canAddViaDevice && !canManageDevice) {
      return nothing;
    }

    return html`
      <ha-dropdown
        placement="bottom-end"
        @wa-select=${this._handleDeviceActionSelected}
      >
        <ha-icon-button
          slot="trigger"
          .label=${this._i18n.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        ${canAddViaDevice
          ? html`
              <ha-dropdown-item value="add-via">
                <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
                ${this._i18n.localize("ui.dialogs.zha_device_info.buttons.add")}
              </ha-dropdown-item>
            `
          : nothing}
        ${canManageDevice
          ? html`
              <ha-dropdown-item value="view-network">
                <ha-svg-icon slot="icon" .path=${mdiFamilyTree}></ha-svg-icon>
                ${this._i18n.localize(
                  "ui.dialogs.zha_device_info.buttons.view_network"
                )}
              </ha-dropdown-item>
              <ha-dropdown-item
                value="remove"
                variant="danger"
                .disabled=${this._processingRemove}
              >
                <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
                ${this._i18n.localize(
                  "ui.dialogs.zha_device_info.buttons.remove"
                )}
              </ha-dropdown-item>
            `
          : nothing}
      </ha-dropdown>
    `;
  }

  private _renderSummaryItem(
    label: string,
    value: string | number
  ): TemplateResult {
    return html`
      <div>
        <span class="summary-label">${label}</span>
        <span class="summary-value" title=${String(value)}>${value}</span>
      </div>
    `;
  }

  private _renderLastSeenSummaryItem(): TemplateResult {
    const label = this._i18n.localize("ui.dialogs.zha_device_info.last_seen");
    const lastSeen = this.device!.last_seen;

    if (!lastSeen) {
      return this._renderSummaryItem(
        label,
        this._i18n.localize("ui.dialogs.zha_device_info.unknown")
      );
    }

    const date = new Date(lastSeen);
    if (!checkValidDate(date)) {
      return this._renderSummaryItem(label, lastSeen);
    }

    return html`
      <div>
        <span class="summary-label">${label}</span>
        <span
          class="summary-value"
          title=${formatDateTimeWithSeconds(
            date,
            this._i18n.locale,
            this._config.config
          )}
        >
          <ha-relative-time .datetime=${lastSeen}></ha-relative-time>
        </span>
      </div>
    `;
  }

  private _reconfigureDevice(): void {
    showZHAReconfigureDeviceDialog(this, { device: this.device! });
  }

  private _addViaDevice(): void {
    navigate(`/config/zha/add/${this.device!.ieee}`);
  }

  private _viewNetwork(): void {
    navigate(`/config/zha/visualization/${this.device!.device_reg_id}`);
  }

  private _handleDeviceActionSelected(
    ev: HaDropdownSelectEvent<ZHADeviceAction>
  ): void {
    switch (ev.detail.item.value) {
      case "add-via":
        this._addViaDevice();
        break;
      case "view-network":
        this._viewNetwork();
        break;
      case "remove":
        this._removeDevice();
        break;
    }
  }

  private async _removeDevice(): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: this._i18n.localize(
        "ui.dialogs.zha_device_info.confirmations.remove_title"
      ),
      text: this._i18n.localize(
        "ui.dialogs.zha_device_info.confirmations.remove_text"
      ),
      confirmText: this._i18n.localize("ui.common.remove"),
      dismissText: this._i18n.localize("ui.common.cancel"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    this._processingRemove = true;
    try {
      await this._api.callService("zha", "remove", {
        ieee: this.device!.ieee,
      });
      navigate("/config/devices", { replace: true });
    } finally {
      this._processingRemove = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host,
        ha-card {
          display: block;
        }

        ha-card {
          overflow: hidden;
        }

        .device-heading {
          padding: var(--ha-space-4) var(--ha-space-4) var(--ha-space-2);
          border-bottom: 1px solid var(--divider-color);
        }

        .device-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-medium);
          line-height: var(--ha-line-height-condensed);
        }

        .device-subtitle {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--secondary-text-color);
          margin-top: var(--ha-space-1);
          line-height: var(--ha-line-height-condensed);
        }

        .section-header {
          padding: var(--ha-space-4) var(--ha-space-4) 0;
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
          line-height: var(--ha-line-height-condensed);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--ha-space-3);
          padding: var(--ha-space-4);
        }

        .summary-label,
        .summary-value {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .summary-label {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          line-height: var(--ha-line-height-condensed);
        }

        .summary-value {
          margin-top: var(--ha-space-1);
          font-size: var(--ha-font-size-l);
          line-height: var(--ha-line-height-condensed);
        }

        .card-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--ha-space-2);
          padding: var(--ha-space-1) var(--ha-space-4) var(--ha-space-1)
            var(--ha-space-1);
        }

        .card-actions ha-button {
          min-width: 0;
        }

        .card-actions ha-dropdown {
          flex: 0 0 auto;
        }

        @media (max-width: 800px) {
          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .summary-grid {
            grid-template-columns: 1fr;
            gap: var(--ha-space-2);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-summary-card": ZHADeviceSummaryCard;
  }
}
