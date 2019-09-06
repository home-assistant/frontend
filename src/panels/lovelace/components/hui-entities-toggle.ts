import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";
import { PaperToggleButtonElement } from "@polymer/paper-toggle-button/paper-toggle-button";

import { DOMAINS_TOGGLE } from "../../../common/const";
import { turnOnOffEntities } from "../common/entity/turn-on-off-entities";
import { HomeAssistant } from "../../../types";
import { forwardHaptic } from "../../../data/haptics";

@customElement("hui-entities-toggle")
class HuiEntitiesToggle extends LitElement {
  @property() public entities?: string[];

  @property() protected hass?: HomeAssistant;

  @property() private _toggleEntities?: string[];

  public updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("entities")) {
      this._toggleEntities = this.entities!.filter(
        (entityId) =>
          entityId in this.hass!.states &&
          DOMAINS_TOGGLE.has(entityId.split(".", 1)[0])
      );
    }
  }

  protected render(): TemplateResult | void {
    if (!this._toggleEntities) {
      return html``;
    }

    return html`
      <paper-toggle-button
        aria-label="Toggle entities."
        ?checked="${this._toggleEntities!.some((entityId) => {
          const stateObj = this.hass!.states[entityId];
          return stateObj && stateObj.state === "on";
        })}"
        @change="${this._callService}"
      ></paper-toggle-button>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        width: 38px;
        display: block;
      }
      paper-toggle-button {
        cursor: pointer;
        --paper-toggle-button-label-spacing: 0;
        padding: 13px 5px;
        margin: -4px -5px;
      }
    `;
  }

  private _callService(ev: MouseEvent): void {
    forwardHaptic("light");
    const turnOn = (ev.target as PaperToggleButtonElement).checked;
    turnOnOffEntities(this.hass!, this._toggleEntities!, turnOn!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-toggle": HuiEntitiesToggle;
  }
}
