import { mdiRadioTower } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-relative-time";
import type { RadioFrequencyTransmitter } from "../../../../../data/radio_frequency";
import { fetchRadioFrequencyTransmitters } from "../../../../../data/radio_frequency";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { computeDeviceName } from "../../../../../common/entity/compute_device_name";
import { computeEntityName } from "../../../../../common/entity/compute_entity_name";

@customElement("radio-frequency-config-dashboard")
export class RadioFrequencyConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _transmitters: RadioFrequencyTransmitter[] = [];

  public firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._fetchTransmitters();
  }

  private async _fetchTransmitters(): Promise<void> {
    const result = await fetchRadioFrequencyTransmitters(this.hass);
    this._transmitters = result.transmitters;
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.radio_frequency.title")}
        back-path="/config"
      >
        <div class="container">
          <ha-card
            .header=${this.hass.localize(
              "ui.panel.config.radio_frequency.transmitters_count",
              { count: this._transmitters.length }
            )}
          >
            <div class="card-content">
              ${this._transmitters.length === 0
                ? html`<p class="no-transmitters">
                    ${this.hass.localize(
                      "ui.panel.config.radio_frequency.no_transmitters"
                    )}
                  </p>`
                : html`
                    <ha-md-list>
                      ${this._transmitters.map((transmitter) =>
                        this._renderTransmitter(transmitter)
                      )}
                    </ha-md-list>
                  `}
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _renderTransmitter(
    transmitter: RadioFrequencyTransmitter
  ): TemplateResult {
    const entityState = this.hass.states[transmitter.entity_id];
    const entity = this.hass.entities[transmitter.entity_id];
    const device = transmitter.device_id
      ? this.hass.devices[transmitter.device_id]
      : undefined;
    const areaId = entity.area_id || (device ? device.area_id : undefined);
    const area = areaId ? this.hass.areas[areaId] : undefined;
    return html`
      <ha-md-list-item
        type=${device ? "link" : "text"}
        href=${device
          ? `/config/devices/device/${transmitter.device_id}`
          : nothing}
      >
        <ha-svg-icon slot="start" .path=${mdiRadioTower}></ha-svg-icon>
        <div slot="headline">
          ${device
            ? computeDeviceName(device)
            : computeEntityName(
                this.hass.states[transmitter.entity_id],
                this.hass.entities,
                this.hass.devices
              )}
        </div>
        <div slot="supporting-text">
          ${area ? `${area.name} · ` : ""}
          ${transmitter.supported_frequency_ranges
            .map(
              ([min, max]) =>
                `${parseFloat((min / 1000000).toFixed(2))}-${parseFloat((max / 1000000).toFixed(2))}MHz`
            )
            .join(", ")}
          · ${transmitter.supported_modulations.join(", ")}
        </div>

        ${device
          ? html`<div slot="end">
              ${this.hass.localize(
                "ui.panel.config.radio_frequency.last_used"
              )}:
              <br />
              ${entityState.state === "unknown" ||
              entityState.state === "unavailable"
                ? this.hass.localize(`state.default.${entityState.state}`)
                : html`
                    <ha-relative-time
                      .datetime=${entityState.state}
                    ></ha-relative-time>
                  `}
            </div>`
          : nothing}
      </ha-md-list-item>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
        }

        ha-card {
          margin: 0px auto var(--ha-space-4);
          max-width: 600px;
        }

        ha-card .card-content {
          padding: 0;
        }

        ha-md-list {
          background: none;
          padding: 0;
        }

        .no-transmitters {
          padding: var(--ha-space-4);
          margin: 0;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "radio-frequency-config-dashboard": RadioFrequencyConfigDashboard;
  }
}
