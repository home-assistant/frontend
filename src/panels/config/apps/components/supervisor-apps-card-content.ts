import { mdiHelpCircle } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";

@customElement("supervisor-apps-card-content")
class SupervisorAppsCardContent extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  // eslint-disable-next-line lit/no-native-attributes
  @property() public title!: string;

  @property() public description?: string;

  @property({ type: Boolean }) public available = true;

  @property({ attribute: false }) public showTopbar = false;

  @property({ attribute: false }) public topbarClass?: string;

  @property({ attribute: false }) public iconTitle?: string;

  @property({ attribute: false }) public iconClass?: string;

  @property() public icon = mdiHelpCircle;

  @property({ attribute: false }) public iconImage?: string;

  protected render(): TemplateResult {
    return html`
      ${this.showTopbar
        ? html` <div class="topbar ${this.topbarClass}"></div> `
        : ""}
      ${this.iconImage
        ? html`
            <div class="icon_image ${this.iconClass}">
              <img
                src=${this.iconImage}
                .title=${this.iconTitle}
                alt=${this.iconTitle ?? ""}
              />
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

  static styles = css`
    :host {
      direction: ltr;
    }

    ha-svg-icon {
      margin-right: var(--ha-space-6);
      margin-left: var(--ha-space-2);
      margin-top: var(--ha-space-3);
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
      color: var(--state-icon-color);
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
      line-height: var(--ha-line-height-condensed);
    }
    .icon_image img {
      max-height: 40px;
      max-width: 40px;
      margin-top: var(--ha-space-1);
      margin-right: var(--ha-space-4);
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
      top: var(--ha-space-2);
      right: var(--ha-space-2);
      border-radius: var(--ha-border-radius-circle);
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

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-apps-card-content": SupervisorAppsCardContent;
  }
}
