import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import {
  domainToName,
  type IntegrationManifest,
} from "../../../data/integration";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-card";
import "../../../components/item/ha-row-item";
import { brandsUrl } from "../../../util/brands-url";
import { haStyle } from "../../../resources/styles";

@customElement("ha-integration-action-card")
export class HaIntegrationActionCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public banner!: string;

  @property({ attribute: false }) public localizedDomainName?: string;

  @property() public domain!: string;

  @property() public label!: string;

  @property({ attribute: false }) public manifest?: IntegrationManifest;

  protected render(): TemplateResult {
    return html`
      <ha-card outlined>
        <ha-row-item>
          <img
            slot="start"
            alt=""
            src=${brandsUrl(
              {
                domain: this.domain,
                type: "icon",
                darkOptimized: this.hass.themes?.darkMode,
              },
              this.hass.auth.data.hassUrl
            )}
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
            @error=${this._onImageError}
            @load=${this._onImageLoad}
          />
          <span slot="headline" role="heading" aria-level="2"
            >${this.label}</span
          >
          <span slot="supporting-text">
            ${
              this.localizedDomainName &&
              this.localizedDomainName !== this.domain
                ? this.localizedDomainName
                : domainToName(this.hass.localize, this.domain, this.manifest)
            }
          </span>
          <slot name="header-button" slot="end"></slot>
        </ha-row-item>
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

  static styles = [
    haStyle,
    css`
      ha-card {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
      }
      ha-row-item {
        --ha-row-item-padding-block: var(--ha-space-4) var(--ha-space-2);
        --ha-row-item-padding-inline: var(--ha-space-4) var(--ha-space-2);
        --ha-row-item-gap: var(--ha-space-4);
      }
      ha-row-item::part(headline) {
        white-space: normal;
        overflow-wrap: anywhere;
        font-size: var(--ha-font-size-l);
      }
      /* Pull the 48px icon button flush into the card corner */
      ha-row-item::part(end) {
        align-self: flex-start;
        margin-block-start: calc(var(--ha-space-4) * -1);
        margin-inline-end: calc(var(--ha-space-2) * -1);
      }
      img {
        width: 40px;
        height: 40px;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--ha-space-2);
        padding: 0 var(--ha-space-4) var(--ha-space-4);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-action-card": HaIntegrationActionCard;
  }
}
