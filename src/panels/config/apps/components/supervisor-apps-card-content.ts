import {
  mdiArrowUpBoldCircle,
  mdiCheckCircle,
  mdiExclamationThick,
  mdiHelpCircleOutline,
  mdiStop,
} from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/automation/ha-automation-row-event-chip";
import "../../../../components/ha-badge";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import type { AddonStage, AddonState } from "../../../../data/hassio/addon";
import type { HomeAssistant } from "../../../../types";
import { getAppDisplayName } from "../common/app";

type BadgeVariant = "brand" | "success" | "warning" | "danger" | "neutral";

// A running app is the healthy case and gets no badge, matching the
// integration card where a loaded integration shows nothing.
// A started app is the healthy case and gets no badge, matching the integration
// card where a loaded integration shows nothing.
const STATE_BADGES: Record<
  string,
  { variant: "danger" | "warning" | "neutral"; icon: string }
> = {
  error: { variant: "danger", icon: mdiExclamationThick },
  startup: { variant: "warning", icon: mdiExclamationThick },
  unknown: { variant: "warning", icon: mdiExclamationThick },
  stopped: { variant: "neutral", icon: mdiStop },
};

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

  @property() public state?: AddonState;

  @property({ type: Boolean }) public installed = false;

  @property({ type: Boolean, attribute: "update-available" })
  public updateAvailable = false;

  @property() public description?: string;

  @property({ type: Boolean }) public available = true;

  @property({ attribute: false }) public tags?: AppTag[];

  @property({ attribute: false }) public iconTitle?: string;

  @property() public icon = mdiHelpCircleOutline;

  @property({ attribute: false }) public iconImage?: string;

  protected render(): TemplateResult {
    const stateBadge = this._stateBadge();

    return html`
      <div class="app">
        <div class="top">
          <div class="icon-wrapper">
            <div class="thumbnail">
              ${
                this.iconImage
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
                    `
              }
            </div>
            ${
              stateBadge
                ? html`<div
                      id="state-badge"
                      class="badge ${stateBadge.variant}"
                    >
                      <ha-svg-icon .path=${stateBadge.icon}></ha-svg-icon>
                    </div>
                    <ha-tooltip for="state-badge" placement="top">
                      ${stateBadge.label}
                    </ha-tooltip>`
                : nothing
            }
          </div>
          <div class="info">
            <div class="title">
              ${getAppDisplayName(this.title, this.stage)}
            </div>
            <div class="addition">
              ${this.description}${
                /* treat as available when undefined */
                this.available === false ? " (Not available)" : ""
              }
            </div>
          </div>
        </div>
        ${this._renderFooter(stateBadge)}
      </div>
    `;
  }

  private _renderFooter(stateBadge?: {
    variant: BadgeVariant;
    icon: string;
    label: string;
  }) {
    const hasBadges = Boolean(
      this.installed || this.tags?.some((tag) => tag.iconPath)
    );

    // A healthy app with nothing extra to report skips the divider entirely.
    if (!stateBadge && !this.updateAvailable && !hasBadges) {
      return nothing;
    }

    return html`
      <div class="footer">
        ${
          stateBadge
            ? html`<ha-automation-row-event-chip
                show
                .variant=${stateBadge.variant}
              >
                <ha-svg-icon .path=${stateBadge.icon}></ha-svg-icon>
                ${stateBadge.label}
              </ha-automation-row-event-chip>`
            : nothing
        }
        ${
          this.updateAvailable
            ? html`<ha-automation-row-event-chip show>
                <ha-svg-icon .path=${mdiArrowUpBoldCircle}></ha-svg-icon>
                ${this.hass.localize("ui.panel.config.apps.state.update_available")}
              </ha-automation-row-event-chip>`
            : nothing
        }
        ${
          hasBadges
            ? html`<div class="badges">
                ${
                  this.installed
                    ? this._renderBadge(
                        "badge-installed",
                        mdiCheckCircle,
                        "success",
                        this.hass.localize(
                          "ui.panel.config.apps.state.installed"
                        )
                      )
                    : nothing
                }
                ${this.tags?.map((tag, index) =>
                  tag.iconPath
                    ? this._renderBadge(
                        `badge-tag-${index}`,
                        tag.iconPath,
                        tag.variant,
                        tag.label
                      )
                    : nothing
                )}
              </div>`
            : nothing
        }
      </div>
    `;
  }

  private _stateBadge() {
    // AddonState includes null; treat that as "no state reported"
    const state = this.state || undefined;
    const badge = state && STATE_BADGES[state];
    if (!state || !badge) {
      return undefined;
    }
    return {
      ...badge,
      label: this.hass.localize(
        `ui.panel.config.apps.dashboard.capability.state.${state}`
      ),
    };
  }

  private _renderBadge(
    id: string,
    iconPath: string,
    variant: BadgeVariant,
    label: string
  ): TemplateResult {
    return html`
      <ha-badge id=${id} icon-only class=${variant}>
        <ha-svg-icon slot="icon" .path=${iconPath}></ha-svg-icon>
      </ha-badge>
      <ha-tooltip for=${id} placement="left">${label}</ha-tooltip>
    `;
  }

  static styles = css`
    .app {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-3);
      min-width: 0;
    }
    .top {
      display: flex;
      align-items: center;
      gap: var(--ha-space-4);
    }
    /* full-bleed footer inside the card content's 16px padding */
    .footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ha-space-2);
      margin: 0 -16px -16px;
      padding: var(--ha-space-3) 16px 16px;
      border-top: 1px solid var(--divider-color, #e8e8e8);
      font-size: var(--ha-font-size-s);
    }
    .icon-wrapper {
      position: relative;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }
    .thumbnail {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--ha-border-radius-lg);
      border: 1px solid var(--ha-color-border-neutral-quiet);
      box-sizing: border-box;
      /* inset the artwork so it does not touch the border */
      padding: 3px;
      overflow: hidden;
    }
    /* Same treatment as the automation picker rows */
    .badge {
      position: absolute;
      top: -4px;
      inset-inline-end: -4px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: var(--ha-border-radius-circle);
      box-shadow: 0 0 0 2px
        var(--ha-card-background, var(--card-background-color));
      color: var(--ha-card-background, var(--card-background-color));
      --mdc-icon-size: 12px;
    }
    .badge.danger {
      background-color: var(--error-color);
    }
    .badge.warning {
      background-color: var(--warning-color);
    }
    .badge.neutral {
      background-color: var(--disabled-color);
    }
    .app-icon {
      color: var(--secondary-text-color);
    }
    .icon-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .info {
      flex: 1;
      min-width: 0;
    }
    .title {
      color: var(--primary-text-color);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .addition {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
      margin-top: var(--ha-space-1);
      line-height: var(--ha-line-height-condensed);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .badges {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      flex-shrink: 0;
      /* pushes them to the far end of the footer */
      margin-inline-start: auto;
    }
    /* the host is inline by default, whose line box adds a stray pixel of
       leading and misaligns a wrapped chip */
    ha-automation-row-event-chip {
      display: flex;
    }
    ha-badge {
      --ha-badge-size: 32px;
      --ha-badge-icon-size: 20px;
    }
    ha-badge.danger {
      --badge-color: var(--error-color);
    }
    ha-badge.warning {
      --badge-color: var(--warning-color);
    }
    ha-badge.success {
      --badge-color: var(--success-color);
    }
    ha-badge.brand {
      --badge-color: var(--primary-color);
    }
    ha-badge.neutral {
      --badge-color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-apps-card-content": SupervisorAppsCardContent;
  }
}
