import { mdiHelpCircleOutline } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-svg-icon";
import type { AddonStage } from "../../../../data/hassio/addon";
import type { HomeAssistant } from "../../../../types";
import { getAppDisplayName } from "../common/app";

@customElement("supervisor-apps-card-content")
class SupervisorAppsCardContent extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  // eslint-disable-next-line lit/no-native-attributes
  @property() public title!: string;

  @property() public stage: AddonStage = "stable";

  @property() public description?: string;

  @property({ type: Boolean }) public available = true;

  @property({ attribute: false }) public showTopbar = false;

  @property({ attribute: false }) public topbarClass?: string;

  @property({ attribute: false }) public iconTitle?: string;

  @property({ attribute: false }) public iconClass?: string;

  @property() public icon = mdiHelpCircleOutline;

  @property({ attribute: false }) public iconImage?: string;

  protected render(): TemplateResult {
    const stageLabel =
      this.stage !== "stable"
        ? this.hass.localize(
            `ui.panel.config.apps.dashboard.capability.stages.${this.stage}`
          )
        : undefined;

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
              <div class=${this.iconClass === "update" ? "dot" : ""}></div>
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
        <div class="title-row">
          <div class="title">${getAppDisplayName(this.title, this.stage)}</div>
          ${stageLabel
            ? html` <span class="stage ${this.stage}"> ${stageLabel} </span> `
            : nothing}
        </div>
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
      flex: 1;
      min-width: 0;
      color: var(--primary-text-color);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      min-width: 0;
    }
    .stage {
      flex: none;
      border-radius: 999px;
      font-size: 12px;
      line-height: 1;
      padding: 4px 8px;
      white-space: nowrap;
    }
    .stage.experimental {
      color: var(--warning-color);
      background-color: rgba(var(--rgb-warning-color), 0.12);
    }
    .stage.deprecated {
      color: var(--error-color);
      background-color: rgba(var(--rgb-error-color), 0.12);
    }
    .addition {
      color: var(--secondary-text-color);
      margin-top: var(--ha-space-1);
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
