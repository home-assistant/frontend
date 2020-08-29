import "@material/mwc-button/mwc-button";
import "@material/mwc-fab";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";

@customElement("ozw-node-dashboard")
class OZWNodeDashboard extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property() public ozwInstance?: number;

  @property() public nodeId?: number;

  protected render(): TemplateResult {
    return html`
      <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
        <div slot="header">
          Node Details
        </div>

        <div slot="introduction">
          Soon you will be able to view and manage a specific OZW node...
        </div>
      </ha-config-section>
    `;
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        .secondary {
          color: var(--secondary-text-color);
        }
        .online {
          color: green;
        }
        .starting {
          color: orange;
        }
        .offline {
          color: red;
        }
        .content {
          margin-top: 24px;
        }

        .sectionHeader {
          position: relative;
          padding-right: 40px;
        }

        .network-status {
          text-align: center;
        }

        .network-status div.details {
          font-size: 1.5rem;
          margin-bottom: 16px;
        }

        .network-status ha-svg-icon {
          display: block;
          margin: 0px auto 16px;
          width: 48px;
          height: 48px;
        }

        .network-status small {
          font-size: 1rem;
        }

        ha-card {
          margin: 0 auto;
          max-width: 600px;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--error-color);
        }

        .toggle-help-icon {
          position: absolute;
          top: -6px;
          right: 0;
          color: var(--primary-color);
        }

        ha-service-description {
          display: block;
          color: grey;
          padding: 0 8px 12px;
        }

        [hidden] {
          display: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ozw-node-dashboard": OZWNodeDashboard;
  }
}
