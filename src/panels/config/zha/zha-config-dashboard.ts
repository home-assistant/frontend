import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { navigate } from "../../../common/navigate";
import "../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import { fetchDevices } from "../../../data/zha";
import type { ZHADevice } from "../../../data/zha";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import "../ha-config-section";
import { formatAsPaddedHex, sortZHADevices } from "./functions";

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

  private _firstUpdatedCalled = false;

  private _memoizeDevices = memoizeOne((devices: ZHADevice[]) => {
    let outputDevices: DeviceRowData[] = devices;

    outputDevices = outputDevices.map((device) => {
      return {
        ...device,
        name: device.user_given_name ? device.user_given_name : device.name,
        nwk: formatAsPaddedHex(device.nwk),
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
              grows: true,
            },
          }
        : {
            name: {
              title: "Name",
              sortable: true,
              filterable: true,
              direction: "asc",
              grows: true,
            },
            nwk: {
              title: "Nwk",
              sortable: true,
              filterable: true,
              width: "15%",
            },
            ieee: {
              title: "IEEE",
              sortable: true,
              filterable: true,
              width: "25%",
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

  protected render(): TemplateResult {
    return html`
      <hass-subpage .header=${this.hass.localize("component.zha.title")}>
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
              @row-click=${this._handleDeviceClicked}
              .id=${"ieee"}
              auto-height
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
    const deviceId = (ev.detail as RowClickedEvent).id;
    navigate(this, `/config/zha/device/${deviceId}`);
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
