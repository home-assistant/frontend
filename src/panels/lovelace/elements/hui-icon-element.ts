import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import "../../../components/ha-icon";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { computeTooltip } from "../common/compute-tooltip";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { IconElementConfig, LovelaceElement } from "./types";

@customElement("hui-icon-element")
export class HuiIconElement extends LitElement implements LovelaceElement {
  public hass?: HomeAssistant;

  @state() private _config?: IconElementConfig;

  public setConfig(config: IconElementConfig): void {
    if (!config.icon) {
      throw Error("Icon required");
    }

    this._config = { hold_action: { action: "more-info" }, ...config };
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    return html`
      <ha-icon
        .icon=${this._config.icon}
        .title=${computeTooltip(this.hass, this._config)}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(
          hasAction(this._config.tap_action) ? "0" : undefined
        )}
      ></ha-icon>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        cursor: pointer;
      }
      ha-icon:focus {
        outline: none;
        background: var(--divider-color);
        border-radius: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-icon-element": HuiIconElement;
  }
}
