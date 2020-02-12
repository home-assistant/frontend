import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
  PropertyValues,
} from "lit-element";
import { ifDefined } from "lit-html/directives/if-defined";

import "../../../components/entity/state-badge";
import "../components/hui-warning-element";

import { computeTooltip } from "../common/compute-tooltip";
import { LovelaceElement, StateIconElementConfig } from "./types";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { handleAction } from "../common/handle-action";

@customElement("hui-state-icon-element")
export class HuiStateIconElement extends LitElement implements LovelaceElement {
  @property() public hass?: HomeAssistant;
  @property() private _config?: StateIconElementConfig;

  public setConfig(config: StateIconElementConfig): void {
    if (!config.entity) {
      throw Error("Invalid Configuration: 'entity' required");
    }

    this._config = { state_color: true, ...config };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity!];

    if (!stateObj) {
      return html`
        <hui-warning-element
          label=${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}
        ></hui-warning-element>
      `;
    }

    return html`
      <state-badge
        .stateObj="${stateObj}"
        .title="${computeTooltip(this.hass, this._config)}"
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

  static get styles(): CSSResult {
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
