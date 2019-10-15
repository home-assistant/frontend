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

import "../../../components/entity/state-badge";
import "../components/hui-warning-element";

import { computeTooltip } from "../common/compute-tooltip";
import { handleClick } from "../common/handle-click";
import { longPress } from "../common/directives/long-press-directive";
import { LovelaceElement, StateIconElementConfig } from "./types";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { hasDoubleClick } from "../common/has-double-click";

@customElement("hui-state-icon-element")
export class HuiStateIconElement extends LitElement implements LovelaceElement {
  @property() public hass?: HomeAssistant;
  @property() private _config?: StateIconElementConfig;

  public setConfig(config: StateIconElementConfig): void {
    if (!config.entity) {
      throw Error("Invalid Configuration: 'entity' required");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult | void {
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
        @ha-click=${this._handleClick}
        @ha-hold=${this._handleHold}
        @ha-dblclick=${this._handleDblClick}
        .longPress=${longPress({
          hasDoubleClick: hasDoubleClick(this._config!.double_tap_action),
        })}
        .overrideIcon=${this._config.icon}
      ></state-badge>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        cursor: pointer;
      }
    `;
  }

  private _handleClick(): void {
    handleClick(this, this.hass!, this._config!, false, false);
  }

  private _handleHold(): void {
    handleClick(this, this.hass!, this._config!, true, false);
  }

  private _handleDblClick() {
    handleClick(this, this.hass!, this._config!, false, true);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-icon-element": HuiStateIconElement;
  }
}
