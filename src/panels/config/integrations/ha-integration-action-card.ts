import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import type { IntegrationManifest } from "../../../data/integration";
import type { HomeAssistant } from "../../../types";
import "./ha-integration-header";

@customElement("ha-integration-action-card")
export class HaIntegrationActionCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public banner!: string;

  @property() public localizedDomainName?: string;

  @property() public domain!: string;

  @property() public label!: string;

  @property() public manifest?: IntegrationManifest;

  protected render(): TemplateResult {
    return html`
      <ha-card outlined>
        <ha-integration-header
          .hass=${this.hass}
          .banner=${this.banner}
          .domain=${this.domain}
          .label=${this.label}
          .localizedDomainName=${this.localizedDomainName}
          .manifest=${this.manifest}
        ></ha-integration-header>
        <div class="filler"></div>
        <div class="actions"><slot></slot></div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      --ha-card-border-color: var(--state-color);
      --mdc-theme-primary: var(--state-color);
    }
    .filler {
      flex: 1;
    }
    .attention {
      --state-color: var(--error-color);
      --text-on-state-color: var(--text-primary-color);
    }
    .discovered {
      --state-color: var(--primary-color);
      --text-on-state-color: var(--text-primary-color);
    }
    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 6px 0;
      height: 48px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-action-card": HaIntegrationActionCard;
  }
}
