import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-card";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { configSections } from "../config-sections";
import "../dashboard/ha-config-navigation";
import "../ha-config-section";

@customElement("ha-config-connectivity")
class HaConfigConnectivity extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  protected render(): TemplateResult {
    const title = this.hass.localize(
      "ui.panel.config.dashboard.connectivity.main"
    );

    return html`
      <hass-subpage
        .hass=${this.hass}
        back-path="/config"
        .header=${title}
        .narrow=${this.narrow}
      >
        <ha-config-section .isWide=${this.isWide} full-width>
          <ha-card outlined>
            <ha-config-navigation
              .hass=${this.hass}
              .narrow=${this.narrow}
              .pages=${configSections.connectivity}
              .label=${title}
            ></ha-config-navigation>
          </ha-card>
        </ha-config-section>
      </hass-subpage>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-config-section {
          margin: auto;
          margin-top: -32px;
          max-width: 600px;
        }

        ha-card {
          overflow: hidden;
          margin-bottom: max(24px, var(--safe-area-inset-bottom));
        }

        @media all and (max-width: 600px) {
          ha-card {
            border-width: 1px 0;
            border-radius: var(--ha-border-radius-square);
            box-shadow: unset;
          }
          ha-config-section {
            margin-top: -42px;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-connectivity": HaConfigConnectivity;
  }
}
