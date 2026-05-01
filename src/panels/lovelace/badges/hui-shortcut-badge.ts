import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import "../../../components/ha-badge";
import "../../../components/ha-icon";
import "../../../components/ha-svg-icon";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import { NavigationPathInfoController } from "../../../data/navigation-path-controller";
import type { HomeAssistant } from "../../../types";
import { getShortcutCardDefaults } from "../cards/hui-shortcut-card-defaults";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import type { LovelaceBadge, LovelaceBadgeEditor } from "../types";
import type { ShortcutBadgeConfig } from "./types";

@customElement("hui-shortcut-badge")
export class HuiShortcutBadge extends LitElement implements LovelaceBadge {
  public static async getConfigElement(): Promise<LovelaceBadgeEditor> {
    await import("../editor/config-elements/hui-shortcut-badge-editor");
    return document.createElement("hui-shortcut-badge-editor");
  }

  public static getStubConfig(): ShortcutBadgeConfig {
    return {
      type: "shortcut",
      tap_action: {
        action: "navigate",
        navigation_path: "/home",
      },
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ShortcutBadgeConfig;

  private _navInfo = new NavigationPathInfoController(this);

  public setConfig(config: ShortcutBadgeConfig): void {
    this._config = {
      tap_action: {
        action: "none",
      },
      ...config,
    };
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (
      (changedProps.has("hass") || changedProps.has("_config")) &&
      this.hass
    ) {
      const action = this._config?.tap_action;
      this._navInfo.update(
        this.hass,
        action?.action === "navigate" ? action.navigation_path : undefined
      );
    }
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  private get _hasAction() {
    return (
      hasAction(this._config?.tap_action) ||
      hasAction(this._config?.hold_action) ||
      hasAction(this._config?.double_tap_action)
    );
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const defaults = getShortcutCardDefaults(
      this.hass,
      this._config.tap_action,
      this._navInfo.info
    );
    const text = (this._config.text || defaults.label).trim();
    const icon = this._config.icon || defaults.icon;
    const iconPath = icon ? undefined : defaults.iconPath;

    const color = this._config.color
      ? computeCssColor(this._config.color)
      : undefined;

    const style = color ? { "--badge-color": color } : {};

    return html`
      <ha-badge
        .type=${this._hasAction ? "button" : "badge"}
        .iconOnly=${!text}
        style=${styleMap(style)}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config.hold_action),
          hasDoubleClick: hasAction(this._config.double_tap_action),
        })}
      >
        ${icon
          ? html`<ha-icon slot="icon" .icon=${icon}></ha-icon>`
          : html`<ha-svg-icon slot="icon" .path=${iconPath}></ha-svg-icon>`}
        ${text}
      </ha-badge>
    `;
  }

  static styles = css`
    ha-badge {
      --badge-color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-shortcut-badge": HuiShortcutBadge;
  }
}
