import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../src/components/ha-circular-progress";
import { HassioAddonDetails } from "../../../../src/data/hassio/addon";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { haStyle } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { hassioStyle } from "../../resources/hassio-style";
import "./hassio-addon-audio";
import "./hassio-addon-config";
import "./hassio-addon-network";

@customElement("hassio-addon-config-tab")
class HassioAddonConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public addon?: HassioAddonDetails;

  protected render(): TemplateResult {
    if (!this.addon) {
      return html`<ha-circular-progress active></ha-circular-progress>`;
    }
    const hasConfiguration =
      (this.addon.options && Object.keys(this.addon.options).length) ||
      (this.addon.schema && Object.keys(this.addon.schema).length);

    return html`
      <div class="content">
        ${hasConfiguration || this.addon.network || this.addon.audio
          ? html`
              ${hasConfiguration
                ? html`
                    <hassio-addon-config
                      .hass=${this.hass}
                      .addon=${this.addon}
                      .supervisor=${this.supervisor}
                    ></hassio-addon-config>
                  `
                : ""}
              ${this.addon.network
                ? html`
                    <hassio-addon-network
                      .hass=${this.hass}
                      .addon=${this.addon}
                      .supervisor=${this.supervisor}
                    ></hassio-addon-network>
                  `
                : ""}
              ${this.addon.audio
                ? html`
                    <hassio-addon-audio
                      .hass=${this.hass}
                      .addon=${this.addon}
                      .supervisor=${this.supervisor}
                    ></hassio-addon-audio>
                  `
                : ""}
            `
          : this.supervisor.localize("addon.configuration.no_configuration")}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      hassioStyle,
      css`
        .content {
          margin: auto;
          padding: 8px;
          max-width: 1024px;
        }
        hassio-addon-network,
        hassio-addon-audio,
        hassio-addon-config {
          margin-bottom: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-config-tab": HassioAddonConfigDashboard;
  }
}
