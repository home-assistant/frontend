import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-state-icon";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import "../../../state-display/state-display";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { DEFAULT_CONFIG } from "../editor/heading-badge-editor/hui-entity-heading-badge-editor";
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
    await import(
      "../editor/heading-badge-editor/hui-button-heading-badge-editor"
    );
    return document.createElement("hui-heading-button-editor");
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ButtonHeadingBadgeConfig;

  @property({ type: Boolean }) public preview = false;

  public setConfig(config): void {
    this._config = {
      ...DEFAULT_CONFIG,
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

    return html`
      <ha-button
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
      >
        <ha-icon .icon=${config.icon}></ha-icon>
        ${this._config.text}
      </ha-button>
    `;
  }

  static styles = css`
    [role="button"] {
      cursor: pointer;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-heading-badge": HuiButtonHeadingBadge;
  }
}
