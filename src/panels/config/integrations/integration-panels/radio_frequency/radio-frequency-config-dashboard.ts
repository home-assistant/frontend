import { mdiRadioTower } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import type { RadioFrequencyTransmitter } from "../../../../../data/radio_frequency";
import { fetchRadioFrequencyTransmitters } from "../../../../../data/radio_frequency";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";

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
                      ${this._transmitters.map(
                        (transmitter) => html`
                          <ha-md-list-item
                            type=${transmitter.device_id ? "link" : "text"}
                            href=${transmitter.device_id
                              ? `/config/devices/device/${transmitter.device_id}`
                              : nothing}
                          >
                            <ha-svg-icon
                              slot="start"
                              .path=${mdiRadioTower}
                            ></ha-svg-icon>
                            <div slot="headline">
                              ${transmitter.name || transmitter.entity_id}
                            </div>
                            <div slot="supporting-text">
                              ${transmitter.supported_frequency_ranges
                                .map(
                                  ([min, max]) =>
                                    `${Math.round(min / 1000000, 2)}-${Math.round(max / 1000000, 2)}MHz`
                                )
                                .join(", ")}
                              - ${transmitter.supported_modulations.join(", ")}
                            </div>
                            ${transmitter.device_id
                              ? html`<ha-icon-next slot="end"></ha-icon-next>`
                              : nothing}
                          </ha-md-list-item>
                        `
                      )}
                    </ha-md-list>
                  `}
            </div>
          </ha-card>
        </div>
      </hass-subpage>
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
