import { consume, type ContextType } from "@lit/context";
import {
  mdiAccessPointNetwork,
  mdiCodeJson,
  mdiHexagonMultipleOutline,
  mdiLinkVariant,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import memoizeOne from "memoize-one";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/ha-spinner";
import { narrowViewportContext } from "../../../../../data/context";
import type { ZHADevice } from "../../../../../data/zha";
import { fetchZHADevice } from "../../../../../data/zha";
import "../../../../../layouts/hass-error-screen";
import "../../../../../layouts/hass-subpage";
import "../../../../../layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "./device-page/zha-device-bindings-pane";
import "./device-page/zha-device-summary-card";
import "./zha-device-neighbors";
import "./zha-device-signature";
import "./zha-manage-clusters";

type ZHADevicePageTab = "clusters" | "bindings" | "signature" | "neighbors";

const TAB_ICONS: Record<ZHADevicePageTab, string> = {
  clusters: mdiHexagonMultipleOutline,
  bindings: mdiLinkVariant,
  signature: mdiCodeJson,
  neighbors: mdiAccessPointNetwork,
};

const DEVICE_REFRESH_INTERVAL = 60000;

@customElement("zha-device-page")
class ZHADevicePage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: "ieee" }) public ieee!: string;

  @state()
  @consume({ context: narrowViewportContext, subscribe: true })
  private _narrow!: ContextType<typeof narrowViewportContext>;

  @state() private _device?: ZHADevice;

  @state() private _currTab: ZHADevicePageTab = "clusters";

  @state() private _loading = false;

  @state() private _error?: string;

  private _deviceRefreshInterval?: number;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearDeviceRefreshInterval();
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has("route")) {
      this._syncTabFromRoute();
    }
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (changedProperties.has("ieee")) {
      this._clearDeviceRefreshInterval();
      if (this.ieee) {
        this._fetchDevice();
      } else {
        this._device = undefined;
        this._loading = false;
        this._error = this.hass.localize(
          "ui.panel.config.zha.device_page.not_found"
        );
      }
    }
  }

  protected render(): TemplateResult {
    const header =
      this._device?.user_given_name ||
      this._device?.name ||
      this.hass.localize("ui.panel.config.zha.device_page.heading");

    if (this._loading || (!this._device && !this._error)) {
      return html`
        <hass-subpage
          .hass=${this.hass}
          .narrow=${this._narrow}
          .header=${header}
          back-path="/config/zha/dashboard"
        >
          <div class="loading">
            <ha-spinner size="large"></ha-spinner>
          </div>
        </hass-subpage>
      `;
    }

    if (!this._device || this._error) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this._error ||
          this.hass.localize("ui.panel.config.zha.device_page.not_found")}
        ></hass-error-screen>
      `;
    }

    const tabNavigation = this._getTabNavigation(this._device, this.ieee);

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .route=${this.route}
        .tabs=${tabNavigation}
        back-path="/config/devices/device/${this._device.device_reg_id}"
      >
        <div class="container">
          <zha-device-summary-card
            class="device-info"
            .device=${this._device}
          ></zha-device-summary-card>

          <div class="main-content">
            ${cache(
              this._currTab === "clusters"
                ? html`
                    <zha-manage-clusters
                      .hass=${this.hass}
                      .device=${this._device}
                    ></zha-manage-clusters>
                  `
                : this._currTab === "bindings"
                  ? html`
                      <zha-device-bindings-pane
                        .hass=${this.hass}
                        .device=${this._device}
                      ></zha-device-bindings-pane>
                    `
                  : this._currTab === "signature"
                    ? html`
                        <zha-device-zigbee-info
                          .hass=${this.hass}
                          .device=${this._device}
                        ></zha-device-zigbee-info>
                      `
                    : html`
                        <zha-device-neighbors
                          .hass=${this.hass}
                          .device=${this._device}
                        ></zha-device-neighbors>
                      `
            )}
          </div>
        </div>
      </hass-tabs-subpage>
    `;
  }

  private async _fetchDevice(): Promise<void> {
    const ieee = this.ieee;
    this._loading = true;
    this._error = undefined;
    this._device = undefined;

    try {
      const device = await fetchZHADevice(this.hass, ieee);
      if (this.ieee !== ieee) {
        return;
      }
      this._device = device;
      const tabs = this._getTabs(device);
      if (!tabs.includes(this._currTab)) {
        this._currTab = tabs[0];
      }
      this._startDeviceRefreshInterval();
    } catch (_err: any) {
      if (this.ieee === ieee) {
        this._error = this.hass.localize(
          "ui.panel.config.zha.device_page.not_found"
        );
      }
    } finally {
      if (this.ieee === ieee) {
        this._loading = false;
      }
    }
  }

  private _startDeviceRefreshInterval(): void {
    this._clearDeviceRefreshInterval();
    this._deviceRefreshInterval = window.setInterval(
      () => this._refreshDevice(),
      DEVICE_REFRESH_INTERVAL
    );
  }

  private _clearDeviceRefreshInterval(): void {
    if (this._deviceRefreshInterval) {
      window.clearInterval(this._deviceRefreshInterval);
      this._deviceRefreshInterval = undefined;
    }
  }

  private async _refreshDevice(): Promise<void> {
    if (!this._device) {
      return;
    }

    const ieee = this.ieee;

    try {
      const device = await fetchZHADevice(this.hass, ieee);
      if (this.ieee === ieee) {
        this._device = device;
      }
    } catch (_err: any) {
      // Keep showing the current device details until a full page refresh fails.
    }
  }

  private _syncTabFromRoute(): void {
    const pathParts = this.route?.path.split("/").filter(Boolean) || [];
    if (this.ieee && pathParts.length === 1) {
      navigate(`/config/zha/device/${this.ieee}/clusters`, { replace: true });
      return;
    }
    const newTab = (pathParts[1] as ZHADevicePageTab | undefined) || "clusters";
    if (newTab === this._currTab) {
      return;
    }
    this._currTab = this._isValidTab(newTab) ? newTab : "clusters";
  }

  private _isValidTab(tab: string): tab is ZHADevicePageTab {
    return ["clusters", "bindings", "signature", "neighbors"].includes(tab);
  }

  private _getTabs = memoizeOne((device: ZHADevice | undefined) => {
    const tabs: ZHADevicePageTab[] = ["clusters", "bindings", "signature"];

    if (
      device &&
      (device.device_type === "Router" || device.device_type === "Coordinator")
    ) {
      tabs.push("neighbors");
    }

    return tabs;
  });

  private _getTabNavigation = memoizeOne(
    (device: ZHADevice, ieee: string): PageNavigation[] =>
      this._getTabs(device).map((tab) => ({
        path: `/config/zha/device/${ieee}/${tab}`,
        translationKey: `ui.panel.config.zha.device_page.tabs.${tab}`,
        iconPath: TAB_ICONS[tab],
      }))
  );

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        hass-tabs-subpage {
          --app-header-text-color: var(--sidebar-icon-color);
        }

        .container {
          box-sizing: border-box;
          display: grid;
          grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
          gap: var(--ha-space-4);
          align-items: start;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          padding: var(--ha-space-4) var(--ha-space-4)
            calc(var(--ha-space-20) + var(--safe-area-inset-bottom, 0px));
        }

        .loading {
          display: flex;
          justify-content: center;
          padding: var(--ha-space-12);
        }

        .device-info,
        .main-content {
          min-width: 0;
        }

        .main-content {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
        }

        @media (max-width: 1024px) {
          .container {
            grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
          }
        }

        @media (max-width: 800px) {
          .container {
            grid-template-columns: 1fr;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-page": ZHADevicePage;
  }
}
