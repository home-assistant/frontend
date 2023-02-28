import { html, LitElement, PropertyValues, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/entity/ha-state-label-badge";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import "../components/hui-warning-element";
import { LovelaceElement, StateBadgeElementConfig } from "./types";

@customElement("hui-state-badge-element")
export class HuiStateBadgeElement
  extends LitElement
  implements LovelaceElement
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: StateBadgeElementConfig;

  public setConfig(config: StateBadgeElementConfig): void {
    if (!config.entity) {
      throw Error("Entity required");
    }

    this._config = { hold_action: { action: "more-info" }, ...config };
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
      <ha-state-label-badge
        .hass=${this.hass}
        .state=${stateObj}
        .title=${this._config.title === undefined
          ? computeStateName(stateObj)
          : this._config.title === null
          ? ""
          : this._config.title}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(
          hasAction(this._config.tap_action) ? "0" : undefined
        )}
      ></ha-state-label-badge>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-badge-element": HuiStateBadgeElement;
  }
}
