import {
  LitElement,
  TemplateResult,
  html,
  CSSResultArray,
  css,
  customElement,
  property,
  PropertyValues,
} from "lit-element";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../layouts/hass-subpage";
import "../ha-config-section";

import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { fetchDevices, ZHADevice } from "../../../data/zha";
import { sortZHADevices, formatAsPaddedHex } from "./functions";
import memoizeOne from "memoize-one";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import { showZHADeviceInfoDialog } from "../../../dialogs/zha-device-info-dialog/show-dialog-zha-device-info";

export interface DeviceRowData extends ZHADevice {
  device?: DeviceRowData;
}

@customElement("zha-config-dashboard")
class ZHAConfigDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public route!: Route;
  @property() public narrow!: boolean;
  @property() public isWide!: boolean;
  @property() private _devices: ZHADevice[] = [];
  private pages: string[] = ["add", "groups"];
  private _firstUpdatedCalled: boolean = false;

  private _memoizeDevices = memoizeOne((devices: ZHADevice[]) => {
    let outputDevices: DeviceRowData[] = devices;

    outputDevices = outputDevices.map((device) => {
      return {
        ...device,
        name: device.user_given_name ? device.user_given_name : device.name,
        nwk: formatAsPaddedHex(device.nwk),
        ieee: device.ieee,
        id: device.ieee,
      };
    });

    return outputDevices;
  });

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow
        ? {
            name: {
              title: "Devices",
              sortable: true,
              filterable: true,
              direction: "asc",
              template: (name) => html`
                <div
                  @click=${this._handleDeviceClicked}
                  style="cursor: pointer;"
                >
                  ${name}
                </div>
              `,
            },
            actions: {
              title: "",
              sortable: false,
              filterable: false,
              template: (id) => html`
                <a href=${`/config/zha/device/${id}`}>
                  <ha-icon-next
                    style="color: var(--primary-text-color);"
                  ></ha-icon-next>
                </a>
              `,
            },
          }
        : {
            name: {
              title: "Name",
              sortable: true,
              filterable: true,
              direction: "asc",
              template: (name) => html`
                <div
                  @click=${this._handleDeviceClicked}
                  style="cursor: pointer;"
                >
                  ${name}
                </div>
              `,
            },
            nwk: {
              title: "Nwk",
              sortable: true,
              filterable: true,
            },
            ieee: {
              title: "IEEE",
              sortable: true,
              filterable: true,
            },
            id: {
              title: "",
              sortable: false,
              filterable: false,
              template: (id) => html`
                <a href=${`/config/zha/device/${id}`}>
                  <ha-icon-next
                    style="color: var(--primary-text-color);"
                  ></ha-icon-next>
                </a>
              `,
            },
          }
  );

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && this._firstUpdatedCalled) {
      this._fetchDevices();
    }
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchDevices();
    }
    this._firstUpdatedCalled = true;
  }

  protected render(): TemplateResult | void {
    return html`
      <hass-subpage header=${this.hass.localize("ui.panel.config.zha.title")}>
        <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize("ui.panel.config.zha.header")}
          </div>

          <div slot="introduction">
            ${this.hass.localize("ui.panel.config.zha.introduction")}
          </div>

          <ha-card>
            ${this.pages.map((page) => {
              return html`
                <a href=${`/config/zha/${page}`}>
                  <paper-item>
                    <paper-item-body two-line="">
                      ${this.hass.localize(
                        `ui.panel.config.zha.${page}.caption`
                      )}
                      <div secondary>
                        ${this.hass.localize(
                          `ui.panel.config.zha.${page}.description`
                        )}
                      </div>
                    </paper-item-body>
                    <ha-icon-next></ha-icon-next>
                  </paper-item>
                </a>
              `;
            })}
          </ha-card>
          <ha-card>
            <ha-data-table
              .columns=${this._columns(this.narrow)}
              .data=${this._memoizeDevices(this._devices)}
            ></ha-data-table>
          </ha-card>
        </ha-config-section>
      </hass-subpage>
    `;
  }

  private async _fetchDevices() {
    this._devices = (await fetchDevices(this.hass!)).sort(sortZHADevices);
  }

  private async _handleDeviceClicked(ev: CustomEvent) {
    const ieee = (ev.target as HTMLElement)
      .closest("tr")!
      .getAttribute("data-row-id")!;
    showZHADeviceInfoDialog(this, { ieee });
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        a {
          text-decoration: none;
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-config-dashboard": ZHAConfigDashboard;
  }
}
