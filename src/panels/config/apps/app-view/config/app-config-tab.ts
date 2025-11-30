import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../components/ha-spinner";
import type { HassioAddonDetails } from "../../../../../data/hassio/addon";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { appsStyle } from "../../resources/apps-style";
import "../info/app-system-managed";
import "./app-audio";
import "./app-config";
import "./app-network";

@customElement("app-config-tab")
class AppConfigDashboard extends LitElement {
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
              <app-system-managed
                .hass=${this.hass}
                .narrow=${this.narrow}
                .hideButton=${this.controlEnabled}
              ></app-system-managed>
            `
          : nothing}
        ${hasConfiguration || this.addon.network || this.addon.audio
          ? html`
              ${hasConfiguration
                ? html`
                    <app-config
                      .hass=${this.hass}
                      .addon=${this.addon}
                      .disabled=${this.addon.system_managed &&
                      !this.controlEnabled}
                    ></app-config>
                  `
                : nothing}
              ${this.addon.network
                ? html`
                    <app-network
                      .hass=${this.hass}
                      .addon=${this.addon}
                      .disabled=${this.addon.system_managed &&
                      !this.controlEnabled}
                    ></app-network>
                  `
                : nothing}
              ${this.addon.audio
                ? html`
                    <app-audio
                      .hass=${this.hass}
                      .addon=${this.addon}
                      .disabled=${this.addon.system_managed &&
                      !this.controlEnabled}
                    ></app-audio>
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
      appsStyle,
      css`
        .content {
          margin: auto;
          padding: 8px;
          max-width: 1024px;
        }
        app-network,
        app-audio,
        app-config {
          margin-bottom: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-config-tab": AppConfigDashboard;
  }
}
