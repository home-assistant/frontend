import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../src/components/ha-spinner";
import type { HassioAddonDetails } from "../../../../src/data/hassio/addon";
import type { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { haStyle } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { hassioStyle } from "../../resources/hassio-style";
import "../info/hassio-addon-system-managed";
import "./hassio-addon-audio";
import "./hassio-addon-config";
import "./hassio-addon-network";

@customElement("hassio-addon-config-tab")
class HassioAddonConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public addon?: HassioAddonDetails;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, attribute: "control-enabled" })
  public controlEnabled = false;

  protected render(): TemplateResult {
    if (!this.addon) {
      return html`<ha-spinner></ha-spinner>`;
    }
    const hasConfiguration =
      (this.addon.options && Object.keys(this.addon.options).length) ||
      (this.addon.schema && Object.keys(this.addon.schema).length);

    return html`
      <div class="content">
        ${this.addon.system_managed &&
        (hasConfiguration || this.addon.network || this.addon.audio)
          ? html`
              <hassio-addon-system-managed
                .supervisor=${this.supervisor}
                .narrow=${this.narrow}
                .hideButton=${this.controlEnabled}
              ></hassio-addon-system-managed>
            `
          : nothing}
        ${hasConfiguration || this.addon.network || this.addon.audio
          ? html`
              ${hasConfiguration
                ? html`
                    <hassio-addon-config
                      .hass=${this.hass}
                      .addon=${this.addon}
                      .supervisor=${this.supervisor}
                      .disabled=${this.addon.system_managed &&
                      !this.controlEnabled}
                    ></hassio-addon-config>
                  `
                : nothing}
              ${this.addon.network
                ? html`
                    <hassio-addon-network
                      .hass=${this.hass}
                      .addon=${this.addon}
                      .supervisor=${this.supervisor}
                      .disabled=${this.addon.system_managed &&
                      !this.controlEnabled}
                    ></hassio-addon-network>
                  `
                : nothing}
              ${this.addon.audio
                ? html`
                    <hassio-addon-audio
                      .hass=${this.hass}
                      .addon=${this.addon}
                      .supervisor=${this.supervisor}
                      .disabled=${this.addon.system_managed &&
                      !this.controlEnabled}
                    ></hassio-addon-audio>
                  `
                : nothing}
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
