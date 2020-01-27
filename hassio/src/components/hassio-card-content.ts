import {
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
  property,
  customElement,
} from "lit-element";
import "@polymer/iron-icon/iron-icon";

import "../../../src/components/ha-relative-time";
import { HomeAssistant } from "../../../src/types";

@customElement("hassio-card-content")
class HassioCardContent extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public title!: string;
  @property() public description?: string;
  @property({ type: Boolean }) public available?: boolean;
  @property() public datetime?: string;
  @property() public iconTitle?: string;
  @property() public iconClass?: string;
  @property() public icon = "hass:help-circle";

  protected render(): TemplateResult {
    return html`
      <iron-icon
        class=${this.iconClass}
        .icon=${this.icon}
        .title=${this.iconTitle}
      ></iron-icon>
      <div>
        <div class="title">${this.title}</div>
        <div class="addition">
          ${this.description}
          ${/* treat as available when undefined */
          this.available === false ? " (Not available)" : ""}
          ${this.datetime
            ? html`
                <ha-relative-time
                  .hass=${this.hass}
                  class="addition"
                  .datetime=${this.datetime}
                ></ha-relative-time>
              `
            : undefined}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      iron-icon {
        margin-right: 16px;
        margin-top: 16px;
        float: left;
        color: var(--secondary-text-color);
      }
      iron-icon.update {
        color: var(--paper-orange-400);
      }
      iron-icon.running,
      iron-icon.installed {
        color: var(--paper-green-400);
      }
      iron-icon.hassupdate,
      iron-icon.snapshot {
        color: var(--paper-item-icon-color);
      }
      iron-icon.not_available {
        color: var(--google-red-500);
      }
      .title {
        color: var(--primary-text-color);
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }
      .addition {
        color: var(--secondary-text-color);
        overflow: hidden;
        position: relative;
        height: 2.4em;
        line-height: 1.2em;
      }
      ha-relative-time {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-card-content": HassioCardContent;
  }
}
