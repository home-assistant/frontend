import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { DOMAINS_TOGGLE } from "../../../common/const";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import { forwardHaptic } from "../../../data/haptics";
import type { HomeAssistant } from "../../../types";
import { turnOnOffEntities } from "../common/entity/turn-on-off-entities";

@customElement("hui-entities-toggle")
class HuiEntitiesToggle extends LitElement {
  @property({ type: Array }) public entities?: string[];

  @property({ attribute: false }) protected hass?: HomeAssistant;

  @state() private _toggleEntities?: string[];

  public willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("entities")) {
      this._toggleEntities = this.entities!.filter(
        (entityId) =>
          entityId in this.hass!.states &&
          DOMAINS_TOGGLE.has(entityId.split(".", 1)[0])
      );
    }
  }

  protected render() {
    if (!this._toggleEntities?.length) {
      return nothing;
    }

    return html`
      <ha-switch
        aria-label=${this.hass!.localize(
          "ui.panel.lovelace.card.entities.toggle"
        )}
        .checked=${this._toggleEntities!.some((entityId) => {
          const stateObj = this.hass!.states[entityId];
          return stateObj && stateObj.state === "on";
        })}
        @change=${this._callService}
      ></ha-switch>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        width: 38px;
        display: block;
      }
      ha-switch {
        padding: 13px 5px;
        margin: -4px -8px;
      }
    `;
  }

  private _callService(ev: MouseEvent): void {
    forwardHaptic("light");
    const turnOn = (ev.target as HaSwitch).checked;
    turnOnOffEntities(this.hass!, this._toggleEntities!, turnOn!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-toggle": HuiEntitiesToggle;
  }
}
