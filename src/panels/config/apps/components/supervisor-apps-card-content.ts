import "@home-assistant/webawesome/dist/components/tag/tag";
import { mdiHelpCircleOutline } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-svg-icon";
import type { AddonStage, AddonState } from "../../../../data/hassio/addon";
import type { HomeAssistant } from "../../../../types";
import { getAppDisplayName } from "../common/app";
import "./supervisor-apps-state";
import "./supervisor-apps-tag";

export interface AppTag {
  label: string;
  variant: "brand" | "success" | "warning" | "danger" | "neutral";
  iconPath?: string;
}

@customElement("supervisor-apps-card-content")
class SupervisorAppsCardContent extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  // eslint-disable-next-line lit/no-native-attributes
  @property() public title!: string;

  @property() public stage: AddonStage = "stable";

  @property() public state: AddonState = null;

  @property() public description?: string;

  @property({ type: Boolean }) public available = true;

  @property({ attribute: false }) public tags?: AppTag[];

  @property({ attribute: false }) public iconTitle?: string;

  @property({ attribute: false }) public iconClass?: string;

  @property() public icon = mdiHelpCircleOutline;

  @property({ attribute: false }) public iconImage?: string;

  protected render(): TemplateResult {
    return html`
      <div class="app">
        <div class="icon-wrapper">
          ${this.iconImage
            ? html`
                <img
                  class="icon-image"
                  src=${this.iconImage}
                  .title=${this.iconTitle}
                  alt=${this.iconTitle ?? ""}
                />
              `
            : html`
                <ha-svg-icon
                  class="app-icon"
                  .path=${this.icon}
                  .title=${this.iconTitle}
                ></ha-svg-icon>
              `}
        </div>
        <div>
          <div class="title-row">
            <div class="title">
              ${getAppDisplayName(this.title, this.stage)}
            </div>
          </div>
          <div class="addition">
            ${this.description}
            ${
              /* treat as available when undefined */
              this.available === false ? " (Not available)" : ""
            }
          </div>
        </div>
      </div>
      ${this.tags?.length || this.state
        ? html`
            <div class="footer">
              <supervisor-apps-state
                .state=${this.state || "unknown"}
              ></supervisor-apps-state>

              ${this.tags?.length
                ? html`<div class="tags">
                    ${this.tags.map(
                      (tag) =>
                        html`<supervisor-apps-tag
                          .variant=${tag.variant}
                          .iconPath=${tag.iconPath}
                          .label=${tag.label}
                        ></supervisor-apps-tag>`
                    )}
                  </div>`
                : nothing}
            </div>
          `
        : nothing}
    `;
  }

  static styles = css`
    .app {
      margin-bottom: var(--ha-space-2);
      gap: var(--ha-space-4);
      display: flex;
    }
    .icon-wrapper {
      position: relative;
      margin-top: var(--ha-space-1);
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }
    .app-icon {
      margin-left: var(--ha-space-2);
      margin-top: var(--ha-space-2);
      color: var(--secondary-text-color);
    }
    .icon-image {
      max-height: 40px;
      max-width: 40px;
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
    .addition {
      color: var(--secondary-text-color);
      margin-top: var(--ha-space-1);
      overflow: hidden;
      position: relative;
      height: 2.4em;
      line-height: var(--ha-line-height-condensed);
    }
    .footer {
      border-top: var(--ha-border-width-sm) solid
        var(--ha-color-border-neutral-quiet);
      padding-top: var(--ha-space-2);
      display: flex;
      gap: var(--ha-space-2);
      flex-wrap: wrap;
      justify-content: space-between;
    }
    .tags {
      display: flex;
      gap: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-apps-card-content": SupervisorAppsCardContent;
  }
}
