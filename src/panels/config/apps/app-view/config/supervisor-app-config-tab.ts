import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../components/ha-spinner";
import type { HassioAddonDetails } from "../../../../../data/hassio/addon";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { supervisorAppsStyle } from "../../resources/supervisor-apps-style";
import "../info/supervisor-app-system-managed";
import "./supervisor-app-audio";
import "./supervisor-app-config";
import "./supervisor-app-network";

@customElement("supervisor-app-config-tab")
class SupervisorAppConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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
              <supervisor-app-system-managed
                .hass=${this.hass}
                .narrow=${this.narrow}
                .hideButton=${this.controlEnabled}
              ></supervisor-app-system-managed>
            `
          : nothing}
        ${hasConfiguration || this.addon.network || this.addon.audio
          ? html`
              ${hasConfiguration
                ? html`
                    <supervisor-app-config
                      .hass=${this.hass}
                      .addon=${this.addon}
                      .disabled=${this.addon.system_managed &&
                      !this.controlEnabled}
                    ></supervisor-app-config>
                  `
                : nothing}
              ${this.addon.network
                ? html`
                    <supervisor-app-network
                      .hass=${this.hass}
                      .addon=${this.addon}
                      .disabled=${this.addon.system_managed &&
                      !this.controlEnabled}
                    ></supervisor-app-network>
                  `
                : nothing}
              ${this.addon.audio
                ? html`
                    <supervisor-app-audio
                      .hass=${this.hass}
                      .addon=${this.addon}
                      .disabled=${this.addon.system_managed &&
                      !this.controlEnabled}
                    ></supervisor-app-audio>
                  `
                : nothing}
            `
          : this.hass.localize(
              "ui.panel.config.apps.configuration.no_configuration"
            )}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      supervisorAppsStyle,
      css`
        .content {
          margin: auto;
          padding: var(--ha-space-2);
          max-width: 1024px;
        }
        supervisor-app-network,
        supervisor-app-audio,
        supervisor-app-config {
          margin-bottom: var(--ha-space-6);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-app-config-tab": SupervisorAppConfigDashboard;
  }
}
