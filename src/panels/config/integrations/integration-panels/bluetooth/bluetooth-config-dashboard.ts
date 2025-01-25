import "@material/mwc-button";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-code-editor";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-switch";
import { getConfigEntries } from "../../../../../data/config_entries";
import { showOptionsFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-options-flow";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";

@customElement("bluetooth-config-dashboard")
export class BluetoothConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    return html`
      <hass-subpage .narrow=${this.narrow} .hass=${this.hass}>
        <div class="content">
          <ha-card
            .header=${this.hass.localize(
              "ui.panel.config.bluetooth.settings_title"
            )}
          >
            <div class="card-actions">
              <mwc-button @click=${this._openOptionFlow}
                >${this.hass.localize(
                  "ui.panel.config.bluetooth.option_flow"
                )}</mwc-button
              >
            </div>
          </ha-card>
          <ha-card
            .header=${this.hass.localize(
              "ui.panel.config.bluetooth.advertisement_monitor"
            )}
          >
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.bluetooth.advertisement_monitor_details"
                )}
              </p>
            </div>
            <div class="card-actions">
              <a href="/config/bluetooth/advertisement-monitor"
                ><mwc-button>
                  ${this.hass.localize(
                    "ui.panel.config.bluetooth.advertisement_monitor"
                  )}
                </mwc-button></a
              >
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private async _openOptionFlow() {
    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.has("config_entry")) {
      return;
    }
    const configEntryId = searchParams.get("config_entry") as string;
    const configEntries = await getConfigEntries(this.hass, {
      domain: "bluetooth",
    });
    const configEntry = configEntries.find(
      (entry) => entry.entry_id === configEntryId
    );
    showOptionsFlowDialog(this, configEntry!);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }
        .content {
          padding: 24px 0 32px;
          max-width: 600px;
          margin: 0 auto;
          direction: ltr;
        }
        ha-card:first-child {
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bluetooth-config-dashboard": BluetoothConfigDashboard;
  }
}
