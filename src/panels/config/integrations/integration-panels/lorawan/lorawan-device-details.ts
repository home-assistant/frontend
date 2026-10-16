import type { ContextType } from "@lit/context";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../../common/decorators/consume";
import "../../../../../components/ha-relative-time";
import { internationalizationContext } from "../../../../../data/context";
import type { LoRaWANDevice } from "../../../../../data/lorawan";
import "./lorawan-connection-link";

@customElement("lorawan-device-details")
export class LoRaWANDeviceDetails extends LitElement {
  @property({ attribute: false }) public device!: LoRaWANDevice;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  private _time(value: string | null) {
    return value
      ? html`<ha-relative-time
          .datetime=${value}
          title=${value}
        ></ha-relative-time>`
      : this._i18n.localize("ui.panel.config.lorawan.not_observed");
  }

  protected render() {
    const device = this.device;
    return html`
      <dl>
        <dt>${this._i18n.localize("ui.panel.config.lorawan.connection")}</dt>
        <dd>
          <lorawan-connection-link
            .connection=${device.connection}
          ></lorawan-connection-link>
        </dd>
        <dt>${this._i18n.localize("ui.panel.config.lorawan.dev_eui")}</dt>
        <dd class="identifier">${device.dev_eui}</dd>
        <dt>${this._i18n.localize("ui.panel.config.lorawan.application")}</dt>
        <dd>${device.application_id || "—"}</dd>
        <dt>${this._i18n.localize("ui.panel.config.lorawan.last_uplink")}</dt>
        <dd>${this._time(device.last_uplink)}</dd>
        <dt>${this._i18n.localize("ui.panel.config.lorawan.last_join")}</dt>
        <dd>${this._time(device.last_join)}</dd>
        <dt>${this._i18n.localize("ui.panel.config.lorawan.last_status")}</dt>
        <dd>${this._time(device.last_status)}</dd>
        ${
          device.downlink_margin === null
            ? nothing
            : html`<dt>
                  ${this._i18n.localize("ui.panel.config.lorawan.downlink_margin")}
                </dt>
                <dd>${device.downlink_margin} dB</dd>`
        }
      </dl>
      <h3>${this._i18n.localize("ui.panel.config.lorawan.gateways")}</h3>
      ${
        device.receptions.length
          ? html` <table>
              <thead>
                <tr>
                  <th>
                    ${this._i18n.localize("ui.panel.config.lorawan.gateway")}
                  </th>
                  <th>
                    ${this._i18n.localize("ui.panel.config.lorawan.rssi")}
                  </th>
                  <th>${this._i18n.localize("ui.panel.config.lorawan.snr")}</th>
                </tr>
              </thead>
              <tbody>
                ${device.receptions.map(
                  (reception) =>
                    html`<tr>
                      <td class="identifier">${reception.gateway_id}</td>
                      <td>
                        ${reception.rssi === null ? "—" : `${reception.rssi} dBm`}
                      </td>
                      <td>
                        ${reception.snr === null ? "—" : `${reception.snr} dB`}
                      </td>
                    </tr>`
                )}
              </tbody>
            </table>`
          : html`<p>
              ${this._i18n.localize("ui.panel.config.lorawan.not_observed")}
            </p>`
      }
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    dl {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      column-gap: var(--ha-space-6);
      row-gap: var(--ha-space-3);
      align-items: center;
      margin: 0;
    }
    dt {
      color: var(--secondary-text-color);
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .identifier {
      font-family: var(--ha-font-family-code);
    }
    h3 {
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      margin-top: var(--ha-space-6);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      color: var(--secondary-text-color);
      font-weight: var(--ha-font-weight-normal);
    }
    th,
    td {
      text-align: start;
      padding: var(--ha-space-3) var(--ha-space-2);
      border-bottom: 1px solid var(--divider-color);
    }
    th:first-child,
    td:first-child {
      padding-inline-start: 0;
      overflow-wrap: anywhere;
    }
    th:not(:first-child),
    td:not(:first-child) {
      white-space: nowrap;
    }
    @media (max-width: 450px) {
      dl {
        column-gap: var(--ha-space-3);
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "lorawan-device-details": LoRaWANDeviceDetails;
  }
}
