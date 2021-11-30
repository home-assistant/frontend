import { mdiHelpCircle } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../src/components/ha-svg-icon";
import { HomeAssistant } from "../../../src/types";

@customElement("hassio-card-content")
class HassioCardContent extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public title!: string;

  @property() public description?: string;

  @property({ type: Boolean }) public available = true;

  @property({ type: Boolean }) public showTopbar = false;

  @property() public topbarClass?: string;

  @property() public iconTitle?: string;

  @property() public iconClass?: string;

  @property() public icon = mdiHelpCircle;

  @property() public iconImage?: string;

  protected render(): TemplateResult {
    return html`
      ${this.showTopbar
        ? html` <div class="topbar ${this.topbarClass}"></div> `
        : ""}
      ${this.iconImage
        ? html`
            <div class="icon_image ${this.iconClass}">
              <img src=${this.iconImage} .title=${this.iconTitle} />
              <div></div>
            </div>
          `
        : html`
            <ha-svg-icon
              class=${this.iconClass!}
              .path=${this.icon}
              .title=${this.iconTitle}
            ></ha-svg-icon>
          `}
      <div>
        <div class="title">${this.title}</div>
        <div class="addition">
          ${this.description}
          ${
            /* treat as available when undefined */
            this.available === false ? " (Not available)" : ""
          }
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-svg-icon {
        margin-right: 24px;
        margin-left: 8px;
        margin-top: 12px;
        float: left;
        color: var(--secondary-text-color);
      }
      ha-svg-icon.update {
        color: var(--warning-color);
      }
      ha-svg-icon.running,
      ha-svg-icon.installed {
        color: var(--success-color);
      }
      ha-svg-icon.hassupdate,
      ha-svg-icon.backup {
        color: var(--paper-item-icon-color);
      }
      ha-svg-icon.not_available {
        color: var(--error-color);
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
        background-color: var(--warning-color);
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
