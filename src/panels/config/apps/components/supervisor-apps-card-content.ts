import "@home-assistant/webawesome/dist/components/tag/tag";
import { mdiHelpCircleOutline } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-svg-icon";
import type { AddonStage } from "../../../../data/hassio/addon";
import type { HomeAssistant } from "../../../../types";
import { getAppDisplayName } from "../common/app";
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
        ${this.iconImage
          ? html`
              <div class="icon_image">
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
                class="app-icon"
                .path=${this.icon}
                .title=${this.iconTitle}
              ></ha-svg-icon>
            `}
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
    `;
  }

  static styles = css`
    .app {
      margin-bottom: var(--ha-space-2);
      display: flex;
    }
    .app-icon {
      margin-right: var(--ha-space-6);
      margin-left: var(--ha-space-2);
      margin-top: var(--ha-space-3);
      color: var(--secondary-text-color);
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
    .icon_image img {
      max-height: 40px;
      max-width: 40px;
      margin-top: var(--ha-space-1);
      margin-right: var(--ha-space-4);
      float: left;
    }
    .tags {
      border-top: var(--ha-border-width-sm) solid
        var(--ha-color-border-neutral-quiet);
      padding-top: var(--ha-space-2);
      display: flex;
      gap: var(--ha-space-2);
      flex-wrap: wrap;
    }
    wa-tag {
      font-size: var(--ha-font-size-s);
      border-radius: var(--ha-border-radius-pill);
      height: 24px;
    }
    wa-tag ha-svg-icon {
      --mdc-icon-size: 16px;
      width: 16px;
      height: 16px;
    }
    wa-tag[variant="success"] ha-svg-icon {
      color: var(--ha-color-on-success-normal);
    }
    wa-tag[variant="warning"] ha-svg-icon {
      color: var(--ha-color-on-warning-normal);
    }
    wa-tag[variant="danger"] ha-svg-icon {
      color: var(--ha-color-on-error-normal);
    }
    wa-tag[variant="neutral"] ha-svg-icon {
      color: var(--ha-color-on-neutral-normal);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-apps-card-content": SupervisorAppsCardContent;
  }
}
