import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { DragScrollController } from "../../../common/controllers/drag-scroll-controller";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-state-icon";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import "../../../state-display/state-display";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import "../heading-badges/hui-heading-badge";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../types";
import { DEFAULT_VIEW_HEADER_BADGES_WRAP } from "../views/hui-view-header";
import type { HeadingCardConfig } from "./types";

export const migrateHeadingCardConfig = (
  config: HeadingCardConfig
): HeadingCardConfig => {
  const newConfig = { ...config };
  if (newConfig.entities) {
    newConfig.badges = [...(newConfig.badges || []), ...newConfig.entities];
    delete newConfig.entities;
  }
  return newConfig;
};

@customElement("hui-heading-card")
export class HuiHeadingCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-heading-card-editor");
    return document.createElement("hui-heading-card-editor");
  }

  public static getStubConfig(hass: HomeAssistant): HeadingCardConfig {
    return {
      type: "heading",
      icon: "mdi:fridge",
      heading: hass.localize("ui.panel.lovelace.cards.heading.default_heading"),
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public preview = false;

  @state() private _config?: HeadingCardConfig;

  private _dragScrollController = new DragScrollController(this, {
    selector: ".badges.scroll",
    enabled: false,
  });

  public setConfig(config: HeadingCardConfig): void {
    this._config = {
      tap_action: {
        action: "none",
      },
      badges_wrap: DEFAULT_VIEW_HEADER_BADGES_WRAP,
      ...migrateHeadingCardConfig(config),
    };
  }

  protected willUpdate(changedProperties: PropertyValues<typeof this>): void {
    if (!changedProperties.size) {
      return;
    }

    this._dragScrollController.enabled =
      !this.preview && this._config?.badges_wrap === "scroll";
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: "full",
      rows: "auto",
      min_columns: 3,
    };
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const actionable = hasAction(this._config.tap_action);

    const style = this._config.heading_style || "title";

    const badges = this._config.badges;
    const badgesWrap =
      this._config.badges_wrap ?? DEFAULT_VIEW_HEADER_BADGES_WRAP;
    const badgeDragging = this._dragScrollController.scrolling;

    return html`
      <ha-card>
        <div class="container">
          <div
            class="content ${style}"
            @action=${this._handleAction}
            .actionHandler=${actionHandler()}
            role=${ifDefined(actionable ? "button" : undefined)}
            tabindex=${ifDefined(actionable ? "0" : undefined)}
          >
            ${this._config.icon
              ? html`<ha-icon .icon=${this._config.icon}></ha-icon>`
              : nothing}
            ${this._config.heading
              ? html`<p>${this._config.heading}</p>`
              : nothing}
            ${actionable ? html`<ha-icon-next></ha-icon-next>` : nothing}
          </div>
          ${badges?.length
            ? html`
                <div
                  class=${classMap({
                    badges: true,
                    [badgesWrap]: true,
                    dragging: badgeDragging,
                  })}
                >
                  ${badges.map(
                    (config) => html`
                      <hui-heading-badge
                        .config=${config}
                        .hass=${this.hass}
                        .preview=${this.preview}
                      >
                      </hui-heading-badge>
                    `
                  )}
                </div>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      background: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      border: none;
      box-shadow: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      height: 100%;
      min-height: 24px;
    }
    [role="button"] {
      cursor: pointer;
    }
    ha-icon-next {
      display: inline-block;
      transition: transform 180ms ease-in-out;
    }
    .container {
      padding: 0 var(--ha-space-1);
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      flex-wrap: nowrap;
      align-items: center;
      overflow: visible;
      gap: var(--ha-space-2);
    }
    .content:hover ha-icon-next {
      transform: translateX(calc(4px * var(--scale-direction)));
    }
    .container .content {
      flex: 1 0 auto;
      min-width: 100px;
    }
    .container .content:not(:has(p)) {
      min-width: fit-content;
    }
    .container .badges {
      flex: 0 1 auto;
      min-width: 0;
    }
    .content {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: var(--ha-space-2);
      color: var(--ha-heading-card-title-color, var(--primary-text-color));
      font-size: var(--ha-heading-card-title-font-size, var(--ha-font-size-l));
      font-weight: var(
        --ha-heading-card-title-font-weight,
        var(--ha-font-weight-normal)
      );
      line-height: var(
        --ha-heading-card-title-line-height,
        var(--ha-line-height-normal)
      );
      letter-spacing: 0.1px;
      --mdc-icon-size: 18px;
    }
    .content ha-icon,
    .content ha-icon-next {
      display: flex;
      flex: none;
    }
    .content p {
      margin: 0;
      font-style: normal;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 1;
      min-width: 0;
    }
    .content.subtitle {
      color: var(--ha-heading-card-subtitle-color, var(--secondary-text-color));
      font-size: var(
        --ha-heading-card-subtitle-font-size,
        var(--ha-font-size-m)
      );
      font-weight: var(
        --ha-heading-card-subtitle-font-weight,
        var(--ha-font-weight-medium)
      );
      line-height: var(
        --ha-heading-card-subtitle-line-height,
        var(--ha-line-height-condensed)
      );
    }
    .badges {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: var(--ha-space-2);
    }
    /* Use before and after because padding doesn't work well with scrolling */
    .badges::before,
    .badges::after {
      content: "";
      position: relative;
      display: block;
      min-width: var(--badge-padding, 0);
      height: var(--ha-space-4);
      background-color: transparent;
    }
    .badges::before {
      margin-inline-start: calc(var(--ha-space-2) * -1);
      margin-inline-end: 0;
    }
    .badges::after {
      margin-inline-end: calc(var(--ha-space-2) * -1);
      margin-inline-start: 0;
    }
    .badges > * {
      min-width: fit-content;
    }
    .badges.scroll {
      justify-content: flex-start;
      flex-wrap: nowrap;
      --badge-padding: var(--ha-space-4);
      overflow: auto;
      max-width: 100%;
      scrollbar-color: var(--scrollbar-thumb-color) transparent;
      scrollbar-width: none;
      mask-image: linear-gradient(
        90deg,
        transparent 0%,
        black var(--ha-space-4),
        black calc(100% - var(--ha-space-4)),
        transparent 100%
      );
    }
    .badges.dragging {
      pointer-events: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-card": HuiHeadingCard;
  }
}
