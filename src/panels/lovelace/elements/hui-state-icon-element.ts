import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import "../../../components/entity/state-badge";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { computeTooltip } from "../common/compute-tooltip";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import "../components/hui-warning-element";
import { LovelaceElement, StateIconElementConfig } from "./types";

@customElement("hui-state-icon-element")
export class HuiStateIconElement extends LitElement implements LovelaceElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: StateIconElementConfig;

  public setConfig(config: StateIconElementConfig): void {
    if (!config.entity) {
      throw Error("Entity required");
    }

    this._config = {
      state_color: true,
      hold_action: { action: "more-info" },
      ...config,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity!];

    if (!stateObj) {
      return html`
        <hui-warning-element
          .label=${createEntityNotFoundWarning(this.hass, this._config.entity)}
        ></hui-warning-element>
      `;
    }

    return html`
      <state-badge
        .stateObj=${stateObj}
        .title=${computeTooltip(this.hass, this._config)}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(
          hasAction(this._config.tap_action) ? "0" : undefined
        )}
        .overrideIcon=${this._config.icon}
        .stateColor=${this._config.state_color}
      ></state-badge>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        cursor: pointer;
      }
      state-badge:focus {
        outline: none;
        background: var(--divider-color);
        border-radius: 100%;
      }
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-icon-element": HuiStateIconElement;
  }
}
