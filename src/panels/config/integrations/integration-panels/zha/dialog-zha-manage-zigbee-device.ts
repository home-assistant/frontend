import "@material/mwc-tab-bar/mwc-tab-bar";
import "@material/mwc-tab/mwc-tab";
import { mdiClose } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-code-editor";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-header";
import {
  fetchBindableDevices,
  fetchGroups,
  ZHADevice,
  ZHAGroup,
} from "../../../../../data/zha";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { sortZHADevices, sortZHAGroups } from "./functions";
import {
  Tab,
  ZHAManageZigbeeDeviceDialogParams,
} from "./show-dialog-zha-manage-zigbee-device";
import "./zha-cluster-attributes";
import "./zha-cluster-commands";
import "./zha-device-binding";
import "./zha-device-neighbors";
import "./zha-device-signature";
import "./zha-group-binding";
import "./zha-manage-clusters";

@customElement("dialog-zha-manage-zigbee-device")
class DialogZHAManageZigbeeDevice extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public large = false;

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
    this.large = false;
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
    if (changedProps.has("_device")) {
      const tabs = this._getTabs(this._device);
      if (!tabs.includes(this._currTab)) {
        this._currTab = tabs[0];
      }
      this._fetchData();
    }
  }

  protected render() {
    if (!this._device) {
      return nothing;
    }

    const tabs = this._getTabs(this._device);

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${this.hass.localize("ui.dialogs.zha_manage_device.heading")}
      >
        <ha-dialog-header show-border slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.dialogs.more_info_control.dismiss")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span
            slot="title"
            .title=${this.hass.localize("ui.dialogs.zha_manage_device.heading")}
            @click=${this._enlarge}
          >
            ${this.hass.localize("ui.dialogs.zha_manage_device.heading")}
          </span>
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
        </ha-dialog-header>
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
                          .device=${this._device}
                          .bindableDevices=${this._bindableDevices}
                        ></zha-device-binding-control>
                      `
                    : ""}
                  ${this._device && this._groups.length > 0
                    ? html`
                        <zha-group-binding-control
                          .hass=${this.hass}
                          .device=${this._device}
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
                  <zha-device-neighbors
                    .hass=${this.hass}
                    .device=${this._device}
                    .narrow=${!this.large}
                  ></zha-device-neighbors>
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

  private _enlarge() {
    this.large = !this.large;
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newTab = this._getTabs(this._device)[ev.detail.index];
    if (newTab === this._currTab) {
      return;
    }
    this._currTab = newTab;
  }

  private _getTabs = memoizeOne((device: ZHADevice | undefined) => {
    const tabs: Tab[] = ["clusters", "bindings", "signature"];

    if (
      device &&
      (device.device_type === "Router" || device.device_type === "Coordinator")
    ) {
      tabs.push("neighbors");
    }

    return tabs;
  });

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-surface-position: static;
          --dialog-content-position: static;
          --vertical-align-dialog: flex-start;
        }

        .content {
          outline: none;
        }

        @media all and (min-width: 600px) and (min-height: 501px) {
          ha-dialog {
            --mdc-dialog-min-width: 560px;
            --mdc-dialog-max-width: 560px;
            --dialog-surface-margin-top: 40px;
            --mdc-dialog-max-height: calc(100% - 72px);
          }
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
