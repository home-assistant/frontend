import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-code-editor";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import {
  fetchBindableDevices,
  fetchGroups,
  ZHADevice,
  ZHAGroup,
} from "../../../../../data/zha";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { sortZHADevices, sortZHAGroups } from "./functions";
import "./zha-cluster-attributes";
import "./zha-cluster-commands";
import "./zha-manage-clusters";
import "./zha-device-binding";
import "./zha-group-binding";
import "./zha-device-children";
import "./zha-device-signature";
import {
  Tab,
  ZHAManageZigbeeDeviceDialogParams,
} from "./show-dialog-zha-manage-zigbee-device";

@customElement("dialog-zha-manage-zigbee-device")
class DialogZHAManageZigbeeDevice extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _currTab: Tab = "clusters";

  @state() private _device?: ZHADevice;

  @state() private _bindableDevices: ZHADevice[] = [];

  @state() private _groups: ZHAGroup[] = [];

  public async showDialog(
    params: ZHAManageZigbeeDeviceDialogParams
  ): Promise<void> {
    this._device = params.device;
    if (!this._device) {
      this.closeDialog();
      return;
    }
    this._currTab = params.tab || "clusters";
  }

  public closeDialog() {
    this._device = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("close-dialog", () => this.closeDialog());
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (!this._device) {
      return;
    }
    const tabs = this._getTabs();
    if (!tabs.includes(this._currTab)) {
      this._currTab = tabs[0];
    }
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has("_currTab")) {
      this.setAttribute("tab", this._currTab);
    }
    if (changedProperties.has("_device")) {
      this._fetchData();
    }
  }

  protected render(): TemplateResult {
    if (!this._device) {
      return html``;
    }

    const tabs = this._getTabs();

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.dialogs.zha_manage_device.heading")
        )}
      >
        <mwc-tab-bar
          .activeIndex=${tabs.indexOf(this._currTab)}
          @MDCTabBar:activated=${this._handleTabChanged}
        >
          ${tabs.map(
            (tab) => html`
              <mwc-tab
                .label=${this.hass.localize(
                  `ui.dialogs.zha_manage_device.tabs.${tab}`
                )}
              ></mwc-tab>
            `
          )}
        </mwc-tab-bar>

        <div class="content" tabindex="-1" dialogInitialFocus>
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
                  ${this._bindableDevices.length > 0
                    ? html`
                        <zha-device-binding-control
                          .hass=${this.hass}
                          .selectedDevice=${this._device}
                          .bindableDevices=${this._bindableDevices}
                        ></zha-device-binding-control>
                      `
                    : ""}
                  ${this._device && this._groups.length > 0
                    ? html`
                        <zha-group-binding-control
                          .hass=${this.hass}
                          .selectedDevice=${this._device}
                          .groups=${this._groups}
                        ></zha-group-binding-control>
                      `
                    : ""}
                `
              : this._currTab === "signature"
              ? html`
                  <zha-device-zigbee-info
                    .hass=${this.hass}
                    .device=${this._device}
                  ></zha-device-zigbee-info>
                `
              : html`
                  <zha-device-children
                    .hass=${this.hass}
                    .device=${this._device}
                  ></zha-device-children>
                `
          )}
        </div>
      </ha-dialog>
    `;
  }

  private async _fetchData(): Promise<void> {
    if (this._device && this.hass) {
      this._bindableDevices =
        this._device && this._device.device_type !== "Coordinator"
          ? (await fetchBindableDevices(this.hass, this._device.ieee)).sort(
              sortZHADevices
            )
          : [];
      this._groups = (await fetchGroups(this.hass!)).sort(sortZHAGroups);
    }
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newTab = this._getTabs()[ev.detail.index];
    if (newTab === this._currTab) {
      return;
    }
    this._currTab = newTab;
  }

  private _getTabs(): Tab[] {
    const tabs: Tab[] = ["clusters", "bindings", "signature"];

    if (
      this._device &&
      (this._device.device_type === "Router" ||
        this._device.device_type === "Coordinator")
    ) {
      tabs.push("children");
    }

    return tabs;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-surface-position: static;
          --dialog-content-position: static;
          --vertial-align-dialog: flex-start;
        }

        .content {
          outline: none;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-header-bar {
            --mdc-theme-primary: var(--app-header-background-color);
            --mdc-theme-on-primary: var(--app-header-text-color, white);
            border-bottom: none;
          }
        }

        .heading {
          border-bottom: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
        }

        :host([tab="settings"]) ha-dialog {
          --dialog-content-padding: 0px;
        }

        @media all and (min-width: 600px) and (min-height: 501px) {
          ha-dialog {
            --mdc-dialog-min-width: 560px;
            --mdc-dialog-max-width: 560px;
            --dialog-surface-margin-top: 40px;
            --mdc-dialog-max-height: calc(100% - 72px);
          }

          .main-title {
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: default;
          }

          :host([large]) ha-dialog,
          ha-dialog[data-domain="camera"] {
            --mdc-dialog-min-width: 90vw;
            --mdc-dialog-max-width: 90vw;
          }
        }

        ha-dialog[data-domain="camera"] {
          --dialog-content-padding: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zha-manage-zigbee-device": DialogZHAManageZigbeeDevice;
  }
}
