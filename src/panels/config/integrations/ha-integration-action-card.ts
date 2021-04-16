import {
  customElement,
  LitElement,
  property,
  CSSResult,
  css,
} from "lit-element";
import { TemplateResult, html } from "lit-html";
import { IntegrationManifest } from "../../../data/integration";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import {
  haConfigIntegrationRenderIcons,
  haConfigIntegrationsStyles,
} from "./ha-config-integrations-common";

@customElement("ha-integration-action-card")
export class HaIntegrationActionCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public banner!: string;

  @property() public domain!: string;

  @property() public label!: string;

  @property() public manifest?: IntegrationManifest;

  protected render(): TemplateResult {
    return html`
      <ha-card outlined>
        <div class="banner">
          ${this.banner}
        </div>
        <div class="content">
          ${haConfigIntegrationRenderIcons(this.hass, this.manifest)}
          <div class="image">
            <img
              src=${brandsUrl(this.domain, "logo")}
              referrerpolicy="no-referrer"
              @error=${this._onImageError}
              @load=${this._onImageLoad}
            />
          </div>
          <h2>${this.label}</h2>
        </div>
        <div class="actions"><slot></slot></div>
      </ha-card>
    `;
  }

  private _onImageLoad(ev) {
    ev.target.style.visibility = "initial";
  }

  private _onImageError(ev) {
    ev.target.style.visibility = "hidden";
  }

  static get styles(): CSSResult[] {
    return [
      haConfigIntegrationsStyles,
      css`
        ha-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          --ha-card-border-color: var(--state-color);
          --mdc-theme-primary: var(--state-color);
        }
        .content {
          position: relative;
          flex: 1;
        }
        .image {
          height: 60px;
          margin-top: 16px;
          display: flex;
          align-items: center;
          justify-content: space-around;
        }
        img {
          max-width: 90%;
          max-height: 100%;
        }
        h2 {
          text-align: center;
          margin: 16px 8px 0;
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
          padding: 8px 16px 0 8px;
          height: 48px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-action-card": HaIntegrationActionCard;
  }
}
