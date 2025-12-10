import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import "../../../components/ha-control-button";
import "../../../components/ha-icon";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import type {
  LovelaceHeadingBadge,
  LovelaceHeadingBadgeEditor,
} from "../types";
import type { ButtonHeadingBadgeConfig } from "./types";

const DEFAULT_ACTIONS: Pick<
  ButtonHeadingBadgeConfig,
  "tap_action" | "hold_action" | "double_tap_action"
> = {
  tap_action: { action: "none" },
  hold_action: { action: "none" },
  double_tap_action: { action: "none" },
};

@customElement("hui-button-heading-badge")
export class HuiButtonHeadingBadge
  extends LitElement
  implements LovelaceHeadingBadge
{
  public static async getConfigElement(): Promise<LovelaceHeadingBadgeEditor> {
    await import("../editor/heading-badge-editor/hui-button-heading-badge-editor");
    return document.createElement("hui-button-heading-badge-editor");
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ButtonHeadingBadgeConfig;

  @property({ type: Boolean }) public preview = false;

  public setConfig(config: ButtonHeadingBadgeConfig): void {
    this._config = {
      ...DEFAULT_ACTIONS,
      ...config,
    };
  }

  get hasAction() {
    return (
      hasAction(this._config?.tap_action) ||
      hasAction(this._config?.hold_action) ||
      hasAction(this._config?.double_tap_action)
    );
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const config = this._config;

    const color = config.color ? computeCssColor(config.color) : undefined;

    const style = {
      "--control-button-icon-color": color,
      "--control-button-background-color": color,
    };

    return html`
      <ha-control-button
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        style=${styleMap(style)}
        .label=${config.content}
      >
        <span class="content">
          ${config.icon
            ? html`<ha-icon .icon=${config.icon}></ha-icon>`
            : nothing}
          ${config.content}
        </span>
      </ha-control-button>
    `;
  }

  static styles = css`
    ha-control-button {
      --control-button-border-radius: var(--ha-border-radius-md);
      --control-button-padding: 0 var(--ha-space-1);
      --mdc-icon-size: var(--ha-heading-badge-icon-size, 16px);
      width: auto;
      height: var(--ha-heading-badge-height, 24px);
      min-width: var(--ha-heading-badge-height, 24px);
      font-size: var(--ha-font-size-s);
    }
    .content {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: var(--ha-space-1);
      white-space: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-heading-badge": HuiButtonHeadingBadge;
  }
}
