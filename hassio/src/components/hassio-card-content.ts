import {
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
  property,
  customElement,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import "@polymer/iron-icon/iron-icon";

import "../../../src/components/ha-relative-time";
import { HomeAssistant } from "../../../src/types";

@customElement("hassio-card-content")
class HassioCardContent extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public title!: string;
  @property() public description?: string;
  @property({ type: Boolean }) public available: boolean = true;
  @property({ type: Boolean }) public showTopbar: boolean = false;
  @property() public topbarClass?: string;
  @property() public datetime?: string;
  @property() public iconTitle?: string;
  @property() public iconClass?: string;
  @property() public icon = "hass:help-circle";
  @property() public iconImage?: string;

  protected render(): TemplateResult {
    return html`
      ${this.showTopbar
        ? html`
            <div class="topbar ${this.topbarClass}"></div>
          `
        : ""}
      ${this.iconImage
        ? html`
            <div class="icon_image ${this.iconClass}">
              <img src="${this.iconImage}" title="${this.iconTitle}" />
              <div></div>
            </div>
          `
        : html`
            <iron-icon
              class=${this.iconClass}
              .icon=${this.icon}
              .title=${this.iconTitle}
            ></iron-icon>
          `}
      <div>
        <div class="title">
          ${this.title}
        </div>
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
        margin-right: 24px;
        margin-left: 8px;
        margin-top: 12px;
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
      .icon_image img {
        max-height: 40px;
        max-width: 40px;
        margin-top: 4px;
        margin-right: 16px;
        float: left;
      }
      .icon_image.stopped,
      .icon_image.not_available {
        filter: grayscale(1);
      }
      .dot {
        position: absolute;
        background-color: var(--paper-orange-400);
        width: 12px;
        height: 12px;
        top: 8px;
        right: 8px;
        border-radius: 50%;
      }
      .topbar {
        position: absolute;
        width: 100%;
        height: 2px;
        top: 0;
        left: 0;
        border-top-left-radius: 2px;
        border-top-right-radius: 2px;
      }
      .topbar.installed {
        background-color: var(--primary-color);
      }
      .topbar.update {
        background-color: var(--accent-color);
      }
      .topbar.unavailable {
        background-color: var(--error-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-card-content": HassioCardContent;
  }
}
